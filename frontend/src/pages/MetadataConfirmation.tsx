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
    clinicalNotes: ''
  });

  // Load initial data
  React.useEffect(() => {
    if (study) {
      setFormData({
        patientName: study.metadata.patientName,
        studyDate: study.metadata.studyDate,
        modality: study.metadata.modality,
        clinicalNotes: study.metadata.studyDescription || ''
      });
    }
  }, [study]);

  const handleConfirm = async () => {
    if (!study) return;
    
    // Update metadata in DB
    await db.studies.update(Number(studyId), {
      metadata: {
        patientName: formData.patientName,
        studyDate: formData.studyDate,
        modality: formData.modality,
        studyDescription: formData.clinicalNotes
      }
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
      <h2 className="text-2xl font-bold text-white">Confirm Metadata</h2>
      <p className="text-slate-400">Please verify the study details before uploading.</p>
      
      <div className="space-y-4 bg-slate-800 p-6 rounded-xl border border-slate-700">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Patient Name</label>
          <input 
            type="text" 
            value={formData.patientName}
            onChange={e => setFormData({...formData, patientName: e.target.value})}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Study Date</label>
            <input 
              type="date" 
              value={formData.studyDate}
              onChange={e => setFormData({...formData, studyDate: e.target.value})}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Modality</label>
            <input 
              type="text" 
              value={formData.modality}
              onChange={e => setFormData({...formData, modality: e.target.value})}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Clinical Notes</label>
          <textarea 
            rows={3}
            value={formData.clinicalNotes}
            onChange={e => setFormData({...formData, clinicalNotes: e.target.value})}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="Enter clinical impression or notes..."
          />
        </div>
      </div>
      
      <div className="flex gap-4">
        <button 
          onClick={() => navigate('/')}
          className="flex-1 py-3 px-4 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button 
          onClick={handleConfirm}
          className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg shadow-lg shadow-blue-900/50 transition-all active:scale-95"
        >
          Start Upload
        </button>
      </div>
    </div>
  );
};
