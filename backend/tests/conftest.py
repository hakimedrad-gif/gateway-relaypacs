import pytest
import shutil
from pathlib import Path
from fastapi.testclient import TestClient
from app.main import app
from app.storage.service import storage_service
from app.upload.service import upload_manager

@pytest.fixture
def client():
    """FastAPI Test Client"""
    return TestClient(app)

@pytest.fixture
def clean_storage():
    """Clean up temp storage before and after tests"""
    # Setup
    test_path = Path("test_temp_uploads")
    storage_service.base_path = test_path
    
    yield
    
    # Teardown
    if test_path.exists():
        shutil.rmtree(test_path)

@pytest.fixture
def clean_upload_manager():
    """Reset the singleton upload manager"""
    upload_manager._sessions = {}
    yield
    upload_manager._sessions = {}

@pytest.fixture(autouse=True)
def mock_pacs_forwarding(monkeypatch):
    """Automatically mock PACS forwarding for all tests"""
    from app.pacs.service import pacs_service
    monkeypatch.setattr(pacs_service, "forward_files", lambda x: "MOCK-RECEIPT-OK")

@pytest.fixture(autouse=True)
def disable_rate_limiting():
    """Disable strict rate limiting for tests"""
    if hasattr(app.state, "limiter"):
        app.state.limiter.enabled = False
    yield
    if hasattr(app.state, "limiter"):
        app.state.limiter.enabled = True

@pytest.fixture
def auth_headers(client):
    """Get valid auth headers for tests"""
    response = client.post("/auth/login", json={"username": "admin", "password": "password"})
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def dummy_dicom_data():
    """Generate a minimal valid DICOM byte stream"""
    from pydicom.dataset import Dataset, FileDataset
    from pydicom.uid import ExplicitVRLittleEndian
    import io
    
    from pydicom.dataset import FileMetaDataset
    file_meta = FileMetaDataset()
    file_meta.MediaStorageSOPClassUID = '1.2.840.10008.5.1.4.1.1.2'
    file_meta.MediaStorageSOPInstanceUID = "1.2.3"
    file_meta.ImplementationClassUID = "1.2.3.4"
    file_meta.TransferSyntaxUID = ExplicitVRLittleEndian
    
    # Use a buffer instead of a file
    bio = io.BytesIO()
    ds = FileDataset(bio, {}, file_meta=file_meta, preamble=b"\0" * 128)
    ds.PatientName = "DOE^JOHN"
    ds.Modality = "CT"
    ds.StudyDate = "20230101"
    
    ds.save_as(bio, little_endian=True, implicit_vr=False)
    return bio.getvalue()
