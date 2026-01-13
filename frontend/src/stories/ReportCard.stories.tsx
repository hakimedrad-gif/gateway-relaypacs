import type { Meta, StoryObj } from '@storybook/react';
import ReportCard from '../components/reports/ReportCard';
import { ReportStatus } from '../services/api';

const meta = {
  title: 'Components/Reports/ReportCard',
  component: ReportCard,
  tags: ['autodocs'],
} satisfies Meta<typeof ReportCard>;

export default meta;
type Story = StoryObj<typeof meta>;

// Mock date
const date = new Date().toISOString();

export const Ready: Story = {
  args: {
    report: {
      id: '1',
      study_instance_uid: '1.2.840.113619.2.55.3.42710457.123.456.789',
      status: ReportStatus.READY,
      created_at: date,
      updated_at: date,
      radiologist_name: 'Dr. Jane Smith',
      report_url: 'https://example.com/report.pdf',
      clinic_id: 'clinic-1',
      report_content: 'Normal study',
    },
    onView: (id) => console.log('View', id),
    onDownload: (id) => console.log('Download', id),
    onPrint: (id) => console.log('Print', id),
    onShare: (id) => console.log('Share', id),
  },
};

export const Pending: Story = {
  args: {
    report: {
      id: '2',
      study_instance_uid: '1.2.840.113619.2.55.3.98765432.123.456.789',
      status: ReportStatus.PENDING,
      created_at: date,
      updated_at: date,
      clinic_id: 'clinic-1',
    },
    onView: (id) => console.log('View', id),
    onDownload: (id) => console.log('Download', id),
  },
};

