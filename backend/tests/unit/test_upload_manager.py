import asyncio
import json
from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest
from app.models.upload import StudyMetadata
from app.upload.service import UploadManager, UploadSession

# Test Data
SAMPLE_METADATA = StudyMetadata(
    patient_name="Test Patient", study_date="2023-01-01", modality="CT", description="Test Study"
)


@pytest.fixture
def manager(tmp_path):
    """Return a fresh UploadManager instance with temp persistence dir."""
    return UploadManager(persistence_dir=tmp_path / "sessions")


@pytest.mark.asyncio
async def test_create_session(manager):
    """Test successful creation of an upload session."""
    user_id = "user-123"
    total_files = 5
    total_size = 1000

    response = await manager.create_session(
        user_id=user_id,
        metadata=SAMPLE_METADATA,
        total_files=total_files,
        total_size_bytes=total_size,
    )

    assert response.upload_id is not None

    # Check session is stored
    session = manager.get_session(str(response.upload_id))
    assert session is not None
    assert session.user_id == user_id
    assert session.total_files == total_files
    assert session.total_size_bytes == total_size
    assert session.uploaded_bytes == 0


@pytest.mark.asyncio
async def test_create_session_generates_unique_ids(manager):
    """Test that multiple sessions get unique IDs."""
    r1 = await manager.create_session("u1", SAMPLE_METADATA, 1, 100)
    r2 = await manager.create_session("u1", SAMPLE_METADATA, 1, 100)

    assert r1.upload_id != r2.upload_id


@pytest.mark.asyncio
async def test_get_session_not_found(manager):
    """Test getting a non-existent session returns None."""
    random_id = str(uuid4())
    session = manager.get_session(random_id)
    assert session is None


@pytest.mark.asyncio
async def test_update_session(manager):
    """Test that session updates are persisted."""
    # Create session
    response = await manager.create_session("u1", SAMPLE_METADATA, 1, 100)
    session = manager.get_session(str(response.upload_id))

    # Update state
    session.uploaded_bytes = 50
    session.files["file1"] = {"chunks": {1}, "complete": False}

    # Persist update
    manager.update_session(session)

    # Verify retrieval
    retrieved = manager.get_session(str(response.upload_id))
    assert retrieved.uploaded_bytes == 50
    assert "file1" in retrieved.files


def test_remove_session(manager):
    """Test session deletion."""
    # We need async wrapper if we were calling async method, but remove_session is sync
    # But wait, create_session is async.

    async def run_test():
        response = await manager.create_session("u1", SAMPLE_METADATA, 1, 100)
        uid = str(response.upload_id)
        assert manager.get_session(uid) is not None

        manager.remove_session(uid)
        assert manager.get_session(uid) is None

        # Verify file deletion
        path = manager._get_session_path(uid)
        assert not path.exists()

    asyncio.run(run_test())


@pytest.mark.asyncio
async def test_cleanup_expired_sessions(manager):
    """Test that expired sessions are removed."""
    # Mock storage service for cleanup callback
    storage_mock = MagicMock()
    storage_mock.cleanup_upload = AsyncMock()

    # Create an expired session
    r1 = await manager.create_session("u1", SAMPLE_METADATA, 1, 100)
    session1 = manager.get_session(str(r1.upload_id))

    # Manually backdate expirty
    session1.expires_at = datetime.now(UTC) - timedelta(hours=1)
    manager.update_session(session1)

    # Create a fresh session
    r2 = await manager.create_session("u2", SAMPLE_METADATA, 1, 100)

    # Run cleanup
    await manager.cleanup_expired_sessions(storage_mock)

    # Verify expired removed, fresh remains
    assert manager.get_session(str(r1.upload_id)) is None
    assert manager.get_session(str(r2.upload_id)) is not None

    # Verify storage cleanup called for expired
    storage_mock.cleanup_upload.assert_called_with(str(r1.upload_id))


def test_session_expiry_calculation(manager):
    """Test session expiry time calculation."""
    # Since create_session is async, we can just test UploadSession init directly
    # or use async wrapper.
    uid = str(uuid4())
    session = UploadSession(uid, "u1", 1, 100, SAMPLE_METADATA)

    now = datetime.now(UTC)
    # Check it's roughly 24h or whatever config is (default 24h in generic config,
    # but utils.py showed 15 mins for token, service.py uses settings.upload_token_expire_minutes)
    # service.py: expires_at = self.created_at + timedelta(minutes=settings.upload_token_expire_minutes)
    # We should probably mock settings or check if it's > created_at
    assert session.expires_at > session.created_at


def test_register_file_chunk(manager):
    """Test chunk registration in session."""
    uid = str(uuid4())
    session = UploadSession(uid, "u1", 1, 100, SAMPLE_METADATA)

    file_id = "f1"
    session.register_file_chunk(file_id, 0, 1024, "checksum123")

    assert file_id in session.files
    assert 0 in session.files[file_id]["chunks"]
    assert session.files[file_id]["checksums"][0] == "checksum123"
    assert session.uploaded_bytes == 1024


def test_register_file_chunk_idempotency(manager):
    """Test registering same chunk twice doesn't duplicate."""
    uid = str(uuid4())
    session = UploadSession(uid, "u1", 1, 100, SAMPLE_METADATA)

    file_id = "f1"
    session.register_file_chunk(file_id, 0, 1024)
    session.register_file_chunk(file_id, 0, 1024)  # Duplicate

    assert len(session.files[file_id]["chunks"]) == 1
    assert session.uploaded_bytes == 1024  # Should not double count?
    # Wait, implementation:
    # if chunk_index not in self.files[file_id]["chunks"]:
    #     self.files[file_id]["chunks"].add(chunk_index)
    #     self.uploaded_bytes += chunk_size
    # So yes, it handles idempotency correctly.


@pytest.mark.asyncio
async def test_session_serialization(manager):
    """Test session can be serialized to JSON and persisted."""
    response = await manager.create_session("u1", SAMPLE_METADATA, 1, 100)
    uid = str(response.upload_id)
    session = manager.get_session(uid)

    session.register_file_chunk("f1", 0, 1024, "crc1")
    manager.update_session(session)

    path = manager._get_session_path(uid)
    assert path.exists()

    with open(path) as f:
        data = json.load(f)

    assert data["upload_id"] == uid
    assert data["files"]["f1"]["chunks"] == [0]
    assert data["files"]["f1"]["checksums"]["0"] == "crc1"


@pytest.mark.asyncio
async def test_session_recovery_after_crash(manager, tmp_path):
    """Test sessions can be restored after server restart."""
    # Create session in manager
    response = await manager.create_session("u1", SAMPLE_METADATA, 1, 100)
    uid = str(response.upload_id)

    # Create NEW manager using SAME directory
    new_manager = UploadManager(persistence_dir=manager.persistence_dir)

    # Verify session loaded
    restored = new_manager.get_session(uid)
    assert restored is not None
    assert restored.upload_id == uid
    assert restored.user_id == "u1"


@pytest.mark.asyncio
async def test_concurrent_session_access(manager):
    """Test basic concurrent create operations."""
    # Since we are in async, we can run multiple creates concurrently
    tasks = [manager.create_session(f"u{i}", SAMPLE_METADATA, 1, 100) for i in range(5)]
    responses = await asyncio.gather(*tasks)

    assert len(responses) == 5
    unique_ids = {str(r.upload_id) for r in responses}
    assert len(unique_ids) == 5

    # Verify all exist
    for uid in unique_ids:
        assert manager.get_session(uid) is not None
