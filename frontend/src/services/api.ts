import axios from 'axios';
import type {
  APIStudyMetadata as StudyMetadata,
  UploadInitResponse,
  ChunkUploadResponse,
  UploadStatusResponse,
  UploadStats,
  TrendDataResponse,
  RefreshTokenResponse,
} from '../types/upload';
import type {
  Report,
  ReportStatusUpdate,
  ReportListResponse,
} from '../types/reports';
import type {
  Notification,
  NotificationListResponse,
} from '../types/notifications';
import type { LoginResponse, TOTPSetupResponse, TOTPResponse } from '../types/auth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8003';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auto-hydrate token from storage on load
const savedToken = sessionStorage.getItem('relaypacs_auth_token');
if (savedToken) {
  api.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
}

export const setAuthToken = (token: string) => {
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
};

export const clearAuthToken = () => {
  delete api.defaults.headers.common['Authorization'];
};

// -- API Response Time Monitoring --
import { logCustomMetric } from '../utils/rum';

// Add request interceptor to mark start time
api.interceptors.request.use((config) => {
  (config as any).metadata = { startTime: Date.now() };
  return config;
});

// Add response interceptor to measure duration
api.interceptors.response.use(
  (response) => {
    const metadata = (response.config as any).metadata;
    if (metadata) {
      const duration = Date.now() - metadata.startTime;
      const url = response.config.url?.split('?')[0] || 'unknown';

      // Log measurement
      logCustomMetric({
        name: 'API_Response_Time',
        value: duration,
        rating: duration < 500 ? 'good' : duration < 1500 ? 'needs-improvement' : 'poor',
        context: {
          url,
          method: response.config.method?.toUpperCase(),
          status: response.status,
          api_endpoint: getEndpointName(url),
        },
      });
    }
    return response;
  },
  (error) => {
    // Log failed requests too
    if (error.config && error.config.metadata) {
      const duration = Date.now() - error.config.metadata.startTime;
      const url = error.config.url?.split('?')[0] || 'unknown';

      logCustomMetric({
        name: 'API_Error',
        value: duration,
        rating: 'poor',
        context: {
          url,
          method: error.config.method?.toUpperCase(),
          status: error.response?.status || 0,
          error: error.message,
        },
      });
    }
    return Promise.reject(error);
  },
);

// Helper to group URLs (e.g., /upload/123/chunk -> /upload/:id/chunk)
function getEndpointName(url: string): string {
  // Simple heuristics for common patterns
  let endpoint = url
    .replace(/\/upload\/[^/]+\/chunk/, '/upload/:id/chunk')
    .replace(/\/upload\/[^/]+\/status/, '/upload/:id/status')
    .replace(/\/upload\/[^/]+\/complete/, '/upload/:id/complete')
    .replace(/\/reports\/[^/]+\/download/, '/reports/:id/download')
    .replace(/\/reports\/[^/]+/, '/reports/:id');

  // Remove query params if any stayed
  if (endpoint.includes('?')) endpoint = endpoint.split('?')[0];

  return endpoint;
}

// Re-export type constants for convenience
export { ReportStatus } from '../types/reports';
export { NotificationType } from '../types/notifications';

// Re-export types
export type { StudyMetadata, Report, Notification };

export const uploadApi = {
  login: async (
    username: string,
    password: string,
    totpCode?: string,
  ): Promise<LoginResponse> => {
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

  refreshUploadToken: async (uploadId: string): Promise<RefreshTokenResponse> => {
    const response = await api.post('/auth/refresh-upload-token', null, {
      params: { upload_id: uploadId },
    });
    return response.data;
  },

  getStats: async (period?: string): Promise<UploadStats> => {
    const response = await api.get('/upload/stats', { params: { period } });
    return response.data;
  },

  getTrendData: async (
    period: string = '7d',
  ): Promise<TrendDataResponse> => {
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
  setup: async (): Promise<TOTPSetupResponse> => {
    const response = await api.post('/api/v1/auth/2fa/setup');
    return response.data;
  },

  enable: async (code: string, secret: string): Promise<TOTPResponse> => {
    const response = await api.post('/api/v1/auth/2fa/enable', { code, secret });
    return response.data;
  },

  disable: async (): Promise<TOTPResponse> => {
    const response = await api.post('/api/v1/auth/2fa/disable');
    return response.data;
  },
};



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

  updateReportStatus: async (uploadId: string, data: ReportStatusUpdate): Promise<Report> => {
    const response = await api.put<Report>(`/reports/upload/${uploadId}/status`, data);
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
