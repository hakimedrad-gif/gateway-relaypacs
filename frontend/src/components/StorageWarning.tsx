import React from 'react';
import { useStorageMonitor } from '../hooks/useStorageMonitor';
import { formatBytes, shouldWarnUser } from '../utils/storageManager';

export const StorageWarning: React.FC = () => {
  const { storageInfo } = useStorageMonitor();

  if (!storageInfo || !shouldWarnUser(storageInfo.percentUsed)) {
    return null;
  }

  return (
    <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-4 mb-4">
      <div className="flex items-start gap-3">
        <svg
          className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
        <div className="flex-1">
          <h3 className="text-sm font-medium text-yellow-500">Storage Almost Full</h3>
          <p className="text-sm text-slate-300 mt-1">
            You're using {formatBytes(storageInfo.usage)} of {formatBytes(storageInfo.quota)} (
            {storageInfo.percentUsed.toFixed(0)}%). Consider clearing old uploads or cached data.
          </p>
        </div>
      </div>
    </div>
  );
};
