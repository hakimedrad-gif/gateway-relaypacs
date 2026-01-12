"""Notification service for creating and broadcasting notifications via SSE."""

import asyncio
import json
from typing import Optional
from uuid import UUID

from sse_starlette.sse import EventSourceResponse

from app.database.reports_db import reports_db
from app.models.report import Notification, NotificationType


class NotificationService:
    """Service for managing notifications and Server-Sent Events connections."""

    def __init__(self):
        """Initialize notification service."""
        # Map user_id to asyncio.Queue for SSE connections
        self._connections: dict[str, list[asyncio.Queue]] = {}

    async def create_and_broadcast(
        self,
        user_id: str,
        notification_type: NotificationType,
        title: str,
        message: str,
        upload_id: Optional[UUID] = None,
        report_id: Optional[UUID] = None,
    ) -> Notification:
        """Create notification and broadcast to all user's SSE connections."""
        # Create notification in database
        notification = Notification(
            user_id=user_id,
            notification_type=notification_type,
            title=title,
            message=message,
            related_upload_id=upload_id,
            related_report_id=report_id,
        )

        reports_db.create_notification(notification)

        # Broadcast to all active SSE connections for this user
        await self._broadcast_to_user(user_id, notification)

        return notification

    async def _broadcast_to_user(self, user_id: str, notification: Notification):
        """Broadcast notification to all SSE connections for a user."""
        if user_id in self._connections:
            # Create notification event data
            event_data = {
                "id": str(notification.id),
                "type": notification.notification_type.value,
                "title": notification.title,
                "message": notification.message,
                "related_upload_id": (
                    str(notification.related_upload_id) if notification.related_upload_id else None
                ),
                "related_report_id": (
                    str(notification.related_report_id) if notification.related_report_id else None
                ),
                "created_at": notification.created_at.isoformat(),
            }

            # Send to all active connections
            queues_to_remove = []
            for queue in self._connections[user_id]:
                try:
                    await queue.put(event_data)
                except Exception:
                    # Mark for removal if queue is closed
                    queues_to_remove.append(queue)

            # Clean up closed connections
            for queue in queues_to_remove:
                self._connections[user_id].remove(queue)

    async def subscribe_sse(self, user_id: str) -> EventSourceResponse:
        """Subscribe to SSE notifications for a user."""
        queue: asyncio.Queue = asyncio.Queue()

        # Add queue to user's connections
        if user_id not in self._connections:
            self._connections[user_id] = []
        self._connections[user_id].append(queue)

        async def event_generator():
            """Generate SSE events for this connection."""
            try:
                # Send initial connection success event
                yield {
                    "event": "connected",
                    "data": json.dumps({"message": "Connected to notifications"}),
                }

                # Send unread count on connection
                unread_count = reports_db.get_unread_count(user_id)
                yield {
                    "event": "unread_count",
                    "data": json.dumps({"count": unread_count}),
                }

                while True:
                    # Wait for notification or heartbeat
                    try:
                        # Wait up to 30 seconds for a notification
                        notification_data = await asyncio.wait_for(queue.get(), timeout=30.0)

                        yield {
                            "event": "notification",
                            "data": json.dumps(notification_data),
                        }

                    except asyncio.TimeoutError:
                        # Send heartbeat to keep connection alive
                        yield {
                            "event": "heartbeat",
                            "data": json.dumps({"timestamp": "alive"}),
                        }

            except asyncio.CancelledError:
                # Connection closed
                pass
            finally:
                # Cleanup: remove queue from connections
                if user_id in self._connections and queue in self._connections[user_id]:
                    self._connections[user_id].remove(queue)
                    if not self._connections[user_id]:
                        del self._connections[user_id]

        return EventSourceResponse(event_generator())

    def get_active_connections_count(self, user_id: str) -> int:
        """Get number of active SSE connections for a user."""
        return len(self._connections.get(user_id, []))


# Singleton instance
notification_service = NotificationService()
