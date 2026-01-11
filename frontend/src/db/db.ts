import { Dexie } from 'dexie';
import type { Table } from 'dexie';

// Define interfaces for our data models
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
  createdAt: Date;
  lastSyncAttempt?: Date;
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

// Database class
export class RelayPACSDB extends Dexie {
  studies!: Table<Study, number>;
  files!: Table<FileRecord, number>;
  chunks!: Table<ChunkRecord, number>;

  constructor() {
    super('RelayPACSDB');
    this.version(1).stores({
      studies: '++id, status, createdAt',
      files: '++id, studyId, fileName',
      chunks: '++id, fileId, [fileId+index]',
    });
  }
}

export const db = new RelayPACSDB();
