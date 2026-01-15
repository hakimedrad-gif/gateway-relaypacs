/**
 * Completion Page
 * Displays upload success summary and next actions
 */

import * as React from 'react';
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';

export const Completion: React.FC = () => {
  const { uploadId } = useParams<{ uploadId: string }>();
  const navigate = useNavigate();
  const [cleanedUp, setCleanedUp] = useState(false);

  // Get study from IndexedDB
  const study = useLiveQuery(
    () =>
      db.studies
        .where('uploadId')
        .equals(uploadId || '')
        .first(),
    [uploadId],
  );

  useEffect(() => {
    // Perform cleanup once when study is loaded
    const performCleanup = async () => {
      if (study?.id && !cleanedUp) {
        try {
          // Remove temporary file chunks to free up space
          await db.files.where('studyId').equals(study.id).delete();
          // Update status if needed (though uploadManager handles this)
          if (study.status !== 'complete') {
            await db.studies.update(study.id, { status: 'complete' });
          }
          setCleanedUp(true);
        } catch (error) {
          console.error('Cleanup failed:', error);
        }
      }
    };

    if (study) {
      performCleanup();
    }
  }, [study, cleanedUp]);

  // Format duration or fallback
  const getDuration = (start: Date) => {
    const end = new Date();
    const diff = Math.floor((end.getTime() - start.getTime()) / 1000); // seconds
    const minutes = Math.floor(diff / 60);
    const seconds = diff % 60;
    return `${minutes}m ${seconds}s`;
  };

  if (!study) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto p-4 space-y-6">
      {/* Success Animation */}
      <div className="text-center py-8" data-testid="upload-complete-banner">
        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg
            className="w-10 h-10 text-green-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-3xl font-bold text-white mb-2">Upload Complete!</h2>
        <p className="text-slate-400">Your study has been successfully processed.</p>
      </div>

      {/* Summary Card */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <div className="bg-slate-900/50 px-6 py-4 border-b border-slate-700">
          <h3 className="text-lg font-semibold text-white">Upload Summary</h3>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Patient</p>
              <p className="text-white font-medium">
                {study.metadata.patientName || 'Unknown Patient'}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Time Taken</p>
              <p className="text-white font-medium">{getDuration(study.createdAt)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Total Files</p>
              <p className="text-white font-medium text-lg">{study.totalFiles}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Total Size</p>
              <p className="text-white font-medium text-lg">
                {(study.totalSize / (1024 * 1024)).toFixed(1)} MB
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-700">
            <div className="flex items-center gap-2 text-green-400 bg-green-900/20 p-3 rounded-lg border border-green-900/50">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-sm font-medium">Successfully forwarded to PACS</span>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
        <button
          onClick={() => navigate('/')}
          className="w-full py-4 px-6 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-900/50 transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          Upload Another
        </button>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => navigate('/reports')}
            className="w-full py-4 px-4 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl transition-colors active:scale-95"
          >
            Data History
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full py-4 px-4 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl transition-colors active:scale-95"
          >
            Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};
