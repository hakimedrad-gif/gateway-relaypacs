"""
Recurring task for cleaning up orphaned/abandoned uploads.

This module provides a scheduled job that runs daily to identify and remove
incomplete upload sessions that have been inactive for more than 7 days.
This prevents disk exhaustion from accumulating abandoned partial uploads.
"""

from datetime import UTC, datetime, timedelta
import logging

from app.upload.service import upload_manager
from app.storage.service import LocalStorageService, S3StorageService
from app.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)

async def cleanup_orphaned_uploads():
    """
    Remove incomplete uploads older than 7 days.
    
    This scheduled job scans all active sessions and removes those that:
    1. Are not marked as complete
    2. Have an expiry date older than 7 days ago (effectively created > 7 days + 1 hour ago)
    
    Returns:
        Number of sessions cleaned up
    """
    logger.info("Starting orphaned upload cleanup task...")
    
    # Calculate cutoff time (7 days ago)
    # Note: expires_at is created_at + 1 hour, so we check if expires_at < (now - 7 days)
    cutoff = datetime.now(UTC) - timedelta(days=7)
    
    # Get storage service based on config
    if settings.use_s3:
        storage_service = S3StorageService()
    else:
        storage_service = LocalStorageService()
        
    try:
        # Find candidates for cleanup
        orphaned_ids = []
        
        # Access internal sessions dict directly or add a method to manager
        # Using internal dict for now as this is a maintenance task
        for upload_id, session in upload_manager._sessions.items():
            if not session.files.get("complete", False):  # Check if marked complete
                # Check if expired long ago
                if session.expires_at < cutoff:
                    orphaned_ids.append(upload_id)
        
        cleanup_count = 0
        for uid in orphaned_ids:
            try:
                # Remove files from storage
                await storage_service.cleanup_upload(uid)
                
                # Remove session from memory/disk persistence
                upload_manager.remove_session(uid)
                cleanup_count += 1
                logger.info(f"Cleaned up orphaned upload: {uid}")
            except Exception as e:
                logger.error(f"Failed to cleanup upload {uid}: {e}")
                
        logger.info(f"Cleanup task completed. Removed {cleanup_count} orphaned uploads.")
        return cleanup_count
        
    except Exception as e:
        logger.error(f"Error during orphaned upload cleanup: {e}")
        return 0
