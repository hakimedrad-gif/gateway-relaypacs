"""PDF Report Generation Service using ReportLab."""

import io
from datetime import datetime
from pathlib import Path
from typing import Optional
from uuid import UUID

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from app.database.reports_db import reports_db
from app.models.report import Report


class PDFReportGenerator:
    """Service for generating PDF radiology reports."""

    def generate_report_pdf(self, report: Report) -> bytes:
        """
        Generate a PDF report from Report model.

        Args:
            report: Report model to convert to PDF

        Returns:
            PDF file content as bytes
        """
        # Create PDF in memory
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter)
        story = []

        # Get styles
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            "CustomTitle",
            parent=styles["Heading1"],
            fontSize=24,
            textColor=colors.HexColor("#1e40af"),
            spaceAfter=30,
        )
        heading_style = ParagraphStyle(
            "CustomHeading", parent=styles["Heading2"], fontSize=14, spaceAfter=12
        )
        normal_style = styles["Normal"]

        # Title
        story.append(Paragraph("RAD IOLOGY REPORT", title_style))
        story.append(Spacer(1, 0.2 * inch))

        # Report metadata table
        metadata = [
            ["Report ID:", str(report.id)],
            ["Study Instance UID:", report.study_instance_uid],
            ["Status:", report.status.value.upper()],
            ["Created:", report.created_at.strftime("%B %d, %Y %I:%M %p")],
            ["Updated:", report.updated_at.strftime("%B %d, %Y %I:%M %p")],
        ]

        if report.radiologist_name:
            metadata.append(["Radiologist:", report.radiologist_name])

        metadata_table = Table(metadata, colWidths=[2 * inch, 4 * inch])
        metadata_table.setStyle(
            TableStyle(
                [
                    ("FONT", (0, 0), (0, -1), "Helvetica-Bold", 10),
                    ("FONT", (1, 0), (1, -1), "Helvetica", 10),
                    ("TEXTCOLOR", (0, 0), (0, -1), colors.HexColor("#374151")),
                    ("TEXTCOLOR", (1, 0), (1, -1), colors.HexColor("#1f2937")),
                    ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                ]
            )
        )

        story.append(metadata_table)
        story.append(Spacer(1, 0.3 * inch))

        # Report findings
        story.append(Paragraph("FINDINGS", heading_style))

        if report.report_text:
            # Split report text into paragraphs
            paragraphs = report.report_text.split("\n\n")
            for para in paragraphs:
                if para.strip():
                    story.append(Paragraph(para.strip(), normal_style))
                    story.append(Spacer(1, 0.1 * inch))
        else:
            story.append(
                Paragraph(
                    "<i>Report findings not yet available. Status: " + report.status.value + "</i>",
                    normal_style,
                )
            )

        story.append(Spacer(1, 0.3 * inch))

        # Footer
        footer_text = f"Generated on {datetime.now().strftime('%B %d, %Y at %I:%M %p')}"
        footer_style = ParagraphStyle(
            "Footer", parent=styles["Normal"], fontSize=8, textColor=colors.grey
        )
        story.append(Spacer(1, 0.5 * inch))
        story.append(Paragraph(footer_text, footer_style))
        story.append(
            Paragraph(
                "RelayPACS - Secure DICOM Ingestion System",
                footer_style,
            )
        )

        # Build PDF
        doc.build(story)

        # Get PDF bytes
        pdf_bytes = buffer.getvalue()
        buffer.close()

        return pdf_bytes

    def save_report_pdf(self, report_id: UUID, output_path: Optional[Path] = None) -> Path:
        """
        Generate and save PDF report to file.

        Args:
            report_id: Report ID to generate PDF for
            output_path: Optional path to save PDF. If not provided, saves to data/reports/<report_id>.pdf

        Returns:
            Path to saved PDF file
        """
        # Get report
        report = reports_db.get_report_by_id(report_id)
        if not report:
            raise ValueError(f"Report {report_id} not found")

        # Generate PDF
        pdf_bytes = self.generate_report_pdf(report)

        # Determine output path
        if not output_path:
            output_dir = Path("data/reports")
            output_dir.mkdir(parents=True, exist_ok=True)
            output_path = output_dir / f"{report_id}.pdf"

        # Save to file
        with open(output_path, "wb") as f:
            f.write(pdf_bytes)

        return output_path


# Singleton instance
pdf_generator = PDFReportGenerator()
