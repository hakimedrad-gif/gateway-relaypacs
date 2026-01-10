import pytest
from unittest.mock import MagicMock, patch
from app.pacs.service import PACSService

@pytest.fixture
def mock_dicomweb_client():
    with patch('app.pacs.service.DICOMwebClient') as mock_client:
        yield mock_client

def test_pacs_forward_files(mock_dicomweb_client, tmp_path):
    # Mock DICOMwebClient instance
    mock_instance = mock_dicomweb_client.return_value
    mock_instance.store_instances.return_value = {"status": "success"}
    
    # Create a dummy DICOM file
    import pydicom
    from pydicom.dataset import Dataset, FileDataset
    from pydicom.uid import ExplicitVRLittleEndian
    
    file_path = tmp_path / "test.dcm"
    ds = Dataset()
    ds.PatientName = "John Doe"
    ds.SOPClassUID = '1.2.3'
    ds.SOPInstanceUID = '1.2.3.4'
    
    # Minimal file meta
    from pydicom.dataset import FileMetaDataset
    file_meta = FileMetaDataset()
    file_meta.TransferSyntaxUID = ExplicitVRLittleEndian
    
    ds.file_meta = file_meta
    ds.preamble = b"\0" * 128
    ds.save_as(str(file_path), little_endian=True, implicit_vr=False)
    
    service = PACSService()
    receipt = service.forward_files([file_path])
    
    assert "STOW-SUCCESS-1" in receipt
    assert mock_instance.store_instances.called is True
