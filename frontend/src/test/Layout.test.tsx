import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { Layout } from '../components/Layout';
import { MemoryRouter } from 'react-router-dom';
import * as useNetworkStatusHook from '../hooks/useNetworkStatus';
import * as useAuthHook from '../hooks/useAuth';
import React from 'react';

// Mock hooks
vi.mock('../hooks/useNetworkStatus', () => ({
  useNetworkStatus: vi.fn(),
}));

vi.mock('../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock components that might be complex
vi.mock('../components/NetworkStatus', () => ({
  NetworkStatus: () => React.createElement('div', { 'data-testid': 'network-status' }),
}));
vi.mock('../components/PWAInstallPrompt', () => ({
  PWAInstallPrompt: () => React.createElement('div', { 'data-testid': 'pwa-prompt' }),
}));
vi.mock('../components/notifications/NotificationBell', () => ({
  __esModule: true,
  default: () => React.createElement('div', { 'data-testid': 'notification-bell' }),
}));
vi.mock('../components/SkipNavigation', () => ({
  SkipNavigation: ({ mainContentId }: { mainContentId: string }) =>
    React.createElement('div', { 'data-testid': 'skip-nav', id: mainContentId }),
}));
vi.mock('../hooks/usePWAAppBadge', () => ({
  usePWAAppBadge: vi.fn(),
}));

describe('Layout Component', () => {
  const logoutMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useNetworkStatusHook.useNetworkStatus as Mock).mockReturnValue(true);
    (useAuthHook.useAuth as Mock).mockReturnValue({ logout: logoutMock });
  });

  it('renders the layout correctly including header and main content', () => {
    render(
      <MemoryRouter>
        <Layout />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: /RelayPACS/i })).toBeDefined();
    expect(screen.getByRole('main')).toBeDefined();
    expect(screen.getByTestId('notification-bell')).toBeDefined();
  });

  it('navigates to dashboard when dashboard button is clicked', () => {
    render(
      <MemoryRouter>
        <Layout />
      </MemoryRouter>,
    );

    const dashboardButtons = screen.getAllByText(/DASHBOARD/i);
    fireEvent.click(dashboardButtons[0]);
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });

  it('calls logout and navigates to login when logout button is clicked', () => {
    render(
      <MemoryRouter>
        <Layout />
      </MemoryRouter>,
    );

    const logoutButton = screen.getByTitle('Logout');
    fireEvent.click(logoutButton);

    expect(logoutMock).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  it('displays online status when useNetworkStatus returns true', () => {
    (useNetworkStatusHook.useNetworkStatus as Mock).mockReturnValue(true);

    render(
      <MemoryRouter>
        <Layout />
      </MemoryRouter>,
    );

    expect(screen.getByText('ONLINE')).toBeDefined();
  });

  it('displays offline status when useNetworkStatus returns false', () => {
    (useNetworkStatusHook.useNetworkStatus as Mock).mockReturnValue(false);

    render(
      <MemoryRouter>
        <Layout />
      </MemoryRouter>,
    );

    expect(screen.getByText('OFFLINE')).toBeDefined();
  });
});
