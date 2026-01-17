import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import * as dicomParser from 'dicom-parser';
import { uploadManager } from '../../services/uploadManager';
import { db } from '../../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import type { StudyMetadata } from '../../services/api';

// --- Types ---

type WizardStep = 'files' | 'metadata' | 'uploading' | 'complete';

interface UploadTemplate {
  id: string;
  name: string;
  data: Partial<StudyMetadata>;
}

// --- Components ---

const StepIndicator = ({ currentStep }: { currentStep: WizardStep }) => {
  const steps: WizardStep[] = ['files', 'metadata', 'uploading', 'complete'];
  const labels = {
    files: 'Select Files',
    metadata: 'Clinical Data',
    uploading: 'Uploading',
    complete: 'Done',
  };

  return (
    <div className="w-full max-w-3xl mx-auto mb-8">
      <div className="flex justify-between items-center relative">
        <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-700 -z-0 rounded"></div>
        {steps.map((step, index) => {
          const isActive = step === currentStep;
          const isCompleted = steps.indexOf(currentStep) > index;
          const isPending = steps.indexOf(currentStep) < index;

          return (
            <div key={step} className="relative z-10 flex flex-col items-center group">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-4 transition-all duration-300
                  ${
                    isActive
                      ? 'bg-blue-600 border-blue-900 text-white scale-110 shadow-lg shadow-blue-500/50'
                      : ''
                  }
                  ${isCompleted ? 'bg-green-500 border-green-900 text-white' : ''}
                  ${isPending ? 'bg-slate-800 border-slate-600 text-slate-400' : ''}
                `}
              >
                {isCompleted ? (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="3"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>
              <span
                className={`mt-2 text-sm font-medium transition-colors ${
                  isActive ? 'text-blue-400' : isCompleted ? 'text-green-400' : 'text-slate-500'
                }`}
              >
                {labels[step]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const FileDropZone = ({
  onFilesSelected,
  folderMode,
  setFolderMode,
}: {
  onFilesSelected: (files: File[]) => void;
  folderMode: boolean;
  setFolderMode: (m: boolean) => void;
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesSelected(Array.from(e.dataTransfer.files));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-center gap-4 mb-2">
        <button
          onClick={() => setFolderMode(false)}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
            !folderMode ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-800 text-slate-400'
          }`}
        >
          FILES MODE
        </button>
        <button
          onClick={() => setFolderMode(true)}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
            folderMode ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-800 text-slate-400'
          }`}
        >
          FOLDER MODE
        </button>
      </div>

      <div
        className={`border-3 border-dashed rounded-2xl p-12 text-center transition-all duration-300 cursor-pointer group
          ${
            isDragging
              ? 'border-blue-500 bg-blue-500/10 scale-[1.02]'
              : 'border-slate-600 bg-slate-800/50 hover:border-blue-400 hover:bg-slate-800'
          }
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        data-testid="file-drop-zone"
      >
        <div className="w-20 h-20 mx-auto mb-6 bg-slate-700/50 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
          <svg
            className="w-10 h-10 text-blue-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
        </div>
        <h3 className="text-2xl font-bold text-white mb-2">
          {folderMode ? 'Drop Folders here' : 'Drop Files here'}
        </h3>
        <p className="text-slate-400 mb-6">or click to browse from your computer</p>
        <input
          type="file"
          multiple
          ref={fileInputRef}
          onChange={(e) => e.target.files && onFilesSelected(Array.from(e.target.files))}
          className="hidden"
          data-testid="file-input"
          {...(folderMode
            ? {
                webkitdirectory: '',
                directory: '',
              }
            : {})}
        />
        <div className="flex gap-3 justify-center text-xs text-slate-500 font-mono">
          <span className="bg-slate-900 px-2 py-1 rounded border border-slate-700">.dcm</span>
          <span className="bg-slate-900 px-2 py-1 rounded border border-slate-700">.zip</span>
          <span className="bg-slate-900 px-2 py-1 rounded border border-slate-700">
            .png / .jpg
          </span>
        </div>
      </div>
    </div>
  );
};

// --- Main Wizard Component ---

export const SmartUploadWizard = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<WizardStep>('files');
  const [folderMode, setFolderMode] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [studyId, setStudyId] = useState<number | null>(null);

  // Metadata State
  const [metadata, setMetadata] = useState<Partial<StudyMetadata>>({
    service_level: 'routine',
    modality: 'CT',
    gender: 'O',
    patient_name: '',
    study_date: '',
  });

  // Templates State
  const [templates, setTemplates] = useState<UploadTemplate[]>([]);

  // Live Query for uploading progress
  const study = useLiveQuery(() => (studyId ? db.studies.get(studyId) : undefined), [studyId]);

  // Calculate progress efficiently
  const progress = study?.progress || 0;

  useEffect(() => {
    // Load templates
    const saved = localStorage.getItem('uploadTemplates');
    if (saved) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTemplates(JSON.parse(saved));
    }
  }, []);

  const parseDicomFile = async (file: File) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const byteArray = new Uint8Array(arrayBuffer);
      const dataSet = dicomParser.parseDicom(byteArray);

      const patientNameString = dataSet.string('x00100010');
      // Format name: replace carets with spaces
      const patientName = patientNameString ? patientNameString.replace(/\^/g, ' ').trim() : '';

      const studyDateString = dataSet.string('x00080020') || '';
      // Format date: YYYYMMDD -> YYYY-MM-DD
      let studyDate = '';
      if (studyDateString && studyDateString.length === 8) {
        studyDate = `${studyDateString.substring(0, 4)}-${studyDateString.substring(
          4,
          6,
        )}-${studyDateString.substring(6, 8)}`;
      }

      const modality = dataSet.string('x00080060') || 'CT';
      const patientSex = dataSet.string('x00100040') || 'O';
      const patientAge = dataSet.string('x00101010') || '';

      const studyDescription = dataSet.string('x00081030') || '';

      setMetadata((prev) => ({
        ...prev,
        patient_name: patientName,
        study_date: studyDate,
        modality: modality,
        gender: patientSex,
        age: patientAge,
        clinical_history: prev.clinical_history || studyDescription, // Use StudyDescription as default history if empty
      }));
    } catch (error) {
      console.warn('Failed to parse DICOM file:', error);
      // Don't block upload if parsing fails, just let user enter data manually
    }
  };

  const handleFilesSelected = async (selectedFiles: File[]) => {
    setFiles(selectedFiles);
    setStep('metadata');

    // Try to parse the first DICOM file found
    const dicomFile = selectedFiles.find(
      (f) => f.name.toLowerCase().endsWith('.dcm') || f.type === 'application/dicom',
    );

    if (dicomFile) {
      await parseDicomFile(dicomFile);
    }
  };

  const saveTemplate = () => {
    const name = prompt('Template Name (e.g., "Routine CT Chest"):');
    if (name) {
      const newTemplate: UploadTemplate = {
        id: crypto.randomUUID(),
        name,
        data: {
          modality: metadata.modality,
          service_level: metadata.service_level,
          clinical_history: metadata.clinical_history,
        },
      };
      const updated = [...templates, newTemplate];
      setTemplates(updated);
      localStorage.setItem('uploadTemplates', JSON.stringify(updated));
    }
  };

  const applyTemplate = (template: UploadTemplate) => {
    setMetadata((prev) => ({ ...prev, ...template.data }));
  };

  const handleUpload = async () => {
    try {
      if (files.length === 0) return;

      // 1. Create study entry in local DB
      const fullMetadata = metadata as StudyMetadata;
      const id = await uploadManager.createStudy(files, fullMetadata);
      setStudyId(id);

      // 2. Initialize Session first (Fail fast if backend is down)
      try {
        await uploadManager.initializeSession(id);
      } catch (err) {
        console.error('Failed to initialize upload session', err);
        alert('Failed to connect to server. Please check your connection.');
        return; // Stay on metadata step
      }

      // 3. Move to uploading state only after successful init
      setStep('uploading');

      // 4. Start background upload process
      uploadManager.processUpload(id).catch((err) => {
        console.error('Upload background process failed', err);
        // The UI handles 'failed' status via useLiveQuery,
        // but we can add a toast here if needed.
      });
    } catch (error) {
      console.error('Upload preparation failed', error);
      alert('Failed to prepare upload: ' + (error as Error).message);
    }
  };

  useEffect(() => {
    if (study && study.status === 'complete' && step !== 'complete') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStep('complete');
    }
  }, [study, step]);

  // --- Render Steps ---

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-6">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
              New Study Upload
            </h1>
            <p className="text-slate-400 mt-1">Smart Ingestion Wizard</p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="text-sm text-slate-500 hover:text-white transition-colors"
          >
            Cancel & Exit
          </button>
        </header>

        <StepIndicator currentStep={step} />

        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-8 min-h-[400px] animate-in slide-in-from-bottom-4 duration-500">
          {step === 'files' && (
            <div className="space-y-6">
              <FileDropZone
                onFilesSelected={handleFilesSelected}
                folderMode={folderMode}
                setFolderMode={setFolderMode}
              />
            </div>
          )}

          {step === 'metadata' && (
            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
              <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-sm font-mono">
                    {files.length} Files Selected
                  </div>
                  <button
                    onClick={() => setStep('files')}
                    className="text-slate-400 hover:text-white text-sm underline decoration-slate-600"
                  >
                    Change Files
                  </button>
                </div>

                <div className="flex gap-2 relative group">
                  {templates.length > 0 && (
                    <div className="relative">
                      <button className="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-2 rounded text-slate-300">
                        Load Template ▼
                      </button>
                      <div className="absolute right-0 top-full mt-2 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden hidden group-hover:block z-50">
                        {templates.map((t) => (
                          <button
                            key={t.id}
                            onClick={() => applyTemplate(t)}
                            className="w-full text-left px-4 py-2 hover:bg-slate-700 text-sm"
                          >
                            {t.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Patient Details
                  </label>
                  <input
                    type="text"
                    placeholder="Patient Name (Optional)"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none transition-all mb-4"
                    value={metadata.patient_name || ''}
                    onChange={(e) => setMetadata({ ...metadata, patient_name: e.target.value })}
                    data-testid="patient-name-input"
                  />
                  <div className="mb-4">
                    <input
                      type="date"
                      placeholder="Study Date"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
                      value={metadata.study_date || ''}
                      onChange={(e) => setMetadata({ ...metadata, study_date: e.target.value })}
                      data-testid="study-date-input"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="Age (e.g. 45Y)"
                      className="bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
                      value={metadata.age || ''}
                      onChange={(e) => setMetadata({ ...metadata, age: e.target.value })}
                      data-testid="age-input"
                    />
                    <select
                      className="bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
                      value={metadata.gender || 'O'}
                      onChange={(e) => setMetadata({ ...metadata, gender: e.target.value })}
                      data-testid="gender-select"
                    >
                      <option value="M">Male</option>
                      <option value="F">Female</option>
                      <option value="O">Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Study Information
                  </label>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <select
                      className="bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
                      value={metadata.modality || 'CT'}
                      onChange={(e) => setMetadata({ ...metadata, modality: e.target.value })}
                      data-testid="modality-select"
                    >
                      <option value="CT">CT Scan</option>
                      <option value="MR">MRI</option>
                      <option value="XR">X-Ray</option>
                      <option value="US">Ultrasound</option>
                    </select>
                    <select
                      className="bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
                      value={metadata.service_level || 'routine'}
                      onChange={(e) => setMetadata({ ...metadata, service_level: e.target.value })}
                      data-testid="service-level-select"
                    >
                      <option value="routine">Routine (24h)</option>
                      <option value="stat">STAT (1h)</option>
                      <option value="emergency">Emergency (30m)</option>
                    </select>
                  </div>
                  <textarea
                    placeholder="Clinical History / Notes (Required)"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none h-24 resize-none"
                    value={metadata.clinical_history || ''}
                    onChange={(e) => setMetadata({ ...metadata, clinical_history: e.target.value })}
                    data-testid="clinical-history-input"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center pt-6 mt-6 border-t border-slate-800">
                <button
                  onClick={saveTemplate}
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  + Save as Template
                </button>
                <button
                  onClick={handleUpload}
                  disabled={!metadata.clinical_history}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-blue-900/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105"
                  data-testid="start-upload-btn"
                >
                  Start Upload
                </button>
              </div>
            </div>
          )}

          {step === 'uploading' && study && (
            <div className="text-center py-12 animate-in fade-in duration-500 space-y-8">
              <div className="relative w-48 h-48 mx-auto">
                <div className="absolute inset-0 rounded-full border-4 border-slate-800"></div>
                <div
                  className="absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"
                  style={{ borderRightColor: 'transparent', borderBottomColor: 'transparent' }}
                ></div>
                <div className="absolute inset-0 flex items-center justify-center flex-col">
                  <span className="text-4xl font-black text-white">{progress}%</span>
                  <span className="text-xs text-blue-400 mt-1 uppercase tracking-widest">
                    Uploading
                  </span>
                </div>
              </div>

              <div
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Upload progress"
                className="relative w-full h-3 bg-slate-900 rounded-full overflow-hidden mb-3 border border-slate-700"
              >
                <div
                  className="h-full bg-blue-500 transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>

              <div className="max-w-md mx-auto bg-slate-950 rounded-lg p-4 border border-slate-800 text-left">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-400">Total Files</span>
                  <span className="text-white font-mono">{study.totalFiles}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Status</span>
                  <span className="text-blue-400 font-bold uppercase">{study.status}</span>
                </div>
              </div>
            </div>
          )}

          {step === 'complete' && (
            <div
              data-testid="upload-complete-banner"
              className="text-center py-12 animate-in zoom-in duration-500"
            >
              <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-green-900/50">
                <svg
                  className="w-12 h-12 text-white"
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
              <h2 className="text-4xl font-extrabold text-white mb-2">Upload Complete</h2>
              <p className="text-slate-400 mb-8 max-w-md mx-auto">
                Study has been securely uploaded and forwarded to PACS. You can track it in the
                Reports tab.
              </p>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => navigate('/reports')}
                  className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition-colors"
                >
                  View Reports
                </button>
                <button
                  onClick={() => {
                    setStep('files');
                    setFiles([]);
                    setStudyId(null);
                    setMetadata({ service_level: 'routine', modality: 'CT', gender: 'O' });
                  }}
                  className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold transition-colors shadow-lg shadow-green-900/30"
                >
                  Upload Another
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
