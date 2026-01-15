import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import Notifications from '../pages/Notifications';
import { useNotifications } from '../hooks/useNotifications';
import React from 'react';

// Mock useNotifications hook
vi.mock('../hooks/useNotifications', () => ({
  useNotifications: vi.fn(),
}));

describe('Notifications Page', () => {
  const mockNotifications = [
    {
      id: '1',
      notification_type: 'upload_complete',
      title: 'Upload Success',
      message: 'Files uploaded',
      is_read: false,
      created_at: new Date().toISOString(),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly with notifications', () => {
    (useNotifications as Mock).mockReturnValue({
      notifications: mockNotifications,
      markAsRead: vi.fn(),
      markAllAsRead: vi.fn(),
    });

    render(React.createElement(Notifications));

    expect(screen.getByText('Upload Success')).toBeDefined();
    expect(screen.getByText('Files uploaded')).toBeDefined();
  });

  it('filters notifications by unread', async () => {
    (useNotifications as Mock).mockReturnValue({
      notifications: [
        ...mockNotifications,
        {
          id: '2',
          notification_type: 'report_ready',
          title: 'Read notification',
          message: 'Read',
          is_read: true,
          created_at: new Date().toISOString(),
        },
      ],
      markAsRead: vi.fn(),
      markAllAsRead: vi.fn(),
    });

    render(React.createElement(Notifications));

    expect(screen.getByText('Read notification')).toBeDefined();

    const unreadButton = screen.getByRole('button', { name: 'Unread' });
    fireEvent.click(unreadButton);

    expect(screen.queryByText('Read notification')).toBeNull();
    expect(screen.getByText('Upload Success')).toBeDefined();
  });

  it('calls markAllAsRead when requested', () => {
    const markAllAsRead = vi.fn();
    (useNotifications as Mock).mockReturnValue({
      notifications: mockNotifications,
      markAsRead: vi.fn(),
      markAllAsRead: markAllAsRead,
    });

    render(React.createElement(Notifications));

    const markAllButton = screen.getByText(/Mark all as read/i);
    fireEvent.click(markAllButton);

    expect(markAllAsRead).toHaveBeenCalled();
  });
});
