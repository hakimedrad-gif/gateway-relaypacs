import type { Meta, StoryObj } from '@storybook/react';
import { TrendChart } from '../components/TrendChart';

const meta = {
  title: 'Components/TrendChart',
  component: TrendChart,
  tags: ['autodocs'],
} satisfies Meta<typeof TrendChart>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    data: [
      { date: '2023-01-01', count: 10 },
      { date: '2023-01-02', count: 20 },
      { date: '2023-01-03', count: 15 },
      { date: '2023-01-04', count: 25 },
      { date: '2023-01-05', count: 30 },
    ],
    period: 'week',
  },
};

export const Empty: Story = {
  args: {
    data: [],
    period: 'week',
  },
};
