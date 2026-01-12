/**
 * Reports Page
 * Main page for viewing all user reports
 */

import React from 'react';
import ReportList from '../components/reports/ReportList';

const Reports: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Reports</h1>
        <p className="mt-2 text-gray-600">View and manage your radiology reports</p>
      </div>

      {/* Report List */}
      <ReportList />
    </div>
  );
};

export default Reports;
