/**
 * React hook for managing notification state and SSE connection
 * Provides real-time notification updates via Server-Sent Events
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { notificationApi, type Notification } from '../services/api';

interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  isConnected: boolean;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refresh: () => Promise<void>;
}

export const useNotifications = (): UseNotificationsReturn => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Fetch initial notifications
  const refresh = useCallback(async () => {
    try {
      const data = await notificationApi.listNotifications(50, 0, false);
      setNotifications(data.notifications);
      setUnreadCount(data.unread_count);

      // Save to IndexedDB for offline access
      try {
        const { notificationDB } = await import('../db/notificationDB');
        await notificationDB.saveNotifications(data.notifications);
      } catch (error) {
        console.error('Failed to save notifications to IndexedDB:', error);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);

      // Load from IndexedDB if online fetch fails
      try {
        const { notificationDB } = await import('../db/notificationDB');
        // Assume user_id is available from auth context or token
        // For now, we'll use a placeholder - in production, get from auth
        const offlineNotifications = await notificationDB.getNotifications('current-user');
        if (offlineNotifications.length > 0) {
          setNotifications(offlineNotifications);
          const unread = await notificationDB.getUnreadCount('current-user');
          setUnreadCount(unread);
        }
      } catch (dbError) {
        console.error('Failed to load notifications from IndexedDB:', dbError);
      }
    }
  }, []);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await notificationApi.markAsRead(notificationId);

      // Update local state
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));

      // Update IndexedDB
      try {
        const { notificationDB } = await import('../db/notificationDB');
        await notificationDB.markAsRead(notificationId);
      } catch (error) {
        console.error('Failed to update notification in IndexedDB:', error);
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    try {
      await notificationApi.markAllAsRead();

      // Update local state
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);

      // Update IndexedDB
      try {
        const { notificationDB } = await import('../db/notificationDB');
        await notificationDB.markAllAsRead('current-user');
      } catch (error) {
        console.error('Failed to update notifications in IndexedDB:', error);
      }
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  }, []);

  // Setup SSE connection
  useEffect(() => {
    let reconnectTimeout: number;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;

    const connect = () => {
      try {
        const eventSource = notificationApi.connectSSE(
          // On new notification
          (notification) => {
            setNotifications((prev) => [notification, ...prev]);
            setUnreadCount((prev) => prev + 1);

            // Save to IndexedDB
            import('../db/notificationDB').then(({ notificationDB }) => {
              notificationDB.saveNotification(notification).catch((error) => {
                console.error('Failed to save notification to IndexedDB:', error);
              });
            });

            // Show toast notification
            if (typeof window !== 'undefined' && 'Notification' in window) {
              // Could trigger browser notification here
              console.log('New notification:', notification.title);
            }
          },
          // On unread count update
          (count) => {
            setUnreadCount(count);
          },
        );

        eventSource.onopen = () => {
          setIsConnected(true);
          reconnectAttempts = 0;
          console.log('SSE connection established');
        };

        eventSource.onerror = () => {
          setIsConnected(false);
          eventSource.close();

          // Exponential backoff reconnection
          if (reconnectAttempts < maxReconnectAttempts) {
            const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
            reconnectAttempts++;

            console.log(
              `SSE disconnected. Reconnecting in ${delay}ms (attempt ${reconnectAttempts})`,
            );

            reconnectTimeout = setTimeout(() => {
              connect();
            }, delay);
          }
        };

        eventSourceRef.current = eventSource;
      } catch (error) {
        console.error('Failed to connect SSE:', error);
        setIsConnected(false);
      }
    };

    // Initial data fetch
    refresh();

    // Connect to SSE
    connect();

    // Cleanup on unmount
    return () => {
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [refresh]);

  return {
    notifications,
    unreadCount,
    isConnected,
    markAsRead,
    markAllAsRead,
    refresh,
  };
};
