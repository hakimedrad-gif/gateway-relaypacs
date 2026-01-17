import React, { useEffect, useState } from 'react';
import { useNetworkQuality } from '../hooks/useNetworkQuality';

export const OfflineIndicator: React.FC = () => {
  const { state, quality } = useNetworkQuality();
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Show banner if offline or poor connection
    setShowBanner(!state.online || quality === 'poor');
  }, [state.online, quality]);

  if (!showBanner) return null;

  const isOffline = !state.online;

  return (
    <div
      className={`
      fixed top-0 left-0 right-0 z-50 px-4 py-2 text-center text-sm font-medium
      transition-colors duration-300
      ${isOffline ? 'bg-red-600 text-white' : 'bg-yellow-500 text-black'}
    `}
    >
      <div className="flex items-center justify-center gap-2">
        {isOffline ? (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 011.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
              />
            </svg>
            <span>You are offline. Changes will serve from cache and sync when online.</span>
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            <span>Poor network connection detected. Using data saver mode.</span>
          </>
        )}
      </div>
    </div>
  );
};
