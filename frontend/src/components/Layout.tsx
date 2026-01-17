import { NetworkStatus } from './NetworkStatus';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { usePWAAppBadge } from '../hooks/usePWAAppBadge';
import { Outlet } from 'react-router-dom';
import { PWAInstallPrompt } from './PWAInstallPrompt';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import NotificationBell from './notifications/NotificationBell';
import { SkipNavigation } from './SkipNavigation';
import { useAutoLogout } from '../hooks/useAutoLogout';

export const Layout: React.FC = () => {
  const isOnline = useNetworkStatus();
  const { logout } = useAuth();
  const navigate = useNavigate();
  usePWAAppBadge();
  useAutoLogout(); // Auto-logout on inactivity

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      <SkipNavigation mainContentId="main-content" />
      <NetworkStatus />
      <PWAInstallPrompt />
      <header
        role="banner"
        className="bg-slate-800/90 backdrop-blur-md p-4 border-b border-white/5 shadow-2xl sticky top-0 z-50"
      >
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
          <nav className="hidden md:flex items-center gap-6 ml-12">
            <button
              onClick={() => navigate('/')}
              className="text-sm font-bold text-slate-400 hover:text-white transition-colors"
            >
              UPLOAD
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="text-sm font-bold text-slate-400 hover:text-white transition-colors"
            >
              DASHBOARD
            </button>
            <button
              onClick={() => navigate('/reports')}
              className="text-sm font-bold text-slate-400 hover:text-white transition-colors"
            >
              REPORT STATUS
            </button>
          </nav>
          <div className="flex items-center gap-3">
            {/* Notification Bell */}
            <NotificationBell />

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
            <button
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-white transition-colors"
              title="Logout"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <main
        id="main-content"
        role="main"
        className="flex-1 container mx-auto p-4 max-w-md md:max-w-2xl pb-24 md:pb-8"
      >
        <Outlet />
      </main>

      {/* Mobile Navigation */}
      <nav
        role="navigation"
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-800 border-t border-white/5 p-4 flex justify-around items-center z-50"
      >
        <button
          onClick={() => navigate('/')}
          className="flex flex-col items-center gap-1 text-slate-400 hover:text-blue-500 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
            />
          </svg>
          <span className="text-[10px] font-bold">UPLOAD</span>
        </button>
        <button
          onClick={() => navigate('/dashboard')}
          className="flex flex-col items-center gap-1 text-slate-400 hover:text-blue-500 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2"
            />
          </svg>
          <span className="text-[10px] font-bold">DASHBOARD</span>
        </button>
        <button
          onClick={() => navigate('/reports')}
          className="flex flex-col items-center gap-1 text-slate-400 hover:text-blue-500 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <span className="text-[10px] font-bold">REPORT STATUS</span>
        </button>
        <button
          onClick={() => navigate('/notifications')}
          className="flex flex-col items-center gap-1 text-slate-400 hover:text-blue-500 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
          <span className="text-[10px] font-bold">NOTIFS</span>
        </button>
      </nav>

      <footer className="p-4 text-center text-slate-500 text-sm">
        <p>&copy; {new Date().getFullYear()} RelayPACS - Secure DICOM Ingestion</p>
      </footer>
    </div>
  );
};
