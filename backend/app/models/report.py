"""Data models for reports and notifications."""

from datetime import datetime
from enum import Enum
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


class ReportStatus(str, Enum):
    """Status of a radiology report."""

    ASSIGNED = "assigned"  # Report assigned to radiologist
    PENDING = "pending"  # Report in progress
    READY = "ready"  # Report completed and ready
    ADDITIONAL_DATA_REQUIRED = "additional_data_required"  # More info needed
    IN_TRANSIT = "in_transit"  # Study uploaded, transferring to PACS/Radiologist
    IN_PROGRESS = "in_progress"  # Radiologist viewing/dictating


class Report(BaseModel):
    """Radiology report model."""

    id: UUID = Field(default_factory=uuid4)
    upload_id: UUID  # Links to upload session
    study_instance_uid: str  # DICOM Study Instance UID
    status: ReportStatus = ReportStatus.ASSIGNED
    radiologist_name: str | None = None
    report_text: str | None = None  # Report findings/text
    report_url: str | None = None  # Path to PDF report
    user_id: str  # User who uploaded the study
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    intransit_at: datetime | None = None
    pacs_received_at: datetime | None = None
    assigned_at: datetime | None = None
    viewed_at: datetime | None = None
    completed_at: datetime | None = None

    class Config:
        """Pydantic config."""

        from_attributes = True


class NotificationType(str, Enum):
    """Type of notification."""

    UPLOAD_COMPLETE = "upload_complete"
    UPLOAD_FAILED = "upload_failed"
    REPORT_ASSIGNED = "report_assigned"
    REPORT_READY = "report_ready"
    ADDITIONAL_DATA_REQUIRED = "additional_data_required"


class Notification(BaseModel):
    """User notification model."""

    id: UUID = Field(default_factory=uuid4)
    user_id: str
    notification_type: NotificationType
    title: str
    message: str
    related_upload_id: UUID | None = None
    related_report_id: UUID | None = None
    is_read: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        """Pydantic config."""

        from_attributes = True


# Request/Response models for API endpoints


class ReportListResponse(BaseModel):
    """Response for listing reports."""

    reports: list[Report]
    total: int


class NotificationListResponse(BaseModel):
    """Response for listing notifications."""

    notifications: list[Notification]
    unread_count: int
    total: int
