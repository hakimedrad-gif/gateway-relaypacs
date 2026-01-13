"""Tests for upload size validation (P0-2)."""

import pytest
from pydantic import ValidationError

from app.models.upload import UploadInitRequest, StudyMetadata


class TestUploadSizeValidation:
    """Test upload size validation to prevent DoS attacks."""

    @pytest.fixture
    def valid_metadata(self):
        """Valid study metadata for testing."""
        return StudyMetadata(
            patient_name="Test Patient",
            study_date="2024-01-01",
            modality="CT",
            service_level="routine"
        )

    def test_upload_size_rejects_zero(self, valid_metadata):
        """Test that zero-byte upload is rejected."""
        with pytest.raises(ValidationError) as exc_info:
            UploadInitRequest(
                study_metadata=valid_metadata,
                total_files=1,
                total_size_bytes=0
            )
        
        assert "greater than 0" in str(exc_info.value).lower()

    def test_upload_size_rejects_negative(self, valid_metadata):
        """Test that negative size is rejected."""
        with pytest.raises(ValidationError) as exc_info:
            UploadInitRequest(
                study_metadata=valid_metadata,
                total_files=1,
                total_size_bytes=-1000
            )
        
        assert "greater than 0" in str(exc_info.value).lower()

    def test_upload_size_rejects_exceeds_max(self, valid_metadata):
        """Test that size exceeding 2GB is rejected."""
        # 2GB = 2048 MB = 2,147,483,648 bytes
        max_size = 2048 * 1024 * 1024
        too_large = max_size + 1000  # Just over the limit
        
        with pytest.raises(ValidationError) as exc_info:
            UploadInitRequest(
                study_metadata=valid_metadata,
                total_files=1,
                total_size_bytes=too_large
            )
        
        error_msg = str(exc_info.value).lower()
        assert "exceeds maximum" in error_msg or "max" in error_msg

    def test_upload_size_accepts_exactly_max(self, valid_metadata):
        """Test that exactly 2GB is accepted."""
        max_size = 2048 * 1024 * 1024
        
        # Should not raise
        request = UploadInitRequest(
            study_metadata=valid_metadata,
            total_files=1,
            total_size_bytes=max_size
        )
        assert request.total_size_bytes == max_size

    def test_upload_size_accepts_valid_small(self, valid_metadata):
        """Test that small valid upload is accepted."""
        small_size = 10 * 1024 * 1024  # 10 MB
        
        request = UploadInitRequest(
            study_metadata=valid_metadata,
            total_files=1,
            total_size_bytes=small_size
        )
        assert request.total_size_bytes == small_size

    def test_upload_size_accepts_valid_large(self, valid_metadata):
        """Test that large but valid upload is accepted."""
        large_size = 1000 * 1024 * 1024  # 1000 MB
        
        request = UploadInitRequest(
            study_metadata=valid_metadata,
            total_files=1,
            total_size_bytes=large_size
        )
        assert request.total_size_bytes == large_size

    def test_upload_size_error_message_shows_limits(self, valid_metadata):
        """Test that error message shows actual vs maximum size."""
        too_large = 3000 * 1024 * 1024  # 3GB
        
        with pytest.raises(ValidationError) as exc_info:
            UploadInitRequest(
                study_metadata=valid_metadata,
                total_files=1,
                total_size_bytes=too_large
            )
        
        error_msg = str(exc_info.value)
        assert "2048" in error_msg or "2gb" in error_msg.lower()
