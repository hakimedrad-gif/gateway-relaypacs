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

  async startUpload(studyId: number) {
    const study = await db.studies.get(studyId);
    if (!study) throw new Error('Study not found');

    // 1. Authenticate (Auto-login for MVP)
    // In real app, we'd check if we have a valid auth token
    await uploadApi.login('admin', 'password');

    let uploadId = study.uploadId;
    let uploadToken = study.uploadToken; // Need to ensure this exists in schema
    let chunkSize = 1024 * 1024; // Default 1MB

    // 2. Initialize or Resume Session
    if (uploadId && uploadToken) {
      // RESUME PATH
      try {
        const status = await uploadApi.getUploadStatus(uploadId, uploadToken);
        chunkSize = 1024 * 1024; // Assuming default or we could store it too

        // Sync local state with remote state
        if (status.files) {
          const files = await db.files.where('studyId').equals(studyId).toArray();
          for (const file of files) {
            const remoteFile = status.files[String(file.id)]; // We used local ID as file ref in API
            if (remoteFile && remoteFile.received_chunks) {
              // Merge remote chunks into local
              const newChunks = new Set([...file.uploadedChunks, ...remoteFile.received_chunks]);
              file.uploadedChunks = Array.from(newChunks);
              await db.files.update(file.id!, { uploadedChunks: file.uploadedChunks });
            }
          }
        }
      } catch (e) {
        console.warn('Failed to resume session, might be expired. Creating new one...', e);
        // Fallback to init if 404/403
        uploadId = undefined;
      }
    }

    if (!uploadId) {
      // INIT PATH
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
      uploadId = initResponse.upload_id;
      uploadToken = initResponse.upload_token;
      chunkSize = initResponse.chunk_size;

      await db.studies.update(studyId, {
        status: 'uploading',
        uploadId: uploadId,
        uploadToken: uploadToken,
      });
    }

    // 3. Process Files
    const files = await db.files.where('studyId').equals(studyId).toArray();

    for (const file of files) {
      // Chunking logic
      const totalChunks = Math.ceil(file.size / chunkSize);

      for (let i = 0; i < totalChunks; i++) {
        // Check local state first (fastest)
        if (file.uploadedChunks.includes(i)) continue;

        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, file.size);

        let chunkBlob: Blob;
        if (file.blob instanceof Blob) {
          chunkBlob = file.blob.slice(start, end);
        } else {
          // Fallback: If it's ArrayBuffer or ArrayBufferView (from IndexedDB),
          // new Blob([value]) handles it correctly.
          try {
            const tempBlob = new Blob([file.blob as BlobPart]);
            chunkBlob = tempBlob.slice(start, end);
          } catch (e) {
            console.error('Failed to convert stored file content to Blob:', e);
            throw new Error(`File content for ${file.fileName} could not be processed`);
          }
        }

        try {
          // Upload chunk
          await uploadApi.uploadChunk(
            uploadId!,
            String(file.id), // Use local file ID as file ref
            i,
            chunkBlob,
            uploadToken!,
          );

          // Update local progress
          file.uploadedChunks.push(i);
          await db.files.update(file.id!, { uploadedChunks: file.uploadedChunks });
        } catch (e: unknown) {
          // If manual idempotency needed? Backend handles it with 204 or 200 "exists"
          // If network error, we just throw/stop. The manager loop stops.
          // User can click "Retry" which calls startUpload again -> hits Resume path.
          console.error(`Chunk upload failed for file ${file.fileName} chunk ${i}`, e);
          throw e; // Stop the process so UI shows error/can retry
        }
      }
    }

    // 4. Complete
    await uploadApi.completeUpload(uploadId!, uploadToken!);
    await db.studies.update(studyId, { status: 'complete' });

    // CRITICAL: Cleanup files from local storage to prevent PHI persistence
    await db.files.where('studyId').equals(studyId).delete();
  }
}

export const uploadManager = UploadManagerService.getInstance();
