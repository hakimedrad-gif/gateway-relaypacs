import shutil
from pathlib import Path

import pytest
from app.storage.service import storage_service


@pytest.fixture
def temp_storage():
    """Fixture to provide a clean test storage path"""
    original_path = storage_service.base_path
    test_path = Path("test_storage_dir")
    storage_service.base_path = test_path
    test_path.mkdir(exist_ok=True)

    yield storage_service

    if test_path.exists():
        shutil.rmtree(test_path)
    storage_service.base_path = original_path


@pytest.mark.asyncio
async def test_save_and_merge_chunks(temp_storage):
    upload_id = "test-upload-123"
    file_id = "test-file-abc"

    chunk1 = b"Hello "
    chunk2 = b"World!"

    # 1. Save chunks
    path1 = await temp_storage.save_chunk(upload_id, file_id, 0, chunk1)
    path2 = await temp_storage.save_chunk(upload_id, file_id, 1, chunk2)

    assert Path(path1).exists()
    assert Path(path2).exists()

    # 2. Merge chunks
    final_path = await temp_storage.merge_chunks(upload_id, file_id, 2)

    assert final_path.exists()
    assert final_path.read_bytes() == b"Hello World!"


@pytest.mark.asyncio
async def test_merge_missing_chunk_raises_error(temp_storage):
    upload_id = "test-missing-chunk"
    file_id = "file1"

    await temp_storage.save_chunk(upload_id, file_id, 0, b"data")

    # Expecting 2 chunks but only 0 is saved
    with pytest.raises(FileNotFoundError):
        await temp_storage.merge_chunks(upload_id, file_id, 2)


@pytest.mark.asyncio
async def test_cleanup_upload(temp_storage):
    upload_id = "cleanup-me"
    file_id = "f1"

    await temp_storage.save_chunk(upload_id, file_id, 0, b"some data")
    upload_dir = temp_storage.base_path / upload_id
    assert upload_dir.exists()

    await temp_storage.cleanup_upload(upload_id)
    assert not upload_dir.exists()
