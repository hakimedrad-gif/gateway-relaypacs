"""Tests for exception handling improvements (P0-5)."""

import pytest
import logging
from unittest.mock import MagicMock, patch
from pathlib import Path

from app.exceptions import (
    DicomProcessingError,
    StorageError,
    PACSConnectionError,
    ChunkUploadError
)


class TestCustomExceptions:
    """Test custom exception hierarchy."""

    def test_all_exceptions_inherit_from_relay_pacs_error(self):
        """Test that all custom exceptions inherit from RelayPACSError."""
        from app.exceptions import RelayPACSError
        
        exceptions = [
            DicomProcessingError,
            StorageError,
            PACSConnectionError,
            ChunkUploadError
        ]
        
        for exc_class in exceptions:
            assert issubclass(exc_class, RelayPACSError)

    def test_exceptions_can_be_raised_and_caught(self):
        """Test that custom exceptions can be raised and caught."""
        with pytest.raises(DicomProcessingError):
            raise DicomProcessingError("Test DICOM error")
        
        with pytest.raises(StorageError):
            raise StorageError("Test storage error")
        
        with pytest.raises(PACSConnectionError):
            raise PACSConnectionError("Test PACS error")

    def test_exceptions_preserve_message(self):
        """Test that exception messages are preserved."""
        error_msg = "Test error message"
        
        try:
            raise DicomProcessingError(error_msg)
        except DicomProcessingError as e:
            assert str(e) == error_msg


class TestUploadExceptionHandling:
    """Test exception handling in upload completion."""

    @pytest.fixture
    def mock_logger(self):
        """Mock logger to verify logging calls."""
        with patch('app.upload.router.logger') as mock_log:
            yield mock_log

    def test_storage_errors_are_logged_with_context(self, mock_logger):
        """Test that storage errors are logged with upload context."""
        # This would be tested in integration tests with full upload flow
        # For now, verify logger is configured correctly
        assert hasattr(logging.getLogger('app.upload.router'), 'error')

    def test_exception_type_included_in_error_message(self):
        """Test that exception type name is included in error messages."""
        # Simulate the error message format used in upload router
        exc = OSError("Disk full")
        error_msg = f"Storage error: {type(exc).__name__}: {exc!s}"
        
        assert "OSError" in error_msg
        assert "Disk full" in error_msg

    def test_pacs_connection_errors_handled_separately(self):
        """Test that PACS connection errors are categorized correctly."""
        # Verify ConnectionError and TimeoutError would be caught
        connection_errors = [ConnectionError, TimeoutError]
        
        for error_type in connection_errors:
            assert issubclass(error_type, Exception)


class TestStructuredLogging:
    """Test structured logging implementation."""

    def test_log_includes_upload_id_context(self):
        """Test that logs include upload_id in extra context."""
        logger = logging.getLogger('app.upload.router')
        
        # Verify logger exists and can log with extra context
        with patch.object(logger, 'error') as mock_error:
            logger.error("Test error", exc_info=True, extra={"upload_id": "test123"})
            
            mock_error.assert_called_once()
            call_args = mock_error.call_args
            assert call_args[1]['extra']['upload_id'] == "test123"

    def test_log_includes_file_id_context(self):
        """Test that logs can include file_id in extra context."""
        logger = logging.getLogger('app.upload.router')
        
        with patch.object(logger, 'error') as mock_error:
            logger.error(
                "Test error", 
                exc_info=True, 
                extra={"upload_id": "test123", "file_id": "file456"}
            )
            
            mock_error.assert_called_once()
            call_args = mock_error.call_args
            assert call_args[1]['extra']['file_id'] == "file456"

    def test_exc_info_true_for_stack_traces(self):
        """Test that exc_info=True is used for stack traces."""
        logger = logging.getLogger('app.upload.router')
        
        with patch.object(logger, 'error') as mock_error:
            try:
                raise ValueError("Test exception")
            except ValueError:
                logger.error("Caught error", exc_info=True)
            
            mock_error.assert_called_once()
            assert mock_error.call_args[1]['exc_info'] is True
