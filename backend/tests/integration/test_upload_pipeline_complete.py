import pytest


@pytest.fixture
def test_user_headers(client):
    """Register and login to get headers for a fresh test user."""
    from uuid import uuid4

    username = f"testuser_{uuid4().hex[:8]}"
    # Registration
    client.post(
        "/auth/register",
        json={
            "username": username,
            "email": f"{username}@example.com",
            "password": "Password123!",
            "full_name": "Test User",
            "role": "radiographer",
        },
    )
    # Login (using /auth/login for TokenPair)
    resp = client.post("/auth/login", json={"username": username, "password": "Password123!"})
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_full_upload_pipeline(
    client, test_user_headers, dummy_dicom_data, clean_storage, clean_upload_manager
):
    """Test full upload pipeline from start to completion."""
    # 1. Initialize upload
    init_resp = client.post(
        "/upload/init",
        json={
            "filename": "test.dcm",
            "file_size": len(dummy_dicom_data),
            "total_files": 1,
            "total_size_bytes": len(dummy_dicom_data),
            "chunk_size": 1024 * 1024,
            "study_metadata": {
                "patient_name": "DOE^JOHN",
                "study_date": "20230101",
                "modality": "CT",
                "service_level": "standard",
            },
        },
        headers=test_user_headers,
    )

    assert init_resp.status_code == 200
    upload_id = init_resp.json()["upload_id"]
    upload_token = init_resp.json()["upload_token"]

    # 2. Upload chunk
    # Correct path: /upload/{upload_id}/chunk
    chunk_resp = client.put(
        f"/upload/{upload_id}/chunk?chunk_index=0&file_id=file1",
        content=dummy_dicom_data,
        headers={
            "Authorization": f"Bearer {upload_token}",
            "Content-Type": "application/octet-stream",
        },
    )
    assert chunk_resp.status_code == 200

    # 3. Complete upload
    complete_resp = client.post(
        f"/upload/{upload_id}/complete", headers={"Authorization": f"Bearer {upload_token}"}
    )
    assert complete_resp.status_code == 200

    data = complete_resp.json()
    assert data["status"] == "success"
    assert data["processed_files"] == 1
    assert data["pacs_receipt_id"] == "MOCK-RECEIPT-OK"
