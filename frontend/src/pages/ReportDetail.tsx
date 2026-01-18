import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { reportApi, ReportStatus } from '../services/api';
import type { Report } from '../services/api';
import { db } from '../db/db';
import ReportStatusTimeline from '../components/reports/ReportStatusTimeline';

const ReportDetail: React.FC = () => {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReport = async () => {
      if (!reportId) return;
      try {
        setLoading(true);
        // Try network first
        try {
          const data = await reportApi.getReport(reportId);
          setReport(data);
          // Update cache
          await db.reports.put(data);
        } catch (netErr) {
          console.warn('Network fetch failed, trying offline cache', netErr);
          // Try cache
          const cached = await db.reports.get(reportId);
          if (cached) {
            setReport(cached);
          } else {
            throw new Error('Report not found');
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load report');
      } finally {
        setLoading(false);
      }
    };

    fetchReport();

    // Poll for status updates every 10 seconds
    const interval = setInterval(fetchReport, 10000);
    return () => clearInterval(interval);
  }, [reportId]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl text-red-400">Error</h2>
        <p className="text-slate-400">{error || 'Report not found'}</p>
        <button onClick={() => navigate('/reports')} className="mt-4 text-blue-400 hover:underline">
          Back to Reports
        </button>
      </div>
    );
  }

  // Status Stepper Calculation
  // Using ReportStatusTimeline component

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      {/* Header / Nav */}
      <button
        onClick={() => navigate('/reports')}
        className="flex items-center text-slate-400 hover:text-white transition-colors"
      >
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
        </svg>
        Back to Reports
      </button>

      {/* Main Card */}
      <div className="bg-slate-800 rounded-2xl shadow-xl border border-white/5 overflow-hidden">
        {/* Banner */}
        <div className="h-32 bg-gradient-to-r from-blue-900 to-slate-900 relative">
          <div className="absolute bottom-6 left-8">
            <div className="flex flex-col gap-4 w-full">
              <h1 className="text-3xl font-bold text-white mb-1">
                {report.patient_name || 'One time Patient'}
              </h1>
              {/* Timeline Visualization */}
              <div className="bg-slate-800/80 backdrop-blur rounded-lg border border-slate-700 p-2 mt-2 w-full max-w-4xl">
                <ReportStatusTimeline
                  currentStatus={report.status}
                  intransitAt={report.intransit_at}
                  pacsReceivedAt={report.pacs_received_at}
                  assignedAt={report.assigned_at}
                  viewedAt={report.viewed_at}
                  completedAt={report.completed_at}
                  radiologistName={report.radiologist_name}
                />
              </div>
            </div>
            <p className="text-blue-200 text-sm font-mono">ID: {report.study_instance_uid}</p>
          </div>
          {/* Status Badge */}
          <div className="absolute top-6 right-8">
            <span
              className={`px-4 py-2 rounded-full text-sm font-bold shadow-lg ${
                report.status === ReportStatus.READY
                  ? 'bg-green-500 text-white'
                  : report.status === ReportStatus.IN_TRANSIT
                    ? 'bg-indigo-500 text-white'
                    : report.status === ReportStatus.ADDITIONAL_DATA_REQUIRED
                      ? 'bg-red-500 text-white'
                      : 'bg-yellow-500 text-white'
              }`}
            >
              {report.status.replace(/_/g, ' ').toUpperCase()}
            </span>
          </div>
        </div>

        <div className="p-8">
          {/* Timeline removed in favor of ReportStatusTimeline in banner */}

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-4 border-b border-white/5 pb-2">
                Study Information
              </h3>
              <dl className="space-y-4">
                <div>
                  <dt className="text-slate-500 text-xs uppercase">Created At</dt>
                  <dd className="text-white font-medium">
                    {new Date(report.created_at).toLocaleString()}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500 text-xs uppercase">Radiologist</dt>
                  <dd className="text-white font-medium">
                    {report.radiologist_name || 'Not assigned'}
                  </dd>
                </div>
              </dl>
            </div>

            <div>
              <h3 className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-4 border-b border-white/5 pb-2">
                Actions
              </h3>
              <div className="flex gap-4">
                {report.status === ReportStatus.READY && report.report_url ? (
                  <button
                    onClick={() =>
                      reportApi
                        .downloadReport(report.id)
                        .then((blob) => window.open(window.URL.createObjectURL(blob)))
                    }
                    className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-lg hover:shadow-green-500/25 flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4-4m0 0l-4-4m4 4v12"
                      />
                    </svg>
                    Download PDF
                  </button>
                ) : (
                  <div className="flex-1 bg-slate-700/50 text-slate-500 font-bold py-3 px-4 rounded-xl border border-dashed border-slate-600 flex items-center justify-center gap-2 cursor-not-allowed">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    Wait for Report
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Report Text Preview if available */}
          {report.report_text && (
            <div className="mt-8 pt-8 border-t border-white/5">
              <h3 className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-4">
                Findings
              </h3>
              <div className="bg-slate-900/50 p-6 rounded-xl text-slate-300 leading-relaxed font-serif">
                {report.report_text}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportDetail;
