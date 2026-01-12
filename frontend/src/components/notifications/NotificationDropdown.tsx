/**
 * Notification Dropdown component
 * Shows recent notifications with mark-as-read functionality
 */

import React from 'react';
import { useNotifications } from '../../hooks/useNotifications';
import type { Notification } from '../../services/api';
import { useNavigate } from 'react-router-dom';

interface NotificationDropdownProps {
  onClose: () => void;
}

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ onClose }) => {
  const { notifications, markAsRead, markAllAsRead } = useNotifications();
  const navigate = useNavigate();

  // Show only the 5 most recent notifications
  const recentNotifications = notifications.slice(0, 5);

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }

    // Navigate to related page if applicable
    if (notification.related_report_id) {
      navigate(`/reports/${notification.related_report_id}`);
      onClose();
    } else if (notification.related_upload_id) {
      navigate('/dashboard');
      onClose();
    }
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

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

  return (
    <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
        <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
        {notifications.length > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            Mark all read
          </button>
        )}
      </div>

      {/* Notification List */}
      <div className="max-h-96 overflow-y-auto">
        {recentNotifications.length === 0 ? (
          <div className="px-4 py-6 text-center text-gray-500">
            <p className="text-sm">No notifications yet</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {recentNotifications.map((notification) => (
              <li
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors ${
                  !notification.is_read ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-start">
                  {/* Icon */}
                  <span className="text-2xl mr-3 flex-shrink-0">
                    {getNotificationIcon(notification.notification_type)}
                  </span>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {notification.title}
                    </p>
                    <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                      {notification.message}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {getTimeAgo(notification.created_at)}
                    </p>
                  </div>

                  {/* Unread indicator */}
                  {!notification.is_read && (
                    <span className="ml-2 w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-1" />
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Footer */}
      {notifications.length > 5 && (
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
          <button
            onClick={() => {
              navigate('/notifications');
              onClose();
            }}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium w-full text-center"
          >
            View all notifications
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;
