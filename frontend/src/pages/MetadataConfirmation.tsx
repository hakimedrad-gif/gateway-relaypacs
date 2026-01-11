import React, { useState } from 'react';
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
    clinicalNotes: '',
  });

  // Load initial data
  React.useEffect(() => {
    if (study) {
      setFormData({
        patientName: study.metadata.patientName,
        studyDate: study.metadata.studyDate,
        modality: study.metadata.modality,
        clinicalNotes: study.metadata.studyDescription || '',
      });
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

  const handleConfirm = async () => {
    if (!study) return;

    // Final update before upload
    await db.studies.update(Number(studyId), {
      metadata: {
        ...study.metadata,
        studyDescription: formData.clinicalNotes,
      },
    });

    // Start Upload
    try {
      await uploadManager.startUpload(Number(studyId));
      navigate(`/progress/${studyId}`);
    } catch (err) {
      console.error(err);
      alert('Failed to start upload');
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

        <div>
          <label htmlFor="clinicalNotes" className="block text-sm font-medium text-slate-300 mb-1">
            Clinical Notes (Editable)
          </label>
          <textarea
            id="clinicalNotes"
            rows={3}
            value={formData.clinicalNotes}
            onChange={(e) => setFormData({ ...formData, clinicalNotes: e.target.value })}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-4 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            placeholder="Enter clinical impression or notes..."
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
          className="flex-1 py-4 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg shadow-lg shadow-blue-900/50 transition-all active:scale-95 text-lg min-h-[44px]"
        >
          Confirm & Upload
        </button>
      </div>
    </div>
  );
};
