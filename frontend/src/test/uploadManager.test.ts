import { describe, it, expect, beforeEach, vi } from 'vitest';
import { uploadManager } from '../services/uploadManager';
import { db } from '../db/db';
import { uploadApi } from '../services/api';

vi.mock('../services/api', () => ({
  uploadApi: {
    login: vi.fn().mockResolvedValue({ access_token: 'fake-token' }),
    initUpload: vi.fn(),
    getUploadStatus: vi.fn(),
    uploadChunk: vi.fn(),
    completeUpload: vi.fn(),
  }
}));

describe('UploadManagerService', () => {
  beforeEach(async () => {
    await db.studies.clear();
    await db.files.clear();
    vi.clearAllMocks();
  });

  it('should create a study and store files in IndexedDB', async () => {
    const mockFiles = [
      new File(['dummy context'], 'test1.dcm', { type: 'application/dicom' })
    ];
    const mockMetadata = {
      patient_name: 'DOE^JOHN',
      study_date: '20230101',
      modality: 'CT'
    };

    const studyId = await uploadManager.createStudy(mockFiles, mockMetadata);
    expect(studyId).toBeDefined();

    const study = await db.studies.get(studyId);
    expect(study).toBeDefined();
    expect(study?.metadata.patientName).toBe('DOE^JOHN');
    expect(study?.totalFiles).toBe(1);

    const files = await db.files.where('studyId').equals(studyId).toArray();
    expect(files.length).toBe(1);
    expect(files[0].fileName).toBe('test1.dcm');
  });

  it('should orchestrate the upload flow correctly', async () => {
    const blobContent = new Uint8Array(1024);
    const mockFiles = [
      new File([blobContent], 'test.dcm', { type: 'application/dicom' })
    ];
    const mockMetadata = { patient_name: 'TEST' };
    
    // Mock API responses
    vi.mocked(uploadApi.initUpload).mockResolvedValue({
      upload_id: 'remote-id',
      upload_token: 'scoped-token',
      chunk_size: 512, // 2 chunks for 1024 bytes
      expires_at: new Date().toISOString()
    });

    const studyId = await uploadManager.createStudy(mockFiles, mockMetadata);
    await uploadManager.startUpload(studyId);

    expect(uploadApi.login).toHaveBeenCalled();
    expect(uploadApi.initUpload).toHaveBeenCalled();
    expect(uploadApi.uploadChunk).toHaveBeenCalledTimes(2); // 1024 / 512
    expect(uploadApi.completeUpload).toHaveBeenCalledWith('remote-id', 'scoped-token');

    const study = await db.studies.get(studyId);
    expect(study?.status).toBe('complete');
    
    // Verify PHI cleanup
    const storedFiles = await db.files.where('studyId').equals(studyId).toArray();
    expect(storedFiles.length).toBe(0);
  });
  it('should resume an incomplete upload by fetching status', async () => {
    // Setup initial state: Study with uploadId and partial progress
    // Use 2.5MB file to ensure multiple chunks (1MB default chunk size) -> 3 chunks: 0, 1, 2
    const blobContent = new Uint8Array(2.5 * 1024 * 1024);
    const mockFiles = [
      new File([blobContent], 'test_resume.dcm', { type: 'application/dicom' })
    ];
    const studyId = await uploadManager.createStudy(mockFiles, { patient_name: 'RESUME_PATIENT' });
    
    // Manually update DB to simulate broken state
    await db.studies.update(studyId, { 
        status: 'uploading', 
        uploadId: 'resume-id',
        uploadToken: 'resume-token'
    });
    
    const files = await db.files.where('studyId').equals(studyId).toArray();
    const fileId = String(files[0].id);

    // Mock getUploadStatus to say chunk 0 is already there
    vi.mocked(uploadApi.getUploadStatus).mockResolvedValue({
        upload_id: 'resume-id',
        progress_percent: 40, // 1/2.5 ~ 40%
        uploaded_bytes: 1024 * 1024,
        total_bytes: 2.5 * 1024 * 1024,
        state: 'uploading',
        chunks_received: 1,
        chunks_total: 3,
        pacs_status: 'pending',
        files: {
            [fileId]: { 
                received_chunks: [0],
                complete: false
            }
        }
    });

    vi.mocked(uploadApi.initUpload).mockResolvedValue({
        upload_id: 'resume-id',
        upload_token: 'resume-token',
        chunk_size: 1024 * 1024,
        expires_at: new Date().toISOString()
    });
    
    // We expect it to NOT call initUpload again (if resumed)
    // Actually our logic calls getUploadStatus.
    // And then skips chunk 0.
    
    // We need to Mock uploadApi.getUploadStatus which was not mocked in setup
    // But since we use vi.mock('../services/api'), we need to add it there or here.
    // The top-level mock needs to include getUploadStatus.
    // Let's rely on the top mock update or just type casting here if possible.
    // Better to update the top mock.
    
    await uploadManager.startUpload(studyId);
    
    // Verify getStatus was called
    expect(uploadApi.getUploadStatus).toHaveBeenCalledWith('resume-id', 'resume-token');
    
    // Verify chunk 0 was SKIPPED, only chunk 1 and 2 uploaded
    // uploadChunk args: uploadId, fileId, chunkIndex...
    expect(uploadApi.uploadChunk).toHaveBeenCalledTimes(2); 
    
    // First call should be chunk 1
    expect(uploadApi.uploadChunk).toHaveBeenNthCalledWith(
        1,
        'resume-id', 
        expect.any(String), 
        1, // Chunk index 1
        expect.any(Blob), 
        'resume-token'
    );
    // Second call should be chunk 2
    expect(uploadApi.uploadChunk).toHaveBeenNthCalledWith(
        2,
        'resume-id', 
        expect.any(String), 
        2, // Chunk index 2
        expect.any(Blob), 
        'resume-token'
    );
    
    expect(uploadApi.completeUpload).toHaveBeenCalled();
  });
});
