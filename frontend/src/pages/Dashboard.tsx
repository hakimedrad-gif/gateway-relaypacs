import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { uploadApi, reportApi, type UploadStats, type Report } from '../services/api';
import { useNotifications } from '../hooks/useNotifications';
import { TrendChart } from '../components/TrendChart';
import { ExportButton } from '../components/ExportButton';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { unreadCount } = useNotifications();
  const [stats, setStats] = useState<UploadStats | null>(null);
  const [recentReports, setRecentReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<string>('all');
  const [trendData, setTrendData] = useState<Array<{ date: string; count: number }>>([]);
  const [exportLoading, setExportLoading] = useState(false);

  const fetchStats = useCallback(
    async (selectedPeriod = period) => {
      try {
        setLoading(true);
        const data = await uploadApi.getStats(
          selectedPeriod === 'all' ? undefined : selectedPeriod,
        );
        setStats(data);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch stats', err);
        setError('Failed to load statistics');
      } finally {
        setLoading(false);
      }
    },
    [period],
  );

  const fetchRecentReports = useCallback(async () => {
    try {
      const data = await reportApi.listReports(undefined, 5, 0);
      setRecentReports(data.reports);
    } catch (err) {
      console.error('Failed to fetch recent reports', err);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchRecentReports();
    // Fetch trend data for chart
    uploadApi
      .getTrendData('7d')
      .then((res) => setTrendData(res.data))
      .catch(console.error);
    // Refresh stats every 30 seconds
    const interval = setInterval(() => {
      fetchStats(period);
      fetchRecentReports();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchStats, fetchRecentReports, period]);

  const handleExport = async () => {
    try {
      setExportLoading(true);
      const blob = await uploadApi.exportStatsCSV(period === 'all' ? undefined : period);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relaypacs_stats_${period}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Failed to export statistics');
    } finally {
      setExportLoading(false);
    }
  };

  const modalityLabels: Record<string, string> = {
    cr: 'Radiograph/X-ray',
    ct: 'CT-scan',
    mr: 'MRI',
    xc: 'Fluoroscopy',
    us: 'Ultrasound',
  };

  const serviceLevelLabels: Record<string, string> = {
    routine: 'Routine',
    emergency: 'Emergency',
    stat: 'Stat',
    subspecialty: 'Subspecialty',
  };

  const getTimeAgo = (isoString: string | null) => {
    if (!isoString) return 'Never';
    const date = new Date(isoString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 5) return 'Just now';
    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    return date.toLocaleTimeString();
  };

  return (
    <div className="p-6 space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tight">Analytics Dashboard</h2>
          <div className="flex items-center gap-2 mt-2">
            {[
              { id: '1w', label: '1W' },
              { id: '2w', label: '2W' },
              { id: '1m', label: '1M' },
              { id: '3m', label: '3M' },
              { id: '6m', label: '6M' },
              { id: 'all', label: 'ALL' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                className={`px-3 py-1 rounded-full text-[10px] font-black transition-all ${
                  period === p.id
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                    : 'bg-slate-800 text-slate-500 hover:text-slate-300'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <div
              onClick={() => navigate('/notifications')}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600/10 border border-blue-500/20 rounded-xl cursor-pointer hover:bg-blue-600/20 transition-all"
            >
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-xs font-black text-blue-400">
                {unreadCount} NEW NOTIFICATIONS
              </span>
            </div>
          )}
          <ExportButton onExport={handleExport} loading={exportLoading} />
          <div className="text-right hidden sm:block">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
              Last Synced
            </p>
            <p className="text-xs font-black text-blue-400">
              {stats ? getTimeAgo(stats.last_updated) : '...'}
            </p>
          </div>
          <button
            onClick={() => fetchStats()}
            disabled={loading}
            className="p-3 bg-slate-800 hover:bg-slate-700 rounded-xl border border-white/5 text-slate-400 hover:text-white transition-all active:scale-95 disabled:opacity-50"
            title="Refresh Statistics"
          >
            <svg
              className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Hero Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-800/50 backdrop-blur-xl p-6 rounded-3xl border border-white/5 shadow-2xl group hover:border-blue-500/30 transition-all">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
            Total Studies
          </p>
          <p className="text-4xl font-black text-white group-hover:text-blue-400 transition-colors">
            {stats?.total_uploads || 0}
          </p>
        </div>
        <div className="bg-slate-800/50 backdrop-blur-xl p-6 rounded-3xl border border-white/5 shadow-2xl group hover:border-emerald-500/30 transition-all">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
            Success Rate
          </p>
          <div className="flex items-baseline gap-2">
            <p className="text-4xl font-black text-emerald-400">
              {stats && stats.total_uploads + stats.failed_uploads > 0
                ? Math.round(
                    (stats.total_uploads / (stats.total_uploads + stats.failed_uploads)) * 100,
                  )
                : 100}
              %
            </p>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-tighter">Verified</p>
          </div>
        </div>
        <div className="bg-slate-800/50 backdrop-blur-xl p-6 rounded-3xl border border-white/5 shadow-2xl group hover:border-red-500/30 transition-all">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
            Unread Alerts
          </p>
          <p
            className={`text-4xl font-black ${
              unreadCount > 0 ? 'text-red-400' : 'text-slate-600'
            } transition-colors`}
          >
            {unreadCount}
          </p>
        </div>
      </div>

      {/* Trend Chart */}
      {trendData.length > 0 && (
        <div className="bg-slate-800/50 backdrop-blur-xl p-1 rounded-3xl border border-white/5 shadow-2xl overflow-hidden">
          <TrendChart data={trendData} period="7d" />
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 font-bold text-sm flex items-center gap-3">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Reports section */}
        <div className="lg:col-span-2 bg-slate-800/50 backdrop-blur-xl p-8 rounded-3xl border border-white/5 shadow-2xl">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-600/20 rounded-lg">
                <svg
                  className="w-5 h-5 text-emerald-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2.5"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-black text-white">Recent Reports</h3>
            </div>
            <button
              onClick={() => navigate('/reports')}
              className="text-xs font-black text-blue-400 hover:text-blue-300 transition-colors uppercase tracking-widest"
            >
              View All
            </button>
          </div>

          <div className="space-y-4">
            {recentReports.length > 0 ? (
              recentReports.map((report) => (
                <div
                  key={report.id}
                  onClick={() => navigate(`/reports/${report.id}`)}
                  className="flex items-center justify-between p-4 bg-slate-900/50 rounded-2xl border border-white/5 hover:border-blue-500/30 cursor-pointer transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        report.status === 'ready'
                          ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]'
                          : report.status === 'in_transit'
                            ? 'bg-indigo-500'
                            : 'bg-amber-500'
                      }`}
                    />
                    <div>
                      <p className="text-sm font-black text-white group-hover:text-blue-400 transition-colors">
                        {report.patient_name || 'Anonymous Study'}
                      </p>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                        {report.study_instance_uid.substring(0, 20)}...
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase">
                      {report.status.replace('_', ' ')}
                    </p>
                    <p className="text-[10px] font-bold text-slate-600">
                      {new Date(report.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-12 text-center bg-slate-900/30 rounded-3xl border border-dashed border-white/5">
                <p className="text-slate-600 font-bold italic">No reports available yet</p>
                <button
                  onClick={() => navigate('/')}
                  className="mt-4 text-xs font-black text-blue-500 hover:text-blue-400 transition-colors uppercase tracking-widest"
                >
                  Start an Upload
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Modality Statistics */}
        <div className="bg-slate-800/50 backdrop-blur-xl p-8 rounded-3xl border border-white/5 shadow-2xl">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-blue-600/20 rounded-lg">
              <svg
                className="w-5 h-5 text-blue-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2"
                />
              </svg>
            </div>
            <h3 className="text-xl font-black text-white">Modality</h3>
          </div>

          <div className="space-y-6">
            {stats && Object.entries(stats.modality).length > 0 ? (
              Object.entries(stats.modality)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([modality, count]) => (
                  <div key={modality} className="space-y-2">
                    <div className="flex justify-between items-end">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        {modalityLabels[modality] || modality.toUpperCase()}
                      </span>
                      <span className="text-xs font-black text-white">{count}</span>
                    </div>
                    <div className="w-full bg-slate-900/50 rounded-full h-2 border border-white/5 overflow-hidden">
                      <div
                        className="bg-blue-600 h-full rounded-full transition-all duration-1000"
                        style={{
                          width: `${
                            stats.total_uploads > 0 ? (count / stats.total_uploads) * 100 : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                ))
            ) : (
              <div className="py-12 text-center">
                <p className="text-slate-600 font-bold italic">N/A</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
