import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

export const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      // Check if user has dismissed it recently (e.g., last 7 days)
      const dismissed = localStorage.getItem('pwa_install_dismissed');
      if (dismissed) {
        const timestamp = parseInt(dismissed, 10);
        if (Date.now() - timestamp < 7 * 24 * 60 * 60 * 1000) {
          return;
        }
      }
      // Only show if not already installed/standalone
      if (!window.matchMedia('(display-mode: standalone)').matches) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
      setDeferredPrompt(null);
      setShowPrompt(false);
    } else {
      console.log('User dismissed the install prompt');
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Remember dismissal
    localStorage.setItem('pwa_install_dismissed', Date.now().toString());
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-5 flex items-start gap-4 z-[9999] animate-in slide-in-from-bottom-4 fade-in duration-500">
      <div className="bg-blue-600/20 p-3 rounded-full shrink-0">
        <Download className="text-blue-500" size={24} />
      </div>

      <div className="flex-1">
        <h3 className="font-bold text-white text-lg mb-1">Install RelayPACS</h3>
        <p className="text-slate-400 text-sm mb-4 leading-relaxed">
          Get the full experience with offline access, faster uploads, and home screen access.
        </p>

        <div className="flex items-center gap-3">
          <button
            onClick={handleInstall}
            className="flex-1 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors shadow-lg shadow-blue-900/20"
          >
            Install App
          </button>
          <button
            onClick={handleDismiss}
            className="px-4 py-2.5 text-slate-400 hover:text-white text-sm font-medium transition-colors"
          >
            Maybe Later
          </button>
        </div>
      </div>

      <button
        onClick={handleDismiss}
        className="text-slate-500 hover:text-white transition-colors p-1"
        aria-label="Dismiss"
      >
        <X size={20} />
      </button>
    </div>
  );
};
