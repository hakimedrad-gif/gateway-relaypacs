// Notification-related types
// Extracted from src/services/api.ts

export const NotificationType = {
  UPLOAD_COMPLETE: 'upload_complete',
  UPLOAD_FAILED: 'upload_failed',
  REPORT_ASSIGNED: 'report_assigned',
  REPORT_READY: 'report_ready',
  ADDITIONAL_DATA_REQUIRED: 'additional_data_required',
} as const;

export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];

export interface Notification {
  id: string;
  user_id: string;
  notification_type: NotificationType;
  title: string;
  message: string;
  related_upload_id?: string;
  related_report_id?: string;
  is_read: boolean;
  created_at: string;
}

export interface NotificationListResponse {
  notifications: Notification[];
  unread_count: number;
  total: number;
}
