/**
 * ReportCard component
 * Displays individual report with action buttons
 */

import React from 'react';
import { ReportStatus, type Report } from '../../services/api';

interface ReportCardProps {
  report: Report;
  onView: (reportId: string) => void;
  onDownload: (reportId: string) => void;
  onPrint?: (reportId: string) => void;
  onShare?: (reportId: string) => void;
}

const ReportCard: React.FC<ReportCardProps> = ({
  report,
  onView,
  onDownload,
  onPrint,
  onShare,
}) => {
  const getStatusBadge = (status: ReportStatus) => {
    const badges = {
      [ReportStatus.ASSIGNED]: 'bg-blue-100 text-blue-800',
      [ReportStatus.PENDING]: 'bg-yellow-100 text-yellow-800',
      [ReportStatus.READY]: 'bg-green-100 text-green-800',
      [ReportStatus.ADDITIONAL_DATA_REQUIRED]: 'bg-red-100 text-red-800',
      [ReportStatus.IN_TRANSIT]: 'bg-indigo-100 text-indigo-800',
    };

    const labels = {
      [ReportStatus.ASSIGNED]: 'Assigned',
      [ReportStatus.PENDING]: 'Pending',
      [ReportStatus.READY]: 'Ready',
      [ReportStatus.ADDITIONAL_DATA_REQUIRED]: 'Additional Data Required',
      [ReportStatus.IN_TRANSIT]: 'Study in Transit',
    };

    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${badges[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const canDownload = report.status === ReportStatus.READY && report.report_url;

  return (
    <div className="bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {report.patient_name || `Study: ${report.study_instance_uid.slice(0, 20)}...`}
            </h3>
            <p className="text-sm text-gray-600">Uploaded: {formatDate(report.created_at)}</p>
          </div>
          {getStatusBadge(report.status as ReportStatus)}
        </div>
      </div>

      {/* Body */}
      <div className="px-6 py-4">
        {report.radiologist_name && (
          <p className="text-sm text-gray-700 mb-2">
            <span className="font-medium">Radiologist:</span> {report.radiologist_name}
          </p>
        )}
        <p className="text-sm text-gray-600">Updated: {formatDate(report.updated_at)}</p>
      </div>

      {/* Actions */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex flex-wrap gap-2">
        <button
          onClick={() => onView(report.id)}
          className="flex-1 sm:flex-none px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          View
        </button>

        <button
          onClick={() => onDownload(report.id)}
          disabled={!canDownload}
          className={`flex-1 sm:flex-none px-4 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 ${
            canDownload
              ? 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 focus:ring-gray-500'
              : 'text-gray-400 bg-gray-100 border border-gray-200 cursor-not-allowed'
          }`}
          title={!canDownload ? 'Report not ready yet' : 'Download PDF'}
        >
          Download
        </button>

        {onPrint && canDownload && (
          <button
            onClick={() => onPrint(report.id)}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Print
          </button>
        )}

        {onShare && canDownload && (
          <button
            onClick={() => onShare(report.id)}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Share
          </button>
        )}
      </div>
    </div>
  );
};

export default ReportCard;
