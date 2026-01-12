import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import NotificationBell from '../NotificationBell';
import NotificationToast from '../NotificationToast';
import { useNotifications } from '../../../hooks/useNotifications';
import '@testing-library/jest-dom';

// Type definitions to help with mocking
interface MockNotification {
  id: string;
  user_id: string;
  notification_type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

// Mock useNotifications hook
vi.mock('../../../hooks/useNotifications', () => ({
  useNotifications: vi.fn(),
}));

// Mock useNavigate from react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

// Mock NotificationDropdown to simplify Bell tests
vi.mock('../NotificationDropdown', () => ({
  default: () => <div data-testid="notification-dropdown">Mock Dropdown</div>,
}));

describe('NotificationBell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly without notifications', () => {
    (useNotifications as any).mockReturnValue({
      unreadCount: 0,
      isConnected: true,
      notifications: [],
    });

    render(<NotificationBell />);

    expect(screen.getByLabelText('Notifications')).toBeInTheDocument();
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('shows badge when there are unread notifications', () => {
    (useNotifications as any).mockReturnValue({
      unreadCount: 5,
      isConnected: true,
      notifications: [],
    });

    render(<NotificationBell />);

    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('shows 99+ for large unread counts', () => {
    (useNotifications as any).mockReturnValue({
      unreadCount: 150,
      isConnected: true,
      notifications: [],
    });

    render(<NotificationBell />);

    expect(screen.getByText('99+')).toBeInTheDocument();
  });

  it('shows reconnection indicator when disconnected', () => {
    (useNotifications as any).mockReturnValue({
      unreadCount: 0,
      isConnected: false,
      notifications: [],
    });

    render(<NotificationBell />);

    expect(screen.getByTitle('Reconnecting...')).toBeInTheDocument();
  });

  it('toggles dropdown on click', () => {
    (useNotifications as any).mockReturnValue({
      unreadCount: 0,
      isConnected: true,
      notifications: [],
    });

    render(<NotificationBell />);

    const bellButton = screen.getByLabelText('Notifications');

    // Initial state: closed
    expect(screen.queryByTestId('notification-dropdown')).not.toBeInTheDocument();

    // Click: open
    fireEvent.click(bellButton);
    expect(screen.getByTestId('notification-dropdown')).toBeInTheDocument();

    // Click again: close
    fireEvent.click(bellButton);
    expect(screen.queryByTestId('notification-dropdown')).not.toBeInTheDocument();
  });
});

describe('NotificationToast', () => {
  const mockNotification: MockNotification = {
    id: '123',
    user_id: 'user1',
    notification_type: 'report_ready',
    title: 'Report Ready',
    message: 'Your radiology report is ready',
    is_read: false,
    created_at: new Date().toISOString(),
  };

  it('does not render when notification is null', () => {
    render(<NotificationToast notification={null} onDismiss={() => {}} />);
    expect(screen.queryByText('Report Ready')).not.toBeInTheDocument();
  });

  it('renders notification content', () => {
    render(<NotificationToast notification={mockNotification as any} onDismiss={() => {}} />);
    expect(screen.getByText('Report Ready')).toBeInTheDocument();
    expect(screen.getByText('Your radiology report is ready')).toBeInTheDocument();
  });

  it('calls onDismiss when close button is clicked', () => {
    vi.useFakeTimers();
    const mockDismiss = vi.fn();
    render(<NotificationToast notification={mockNotification as any} onDismiss={mockDismiss} />);

    const closeButton = screen.getByLabelText('Dismiss notification');
    fireEvent.click(closeButton);

    // Should call dismiss after animation timeout
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(mockDismiss).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('auto-dismisses after duration', () => {
    vi.useFakeTimers();
    const mockDismiss = vi.fn();
    render(
      <NotificationToast
        notification={mockNotification as any}
        onDismiss={mockDismiss}
        autoHideDuration={3000}
      />,
    );

    act(() => {
      vi.advanceTimersByTime(3300); // Duration + animation
    });

    expect(mockDismiss).toHaveBeenCalled();
    vi.useRealTimers();
  });
});
