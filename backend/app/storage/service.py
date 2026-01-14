import hashlib
import shutil
from pathlib import Path

import boto3
from botocore.exceptions import ClientError

from app.config import get_settings
from app.exceptions import ChunkUploadError

settings = get_settings()


class BaseStorageService:
    async def save_chunk(
        self, upload_id: str, file_id: str, chunk_index: int, chunk_data: bytes
    ) -> str:
        raise NotImplementedError()

    async def merge_chunks(
        self,
        upload_id: str,
        file_id: str,
        total_chunks: int,
        checksums: dict[int, str] | None = None,
    ) -> Path | str:
        """
        Merge chunks into final file.

        Args:
            upload_id: Upload session ID
            file_id: File identifier
            total_chunks: Total number of chunks
            checksums: Optional dict mapping chunk_index to expected MD5 checksum

        Raises:
            ChunkUploadError: If checksum validation fails
        """
        raise NotImplementedError()

    async def cleanup_upload(self, upload_id: str) -> None:
        raise NotImplementedError()

    async def chunk_exists(self, upload_id: str, file_id: str, chunk_index: int) -> bool:
        raise NotImplementedError()

    async def verify_chunk(
        self, upload_id: str, file_id: str, chunk_index: int, expected_size: int
    ) -> bool:
        """
        Verify chunk was written correctly by checking its size.

        This prevents silent data loss when chunk write fails mid-operation.
        Returns True if chunk exists and has correct size, False otherwise.
        """
        raise NotImplementedError()


class LocalStorageService(BaseStorageService):
    def __init__(self) -> None:
        self.base_path = Path("temp_uploads")
        self.base_path.mkdir(exist_ok=True)

    async def save_chunk(
        self, upload_id: str, file_id: str, chunk_index: int, chunk_data: bytes
    ) -> str:
        file_dir = self.base_path / str(upload_id) / str(file_id)
        file_dir.mkdir(parents=True, exist_ok=True)
        chunk_path = file_dir / f"{chunk_index}.part"
        with open(chunk_path, "wb") as f:
            f.write(chunk_data)
        return str(chunk_path)

    async def chunk_exists(self, upload_id: str, file_id: str, chunk_index: int) -> bool:
        chunk_path = self.base_path / str(upload_id) / str(file_id) / f"{chunk_index}.part"
        return chunk_path.exists()

    async def verify_chunk(
        self, upload_id: str, file_id: str, chunk_index: int, expected_size: int
    ) -> bool:
        """
        Verify chunk exists and has the correct size.

        Prevents silent data corruption from partial writes.
        """
        chunk_path = self.base_path / str(upload_id) / str(file_id) / f"{chunk_index}.part"

        if not chunk_path.exists():
            return False

        actual_size = chunk_path.stat().st_size
        return actual_size == expected_size

    async def merge_chunks(
        self,
        upload_id: str,
        file_id: str,
        total_chunks: int,
        checksums: dict[int, str] | None = None,
    ) -> Path:
        """Merge chunks with optional checksum validation."""
        file_dir = self.base_path / str(upload_id) / str(file_id)
        final_path = file_dir / "final_file"

        with open(final_path, "wb") as outfile:
            for i in range(total_chunks):
                chunk_path = file_dir / f"{i}.part"
                if not chunk_path.exists():
                    raise FileNotFoundError(f"Missing chunk {i} for file {file_id}")

                # Read chunk data
                with open(chunk_path, "rb") as infile:
                    chunk_data = infile.read()

                # Validate checksum if provided
                if checksums and i in checksums:
                    actual_checksum = hashlib.md5(chunk_data).hexdigest()
                    expected_checksum = checksums[i]
                    if actual_checksum != expected_checksum:
                        raise ChunkUploadError(
                            f"Chunk {i} checksum mismatch! "
                            f"Expected: {expected_checksum}, Got: {actual_checksum}. "
                            f"File may be corrupted."
                        )

                # Write chunk to final file
                outfile.write(chunk_data)

        return final_path

    async def cleanup_upload(self, upload_id: str) -> None:
        upload_dir = self.base_path / str(upload_id)
        if upload_dir.exists():
            shutil.rmtree(upload_dir)


class S3StorageService(BaseStorageService):
    def __init__(self) -> None:
        self.s3 = boto3.client(
            "s3",
            endpoint_url=settings.s3_endpoint,
            aws_access_key_id=settings.s3_access_key,
            aws_secret_access_key=settings.s3_secret_key,
            region_name=settings.s3_region,
        )
        self.bucket = settings.s3_bucket

    async def save_chunk(
        self, upload_id: str, file_id: str, chunk_index: int, chunk_data: bytes
    ) -> str:
        key = f"{upload_id}/{file_id}/chunks/{chunk_index}.part"
        self.s3.put_object(Bucket=self.bucket, Key=key, Body=chunk_data)
        return f"s3://{self.bucket}/{key}"

    async def chunk_exists(self, upload_id: str, file_id: str, chunk_index: int) -> bool:
        key = f"{upload_id}/{file_id}/chunks/{chunk_index}.part"
        try:
            self.s3.head_object(Bucket=self.bucket, Key=key)
            return True
        except ClientError:
            return False

    async def verify_chunk(
        self, upload_id: str, file_id: str, chunk_index: int, expected_size: int
    ) -> bool:
        """
        Verify S3 chunk exists and has correct size.

        Uses HEAD request to check object metadata without downloading.
        """
        key = f"{upload_id}/{file_id}/chunks/{chunk_index}.part"
        try:
            response = self.s3.head_object(Bucket=self.bucket, Key=key)
            actual_size = response["ContentLength"]
            return actual_size == expected_size
        except ClientError:
            return False

    async def merge_chunks(
        self,
        upload_id: str,
        file_id: str,
        total_chunks: int,
        checksums: dict[int, str] | None = None,
    ) -> str:
        # For simplicity in MVP, we might download chunks and merge locally,
        # or use S3 multipart upload with UploadPartCopy.
        # Let's do local merge for now to ensure DICOM validation (which needs a local file)
        # but store final file in S3.

        temp_dir = Path(f"temp_merge/{upload_id}/{file_id}")
        temp_dir.mkdir(parents=True, exist_ok=True)
        final_path = temp_dir / "final_file"

        with open(final_path, "wb") as outfile:
            for i in range(total_chunks):
                key = f"{upload_id}/{file_id}/chunks/{i}.part"
                response = self.s3.get_object(Bucket=self.bucket, Key=key)
                outfile.write(response["Body"].read())

        # Upload final file back to S3
        final_key = f"{upload_id}/{file_id}/final.dcm"
        self.s3.upload_file(str(final_path), self.bucket, final_key)

        return str(final_path)  # Return local path for validation

    async def cleanup_upload(self, upload_id: str) -> None:
        # Delete objects with prefix
        objects_to_delete = self.s3.list_objects(Bucket=self.bucket, Prefix=f"{upload_id}/")
        if "Contents" in objects_to_delete:
            delete_keys = [{"Key": obj["Key"]} for obj in objects_to_delete["Contents"]]
            self.s3.delete_objects(Bucket=self.bucket, Delete={"Objects": delete_keys})

        # Also cleanup local temp merge if it exists
        temp_dir = Path(f"temp_merge/{upload_id}")
        if temp_dir.exists():
            shutil.rmtree(temp_dir)


# Factory-like singleton
storage_service: BaseStorageService
if settings.use_s3:
    storage_service = S3StorageService()
else:
    storage_service = LocalStorageService()
