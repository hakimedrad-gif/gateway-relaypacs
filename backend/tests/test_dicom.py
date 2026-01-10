import pytest
from pathlib import Path
import pydicom
from pydicom.dataset import Dataset, FileDataset
from pydicom.uid import ExplicitVRLittleEndian
from datetime import datetime

# We expect this to exist soon (TDD)
try:
    from app.dicom.service import dicom_service
except ImportError:
    dicom_service = None

@pytest.fixture
def sample_dicom_file(tmp_path):
    """Create a minimal valid DICOM file for testing"""
    file_path = tmp_path / "test.dcm"
    
    # Create a minimal DICOM dataset
    from pydicom.dataset import FileMetaDataset
    file_meta = FileMetaDataset()
    file_meta.MediaStorageSOPClassUID = '1.2.840.10008.5.1.4.1.1.2'
    file_meta.MediaStorageSOPInstanceUID = "1.2.3"
    file_meta.ImplementationClassUID = "1.2.3.4"
    file_meta.TransferSyntaxUID = ExplicitVRLittleEndian
    
    ds = FileDataset(str(file_path), {}, file_meta=file_meta, preamble=b"\0" * 128)
    ds.PatientName = "DOE^JOHN"
    ds.PatientID = "12345"
    ds.Modality = "CT"
    ds.StudyDate = "20230101"
    ds.StudyDescription = "TEST STUDY"
    ds.ContentDate = "20230101"
    ds.ContentTime = "120000"
    
    ds.save_as(str(file_path))
    return file_path

def test_extract_metadata(sample_dicom_file):
    """Test extracting StudyMetadata from a DICOM file"""
    if dicom_service is None:
        pytest.fail("DICOMService not implemented yet")
        
    metadata = dicom_service.extract_metadata(sample_dicom_file, safe_only=False)
    
    assert metadata.patient_name == "DOE^JOHN"
    assert metadata.modality == "CT"
    assert metadata.study_date == "20230101"
    assert metadata.study_description == "TEST STUDY"

def test_extract_metadata_safe_mode(sample_dicom_file):
    """Test extracting StudyMetadata in safe mode (default)"""
    metadata = dicom_service.extract_metadata(sample_dicom_file)
    assert metadata.patient_name == "REDACTED"

def test_extract_invalid_file(tmp_path):
    """Test handling invalid file formats"""
    if dicom_service is None:
        pytest.fail("DICOMService not implemented yet")
        
    invalid_file = tmp_path / "not_a_dicom.txt"
    invalid_file.write_text("Hello World")
    
    with pytest.raises(Exception): # Specific exception can be defined later
        dicom_service.extract_metadata(invalid_file)
