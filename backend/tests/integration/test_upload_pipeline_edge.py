import pytest


@pytest.fixture
def test_user_headers(client):
    """Register and login to get headers for a fresh test user."""
    from uuid import uuid4

    username = f"testuser_{uuid4().hex[:8]}"
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
    resp = client.post("/auth/login", json={"username": username, "password": "Password123!"})
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_duplicate_study_warning(
    client, test_user_headers, dummy_dicom_data, clean_storage, clean_upload_manager
):
    """Test that initializing a duplicate study returns 409 Conflict."""
    payload = {
        "filename": "test.dcm",
        "file_size": len(dummy_dicom_data),
        "total_files": 1,
        "total_size_bytes": len(dummy_dicom_data),
        "chunk_size": 1024 * 1024,
        "study_metadata": {"patient_name": "DOE^DUPE", "study_date": "20230101", "modality": "CT"},
    }

    # First init
    resp1 = client.post("/upload/init", json=payload, headers=test_user_headers)
    assert resp1.status_code == 200

    # Second init with same metadata
    resp2 = client.post("/upload/init", json=payload, headers=test_user_headers)
    assert resp2.status_code == 409
    assert "duplicate" in resp2.json()["detail"]["message"].lower()


def test_corrupt_dicom_upload(client, test_user_headers, clean_storage, clean_upload_manager):
    """Test that uploading a non-DICOM file as a chunk results in failure during completion."""
    corrupt_data = b"NOT_A_DICOM_FILE_AT_ALL"

    # 1. Init
    init_resp = client.post(
        "/upload/init",
        json={
            "filename": "corrupt.dcm",
            "file_size": len(corrupt_data),
            "total_files": 1,
            "total_size_bytes": len(corrupt_data),
            "chunk_size": 1024 * 1024,
            "study_metadata": {
                "patient_name": "DOE^CORRUPT",
                "study_date": "20230101",
                "modality": "CT",
            },
        },
        headers=test_user_headers,
    )

    upload_id = init_resp.json()["upload_id"]
    upload_token = init_resp.json()["upload_token"]

    # 2. Upload corrupt chunk
    client.put(
        f"/upload/{upload_id}/chunk?chunk_index=0&file_id=file1",
        content=corrupt_data,
        headers={
            "Authorization": f"Bearer {upload_token}",
            "Content-Type": "application/octet-stream",
        },
    )

    # 3. Complete
    complete_resp = client.post(
        f"/upload/{upload_id}/complete", headers={"Authorization": f"Bearer {upload_token}"}
    )
    assert complete_resp.status_code == 200
    data = complete_resp.json()
    assert data["status"] == "failed"
    assert data["failed_files"] == 1


def test_invalid_chunk_token(
    client, test_user_headers, dummy_dicom_data, clean_storage, clean_upload_manager
):
    """Test that using an invalid or expired token for chunk upload fails."""
    # 1. Init
    init_resp = client.post(
        "/upload/init",
        json={
            "filename": "test.dcm",
            "file_size": len(dummy_dicom_data),
            "total_files": 1,
            "total_size_bytes": len(dummy_dicom_data),
            "chunk_size": 1024 * 1024,
            "study_metadata": {
                "patient_name": "DOE^TOKEN",
                "study_date": "20230101",
                "modality": "CT",
            },
        },
        headers=test_user_headers,
    )

    upload_id = init_resp.json()["upload_id"]

    # Use a random token
    invalid_token = "invalid.token.here"

    resp = client.put(
        f"/upload/{upload_id}/chunk?chunk_index=0&file_id=file1",
        content=dummy_dicom_data,
        headers={"Authorization": f"Bearer {invalid_token}"},
    )
    assert resp.status_code == 401


def test_chunk_idempotency(
    client, test_user_headers, dummy_dicom_data, clean_storage, clean_upload_manager
):
    """Test that uploading the same chunk twice works (idempotent)."""
    # 1. Init
    init_resp = client.post(
        "/upload/init",
        json={
            "filename": "test.dcm",
            "file_size": len(dummy_dicom_data),
            "total_files": 1,
            "total_size_bytes": len(dummy_dicom_data),
            "chunk_size": 1024 * 1024,
            "study_metadata": {
                "patient_name": "DOE^IDEM",
                "study_date": "20230101",
                "modality": "CT",
            },
        },
        headers=test_user_headers,
    )

    upload_id = init_resp.json()["upload_id"]
    upload_token = init_resp.json()["upload_token"]

    # 2. Upload chunk first time
    resp1 = client.put(
        f"/upload/{upload_id}/chunk?chunk_index=0&file_id=file1",
        content=dummy_dicom_data,
        headers={
            "Authorization": f"Bearer {upload_token}",
            "Content-Type": "application/octet-stream",
        },
    )
    assert resp1.status_code == 200

    # 3. Upload same chunk again
    resp2 = client.put(
        f"/upload/{upload_id}/chunk?chunk_index=0&file_id=file1",
        content=dummy_dicom_data,
        headers={
            "Authorization": f"Bearer {upload_token}",
            "Content-Type": "application/octet-stream",
        },
    )
    assert resp2.status_code in [200, 204]
