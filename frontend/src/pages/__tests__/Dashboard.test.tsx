import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Dashboard } from '../Dashboard';

// Mock the API service
vi.mock('../../services/api', () => ({
  uploadApi: {
    getStats: vi.fn().mockResolvedValue({
      total_uploads: 150,
      successful_uploads: 145,
      failed_uploads: 5,
      modality: { ct: 80, mr: 45, cr: 25 },
      service_level: { routine: 100, emergency: 50 },
      last_updated: '2023-01-01T12:00:00Z',
    }),
    getTrendData: vi.fn().mockResolvedValue({ data: [] }),
    exportStatsCSV: vi.fn().mockResolvedValue(new Blob(['test'], { type: 'text/csv' })),
  },
}));

// Mock components that might cause issues in jsdom or need complex setup
vi.mock('../../components/TrendChart', () => ({
  TrendChart: () => <div data-testid="trend-chart" />,
}));

describe('Dashboard Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders dashboard header', async () => {
    render(<Dashboard />);

    expect(screen.getByText(/Analytics Dashboard/i)).toBeInTheDocument();
  });

  it('displays period filter buttons', () => {
    render(<Dashboard />);

    const periods = ['1W', '2W', '1M', '3M', '6M', 'ALL'];
    periods.forEach((p) => {
      expect(screen.getByText(p)).toBeInTheDocument();
    });
  });

  it('changes period filter on click', async () => {
    const { uploadApi } = await import('../../services/api');
    render(<Dashboard />);

    const monthButton = screen.getByText('1M');
    fireEvent.click(monthButton);

    expect(uploadApi.getStats).toHaveBeenCalledWith('1m');
  });

  it('renders export button', () => {
    render(<Dashboard />);

    expect(screen.getByText(/Export CSV/i)).toBeInTheDocument();
  });
});
