// API request/response types
// Extracted from src/services/api.ts

// Backend API study metadata (snake_case)
export interface APIStudyMetadata {
  patient_name?: string;
  study_date?: string;
  modality?: string;
  age?: string;
  gender?: string;
  service_level?: string;
  study_description?: string;
  clinical_history?: string;
}

export interface UploadInitResponse {
  upload_id: string;
  upload_token: string;
  chunk_size: number;
  expires_at: string;
}

export interface ChunkUploadResponse {
  upload_id: string;
  file_id: string;
  chunk_index: number;
  received_bytes: number;
}

export interface UploadStatusResponse {
  upload_id: string;
  progress_percent: number;
  uploaded_bytes: number;
  total_bytes: number;
  state: string;
  chunks_received: number;
  chunks_total: number;
  pacs_status: string;
  files: Record<
    string,
    {
      received_chunks: number[];
      complete: boolean;
    }
  >;
}

export interface UploadStats {
  modality: Record<string, number>;
  service_level: Record<string, number>;
  total_uploads: number;
  failed_uploads: number;
  last_updated: string | null;
}

export interface TrendDataResponse {
  period: string;
  data: Array<{ date: string; count: number }>;
  summary: UploadStats;
}

export interface RefreshTokenResponse {
  upload_token: string;
}
