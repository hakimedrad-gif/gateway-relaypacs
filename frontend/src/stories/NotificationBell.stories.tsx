import type { Meta, StoryObj } from '@storybook/react';
import NotificationBell from '../components/notifications/NotificationBell';

const meta = {
  title: 'Components/Notifications/NotificationBell',
  component: NotificationBell,
  tags: ['autodocs'],
} satisfies Meta<typeof NotificationBell>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
