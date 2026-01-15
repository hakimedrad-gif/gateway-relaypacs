import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { NotificationList } from '../components/notifications/NotificationList';
import React from 'react';
import type { Notification } from '../services/api';

describe('NotificationList Component', () => {
  const mockNotifications = [
    {
      id: '1',
      user_id: 'u1',
      notification_type: 'upload_complete',
      title: 'Upload Finished',
      message: 'Your files are ready',
      is_read: false,
      created_at: new Date().toISOString(),
    },
    {
      id: '2',
      user_id: 'u1',
      notification_type: 'report_ready',
      title: 'Report Available',
      message: 'Radiologist has finished',
      is_read: true,
      created_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    },
  ] as Notification[];

  it('renders correctly with notifications', () => {
    render(React.createElement(NotificationList, { notifications: mockNotifications }));

    expect(screen.getByText('Upload Finished')).toBeDefined();
    expect(screen.getByText('Report Available')).toBeDefined();

    // Check for "Just now" or "1m ago" etc depending on timing
    expect(screen.getByText(/Just now|0m ago/i)).toBeDefined();
    expect(screen.getByText('1h ago')).toBeDefined();
  });

  it('renders empty message when no notifications', () => {
    render(
      React.createElement(NotificationList, { notifications: [], emptyMessage: 'Nothing here' }),
    );
    expect(screen.getByText('Nothing here')).toBeDefined();
  });

  it('calls onNotificationClick when an item is clicked', () => {
    const handleClick = vi.fn();
    render(
      React.createElement(NotificationList, {
        notifications: mockNotifications,
        onNotificationClick: handleClick,
      }),
    );

    fireEvent.click(screen.getByText('Upload Finished'));
    expect(handleClick).toHaveBeenCalledWith(expect.objectContaining({ id: '1' }));
  });
});
