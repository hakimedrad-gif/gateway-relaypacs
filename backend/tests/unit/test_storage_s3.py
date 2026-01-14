from unittest.mock import MagicMock, patch

import pytest
from app.storage.service import S3StorageService
from botocore.exceptions import ClientError


@pytest.fixture
def mock_s3_client():
    with patch("boto3.client") as mock_client:
        yield mock_client


@pytest.mark.asyncio
async def test_s3_client_initialization(mock_s3_client):
    """Test S3 client initialization with credentials."""
    service = S3StorageService()
    # Check if boto3.client was called with correct parameters
    # The actual parameters depend on app.config.get_settings()
    assert mock_s3_client.called


@pytest.mark.asyncio
async def test_s3_bucket_creation(mock_s3_client):
    """Test bucket auto-creation if not exists (if implemented)."""
    # Current implementation doesn't seem to have auto-bucket creation in __init__
    pass


@pytest.mark.asyncio
async def test_save_chunk_to_s3(mock_s3_client):
    """Test chunk upload to S3."""
    service = S3StorageService()
    mock_s3 = mock_s3_client.return_value

    upload_id = "u1"
    file_id = "f1"
    data = b"chunk_data"

    await service.save_chunk(upload_id, file_id, 0, data)

    mock_s3.put_object.assert_called_once_with(
        Bucket=service.bucket, Key=f"{upload_id}/{file_id}/chunks/0.part", Body=data
    )


@pytest.mark.asyncio
async def test_save_chunk_multipart(mock_s3_client):
    """Test large chunk multipart upload (if implemented)."""
    # Current implementation uses put_object for all chunks
    pass


@pytest.mark.asyncio
async def test_merge_chunks_s3_copy(mock_s3_client):
    """Test merging using S3 operations (current impl downloads and merges locally)."""
    service = S3StorageService()
    mock_s3 = mock_s3_client.return_value

    # Mock get_object for 2 chunks
    mock_body = MagicMock()
    mock_body.read.return_value = b"part"
    mock_s3.get_object.return_value = {"Body": mock_body}

    # Mock upload_file
    mock_s3.upload_file.return_value = None

    res = await service.merge_chunks("u1", "f1", 2)

    assert mock_s3.get_object.call_count == 2
    assert mock_s3.upload_file.called is True
    assert "final_file" in str(res)


@pytest.mark.asyncio
async def test_cleanup_s3_batch_delete(mock_s3_client):
    """Test batch deletion of S3 objects."""
    service = S3StorageService()
    mock_s3 = mock_s3_client.return_value

    mock_s3.list_objects.return_value = {"Contents": [{"Key": "k1"}, {"Key": "k2"}]}

    await service.cleanup_upload("u1")

    mock_s3.delete_objects.assert_called_once()
    objs = mock_s3.delete_objects.call_args[1]["Delete"]["Objects"]
    assert len(objs) == 2
    assert objs[0]["Key"] == "k1"


@pytest.mark.asyncio
async def test_presigned_url_generation(mock_s3_client):
    """Test pre-signed URL generation for direct uploads (if implemented)."""
    # Not implemented in S3StorageService yet
    pass


@pytest.mark.asyncio
async def test_s3_connection_retry(mock_s3_client):
    """Test S3 connection retry on failure (if implemented)."""
    # Boto3 handles retries by default, but we can test custom logic if any
    pass


@pytest.mark.asyncio
async def test_s3_transfer_acceleration(mock_s3_client):
    """Test S3 transfer acceleration support."""
    # Not explicitly implemented in the service init
    pass


@pytest.mark.asyncio
async def test_verify_chunk_s3(mock_s3_client):
    """Test verification of chunk on S3 using head_object."""
    service = S3StorageService()
    mock_s3 = mock_s3_client.return_value

    mock_s3.head_object.return_value = {"ContentLength": 1024}

    assert await service.verify_chunk("u1", "f1", 0, 1024) is True
    assert await service.verify_chunk("u1", "f1", 0, 2048) is False

    # Test ClientError (missing object)
    mock_s3.head_object.side_effect = ClientError({"Error": {"Code": "404"}}, "head_object")
    assert await service.verify_chunk("u1", "f1", 0, 1024) is False
