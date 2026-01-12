import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import ReportCard from '../ReportCard';
import ReportList from '../ReportList';
import { ReportStatus, reportApi } from '../../../services/api';
import '@testing-library/jest-dom';

// Mock reportApi
vi.mock('../../../services/api', () => ({
  reportApi: {
    listReports: vi.fn(),
    downloadReport: vi.fn(),
  },
  ReportStatus: {
    ASSIGNED: 'assigned',
    PENDING: 'pending',
    READY: 'ready',
    ADDITIONAL_DATA_REQUIRED: 'additional_data_required',
  },
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

// Mock browser APIs
global.URL.createObjectURL = vi.fn(() => 'mock-url');
global.URL.revokeObjectURL = vi.fn();

describe('ReportCard', () => {
  const mockReport = {
    id: 'rep1',
    upload_id: 'up1',
    study_instance_uid: '1.2.3.4.5.6.7.8.9',
    status: 'ready',
    radiologist_name: 'Dr. House',
    report_url: 'http://example.com/report.pdf',
    user_id: 'user1',
    created_at: '2023-01-01T12:00:00Z',
    updated_at: '2023-01-01T13:00:00Z',
  };

  it('renders report details correctly', () => {
    render(<ReportCard report={mockReport as any} onView={() => {}} onDownload={() => {}} />);

    expect(screen.getByText(/Study: 1.2.3.4.5.6.7.8.9/)).toBeInTheDocument();
    expect(screen.getByText('Ready')).toBeInTheDocument();
    expect(screen.getByText(/Dr. House/)).toBeInTheDocument();
  });

  it('calls onView when View button is clicked', () => {
    const mockView = vi.fn();
    render(<ReportCard report={mockReport as any} onView={mockView} onDownload={() => {}} />);

    fireEvent.click(screen.getByText('View'));
    expect(mockView).toHaveBeenCalledWith('rep1');
  });

  it('disables download button if status is not ready', () => {
    const pendingReport = { ...mockReport, status: 'pending' };
    render(<ReportCard report={pendingReport as any} onView={() => {}} onDownload={() => {}} />);

    const downloadBtn = screen.getByText('Download');
    expect(downloadBtn).toBeDisabled();
  });
});

describe('ReportList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state initially', async () => {
    (reportApi.listReports as any).mockReturnValue(new Promise(() => {})); // Never resolves
    render(<ReportList />);

    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders list of reports when loaded', async () => {
    const reports = [
      {
        id: '1',
        study_instance_uid: 'uid1',
        status: 'ready',
        created_at: '2023-01-01',
        updated_at: '2023-01-01',
      },
      {
        id: '2',
        study_instance_uid: 'uid2',
        status: 'pending',
        created_at: '2023-01-02',
        updated_at: '2023-01-02',
      },
    ];
    (reportApi.listReports as any).mockResolvedValue({ reports, total: 2 });

    render(<ReportList />);

    await waitFor(() => {
      expect(screen.getByText(/Study: uid1/)).toBeInTheDocument();
      expect(screen.getByText(/Study: uid2/)).toBeInTheDocument();
    });
  });

  it('shows empty state when no reports found', async () => {
    (reportApi.listReports as any).mockResolvedValue({ reports: [], total: 0 });

    render(<ReportList />);

    await waitFor(() => {
      expect(screen.getByText('No reports')).toBeInTheDocument();
    });
  });

  it('filters reports when tab is clicked', async () => {
    (reportApi.listReports as any).mockResolvedValue({ reports: [], total: 0 });

    render(<ReportList />);

    const readyTab = await screen.findByText('Ready');
    await act(async () => {
      fireEvent.click(readyTab);
    });

    expect(reportApi.listReports).toHaveBeenCalledWith('ready');
  });
});
