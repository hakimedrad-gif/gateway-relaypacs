import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UploadStudy } from '../pages/UploadStudy';
import { MemoryRouter } from 'react-router-dom';
import { uploadManager } from '../services/uploadManager';
import React from 'react';

// Mock uploadManager
vi.mock('../services/uploadManager', () => ({
  uploadManager: {
    createStudy: vi.fn(),
  },
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('UploadStudy Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly', () => {
    render(React.createElement(MemoryRouter, null, React.createElement(UploadStudy)));

    expect(screen.getByText(/Upload Study/i)).toBeDefined();
    expect(screen.getByText(/Click to upload/i)).toBeDefined();
    expect(screen.getByLabelText(/Upload DICOM files/i)).toBeDefined();
  });

  it('shows error for invalid files', async () => {
    render(React.createElement(MemoryRouter, null, React.createElement(UploadStudy)));

    const input = screen.getByLabelText(/Upload DICOM files/i) as HTMLInputElement;
    const invalidFile = new File(['foo'], 'test.exe', { type: 'application/x-msdownload' });

    fireEvent.change(input, { target: { files: [invalidFile] } });

    expect(await screen.findByText(/Some files are not supported/i)).toBeDefined();
  });

  it('calls uploadManager and navigates on successful file selection', async () => {
    (uploadManager.createStudy as vi.Mock).mockResolvedValue('mock-study-id');

    render(React.createElement(MemoryRouter, null, React.createElement(UploadStudy)));

    const input = screen.getByLabelText(/Upload DICOM files/i) as HTMLInputElement;
    const validFile = new File(['fake-dicom'], 'test.dcm', { type: 'application/dicom' });

    Object.defineProperty(input, 'files', {
      value: [validFile],
    });

    fireEvent.change(input);

    await waitFor(() => {
      expect(uploadManager.createStudy).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/metadata/mock-study-id');
    });
  });

  it('displays error if upload creation fails', async () => {
    (uploadManager.createStudy as vi.Mock).mockRejectedValue(new Error('Failed'));

    render(React.createElement(MemoryRouter, null, React.createElement(UploadStudy)));

    const input = screen.getByLabelText(/Upload DICOM files/i) as HTMLInputElement;
    const validFile = new File(['fake-dicom'], 'test.dcm', { type: 'application/dicom' });

    Object.defineProperty(input, 'files', {
      value: [validFile],
    });

    fireEvent.change(input);

    expect(await screen.findByText(/Failed to start upload/i)).toBeDefined();
  });
});
