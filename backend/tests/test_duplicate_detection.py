from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from app.models.upload import StudyMetadata, UploadInitRequest
from fastapi import HTTPException, status


# Mock database session
@pytest.fixture
def mock_db_session():
    session = MagicMock()
    return session


@pytest.fixture
def mock_upload_manager():
    # Patch the reference in router directly
    with patch("app.upload.router.upload_manager") as mock:
        # Configure async methods
        mock.create_session = AsyncMock(return_value=MagicMock(upload_id="new-upload-id"))
        mock.cleanup_expired_sessions = AsyncMock()
        yield mock


@pytest.fixture
def mock_settings():
    with patch("app.config.get_settings") as mock:
        mock.return_value.max_file_size_mb = 100
        yield mock


@pytest.fixture
def mock_storage_service():
    with patch("app.upload.router.storage_service") as mock:
        yield mock


@pytest.mark.asyncio
async def test_duplicate_detection_found(
    mock_db_session, mock_upload_manager, mock_settings, mock_storage_service
):
    """Test that a duplicate upload raises HTTP 409"""
    from app.db.models import StudyUpload
    from app.upload.router import initialize_upload

    # Setup request payload
    metadata = StudyMetadata(patient_name="John Doe", study_date="2023-01-01", modality="CT")
    payload = UploadInitRequest(
        study_metadata=metadata, total_files=5, total_size_bytes=1000, force_upload=False
    )

    request = MagicMock()
    user = {"sub": "testuser"}

    # Mock DB query to return an existing study
    existing_study = StudyUpload(
        upload_id="old-upload-id", study_hash="somehash", created_at=datetime.now(UTC)
    )
    mock_db_session.query.return_value.filter.return_value.first.return_value = existing_study

    # Executing initialize_upload should raise 409
    with pytest.raises(HTTPException) as exc:
        await initialize_upload(request, payload, user, db=mock_db_session)

    assert exc.value.status_code == status.HTTP_409_CONFLICT
    assert exc.value.detail["code"] == "DUPLICATE_STUDY"


@pytest.mark.asyncio
async def test_duplicate_detection_override(
    mock_db_session, mock_upload_manager, mock_settings, mock_storage_service
):
    """Test that force_upload=True bypasses the duplicate check"""
    from app.db.models import StudyUpload
    from app.upload.router import initialize_upload

    # Setup request payload with force_upload=True
    metadata = StudyMetadata(patient_name="John Doe", study_date="2023-01-01", modality="CT")
    payload = UploadInitRequest(
        study_metadata=metadata, total_files=5, total_size_bytes=1000, force_upload=True
    )

    request = MagicMock()
    user = {"sub": "testuser"}

    # Mock DB query to return an existing study
    existing_study = StudyUpload(
        upload_id="old-upload-id", study_hash="somehash", created_at=datetime.now(UTC)
    )
    mock_db_session.query.return_value.filter.return_value.first.return_value = existing_study

    # Executing should NOT raise exception
    response = await initialize_upload(request, payload, user, db=mock_db_session)

    assert response.upload_id == "new-upload-id"
    # Verify new upload was recorded
    assert mock_db_session.add.called
    assert mock_db_session.commit.called


@pytest.mark.asyncio
async def test_duplicate_detection_not_found(
    mock_db_session, mock_upload_manager, mock_settings, mock_storage_service
):
    """Test that new studies are processed normally"""
    from app.upload.router import initialize_upload

    # Setup request payload
    metadata = StudyMetadata(patient_name="Jane Doe", study_date="2023-01-02", modality="MR")
    payload = UploadInitRequest(
        study_metadata=metadata, total_files=5, total_size_bytes=1000, force_upload=False
    )

    request = MagicMock()
    user = {"sub": "testuser"}

    # Mock DB query to return None (no duplicate)
    mock_db_session.query.return_value.filter.return_value.first.return_value = None

    # Executing should NOT raise exception
    response = await initialize_upload(request, payload, user, db=mock_db_session)

    assert response.upload_id == "new-upload-id"
    # Verify new upload was recorded
    assert mock_db_session.add.called
    assert mock_db_session.commit.called
