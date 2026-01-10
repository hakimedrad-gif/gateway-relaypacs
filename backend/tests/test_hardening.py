import pytest
from uuid import uuid4
from pathlib import Path
from app.upload.service import UploadManager, UploadSession
from app.dicom.service import DICOMService
from app.storage.service import LocalStorageService
from app.models.upload import StudyMetadata

@pytest.mark.asyncio
async def test_cleanup_on_completion(monkeypatch):
    """Test that files are deleted and session removed after completion"""
    from app.upload.router import complete_upload
    from app.upload.service import upload_manager
    from app.storage.service import storage_service
    
    upload_id = uuid4()
    # Mock session
    metadata = StudyMetadata(patient_name="Test", study_date="20230101", modality="CT")
    session = UploadSession(str(upload_id), 1, 100, metadata)
    upload_manager._sessions[str(upload_id)] = session
    
    # Mock token
    token = {"sub": str(upload_id)}
    
    # Mock storage cleanup
    cleanup_called = False
    async def mock_cleanup(uid):
        nonlocal cleanup_called
        cleanup_called = True
    
    monkeypatch.setattr(storage_service, "cleanup_upload", mock_cleanup)
    
    # Mock merge & metadata to fail/pass doesn't matter for cleanup call logic in this test
    # but we need it to not crash before cleanup
    async def mock_merge(*args): return Path("dummy")
    monkeypatch.setattr(storage_service, "merge_chunks", mock_merge)
    monkeypatch.setattr("app.dicom.service.dicom_service.extract_metadata", lambda x: None)

    # We need to add at least one file to session to avoid "incomplete" error
    session.register_file_chunk("file1", 0, 100)

    await complete_upload(upload_id, token)
    
    assert cleanup_called is True
    assert str(upload_id) not in upload_manager._sessions

@pytest.mark.asyncio
async def test_session_expiration_cleanup():
    """Test that expired sessions are cleaned up by UploadManager"""
    manager = UploadManager()
    storage = LocalStorageService()
    
    metadata = StudyMetadata(patient_name="Test", study_date="20230101", modality="CT")
    
    # 1. Create a regular session
    await manager.create_session(metadata, 1, 100)
    
    # 2. Create an expired session manually
    expired_id = str(uuid4())
    expired_session = UploadSession(expired_id, 1, 100, metadata)
    from datetime import datetime, UTC, timedelta
    expired_session.expires_at = datetime.now(UTC) - timedelta(seconds=1)
    manager._sessions[expired_id] = expired_session
    
    # Mock storage cleanup to avoid actual FS calls
    cleaned_ids = []
    async def mock_cleanup(uid):
        cleaned_ids.append(uid)
    
    class MockStorage:
        async def cleanup_upload(self, uid):
            cleaned_ids.append(uid)
            
    count = await manager.cleanup_expired_sessions(MockStorage())
    
    assert count == 1
    assert expired_id in cleaned_ids
    assert expired_id not in manager._sessions
    assert len(manager._sessions) == 1

def test_dicom_phi_redaction(tmp_path):
    """Test that DICOM metadata is redacted when safe_only=True"""
    from pydicom.dataset import Dataset, FileDataset
    from pydicom.uid import ExplicitVRLittleEndian
    
    # Create a dummy DICOM
    file_path = tmp_path / "test.dcm"
    ds = Dataset()
    ds.PatientName = "John Doe"
    ds.Modality = "CT"
    ds.StudyDate = "20230101"
    
    # Minimal file meta
    from pydicom.dataset import FileMetaDataset
    file_meta = FileMetaDataset()
    file_meta.TransferSyntaxUID = ExplicitVRLittleEndian
    
    # Correct FileDataset initialization
    ds.file_meta = file_meta
    
    # Set the preamble
    ds.preamble = b"\0" * 128
    ds.save_as(str(file_path), little_endian=True, implicit_vr=False)
    
    service = DICOMService()
    
    # Test safe
    meta_safe = service.extract_metadata(file_path, safe_only=True)
    assert meta_safe.patient_name == "REDACTED"
    
    # Test unsafe
    meta_unsafe = service.extract_metadata(file_path, safe_only=False)
    assert meta_unsafe.patient_name == "John Doe"
