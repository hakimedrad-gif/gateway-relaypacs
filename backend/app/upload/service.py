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


class UploadManager:
    """In-memory session manager for uploads (Replace with Redis later)"""
    
    def __init__(self):
        self._sessions: Dict[str, UploadSession] = {}

    async def create_session(self, metadata: StudyMetadata, total_files: int, total_size: int) -> UploadInitResponse:
        upload_id = str(uuid4())
        session = UploadSession(upload_id, total_files, total_size, metadata)
        self._sessions[upload_id] = session
        
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
        
        return len(expired_ids)

    def get_session(self, upload_id: str) -> UploadSession | None:
        return self._sessions.get(str(upload_id))

    def remove_session(self, upload_id: str):
        if str(upload_id) in self._sessions:
            del self._sessions[str(upload_id)]


# Singleton
upload_manager = UploadManager()
