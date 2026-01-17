import { db } from './db';

/**
 * Prune old data from IndexedDB to maintain storage quotas
 * Implements LRU-like eviction based on createdAt or lastAccessed
 */
export async function pruneOldData() {
  const MAX_LOGS_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days
  const MAX_SYNC_QUEUE_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days
  const MAX_CACHE_METADATA_COUNT = 1000;

  try {
    const now = Date.now();

    // 1. Clean up old completed sync queue items
    const oldSyncItems = await db.syncQueue
      .where('createdAt')
      .below(new Date(now - MAX_SYNC_QUEUE_AGE))
      .filter((item) => item.status === 'completed')
      .delete();

    if (oldSyncItems > 0) {
      console.log(`[DB] Pruned ${oldSyncItems} old sync queue items`);
    }

    // 2. Clean up cache metadata if over limit (LRU)
    const cacheCount = await db.cacheMetadata.count();
    if (cacheCount > MAX_CACHE_METADATA_COUNT) {
      const deleteCount = cacheCount - MAX_CACHE_METADATA_COUNT;
      // Find oldest accessed items
      const oldestItems = await db.cacheMetadata.orderBy('lastAccessed').limit(deleteCount).keys();

      await db.cacheMetadata.bulkDelete(oldestItems);
      console.log(`[DB] Pruned ${deleteCount} cache metadata items (LRU)`);
    }

    // 3. Clean up orphaned chunks (files that don't exist)
    // This is expensive, so maybe run less frequently or on demand
    // For now, let's just log potential issues
  } catch (error) {
    console.error('[DB] Failed to prune data:', error);
  }
}

/**
 * Run database maintenance tasks
 * Should be called on app startup or when idle
 */
export function scheduleMaintenance() {
  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(() => {
      pruneOldData();
    });
  } else {
    setTimeout(pruneOldData, 5000);
  }
}
