import type { Meta, StoryObj } from '@storybook/react';
import { FilePreview } from '../components/FilePreview';

const meta = {
  title: 'Components/FilePreview',
  component: FilePreview,
  tags: ['autodocs'],
} satisfies Meta<typeof FilePreview>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    file: new File([''], 'test-image.dcm', { type: 'application/dicom' }),
    onRemove: () => console.log('Remove file'),
  },
};

export const PDFFile: Story = {
  args: {
    file: new File([''], 'report.pdf', { type: 'application/pdf' }),
    onRemove: () => console.log('Remove file'),
  },
};
