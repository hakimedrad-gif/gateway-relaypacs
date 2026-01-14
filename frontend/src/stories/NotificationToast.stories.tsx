import type { Meta, StoryObj } from '@storybook/react';
import NotificationToast from '../components/notifications/NotificationToast';
import { NotificationType } from '../services/api';

const meta = {
  title: 'Components/Notifications/NotificationToast',
  component: NotificationToast,
  tags: ['autodocs'],
} satisfies Meta<typeof NotificationToast>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockDate = new Date().toISOString();

export const Success: Story = {
  args: {
    notification: {
      id: '1',
      user_id: 'user-1',
      notification_type: NotificationType.UPLOAD_COMPLETE,
      title: 'Upload Complete',
      message: 'Operation completed successfully',
      is_read: false,
      created_at: mockDate,
    },
    onDismiss: () => console.log('Close toast'),
  },
};

export const Error: Story = {
  args: {
    notification: {
      id: '2',
      user_id: 'user-1',
      notification_type: NotificationType.UPLOAD_FAILED,
      title: 'Upload Failed',
      message: 'Something went wrong',
      is_read: false,
      created_at: mockDate,
    },
    onDismiss: () => console.log('Close toast'),
  },
};

export const Info: Story = {
  args: {
    notification: {
      id: '3',
      user_id: 'user-1',
      notification_type: NotificationType.REPORT_READY,
      title: 'Report Ready',
      message: 'New updates available',
      is_read: false,
      created_at: mockDate,
    },
    onDismiss: () => console.log('Close toast'),
  },
};
