/* eslint-disable react-refresh/only-export-components */
import React from 'react';
import ReactDOM from 'react-dom/client';
import { Navigate, useParams, RouterProvider, createBrowserRouter } from 'react-router-dom';
import { Layout } from './components/Layout';
// Lazy load pages for code splitting
const UploadStudy = React.lazy(() =>
  import('./pages/UploadStudy').then((module) => ({ default: module.UploadStudy })),
);
const MetadataConfirmation = React.lazy(() =>
  import('./pages/MetadataConfirmation').then((module) => ({
    default: module.MetadataConfirmation,
  })),
);
const UploadProgress = React.lazy(() =>
  import('./pages/UploadProgress').then((module) => ({ default: module.UploadProgress })),
);
const SmartUploadWizard = React.lazy(() =>
  import('./pages/smart-upload/UploadWizard').then((module) => ({
    default: module.SmartUploadWizard,
  })),
);
const Dashboard = React.lazy(() =>
  import('./pages/Dashboard').then((module) => ({ default: module.Dashboard })),
);
const Reports = React.lazy(() => import('./pages/Reports')); // Default export
const ReportDetail = React.lazy(() => import('./pages/ReportDetail')); // Default export
const Notifications = React.lazy(() => import('./pages/Notifications')); // Default export
const Settings = React.lazy(() =>
  import('./pages/Settings').then((module) => ({ default: module.Settings })),
);
const Login = React.lazy(() =>
  import('./pages/Login').then((module) => ({ default: module.Login })),
);
const Completion = React.lazy(() =>
  import('./pages/Completion').then((module) => ({ default: module.Completion })),
);

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db/db';
import './index.css';

// Loading Fallback
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-900">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
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

const router = createBrowserRouter(
  [
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
              <SmartUploadWizard />
            </React.Suspense>
          ),
        },
        {
          path: 'upload-legacy',
          element: (
            <React.Suspense fallback={<PageLoader />}>
              <UploadStudy />
            </React.Suspense>
          ),
        },
        {
          path: 'upload-new',
          element: (
            <React.Suspense fallback={<PageLoader />}>
              <SmartUploadWizard />
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
          path: 'reports/:reportId',
          element: (
            <React.Suspense fallback={<PageLoader />}>
              <ReportDetail />
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
        {
          path: '*',
          element: <Navigate to="/" replace />,
        },
      ],
    },
  ],
  {
    future: {
      v7_normalizeFormMethod: true,
    },
  },
);

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
