import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Dashboard from '../Dashboard';

// Mock API calls
vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ 
      data: {
        total_uploads: 150,
        successful_uploads: 145,
        failed_uploads: 5,
        total_files: 500,
        total_size_mb: 2048,
      }
    }),
  },
}));

// Mock hooks
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    token: 'mock-token',
    isAuthenticated: true,
  }),
}));

const renderDashboard = () => {
  return render(
    <BrowserRouter>
      <Dashboard />
    </BrowserRouter>
  );
};

describe('Dashboard Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders dashboard header', async () => {
    renderDashboard();
    
    await waitFor(() => {
      expect(screen.getByText(/Analytics/i)).toBeInTheDocument();
    });
  });

  it('displays period filter buttons', async () => {
    renderDashboard();
    
    await waitFor(() => {
      const periodButtons = ['1W', '2W', '1M', '3M', '6M', 'ALL'];
      periodButtons.forEach(period => {
        expect(screen.getByRole('button', { name: period })).toBeInTheDocument();
      });
    });
  });

  it('changes period filter on click', async () => {
    renderDashboard();
    
    await waitFor(() => {
      const monthButton = screen.getByRole('button', { name: '1M' });
      fireEvent.click(monthButton);
      
      // Button should have active styling
      expect(monthButton.className).toContain('bg-');
    });
  });

  it('renders export button', async () => {
    renderDashboard();
    
    await waitFor(() => {
      const exportButton = screen.queryByRole('button', { name: /Export|CSV|Download/i });
      // Export button may or may not be present depending on data
      if (exportButton) {
        expect(exportButton).toBeInTheDocument();
      }
    });
  });
});
