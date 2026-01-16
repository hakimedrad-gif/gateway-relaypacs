import requests
import time
import os
import sys

# Constants
BASE_URL = "http://localhost:8001"
FILE_PATH = "test_e2e.dcm"

def test_live_workflow():
    print(f"Waiting for backend at {BASE_URL}...")
    for _ in range(30):
        try:
            r = requests.get(f"{BASE_URL}/health")
            if r.status_code == 200:
                print("Backend is ready!")
                break
        except requests.exceptions.ConnectionError:
            time.sleep(1)
            continue
    else:
        print("Backend failed to start.")
        sys.exit(1)

    # 1. Login
    print("\n1. Logging in...")
    resp = requests.post(f"{BASE_URL}/auth/login", json={"username": "admin", "password": "password"})
    if resp.status_code != 200:
        print(f"Login failed: {resp.text}")
        sys.exit(1)

    token = resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print(f"   Success! Token: {token[:10]}...")

    # 2. Init Upload
    print("\n2. Initializing upload...")
    with open(FILE_PATH, "rb") as f:
        content = f.read()
        size = len(content)

    payload = {
        "study_metadata": {
            "patient_name": "E2E TEST PATIENT",
            "modality": "CT",
            "study_date": "20230101"
        },
        "total_files": 1,
        "total_size_bytes": size
    }

    resp = requests.post(f"{BASE_URL}/upload/init", json=payload, headers=headers)
    if resp.status_code != 200:
        print(f"Init failed: {resp.text}")
        sys.exit(1)

    data = resp.json()
    upload_id = data["upload_id"]
    upload_token = data["upload_token"]
    # Upload token headers
    upload_headers = {"Authorization": f"Bearer {upload_token}"}
    print(f"   Success! Upload ID: {upload_id}")

    # 3. Upload Chunk
    print("\n3. Uploading chunk...")
    # Using 'file1' as hardcoded file_id
    resp = requests.put(
        f"{BASE_URL}/upload/{upload_id}/chunk",
        params={"chunk_index": 0, "file_id": "file1"},
        data=content, # Raw binary
        headers=upload_headers
    )

    if resp.status_code != 200:
        print(f"Chunk upload failed: {resp.text}")
        sys.exit(1)
    print("   Chunk uploaded successfully.")

    # 4. Complete Upload
    print("\n4. Completing upload...")
    resp = requests.post(
        f"{BASE_URL}/upload/{upload_id}/complete",
        headers=upload_headers
    )

    result = resp.json()
    print(f"   Response: {result}")

    # Assertions
    if resp.status_code != 200:
        print("   FAILED: Status code not 200")
        sys.exit(1)

    if result["status"] == "success":
        print("   ✅ SUCCESS: Upload completed and processed.")
    elif result["status"] == "partial_success":
         print("   ⚠️ PARTIAL SUCCESS: Files processed but PACS forwarding might have failed (expected in disconnected dev env).")
         # Check warnings
         print(f"   Warnings: {result.get('warnings')}")
    else:
        print(f"   ❌ FAILED: Status is {result['status']}")
        sys.exit(1)

if __name__ == "__main__":
    test_live_workflow()
