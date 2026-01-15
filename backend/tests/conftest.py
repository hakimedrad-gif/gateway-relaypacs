import os

# Set SECRET_KEY before any imports that might trigger Settings validation
os.environ["SECRET_KEY"] = "secure-random-test-key-32-chars-long-xxx!!!"
# Force use_s3 to False in environment as well to be sure
os.environ["USE_S3"] = "False"

import shutil
from pathlib import Path

import app.storage.service  # noqa: E402
import pytest

# 1. Patch storage service BEFORE importing app to ensure routers get the local one
from app.storage.service import LocalStorageService  # noqa: E402
from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402

app.storage.service.storage_service = LocalStorageService()

# 2. Now import app and other services
import app.db.models  # noqa: E402
from app.db.database import Base, get_db  # noqa: E402
from app.main import app as fastapi_app  # noqa: E402
from app.upload.service import upload_manager  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

# Use absolute path for test database to avoid any confusion
BASE_DIR = Path("/home/ubuntu-desk/Desktop/Teleradiology/geteway")
TEST_DB_PATH = BASE_DIR / "test_relaypacs.db"
TEST_DATABASE_URL = f"sqlite:///{TEST_DB_PATH}"


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    """Setup test database and clean up after session."""
    from app.config import get_settings

    settings = get_settings()
    # Ensure external services are disabled/mocked for all tests
    settings.redis_url = None
    settings.use_s3 = False

    # Use distinct test database
    settings.database_url = "sqlite:///" + str(TEST_DB_PATH.absolute())
    settings.reports_db_path = str(BASE_DIR / "test_reports.db")

    # Create tables on the test database
    engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})

    # Ensure models are registered

    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    # Verify tables
    from sqlalchemy import inspect

    inspector = inspect(engine)
    tables = inspector.get_table_names()
    print(f"\n[TEST_SETUP] Initialized test database at {TEST_DATABASE_URL}")
    print(f"[TEST_SETUP] Tables created: {tables}")

    yield

    # Cleanup
    if TEST_DB_PATH.exists():
        try:
            os.remove(TEST_DB_PATH)
        except:
            pass

    reports_db_file = BASE_DIR / "test_reports.db"
    if reports_db_file.exists():
        try:
            os.remove(reports_db_file)
        except:
            pass


@pytest.fixture
def db_session():
    """Provides a transactional database session for tests."""
    engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture(scope="session")
def session_client():
    """Session-scoped Test Client for better performance and loop stability."""
    with TestClient(fastapi_app) as c:
        yield c


@pytest.fixture
def client(db_session, session_client):
    """Function-scoped client that overrides DB session."""

    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    fastapi_app.dependency_overrides[get_db] = override_get_db
    yield session_client
    fastapi_app.dependency_overrides.clear()


@pytest.fixture
def clean_storage():
    """Clean up temp storage before and after tests"""
    test_path = BASE_DIR / "test_temp_uploads"
    # Ensure upload_manager also uses the correct storage service
    upload_manager.storage = app.storage.service.storage_service
    upload_manager.storage.base_path = test_path

    if test_path.exists():
        shutil.rmtree(test_path)
    test_path.mkdir(parents=True, exist_ok=True)

    yield test_path

    if test_path.exists():
        shutil.rmtree(test_path)


@pytest.fixture
def clean_upload_manager():
    """Reset the singleton upload manager and redirect persistence"""
    test_persistence = BASE_DIR / "test_data_sessions"
    if test_persistence.exists():
        shutil.rmtree(test_persistence)
    test_persistence.mkdir(parents=True, exist_ok=True)

    # Store originals
    old_dir = upload_manager.persistence_dir
    old_sessions = upload_manager._sessions

    # Patch
    upload_manager.persistence_dir = test_persistence
    upload_manager._sessions = {}
    # Re-ensure storage is correct
    upload_manager.storage = app.storage.service.storage_service

    yield

    # Cleanup
    if test_persistence.exists():
        shutil.rmtree(test_persistence)

    # Restore
    upload_manager.persistence_dir = old_dir
    upload_manager._sessions = old_sessions


@pytest.fixture(autouse=True)
def mock_pacs_forwarding(monkeypatch):
    """Automatically mock PACS forwarding for all tests"""
    from app.pacs.service import pacs_service

    monkeypatch.setattr(pacs_service, "forward_files", lambda x: "MOCK-RECEIPT-OK")


@pytest.fixture(autouse=True)
def disable_rate_limiting():
    """Disable strict rate limiting for tests"""
    if hasattr(fastapi_app, "state") and hasattr(fastapi_app.state, "limiter"):
        fastapi_app.state.limiter.enabled = False
    yield
    if hasattr(fastapi_app, "state") and hasattr(fastapi_app.state, "limiter"):
        fastapi_app.state.limiter.enabled = True


@pytest.fixture
def dummy_dicom_data():
    """Generate a minimal valid DICOM byte stream"""
    import io

    from pydicom.dataset import FileDataset, FileMetaDataset
    from pydicom.uid import ExplicitVRLittleEndian, generate_uid

    file_meta = FileMetaDataset()
    file_meta.MediaStorageSOPClassUID = "1.2.840.10008.5.1.4.1.1.2"
    file_meta.MediaStorageSOPInstanceUID = generate_uid()
    file_meta.ImplementationClassUID = generate_uid()
    file_meta.TransferSyntaxUID = ExplicitVRLittleEndian

    bio = io.BytesIO()
    ds = FileDataset(bio, {}, file_meta=file_meta, preamble=b"\0" * 128)
    ds.PatientName = "DOE^JOHN"
    ds.PatientID = "12345"
    ds.Modality = "CT"
    ds.StudyDate = "20230101"
    ds.StudyInstanceUID = file_meta.MediaStorageSOPInstanceUID
    ds.SeriesInstanceUID = generate_uid()
    ds.SOPInstanceUID = file_meta.MediaStorageSOPInstanceUID
    ds.SOPClassUID = file_meta.MediaStorageSOPClassUID

    ds.save_as(bio, little_endian=True, implicit_vr=False)
    return bio.getvalue()


@pytest.fixture
def auth_headers(client):
    """Provides valid authentication headers for a test user."""
    # Use existing admin user
    response = client.post("/auth/login", json={"username": "admin", "password": "adminuser@123"})
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
