import React from 'react';
import { Outlet } from 'react-router-dom';

export const Layout: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      <header className="bg-slate-800 p-4 border-b border-slate-700 shadow-md sticky top-0 z-50">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img src="/pwa-192x192.png" alt="RelayPACS Logo" className="w-8 h-8 rounded-lg" />
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              RelayPACS
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {/* Status indicators will go here */}
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" title="Online"></span>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto p-4 max-w-md md:max-w-2xl">
        <Outlet />
      </main>

      <footer className="p-4 text-center text-slate-500 text-sm">
        <p>&copy; {new Date().getFullYear()} RelayPACS - Secure DICOM Ingestion</p>
      </footer>
    </div>
  );
};
