import asyncio
from uuid import uuid4

import pytest
from app.database.reports_db import reports_db
from app.models.report import Notification, NotificationType, Report, ReportStatus
from app.notifications.service import notification_service
from app.reports.pdf_service import pdf_generator


@pytest.fixture
def sample_user_id():
    return "test-user-123"


@pytest.fixture
def sample_upload_id():
    return uuid4()


@pytest.fixture
def clean_db():
    # Helper to clear tables before tests if needed
    # For now, we rely on unique IDs or fresh DB in test env
    yield reports_db


def test_create_and_get_report(sample_user_id, sample_upload_id):
    """Test basic report creation and retrieval."""
    report_id = uuid4()
    report = Report(
        id=report_id,
        upload_id=sample_upload_id,
        study_instance_uid="1.2.3.4.5.6.7.8.9",
        status=ReportStatus.ASSIGNED,
        user_id=sample_user_id,
    )

    created = reports_db.create_report(report)
    assert created.id == report_id

    retrieved = reports_db.get_report_by_id(report_id)
    assert retrieved is not None
    assert retrieved.study_instance_uid == "1.2.3.4.5.6.7.8.9"
    assert retrieved.user_id == sample_user_id


def test_update_report_status(sample_user_id, sample_upload_id):
    """Test report status updates and metadata changes."""
    report_id = uuid4()
    report = Report(
        id=report_id,
        upload_id=sample_upload_id,
        study_instance_uid="test-uid-update",
        status=ReportStatus.ASSIGNED,
        user_id=sample_user_id,
    )
    reports_db.create_report(report)

    # Update to READY
    updated = reports_db.update_report_status(
        report_id,
        ReportStatus.READY,
        report_url="http://storage.com/report.pdf",
        radiologist_name="Dr. Smith",
        report_text="All clear.",
    )

    assert updated.status == ReportStatus.READY
    assert updated.radiologist_name == "Dr. Smith"
    assert updated.report_url == "http://storage.com/report.pdf"


def test_notification_operations(sample_user_id, sample_upload_id):
    """Test notification creation, unread count, and marking as read."""
    notif = Notification(
        id=uuid4(),
        user_id=sample_user_id,
        notification_type=NotificationType.REPORT_READY,
        title="Report Ready",
        message="Your report is ready for viewing",
        related_upload_id=sample_upload_id,
        is_read=False,
    )

    reports_db.create_notification(notif)

    count = reports_db.get_unread_count(sample_user_id)
    assert count >= 1

    reports_db.mark_notification_read(notif.id)
    new_count = reports_db.get_unread_count(sample_user_id)
    assert new_count == count - 1


@pytest.mark.asyncio
async def test_notification_broadcast(sample_user_id):
    """Test notification service SSE broadcast simulation."""
    # Simulate an active connection
    queue = asyncio.Queue()
    if sample_user_id not in notification_service._connections:
        notification_service._connections[sample_user_id] = []
    notification_service._connections[sample_user_id].append(queue)

    notif = Notification(
        id=uuid4(),
        user_id=sample_user_id,
        notification_type=NotificationType.UPLOAD_COMPLETE,
        title="Upload Done",
        message="Your files are ready",
    )

    # Broadcast
    await notification_service._broadcast_to_user(sample_user_id, notif)

    # Verify queue received the event
    data = await asyncio.wait_for(queue.get(), timeout=1.0)
    assert data["title"] == "Upload Done"
    assert data["type"] == "upload_complete"

    # Cleanup
    notification_service._connections[sample_user_id].remove(queue)


def test_pdf_generation(sample_user_id, sample_upload_id):
    """Test PDF generation service output."""
    report = Report(
        id=uuid4(),
        upload_id=sample_upload_id,
        study_instance_uid="test-uid-pdf",
        status=ReportStatus.READY,
        radiologist_name="Dr. Generator",
        report_text="Test Findings.",
        user_id=sample_user_id,
    )

    pdf_bytes = pdf_generator.generate_report_pdf(report)
    assert isinstance(pdf_bytes, bytes)
    assert len(pdf_bytes) > 1000  # Basic size check
    assert pdf_bytes.startswith(b"%PDF")  # PDF header check
