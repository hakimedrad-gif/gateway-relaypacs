from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class StudyMetadata(BaseModel):
    """Metadata extracted from DICOM files or entered by user"""

    patient_name: str
    study_date: str
    modality: str
    age: str | None = None
    gender: str | None = None
    service_level: str = "routine"  # routine, emergency, stat, subspecialty
    study_description: str | None = None


class UploadInitRequest(BaseModel):
    """Request payload for initializing an upload session"""

    study_metadata: StudyMetadata
    total_files: int = Field(gt=0, description="Total number of files to upload")
    total_size_bytes: int = Field(
        gt=0, description="Total size in bytes (max enforced by validator)"
    )
    clinical_history: str | None = None
    force_upload: bool = False  # Override duplicate detection

    @field_validator("total_size_bytes")
    @classmethod
    def validate_upload_size(cls, v: int) -> int:
        """
        Validate upload size does not exceed maximum allowed.

        Prevents DoS attacks via resource exhaustion by rejecting
        uploads claiming excessive sizes.
        """
        # Import here to avoid circular dependency
        from app.config import get_settings

        settings = get_settings()

        max_size_bytes = settings.max_file_size_mb * 1024 * 1024

        if v > max_size_bytes:
            raise ValueError(
                f"Upload size ({v:,} bytes = {v / 1024 / 1024:.1f} MB) "
                f"exceeds maximum allowed ({max_size_bytes:,} bytes = {settings.max_file_size_mb} MB)"
            )

        return v


class UploadInitResponse(BaseModel):
    """Response payload for upload initialization"""

    upload_id: UUID
    upload_token: str
    chunk_size: int
    expires_at: datetime
    warning: str | None = None  # For duplicate detection warnings


class ChunkUploadResponse(BaseModel):
    """Response after a successful chunk upload"""

    upload_id: UUID
    file_id: str
    chunk_index: int
    received_bytes: int
    status: str = "received"


class UploadStatusResponse(BaseModel):
    """Current status of an upload session"""

    upload_id: UUID
    progress_percent: float
    uploaded_bytes: int
    total_bytes: int
    state: str  # pending, uploading, processing, complete, failed
    chunks_received: int
    chunks_total: int
    pacs_status: str
    files: dict[str, dict[str, Any]] = Field(
        default_factory=dict, description="Map of file_id to status details"
    )


class UploadCompleteResponse(BaseModel):
    """Final response after upload completion"""

    status: str
    pacs_receipt_id: str | None = None
    warnings: list[str] = []
    processed_files: int
    failed_files: int
