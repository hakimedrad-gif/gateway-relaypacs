export interface BrowserCapabilities {
  serviceWorker: boolean;
  indexedDB: boolean;
  webWorkers: boolean;
  fileAPI: boolean;
  cameraAPI: boolean;
  notifications: boolean;
  backgroundSync: boolean;
  periodicBackgroundSync: boolean;
  badging: boolean;
  webShare: boolean;
  fileSystemAccess: boolean;
  storageEstimate: boolean;
}

let cachedCapabilities: BrowserCapabilities | null = null;

export function detectCapabilities(): BrowserCapabilities {
  if (cachedCapabilities) return cachedCapabilities;

  cachedCapabilities = {
    serviceWorker: 'serviceWorker' in navigator,
    indexedDB: 'indexedDB' in window,
    webWorkers: 'Worker' in window,
    fileAPI: 'File' in window && 'FileReader' in window,
    cameraAPI: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
    notifications: 'Notification' in window,
    backgroundSync: 'serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype,
    periodicBackgroundSync:
      'serviceWorker' in navigator && 'periodicSync' in ServiceWorkerRegistration.prototype,
    badging: 'setAppBadge' in navigator,
    webShare: 'share' in navigator,
    fileSystemAccess: 'showOpenFilePicker' in window,
    storageEstimate: navigator.storage && 'estimate' in navigator.storage,
  };

  return cachedCapabilities;
}

export function isFeatureSupported(feature: keyof BrowserCapabilities): boolean {
  return detectCapabilities()[feature];
}

export function getBrowserInfo() {
  const ua = navigator.userAgent;
  return {
    browser: getBrowserName(ua),
    version: getBrowserVersion(ua),
    isMobile: /Mobile|Android|iPhone|iPad/i.test(ua),
    platform: navigator.platform,
  };
}

function getBrowserName(ua: string): string {
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('SamsungBrowser')) return 'Samsung Internet';
  if (ua.includes('Opera') || ua.includes('OPR')) return 'Opera';
  if (ua.includes('Edg')) return 'Edge';
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Safari')) return 'Safari';
  return 'Unknown';
}

function getBrowserVersion(ua: string): string {
  const match = ua.match(/(Firefox|Chrome|Safari|Edg?)\/(\d+)/);
  return match ? match[2] : 'Unknown';
}

import React, { createContext, useContext, useEffect, useState } from 'react';

const CapabilitiesContext = createContext<BrowserCapabilities | null>(null);

export const CapabilitiesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [capabilities, setCapabilities] = useState<BrowserCapabilities | null>(null);

  useEffect(() => {
    setCapabilities(detectCapabilities());
  }, []);

  if (!capabilities) return null; // Or a loader

  return (
    <CapabilitiesContext.Provider value={capabilities}>{children}</CapabilitiesContext.Provider>
  );
};

export const useCapabilities = () => {
  const context = useContext(CapabilitiesContext);
  if (!context) {
    throw new Error('useCapabilities must be used within a CapabilitiesProvider');
  }
  return context;
};
