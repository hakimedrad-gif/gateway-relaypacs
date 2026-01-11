from unittest.mock import MagicMock, patch

import pytest
from app.storage.service import S3StorageService


@pytest.fixture
def mock_s3_client():
    with patch("boto3.client") as mock_client:
        yield mock_client


@pytest.mark.asyncio
async def test_s3_save_chunk(mock_s3_client):
    service = S3StorageService()
    mock_s3 = mock_s3_client.return_value

    await service.save_chunk("upload1", "file1", 0, b"data")

    mock_s3.put_object.assert_called_once_with(
        Bucket="relay-pacs-uploads", Key="upload1/file1/chunks/0.part", Body=b"data"
    )


@pytest.mark.asyncio
async def test_s3_merge_chunks(mock_s3_client, tmp_path):
    # Mock settings to use tmp_path for merge
    # Actually S3StorageService uses hardcoded 'temp_merge'
    # I'll just mock the file operations or let it fail after S3 calls

    service = S3StorageService()
    mock_s3 = mock_s3_client.return_value

    # Mock get_object to return dummy body
    mock_body = MagicMock()
    mock_body.read.return_value = b"part-data"
    mock_s3.get_object.return_value = {"Body": mock_body}

    # Mock upload_file
    mock_s3.upload_file.return_value = None

    # We need to ensure the temp_merge directory doesn't mess up current path
    # But it's relative, so it's fine for a test.

    res = await service.merge_chunks("upload1", "file1", 2)

    assert mock_s3.get_object.call_count == 2
    assert mock_s3.upload_file.called is True
    assert "final_file" in res


@pytest.mark.asyncio
async def test_s3_cleanup(mock_s3_client):
    service = S3StorageService()
    mock_s3 = mock_s3_client.return_value

    mock_s3.list_objects.return_value = {"Contents": [{"Key": "k1"}, {"Key": "k2"}]}

    await service.cleanup_upload("upload1")

    mock_s3.delete_objects.assert_called_once()
    assert mock_s3.delete_objects.call_args[1]["Delete"]["Objects"] == [
        {"Key": "k1"},
        {"Key": "k2"},
    ]
