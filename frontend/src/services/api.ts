import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8003';

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

export const uploadApi = {
  login: async (
    username: string,
    password: string,
    totpCode?: string,
  ): Promise<{ access_token: string; refresh_token?: string }> => {
    const response = await api.post('/auth/login', { username, password, totp_code: totpCode });
    return response.data;
  },

  initUpload: async (
    metadata: StudyMetadata,
    totalFiles: number,
    totalSize: number,
    clinicalHistory?: string,
  ): Promise<UploadInitResponse> => {
    const response = await api.post('/upload/init', {
      study_metadata: metadata,
      total_files: totalFiles,
      total_size_bytes: totalSize,
      clinical_history: clinicalHistory,
    });
    return response.data;
  },

  getUploadStatus: async (uploadId: string, token: string): Promise<UploadStatusResponse> => {
    const response = await api.get(`/upload/${uploadId}/status`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  uploadChunk: async (
    uploadId: string,
    fileId: string,
    chunkIndex: number,
    blob: Blob,
    token: string,
    onProgress?: (progress: number) => void,
  ): Promise<ChunkUploadResponse> => {
    // Note: We use a separate axios instance or config for chunks to inject the SCOPED token
    const response = await axios.put(`${API_URL}/upload/${uploadId}/chunk`, blob, {
      headers: {
        Authorization: `Bearer ${token}`,
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
    });
    return response.data;
  },

  completeUpload: async (uploadId: string, token: string) => {
    const response = await axios.post(
      `${API_URL}/upload/${uploadId}/complete`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );
    return response.data;
  },

  getStats: async (period?: string): Promise<UploadStats> => {
    const response = await api.get('/upload/stats', { params: { period } });
    return response.data;
  },

  getTrendData: async (
    period: string = '7d',
  ): Promise<{
    period: string;
    data: Array<{ date: string; count: number }>;
    summary: UploadStats;
  }> => {
    const response = await api.get('/upload/stats/trend', { params: { period } });
    return response.data;
  },

  exportStatsCSV: async (period?: string): Promise<Blob> => {
    const response = await api.get('/upload/stats/export', {
      params: { period },
      responseType: 'blob',
    });
    return response.data;
  },
};

export const totpApi = {
  setup: async (): Promise<{ secret: string; qr_code: string; provisioning_uri: string }> => {
    const response = await api.post('/api/v1/auth/2fa/setup');
    return response.data;
  },

  enable: async (code: string, secret: string): Promise<{ success: boolean; enabled: boolean }> => {
    const response = await api.post('/api/v1/auth/2fa/enable', { code, secret });
    return response.data;
  },

  disable: async (): Promise<{ success: boolean; enabled: boolean }> => {
    const response = await api.post('/api/v1/auth/2fa/disable');
    return response.data;
  },
};

// Report types
export const ReportStatus = {
  ASSIGNED: 'assigned',
  PENDING: 'pending',
  READY: 'ready',
  ADDITIONAL_DATA_REQUIRED: 'additional_data_required',
} as const;
export type ReportStatus = (typeof ReportStatus)[keyof typeof ReportStatus];

export interface Report {
  id: string;
  upload_id: string;
  study_instance_uid: string;
  status: ReportStatus;
  radiologist_name?: string;
  report_text?: string;
  report_url?: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface ReportListResponse {
  reports: Report[];
  total: number;
}

// Notification types
export const NotificationType = {
  UPLOAD_COMPLETE: 'upload_complete',
  UPLOAD_FAILED: 'upload_failed',
  REPORT_ASSIGNED: 'report_assigned',
  REPORT_READY: 'report_ready',
  ADDITIONAL_DATA_REQUIRED: 'additional_data_required',
} as const;
export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];

export interface Notification {
  id: string;
  user_id: string;
  notification_type: NotificationType;
  title: string;
  message: string;
  related_upload_id?: string;
  related_report_id?: string;
  is_read: boolean;
  created_at: string;
}

export interface NotificationListResponse {
  notifications: Notification[];
  unread_count: number;
  total: number;
}

// Reports API
export const reportApi = {
  listReports: async (
    status?: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<ReportListResponse> => {
    const response = await api.get('/reports/', {
      params: { status, limit, offset },
    });
    return response.data;
  },

  getReport: async (reportId: string): Promise<Report> => {
    const response = await api.get(`/reports/${reportId}`);
    return response.data;
  },

  getReportByUpload: async (uploadId: string): Promise<Report | null> => {
    const response = await api.get(`/reports/upload/${uploadId}`);
    return response.data;
  },

  downloadReport: async (reportId: string): Promise<Blob> => {
    const response = await api.get(`/reports/${reportId}/download`, {
      responseType: 'blob',
    });
    return response.data;
  },

  syncReport: async (reportId: string): Promise<Report> => {
    const response = await api.post(`/reports/${reportId}/sync`);
    return response.data;
  },
};

// Notifications API
export const notificationApi = {
  listNotifications: async (
    limit: number = 50,
    offset: number = 0,
    unreadOnly: boolean = false,
  ): Promise<NotificationListResponse> => {
    const response = await api.get('/notifications/', {
      params: { limit, offset, unread_only: unreadOnly },
    });
    return response.data;
  },

  markAsRead: async (notificationId: string): Promise<void> => {
    await api.patch(`/notifications/${notificationId}/read`);
  },

  markAllAsRead: async (): Promise<{ count: number }> => {
    const response = await api.patch('/notifications/read-all');
    return response.data;
  },

  /**
   * Connect to Server-Sent Events (SSE) stream for real-time notifications
   * @param onNotification Callback when a new notification arrives
   * @param onUnreadCount Callback when unread count is received
   * @returns EventSource instance
   */
  connectSSE: (
    onNotification: (notification: Notification) => void,
    onUnreadCount?: (count: number) => void,
  ): EventSource => {
    // Get auth token from api defaults
    const token = api.defaults.headers.common['Authorization']?.toString().replace('Bearer ', '');

    if (!token) {
      throw new Error('No auth token available for SSE connection');
    }

    // EventSource doesn't support headers, so we pass token as query param
    const eventSource = new EventSource(`${API_URL}/notifications/stream?token=${token}`);

    eventSource.addEventListener('notification', (event) => {
      const data = JSON.parse(event.data);
      onNotification(data as Notification);
    });

    eventSource.addEventListener('unread_count', (event) => {
      const data = JSON.parse(event.data);
      if (onUnreadCount) {
        onUnreadCount(data.count);
      }
    });

    eventSource.addEventListener('connected', (event) => {
      console.log('SSE connected:', event.data);
    });

    eventSource.addEventListener('heartbeat', () => {
      // Keep-alive heartbeat, no action needed
    });

    eventSource.onerror = (error) => {
      console.error('SSE connection error:', error);
      // EventSource will automatically reconnect
    };

    return eventSource;
  },
};
