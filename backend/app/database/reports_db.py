"""Database service for reports and notifications using SQLite."""

import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Any, cast
from uuid import UUID

from app.models.report import Notification, NotificationType, Report, ReportStatus


class ReportsDatabase:
    """SQLite database service for reports and notifications."""

    def __init__(self, db_path: str = "data/reports.db"):
        """Initialize database connection and create tables if needed."""
        self.db_path = db_path
        Path(db_path).parent.mkdir(parents=True, exist_ok=True)
        self._init_schema()

    def _get_connection(self) -> sqlite3.Connection:
        """Get database connection."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_schema(self) -> None:
        """Initialize database schema."""
        conn = self._get_connection()
        cursor = conn.cursor()

        # Reports table
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS reports (
                id TEXT PRIMARY KEY,
                upload_id TEXT NOT NULL,
                study_instance_uid TEXT NOT NULL,
                status TEXT NOT NULL,
                radiologist_name TEXT,
                report_text TEXT,
                report_url TEXT,
                user_id TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                UNIQUE(upload_id)
            )
        """
        )

        # Notifications table
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS notifications (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                notification_type TEXT NOT NULL,
                title TEXT NOT NULL,
                message TEXT NOT NULL,
                related_upload_id TEXT,
                related_report_id TEXT,
                is_read INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL
            )
        """
        )

        # Create indexes
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_reports_upload_id ON reports(upload_id)")
        cursor.execute(
            "CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)"
        )
        cursor.execute(
            "CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read)"
        )

        conn.commit()
        conn.close()

    # Report methods

    def create_report(self, report: Report) -> Report:
        """Create a new report record."""
        conn = self._get_connection()
        cursor = conn.cursor()

        cursor.execute(
            """
            INSERT INTO reports
            (id, upload_id, study_instance_uid, status, radiologist_name,
             report_text, report_url, user_id, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
            (
                str(report.id),
                str(report.upload_id),
                report.study_instance_uid,
                report.status.value,
                report.radiologist_name,
                report.report_text,
                report.report_url,
                report.user_id,
                report.created_at.isoformat(),
                report.updated_at.isoformat(),
            ),
        )

        conn.commit()
        conn.close()
        return report

    def get_report_by_id(self, report_id: UUID) -> Report | None:
        """Get report by ID."""
        conn = self._get_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM reports WHERE id = ?", (str(report_id),))
        row = cursor.fetchone()
        conn.close()

        if row:
            return self._row_to_report(row)
        return None

    def get_report_by_upload_id(self, upload_id: UUID) -> Report | None:
        """Get report by upload ID."""
        conn = self._get_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM reports WHERE upload_id = ?", (str(upload_id),))
        row = cursor.fetchone()
        conn.close()

        if row:
            return self._row_to_report(row)
        return None

    def get_reports_by_user(
        self,
        user_id: str,
        status: ReportStatus | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[Report]:
        """Get reports for a user with optional status filter."""
        conn = self._get_connection()
        cursor = conn.cursor()

        if status:
            cursor.execute(
                """
                SELECT * FROM reports
                WHERE user_id = ? AND status = ?
                ORDER BY created_at DESC
                LIMIT ? OFFSET ?
            """,
                (user_id, status.value, limit, offset),
            )
        else:
            cursor.execute(
                """
                SELECT * FROM reports
                WHERE user_id = ?
                ORDER BY created_at DESC
                LIMIT ? OFFSET ?
            """,
                (user_id, limit, offset),
            )

        rows = cursor.fetchall()
        conn.close()

        return [self._row_to_report(row) for row in rows]

    def update_report_status(  # noqa: PLR0913
        self,
        report_id: UUID,
        status: ReportStatus,
        report_url: str | None = None,
        radiologist_name: str | None = None,
        report_text: str | None = None,
    ) -> Report | None:
        """Update report status and optional fields."""
        conn = self._get_connection()
        cursor = conn.cursor()

        update_fields = ["status = ?", "updated_at = ?"]
        params: list[Any] = [status.value, datetime.utcnow().isoformat()]

        if report_url is not None:
            update_fields.append("report_url = ?")
            params.append(report_url)

        if radiologist_name is not None:
            update_fields.append("radiologist_name = ?")
            params.append(radiologist_name)

        if report_text is not None:
            update_fields.append("report_text = ?")
            params.append(report_text)

        params.append(str(report_id))

        cursor.execute(f"UPDATE reports SET {', '.join(update_fields)} WHERE id = ?", tuple(params))

        conn.commit()
        conn.close()

        return self.get_report_by_id(report_id)

    def _row_to_report(self, row: sqlite3.Row) -> Report:
        """Convert database row to Report model."""
        return Report(
            id=UUID(row["id"]),
            upload_id=UUID(row["upload_id"]),
            study_instance_uid=row["study_instance_uid"],
            status=ReportStatus(row["status"]),
            radiologist_name=row["radiologist_name"],
            report_text=row["report_text"],
            report_url=row["report_url"],
            user_id=row["user_id"],
            created_at=datetime.fromisoformat(row["created_at"]),
            updated_at=datetime.fromisoformat(row["updated_at"]),
        )

    # Notification methods

    def create_notification(self, notification: Notification) -> Notification:
        """Create a new notification."""
        conn = self._get_connection()
        cursor = conn.cursor()

        cursor.execute(
            """
            INSERT INTO notifications
            (id, user_id, notification_type, title, message,
             related_upload_id, related_report_id, is_read, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
            (
                str(notification.id),
                notification.user_id,
                notification.notification_type.value,
                notification.title,
                notification.message,
                str(notification.related_upload_id) if notification.related_upload_id else None,
                str(notification.related_report_id) if notification.related_report_id else None,
                1 if notification.is_read else 0,
                notification.created_at.isoformat(),
            ),
        )

        conn.commit()
        conn.close()
        return notification

    def get_user_notifications(
        self, user_id: str, limit: int = 50, offset: int = 0, unread_only: bool = False
    ) -> list[Notification]:
        """Get notifications for a user."""
        conn = self._get_connection()
        cursor = conn.cursor()

        if unread_only:
            cursor.execute(
                """
                SELECT * FROM notifications
                WHERE user_id = ? AND is_read = 0
                ORDER BY created_at DESC
                LIMIT ? OFFSET ?
            """,
                (user_id, limit, offset),
            )
        else:
            cursor.execute(
                """
                SELECT * FROM notifications
                WHERE user_id = ?
                ORDER BY created_at DESC
                LIMIT ? OFFSET ?
            """,
                (user_id, limit, offset),
            )

        rows = cursor.fetchall()
        conn.close()

        return [self._row_to_notification(row) for row in rows]

    def mark_notification_read(self, notification_id: UUID) -> None:
        """Mark a notification as read."""
        conn = self._get_connection()
        cursor = conn.cursor()

        cursor.execute(
            "UPDATE notifications SET is_read = 1 WHERE id = ?",
            (str(notification_id),),
        )

        conn.commit()
        conn.close()

    def mark_all_notifications_read(self, user_id: str) -> int:
        """Mark all notifications as read for a user. Returns count updated."""
        conn = self._get_connection()
        cursor = conn.cursor()

        cursor.execute(
            "UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0",
            (user_id,),
        )

        count = cursor.rowcount
        conn.commit()
        conn.close()
        return count

    def get_unread_count(self, user_id: str) -> int:
        """Get count of unread notifications for a user."""
        conn = self._get_connection()
        cursor = conn.cursor()

        cursor.execute(
            "SELECT COUNT(*) FROM notifications WHERE user_id = ? AND is_read = 0",
            (user_id,),
        )

        count = cursor.fetchone()[0]
        conn.close()
        return cast(int, count)

    def _row_to_notification(self, row: sqlite3.Row) -> Notification:
        """Convert database row to Notification model."""
        return Notification(
            id=UUID(row["id"]),
            user_id=row["user_id"],
            notification_type=NotificationType(row["notification_type"]),
            title=row["title"],
            message=row["message"],
            related_upload_id=UUID(row["related_upload_id"]) if row["related_upload_id"] else None,
            related_report_id=UUID(row["related_report_id"]) if row["related_report_id"] else None,
            is_read=bool(row["is_read"]),
            created_at=datetime.fromisoformat(row["created_at"]),
        )


# Singleton instance
reports_db = ReportsDatabase()
