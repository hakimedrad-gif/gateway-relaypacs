import * as React from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../db/db';
import { useLiveQuery } from 'dexie-react-hooks';

export const UploadProgress: React.FC = () => {
  const { uploadId } = useParams<{ uploadId: string }>();

  // Live query for the study status
  const study = useLiveQuery(
    () => db.studies.get(Number(uploadId)),
    [uploadId]
  );
  
  const files = useLiveQuery(
    () => db.files.where('studyId').equals(Number(uploadId)).toArray(),
    [uploadId]
  );

  // Calculate progress efficiently without side-effects
  let progress = 0;
  if (files && study) {
    let totalChunksUploaded = 0;
    let totalChunksExpected = 0;
    const CHUNK_SIZE = 1024 * 1024; // 1MB match backend

    files.forEach(f => {
      const fileChunks = Math.ceil(f.size / CHUNK_SIZE);
      totalChunksExpected += fileChunks;
      totalChunksUploaded += f.uploadedChunks.length;
    });

    if (totalChunksExpected > 0) {
      progress = Math.round((totalChunksUploaded / totalChunksExpected) * 100);
    }
  }

  if (!study) return <div className="p-4 text-center">Loading...</div>;

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
        <h2 className="text-xl font-bold mb-1">Uploading Study</h2>
        <p className="text-slate-400 text-sm mb-6">
          {study.metadata.patientName || 'Unknown Patient'} • {study.metadata.studyDate}
        </p>

        <div className="relative w-full h-4 bg-slate-700 rounded-full overflow-hidden mb-2">
          <div 
            className="absolute top-0 left-0 h-full bg-blue-500 transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        
        <div className="flex justify-between text-sm">
          <span className="text-blue-400 font-medium">{progress}% Complete</span>
          <span className="text-slate-500">
            {study.totalFiles} Files • {(study.totalSize / 1024 / 1024).toFixed(1)} MB
          </span>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">File Details</h3>
        <div className="space-y-2">
          {files?.slice(0, 5).map(file => (
            <div key={file.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
              <span className="text-sm truncate max-w-[70%]">{file.fileName}</span>
              {file.uploadedChunks.length * 1024 * 1024 >= file.size ? (
                <span className="text-green-400 text-xs font-bold">DONE</span>
              ) : (
                <span className="text-blue-400 text-xs animate-pulse">SYNCING</span>
              )}
            </div>
          ))}
          {files && files.length > 5 && (
            <div className="text-center text-xs text-slate-500 pt-2">
              + {files.length - 5} more files
            </div>
          )}
        </div>
      </div>
      
      {study.status === 'complete' && (
        <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-center">
          <p className="text-green-400 font-bold mb-2">Upload Complete</p>
          <button className="text-sm underline text-green-300">View Receipt</button>
        </div>
      )}
    </div>
  );
};
