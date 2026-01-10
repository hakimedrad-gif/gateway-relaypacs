import pytest
from uuid import UUID

def test_upload_flow_happy_path(client, auth_headers, clean_storage, clean_upload_manager, dummy_dicom_data):
    # 1. Initialize Upload
    init_payload = {
        "study_metadata": {
            "patient_name": "Test Patient",
            "modality": "CT",
            "study_date": "2023-01-01"
        },
        "total_files": 1,
        "total_size_bytes": len(dummy_dicom_data)
    }
    
    init_res = client.post("/upload/init", json=init_payload, headers=auth_headers)
    assert init_res.status_code == 200
    init_data = init_res.json()
    
    upload_id = init_data["upload_id"]
    upload_token = init_data["upload_token"]
    
    assert upload_id is not None
    assert upload_token is not None
    
    # 2. Upload Chunk
    chunk_content = dummy_dicom_data
    file_id = "file1"
    
    chunk_res = client.put(
        f"/upload/{upload_id}/chunk",
        params={"chunk_index": 0, "file_id": file_id},
        content=chunk_content,
        headers={"Authorization": f"Bearer {upload_token}"}
    )
    
    assert chunk_res.status_code == 200
    chunk_data = chunk_res.json()
    assert chunk_data["received_bytes"] == len(dummy_dicom_data)
    
    # 3. Check Status
    status_res = client.get(
        f"/upload/{upload_id}/status",
        headers={"Authorization": f"Bearer {upload_token}"}
    )
    assert status_res.status_code == 200
    status_data = status_res.json()
    assert status_data["chunks_received"] == 1
    assert status_data["progress_percent"] == 100.0
    assert status_data["uploaded_bytes"] == len(dummy_dicom_data)
    assert status_data["total_bytes"] == len(dummy_dicom_data)
    
    # 4. Complete Upload
    complete_res = client.post(
        f"/upload/{upload_id}/complete",
        headers={"Authorization": f"Bearer {upload_token}"}
    )
    
    assert complete_res.status_code == 200
    assert complete_res.json()["status"] == "success"

def test_upload_init_unauthorized(client):
    res = client.post("/upload/init", json={})
    assert res.status_code == 401

def test_upload_chunk_invalid_token(client):
    res = client.put(
        "/upload/some-uuid/chunk",
        params={"chunk_index": 0, "file_id": "f1"},
        content=b"data",
        headers={"Authorization": "Bearer invalid-token"}
    )
    assert res.status_code == 401
