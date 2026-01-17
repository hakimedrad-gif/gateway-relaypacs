/**
 * Utility to batch small requests into fewer network calls
 * Useful for analytics, notifications, and logging
 */
export class RequestBatcher<T> {
  private queue: T[] = [];
  private timer: number | null = null;
  private readonly maxBatchSize: number;
  private readonly maxWaitTime: number;
  private readonly processBatch: (items: T[]) => Promise<void>;

  constructor(
    processBatch: (items: T[]) => Promise<void>,
    options: { maxBatchSize?: number; maxWaitTime?: number } = {},
  ) {
    this.processBatch = processBatch;
    this.maxBatchSize = options.maxBatchSize || 20;
    this.maxWaitTime = options.maxWaitTime || 5000; // 5 seconds

    // Flush on page unload/visibility change
    this.setupPageLifecycle();
  }

  /**
   * Add item to the batch
   */
  add(item: T) {
    this.queue.push(item);

    // If full, flush immediately
    if (this.queue.length >= this.maxBatchSize) {
      this.flush();
      return;
    }

    // Otherwise ensure timer is running
    if (!this.timer) {
      this.timer = window.setTimeout(() => this.flush(), this.maxWaitTime);
    }
  }

  /**
   * Force process current batch
   */
  async flush() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    if (this.queue.length === 0) return;

    const itemsToProcess = [...this.queue];
    this.queue = [];

    try {
      await this.processBatch(itemsToProcess);
    } catch (error) {
      console.error('[Batcher] Failed to process batch:', error);
      // Optional: Logic to re-queue items could go here,
      // but simplistic implementations typically drop failed analytics/logs
    }
  }

  private setupPageLifecycle() {
    // Attempt to flush on visibility hidden (reliable on mobile)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.flush();
      }
    });
  }
}
