/**
 * Notifications Page
 * Full notification history with filtering
 */

import React, { useState } from 'react';
import { useNotifications } from '../hooks/useNotifications';

const Notifications: React.FC = () => {
  const { notifications, markAsRead, markAllAsRead } = useNotifications();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const filteredNotifications =
    filter === 'unread' ? notifications.filter((n) => !n.is_read) : notifications;

  const groupByDate = (notifs: typeof notifications) => {
    const groups: Record<string, typeof notifications> = {};

    notifs.forEach((notif) => {
      const date = new Date(notif.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(notif);
    });

    return groups;
  };

  const groupedNotifications = groupByDate(filteredNotifications);

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

  const getTimeFromDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
        <p className="mt-2 text-gray-600">Stay updated on your uploads and reports</p>
      </div>

      {/* Filter Tabs and Actions */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex space-x-4">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 text-sm font-medium rounded-md ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-4 py-2 text-sm font-medium rounded-md ${
              filter === 'unread'
                ? 'bg-blue-600 text-white'
                : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
            }`}
          >
            Unread
          </button>
        </div>

        {notifications.some((n) => !n.is_read) && (
          <button
            onClick={markAllAsRead}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Mark all as read
          </button>
        )}
      </div>

      {/* Notification List */}
      {filteredNotifications.length === 0 ? (
        <div className="text-center py-12">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No notifications</h3>
          <p className="mt-1 text-sm text-gray-500">You're all caught up!</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedNotifications).map(([date, notifs]) => (
            <div key={date}>
              {/* Date Header */}
              <h2 className="text-sm font-semibold text-gray-900 mb-3">{date}</h2>

              {/* Notifications for this date */}
              <div className="space-y-2">
                {notifs.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => !notification.is_read && markAsRead(notification.id)}
                    className={`flex items-start p-4 rounded-lg border cursor-pointer transition-colors ${
                      !notification.is_read
                        ? 'bg-blue-50 border-blue-200 hover:bg-blue-100'
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {/* Icon */}
                    <span className="text-2xl mr-4 flex-shrink-0">
                      {getNotificationIcon(notification.notification_type)}
                    </span>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                          <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                        </div>
                        <span className="text-xs text-gray-500 ml-4 flex-shrink-0">
                          {getTimeFromDate(notification.created_at)}
                        </span>
                      </div>
                    </div>

                    {/* Unread Indicator */}
                    {!notification.is_read && (
                      <span className="ml-4 w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-1" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Notifications;
