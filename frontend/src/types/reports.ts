// Report-related types
// Extracted from src/services/api.ts

export const ReportStatus = {
  IN_TRANSIT: 'in_transit',
  PENDING: 'pending',
  ASSIGNED: 'assigned',
  IN_PROGRESS: 'in_progress',
  READY: 'ready',
  ADDITIONAL_DATA_REQUIRED: 'additional_data_required',
} as const;

export type ReportStatus = (typeof ReportStatus)[keyof typeof ReportStatus];

export interface Report {
  id: string;
  upload_id: string;
  patient_name?: string;
  study_instance_uid: string;
  status: ReportStatus;
  radiologist_name?: string;
  report_text?: string;
  report_url?: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  intransit_at?: string;
  pacs_received_at?: string;
  assigned_at?: string;
  viewed_at?: string;
  completed_at?: string;
}

export interface ReportStatusUpdate {
  status: ReportStatus;
  radiologist_id?: string;
  radiologist_name?: string;
}

export interface ReportListResponse {
  reports: Report[];
  total: number;
}
