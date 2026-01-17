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

    // 2. Store file contents in parallel batches to avoid blocking
    const BATCH_SIZE = 5;
    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      const batch = files.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(async (file) => {
          const arrayBuffer = await file.arrayBuffer();
          await db.files.add({
            studyId: Number(studyId),
            fileName: file.name,
            fileType: file.type,
            size: file.size,
            blob: arrayBuffer,
            uploadedChunks: [],
          });
        }),
      );
    }

    return Number(studyId);
  }

  async initializeSession(studyId: number): Promise<{ uploadId: string; uploadToken: string }> {
    const study = await db.studies.get(studyId);
    if (!study) throw new Error('Study not found');

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
      let totalChunksProcessed = 0;
      const totalStudyChunks = files.reduce((acc, f) => acc + Math.ceil(f.size / chunkSize), 0);

      for (const file of files) {
        const totalChunks = Math.ceil(file.size / chunkSize);
        for (let i = 0; i < totalChunks; i++) {
          if (file.uploadedChunks.includes(i)) {
            totalChunksProcessed++;
            continue;
          }

          const start = i * chunkSize;
          const end = Math.min(start + chunkSize, file.size);
          const chunkBlob = new Blob([file.blob as BlobPart]).slice(start, end);

          try {
            await uploadApi.uploadChunk(uploadId, String(file.id), i, chunkBlob, uploadToken);
            file.uploadedChunks.push(i);
            totalChunksProcessed++;

            // Update local state and study progress
            await db.files.update(file.id!, { uploadedChunks: file.uploadedChunks });

            // AC-25: Throttle DB updates for progress
            if (totalChunksProcessed % 5 === 0 || totalChunksProcessed === totalStudyChunks) {
              const progress = Math.round((totalChunksProcessed / totalStudyChunks) * 100);
              await db.studies.update(studyId, { progress });
            }
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
