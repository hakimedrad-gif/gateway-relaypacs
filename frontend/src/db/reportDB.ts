/**
 * IndexedDB service for offline report persistence
 */

import Dexie, { type Table } from 'dexie';
import type { Report } from '../services/api';

class ReportDatabase extends Dexie {
  reports!: Table<Report, string>;

  constructor() {
    super('ReportDB');

    this.version(1).stores({
      reports: 'id, upload_id, study_instance_uid, status, user_id, created_at',
    });
  }

  async saveReports(reports: Report[]): Promise<void> {
    await this.reports.bulkPut(reports);
  }

  async saveReport(report: Report): Promise<void> {
    await this.reports.put(report);
  }

  async getReports(userId: string): Promise<Report[]> {
    return await this.reports.where('user_id').equals(userId).reverse().sortBy('created_at');
  }

  async getReportById(reportId: string): Promise<Report | undefined> {
    return await this.reports.get(reportId);
  }

  async deleteReport(reportId: string): Promise<void> {
    await this.reports.delete(reportId);
  }

  async clearOldReports(daysToKeep: number = 30): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    await this.reports.where('created_at').below(cutoffDate.toISOString()).delete();
  }
}

export const reportDB = new ReportDatabase();
