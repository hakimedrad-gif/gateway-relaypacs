from uuid import uuid4

from app.database.reports_db import reports_db
from app.models.report import Report, ReportStatus


def test_report_lifecycle(client, auth_headers):
    # 1. Setup: Create a report manually (Simulating Upload Completion trigger)
    user_id = "test_user_id"  # Must match the one in auth_headers?
    # Actually auth_headers uses "admin"/"adminuser@123".
    # I need to know the ID of that user or mocking `get_current_user`?
    # The `auth_headers` fixture logs in real user "admin".
    # Let's inspect `test_auth.py` or similar to see what the user "sub" is.
    # Usually `auth.router.login` returns token.
    # I'll rely on the fact that `auth_headers` provides a valid token.
    # To make `user["sub"]` match, I might need to fetch /auth/me first to get the ID.

    # Let's get "me" first
    response = client.get("/auth/me", headers=auth_headers)
    if response.status_code == 200:
        current_user = response.json()
        user_id = current_user["id"]
    else:
        # Fallback if /auth/me not implemented, maybe JWT payload
        # For simplicity, create report with user_id matching what we expect?
        # In conftest.py, we create an admin user.
        # Let's just create a report and try to list it.
        pass

    # Use a mock user ID if we can't get real one easily, but `list_reports` filters by user_id from token.
    # So we MUST match the token's user_id.
    # Let's assume the auth_headers belongs to 'admin' (uid=1 usually or UUID).
    # Re-reading conftest: `test_auth.test_login` creates user.
    # `backend/app/db/database.py` might seed it?

    # Use `client` to verify who we are
    # If /auth/me doesn't exist, we might be blind.
    # Let's look at `app/auth/router.py`.

    # Try fetching list first, should be empty
    response = client.get("/reports/", headers=auth_headers)
    assert response.status_code == 200
    reports = response.json().get("reports", [])

    # If we insert a report directly into reports_db with WRONG user_id, we won't see it.
    # We need the correct user_id.
    # Hack: Inspect the token? or Just use `client.post` if there is a create report endpoint?
    # Router doesn't have create report (it's internal).

    # Alternative: The `get_current_user` dependency returns a dict with "sub".
    # "sub" is typically the username or user_id.
    # In `app/auth/utils.py`, create_access_token uses `data={"sub": username}`.
    # So user_id in `list_reports` is likely `username` ('admin').
    # But `reports_db` might expect UUID or string.
    # `Report` model has `user_id: str`.

    user_id = "admin"

    upload_id = uuid4()
    report = Report(
        upload_id=upload_id,
        study_instance_uid="1.2.3.4.5",
        status=ReportStatus.ASSIGNED,
        user_id=user_id,
    )
    reports_db.create_report(report)

    # 2. List reports and verify visibility
    response = client.get("/reports/", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 1
    fetched_report = next((r for r in data["reports"] if r["id"] == str(report.id)), None)
    assert fetched_report is not None
    assert fetched_report["status"] == "assigned"

    # 3. Get specific report
    response = client.get(f"/reports/{report.id}", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["id"] == str(report.id)

    # 4. Get report by upload ID
    response = client.get(f"/reports/upload/{upload_id}", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["id"] == str(report.id)

    # 5. Simulate status update (Background task / PACS sync)
    reports_db.update_report_status(report.id, ReportStatus.READY)

    # Verify update via API
    response = client.get(f"/reports/{report.id}", headers=auth_headers)
    assert response.json()["status"] == "ready"

    # 6. Test sync endpoint
    response = client.post(f"/reports/{report.id}/sync", headers=auth_headers)
    assert response.status_code == 200

    # 7. Test download (Mock PDF generation)
    # We need to mock pdf_generator because it might fail without real data/libs
    from unittest.mock import patch

    with patch("app.reports.pdf_service.pdf_generator.generate_report_pdf") as mock_pdf:
        mock_pdf.return_value = b"%PDF-1.4..."

        response = client.get(f"/reports/{report.id}/download", headers=auth_headers)
        assert response.status_code == 200
        assert response.headers["content-type"] == "application/pdf"
        assert b"%PDF" in response.content


def test_report_lifecycle_not_found(client, auth_headers):
    response = client.get(f"/reports/{uuid4()}", headers=auth_headers)
    assert response.status_code == 404


def test_report_lifecycle_unauthorized(client):
    # No headers
    response = client.get("/reports/")
    assert response.status_code == 401
