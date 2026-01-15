import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UploadProgress } from '../pages/UploadProgress';
import { useLiveQuery } from 'dexie-react-hooks';
import React from 'react';

// Mock dexie-react-hooks
vi.mock('dexie-react-hooks', () => ({
  useLiveQuery: vi.fn(),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ uploadId: '1' }),
  };
});

describe('UploadProgress Page', () => {
  const mockStudy = {
    id: 1,
    status: 'uploading',
    totalFiles: 2,
    totalSize: 2 * 1024 * 1024,
    metadata: {
      patientName: 'JOHN DOE',
      studyDate: '2023-01-01',
    },
  };

  const mockFiles = [
    {
      id: 101,
      fileName: 'image1.dcm',
      size: 1024 * 1024,
      uploadedChunks: [0], // 1MB chunk uploaded
    },
    {
      id: 102,
      fileName: 'image2.dcm',
      size: 1024 * 1024,
      uploadedChunks: [],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly with progress', () => {
    (useLiveQuery as vi.Mock).mockReturnValueOnce(mockStudy).mockReturnValueOnce(mockFiles);

    render(React.createElement(UploadProgress));

    expect(screen.getByText(/50% Synchronized/i)).toBeDefined();
    expect(screen.getByText('image1.dcm')).toBeDefined();
    expect(screen.getByText('image2.dcm')).toBeDefined();
  });

  it('displays verified status for completed files', () => {
    const completedFiles = [
      {
        id: 101,
        fileName: 'image1.dcm',
        size: 1024 * 1024,
        uploadedChunks: [0],
      },
    ];
    (useLiveQuery as vi.Mock).mockReturnValueOnce(mockStudy).mockReturnValueOnce(completedFiles);

    render(React.createElement(UploadProgress));
    expect(screen.getByText('VERIFIED')).toBeDefined();
  });

  it('displays success message when study status is complete', () => {
    (useLiveQuery as vi.Mock)
      .mockReturnValueOnce({ ...mockStudy, status: 'complete' })
      .mockReturnValueOnce(mockFiles);

    render(React.createElement(UploadProgress));
    expect(screen.getByText(/Upload Successful/i)).toBeDefined();
  });

  it('displays error/retry state when study status is failed', () => {
    (useLiveQuery as vi.Mock)
      .mockReturnValueOnce({ ...mockStudy, status: 'failed' })
      .mockReturnValueOnce(mockFiles);

    render(React.createElement(UploadProgress));
    expect(screen.getByText(/Retrying Connection.../i)).toBeDefined();
  });
});
