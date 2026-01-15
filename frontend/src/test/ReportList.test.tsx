import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import ReportList from '../components/reports/ReportList';
import { reportApi } from '../services/api';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

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
    // Default mock response
    (reportApi.listReports as Mock).mockResolvedValue({
      reports: mockReports,
      total: 1,
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
    (reportApi.listReports as Mock).mockResolvedValue({
      reports: [],
      total: 0,
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

    await waitFor(() => screen.getByText('Ready'));

    const downloadButton = screen.getByRole('button', { name: /Download/i });
    fireEvent.click(downloadButton);

    await waitFor(() => {
      expect(reportApi.downloadReport).toHaveBeenCalledWith('r1');
    });
  });

  it('filters reports when tab is clicked', async () => {
    renderComponent();

    await waitFor(() => screen.getByText('Ready'));

    const readyTab = screen.getByRole('button', { name: 'Ready' });
    fireEvent.click(readyTab);

    expect(reportApi.listReports).toHaveBeenCalledWith('ready');
  });
});
