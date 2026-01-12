"""API router for notifications and SSE endpoints."""

from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends

from app.auth.dependencies import get_current_user
from app.database.reports_db import reports_db
from app.models.report import NotificationListResponse
from app.notifications.service import notification_service

router = APIRouter()


@router.get("/", response_model=NotificationListResponse)
async def list_notifications(
    limit: int = 50,
    offset: int = 0,
    unread_only: bool = False,
    user: dict[str, Any] = Depends(get_current_user),
):
    """
    List notifications for the authenticated user.

    Query params:
    - limit: Max number of notifications to return (default: 50)
    - offset: Offset for pagination (default: 0)
    - unread_only: If true, only return unread notifications
    """
    user_id = user["sub"]

    notifications = reports_db.get_user_notifications(
        user_id=user_id, limit=limit, offset=offset, unread_only=unread_only
    )

    unread_count = reports_db.get_unread_count(user_id)
    total = len(notifications)

    return NotificationListResponse(
        notifications=notifications, unread_count=unread_count, total=total
    )


@router.patch("/{notification_id}/read")
async def mark_notification_read(
    notification_id: UUID,
    user: dict[str, Any] = Depends(get_current_user),
):
    """Mark a specific notification as read."""
    # TODO: Verify the notification belongs to the user before marking as read
    reports_db.mark_notification_read(notification_id)

    return {"success": True}


@router.patch("/read-all")
async def mark_all_notifications_read(
    user: dict[str, Any] = Depends(get_current_user),
):
    """Mark all notifications as read for the current user."""
    user_id = user["sub"]
    count = reports_db.mark_all_notifications_read(user_id)

    return {"count": count}


@router.get("/stream")
async def notifications_stream(
    user: dict[str, Any] = Depends(get_current_user),
):
    """
    Server-Sent Events (SSE) endpoint for real-time notifications.

    Returns an event stream that pushes notifications to the client in real-time.

    Events:
    - connected: Initial connection confirmation
    - unread_count: Current unread notification count
    - notification: New notification data
    - heartbeat: Keep-alive message (every 30 seconds)
    """
    user_id = user["sub"]
    return await notification_service.subscribe_sse(user_id)
