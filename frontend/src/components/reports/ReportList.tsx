/**
 * ReportList component
 * Lists all user reports with filtering and pagination
 */

import React, { useEffect, useState, useCallback } from 'react';
import { reportApi, type Report, ReportStatus } from '../../services/api';
import ReportCard from './ReportCard';
import { useNavigate } from 'react-router-dom';

// Use correct named imports for modern versions of these libraries
import { List } from 'react-window';
import { AutoSizer } from 'react-virtualized-auto-sizer';

// Note: If build still fails with "not exported", we may need to use 'import pkg from' pattern
// after ensuring tsconfig allows synthetic default imports.

interface ListChildComponentProps {
  index: number;
  style: React.CSSProperties;
  data: any;
}

const ReportList: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const navigate = useNavigate();

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      const statusFilter = filter === 'all' ? undefined : filter;
      const data = await reportApi.listReports(statusFilter);
      setReports(data.reports);
    } catch (error) {
      console.error('Failed to fetch reports:', error);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchReports();
  }, [filter, fetchReports]);

  const handleView = (reportId: string) => {
    navigate(`/reports/${reportId}`);
  };

  const handleDownload = async (reportId: string) => {
    try {
      const blob = await reportApi.downloadReport(reportId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report_${reportId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to download report:', error);
      alert('Failed to download report. Please try again.');
    }
  };

  const handlePrint = async (reportId: string) => {
    try {
      const blob = await reportApi.downloadReport(reportId);
      const url = window.URL.createObjectURL(blob);
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = url;
      document.body.appendChild(iframe);

      iframe.onload = () => {
        iframe.contentWindow?.print();
      };
    } catch (error) {
      console.error('Failed to print report:', error);
    }
  };

  const handleShare = async (reportId: string) => {
    try {
      if (navigator.share) {
        // Use Web Share API if available (mobile)
        const blob = await reportApi.downloadReport(reportId);
        const file = new File([blob], `report_${reportId}.pdf`, { type: 'application/pdf' });

        await navigator.share({
          title: 'Radiology Report',
          text: 'Sharing radiology report',
          files: [file],
        });
      } else {
        // Fallback: copy link to clipboard
        const link = `${window.location.origin}/reports/${reportId}`;
        await navigator.clipboard.writeText(link);
        alert('Report link copied to clipboard!');
      }
    } catch (error) {
      console.error('Failed to share report:', error);
    }
  };

  const filterTabs = [
    { id: 'all', label: 'All' },
    { id: ReportStatus.READY, label: 'Ready' },
    { id: ReportStatus.PENDING, label: 'Pending' },
    { id: ReportStatus.ADDITIONAL_DATA_REQUIRED, label: 'Additional Data Needed' },
  ];

  const Row = ({ index, style, data }: ListChildComponentProps) => {
    const width = data.width;
    // Responsive grid calculation
    const CARD_MIN_WIDTH = 300;
    const GAP = 24;
    const itemsPerRow = Math.max(1, Math.floor((width + GAP) / (CARD_MIN_WIDTH + GAP)));

    const startIndex = index * itemsPerRow;
    const rowItems = reports.slice(startIndex, startIndex + itemsPerRow);

    return (
      <div style={style} className="flex gap-6 px-1">
        {rowItems.map((report) => (
          <div
            key={report.id}
            style={{
              flex: `0 0 calc(${100 / itemsPerRow}% - ${
                (GAP * (itemsPerRow - 1)) / itemsPerRow
              }px)`,
            }}
          >
            <ReportCard
              report={report}
              onView={handleView}
              onDownload={handleDownload}
              onPrint={handlePrint}
              onShare={handleShare}
            />
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)]">
      {/* Filter Tabs */}
      <div className="border-b border-gray-200 mb-6 flex-shrink-0">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`${
                filter === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-12 flex-grow">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Empty State */}
      {!loading && reports.length === 0 && (
        <div className="text-center py-12 flex-grow">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No reports</h3>
          <p className="mt-1 text-sm text-gray-500">
            Your reports will appear here once uploads are processed.
          </p>
        </div>
      )}

      {/* Virtualized Grid */}
      {!loading && reports.length > 0 && (
        <div className="flex-grow">
          <AutoSizer>
            {({ height, width }) => {
              const CARD_MIN_WIDTH = 300;
              const GAP = 24;
              const itemsPerRow = Math.max(1, Math.floor((width + GAP) / (CARD_MIN_WIDTH + GAP)));
              const rowCount = Math.ceil(reports.length / itemsPerRow);
              const ITEM_HEIGHT = 280; // Approximate height of card + gap

              return (
                <List
                  height={height}
                  width={width}
                  itemCount={rowCount}
                  itemSize={ITEM_HEIGHT}
                  itemData={{ width }}
                >
                  {Row}
                </List>
              );
            }}
          </AutoSizer>
        </div>
      )}
    </div>
  );
};

export default ReportList;
