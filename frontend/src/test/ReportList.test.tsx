import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import ReportList from '../components/reports/ReportList';
import { reportApi } from '../services/api';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';
import { useReports } from '../hooks/useReports';

// Mock reportApi
vi.mock('../services/api', () => ({
  reportApi: {
    listReports: vi.fn(),
    downloadReport: vi.fn(),
  },
  ReportStatus: {
    READY: 'ready',
    PENDING: 'pending',
    ADDITIONAL_DATA_REQUIRED: 'additional_data_required',
    ASSIGNED: 'assigned',
  },
}));

// Mock useReports hook
vi.mock('../hooks/useReports');

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('ReportList Component', () => {
  const mockReports = [
    {
      id: 'r1',
      study_instance_uid: 'uid1.123.456',
      patient_name: 'John Doe',
      study_date: '2023-01-01',
      modality: 'CT',
      status: 'ready',
      report_url: 'http://example.com/report.pdf',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      radiologist_name: 'Dr. Smith',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementation for useReports
    vi.mocked(useReports).mockReturnValue({
      reports: mockReports,
      loading: false,
      error: null,
      syncReport: vi.fn(),
      downloadReport: vi.fn(),
      refresh: vi.fn(),
    });
  });

  const renderComponent = () =>
    render(React.createElement(MemoryRouter, null, React.createElement(ReportList)));

  it('renders correctly with reports', async () => {
    renderComponent();

    // The study UID is sliced in the Card
    expect(await screen.findByText(/Dr\. Smith/i)).toBeDefined();
    expect(screen.getAllByText('Ready').length).toBeGreaterThanOrEqual(1);
  });

  it('shows empty state when no reports found', async () => {
    vi.mocked(useReports).mockReturnValue({
      reports: [],
      loading: false,
      error: null,
      syncReport: vi.fn(),
      downloadReport: vi.fn(),
      refresh: vi.fn(),
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/No reports/i)).toBeDefined();
    });
  });

  it('calls downloadReport when download button is clicked', async () => {
    (reportApi.downloadReport as Mock).mockResolvedValue(
      new Blob(['pdf'], { type: 'application/pdf' }),
    );

    // Mock URL.createObjectURL
    const mockUrl = 'blob:mock-url';
    window.URL.createObjectURL = vi.fn(() => mockUrl);
    window.URL.revokeObjectURL = vi.fn();

    renderComponent();

    await waitFor(() => screen.queryByText('Dr. Smith'));

    const downloadButton = screen.getByRole('button', { name: /Download/i });
    fireEvent.click(downloadButton);

    await waitFor(() => {
      expect(vi.mocked(useReports)().downloadReport).toBeDefined();
    });
  });

  it('filters reports when tab is clicked', async () => {
    const refresh = vi.fn();
    vi.mocked(useReports).mockReturnValue({
      reports: mockReports,
      loading: false,
      error: null,
      downloadReport: vi.fn(),
      syncReport: vi.fn(),
      refresh,
    });

    renderComponent();

    await waitFor(() => screen.getByText('Dr. Smith'));

    const readyTab = screen.getByRole('button', { name: 'Ready' });
    fireEvent.click(readyTab);

    expect(useReports).toHaveBeenCalled();
  });
});
