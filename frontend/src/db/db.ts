import { Dexie } from 'dexie';
import type { Table } from 'dexie';
import { encryptionService } from '../services/encryption';
import type {
  StudyMetadata,
  Study,
  FileRecord,
  ChunkRecord,
  CacheMetadata,
  SyncQueueItem,
} from '../types';

// Database class
export class RelayPACSDB extends Dexie {
  studies!: Table<Study, number>;
  files!: Table<FileRecord, number>;
  chunks!: Table<ChunkRecord, number>;
  cacheMetadata!: Table<CacheMetadata, number>;
  syncQueue!: Table<SyncQueueItem, number>;

  constructor() {
    super('RelayPACSDB');

    // Version 1 (existing schema)
    this.version(1).stores({
      studies: '++id, status, createdAt',
      files: '++id, studyId, fileName',
      chunks: '++id, fileId, [fileId+index]',
    });

    // Version 2 (add cache metadata and sync queue)
    this.version(2).stores({
      studies: '++id, status, createdAt',
      files: '++id, studyId, fileName',
      chunks: '++id, fileId, [fileId+index]',
      cacheMetadata: '++id, resourceUrl, lastAccessed',
      syncQueue: '++id, status, createdAt',
    });

    // --- Encryption Hooks ---
    // These hooks auto-encrypt sensitive fields before they are saved to IndexedDB.
    // Note: encryptionService is imported dynamically to avoid circular deps if needed,
    // but here we rely on the service being singleton.

    // --- Encryption Hooks ---
    // These hooks auto-encrypt sensitive fields before they are saved to IndexedDB.

    // Creating Hook
    this.studies.hook('creating', async (primKey, obj) => {
      const encryptedMeta = { ...obj.metadata };
      // Encrypt sensitive fields if present
      if (encryptedMeta.patientName) {
        encryptedMeta.patientName = await encryptionService.encrypt(encryptedMeta.patientName);
      }
      if (encryptedMeta.clinicalHistory) {
        encryptedMeta.clinicalHistory = await encryptionService.encrypt(
          encryptedMeta.clinicalHistory,
        );
      }
      return { ...obj, metadata: encryptedMeta };
    });

    // Updating Hook
    this.studies.hook('updating', async (mods, primKey, obj, trans) => {
      // Check if any metadata fields are being updated
      // Case 1: metadata object replacement
      if ('metadata' in mods) {
        const newMeta = { ...(mods as any).metadata };
        if (newMeta.patientName)
          newMeta.patientName = await encryptionService.encrypt(newMeta.patientName);
        if (newMeta.clinicalHistory)
          newMeta.clinicalHistory = await encryptionService.encrypt(newMeta.clinicalHistory);
        return { ...mods, metadata: newMeta };
      }

      // Case 2: Dot notation updates (e.g. 'metadata.patientName')
      // Note: we can modify 'mods' in place but better to return a new object with changes
      const newMods = { ...mods };
      let hasChanges = false;

      // Check specific encrypted fields
      if ('metadata.patientName' in newMods) {
        newMods['metadata.patientName'] = await encryptionService.encrypt(
          newMods['metadata.patientName'] as string,
        );
        hasChanges = true;
      }

      if ('metadata.clinicalHistory' in newMods) {
        newMods['metadata.clinicalHistory'] = await encryptionService.encrypt(
          newMods['metadata.clinicalHistory'] as string,
        );
        hasChanges = true;
      }

      return hasChanges ? newMods : undefined;
    });
  }
}

export const db = new RelayPACSDB();
