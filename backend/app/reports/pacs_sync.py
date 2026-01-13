"""PACS Report Sync Service - Background service for syncing report status from PACS."""

import asyncio
import logging
from typing import Any
from uuid import UUID

from app.config import get_settings
from app.database.reports_db import reports_db
from app.models.report import NotificationType, ReportStatus
from app.notifications.service import notification_service

logger = logging.getLogger(__name__)
settings = get_settings()


class PACSReportSyncService:
    """Background service to sync report statuses from PACS server."""

    def __init__(self) -> None:
        """Initialize the PACS sync service."""
        self.running = False
        self._task: asyncio.Task[None] | None = None

    async def start(self) -> None:
        """Start the background sync task."""
        if self.running:
            logger.warning("PACS sync service already running")
            return

        self.running = True
        self._task = asyncio.create_task(self._sync_loop())
        logger.info("PACS Report Sync Service started")

    async def stop(self) -> None:
        """Stop the background sync task."""
        if not self.running:
            return

        self.running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        logger.info("PACS Report Sync Service stopped")

    async def _sync_loop(self) -> None:
        """Main sync loop - polls PACS for report updates."""
        while self.running:
            try:
                await self._sync_all_pending_reports()
                # Wait for configured interval before next sync
                await asyncio.sleep(settings.pacs_poll_interval_seconds)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in PACS sync loop: {e}", exc_info=True)
                # Continue despite errors
                await asyncio.sleep(5)

    async def _sync_all_pending_reports(self) -> None:
        """Sync all reports that are not yet ready by checking active PACS."""
        # Import here to avoid circular imports if any
        from app.pacs.service import pacs_service
        
        for status in [ReportStatus.ASSIGNED, ReportStatus.PENDING]:
            conn = reports_db._get_connection()
            cursor = conn.cursor()
            # Select ID and Study Instance UID
            cursor.execute("SELECT id, study_instance_uid FROM reports WHERE status = ?", (status.value,))
            rows = cursor.fetchall()
            conn.close()

            for row in rows:
                report_id = row["id"]
                study_uid = row["study_instance_uid"]
                
                # Check real PACS for report existence (SR/DOC/KO/PR)
                has_report = pacs_service.check_for_report(study_uid)
                
                if has_report:
                    # Report found in PACS -> Mark as READY
                    logger.info(f"Report found in PACS for study {study_uid}, marking as READY")
                    
                    # In a real scenario, we would retrieve the report content here.
                    # For now, we update the status and point to the download endpoint which generates a PDF.
                    # We can update the text to indicate it's from PACS.
                    pacs_data = {
                        "radiologist_name": "External Radiologist (PACS)",
                        "report_text": "Report retrieved from PACS. Full content available in PDF download.",
                        "report_url": f"/api/reports/{report_id}/download",
                    }
                    
                    await self.update_report_status(report_id, ReportStatus.READY, pacs_data)
                else:
                    # No report yet, stay in current status
                    # Uncomment below to keep simulation for testing if needed, but for now we want REAL checks
                    # logger.debug(f"No report found yet for {study_uid}")
                    pass

        logger.debug("PACS sync check completed")

    async def sync_report_by_study_uid(self, study_uid: str) -> dict[str, Any] | None:
        """
        Query PACS for report status by Study Instance UID.

        Args:
            study_uid: DICOM Study Instance UID

        Returns:
            dict with report info if found, None otherwise
        """
        # Placeholder response
        return None

    async def update_report_status(
        self,
        report_id: str,
        new_status: ReportStatus,
        report_data: dict[str, Any] | None = None,
    ) -> None:
        """
        Update report status and send notification.

        Args:
            report_id: Report ID to update
            new_status: New status to set
            report_data: Optional dict with report_url, report_text, radiologist_name
        """
        try:
            # Get current report
            report = reports_db.get_report_by_id(UUID(report_id))
            if not report:
                logger.error(f"Report {report_id} not found")
                return

            # Check if status changed
            if report.status == new_status:
                return

            # Update report
            reports_db.update_report_status(
                UUID(report_id),
                new_status,
                report_url=report_data.get("report_url") if report_data else None,
                radiologist_name=report_data.get("radiologist_name") if report_data else None,
                report_text=report_data.get("report_text") if report_data else None,
            )

            logger.info(f"Updated report {report_id} status from {report.status} to {new_status}")

            # Send notification based on new status
            notification_type = None
            title = ""
            message = ""

            short_uid = report.study_instance_uid[:20]
            if new_status == ReportStatus.READY:
                notification_type = NotificationType.REPORT_READY
                title = "Report Ready"
                message = f"Your radiology report for study {short_uid}... is now available"
            elif new_status == ReportStatus.ADDITIONAL_DATA_REQUIRED:
                notification_type = NotificationType.ADDITIONAL_DATA_REQUIRED
                title = "Additional Data Required"
                message = f"Additional information needed for study {short_uid}..."

            if notification_type:
                await notification_service.create_and_broadcast(
                    user_id=report.user_id,
                    notification_type=notification_type,
                    title=title,
                    message=message,
                    upload_id=report.upload_id,
                    report_id=UUID(report_id),
                )

        except Exception as e:
            logger.error(f"Failed to update report status: {e}", exc_info=True)


# Singleton instance
pacs_sync_service = PACSReportSyncService()
