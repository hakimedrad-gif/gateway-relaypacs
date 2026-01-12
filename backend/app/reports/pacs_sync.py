"""PACS Report Sync Service - Background service for syncing report status from PACS."""

import asyncio
import logging
from typing import Optional

from app.config import get_settings
from app.database.reports_db import reports_db
from app.models.report import NotificationType, ReportStatus
from app.notifications.service import notification_service

logger = logging.getLogger(__name__)
settings = get_settings()


class PACSReportSyncService:
    """Background service to sync report statuses from PACS server."""

    def __init__(self):
        """Initialize the PACS sync service."""
        self.running = False
        self._task: Optional[asyncio.Task] = None

    async def start(self):
        """Start the background sync task."""
        if self.running:
            logger.warning("PACS sync service already running")
            return

        self.running = True
        self._task = asyncio.create_task(self._sync_loop())
        logger.info("PACS Report Sync Service started")

    async def stop(self):
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

    async def _sync_loop(self):
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

    async def _sync_all_pending_reports(self):
        """Sync all reports that are not yet ready."""
        # Get all reports that aren't in READY status
        # For each report, query PACS for status updates
        # This is a placeholder - actual implementation would query PACS

        # TODO: Implement actual PACS query using QIDO-RS
        # Example PACS query flow:
        # 1. Get all non-ready reports from database
        # 2. For each report, query PACS using Study Instance UID
        # 3. Check if report is available / status changed
        # 4. Update report status and notify user if changed

        logger.debug("PACS sync check completed (placeholder)")

    async def sync_report_by_study_uid(self, study_uid: str) -> Optional[dict]:
        """
        Query PACS for report status by Study Instance UID.

        Args:
            study_uid: DICOM Study Instance UID

        Returns:
            dict with report info if found, None otherwise
        """
        # TODO: Implement QIDO-RS query to PACS
        # Example using dicomweb-client:
        # - Query for Structured Reports (SR) by Study Instance UID
        # - Parse SR documents to extract report text
        # - Return report metadata

        # Placeholder response
        return None

    async def update_report_status(
        self, report_id: str, new_status: ReportStatus, report_data: Optional[dict] = None
    ):
        """
        Update report status and send notification.

        Args:
            report_id: Report ID to update
            new_status: New status to set
            report_data: Optional dict with report_url, report_text, radiologist_name
        """
        try:
            # Get current report
            from uuid import UUID

            report = reports_db.get_report_by_id(UUID(report_id))
            if not report:
                logger.error(f"Report {report_id} not found")
                return

            # Check if status changed
            if report.status == new_status:
                return

            # Update report
            updated_report = reports_db.update_report_status(
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

            if new_status == ReportStatus.READY:
                notification_type = NotificationType.REPORT_READY
                title = "Report Ready"
                message = f"Your radiology report for study {report.study_instance_uid[:20]}... is now available"
            elif new_status == ReportStatus.ADDITIONAL_DATA_REQUIRED:
                notification_type = NotificationType.ADDITIONAL_DATA_REQUIRED
                title = "Additional Data Required"
                message = (
                    f"Additional information needed for study {report.study_instance_uid[:20]}..."
                )

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
