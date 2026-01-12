/**
 * IndexedDB service for offline notification persistence
 */

import Dexie, { type Table } from 'dexie';
import type { Notification } from '../services/api';

class NotificationDatabase extends Dexie {
  notifications!: Table<Notification, string>;

  constructor() {
    super('NotificationDB');

    this.version(1).stores({
      notifications: 'id, user_id, created_at, is_read, notification_type',
    });
  }

  async saveNotifications(notifications: Notification[]): Promise<void> {
    await this.notifications.bulkPut(notifications);
  }

  async saveNotification(notification: Notification): Promise<void> {
    await this.notifications.put(notification);
  }

  async getNotifications(userId: string): Promise<Notification[]> {
    return await this.notifications.where('user_id').equals(userId).reverse().sortBy('created_at');
  }

  async getUnreadCount(userId: string): Promise<number> {
    return await this.notifications
      .where('user_id')
      .equals(userId)
      .and((n) => !n.is_read)
      .count();
  }

  async markAsRead(notificationId: string): Promise<void> {
    await this.notifications.update(notificationId, { is_read: true });
  }

  async markAllAsRead(userId: string): Promise<void> {
    const notifications = await this.notifications.where('user_id').equals(userId).toArray();
    const updates = notifications.map((n) => ({
      key: n.id,
      changes: { is_read: true },
    }));
    await this.notifications.bulkUpdate(updates);
  }

  async clearOldNotifications(daysToKeep: number = 30): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    await this.notifications.where('created_at').below(cutoffDate.toISOString()).delete();
  }
}

export const notificationDB = new NotificationDatabase();
