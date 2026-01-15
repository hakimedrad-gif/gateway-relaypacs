/**
 * Notification Dropdown component
 * Shows recent notifications with mark-as-read functionality
 */

import React from 'react';
import { useNotifications } from '../../hooks/useNotifications';
import type { Notification } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import { NotificationList } from './NotificationList';

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
        <NotificationList
          notifications={recentNotifications}
          onNotificationClick={handleNotificationClick}
        />
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
