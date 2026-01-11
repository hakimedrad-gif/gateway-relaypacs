def test_full_feature_integration(
    client, auth_headers, clean_storage, clean_upload_manager, dummy_dicom_data
):
    # 1. Initialize Upload with new features metadata
    clinical_history = "Integration test history content"
    init_payload = {
        "study_metadata": {
            "patient_name": "Integration Patient",
            "modality": "MRI",
            "study_date": "2023-10-10",
            "service_level": "Stat",
            "age": "45Y",
            "gender": "F",
        },
        "clinical_history": clinical_history,
        "total_files": 1,
        "total_size_bytes": len(dummy_dicom_data),
    }

    init_res = client.post("/upload/init", json=init_payload, headers=auth_headers)
    assert init_res.status_code == 200
    init_data = init_res.json()
    upload_id = init_data["upload_id"]
    upload_token = init_data["upload_token"]

    # 2. Upload Chunk
    file_id = "file_int_1"
    chunk_res = client.put(
        f"/upload/{upload_id}/chunk",
        params={"chunk_index": 0, "file_id": file_id},
        content=dummy_dicom_data,
        headers={"Authorization": f"Bearer {upload_token}"},
    )
    assert chunk_res.status_code == 200

    # 3. Complete Upload
    complete_res = client.post(
        f"/upload/{upload_id}/complete", headers={"Authorization": f"Bearer {upload_token}"}
    )
    assert complete_res.status_code == 200
    assert complete_res.json()["status"] == "success"

    # 4. Verify Stats
    stats_res = client.get("/upload/stats", headers=auth_headers)
    assert stats_res.status_code == 200
    stats_data = stats_res.json()

    assert stats_data["total_uploads"] >= 1
    assert stats_data["modality"]["mri"] >= 1
    assert stats_data["service_level"]["stat"] >= 1
    assert stats_data["last_updated"] is not None


def test_stats_period_filtering_api(client, auth_headers):
    # Test that api accepts and responds to period filter
    periods = ["1w", "2w", "1m", "3m", "6m", "all"]
    for p in periods:
        res = client.get(f"/upload/stats?period={p}", headers=auth_headers)
        assert res.status_code == 200
        assert res.json()["period"] == p
