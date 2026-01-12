"""API router for report management endpoints."""

from typing import Any, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response

from app.auth.dependencies import get_current_user
from app.database.reports_db import reports_db
from app.models.report import Report, ReportListResponse, ReportStatus

router = APIRouter()


@router.get("/", response_model=ReportListResponse)
async def list_reports(
    status: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    user: dict[str, Any] = Depends(get_current_user),
):
    """
    List all reports for the authenticated user.

    Query params:
    - status: Optional filter by status (assigned, pending, ready, additional_data_required)
    - limit: Max number of reports to return (default: 50)
    - offset: Offset for pagination (default: 0)
    """
    user_id = user["sub"]

    # Parse status filter if provided
    status_filter = None
    if status:
        try:
            status_filter = ReportStatus(status.lower())
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid status. Must be one of: {', '.join([s.value for s in ReportStatus])}",
            )

    reports = reports_db.get_reports_by_user(
        user_id=user_id, status=status_filter, limit=limit, offset=offset
    )

    # Get total count (for now, just return length of current results)
    # In production, you'd add a separate count query
    total = len(reports)

    return ReportListResponse(reports=reports, total=total)


@router.get("/{report_id}", response_model=Report)
async def get_report(
    report_id: UUID,
    user: dict[str, Any] = Depends(get_current_user),
):
    """Get specific report by ID."""
    report = reports_db.get_report_by_id(report_id)

    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    # Verify user owns this report
    if report.user_id != user["sub"]:
        raise HTTPException(status_code=403, detail="Not authorized to view this report")

    return report


@router.get("/upload/{upload_id}", response_model=Optional[Report])
async def get_report_by_upload(
    upload_id: UUID,
    user: dict[str, Any] = Depends(get_current_user),
):
    """Get report associated with an upload session."""
    report = reports_db.get_report_by_upload_id(upload_id)

    if not report:
        return None

    # Verify user owns this report
    if report.user_id != user["sub"]:
        raise HTTPException(status_code=403, detail="Not authorized to view this report")

    return report


@router.get("/{report_id}/download")
async def download_report(
    report_id: UUID,
    user: dict[str, Any] = Depends(get_current_user),
):
    """
    Download report as PDF.

    Returns PDF file with appropriate headers for download.
    """
    report = reports_db.get_report_by_id(report_id)

    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    # Verify user owns this report
    if report.user_id != user["sub"]:
        raise HTTPException(status_code=403, detail="Not authorized to download this report")

    # Check if report is ready for download
    if report.status != ReportStatus.READY:
        raise HTTPException(
            status_code=404,
            detail=f"Report PDF not yet available. Status: {report.status.value}",
        )

    # Generate PDF using PDF service
    try:
        from app.reports.pdf_service import pdf_generator

        pdf_bytes = pdf_generator.generate_report_pdf(report)

        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="report_{report_id}.pdf"'},
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate PDF: {e!s}",
        )


@router.post("/{report_id}/sync", response_model=Report)
async def sync_report(
    report_id: UUID,
    user: dict[str, Any] = Depends(get_current_user),
):
    """
    Manually trigger PACS sync for a specific report.

    This forces an immediate check for report status updates from the PACS server.
    """
    report = reports_db.get_report_by_id(report_id)

    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    # Verify user owns this report
    if report.user_id != user["sub"]:
        raise HTTPException(status_code=403, detail="Not authorized to sync this report")

    # TODO: Implement actual PACS sync logic
    # For now, just return the current report
    # In production, this would:
    # 1. Query PACS for status updates via QIDO-RS
    # 2. Update report status if changed
    # 3. Trigger notification if status changed

    return report
