import type { Meta, StoryObj } from '@storybook/react';
import { ExportButton } from '../components/ExportButton';

const meta = {
  title: 'Components/ExportButton',
  component: ExportButton,
  tags: ['autodocs'],
} satisfies Meta<typeof ExportButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    data: [
      { id: 1, name: 'Item 1' },
      { id: 2, name: 'Item 2' },
    ],
    filename: 'export',
  },
};
