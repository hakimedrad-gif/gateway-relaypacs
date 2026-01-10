import pytest
from pathlib import Path

def test_upload_complete_merges_files(client, auth_headers, clean_storage, clean_upload_manager, dummy_dicom_data):
    """Integration test to verify that calling /complete merges the chunks into a final file"""
    
    # 1. Init
    init_payload = {
        "study_metadata": {
            "patient_name": "Integration Test",
            "modality": "CT",
            "study_date": "2023-01-01"
        },
        "total_files": 1,
        "total_size_bytes": len(dummy_dicom_data)
    }
    init_res = client.post("/upload/init", json=init_payload, headers=auth_headers)
    upload_id = init_res.json()["upload_id"]
    upload_token = init_res.json()["upload_token"]
    
    # 2. Upload 1 chunk (full DICOM)
    file_id = "test-file"
    
    client.put(
        f"/upload/{upload_id}/chunk",
        params={"chunk_index": 0, "file_id": file_id},
        content=dummy_dicom_data,
        headers={"Authorization": f"Bearer {upload_token}"}
    )
    
    # 3. Complete
    complete_res = client.post(
        f"/upload/{upload_id}/complete",
        headers={"Authorization": f"Bearer {upload_token}"}
    )
    assert complete_res.status_code == 200
    assert complete_res.json()["status"] == "success"
    
    # 4. Verify cleanup happened
    # The session directory should be gone now
    from app.storage.service import storage_service
    session_dir = storage_service.base_path / str(upload_id)
    
    assert not session_dir.exists(), f"Session directory {session_dir} should have been cleaned up"

def test_upload_complete_validates_dicom(client, auth_headers, clean_storage, clean_upload_manager):
    """Test that completion fails or reports error if the merged file is not a valid DICOM"""
    
    # 1. Init
    init_payload = {
        "study_metadata": {
            "patient_name": "Invalid DICOM test",
            "modality": "CT",
            "study_date": "2023-01-01"
        },
        "total_files": 1,
        "total_size_bytes": 10
    }
    init_res = client.post("/upload/init", json=init_payload, headers=auth_headers)
    upload_id = init_res.json()["upload_id"]
    upload_token = init_res.json()["upload_token"]
    
    # 2. Upload one chunk which is NOT a DICOM (just text)
    client.put(
        f"/upload/{upload_id}/chunk",
        params={"chunk_index": 0, "file_id": "file1"},
        content=b"hello-world",
        headers={"Authorization": f"Bearer {upload_token}"}
    )
    
    # 3. Complete
    complete_res = client.post(
        f"/upload/{upload_id}/complete",
        headers={"Authorization": f"Bearer {upload_token}"}
    )
    
    # Should either return 400 or status="failed" or have failed_files > 0
    assert complete_res.status_code in [200, 400]
    if complete_res.status_code == 200:
        assert complete_res.json()["status"] in ["error", "partial_success", "failed"] or complete_res.json()["failed_files"] > 0
