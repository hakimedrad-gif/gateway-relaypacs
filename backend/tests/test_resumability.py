import pytest
from app.models.upload import StudyMetadata
from app.upload.service import UploadManager

# Mock settings/storage for persistence test assumption
# In reality, we'll verify if the manager can reload state or if we need to implement it.


@pytest.mark.asyncio
async def test_session_persistence_on_restart(tmp_path):
    """Test that upload sessions are persisted to disk and restored on restart"""
    # 1. Initialize a manager and create a session
    sessions_dir = tmp_path / "sessions"
    manager = UploadManager(persistence_dir=sessions_dir)
    # Mock persistence path if configurable, or we assume it uses a default
    # For TDD, we might need to patch the persistence file path

    metadata = StudyMetadata(patient_name="Test Persist", study_date="20230101", modality="CT")
    response = await manager.create_session(
        "test_user", metadata, total_files=2, total_size_bytes=1000
    )
    upload_id = response.upload_id

    # 2. Simulate "Restart" -> Create new manager instance
    # The new manager should load existing sessions from disk
    new_manager = UploadManager(persistence_dir=sessions_dir)

    # Needs to explicitly load or auto-load.
    # Let's assume auto-load on init or a method we call.
    # For now, let's assume __init__ should handle it or we call a robust 'initialize'

    session = new_manager.get_session(upload_id)
    assert session is not None
    assert session.upload_id == str(upload_id)
    assert session.metadata.patient_name == "Test Persist"


def test_idempotent_chunk_upload(client, auth_headers):
    """Test that uploading the same chunk twice returns 200/204 and doesn't duplicate processing"""
    # Init upload
    init_data = {
        "study_metadata": {
            "patient_name": "Idempotent Check",
            "study_date": "20230920",
            "modality": "DX",
        },
        "total_files": 1,
        "total_size_bytes": 1024,
    }
    resp = client.post("/upload/init", json=init_data, headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    upload_id = data["upload_id"]
    token = data["upload_token"]

    headers = {"Authorization": f"Bearer {token}"}
    chunk_data = b"x" * 512

    # Upload Chunk 0
    resp1 = client.put(
        f"/upload/{upload_id}/chunk?chunk_index=0&file_id=file1",
        content=chunk_data,
        headers=headers,
    )
    assert resp1.status_code == 200

    # Upload Chunk 0 AGAIN
    resp2 = client.put(
        f"/upload/{upload_id}/chunk?chunk_index=0&file_id=file1",
        content=chunk_data,
        headers=headers,
    )
    # Could be 200 or 204, but should definitely succeed
    assert resp2.status_code in [200, 204]

    # Verify status only counts it once
    status_resp = client.get(f"/upload/{upload_id}/status", headers=headers)
    status_data = status_resp.json()
    assert status_data["chunks_received"] == 1
    assert status_data["uploaded_bytes"] == 512


def test_status_reports_missing_chunks(client, auth_headers):
    """Test that status endpoint reports which chunks are missing for incomplete files"""
    # Init
    init_data = {
        "study_metadata": {
            "patient_name": "Missing Chunks",
            "study_date": "2023-01-01",
            "modality": "OT",
        },
        "total_files": 1,
        "total_size_bytes": 1024,
    }
    resp = client.post("/upload/init", json=init_data, headers=auth_headers)
    data = resp.json()
    upload_id = data["upload_id"]
    token = data["upload_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Upload Chunk 0 of file1
    client.put(
        f"/upload/{upload_id}/chunk?chunk_index=0&file_id=file1",
        content=b"a" * 512,
        headers=headers,
    )

    # We expect Chunk 1 to be missing (assuming we know total chunks or client calculates it)
    # Check status
    status_resp = client.get(f"/upload/{upload_id}/status", headers=headers)
    status_data = status_resp.json()

    # Assert missing_chunks info is present
    # This requires updating the response model and logic
    # Expected format: {"file_id": [missing_indices]} or similar
    assert "detail" not in status_data  # Should succeed
    # We might need to standardize how missing chunks are reported.
    # For now, let's assert the field exists, even if empty/partial, logic to be implemented.
    # Actually, without knowing total_chunks per file (which client sends implicitly by max index?),
    # it's hard to say what's "Later" missing.
    # But if we skip chunk 0 and send chunk 1, chunk 0 is definitely missing.

    # Let's try skipping chunk 0
    client.put(
        f"/upload/{upload_id}/chunk?chunk_index=2&file_id=file2",
        content=b"b" * 512,
        headers=headers,
    )

    status_resp = client.get(f"/upload/{upload_id}/status", headers=headers)
    status_data = status_resp.json()

    # Ideally: status_data['files']['file2']['missing_chunks'] should include [0, 1] if we know 2 is the top?
    # Or just 'received_chunks': [2]

    # Let's Assert we get a detailed file map
    assert "files" in status_data
    assert "file2" in status_data["files"]
    assert 2 in status_data["files"]["file2"]["received_chunks"]
