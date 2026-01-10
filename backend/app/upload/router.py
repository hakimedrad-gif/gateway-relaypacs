from fastapi import APIRouter, Depends, HTTPException, status, Request, UploadFile, File
from uuid import UUID
from typing import Annotated

from app.auth.dependencies import get_current_user, get_upload_token
from app.models.upload import (
    UploadInitRequest, UploadInitResponse, 
    ChunkUploadResponse, UploadCompleteResponse, UploadStatusResponse
)
from app.upload.service import upload_manager
from app.storage.service import storage_service
from app.dicom.service import dicom_service
from app.pacs.service import pacs_service

router = APIRouter()

@router.post("/init", response_model=UploadInitResponse)
async def initialize_upload(
    payload: UploadInitRequest,
    user: dict = Depends(get_current_user)
):
    """Initialize a new upload session"""
    # Proactive cleanup of expired sessions
    await upload_manager.cleanup_expired_sessions(storage_service)
    
    return await upload_manager.create_session(
        payload.study_metadata,
        payload.total_files,
        payload.total_size_bytes
    )

@router.put("/{upload_id}/chunk", response_model=ChunkUploadResponse)
async def upload_chunk(
    upload_id: UUID,
    chunk_index: int,
    file_id: str,
    request: Request,
    token: dict = Depends(get_upload_token)
):
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
    
    body = await request.body()
    if not body:
        raise HTTPException(status_code=400, detail="Empty body")
        
    await storage_service.save_chunk(
        str(upload_id), 
        file_id, 
        chunk_index, 
        body
    )
    
    session.register_file_chunk(file_id, chunk_index, len(body))
    
    return ChunkUploadResponse(
        upload_id=upload_id,
        file_id=file_id,
        chunk_index=chunk_index,
        received_bytes=len(body)
    )

@router.post("/{upload_id}/complete", response_model=UploadCompleteResponse)
async def complete_upload(
    upload_id: UUID,
    token: dict = Depends(get_upload_token)
):
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
            detail=f"Upload incomplete: received {files_received} files, expected {files_expected}"
        )
        
    # 1. Merge all chunks for all files
    processed_count = 0
    failed_count = 0
    warnings = []
    merged_paths = []
    
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
            warnings.append(f"File {file_id} failed: {str(e)}")
    
    # 3. Queue for PACS forwarding
    pacs_receipt_id = None
    if processed_count > 0:
        try:
            pacs_receipt_id = pacs_service.forward_files(merged_paths)
        except Exception as e:
            # Don't fail the whole request, but warn
            warnings.append(f"PACS forwarding failed: {str(e)}")
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
        warnings=warnings
    )

@router.get("/{upload_id}/status", response_model=UploadStatusResponse)
async def get_status(
    upload_id: UUID,
    token: dict = Depends(get_upload_token)
):
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
        chunks_total=0, # total_chunks is not strictly tracked yet as it depends on client chunking
        pacs_status="pending"
    )
