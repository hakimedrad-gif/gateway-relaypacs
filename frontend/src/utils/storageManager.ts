export interface StorageInfo {
  usage: number; // Bytes
  quota: number; // Bytes
  percentUsed: number;
  available: number;
}

export async function getStorageInfo(): Promise<StorageInfo | null> {
  if (!navigator.storage || !navigator.storage.estimate) {
    return null;
  }

  try {
    const estimate = await navigator.storage.estimate();
    const usage = estimate.usage || 0;
    const quota = estimate.quota || 0;
    const percentUsed = quota > 0 ? (usage / quota) * 100 : 0;
    const available = quota - usage;

    return {
      usage,
      quota,
      percentUsed,
      available,
    };
  } catch (error) {
    console.error('[Storage] Failed to estimate storage:', error);
    return null;
  }
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function shouldWarnUser(percentUsed: number): boolean {
  return percentUsed >= 80;
}

export function canAccommodate(requiredBytes: number, available: number): boolean {
  // Add 10% buffer
  return available > requiredBytes * 1.1;
}
