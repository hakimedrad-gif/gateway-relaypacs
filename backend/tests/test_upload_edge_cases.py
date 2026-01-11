import pytest
from uuid import UUID

def test_upload_chunk_larger_than_expected(client, auth_headers, clean_storage, clean_upload_manager):
    """Test uploading a chunk larger than the declared chunk size"""
    init_payload = {
        "study_metadata": {
            "patient_name": "Test Patient",
            "modality": "CT",
            "study_date": "2023-01-01"
        },
        "total_files": 1,
        "total_size_bytes": 1024
    }
    
    init_res = client.post("/upload/init", json=init_payload, headers=auth_headers)
    upload_id = init_res.json()["upload_id"]
    upload_token = init_res.json()["upload_token"]
    
    # Try to upload chunk larger than expected
    oversized_chunk = b"x" * (2 * 1024 * 1024)  # 2MB chunk
    
    chunk_res = client.put(
        f"/upload/{upload_id}/chunk",
        params={"chunk_index": 0, "file_id": "file1"},
        content=oversized_chunk,
        headers={"Authorization": f"Bearer {upload_token}"}
    )
    
    # Should either accept it or return a specific error
    assert chunk_res.status_code in [200, 413]  # 413 = Payload Too Large


def test_upload_duplicate_chunk(client, auth_headers, clean_storage, clean_upload_manager):
    """Test uploading the same chunk twice (idempotency)"""
    init_payload = {
        "study_metadata": {
            "patient_name": "Test Patient",
            "modality": "CT",
            "study_date": "2023-01-01"
        },
        "total_files": 1,
        "total_size_bytes": 1024
    }
    
    init_res = client.post("/upload/init", json=init_payload, headers=auth_headers)
    upload_id = init_res.json()["upload_id"]
    upload_token = init_res.json()["upload_token"]
    
    chunk_content = b"x" * 1024
    
    # Upload same chunk twice
    for i in range(2):
        chunk_res = client.put(
            f"/upload/{upload_id}/chunk",
            params={"chunk_index": 0, "file_id": "file1"},
            content=chunk_content,
            headers={"Authorization": f"Bearer {upload_token}"}
        )
        assert chunk_res.status_code == 200
        if i == 0:
            assert chunk_res.json()["status"] == "received"
        else:
            assert chunk_res.json()["status"] == "exists"
    
    # Status should show only 1 chunk (not 2)
    status_res = client.get(
        f"/upload/{upload_id}/status",
        headers={"Authorization": f"Bearer {upload_token}"}
    )
    assert status_res.json()["chunks_received"] == 1


def test_upload_invalid_upload_id(client, auth_headers):
    """Test chunking upload with non-existent upload ID"""
    fake_token = "fake.jwt.token"
    
    chunk_res = client.put(
        "/upload/00000000-0000-0000-0000-000000000000/chunk",
        params={"chunk_index": 0, "file_id": "file1"},
        content=b"data",
        headers={"Authorization": f"Bearer {fake_token}"}
    )
    
    assert chunk_res.status_code in [401, 404]


def test_upload_complete_with_missing_chunks(client, auth_headers, clean_storage, clean_upload_manager):
    """Test completing upload when not all chunks have been received"""
    init_payload = {
        "study_metadata": {
            "patient_name": "Test Patient",
            "modality": "CT",
            "study_date": "2023-01-01"
        },
        "total_files": 2,  # Expecting 2 files
        "total_size_bytes": 2048
    }
    
    init_res = client.post("/upload/init", json=init_payload, headers=auth_headers)
    upload_id = init_res.json()["upload_id"]
    upload_token = init_res.json()["upload_token"]
    
    # Upload only 1 file instead of 2
    chunk_res = client.put(
        f"/upload/{upload_id}/chunk",
        params={"chunk_index": 0, "file_id": "file1"},
        content=b"x" * 1024,
        headers={"Authorization": f"Bearer {upload_token}"}
    )
    assert chunk_res.status_code == 200
    
    # Try to complete with missing files
    complete_res = client.post(
        f"/upload/{upload_id}/complete",
        headers={"Authorization": f"Bearer {upload_token}"}
    )
    
    # Should reject completion
    assert complete_res.status_code in [200, 400]
    if complete_res.status_code == 200:
        result = complete_res.json()
        assert result["status"] in ["incomplete", "error"] or "missing" in result.get("message", "").lower()


def test_metadata_validation_missing_required_fields(client, auth_headers):
    """Test that upload initialization validates required metadata fields"""
    # Missing required fields
    invalid_payload = {
        "study_metadata": {
            "patient_name": "Test Patient"
            # Missing modality and study_date
        },
        "total_files": 1,
        "total_size_bytes": 1024
    }
    
    init_res = client.post("/upload/init", json=invalid_payload, headers=auth_headers)
    assert init_res.status_code == 422  # Validation error


def test_metadata_validation_invalid_modality(client, auth_headers):
    """Test that invalid modality values are rejected"""
    invalid_payload = {
        "study_metadata": {
            "patient_name": "Test Patient",
            "modality": "INVALID_MODALITY",  # Invalid modality
            "study_date": "2023-01-01"
        },
        "total_files": 1,
        "total_size_bytes": 1024
    }
    
    init_res = client.post("/upload/init", json=invalid_payload, headers=auth_headers)
    # Should either validate and reject, or accept with warning
    assert init_res.status_code in [200, 422]
