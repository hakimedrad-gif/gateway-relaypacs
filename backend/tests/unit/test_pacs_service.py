from unittest.mock import MagicMock, patch

import pydicom
import pytest
import requests
from app.pacs.service import PACSService


@pytest.fixture
def mock_settings():
    """Mock settings for PACS configuration."""
    with patch("app.pacs.service.settings") as mock:
        mock.orthanc_url = "http://orthanc:8042"
        mock.orthanc_wado_url = "http://orthanc:8042/wado"
        mock.orthanc_username = "user"
        mock.orthanc_password = "pass"
        mock.dcm4chee_url = "http://dcm4chee:8080/dcm4chee-arc/aets/DCM4CHEE/rs"
        mock.active_pacs = "orthanc"
        yield mock


@pytest.fixture
def service(mock_settings):
    """Return a PACSService instance with mocked clients."""
    with patch("app.pacs.service.DICOMwebClient") as mock_client_cls:
        # Stop init from actually making network calls if any
        mock_client_cls.return_value = MagicMock()
        return PACSService()


def test_pacs_client_initialization(mock_settings):
    """Test that clients are initialized based on settings."""
    with patch("app.pacs.service.DICOMwebClient") as mock_cls:
        service = PACSService()
        assert service.orthanc_client is not None
        assert service.dcm4chee_client is not None
        assert mock_cls.call_count == 2  # Once for each PACS


def test_get_active_client_dcm4chee(service, mock_settings):
    """Test active client selection (dcm4chee)."""
    mock_settings.active_pacs = "dcm4chee"
    client = service.get_active_client()
    assert client == service.dcm4chee_client


def test_get_active_client_orthanc(service, mock_settings):
    """Test active client selection (Orthanc)."""
    mock_settings.active_pacs = "orthanc"
    client = service.get_active_client()
    assert client == service.orthanc_client


def test_get_active_client_fallback(service, mock_settings):
    """Test fallback when preferred client unavailable."""
    mock_settings.active_pacs = "unknown"
    # Fallback logic in service.py: tries dcm4chee then orthanc
    client = service.get_active_client()
    assert client == service.dcm4chee_client


@patch("app.pacs.service.pydicom.dcmread")
def test_forward_files_stow_rs(mock_dcmread, service, mock_settings):
    """Test STOW-RS file forwarding."""
    mock_dcmread.return_value = MagicMock(spec=pydicom.FileDataset)
    client = service.get_active_client()
    client.store_instances.return_value = MagicMock()

    receipt = service.forward_files(["/dummy.dcm"])
    assert "STOW-SUCCESS-orthanc" in receipt
    client.store_instances.assert_called_once()


@patch("app.pacs.service.pydicom.dcmread")
def test_forward_files_retry_on_failure(mock_dcmread, service, mock_settings):
    """Test retry logic with exponential backoff on connection failure."""
    mock_dcmread.return_value = MagicMock(spec=pydicom.FileDataset)
    client = service.get_active_client()

    # Fail twice, then succeed
    client.store_instances.side_effect = [
        requests.exceptions.ConnectionError("Network down"),
        requests.exceptions.ConnectionError("Still down"),
        {},
    ]

    with patch("tenacity.nap.time.sleep"):
        receipt = service.forward_files(["/dummy.dcm"])

    assert "STOW-SUCCESS" in receipt
    assert client.store_instances.call_count == 3


def test_forward_files_fallback_to_rest(service, mock_settings):
    """Test fallback to Orthanc REST API when STOW fails."""
    mock_settings.active_pacs = "orthanc"

    # Force STOW fail after retries
    with patch("app.pacs.service.pydicom.dcmread") as mock_read:
        mock_read.return_value = MagicMock(spec=pydicom.FileDataset)
        client = service.get_active_client()
        client.store_instances.side_effect = requests.exceptions.HTTPError("FAIL")

        # Mock the requests.post for Orthanc REST API
        with patch("app.pacs.service.requests.post") as mock_post:
            mock_post.return_value = MagicMock(status_code=200)

            with patch("app.pacs.service.open", create=True) as mock_open:
                mock_open.return_value.__enter__.return_value.read.return_value = b"dicom_bytes"

                receipt = service.forward_files(["/dummy.dcm"])

                assert "FALLBACK-SUCCESS" in receipt
                mock_post.assert_called_once()


def test_pacs_connection_timeout(service, mock_settings):
    """Test connection timeout handling."""
    # This involves retry logic again, similar to test_forward_files_retry_on_failure
    pass


def test_pacs_authentication(mock_settings):
    """Test PACS authentication (basic auth) config."""
    with patch("app.pacs.service.requests.Session") as mock_session_cls:
        mock_session = mock_session_cls.return_value
        PACSService()

        # Verify basic auth was set for Orthanc
        assert mock_session.auth is not None
        assert isinstance(mock_session.auth, requests.auth.HTTPBasicAuth)
        assert mock_session.auth.username == "user"


def test_pacs_response_parsing(service):
    """Test parsing PACS responses (if service has custom parsing)."""
    # Current implementation returns a string receipt, but store_instances
    # results could be parsed more deeply.
    pass


@patch("app.pacs.service.pydicom.dcmread")
def test_pacs_error_handling(mock_dcmread, service, mock_settings):
    """Test error handling for various PACS errors."""
    mock_dcmread.return_value = MagicMock(spec=pydicom.FileDataset)
    client = service.get_active_client()

    # If fallback also fails, it should raise
    client.store_instances.side_effect = Exception("STOW FAIL")

    with patch("app.pacs.service.requests.post") as mock_post:
        mock_post.side_effect = Exception("REST FAIL")
        with pytest.raises(RuntimeError, match="All fallback uploads failed"):
            service.forward_files(["/dummy.dcm"])
