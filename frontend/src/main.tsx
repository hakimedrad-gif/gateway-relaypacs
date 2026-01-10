import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { Layout } from './components/Layout';
import { UploadStudy } from './pages/UploadStudy';
import { MetadataConfirmation } from './pages/MetadataConfirmation';
import { UploadProgress } from './pages/UploadProgress';
import './index.css';

// Placeholder for completion
const Completion = () => <div className="p-4 text-center text-green-400"><h2>Success! Upload Complete.</h2><a href="/" className="underline text-white block mt-4">Upload Another</a></div>;

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
        element: <MetadataConfirmation />,
      },
      {
        path: 'progress/:uploadId',
        element: <UploadProgress />,
      },
      {
        path: 'complete/:uploadId',
        element: <Completion />,
      },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
