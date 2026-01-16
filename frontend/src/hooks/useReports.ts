/**
 * React hook for managing report state and synchronization
 * Provides report listing, syncing, and offline support
 */

import { useEffect, useState, useCallback } from 'react';
import { reportApi, type Report, ReportStatus } from '../services/api';
import { reportDB } from '../db/reportDB';
import { useAuth } from './useAuth';

interface UseReportsReturn {
  reports: Report[];
  loading: boolean;
  error: Error | null;
  syncReport: (reportId: string) => Promise<Report>;
  downloadReport: (reportId: string) => Promise<Blob>;
  refresh: () => Promise<void>;
}

export const useReports = (statusFilter?: string): UseReportsReturn => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuth();
  const userId = user?.username || 'unknown';

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await reportApi.listReports(statusFilter);
      setReports(data.reports);

      // Save to IndexedDB for offline access
      await reportDB.saveReports(data.reports);
    } catch (err) {
      console.error('Failed to fetch reports from API:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch reports'));

      // Try to load from IndexedDB
      try {
        const offlineReports = await reportDB.getReports(userId);
        if (offlineReports.length > 0) {
          // Filter offline reports if needed
          const filtered = statusFilter
            ? offlineReports.filter((r) => r.status === statusFilter)
            : offlineReports;
          setReports(filtered);
        }
      } catch (dbErr) {
        console.error('Failed to load reports from IndexedDB:', dbErr);
      }
    } finally {
      setLoading(false);
    }
  }, [statusFilter, userId]);

  const syncReport = useCallback(async (reportId: string) => {
    try {
      const updatedReport = await reportApi.syncReport(reportId);

      // Update local state
      setReports((prev) => prev.map((r) => (r.id === reportId ? updatedReport : r)));

      // Update IndexedDB
      await reportDB.saveReport(updatedReport);

      return updatedReport;
    } catch (err) {
      console.error('Failed to sync report:', err);
      throw err;
    }
  }, []);

  const downloadReport = useCallback(async (reportId: string) => {
    try {
      return await reportApi.downloadReport(reportId);
    } catch (err) {
      console.error('Failed to download report:', err);
      throw err;
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  return {
    reports,
    loading,
    error,
    syncReport,
    downloadReport,
    refresh: fetchReports,
  };
};
