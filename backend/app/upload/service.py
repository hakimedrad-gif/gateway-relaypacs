import json
import sqlite3
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any
from uuid import uuid4

from app.auth.utils import create_upload_token
from app.config import get_settings
from app.models.upload import StudyMetadata, UploadInitResponse
from app.storage.service import BaseStorageService

settings = get_settings()


class UploadSession:
    def __init__(  # noqa: PLR0913
        self,
        upload_id: str,
        user_id: str,
        total_files: int,
        total_size_bytes: int,
        metadata: StudyMetadata,
        clinical_history: str | None = None,
    ) -> None:
        self.upload_id = upload_id
        self.user_id = user_id
        self.metadata = metadata
        self.clinical_history = clinical_history
        self.total_files = total_files
        self.total_size_bytes = total_size_bytes
        self.uploaded_bytes = 0
        self.created_at = datetime.now(UTC)
        self.expires_at = self.created_at + timedelta(minutes=settings.upload_token_expire_minutes)
        self.files: dict[str, dict[str, Any]] = {}  # Track chunks per file

    def register_file_chunk(self, file_id: str, chunk_index: int, chunk_size: int, checksum: str | None = None) -> None:
        """Register a chunk for a file, optionally with checksum for integrity validation."""
        if file_id not in self.files:
            self.files[file_id] = {
                "chunks": set(),
                "checksums": {},  # Map of chunk_index -> checksum
                "complete": False
            }

        if chunk_index not in self.files[file_id]["chunks"]:
            self.files[file_id]["chunks"].add(chunk_index)
            self.uploaded_bytes += chunk_size
            
            # Store checksum if provided
            if checksum:
                self.files[file_id]["checksums"][chunk_index] = checksum


class UploadManager:
    """Session manager with JSON-based persistence"""

    def __init__(self, persistence_dir: Path | str = "data/sessions") -> None:
        self._sessions: dict[str, UploadSession] = {}
        self.persistence_dir = Path(persistence_dir)
        self.persistence_dir.mkdir(parents=True, exist_ok=True)
        self._load_sessions()

    def _get_session_path(self, upload_id: str) -> Path:
        return self.persistence_dir / f"{upload_id}.json"

    def _save_session(self, session: UploadSession) -> None:
        """Persist session state to disk"""
        data = {
            "upload_id": session.upload_id,
            "user_id": session.user_id,
            "metadata": session.metadata.model_dump(),
            "clinical_history": session.clinical_history,
            "total_files": session.total_files,
            "total_size_bytes": session.total_size_bytes,
            "uploaded_bytes": session.uploaded_bytes,
            "created_at": session.created_at.isoformat(),
            "expires_at": session.expires_at.isoformat(),
            "files": {
                fid: {
                    "chunks": list(info["chunks"]),
                    "checksums": info.get("checksums", {}),
                    "complete": info["complete"]
                }
                for fid, info in session.files.items()
            },
        }
        with open(self._get_session_path(session.upload_id), "w") as f:
            json.dump(data, f)

    def _load_sessions(self) -> None:
        """Load all valid sessions from disk"""
        for session_file in self.persistence_dir.glob("*.json"):
            try:
                with open(session_file) as f:
                    data = json.load(f)

                # Reconstruct session
                meta = StudyMetadata(**data["metadata"])
                session = UploadSession(
                    data["upload_id"],
                    data.get("user_id", "unknown"),
                    data["total_files"],
                    data["total_size_bytes"],
                    meta,
                    data.get("clinical_history"),
                )
                session.uploaded_bytes = data["uploaded_bytes"]
                session.created_at = datetime.fromisoformat(data["created_at"])
                session.expires_at = datetime.fromisoformat(data["expires_at"])

                # Convert list back to set
                files_data = data.get("files", {})
                for fid, info in files_data.items():
                    session.files[fid] = {
                        "chunks": set(info["chunks"]),
                        "checksums": info.get("checksums", {}),
                        "complete": info["complete"],
                    }

                # Only add if not expired (or let cleanup handle it)
                self._sessions[session.upload_id] = session
            except Exception as e:
                print(f"Failed to load session {session_file}: {e}")

    async def create_session(  # noqa: PLR0913
        self,
        user_id: str,
        metadata: StudyMetadata,
        total_files: int,
        total_size: int,
        clinical_history: str | None = None,
    ) -> UploadInitResponse:
        upload_id = uuid4()
        session = UploadSession(
            str(upload_id), user_id, total_files, total_size, metadata, clinical_history
        )
        self._sessions[str(upload_id)] = session
        self._save_session(session)

        token = create_upload_token(str(upload_id), user_id)

        return UploadInitResponse(
            upload_id=upload_id,
            upload_token=token,
            chunk_size=settings.chunk_size_mb * 1024 * 1024,
            expires_at=session.expires_at,
        )

    async def cleanup_expired_sessions(self, storage_service: BaseStorageService) -> int:
        """Find and remove expired sessions and their files"""
        now = datetime.now(UTC)
        expired_ids = [uid for uid, session in self._sessions.items() if session.expires_at < now]

        for uid in expired_ids:
            # We need to await cleanup if it's async
            await storage_service.cleanup_upload(uid)
            del self._sessions[uid]
            # Remove persistence file
            path = self._get_session_path(uid)
            if path.exists():
                path.unlink()

        return len(expired_ids)

    def get_session(self, upload_id: str) -> UploadSession | None:
        return self._sessions.get(str(upload_id))

    def remove_session(self, upload_id: str) -> None:
        if str(upload_id) in self._sessions:
            del self._sessions[str(upload_id)]
            path = self._get_session_path(upload_id)
            if path.exists():
                path.unlink()

    def update_session(self, session: UploadSession) -> None:
        """Explicitly trigger a save"""
        self._save_session(session)


class StatsManager:
    """Manager for upload statistics using SQLite for concurrency safety"""

    def __init__(self, db_path: Path | str = "data/stats.db") -> None:
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_db()

    def _init_db(self) -> None:
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS upload_stats (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    modality TEXT,
                    service_level TEXT,
                    status TEXT,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
            # Metadata table for last updated
            conn.execute("CREATE TABLE IF NOT EXISTS metadata (key TEXT PRIMARY KEY, value TEXT)")

    def record_upload(self, modality: str, service_level: str, status: str = "success") -> None:
        modality = modality.lower()
        service_level = service_level.lower()
        status = status.lower()

        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                "INSERT INTO upload_stats (modality, service_level, status) VALUES (?, ?, ?)",
                (modality, service_level, status),
            )
            conn.execute(
                "INSERT OR REPLACE INTO metadata (key, value) VALUES ('last_updated', ?)",
                (datetime.now(UTC).isoformat(),),
            )

    def get_stats(self, period: str | None = None) -> dict[str, Any]:
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row

            # Period mapping to SQLite interval
            period_map = {
                "1w": "-7 days",
                "2w": "-14 days",
                "1m": "-30 days",
                "3m": "-90 days",
                "6m": "-180 days",
            }

            time_filter = ""
            params = []
            if period and period in period_map:
                time_filter = " AND timestamp >= datetime('now', ?)"
                params.append(period_map[period])

            # Aggregate modality counts
            modalities = conn.execute(
                "SELECT modality, COUNT(*) as count FROM upload_stats "
                f"WHERE status = 'success'{time_filter} "
                "GROUP BY modality",
                params,
            ).fetchall()

            # Aggregate service level counts
            service_levels = conn.execute(
                "SELECT service_level, COUNT(*) as count FROM upload_stats "
                f"WHERE status = 'success'{time_filter} "
                "GROUP BY service_level",
                params,
            ).fetchall()

            # Total counts
            total_success = conn.execute(
                f"SELECT COUNT(*) FROM upload_stats WHERE status = 'success'{time_filter}",
                params,
            ).fetchone()[0]

            total_failed = conn.execute(
                f"SELECT COUNT(*) FROM upload_stats WHERE status = 'failed'{time_filter}",
                params,
            ).fetchone()[0]

            last_updated = conn.execute(
                "SELECT value FROM metadata WHERE key = 'last_updated'"
            ).fetchone()

            return {
                "modality": {row["modality"]: row["count"] for row in modalities},
                "service_level": {row["service_level"]: row["count"] for row in service_levels},
                "total_uploads": total_success,
                "failed_uploads": total_failed,
                "last_updated": last_updated[0] if last_updated else None,
                "period": period or "all",
            }


# Singletons
upload_manager = UploadManager()
stats_manager = StatsManager("data/stats.db")
