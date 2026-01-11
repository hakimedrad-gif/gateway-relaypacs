import * as React from 'react';
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { uploadManager } from '../services/uploadManager';

export const UploadStudy: React.FC = () => {
  const navigate = useNavigate();

  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      if (event.target.files && event.target.files.length > 0) {
        const files = Array.from(event.target.files) as File[];

        // Basic Metadata Extraction (Mock for Sprint 1)
        const metadata = {
          patient_name: 'DOE^JOHN', // TODO: Extract from DICOM
          study_date: new Date().toISOString().split('T')[0],
          modality: 'CT',
        };

        try {
          const studyId = await uploadManager.createStudy(files, metadata);
          // Navigate to metadata confirmation
          navigate(`/metadata/${studyId}`);
        } catch (err) {
          console.error('Upload failed', err);
          alert('Failed to start upload');
        }
      }
    },
    [navigate],
  );

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-white">Upload Study</h2>
        <p className="text-slate-400">Select DICOM files or folders to begin</p>
      </div>

      <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-slate-600 border-dashed rounded-lg cursor-pointer bg-slate-800 hover:bg-slate-700 hover:border-blue-500 transition-all group">
        <div className="flex flex-col items-center justify-center pt-5 pb-6 text-slate-400 group-hover:text-blue-400">
          <svg
            className="w-12 h-12 mb-4"
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 20 16"
          >
            <path
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"
            />
          </svg>
          <p className="mb-2 text-sm">
            <span className="font-semibold">Click to upload</span> or drag and drop
          </p>
          <p className="text-xs">DICOM, ZIP, or Folder</p>
        </div>
        <input
          type="file"
          className="hidden"
          multiple
          onChange={handleFileSelect}
          // @ts-expect-error - webkitdirectory is not in React types yet
          webkitdirectory=""
          directory=""
        />
      </label>

      <div className="w-full max-w-sm">
        <button className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg shadow-lg shadow-blue-900/50 transition-all active:scale-95">
          Scan QR Code
        </button>
      </div>
    </div>
  );
};
