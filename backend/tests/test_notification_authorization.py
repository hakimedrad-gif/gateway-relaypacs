"""Tests for notification authorization (P0-3)."""

from unittest.mock import MagicMock, patch
from uuid import uuid4

import pytest
from app.notifications.router import mark_notification_read
from fastapi import HTTPException


class TestNotificationAuthorization:
    """Test notification authorization to prevent cross-user access."""

    @pytest.fixture
    def mock_reports_db(self):
        """Mock reports database."""
        with patch("app.notifications.router.reports_db") as mock_db:
            yield mock_db

    @pytest.fixture
    def current_user(self):
        """Mock current user."""
        return {"sub": "user123", "username": "testuser"}

    @pytest.fixture
    def other_user(self):
        """Mock different user."""
        return {"sub": "user456", "username": "otheruser"}

    @pytest.mark.asyncio
    async def test_mark_read_rejects_nonexistent_notification(self, mock_reports_db, current_user):
        """Test that marking non-existent notification returns 404."""
        notification_id = uuid4()
        mock_reports_db.get_notification_by_id.return_value = None

        with pytest.raises(HTTPException) as exc_info:
            await mark_notification_read(notification_id, current_user)

        assert exc_info.value.status_code == 404
        assert "not found" in exc_info.value.detail.lower()

    @pytest.mark.asyncio
    async def test_mark_read_rejects_other_user_notification(self, mock_reports_db, current_user):
        """Test that user cannot mark another user's notification as read."""
        notification_id = uuid4()

        # Notification belongs to different user
        mock_notification = MagicMock()
        mock_notification.user_id = "user456"  # Different from current_user
        mock_reports_db.get_notification_by_id.return_value = mock_notification

        with pytest.raises(HTTPException) as exc_info:
            await mark_notification_read(notification_id, current_user)

        assert exc_info.value.status_code == 403
        assert "not authorized" in exc_info.value.detail.lower()

        # Verify mark_as_read was NOT called
        mock_reports_db.mark_notification_read.assert_not_called()

    @pytest.mark.asyncio
    async def test_mark_read_allows_own_notification(self, mock_reports_db, current_user):
        """Test that user can mark their own notification as read."""
        notification_id = uuid4()

        # Notification belongs to current user
        mock_notification = MagicMock()
        mock_notification.user_id = "user123"  # Same as current_user
        mock_reports_db.get_notification_by_id.return_value = mock_notification

        # Should not raise
        result = await mark_notification_read(notification_id, current_user)

        assert result["success"] is True
        mock_reports_db.mark_notification_read.assert_called_once_with(notification_id)

    @pytest.mark.asyncio
    async def test_mark_read_verifies_ownership_before_mutation(
        self, mock_reports_db, current_user
    ):
        """Test that ownership check happens before marking as read."""
        notification_id = uuid4()

        # Notification belongs to different user
        mock_notification = MagicMock()
        mock_notification.user_id = "other_user"
        mock_reports_db.get_notification_by_id.return_value = mock_notification

        with pytest.raises(HTTPException):
            await mark_notification_read(notification_id, current_user)

        # Verify mark_as_read was NOT called (ownership check failed first)
        mock_reports_db.mark_notification_read.assert_not_called()

    @pytest.mark.asyncio
    async def test_mark_read_403_not_404_for_unauthorized(self, mock_reports_db, current_user):
        """Test that unauthorized access returns 403, not 404 (prevents info disclosure)."""
        notification_id = uuid4()

        mock_notification = MagicMock()
        mock_notification.user_id = "different_user"
        mock_reports_db.get_notification_by_id.return_value = mock_notification

        with pytest.raises(HTTPException) as exc_info:
            await mark_notification_read(notification_id, current_user)

        # Should be 403 (Forbidden), not 404 (Not Found)
        # This prevents attackers from knowing if notification exists
        assert exc_info.value.status_code == 403
