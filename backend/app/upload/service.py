from typing import Dict
from uuid import uuid4
from datetime import datetime, UTC, timedelta
from app.models.upload import StudyMetadata, UploadInitResponse, ChunkUploadResponse
from app.auth.utils import create_upload_token
from app.config import get_settings

settings = get_settings()

class UploadSession:
    def __init__(self, upload_id: str, total_files: int, total_size_bytes: int, metadata: StudyMetadata):
        self.upload_id = upload_id
        self.metadata = metadata
        self.total_files = total_files
        self.total_size_bytes = total_size_bytes
        self.uploaded_bytes = 0
        self.created_at = datetime.now(UTC)
        self.expires_at = self.created_at + timedelta(minutes=settings.upload_token_expire_minutes)
        self.files: Dict[str, Dict] = {}  # Track chunks per file
    
    def register_file_chunk(self, file_id: str, chunk_index: int, chunk_size: int):
        if file_id not in self.files:
            self.files[file_id] = {"chunks": set(), "complete": False}
        
        if chunk_index not in self.files[file_id]["chunks"]:
            self.files[file_id]["chunks"].add(chunk_index)
            self.uploaded_bytes += chunk_size


import json
from pathlib import Path

class UploadManager:
    """Session manager with JSON-based persistence"""
    
    def __init__(self, persistence_dir: Path | str = "data/sessions"):
        self._sessions: Dict[str, UploadSession] = {}
        self.persistence_dir = Path(persistence_dir)
        self.persistence_dir.mkdir(parents=True, exist_ok=True)
        self._load_sessions()

    def _get_session_path(self, upload_id: str) -> Path:
        return self.persistence_dir / f"{upload_id}.json"

    def _save_session(self, session: UploadSession):
        """Persist session state to disk"""
        data = {
            "upload_id": session.upload_id,
            "metadata": session.metadata.model_dump(),
            "total_files": session.total_files,
            "total_size_bytes": session.total_size_bytes,
            "uploaded_bytes": session.uploaded_bytes,
            "created_at": session.created_at.isoformat(),
            "expires_at": session.expires_at.isoformat(),
            "files": {
                fid: {
                    "chunks": list(info["chunks"]), 
                    "complete": info["complete"]
                } for fid, info in session.files.items()
            }
        }
        with open(self._get_session_path(session.upload_id), "w") as f:
            json.dump(data, f)

    def _load_sessions(self):
        """Load all valid sessions from disk"""
        for session_file in self.persistence_dir.glob("*.json"):
            try:
                with open(session_file, "r") as f:
                    data = json.load(f)
                
                # Reconstruct session
                meta = StudyMetadata(**data["metadata"])
                session = UploadSession(data["upload_id"], data["total_files"], data["total_size_bytes"], meta)
                session.uploaded_bytes = data["uploaded_bytes"]
                session.created_at = datetime.fromisoformat(data["created_at"])
                session.expires_at = datetime.fromisoformat(data["expires_at"])
                
                # Reconstruct files dict
                # Convert list back to set
                files_data = data.get("files", {})
                for fid, info in files_data.items():
                    session.files[fid] = {
                        "chunks": set(info["chunks"]),
                        "complete": info["complete"]
                    }
                
                # Only add if not expired (or let cleanup handle it)
                self._sessions[session.upload_id] = session
            except Exception as e:
                print(f"Failed to load session {session_file}: {e}")

    async def create_session(self, metadata: StudyMetadata, total_files: int, total_size: int) -> UploadInitResponse:
        upload_id = str(uuid4())
        session = UploadSession(upload_id, total_files, total_size, metadata)
        self._sessions[upload_id] = session
        self._save_session(session)
        
        token = create_upload_token(upload_id)
        
        return UploadInitResponse(
            upload_id=upload_id,
            upload_token=token,
            chunk_size=settings.chunk_size_mb * 1024 * 1024,
            expires_at=session.expires_at
        )

    async def cleanup_expired_sessions(self, storage_service):
        """Find and remove expired sessions and their files"""
        now = datetime.now(UTC)
        expired_ids = [
            uid for uid, session in self._sessions.items() 
            if session.expires_at < now
        ]
        
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

    def remove_session(self, upload_id: str):
        if str(upload_id) in self._sessions:
            del self._sessions[str(upload_id)]
            path = self._get_session_path(upload_id)
            if path.exists():
                path.unlink()
    
    def update_session(self, session: UploadSession):
        """Explicitly trigger a save"""
        self._save_session(session)


# Singleton
upload_manager = UploadManager()
