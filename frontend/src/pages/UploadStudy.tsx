import * as React from 'react';
import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { uploadManager } from '../services/uploadManager';

export const UploadStudy: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const validateFiles = (files: File[]) => {
    const validExtensions = ['.dcm', '.zip', '.jpg', '.jpeg', '.png'];
    const hasInvalid = files.some((file) => {
      const ext = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
      // DICOM files often don't have extensions, so we check for that or common types
      return !validExtensions.includes(ext) && ext !== '' && !file.type.includes('dicom');
    });

    if (hasInvalid) {
      return 'Some files are not supported. Please ensure you are uploading DICOM, ZIP, or images.';
    }
    return null;
  };

  const [modality, setModality] = useState('CT');
  const [serviceLevel, setServiceLevel] = useState('routine');

  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      if (event.target.files && event.target.files.length > 0) {
        setError(null);
        const files = Array.from(event.target.files) as File[];

        const validationError = validateFiles(files);
        if (validationError) {
          setError(validationError);
          return;
        }

        // Basic Metadata Extraction (Mock for Sprint 1)
        const metadata = {
          patient_name: 'DOE^JOHN', // TODO: Extract from DICOM
          study_date: new Date().toISOString().split('T')[0],
          modality: modality,
          service_level: serviceLevel,
        };

        try {
          const studyId = await uploadManager.createStudy(files, metadata);
          // Navigate to metadata confirmation
          navigate(`/metadata/${studyId}`);
        } catch (err) {
          console.error('Upload failed', err);
          setError(
            'Failed to start upload. Please try again or contact support if the issue persists.',
          );
        }
      }
    },
    [navigate, modality, serviceLevel],
  );

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-white">Upload Study</h2>
        <p className="text-slate-400">Select DICOM files or folders to begin</p>
      </div>

      {error && (
        <div className="w-full max-w-sm p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="w-full max-w-sm grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Modality
          </label>
          <select
            value={modality}
            onChange={(e) => setModality(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
          >
            <option value="CR">Radiograph/X-ray</option>
            <option value="CT">CT-scan</option>
            <option value="MR">MRI</option>
            <option value="XC">Fluoroscopy</option>
            <option value="US">Ultrasound</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Service Level
          </label>
          <select
            value={serviceLevel}
            onChange={(e) => setServiceLevel(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
          >
            <option value="routine">Routine</option>
            <option value="emergency">Emergency</option>
            <option value="stat">Stat</option>
            <option value="subspecialty">Subspecialty Opinion</option>
          </select>
        </div>
      </div>

      <div
        onClick={triggerFileInput}
        className="flex flex-col items-center justify-center w-full h-64 border-2 border-slate-600 border-dashed rounded-lg cursor-pointer bg-slate-800 hover:bg-slate-700 hover:border-blue-500 transition-all group"
      >
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
          ref={fileInputRef}
          type="file"
          className="hidden"
          multiple
          onChange={handleFileSelect}
          // @ts-expect-error - webkitdirectory is not in React types yet
          webkitdirectory=""
          directory=""
          aria-label="Upload DICOM files"
        />
      </div>

      <div className="w-full max-w-sm space-y-4 mt-auto sm:mt-0">
        <button
          onClick={triggerFileInput}
          className="w-full py-5 px-6 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl shadow-xl shadow-blue-900/50 transition-all active:scale-95 text-xl flex items-center justify-center gap-2 border-b-4 border-blue-800"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 4v16m8-8H4"
            ></path>
          </svg>
          Add Study Files
        </button>
        <button className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl border border-slate-700 transition-all active:scale-95 text-sm">
          Scan QR Code
        </button>
      </div>
    </div>
  );
};
