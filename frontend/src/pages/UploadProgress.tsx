import * as React from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../db/db';
import { useLiveQuery } from 'dexie-react-hooks';

export const UploadProgress: React.FC = () => {
  const { uploadId } = useParams<{ uploadId: string }>();

  // Live query for the study status
  const study = useLiveQuery(() => db.studies.get(Number(uploadId)), [uploadId]);

  const files = useLiveQuery(
    () => db.files.where('studyId').equals(Number(uploadId)).limit(100).toArray(),
    [uploadId],
  );

  // Calculate progress efficiently from study object
  const progress = study?.progress || 0;

  if (!study) return <div className="p-4 text-center">Loading...</div>;

  return (
    <div className="flex flex-col gap-6 p-4 max-w-2xl mx-auto">
      <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />

        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-xl font-bold text-white">Uploading Study</h2>
            <p className="text-slate-400 text-sm">
              {study.metadata.patientName || 'Unknown Patient'} • {study.metadata.studyDate}
            </p>
          </div>
          <div className="px-2 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-bold rounded flex items-center gap-1 uppercase tracking-wider">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
            Secure
          </div>
        </div>

        <div
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          className="relative w-full h-3 bg-slate-900 rounded-full overflow-hidden mb-3 border border-slate-700"
        >
          <div
            className={`absolute top-0 left-0 h-full transition-all duration-500 ease-out ${
              study.status === 'failed'
                ? 'bg-red-500'
                : 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex justify-between items-center text-xs">
          <div className="flex flex-col">
            <span
              className={`font-bold ${
                study.status === 'failed' ? 'text-red-400' : 'text-blue-400'
              }`}
            >
              {study.status === 'failed' ? 'Retrying Connection...' : `${progress}% Synchronized`}
            </span>
            {study.status === 'failed' && (
              <span className="text-slate-500 animate-pulse mt-1">Automatic retry in progress</span>
            )}
          </div>
          <span className="text-slate-500 font-mono">
            {study.totalFiles} Files • {(study.totalSize / 1024 / 1024).toFixed(1)} MB
          </span>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center px-1">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">
            Transmission Queue
          </h3>
          <span className="text-[10px] text-slate-600 bg-slate-800 px-2 py-0.5 rounded">
            {files?.length} TOTAL
          </span>
        </div>

        <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
          {files?.map((file) => (
            <div
              key={file.id}
              className="flex items-center justify-between p-3 bg-slate-800/40 rounded-xl border border-slate-700/50 hover:bg-slate-800/60 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-2 h-2 rounded-full ${
                    file.uploadedChunks.length * 1024 * 1024 >= file.size
                      ? 'bg-green-500'
                      : 'bg-blue-500 animate-pulse'
                  }`}
                />
                <span className="text-sm truncate text-slate-300 font-medium">{file.fileName}</span>
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-1 rounded-md ${
                  file.uploadedChunks.length * 1024 * 1024 >= file.size
                    ? 'text-green-400 bg-green-400/10'
                    : 'text-blue-400 bg-blue-400/10'
                }`}
              >
                {file.uploadedChunks.length * 1024 * 1024 >= file.size ? 'VERIFIED' : 'SYNCING'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {study && study.status === 'complete' && (
        <div
          data-testid="upload-complete-banner"
          className="p-6 bg-green-500/10 border-2 border-green-500/20 rounded-2xl text-center space-y-3 animate-in fade-in zoom-in duration-500"
        >
          <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-2 shdaow-lg shadow-green-900/40">
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="3"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <div>
            <p data-testid="upload-success-message" className="text-green-400 font-black text-xl">
              Upload Successful
            </p>
            <p data-testid="pacs-status-message" className="text-green-500/60 text-sm">
              Study secured in Cloud PACS
            </p>
          </div>
          <button
            onClick={() => (window.location.href = '/')}
            className="mt-4 px-6 py-2 bg-green-500 hover:bg-green-400 text-white font-bold rounded-lg transition-all"
          >
            Upload New Study
          </button>
        </div>
      )}
    </div>
  );
};
