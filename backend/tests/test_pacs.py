from unittest.mock import patch

import pytest
from app.pacs.service import PACSService


@pytest.fixture
def mock_dicomweb_client():
    with patch("app.pacs.service.DICOMwebClient") as mock_client:
        yield mock_client


def test_pacs_forward_files(mock_dicomweb_client, tmp_path):
    # Mock DICOMwebClient instance
    mock_instance = mock_dicomweb_client.return_value
    mock_instance.store_instances.return_value = {"status": "success"}

    # Create a dummy DICOM file
    from pydicom.dataset import Dataset
    from pydicom.uid import ExplicitVRLittleEndian

    file_path = tmp_path / "test.dcm"
    ds = Dataset()
    ds.PatientName = "John Doe"
    ds.SOPClassUID = "1.2.3"
    ds.SOPInstanceUID = "1.2.3.4"

    # Minimal file meta
    from pydicom.dataset import FileMetaDataset

    file_meta = FileMetaDataset()
    file_meta.TransferSyntaxUID = ExplicitVRLittleEndian

    ds.file_meta = file_meta
    ds.preamble = b"\0" * 128
    ds.save_as(str(file_path), little_endian=True, implicit_vr=False)

    service = PACSService()
    receipt = service.forward_files([file_path])

    assert "STOW-SUCCESS" in receipt
    assert "1" in receipt
    assert mock_instance.store_instances.called is True


def test_pacs_fallback_to_rest(mock_dicomweb_client, tmp_path, monkeypatch):
    """Test fallback to Orthanc REST API when STOW fails."""
    from app.config import get_settings

    settings = get_settings()
    monkeypatch.setattr(settings, "active_pacs", "orthanc")

    # Simulate STOW failure
    mock_instance = mock_dicomweb_client.return_value
    mock_instance.store_instances.side_effect = Exception("STOW Connection Error")

    # Create a dummy DICOM file
    from pydicom.dataset import Dataset, FileMetaDataset
    from pydicom.uid import ExplicitVRLittleEndian

    file_path = tmp_path / "fallback.dcm"
    ds = Dataset()
    ds.PatientName = "Fallback Patient"
    ds.SOPClassUID = "1.2.3"
    ds.SOPInstanceUID = "1.2.3.5"

    file_meta = FileMetaDataset()
    file_meta.TransferSyntaxUID = ExplicitVRLittleEndian
    ds.file_meta = file_meta
    ds.preamble = b"\0" * 128
    ds.save_as(str(file_path), little_endian=True, implicit_vr=False)

    # Mock requests.post for the REST API
    with patch("requests.post") as mock_post:
        mock_post.return_value.status_code = 200
        mock_post.return_value.json.return_value = {"Status": "Success"}

        service = PACSService()
        receipt = service.forward_files([file_path])

        assert "FALLBACK-SUCCESS-1" in receipt
        # Verify STOW was tried first
        assert mock_instance.store_instances.called is True
        # Verify REST API was called
        assert mock_post.called is True
        assert mock_post.call_args[0][0].endswith("/instances")
