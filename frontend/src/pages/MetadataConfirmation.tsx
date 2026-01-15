import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { uploadManager } from '../services/uploadManager';

export const MetadataConfirmation: React.FC = () => {
  const { studyId } = useParams<{ studyId: string }>();
  const navigate = useNavigate();

  const study = useLiveQuery(() => db.studies.get(Number(studyId)), [studyId]);

  const [formData, setFormData] = useState({
    patientName: '',
    studyDate: '',
    modality: '',
    age: '',
    gender: '',
    clinicalNotes: '',
    clinicalHistory: '',
  });

  const [errors, setErrors] = useState<{ age?: string; clinicalHistory?: string }>({});

  // Load initial data - only once when study is first available
  const initialLoadDone = React.useRef(false);
  React.useEffect(() => {
    if (study && !initialLoadDone.current) {
      setFormData({
        patientName: study.metadata.patientName || '',
        studyDate: study.metadata.studyDate || '',
        modality: study.metadata.modality || '',
        age: study.metadata.age || '',
        gender: study.metadata.gender || '',
        clinicalNotes: study.metadata.studyDescription || '',
        clinicalHistory: study.metadata.clinicalHistory || '',
      });
      initialLoadDone.current = true;
    }
  }, [study]);

  // AC-20: Immediate Persistence for clinical notes
  React.useEffect(() => {
    if (study && formData.clinicalNotes !== study.metadata.studyDescription) {
      const timeoutId = setTimeout(async () => {
        await db.studies.update(Number(studyId), {
          'metadata.studyDescription': formData.clinicalNotes,
        });
      }, 500); // Debounce save
      return () => clearTimeout(timeoutId);
    }
  }, [formData.clinicalNotes, studyId, study]);

  // AC-23: Navigation Safeguard
  React.useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Validation helpers
  const validateAge = (age: string): string | undefined => {
    if (!age) return 'Age is required';
    // Format: numbers followed by Y/M/D/W (e.g., "45Y", "6M", "2W")
    const ageRegex = /^\d+[YMDW]$/i;
    if (!ageRegex.test(age)) {
      return 'Age format: e.g., 45Y, 6M, 2W, 10D';
    }
    return undefined;
  };

  const validateClinicalHistory = (history: string): string | undefined => {
    if (!history || history.trim().length === 0) return 'Clinical history is required';
    if (history.length > 500) return 'Clinical history must be 500 characters or less';
    return undefined;
  };

  // Validate on change
  React.useEffect(() => {
    const newErrors: { age?: string; clinicalHistory?: string } = {};
    const ageError = validateAge(formData.age);
    const historyError = validateClinicalHistory(formData.clinicalHistory);
    if (ageError) newErrors.age = ageError;
    if (historyError) newErrors.clinicalHistory = historyError;
    setErrors(newErrors);
  }, [formData.age, formData.clinicalHistory]);

  // Check if form is valid
  const isFormValid =
    formData.age && formData.gender && formData.clinicalHistory && Object.keys(errors).length === 0;

  const handleConfirm = async () => {
    if (!study) return;

    // Final update before upload
    await db.studies.update(Number(studyId), {
      metadata: {
        ...study.metadata,
        age: formData.age,
        gender: formData.gender,
        studyDescription: formData.clinicalNotes,
        clinicalHistory: formData.clinicalHistory,
      },
    });

    // Start Upload
    try {
      // 1. Initialize the session - this might fail (e.g. network error)
      // If it fails, we stay on this page and show an alert.
      await uploadManager.initializeSession(Number(studyId));

      // 2. Start the background processing (chunks)
      // We don't await this as it happens in the background while user sees progress
      uploadManager.processUpload(Number(studyId)).catch((err) => {
        console.error('Background upload process failed:', err);
      });

      // 3. Navigate to progress page
      navigate(`/progress/${studyId}`);
    } catch (err) {
      console.error('Failed to start upload:', err);
      alert('Failed to start upload. Please try again.');
    }
  };

  if (!study) return <div>Loading...</div>;

  return (
    <div className="max-w-xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Confirm Metadata</h2>
        <div className="px-3 py-1 bg-blue-500/20 text-blue-400 text-xs font-bold rounded-full border border-blue-500/30 flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
          SECURE UPLOAD
        </div>
      </div>
      <p className="text-slate-400">Please verify the study details before uploading.</p>

      <div className="space-y-4 bg-slate-800 p-6 rounded-xl border border-slate-700">
        <div>
          <label htmlFor="patientName" className="block text-sm font-medium text-slate-300 mb-1">
            Patient Name
          </label>
          <input
            id="patientName"
            type="text"
            readOnly
            value={formData.patientName}
            className="w-full bg-slate-900/50 border border-slate-700 rounded-lg p-3 text-slate-400 cursor-not-allowed outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="studyDate" className="block text-sm font-medium text-slate-300 mb-1">
              Study Date
            </label>
            <input
              id="studyDate"
              type="text"
              readOnly
              value={formData.studyDate}
              className="w-full bg-slate-900/50 border border-slate-700 rounded-lg p-3 text-slate-400 cursor-not-allowed outline-none"
            />
          </div>
          <div>
            <label htmlFor="modality" className="block text-sm font-medium text-slate-300 mb-1">
              Modality
            </label>
            <input
              id="modality"
              type="text"
              readOnly
              value={formData.modality}
              className="w-full bg-slate-900/50 border border-slate-700 rounded-lg p-3 text-slate-400 cursor-not-allowed outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="age" className="block text-sm font-medium text-slate-300 mb-1">
              Age (Confirm) <span className="text-red-400">*</span>
            </label>
            <input
              id="age"
              type="text"
              value={formData.age}
              onChange={(e) => setFormData({ ...formData, age: e.target.value })}
              className={`w-full bg-slate-900 border rounded-lg p-3 text-white focus:ring-2 outline-none ${
                errors.age
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-slate-700 focus:ring-blue-500'
              }`}
              placeholder="e.g. 45Y, 6M, 2W"
            />
            {errors.age && <p className="text-red-400 text-xs mt-1">{errors.age}</p>}
          </div>
          <div>
            <label htmlFor="gender" className="block text-sm font-medium text-slate-300 mb-1">
              Gender (Confirm) <span className="text-red-400">*</span>
            </label>
            <select
              id="gender"
              value={formData.gender}
              onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
              className={`w-full bg-slate-900 border rounded-lg p-3 text-white focus:ring-2 outline-none ${
                !formData.gender ? 'border-red-500/50' : 'border-slate-700 focus:ring-blue-500'
              }`}
            >
              <option value="">Select Gender</option>
              <option value="M">Male (M)</option>
              <option value="F">Female (F)</option>
              <option value="O">Other (O)</option>
            </select>
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <label htmlFor="clinicalHistory" className="block text-sm font-medium text-slate-300">
              Clinical History <span className="text-red-400">*</span>
            </label>
            <span className="text-xs text-slate-500">{formData.clinicalHistory.length}/500</span>
          </div>
          <textarea
            id="clinicalHistory"
            rows={3}
            maxLength={500}
            value={formData.clinicalHistory}
            onChange={(e) => setFormData({ ...formData, clinicalHistory: e.target.value })}
            className={`w-full bg-slate-900 border rounded-lg p-4 text-white focus:ring-2 outline-none transition-all ${
              errors.clinicalHistory
                ? 'border-red-500 focus:ring-red-500'
                : 'border-slate-700 focus:ring-blue-500'
            }`}
            placeholder="Reason for study, symptoms, previous relevant history..."
          />
          {errors.clinicalHistory && (
            <p className="text-red-400 text-xs mt-1">{errors.clinicalHistory}</p>
          )}
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <label htmlFor="clinicalNotes" className="block text-sm font-medium text-slate-300">
              Additional Notes
            </label>
            <span className="text-xs text-slate-500">{formData.clinicalNotes.length}/200</span>
          </div>
          <textarea
            id="clinicalNotes"
            rows={2}
            maxLength={200}
            value={formData.clinicalNotes}
            onChange={(e) => setFormData({ ...formData, clinicalNotes: e.target.value })}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-4 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            placeholder="Clinical impression, additional observations..."
          />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <button
          onClick={() => navigate('/')}
          className="flex-1 py-4 px-4 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors font-medium text-lg min-h-[44px]"
        >
          Cancel
        </button>
        <button
          onClick={handleConfirm}
          disabled={!isFormValid}
          data-testid="confirm-upload-button"
          className={`flex-1 py-4 px-4 text-white font-bold rounded-lg shadow-lg transition-all text-lg min-h-[44px] ${
            isFormValid
              ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/50 active:scale-95'
              : 'bg-slate-600 cursor-not-allowed opacity-50'
          }`}
        >
          Confirm & Upload
        </button>
      </div>
    </div>
  );
};
