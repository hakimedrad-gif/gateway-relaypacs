import os
import requests
import json
from pathlib import Path

# Config
API_URL = "http://localhost:8003"
USER_EMAIL = "folder@test.com"
USER_PASS = "TestPass123!"
TEST_DATA_DIR = "/home/ubuntu-desk/Desktop/Teleradiology/geteway/test_data"

def register_and_login():
    # Register
    try:
        resp = requests.post(f"{API_URL}/auth/register", json={
            "username": "folder_tester",
            "email": USER_EMAIL,
            "password": USER_PASS
        })
        print(f"Register status: {resp.status_code}")
    except Exception as e:
        print(f"Register error: {e}")

    # Login
    resp = requests.post(f"{API_URL}/auth/login", json={
        "username": "folder_tester",
        "password": USER_PASS
    })
    resp.raise_for_status()
    return resp.json()["access_token"]

def upload_folder(token):
    files = list(Path(TEST_DATA_DIR).rglob("*.dcm"))
    print(f"Found {len(files)} DICOM files.")

    if not files:
        print("No files to upload.")
        return

    # Init Upload
    print("Initializing upload...")
    init_data = {
        "study_metadata": {
            "patient_name": "Folder Test Patient",
            "modality": "CT",
            "study_date": "2024-01-12",
            "service_level": "Routine"
        },
        "clinical_history": "Batch upload test via script.",
        "total_files": len(files),
        "total_size_bytes": sum(f.stat().st_size for f in files)
    }

    resp = requests.post(
        f"{API_URL}/upload/init",
        headers={"Authorization": f"Bearer {token}"},
        json=init_data
    )
    resp.raise_for_status()
    data = resp.json()
    upload_id = data["upload_id"]
    upload_token = data["upload_token"]
    print(f"Upload ID: {upload_id}")

    # Upload files
    for i, file_path in enumerate(files):
        print(f"Uploading {file_path.name} ({i+1}/{len(files)})...")
        with open(file_path, "rb") as f:
            resp = requests.put(
                f"{API_URL}/upload/{upload_id}/chunk",
                params={"chunk_index": i, "file_id": file_path.name},
                headers={
                    "Authorization": f"Bearer {upload_token}",
                    "Content-Type": "application/octet-stream"
                },
                data=f
            )
            resp.raise_for_status()

    # Complete
    print("Completing upload...")
    resp = requests.post(
        f"{API_URL}/upload/{upload_id}/complete",
        headers={"Authorization": f"Bearer {upload_token}"}
    )
    resp.raise_for_status()
    print("Upload completed successfully!")
    print("Result:", json.dumps(resp.json(), indent=2))

    # Check Stats
    print("\nVerifying Stats...")
    resp = requests.get(
        f"{API_URL}/upload/stats?period=1w",
        headers={"Authorization": f"Bearer {token}"}
    )
    print("Stats:", json.dumps(resp.json(), indent=2))

if __name__ == "__main__":
    try:
        token = register_and_login()
        upload_folder(token)
    except Exception as e:
        print(f"Error: {e}")
