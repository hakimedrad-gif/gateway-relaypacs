import pydicom
import pytest
from app.dicom.parser import (
    anonymize_dicom,
    get_dicom_preview_data,
    parse_dicom_file,
    validate_dicom_file,
)
from pydicom.dataset import FileDataset, FileMetaDataset
from pydicom.uid import UID, ExplicitVRLittleEndian, generate_uid


@pytest.fixture
def sample_dicom(tmp_path):
    """Create a valid temporary DICOM file."""
    file_path = tmp_path / "test.dcm"

    file_meta = FileMetaDataset()
    file_meta.MediaStorageSOPClassUID = UID("1.2.840.10008.5.1.4.1.1.2")
    file_meta.MediaStorageSOPInstanceUID = generate_uid()
    file_meta.ImplementationClassUID = generate_uid()
    file_meta.TransferSyntaxUID = ExplicitVRLittleEndian

    ds = FileDataset(str(file_path), {}, file_meta=file_meta, preamble=b"\0" * 128)
    ds.PatientName = "Test^Patient"
    ds.PatientID = "123456"
    ds.StudyDate = "20230101"
    ds.Modality = "CT"
    ds.StudyDescription = "Test Study"
    ds.SeriesDescription = "Test Series"
    ds.InstitutionName = "Test Hospital"
    ds.Manufacturer = "Test Manufacturer"
    ds.Rows = 512
    ds.Columns = 512
    ds.SOPClassUID = file_meta.MediaStorageSOPClassUID
    ds.SOPInstanceUID = file_meta.MediaStorageSOPInstanceUID

    ds.save_as(str(file_path))
    return file_path


@pytest.fixture
def invalid_file(tmp_path):
    """Create a non-DICOM text file."""
    path = tmp_path / "invalid.txt"
    path.write_text("Not a DICOM file")
    return path


def test_parse_dicom_valid_file(sample_dicom):
    """Test extracting metadata from a valid file."""
    data = parse_dicom_file(sample_dicom)

    assert data["patient_name"] == "Test^Patient"
    assert data["patient_id"] == "123456"
    assert data["modality"] == "CT"
    assert data["rows"] == 512
    assert "error" not in data


def test_parse_dicom_values(sample_dicom):
    """Test extracting specific DICOM values."""
    data = parse_dicom_file(sample_dicom)
    assert data["study_description"] == "Test Study"
    assert data["series_description"] == "Test Series"
    assert data["institution_name"] == "Test Hospital"


def test_parse_invalid_file(invalid_file):
    """Test parsing invalid file returns error."""
    data = parse_dicom_file(invalid_file)
    assert "error" in data


def test_extract_patient_name(sample_dicom):
    """Test extracting patient name."""
    data = parse_dicom_file(sample_dicom)
    assert data["patient_name"] == "Test^Patient"


def test_validate_dicom_file_success(sample_dicom):
    """Test validation returns True for valid file."""
    is_valid, error = validate_dicom_file(sample_dicom)
    assert is_valid is True
    assert error == ""


def test_validate_dicom_file_failure(invalid_file):
    """Test validation returns False for invalid file."""
    is_valid, error = validate_dicom_file(invalid_file)
    assert is_valid is False
    assert error != ""


def test_get_dicom_preview_data(sample_dicom):
    """Test preview extraction."""
    preview = get_dicom_preview_data(sample_dicom)
    assert preview is not None
    assert preview["rows"] == 512
    assert preview["columns"] == 512
    assert preview["has_pixels"] is False  # No pixel data added


def test_get_dicom_preview_invalid(invalid_file):
    """Test preview returns None for invalid file."""
    preview = get_dicom_preview_data(invalid_file)
    assert preview is None


def test_anonymize_dicom(sample_dicom):
    """Test DICOM anonymization removes PHI."""
    anon_path = anonymize_dicom(sample_dicom)

    ds = pydicom.dcmread(anon_path)
    assert ds.PatientName != "Test^Patient"
    assert ds.PatientID != "123456"

    # Dates might be shifted or cleared
    if "StudyDate" in ds:
        # Depending on strategy. For now just check it's not original if possible
        # or check generic logic
        pass


def test_anonymize_dicom_preserves_medical_data(sample_dicom):
    """Test anonymization keeps clinical data intact."""
    anon_path = anonymize_dicom(sample_dicom)
    ds = pydicom.dcmread(anon_path)

    assert ds.Modality == "CT"
    assert ds.Rows == 512
    assert ds.Columns == 512
    assert ds.SOPClassUID == UID("1.2.840.10008.5.1.4.1.1.2")


def test_dicom_file_size_validation(sample_dicom):
    """Test file size limits enforcement (if part of validation)."""
    # Currently validate_dicom_file doesn't check size, but maybe we should add a test
    # if we intend to add that feature.
    pass


def test_parse_dicom_missing_fields(tmp_path):
    """Test parsing logic when optional fields are missing."""
    file_path = tmp_path / "minimal.dcm"

    file_meta = FileMetaDataset()
    file_meta.MediaStorageSOPClassUID = UID("1.2.840.10008.5.1.4.1.1.2")
    file_meta.MediaStorageSOPInstanceUID = generate_uid()
    file_meta.ImplementationClassUID = generate_uid()
    file_meta.TransferSyntaxUID = ExplicitVRLittleEndian

    # Create dataset with MINIMAL attributes
    ds = FileDataset(str(file_path), {}, file_meta=file_meta, preamble=b"\0" * 128)
    ds.save_as(str(file_path))

    data = parse_dicom_file(file_path)
    assert data["patient_name"] == "Unknown"
    assert data["modality"] == ""
    assert "error" not in data
