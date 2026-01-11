import * as React from 'react';
import { useEffect, useState } from 'react';

export const PWAInstallPrompt: React.FC = () => {
  interface BeforeInstallPromptEvent extends Event {
    readonly platforms: string[];
    readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
    prompt(): Promise<void>;
  }

  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      const installEvent = e as BeforeInstallPromptEvent;
      installEvent.preventDefault();
      setDeferredPrompt(installEvent);
      // Only show if not already installed/standalone
      if (!window.matchMedia('(display-mode: standalone)').matches) {
        setIsVisible(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsVisible(false);
    }
    setDeferredPrompt(null);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 z-[60] animate-bounce-subtle">
      <div className="bg-blue-600 text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between border-b-4 border-blue-800">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-lg">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
          </div>
          <div>
            <p className="font-bold text-sm">Add to Home Screen</p>
            <p className="text-xs text-blue-100">Install for offline clinical use</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsVisible(false)}
            className="px-3 py-1.5 text-xs font-semibold hover:bg-white/10 rounded-lg transition-colors"
          >
            Later
          </button>
          <button
            onClick={handleInstall}
            className="px-4 py-1.5 bg-white text-blue-600 font-bold text-xs rounded-lg shadow-sm hover:bg-blue-50 transition-colors"
          >
            Install
          </button>
        </div>
      </div>
    </div>
  );
};
