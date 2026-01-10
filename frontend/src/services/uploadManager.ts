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
        studyDescription: metadata.study_description || ''
      },
      totalFiles: files.length,
      totalSize: totalSize,
      createdAt: new Date()
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
        blob: arrayBuffer as any, // Storing as ArrayBuffer
        uploadedChunks: []
      });
    }

    return Number(studyId);
  }

  async startUpload(studyId: number) {
    const study = await db.studies.get(studyId);
    if (!study) throw new Error('Study not found');
    
    // 1. Authenticate (Auto-login for MVP)
    await uploadApi.login("admin", "password");
    
    // 2. Initialize Session
    const initResponse = await uploadApi.initUpload(
      {
        patient_name: study.metadata.patientName,
        study_date: study.metadata.studyDate,
        modality: study.metadata.modality
      },
      study.totalFiles,
      study.totalSize
    );
    
    // Update study with remote ID
    await db.studies.update(studyId, { 
      status: 'uploading',
      uploadId: initResponse.upload_id 
    });

    // 3. Process Files
    const files = await db.files.where('studyId').equals(studyId).toArray();
    const chunkSize = initResponse.chunk_size;
    
    for (const file of files) {
      // Chunking logic
      const totalChunks = Math.ceil(file.size / chunkSize);
      
      for (let i = 0; i < totalChunks; i++) {
        if (file.uploadedChunks.includes(i)) continue; // Skip already uploaded
        
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, file.size);
        
        let chunkBlob: Blob;
        if (typeof file.blob.slice === 'function' && !(file.blob instanceof Uint8Array)) {
          chunkBlob = file.blob.slice(start, end);
        } else {
          // Fallback for environments where Blob might be stored as ArrayBuffer or Uint8Array (e.g. some test polyfills)
          const buffer = file.blob instanceof ArrayBuffer ? file.blob : 
                         file.blob instanceof Uint8Array ? file.blob.buffer :
                         (file.blob as any).buffer instanceof ArrayBuffer ? (file.blob as any).buffer : null;
          
          if (buffer) {
            const sliced = buffer.slice(start, end);
            chunkBlob = new Blob([sliced]);
          } else {
            console.error('Unsupported blob type:', typeof file.blob, file.blob);
            throw new Error(`File blob for ${file.fileName} is non-sliceable and not a recognized buffer type`);
          }
        }
        
        // Upload chunk
        await uploadApi.uploadChunk(
          initResponse.upload_id,
          String(file.id), // Use local file ID as file ref
          i,
          chunkBlob,
          initResponse.upload_token
        );
        
        // Update local progress
        file.uploadedChunks.push(i);
        await db.files.update(file.id!, { uploadedChunks: file.uploadedChunks });
      }
    }
    
    // 4. Complete
    await uploadApi.completeUpload(initResponse.upload_id, initResponse.upload_token);
    await db.studies.update(studyId, { status: 'complete' });
  }

}

export const uploadManager = UploadManagerService.getInstance();
