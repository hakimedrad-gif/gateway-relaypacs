"""API router for report management endpoints."""

from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response

from app.auth.dependencies import get_current_user
from app.database.reports_db import reports_db
from app.models.report import Report, ReportListResponse, ReportStatus

router = APIRouter()


@router.get("/", response_model=ReportListResponse)
async def list_reports(
    status: str | None = None,
    limit: int = 50,
    offset: int = 0,
    user: dict[str, Any] = Depends(get_current_user),
) -> ReportListResponse:
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
        except ValueError as err:
            valid_statuses = ", ".join([s.value for s in ReportStatus])
            raise HTTPException(
                status_code=400,
                detail=f"Invalid status. Must be one of: {valid_statuses}",
            ) from err

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
) -> Report:
    """Get specific report by ID."""
    report = reports_db.get_report_by_id(report_id)

    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    # Verify user owns this report
    if report.user_id != user["sub"]:
        raise HTTPException(status_code=403, detail="Not authorized to view this report")

    return report


@router.get("/upload/{upload_id}", response_model=Report | None)
async def get_report_by_upload(
    upload_id: UUID,
    user: dict[str, Any] = Depends(get_current_user),
) -> Report | None:
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
) -> Response:
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
        ) from e


@router.post("/{report_id}/sync", response_model=Report)
async def sync_report(
    report_id: UUID,
    user: dict[str, Any] = Depends(get_current_user),
) -> Report:
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

    # Only sync if not already READY
    if report.status == ReportStatus.READY:
        return report

    # Trigger manual sync via pacs_sync_service
    from app.pacs.service import pacs_service
    from app.reports.pacs_sync import pacs_sync_service

    has_report = pacs_service.check_for_report(report.study_instance_uid)

    if has_report:
        # Update status
        pacs_data = {
            "radiologist_name": "External Radiologist (PACS)",
            "report_text": "Report retrieved from PACS. Full content available in PDF download.",
            "report_url": f"/api/reports/{report_id}/download",
        }
        await pacs_sync_service.update_report_status(str(report_id), ReportStatus.READY, pacs_data)

        # Refresh report from DB
        report = reports_db.get_report_by_id(report_id)

    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    return report
