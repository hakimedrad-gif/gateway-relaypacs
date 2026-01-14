from uuid import uuid4

import pytest
from app.database.reports_db import ReportsDatabase
from app.models.report import Notification, NotificationType, Report, ReportStatus


@pytest.fixture
def db(tmp_path):
    """Return a fresh ReportsDatabase with temp file."""
    db_path = tmp_path / "reports.db"
    return ReportsDatabase(db_path=str(db_path))


def test_create_report(db):
    """Test report creation."""
    report = Report(
        upload_id=uuid4(), study_instance_uid="1.2.3", user_id="user1", radiologist_name="Dr. Smith"
    )
    created = db.create_report(report)
    assert created.id == report.id

    # Verify in DB
    retrieved = db.get_report_by_id(report.id)
    assert retrieved is not None
    assert retrieved.study_instance_uid == "1.2.3"
    assert retrieved.radiologist_name == "Dr. Smith"


def test_get_report_by_id(db):
    """Test report retrieval by ID."""
    uid = uuid4()
    report = Report(id=uid, upload_id=uuid4(), study_instance_uid="1.2.3", user_id="user1")
    db.create_report(report)

    found = db.get_report_by_id(uid)
    assert found is not None
    assert found.id == uid


def test_get_report_by_upload_id(db):
    """Test report retrieval by upload ID."""
    up_id = uuid4()
    report = Report(upload_id=up_id, study_instance_uid="1.2.3", user_id="user1")
    db.create_report(report)

    found = db.get_report_by_upload_id(up_id)
    assert found is not None
    assert found.upload_id == up_id


def test_get_reports_by_user(db):
    """Test listing reports for a user."""
    user_id = "user_test"
    db.create_report(Report(upload_id=uuid4(), study_instance_uid="S1", user_id=user_id))
    db.create_report(Report(upload_id=uuid4(), study_instance_uid="S2", user_id=user_id))
    db.create_report(Report(upload_id=uuid4(), study_instance_uid="S3", user_id="other"))

    reports = db.get_reports_by_user(user_id)
    assert len(reports) == 2


def test_list_reports_filtered_by_status(db):
    """Test filtering reports by status."""
    user_id = "user1"
    r1 = Report(
        upload_id=uuid4(), study_instance_uid="S1", user_id=user_id, status=ReportStatus.READY
    )
    r2 = Report(
        upload_id=uuid4(), study_instance_uid="S2", user_id=user_id, status=ReportStatus.PENDING
    )
    db.create_report(r1)
    db.create_report(r2)

    ready_reports = db.get_reports_by_user(user_id, status=ReportStatus.READY)
    assert len(ready_reports) == 1
    assert ready_reports[0].study_instance_uid == "S1"


def test_update_report_status(db):
    """Test updating report status."""
    report = Report(upload_id=uuid4(), study_instance_uid="1.2.3", user_id="user1")
    db.create_report(report)

    updated = db.update_report_status(
        report.id, ReportStatus.READY, report_text="Looks good", report_url="pdf_url"
    )

    assert updated.status == ReportStatus.READY
    assert updated.report_text == "Looks good"
    assert updated.report_url == "pdf_url"


def test_create_notification(db):
    """Test notification creation."""
    notif = Notification(
        user_id="user1",
        notification_type=NotificationType.REPORT_READY,
        title="Report Ready",
        message="Your report is ready",
    )
    db.create_notification(notif)

    notifs = db.get_user_notifications("user1")
    assert len(notifs) == 1
    assert notifs[0].title == "Report Ready"


def test_mark_notification_read(db):
    """Test marking notification as read."""
    notif = Notification(
        user_id="user1", notification_type=NotificationType.REPORT_READY, title="T", message="M"
    )
    db.create_notification(notif)

    db.mark_notification_read(notif.id)

    notifs = db.get_user_notifications("user1")
    assert notifs[0].is_read is True


def test_unread_count(db):
    """Test unread notification count."""
    user_id = "user1"
    db.create_notification(
        Notification(
            user_id=user_id,
            notification_type=NotificationType.REPORT_READY,
            title="T1",
            message="M1",
        )
    )
    db.create_notification(
        Notification(
            user_id=user_id,
            notification_type=NotificationType.REPORT_READY,
            title="T2",
            message="M2",
        )
    )

    assert db.get_unread_count(user_id) == 2

    # Mark one read
    notifs = db.get_user_notifications(user_id)
    db.mark_notification_read(notifs[0].id)

    assert db.get_unread_count(user_id) == 1


def test_mark_all_notifications_read(db):
    """Test marking all read."""
    user_id = "user1"
    db.create_notification(
        Notification(
            user_id=user_id,
            notification_type=NotificationType.REPORT_READY,
            title="T1",
            message="M1",
        )
    )
    db.create_notification(
        Notification(
            user_id=user_id,
            notification_type=NotificationType.REPORT_READY,
            title="T2",
            message="M2",
        )
    )

    count = db.mark_all_notifications_read(user_id)
    assert count == 2
    assert db.get_unread_count(user_id) == 0


def test_report_audit_trail(db):
    """Test updated_at changes on update."""
    report = Report(upload_id=uuid4(), study_instance_uid="1.2.3", user_id="user1")
    db.create_report(report)
    old_updated_at = report.updated_at

    import time

    time.sleep(0.1)  # Ensure time moves

    updated = db.update_report_status(report.id, ReportStatus.READY)
    assert updated.updated_at > old_updated_at
