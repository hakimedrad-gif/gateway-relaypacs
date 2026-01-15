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
    fileName: 'test-image.dcm',
    fileSize: 1024 * 512, // 512 KB
    metadata: {
      patientName: 'DOE^JOHN',
      modality: 'CT',
      studyDate: '2024-01-01',
    },
  },
};

export const WithoutMetadata: Story = {
  args: {
    fileName: 'image-001.dcm',
    fileSize: 1024 * 1024 * 2.5, // 2.5 MB
  },
};
