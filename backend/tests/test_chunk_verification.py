"""Tests for chunk verification (P0-4)."""

import tempfile
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
from app.storage.service import LocalStorageService, S3StorageService


class TestLocalStorageChunkVerification:
    """Test chunk verification for local filesystem storage."""

    @pytest.fixture
    def storage_service(self):
        """Create local storage service with temp directory."""
        with tempfile.TemporaryDirectory() as tmpdir:
            service = LocalStorageService()
            service.base_path = Path(tmpdir)
            yield service

    @pytest.mark.asyncio
    async def test_verify_chunk_returns_true_for_correct_size(self, storage_service):
        """Test that verify_chunk returns True when chunk has correct size."""
        upload_id = "test_upload"
        file_id = "file1"
        chunk_index = 0
        chunk_data = b"test chunk data" * 100  # 1500 bytes
        expected_size = len(chunk_data)

        # Save chunk
        await storage_service.save_chunk(upload_id, file_id, chunk_index, chunk_data)

        # Verify
        result = await storage_service.verify_chunk(upload_id, file_id, chunk_index, expected_size)

        assert result is True

    @pytest.mark.asyncio
    async def test_verify_chunk_returns_false_for_wrong_size(self, storage_service):
        """Test that verify_chunk returns False when chunk has wrong size."""
        upload_id = "test_upload"
        file_id = "file1"
        chunk_index = 0
        chunk_data = b"test chunk data"
        wrong_expected_size = 9999  # Different from actual size

        # Save chunk
        await storage_service.save_chunk(upload_id, file_id, chunk_index, chunk_data)

        # Verify with wrong expected size
        result = await storage_service.verify_chunk(
            upload_id, file_id, chunk_index, wrong_expected_size
        )

        assert result is False

    @pytest.mark.asyncio
    async def test_verify_chunk_returns_false_for_missing_chunk(self, storage_service):
        """Test that verify_chunk returns False when chunk doesn't exist."""
        upload_id = "test_upload"
        file_id = "file1"
        chunk_index = 99  # Non-existent chunk
        expected_size = 1000

        # Don't save chunk

        # Verify
        result = await storage_service.verify_chunk(upload_id, file_id, chunk_index, expected_size)

        assert result is False

    @pytest.mark.asyncio
    async def test_verify_chunk_detects_partial_write(self, storage_service):
        """Test that verify_chunk detects partial/corrupted writes."""
        upload_id = "test_upload"
        file_id = "file1"
        chunk_index = 0
        full_data = b"X" * 1000
        expected_size = 1000

        # Simulate partial write by writing less data than expected
        partial_data = full_data[:500]  # Only 500 bytes
        await storage_service.save_chunk(upload_id, file_id, chunk_index, partial_data)

        # Verify should fail because actual size (500) != expected size (1000)
        result = await storage_service.verify_chunk(upload_id, file_id, chunk_index, expected_size)

        assert result is False


class TestS3StorageChunkVerification:
    """Test chunk verification for S3 storage."""

    @pytest.fixture
    def storage_service(self):
        """Create S3 storage service with mocked boto3."""
        with patch("app.storage.service.boto3") as mock_boto3:
            service = S3StorageService()
            service.s3 = MagicMock()
            service.bucket = "test-bucket"
            yield service

    @pytest.mark.asyncio
    async def test_verify_chunk_returns_true_for_s3_correct_size(self, storage_service):
        """Test that S3 verify_chunk returns True when ContentLength matches."""
        upload_id = "test_upload"
        file_id = "file1"
        chunk_index = 0
        expected_size = 1024

        # Mock S3 HEAD response with correct ContentLength
        storage_service.s3.head_object.return_value = {"ContentLength": expected_size}

        result = await storage_service.verify_chunk(upload_id, file_id, chunk_index, expected_size)

        assert result is True
        storage_service.s3.head_object.assert_called_once()

    @pytest.mark.asyncio
    async def test_verify_chunk_returns_false_for_s3_wrong_size(self, storage_service):
        """Test that S3 verify_chunk returns False when ContentLength doesn't match."""
        upload_id = "test_upload"
        file_id = "file1"
        chunk_index = 0
        expected_size = 1024
        actual_size = 512  # Different size

        # Mock S3 HEAD response with wrong ContentLength
        storage_service.s3.head_object.return_value = {"ContentLength": actual_size}

        result = await storage_service.verify_chunk(upload_id, file_id, chunk_index, expected_size)

        assert result is False

    @pytest.mark.asyncio
    async def test_verify_chunk_returns_false_for_s3_missing_object(self, storage_service):
        """Test that S3 verify_chunk returns False when object doesn't exist."""
        from botocore.exceptions import ClientError

        upload_id = "test_upload"
        file_id = "file1"
        chunk_index = 0
        expected_size = 1024

        # Mock S3 HEAD to raise ClientError (404 Not Found)
        storage_service.s3.head_object.side_effect = ClientError(
            {"Error": {"Code": "404", "Message": "Not Found"}}, "HeadObject"
        )

        result = await storage_service.verify_chunk(upload_id, file_id, chunk_index, expected_size)

        assert result is False

    @pytest.mark.asyncio
    async def test_verify_chunk_uses_head_not_get(self, storage_service):
        """Test that verification uses HEAD request (metadata only, not full download)."""
        upload_id = "test_upload"
        file_id = "file1"
        chunk_index = 0
        expected_size = 1024

        storage_service.s3.head_object.return_value = {"ContentLength": expected_size}

        await storage_service.verify_chunk(upload_id, file_id, chunk_index, expected_size)

        # Should call head_object, NOT get_object
        storage_service.s3.head_object.assert_called_once()
        storage_service.s3.get_object.assert_not_called()
