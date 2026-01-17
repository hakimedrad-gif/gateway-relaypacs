import { useState, useEffect } from 'react';
import type { StorageInfo } from '../utils/storageManager';
import { getStorageInfo } from '../utils/storageManager';

export function useStorageMonitor(intervalMs: number = 60000) {
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkStorage = async () => {
      const info = await getStorageInfo();
      setStorageInfo(info);
      setIsLoading(false);
    };

    checkStorage();
    const interval = setInterval(checkStorage, intervalMs);

    return () => clearInterval(interval);
  }, [intervalMs]);

  return { storageInfo, isLoading };
}
