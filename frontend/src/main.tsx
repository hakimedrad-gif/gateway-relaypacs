/* eslint-disable react-refresh/only-export-components */
import React from 'react';
import ReactDOM from 'react-dom/client';
import { Navigate, useParams, RouterProvider, createBrowserRouter } from 'react-router-dom';
import { Layout } from './components/Layout';
// Lazy load pages for code splitting
const UploadStudy = React.lazy(() => import('./pages/UploadStudy').then(module => ({ default: module.UploadStudy })));
const MetadataConfirmation = React.lazy(() => import('./pages/MetadataConfirmation').then(module => ({ default: module.MetadataConfirmation })));
const UploadProgress = React.lazy(() => import('./pages/UploadProgress').then(module => ({ default: module.UploadProgress })));
const Dashboard = React.lazy(() => import('./pages/Dashboard').then(module => ({ default: module.Dashboard })));
const Reports = React.lazy(() => import('./pages/Reports')); // Default export
const Notifications = React.lazy(() => import('./pages/Notifications')); // Default export
const Settings = React.lazy(() => import('./pages/Settings').then(module => ({ default: module.Settings })));
const Login = React.lazy(() => import('./pages/Login').then(module => ({ default: module.Login })));

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db/db';
import './index.css';

// Loading Fallback
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-900">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
  </div>
);

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

import { useAuth } from './hooks/useAuth';

// AC-18: Route Guards for Workflow Integrity
const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

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
    path: '/login',
    element: (
      <React.Suspense fallback={<PageLoader />}>
        <Login />
      </React.Suspense>
    ),
  },
  {
    path: '/',
    element: (
      <AuthGuard>
        <Layout />
      </AuthGuard>
    ),
    children: [
      {
        index: true,
        element: (
          <React.Suspense fallback={<PageLoader />}>
            <UploadStudy />
          </React.Suspense>
        ),
      },
      {
        path: 'dashboard',
        element: (
          <React.Suspense fallback={<PageLoader />}>
            <Dashboard />
          </React.Suspense>
        ),
      },
      {
        path: 'reports',
        element: (
          <React.Suspense fallback={<PageLoader />}>
            <Reports />
          </React.Suspense>
        ),
      },
      {
        path: 'notifications',
        element: (
          <React.Suspense fallback={<PageLoader />}>
            <Notifications />
          </React.Suspense>
        ),
      },
      {
        path: 'settings',
        element: (
          <React.Suspense fallback={<PageLoader />}>
            <Settings />
          </React.Suspense>
        ),
      },
      {
        path: 'metadata/:studyId',
        element: (
          <React.Suspense fallback={<PageLoader />}>
            <MetadataGuard />
          </React.Suspense>
        ),
      },
      {
        path: 'progress/:uploadId',
        element: (
          <React.Suspense fallback={<PageLoader />}>
            <ProgressGuard />
          </React.Suspense>
        ),
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
