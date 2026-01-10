import { describe, it, expect, beforeEach, vi } from 'vitest';
import { uploadManager } from '../services/uploadManager';
import { db } from '../db/db';
import { uploadApi } from '../services/api';

vi.mock('../services/api', () => ({
  uploadApi: {
    login: vi.fn().mockResolvedValue({ access_token: 'fake-token' }),
    initUpload: vi.fn(),
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
  });
});
