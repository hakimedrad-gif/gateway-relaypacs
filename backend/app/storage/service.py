import shutil
from pathlib import Path
import boto3
from botocore.exceptions import ClientError
from app.config import get_settings

settings = get_settings()

class BaseStorageService:
    async def save_chunk(self, upload_id: str, file_id: str, chunk_index: int, chunk_data: bytes) -> str:
        raise NotImplementedError()
        
    async def merge_chunks(self, upload_id: str, file_id: str, total_chunks: int) -> Path | str:
        raise NotImplementedError()
        
    async def cleanup_upload(self, upload_id: str):
        raise NotImplementedError()

class LocalStorageService(BaseStorageService):
    def __init__(self):
        self.base_path = Path("temp_uploads")
        self.base_path.mkdir(exist_ok=True)
    
    async def save_chunk(self, upload_id: str, file_id: str, chunk_index: int, chunk_data: bytes) -> str:
        file_dir = self.base_path / str(upload_id) / str(file_id)
        file_dir.mkdir(parents=True, exist_ok=True)
        chunk_path = file_dir / f"{chunk_index}.part"
        with open(chunk_path, "wb") as f:
            f.write(chunk_data)
        return str(chunk_path)
    
    async def merge_chunks(self, upload_id: str, file_id: str, total_chunks: int) -> Path:
        file_dir = self.base_path / str(upload_id) / str(file_id)
        final_path = file_dir / "final_file"
        with open(final_path, "wb") as outfile:
            for i in range(total_chunks):
                chunk_path = file_dir / f"{i}.part"
                if not chunk_path.exists():
                    raise FileNotFoundError(f"Missing chunk {i} for file {file_id}")
                with open(chunk_path, "rb") as infile:
                    outfile.write(infile.read())
        return final_path

    async def cleanup_upload(self, upload_id: str):
        upload_dir = self.base_path / str(upload_id)
        if upload_dir.exists():
            shutil.rmtree(upload_dir)

class S3StorageService(BaseStorageService):
    def __init__(self):
        self.s3 = boto3.client(
            's3',
            endpoint_url=settings.s3_endpoint,
            aws_access_key_id=settings.s3_access_key,
            aws_secret_access_key=settings.s3_secret_key,
            region_name=settings.s3_region
        )
        self.bucket = settings.s3_bucket

    async def save_chunk(self, upload_id: str, file_id: str, chunk_index: int, chunk_data: bytes) -> str:
        key = f"{upload_id}/{file_id}/chunks/{chunk_index}.part"
        self.s3.put_object(Bucket=self.bucket, Key=key, Body=chunk_data)
        return f"s3://{self.bucket}/{key}"

    async def merge_chunks(self, upload_id: str, file_id: str, total_chunks: int) -> str:
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
                outfile.write(response['Body'].read())
        
        # Upload final file back to S3
        final_key = f"{upload_id}/{file_id}/final.dcm"
        self.s3.upload_file(str(final_path), self.bucket, final_key)
        
        return str(final_path) # Return local path for validation

    async def cleanup_upload(self, upload_id: str):
        # Delete objects with prefix
        objects_to_delete = self.s3.list_objects(Bucket=self.bucket, Prefix=f"{upload_id}/")
        if 'Contents' in objects_to_delete:
            delete_keys = [{'Key': obj['Key']} for obj in objects_to_delete['Contents']]
            self.s3.delete_objects(Bucket=self.bucket, Delete={'Objects': delete_keys})
        
        # Also cleanup local temp merge if it exists
        temp_dir = Path(f"temp_merge/{upload_id}")
        if temp_dir.exists():
            shutil.rmtree(temp_dir)

# Factory-like singleton
if settings.use_s3:
    storage_service = S3StorageService()
else:
    storage_service = LocalStorageService()
