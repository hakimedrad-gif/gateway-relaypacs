/* eslint-disable react-refresh/only-export-components */
import React from 'react';
import ReactDOM from 'react-dom/client';
import { Navigate, useParams, RouterProvider, createBrowserRouter } from 'react-router-dom';
import { Layout } from './components/Layout';
import { UploadStudy } from './pages/UploadStudy';
import { MetadataConfirmation } from './pages/MetadataConfirmation';
import { UploadProgress } from './pages/UploadProgress';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db/db';
import './index.css';

// Placeholder for completion
const Completion = () => (
  <div className="p-4 text-center text-green-400">
    <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
      <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
      </svg>
    </div>
    <h2 className="text-2xl font-bold mb-2">Success!</h2>
    <p className="text-slate-400 mb-6">Upload Complete & Verified</p>
    <a
      href="/"
      className="inline-block px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg transition-all"
    >
      Upload Another Study
    </a>
  </div>
);

// AC-18: Route Guards for Workflow Integrity
const MetadataGuard = () => {
  const { studyId } = useParams();
  const study = useLiveQuery(() => db.studies.get(Number(studyId)), [studyId]);

  if (study === undefined) return null; // Loading
  if (study === null) return <Navigate to="/" replace />;
  return <MetadataConfirmation />;
};

const ProgressGuard = () => {
  const { uploadId } = useParams();
  const study = useLiveQuery(() => db.studies.get(Number(uploadId)), [uploadId]);

  if (study === undefined) return null; // Loading
  if (study === null) return <Navigate to="/" replace />;
  return <UploadProgress />;
};

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        index: true,
        element: <UploadStudy />,
      },
      {
        path: 'metadata/:studyId',
        element: <MetadataGuard />,
      },
      {
        path: 'progress/:uploadId',
        element: <ProgressGuard />,
      },
      {
        path: 'complete/:uploadId',
        element: <Completion />,
      },
    ],
  },
]);

import { registerSW } from 'virtual:pwa-register';

// Register service worker with update handling
const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('New content available. Reload?')) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.log('App ready to work offline');
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
