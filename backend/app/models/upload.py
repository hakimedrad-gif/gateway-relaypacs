from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field


class StudyMetadata(BaseModel):
    """Metadata extracted from DICOM files or entered by user"""
    patient_name: str
    study_date: str
    modality: str
    study_description: str | None = None


class UploadInitRequest(BaseModel):
    """Request payload for initializing an upload session"""
    study_metadata: StudyMetadata
    total_files: int = Field(gt=0, description="Total number of files to upload")
    total_size_bytes: int = Field(gt=0, description="Total size in bytes")
    clinical_notes: str | None = None


class UploadInitResponse(BaseModel):
    """Response payload for upload initialization"""
    upload_id: UUID
    upload_token: str
    chunk_size: int
    expires_at: datetime


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


class UploadCompleteResponse(BaseModel):
    """Final response after upload completion"""
    status: str
    pacs_receipt_id: str | None = None
    warnings: list[str] = []
    processed_files: int
    failed_files: int
