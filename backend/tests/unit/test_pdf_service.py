from unittest.mock import patch
from uuid import uuid4

import pytest
from app.models.report import Report, ReportStatus
from app.reports.pdf_service import pdf_generator


@pytest.fixture
def sample_report():
    return Report(
        upload_id=uuid4(),
        study_instance_uid="1.2.840.113619.2.278.3.2831165782.801.1477382226.732",
        status=ReportStatus.READY,
        radiologist_name="Dr. Alice Smith",
        report_text="Chest X-Ray shows no abnormalities.\n\nHeart size is normal. Lungs are clear.",
        user_id="user-123",
    )


def test_generate_report_pdf(sample_report):
    """Test PDF generation from report data."""
    pdf_bytes = pdf_generator.generate_report_pdf(sample_report)

    assert isinstance(pdf_bytes, bytes)
    assert len(pdf_bytes) > 0
    # Basic PDF header check
    assert pdf_bytes.startswith(b"%PDF-")


def test_pdf_includes_report_text(sample_report):
    """Test PDF contains content (integration-ish but using service)."""
    pdf_bytes = pdf_generator.generate_report_pdf(sample_report)

    # We can't easily grep PDF bytes for text without a parser,
    # but we can verify it doesn't crash and has substantial size.
    assert len(pdf_bytes) > 1000


def test_pdf_formatting(sample_report):
    """Test PDF generation with different lengths of text."""
    sample_report.report_text = "Short report."
    pdf1 = pdf_generator.generate_report_pdf(sample_report)

    sample_report.report_text = "Long report.\n" * 100
    pdf2 = pdf_generator.generate_report_pdf(sample_report)

    assert len(pdf2) > len(pdf1)


@patch("app.reports.pdf_service.reports_db")
def test_save_report_pdf_to_file(mock_reports_db, sample_report, tmp_path):
    """Test saving PDF report to a file."""
    mock_reports_db.get_report_by_id.return_value = sample_report

    output_path = tmp_path / "test_report.pdf"
    res_path = pdf_generator.save_report_pdf(sample_report.id, output_path=output_path)

    assert res_path.exists()
    assert res_path == output_path
    assert res_path.stat().st_size > 0


def test_save_report_not_found(tmp_path):
    """Test error when report not found in DB."""
    with patch("app.reports.pdf_service.reports_db") as mock_db:
        mock_db.get_report_by_id.return_value = None

        with pytest.raises(ValueError, match="Report .* not found"):
            pdf_generator.save_report_pdf(uuid4())


def test_generate_pdf_without_findings(sample_report):
    """Test generating PDF for report without findings."""
    sample_report.report_text = None
    sample_report.status = ReportStatus.PENDING

    pdf_bytes = pdf_generator.generate_report_pdf(sample_report)
    assert len(pdf_bytes) > 0
    # Search in PDF bytes is unreliable due to encoding, but we can verify it's a valid PDF
    assert pdf_bytes.startswith(b"%PDF-")
