import { useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';

export const usePWAAppBadge = () => {
  const pendingCount = useLiveQuery(
    () => db.studies.where('status').anyOf(['queued', 'uploading', 'failed']).count(),
    [],
  );

  useEffect(() => {
    const updateBadge = async () => {
      if ('setAppBadge' in navigator) {
        try {
          const nav = navigator as unknown as {
            setAppBadge: (c: number) => Promise<void>;
            clearAppBadge: () => Promise<void>;
          };
          if (pendingCount !== undefined && pendingCount > 0) {
            await nav.setAppBadge(pendingCount);
          } else {
            await nav.clearAppBadge();
          }
        } catch (error) {
          console.error('Failed to update PWA badge:', error);
        }
      }
    };

    updateBadge();
  }, [pendingCount]);
};
