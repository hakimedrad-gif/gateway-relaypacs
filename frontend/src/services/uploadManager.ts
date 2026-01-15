import { db } from '../db/db';
import { uploadApi } from './api';
import type { StudyMetadata } from './api';

export class UploadManagerService {
  private static instance: UploadManagerService;

  private constructor() {}

  public static getInstance(): UploadManagerService {
    if (!UploadManagerService.instance) {
      UploadManagerService.instance = new UploadManagerService();
    }
    return UploadManagerService.instance;
  }

  async createStudy(files: File[], metadata: StudyMetadata): Promise<number> {
    const totalSize = files.reduce((acc, file) => acc + file.size, 0);

    // 1. Create local DB entry
    const studyId = await db.studies.add({
      status: 'queued',
      metadata: {
        patientName: metadata.patient_name || '',
        studyDate: metadata.study_date || '',
        modality: metadata.modality || '',
        age: metadata.age || '',
        gender: metadata.gender || '',
        serviceLevel: metadata.service_level || 'routine',
        studyDescription: metadata.study_description || '',
        clinicalHistory: metadata.clinical_history || '',
      },
      totalFiles: files.length,
      totalSize: totalSize,
      createdAt: new Date(),
    });

    // 2. Store file contents as ArrayBuffers for maximum compatibility
    for (const file of files) {
      const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
      });

      await db.files.add({
        studyId: Number(studyId),
        fileName: file.name,
        fileType: file.type,
        size: file.size,
        blob: arrayBuffer as ArrayBuffer, // Storing as ArrayBuffer
        uploadedChunks: [],
      });
    }

    return Number(studyId);
  }

  async initializeSession(studyId: number): Promise<{ uploadId: string; uploadToken: string }> {
    const study = await db.studies.get(studyId);
    if (!study) throw new Error('Study not found');

    // 1. Authenticate (Auto-login for MVP)
    await uploadApi.login('admin', 'password');

    const { uploadId: existingId, uploadToken: existingToken } = study;

    if (existingId && existingToken) {
      try {
        await uploadApi.getUploadStatus(existingId, existingToken);
        return { uploadId: existingId, uploadToken: existingToken };
      } catch {
        console.warn('Session expired, re-initializing...');
      }
    }

    const initResponse = await uploadApi.initUpload(
      {
        patient_name: study.metadata.patientName,
        study_date: study.metadata.studyDate,
        modality: study.metadata.modality,
        age: study.metadata.age,
        gender: study.metadata.gender,
        service_level: study.metadata.serviceLevel,
      },
      study.totalFiles,
      study.totalSize,
      study.metadata.clinicalHistory,
    );

    await db.studies.update(studyId, {
      status: 'uploading',
      uploadId: initResponse.upload_id,
      uploadToken: initResponse.upload_token,
    });

    return { uploadId: initResponse.upload_id, uploadToken: initResponse.upload_token };
  }

  async processUpload(studyId: number) {
    const study = await db.studies.get(studyId);
    if (!study || !study.uploadId || !study.uploadToken) {
      throw new Error('Upload session not initialized');
    }

    const uploadId = study.uploadId;
    let uploadToken = study.uploadToken;
    const chunkSize = 1024 * 1024;

    const refreshInterval = setInterval(
      async () => {
        try {
          const response = await uploadApi.refreshUploadToken(uploadId);
          uploadToken = response.upload_token;
          await db.studies.update(studyId, { uploadToken });
        } catch (e) {
          console.error('Failed to refresh upload token:', e);
        }
      },
      20 * 60 * 1000,
    );

    try {
      const files = await db.files.where('studyId').equals(studyId).toArray();
      for (const file of files) {
        const totalChunks = Math.ceil(file.size / chunkSize);
        for (let i = 0; i < totalChunks; i++) {
          if (file.uploadedChunks.includes(i)) continue;

          const start = i * chunkSize;
          const end = Math.min(start + chunkSize, file.size);
          const chunkBlob = new Blob([file.blob as BlobPart]).slice(start, end);

          try {
            await uploadApi.uploadChunk(uploadId, String(file.id), i, chunkBlob, uploadToken);
            file.uploadedChunks.push(i);
            await db.files.update(file.id!, { uploadedChunks: file.uploadedChunks });
          } catch (e: unknown) {
            await db.studies.update(studyId, { status: 'failed' });
            throw e;
          }
        }
      }

      await uploadApi.completeUpload(uploadId, uploadToken);
      await db.studies.update(studyId, { status: 'complete' });
      await db.files.where('studyId').equals(studyId).delete();
    } finally {
      clearInterval(refreshInterval);
    }
  }

  async startUpload(studyId: number) {
    await this.initializeSession(studyId);
    return this.processUpload(studyId);
  }
}

export const uploadManager = UploadManagerService.getInstance();
