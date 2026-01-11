import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const setAuthToken = (token: string) => {
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
};

export const clearAuthToken = () => {
  delete api.defaults.headers.common['Authorization'];
};

// Types corresponding to backend models
export interface StudyMetadata {
  patient_name?: string;
  study_date?: string;
  modality?: string;
  study_description?: string;
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
  files: Record<string, {
    received_chunks: number[];
    complete: boolean;
  }>;
}

export const uploadApi = {
  login: async (username: string, password: string): Promise<{ access_token: string }> => {
    const response = await api.post('/auth/login', { username, password });
    return response.data;
  },

  initUpload: async (
    metadata: StudyMetadata, 
    totalFiles: number, 
    totalSize: number
  ): Promise<UploadInitResponse> => {
    const response = await api.post('/upload/init', {
      study_metadata: metadata,
      total_files: totalFiles,
      total_size_bytes: totalSize,
    });
    return response.data;
  },

  getUploadStatus: async (uploadId: string, token: string): Promise<UploadStatusResponse> => {
    const response = await api.get(`/upload/${uploadId}/status`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.data;
  },

  uploadChunk: async (
    uploadId: string,
    fileId: string,
    chunkIndex: number,
    blob: Blob,
    token: string,
    onProgress?: (progress: number) => void
  ): Promise<ChunkUploadResponse> => {
    // Note: We use a separate axios instance or config for chunks to inject the SCOPED token
    const response = await axios.put(
      `${API_URL}/upload/${uploadId}/chunk`,
      blob,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/octet-stream',
        },
        params: {
          chunk_index: chunkIndex,
          file_id: fileId,
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total && onProgress) {
            onProgress((progressEvent.loaded / progressEvent.total) * 100);
          }
        },
      }
    );
    return response.data;
  },

  completeUpload: async (uploadId: string, token: string) => {
    const response = await axios.post(
      `${API_URL}/upload/${uploadId}/complete`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );
    return response.data;
  }
};
