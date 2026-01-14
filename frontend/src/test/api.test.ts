import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { uploadApi } from '../services/api';

// Create the mock API instance objects using vi.hoisted to permit access in vi.mock
const { mockApiInstance } = vi.hoisted(() => {
  return {
    mockApiInstance: {
      post: vi.fn(),
      get: vi.fn(),
      put: vi.fn(),
      defaults: { headers: { common: {} } },
    },
  };
});

// Mock axios
vi.mock('axios', () => {
  return {
    default: {
      create: vi.fn(() => mockApiInstance),
      put: vi.fn(), // for uploadChunk direct usage (axios.put)
      post: vi.fn(), // for completeUpload direct usage (axios.post)
    },
  };
});

describe('uploadApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initUpload', () => {
    it('should call /upload/init with correct data', async () => {
      const mockResponse = { data: { upload_id: '123' } };
      mockApiInstance.post.mockResolvedValue(mockResponse);

      const metadata = { patient_name: 'Test' };
      const result = await uploadApi.initUpload(metadata, 1, 100);

      expect(mockApiInstance.post).toHaveBeenCalledWith('/upload/init', {
        study_metadata: metadata,
        total_files: 1,
        total_size_bytes: 100,
        clinical_history: undefined,
      });
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('getUploadStatus', () => {
    it('should call status endpoint with token', async () => {
      const mockResponse = { data: { state: 'uploading' } };
      mockApiInstance.get.mockResolvedValue(mockResponse);

      await uploadApi.getUploadStatus('uid', 'token');

      expect(mockApiInstance.get).toHaveBeenCalledWith('/upload/uid/status', {
        headers: { Authorization: 'Bearer token' },
      });
    });
  });

  describe('getStats', () => {
    it('should fetch stats with period param', async () => {
      const mockResponse = { data: { total_uploads: 10 } };
      mockApiInstance.get.mockResolvedValue(mockResponse);

      await uploadApi.getStats('7d');

      expect(mockApiInstance.get).toHaveBeenCalledWith('/upload/stats', {
        params: { period: '7d' },
      });
    });
  });
});
