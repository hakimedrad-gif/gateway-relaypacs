/**
 * Notification Toast component
 * Displays real-time pop-up notifications
 */

import React, { useEffect, useState } from 'react';
import type { Notification } from '../../types';

interface ToastNotification extends Notification {
  show: boolean;
}

interface NotificationToastProps {
  notification: Notification | null;
  onDismiss: () => void;
  autoHideDuration?: number;
}

const NotificationToast: React.FC<NotificationToastProps> = ({
  notification,
  onDismiss,
  autoHideDuration = 5000,
}) => {
  const [toast, setToast] = useState<ToastNotification | null>(null);

  useEffect(() => {
    if (notification) {
      setToast({ ...notification, show: true });

      // Auto-dismiss after duration
      const timer = setTimeout(() => {
        setToast((prev) => (prev ? { ...prev, show: false } : null));
        setTimeout(onDismiss, 300); // Wait for animation
      }, autoHideDuration);

      return () => clearTimeout(timer);
    }
  }, [notification, autoHideDuration, onDismiss]);

  if (!toast) return null;

  const getToastColor = (type: string) => {
    switch (type) {
      case 'upload_complete':
      case 'report_ready':
        return 'bg-green-500';
      case 'upload_failed':
        return 'bg-red-500';
      case 'report_assigned':
        return 'bg-blue-500';
      case 'additional_data_required':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-800';
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'upload_complete':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'upload_failed':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        );
      case 'report_ready':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        );
      default:
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
        );
    }
  };

  return (
    <div
      className={`fixed top-4 right-4 z-50 max-w-sm w-full transition-all duration-300 transform ${
        toast.show ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      }`}
    >
      <div
        className={`${getToastColor(toast.notification_type)} rounded-lg shadow-lg overflow-hidden`}
      >
        <div className="p-4">
          <div className="flex items-start">
            {/* Icon */}
            <div className="flex-shrink-0 text-white">{getIcon(toast.notification_type)}</div>

            {/* Content */}
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium text-white">{toast.title}</p>
              <p className="mt-1 text-sm text-white opacity-90">{toast.message}</p>
            </div>

            {/* Close button */}
            <button
              onClick={() => {
                setToast((prev) => (prev ? { ...prev, show: false } : null));
                setTimeout(onDismiss, 300);
              }}
              className="ml-4 flex-shrink-0 inline-flex text-white hover:text-gray-200 focus:outline-none"
              aria-label="Dismiss notification"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-white bg-opacity-30">
          <div
            className="h-full bg-white transition-all duration-75 ease-linear"
            style={{
              width: toast.show ? '0%' : '100%',
              transition: `width ${autoHideDuration}ms linear`,
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default NotificationToast;
