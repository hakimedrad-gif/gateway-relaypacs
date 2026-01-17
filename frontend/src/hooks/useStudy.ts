import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { encryptionService } from '../services/encryption';
import type { Study } from '../db/db';

export const useStudy = (studyId: number | null) => {
  const study = useLiveQuery(async () => {
    if (!studyId) return undefined;
    const rawStudy = await db.studies.get(studyId);
    if (!rawStudy) return undefined;

    // Decrypt metadata for display
    const decryptedStudy: Study = { ...rawStudy, metadata: { ...rawStudy.metadata } };

    if (decryptedStudy.metadata.patientName) {
      try {
        decryptedStudy.metadata.patientName = await encryptionService.decrypt(
          decryptedStudy.metadata.patientName,
        );
      } catch {
        // failed to decrypt or wasn't encrypted
      }
    }

    if (decryptedStudy.metadata.clinicalHistory) {
      try {
        decryptedStudy.metadata.clinicalHistory = await encryptionService.decrypt(
          decryptedStudy.metadata.clinicalHistory,
        );
      } catch {
        // failed
      }
    }

    return decryptedStudy;
  }, [studyId]);

  return study;
};
