from pathlib import Path
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, Response

from app.auth.dependencies import get_current_user, get_upload_token
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
from app.upload.service import upload_manager

router = APIRouter()


@router.post("/init", response_model=UploadInitResponse)
@limiter.limit("20/minute")
async def initialize_upload(
    request: Request, payload: UploadInitRequest, user: dict[str, Any] = Depends(get_current_user)
) -> UploadInitResponse:
    """Initialize a new upload session"""
    # Proactive cleanup of expired sessions
    await upload_manager.cleanup_expired_sessions(storage_service)

    return await upload_manager.create_session(
        payload.study_metadata, payload.total_files, payload.total_size_bytes
    )


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
    Using Request.stream() to read body directly.
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

    if not chunk_exists:
        await storage_service.save_chunk(str(upload_id), file_id, chunk_index, body)

    session.register_file_chunk(file_id, chunk_index, received_bytes if not chunk_exists else 0)
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
async def complete_upload(
    request: Request, upload_id: UUID, token: dict[str, Any] = Depends(get_upload_token)
) -> UploadCompleteResponse:
    """
    Finalize the upload.
    Triggers file merging and processing.
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
            final_path = await storage_service.merge_chunks(str(upload_id), file_id, total_chunks)

            # 2. Validate DICOMs (Safe mode by default)
            dicom_service.extract_metadata(final_path)

            processed_count += 1
            merged_paths.append(final_path)
        except Exception as e:
            failed_count += 1
            warnings.append(f"File {file_id} failed: {e!s}")

    # 3. Queue for PACS forwarding
    pacs_receipt_id = None
    if processed_count > 0:
        try:
            pacs_receipt_id = pacs_service.forward_files(merged_paths)
        except Exception as e:
            # Don't fail the whole request, but warn
            warnings.append(f"PACS forwarding failed: {e!s}")
            # We keep status as success/partial but with warning

    status = "success"
    if failed_count > 0:
        status = "partial_success" if processed_count > 0 else "failed"
    if failed_count == 0 and pacs_receipt_id is None and processed_count > 0:
        # Forwarding failed but files were processed
        status = "partial_success"

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
