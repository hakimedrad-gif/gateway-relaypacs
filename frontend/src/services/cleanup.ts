import { db } from '../db/db';

export class CleanupService {
  private static instance: CleanupService;
  private readonly RETENTION_MS = 24 * 60 * 60 * 1000; // 24 hours

  private constructor() {}

  public static getInstance(): CleanupService {
    if (!CleanupService.instance) {
      CleanupService.instance = new CleanupService();
    }
    return CleanupService.instance;
  }

  async runCleanup(): Promise<void> {
    const now = Date.now();
    const cutoff = new Date(now - this.RETENTION_MS);

    try {
      console.log('Running secure data cleanup...');

      // Find stale studies
      // We need to iterate because Dexie 'below' on createdAt works but we might want status check too
      // or key range.
      // Simplest: createdAt < cutoff
      const staleStudies = await db.studies.where('createdAt').below(cutoff).toArray();

      let deletedCount = 0;

      for (const study of staleStudies) {
        // Double check status - though we might want to delete even incomplete ones if they are too old?
        // Requirement: "Delete partial/stale uploads after 24 hours".
        // Completed uploads should be deleted immediately after completion (UploadManager handles this).
        // So anything lingering > 24h is likely abandoned or failed.

        if (study.id) {
          // Cascade delete files
          await db.files.where('studyId').equals(study.id).delete();
          await db.studies.delete(study.id);
          deletedCount++;
        }
      }

      if (deletedCount > 0) {
        console.log(`Cleaned up ${deletedCount} stale studies.`);
      }
    } catch (e) {
      console.error('Data cleanup failed:', e);
    }
  }

  // Schedule cleanup to run periodically (e.g., on app start and then every hour)
  schedule() {
    this.runCleanup();
    setInterval(() => this.runCleanup(), 60 * 60 * 1000);
  }
}

export const cleanupService = CleanupService.getInstance();
