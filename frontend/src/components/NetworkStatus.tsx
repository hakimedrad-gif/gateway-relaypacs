import * as React from 'react';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

export const NetworkStatus: React.FC = () => {
  const isOnline = useNetworkStatus();

  if (isOnline) return null;

  return (
    <div className="bg-amber-600 text-white px-4 py-2 text-center text-sm font-medium animate-pulse">
      You are currently offline. Uploads will be queued and resumed automatically when online.
    </div>
  );
};
