// Database and IndexedDB-related types
// Extracted from src/db/db.ts

export interface StudyMetadata {
  patientName: string;
  studyDate: string;
  modality: string;
  age?: string;
  gender?: string;
  serviceLevel?: string;
  studyDescription?: string;
  clinicalHistory?: string;
}

export interface Study {
  id?: number;
  uploadId?: string; // UUID from backend
  uploadToken?: string; // Scoped token for resume
  status: 'queued' | 'uploading' | 'complete' | 'failed';
  metadata: StudyMetadata;
  clinicalNotes?: string;
  totalFiles: number;
  totalSize: number;
  progress?: number; // Percent completed
  createdAt: Date;
  lastSyncAttempt?: Date;
  chunkSize?: number; // Size of chunks for this upload session
}

export interface FileRecord {
  id?: number;
  studyId: number;
  fileName: string;
  fileType: string;
  size: number;
  blob: Blob | ArrayBuffer; // Store file content
  uploadedChunks: number[]; // Indices of uploaded chunks
}

export interface ChunkRecord {
  id?: number;
  fileId: number;
  index: number;
  uploaded: boolean;
}

export interface CacheMetadata {
  id?: number;
  resourceUrl: string;
  cacheKey: string;
  size: number;
  lastAccessed: Date;
  priority: number; // Higher = keep longer
}

export interface SyncQueueItem {
  id?: number;
  action: 'upload_init' | 'upload_chunk' | 'upload_complete' | 'notification_read';
  payload: any;
  createdAt: Date;
  attempts: number;
  lastAttempt?: Date;
  lastError?: string;
  status: 'pending' | 'processing' | 'failed' | 'completed';
}
