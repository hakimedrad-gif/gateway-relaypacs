import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { MetadataConfirmation } from '../pages/MetadataConfirmation';
import { uploadManager } from '../services/uploadManager';
import { useLiveQuery } from 'dexie-react-hooks';
import React from 'react';

// Mock dexie-react-hooks
vi.mock('dexie-react-hooks', () => ({
  useLiveQuery: vi.fn(),
}));

// Mock uploadManager
vi.mock('../services/uploadManager', () => ({
  uploadManager: {
    startUpload: vi.fn(),
  },
}));

// Mock db
vi.mock('../db/db', () => ({
  db: {
    studies: {
      get: vi.fn(),
      update: vi.fn(),
    },
  },
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ studyId: '1' }),
  };
});

describe('MetadataConfirmation Page', () => {
  const mockStudy = {
    id: 1,
    metadata: {
      patientName: 'JOHN DOE',
      studyDate: '2023-01-01',
      modality: 'CT',
      age: '',
      gender: '',
      studyDescription: '',
      clinicalHistory: '',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state when study is not found', () => {
    (useLiveQuery as Mock).mockReturnValue(null);
    render(React.createElement(MetadataConfirmation));
    expect(screen.getByText(/Loading/i)).toBeDefined();
  });

  it('renders correctly with study data', () => {
    (useLiveQuery as Mock).mockReturnValue(mockStudy);
    render(React.createElement(MetadataConfirmation));

    expect(screen.getByDisplayValue('JOHN DOE')).toBeDefined();
    expect(screen.getByDisplayValue('CT')).toBeDefined();
  });

  it('shows error for invalid age format', async () => {
    (useLiveQuery as Mock).mockReturnValue(mockStudy);
    render(React.createElement(MetadataConfirmation));

    const ageInput = screen.getByLabelText(/Age/i);
    fireEvent.change(ageInput, { target: { value: 'invalid' } });

    expect(await screen.findByText(/Age format: e.g., 45Y/i)).toBeDefined();
  });

  it('enables confirm button when all required fields are valid', async () => {
    (useLiveQuery as Mock).mockReturnValue(mockStudy);
    render(React.createElement(MetadataConfirmation));

    const ageInput = screen.getByLabelText(/Age/i);
    const genderSelect = screen.getByLabelText(/Gender/i);
    const historyInput = screen.getByLabelText(/Clinical History/i);

    fireEvent.change(ageInput, { target: { value: '45Y' } });
    fireEvent.change(genderSelect, { target: { value: 'M' } });
    fireEvent.change(historyInput, { target: { value: 'Test history' } });

    const confirmButton = screen.getByRole('button', { name: /Confirm & Upload/i });
    expect(confirmButton).not.toBeDisabled();

    fireEvent.click(confirmButton);
    await waitFor(() => {
      expect(uploadManager.startUpload).toHaveBeenCalledWith(1);
    });
  });

  it('calls startUpload and navigates on success', async () => {
    (useLiveQuery as Mock).mockReturnValue(mockStudy);
    (uploadManager.startUpload as Mock).mockResolvedValue(undefined);

    render(React.createElement(MetadataConfirmation));

    // Fill the form to enable the button
    fireEvent.change(screen.getByLabelText(/Age/i), { target: { value: '45Y' } });
    fireEvent.change(screen.getByLabelText(/Gender/i), { target: { value: 'M' } });
    fireEvent.change(screen.getByLabelText(/Clinical History/i), { target: { value: 'History' } });

    fireEvent.click(screen.getByRole('button', { name: /Confirm & Upload/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/progress/1');
    });
  });
});
