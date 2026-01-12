import React from 'react';

interface FilePreviewProps {
  fileName: string;
  fileSize: number;
  metadata?: {
    patientName?: string;
    studyDate?: string;
    modality?: string;
    studyDescription?: string;
  };
}

export const FilePreview: React.FC<FilePreviewProps> = ({ fileName, fileSize, metadata }) => {
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
      <div className="flex items-start gap-3">
        {/* File Icon */}
        <div className="flex-shrink-0 w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
          <svg
            className="w-6 h-6 text-blue-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>

        {/* File Info */}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-white truncate">{fileName}</h4>
          <p className="text-xs text-slate-400 mt-1">{formatFileSize(fileSize)}</p>

          {/* DICOM Metadata */}
          {metadata && (
            <div className="mt-3 space-y-1">
              {metadata.patientName && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-500">Patient:</span>
                  <span className="text-slate-300">{metadata.patientName}</span>
                </div>
              )}
              {metadata.modality && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-500">Modality:</span>
                  <span className="text-blue-400 font-medium">{metadata.modality}</span>
                </div>
              )}
              {metadata.studyDate && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-500">Study Date:</span>
                  <span className="text-slate-300">{metadata.studyDate}</span>
                </div>
              )}
              {metadata.studyDescription && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-500">Description:</span>
                  <span className="text-slate-300">{metadata.studyDescription}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
