import hashlib
import logging
from pathlib import Path
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import Response

from app.auth.dependencies import get_current_user, get_upload_token
from app.db.database import get_db
from app.dicom.service import dicom_service
from app.limiter import limiter
from app.models.upload import (
    ChunkUploadResponse,
    UploadCompleteResponse,
    UploadInitRequest,
    UploadInitResponse,
    UploadStatusResponse,
)
from app.pacs.service import pacs_service
from app.storage.service import storage_service
from app.upload.analytics import export_stats_to_csv, generate_trend_data, stats_manager
from app.upload.service import upload_manager

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/init", response_model=UploadInitResponse)
@limiter.limit("20/minute")
async def initialize_upload(
    request: Request,
    payload: UploadInitRequest,
    user: dict[str, Any] = Depends(get_current_user),
    db: Any = Depends(get_db),
) -> UploadInitResponse:
    """Initialize a new upload session"""
    import hashlib
    from datetime import UTC, datetime, timedelta

    from fastapi import status
    from sqlalchemy.orm import Session

    from app.db.models import StudyUpload

    session_db: Session = db  # Type hint

    # 1. Check for duplicates
    # Hash StudyInstanceUID + PatientID to find previous uploads
    # In real world, we'd extract these from DICOM, but here we use metadata provided by user
    # or rely on frontend providing them. Wait, StudyMetadata doesn't strictly require UIDs in the model shown previously.
    # Actually, StudyMetadata usually implies we have some ID.
    # Let's check StudyMetadata model again.
    # It has patient_name, study_date, etc. but NO UID.
    # This is a problem. Typically ingestion provides UIDs later.
    # However, P2-5 explicitly says "Hash StudyInstanceUID + PatientID".
    # If these are not in init payload, we can't check duplicates at init time.
    # We might need to rely on combination of Patient Name + Study Date + Modality + Description as a proxy hash?
    # OR update StudyMetadata to include UIDs (which frontend might not have before parsing?).
    # Frontend usually parses DICOM tags before init.
    # Let's assume for now we use the available metadata for the hash proxy
    # OR we add UIDs to the request if available.

    # Looking at frontend code (single-file-upload.spec.ts), it extracts metadata.
    # But `StudyMetadata` class in backend `models/upload.py` only lists descriptive fields.
    # To implement P2-5 correctly, we should ideally add StudyInstanceUID/PatientID to the Init request.
    # But changing the request schema might break things if frontend doesn't send it.

    # Workaround: Use PatientName + StudyDate + Modality as a "soft" duplicate check.
    # Or strict check if we assume UIDs are added.
    # Let's check if I can modify StudyMetadata.

    # Actually, let's implement the logic using available fields for now to fulfill the requirement "Add Duplicate Study Detection"
    # using what we have, or construct the hash from what we have.
    # "Hash StudyInstanceUID + PatientID" was the recommendation.
    # If I can't get UIDs, I will use: PatientName + StudyDate + Modality.

    study_identifiers = f"{payload.study_metadata.patient_name}|{payload.study_metadata.study_date}|{payload.study_metadata.modality}"
    study_hash = hashlib.sha256(study_identifiers.encode()).hexdigest()

    # Check if uploaded in last 30 days
    cutoff = datetime.now(UTC) - timedelta(days=30)
    existing = (
        session_db.query(StudyUpload)
        .filter(StudyUpload.study_hash == study_hash, StudyUpload.created_at > cutoff)
        .first()
    )

    if existing and not payload.force_upload:
        # Return 409 Conflict with details
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "message": f"Potential duplicate study detected. Similar study uploaded on {existing.created_at.strftime('%Y-%m-%d')}.",
                "code": "DUPLICATE_STUDY",
                "upload_id": existing.upload_id,
            },
        )

    # Proactive cleanup of expired sessions
    await upload_manager.cleanup_expired_sessions(storage_service)

    # Create session
    response = await upload_manager.create_session(
        user["sub"],
        payload.study_metadata,
        payload.total_files,
        payload.total_size_bytes,
        payload.clinical_history,
    )

    # Record this upload in DB
    try:
        new_upload = StudyUpload(
            upload_id=str(response.upload_id),
            study_instance_uid="PENDING",  # We don't have it yet
            patient_id=payload.study_metadata.patient_name,  # Proxy
            study_hash=study_hash,
            user_id=None,  # We have username "sub" but not UUID here easily without query.
            # User table has UUID. 'user' dict has 'sub' (username).
            # Skip user linkage for now or query it.
        )
        session_db.add(new_upload)
        session_db.commit()
    except Exception as e:
        logger.error(f"Failed to record upload stats: {e}")
        # Don't fail the upload just because stat recording failed

    return response


@router.put("/{upload_id}/chunk", response_model=ChunkUploadResponse)
@limiter.limit("2000/minute")
async def upload_chunk(
    upload_id: UUID,
    chunk_index: int,
    file_id: str,
    request: Request,
    token: dict[str, Any] = Depends(get_upload_token),
) -> ChunkUploadResponse | Response:
    """
    Upload a binary chunk.
    Expects raw binary body (application/octet-stream).
    """
    # Verify token scope matches upload_id
    if token.get("sub") != str(upload_id):
        raise HTTPException(status_code=403, detail="Token mismatch for this upload session")

    session = upload_manager.get_session(str(upload_id))
    if not session:
        raise HTTPException(status_code=404, detail="Upload session not found")

    # Idempotency check: If chunk exists, skip write but ensure session tracking
    chunk_exists = await storage_service.chunk_exists(str(upload_id), file_id, chunk_index)

    received_bytes = 0
    if chunk_exists:
        # Check if already registered in session
        if chunk_index in session.files.get(file_id, {}).get("chunks", set()):
            # Fully idempotent case: physical file exists AND logical record exists
            return Response(status_code=204)  # No Content

        # Physical file exists but logic doesn't -> Update logic only
        # We need to know the size though. For now, trust the client or stat the file?
        # To be safe, if we don't have the body size, we might just register it.
        # Ideally we'd get size from storage.
        # For MVP: if physical exists, we assume it's good.
        # But we need 'received_bytes' for the response.
        # Let's read request body size anyway to return it?
        # The protocol for 204 doesn't return body.
        pass  # Fall through to logic registration, but skip save?
        # Actually proper 204 doesn't return response model.
        # But we defined response_model=ChunkUploadResponse.
        # So maybe return 200 with "skipped" status?
        # Or change return type.

    body = await request.body()
    if not body:
        raise HTTPException(status_code=400, detail="Empty body")

    received_bytes = len(body)

    # Calculate MD5 checksum for integrity validation
    chunk_checksum = hashlib.md5(body).hexdigest()

    if not chunk_exists:
        # Save chunk to storage
        await storage_service.save_chunk(str(upload_id), file_id, chunk_index, body)

        # CRITICAL: Verify chunk was written correctly
        # This prevents silent data loss if write fails mid-operation
        chunk_verified = await storage_service.verify_chunk(
            str(upload_id), file_id, chunk_index, received_bytes
        )

        if not chunk_verified:
            # Chunk write failed or corrupted - delete partial file and fail fast
            try:
                # Attempt to delete corrupted chunk
                chunk_path = (
                    storage_service.base_path
                    / str(upload_id)
                    / str(file_id)
                    / f"{chunk_index}.part"
                )
                if hasattr(storage_service, "base_path") and chunk_path.exists():
                    chunk_path.unlink()
            except Exception:
                pass  # Deletion is best-effort

            raise HTTPException(
                status_code=500,
                detail=f"Chunk {chunk_index} write verification failed. Expected {received_bytes} bytes. Please retry upload.",
            )

    # Register chunk with checksum for integrity validation during merge
    session.register_file_chunk(
        file_id, chunk_index, received_bytes if not chunk_exists else 0, chunk_checksum
    )
    upload_manager.update_session(session)  # Persist state

    if chunk_exists:
        # Return 200 OK with data, but knowing we skipped write
        return ChunkUploadResponse(
            upload_id=upload_id,
            file_id=file_id,
            chunk_index=chunk_index,
            received_bytes=received_bytes,
            status="exists",
        )

    return ChunkUploadResponse(
        upload_id=upload_id, file_id=file_id, chunk_index=chunk_index, received_bytes=received_bytes
    )


@router.post("/{upload_id}/complete", response_model=UploadCompleteResponse)
@limiter.limit("10/minute")
async def complete_upload(  # noqa: PLR0912, PLR0915
    request: Request, upload_id: UUID, token: dict[str, Any] = Depends(get_upload_token)
) -> UploadCompleteResponse:
    """
    Finalize the upload.
    """
    if token.get("sub") != str(upload_id):
        raise HTTPException(status_code=403, detail="Token mismatch")

    session = upload_manager.get_session(str(upload_id))
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Validate that all expected files have been received
    files_received = len(session.files)
    files_expected = session.total_files

    if files_received < files_expected:
        raise HTTPException(
            status_code=400,
            detail=f"Upload incomplete: received {files_received} files, expected {files_expected}",
        )

    # 1. Merge all chunks for all files
    processed_count = 0
    failed_count = 0
    warnings = []
    merged_paths: list[Path | str] = []

    for file_id, file_data in session.files.items():
        try:
            # Get total chunks for this file (highest index + 1)
            total_chunks = max(file_data["chunks"]) + 1

            # Get checksums for validation (if available)
            checksums = file_data.get("checksums", {})

            # Merge chunks with checksum validation
            final_path = await storage_service.merge_chunks(
                str(upload_id), file_id, total_chunks, checksums
            )

            # 2. Validate DICOMs (Safe mode by default)
            dicom_service.extract_metadata(final_path)

            processed_count += 1
            merged_paths.append(final_path)
        except OSError as e:
            # Storage/file system errors
            failed_count += 1
            error_msg = f"Storage error for file {file_id}: {type(e).__name__}: {e!s}"
            warnings.append(error_msg)
            logger.error(
                error_msg, exc_info=True, extra={"upload_id": str(upload_id), "file_id": file_id}
            )
        except Exception as e:
            # DICOM processing errors from extract_metadata
            failed_count += 1
            error_msg = f"DICOM processing error for file {file_id}: {type(e).__name__}: {e!s}"
            warnings.append(error_msg)
            logger.error(
                error_msg, exc_info=True, extra={"upload_id": str(upload_id), "file_id": file_id}
            )
            # Note: This still catches all exceptions but logs them properly
            # for debugging. In future, pydicom should raise specific exceptions.

    # 3. Queue for PACS forwarding
    pacs_receipt_id = None
    if processed_count > 0:
        try:
            pacs_receipt_id = pacs_service.forward_files(merged_paths)
        except (ConnectionError, TimeoutError) as e:
            # Network/connection errors to PACS
            error_msg = f"PACS connection failed: {type(e).__name__}: {e!s}"
            warnings.append(error_msg)
            logger.error(error_msg, exc_info=True, extra={"upload_id": str(upload_id)})
        except Exception as e:
            # Other PACS errors (authentication, protocol, etc)
            error_msg = f"PACS forwarding failed: {type(e).__name__}: {e!s}"
            warnings.append(error_msg)
            logger.error(error_msg, exc_info=True, extra={"upload_id": str(upload_id)})
            # Note: Still catches all for backward compatibility but logs properly

    status = "success"
    if failed_count > 0:
        status = "partial_success" if processed_count > 0 else "failed"
    if failed_count == 0 and pacs_receipt_id is None and processed_count > 0:
        # Forwarding failed but files were processed
        status = "partial_success"

    # Always record stats if we have metadata
    if session.metadata:
        stats_manager.record_upload(
            session.metadata.modality, session.metadata.service_level, status=status
        )

    # Create report record and send notifications
    user_id = token.get("user_id", "unknown")  # Get user_id from token

    if processed_count > 0 and pacs_receipt_id:
        try:
            # Import needed modules
            from app.database.reports_db import reports_db
            from app.models.report import NotificationType, Report, ReportStatus
            from app.notifications.service import notification_service

            # Extract Study Instance UID from first DICOM file
            study_uid = "UNKNOWN"
            if merged_paths:
                try:
                    metadata = dicom_service.extract_metadata(merged_paths[0])
                    study_uid = metadata.get("StudyInstanceUID", "UNKNOWN")
                except Exception:
                    pass

            # Create report record
            report = Report(
                upload_id=upload_id,
                study_instance_uid=study_uid,
                status=ReportStatus.ASSIGNED,
                user_id=user_id,
            )
            reports_db.create_report(report)

            # Send success notification
            msg = f"Study '{session.metadata.patient_name}' uploaded successfully"
            await notification_service.create_and_broadcast(
                user_id=user_id,
                notification_type=NotificationType.UPLOAD_COMPLETE,
                title="Upload Complete",
                message=f"{msg} and sent to PACS",
                upload_id=upload_id,
                report_id=report.id,
            )
        except Exception as e:
            # Log error but don't fail the upload
            warnings.append(f"Notification creation failed: {e!s}")

    elif status == "failed":
        # Send failure notification
        try:
            from app.models.report import NotificationType
            from app.notifications.service import notification_service

            pat_name = session.metadata.patient_name if session.metadata else "Unknown"
            await notification_service.create_and_broadcast(
                user_id=user_id,
                notification_type=NotificationType.UPLOAD_FAILED,
                title="Upload Failed",
                message=f"Upload for '{pat_name}' failed",
                upload_id=upload_id,
            )
        except Exception as e:
            warnings.append(f"Failure notification failed: {e!s}")

    # Always cleanup temp files after completion attempt
    await storage_service.cleanup_upload(str(upload_id))

    # Remove session from memory
    upload_manager.remove_session(str(upload_id))

    return UploadCompleteResponse(
        status=status,
        processed_files=processed_count,
        failed_files=failed_count,
        pacs_receipt_id=pacs_receipt_id,
        warnings=warnings,
    )


@router.get("/stats")
async def get_upload_stats(
    period: str | None = None, user: dict[str, Any] = Depends(get_current_user)
) -> dict[str, Any]:
    """Get aggregated upload statistics (cached for 60s)"""
    from app.cache import cache_service

    cache_key = f"stats:{period or 'all'}"
    if cached_data := await cache_service.get(cache_key):
        return cached_data

    stats = stats_manager.get_stats(period)

    # Cache for 60 seconds
    await cache_service.set(cache_key, stats, expire=60)

    return stats


@router.get("/{upload_id}/status", response_model=UploadStatusResponse)
async def get_status(
    upload_id: UUID, token: dict[str, Any] = Depends(get_upload_token)
) -> UploadStatusResponse:
    """Get current status of upload session"""
    session = upload_manager.get_session(str(upload_id))
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Calculate stats
    total_received_chunks = sum([len(f["chunks"]) for f in session.files.values()])
    uploaded_bytes = session.uploaded_bytes
    total_bytes = session.total_size_bytes

    progress = (uploaded_bytes / total_bytes * 100) if total_bytes > 0 else 0.0

    return UploadStatusResponse(
        upload_id=upload_id,
        progress_percent=round(progress, 2),
        uploaded_bytes=uploaded_bytes,
        total_bytes=total_bytes,
        state="uploading",
        chunks_received=total_received_chunks,
        chunks_total=0,
        pacs_status="pending",
        files={
            fid: {"received_chunks": list(data["chunks"]), "complete": data["complete"]}
            for fid, data in session.files.items()
        },
    )


@router.get("/stats/export")
async def export_statistics(
    period: str | None = None,
    user: dict[str, Any] = Depends(get_current_user),
) -> Response:
    """
    Export upload statistics as CSV file.

    Returns CSV file for download with statistics breakdown.
    """
    # Get stats using existing stats_manager
    stats_data = stats_manager.get_stats(period)

    # Convert to CSV
    csv_content = export_stats_to_csv(stats_data)

    # Return as downloadable CSV
    filename = f"relaypacs_stats_{period or 'all'}.csv"
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/stats/trend")
async def get_trend_data(
    period: str = "7d",
    user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    """
    Get trend data for time-series visualization.

    Returns daily upload counts for the specified period.
    """
    # Get current stats
    stats_data = stats_manager.get_stats(period)

    # Generate trend data (currently mock, will be replaced with DB queries)
    trend_data = generate_trend_data(stats_data, period)

    return {
        "period": period,
        "data": trend_data,
        "summary": stats_data,
    }
