import { NetworkStatus } from './NetworkStatus';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { usePWAAppBadge } from '../hooks/usePWAAppBadge';
import { Outlet } from 'react-router-dom';
import { PWAInstallPrompt } from './PWAInstallPrompt';

export const Layout: React.FC = () => {
  const isOnline = useNetworkStatus();
  usePWAAppBadge();

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      <NetworkStatus />
      <PWAInstallPrompt />
      <header className="bg-slate-800/90 backdrop-blur-md p-4 border-b border-white/5 shadow-2xl sticky top-0 z-50">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/40">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-white leading-tight">
                Relay<span className="text-blue-500 text-shadow-sm shadow-blue-500/50">PACS</span>
              </h1>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-none">
                Gateway Node
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div
              aria-label={isOnline ? 'System Online' : 'System Offline'}
              className={`flex items-center gap-2 text-[10px] font-black border rounded-full px-3 py-1.5 transition-all duration-500 ${
                isOnline
                  ? 'bg-green-500/10 border-green-500/20 text-green-400'
                  : 'bg-red-500/10 border-red-500/20 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.2)]'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                }`}
              />
              {isOnline ? 'ONLINE' : 'OFFLINE'}
            </div>
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
