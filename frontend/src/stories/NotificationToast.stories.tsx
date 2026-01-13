import type { Meta, StoryObj } from '@storybook/react';
import NotificationToast from '../components/notifications/NotificationToast';

const meta = {
  title: 'Components/Notifications/NotificationToast',
  component: NotificationToast,
  tags: ['autodocs'],
} satisfies Meta<typeof NotificationToast>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Success: Story = {
  args: {
    type: 'success',
    message: 'Operation completed successfully',
    onClose: () => console.log('Close toast'),
  },
};

export const Error: Story = {
  args: {
    type: 'error',
    message: 'Something went wrong',
    onClose: () => console.log('Close toast'),
  },
};

export const Info: Story = {
  args: {
    type: 'info',
    message: 'New updates available',
    onClose: () => console.log('Close toast'),
  },
};
