import React from 'react';
import type { Notification } from '../../services/api';

interface NotificationListProps {
  notifications: Notification[];
  onNotificationClick?: (notification: Notification) => void;
  emptyMessage?: string;
}

export const NotificationList: React.FC<NotificationListProps> = ({
  notifications,
  onNotificationClick,
  emptyMessage = 'No notifications yet',
}) => {
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'upload_complete':
        return '✅';
      case 'upload_failed':
        return '❌';
      case 'report_ready':
        return '📄';
      case 'report_assigned':
        return '👨‍⚕️';
      case 'additional_data_required':
        return '⚠️';
      default:
        return '🔔';
    }
  };

  const getTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  if (notifications.length === 0) {
    return (
      <div className="px-4 py-6 text-center text-gray-500">
        <p className="text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-gray-200">
      {notifications.map((notification) => (
        <li
          key={notification.id}
          onClick={() => onNotificationClick?.(notification)}
          className={`px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors ${
            !notification.is_read ? 'bg-blue-50' : ''
          }`}
        >
          <div className="flex items-start">
            <span className="text-2xl mr-3 flex-shrink-0">
              {getNotificationIcon(notification.notification_type)}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{notification.title}</p>
              <p className="text-xs text-gray-600 mt-1 line-clamp-2">{notification.message}</p>
              <p className="text-xs text-gray-500 mt-1">{getTimeAgo(notification.created_at)}</p>
            </div>
            {!notification.is_read && (
              <span className="ml-2 w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-1" />
            )}
          </div>
        </li>
      ))}
    </ul>
  );
};
