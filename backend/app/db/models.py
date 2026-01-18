"""SQLAlchemy ORM models."""

import uuid
from datetime import UTC, datetime

from sqlalchemy import Boolean, Column, DateTime, String
from sqlalchemy.dialects.postgresql import UUID

from app.db.database import Base


class User(Base):
    """User model for authentication."""

    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=True)
    role = Column(
        String(50), nullable=False, default="clinician"
    )  # clinician, radiographer, radiologist, admin
    clinic_id = Column(UUID(as_uuid=True), nullable=True)  # Future: link to clinic/organization
    is_active = Column(Boolean, default=True, nullable=False)

    # 2FA (TOTP)
    totp_secret = Column(String(32), nullable=True)
    totp_enabled = Column(Boolean, default=False, nullable=False)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )

    def __repr__(self) -> str:
        return f"<User(username='{self.username}', email='{self.email}', role='{self.role}')>"


class StudyUpload(Base):
    """
    Track uploaded studies to detect and prevent duplicates.

    Stores a hash of key study identifiers to quickly check if a study
    has been uploaded previously within a retention window.
    """

    __tablename__ = "study_uploads"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    upload_id = Column(String(50), nullable=False, index=True)

    # Core DICOM identifiers
    study_instance_uid = Column(String(64), nullable=False)
    patient_id = Column(String(64), nullable=False)

    # Hash for fast lookup: SHA256(StudyInstanceUID + PatientID)
    study_hash = Column(String(64), nullable=False, index=True)

    # Audit info
    user_id = Column(UUID(as_uuid=True), nullable=True)  # Who uploaded it?
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False)

    def __repr__(self) -> str:
        return f"<StudyUpload(hash='{self.study_hash}', upload_id='{self.upload_id}')>"
