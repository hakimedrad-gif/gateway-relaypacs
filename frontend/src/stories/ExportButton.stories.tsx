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
    onExport: () => console.log('Export clicked'),
    loading: false,
  },
};
