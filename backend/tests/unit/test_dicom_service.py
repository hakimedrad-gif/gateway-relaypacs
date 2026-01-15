from tempfile import NamedTemporaryFile

import pydicom
import pytest
from app.dicom.service import StudyMetadata, dicom_service


def test_extract_metadata_success_safe(dummy_dicom_data):
    """Test safe metadata extraction redaction."""
    with NamedTemporaryFile(suffix=".dcm") as f:
        f.write(dummy_dicom_data)
        f.flush()

        metadata = dicom_service.extract_metadata(f.name, safe_only=True)

        assert isinstance(metadata, StudyMetadata)
        assert metadata.patient_name == "REDACTED"
        assert metadata.modality == "CT"
        assert metadata.study_date == "20230101"


def test_extract_metadata_success_unsafe(dummy_dicom_data):
    """Test unsafe metadata extraction reveals PHI."""
    with NamedTemporaryFile(suffix=".dcm") as f:
        f.write(dummy_dicom_data)
        f.flush()

        metadata = dicom_service.extract_metadata(f.name, safe_only=False)

        assert isinstance(metadata, StudyMetadata)
        assert metadata.patient_name == "DOE^JOHN"
        assert metadata.modality == "CT"


def test_extract_metadata_missing_file():
    """Test handling of non-existent files."""
    with pytest.raises(ValueError) as exc:
        dicom_service.extract_metadata("/path/to/nowhere/ghost.dcm")
    assert "Failed to parse DICOM" in str(exc.value)


def test_extract_metadata_invalid_dicom():
    """Test handling of invalid DICOM content."""
    with NamedTemporaryFile(suffix=".dcm") as f:
        f.write(b"NOT A DICOM FILE")
        f.flush()

        with pytest.raises(ValueError) as exc:
            dicom_service.extract_metadata(f.name)
        assert "Failed to parse DICOM" in str(exc.value)


def test_extract_metadata_with_missing_tags(dummy_dicom_data):
    """Test extraction with missing optional tags."""
    # Create dataset based on dummy data but remove some tags
    ds = pydicom.dcmread(pydicom.filebase.DicomBytesIO(dummy_dicom_data))
    del ds.Modality

    with NamedTemporaryFile(suffix=".dcm") as f:
        ds.save_as(f.name)

        metadata = dicom_service.extract_metadata(f.name, safe_only=False)
        assert metadata.modality == "Unknown"
