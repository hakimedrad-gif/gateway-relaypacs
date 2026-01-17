import { onCLS, onLCP, onFCP, onTTFB, onINP } from 'web-vitals';

export interface PerformanceMetric {
  name: string;
  value: number;
  rating?: 'good' | 'needs-improvement' | 'poor';
  delta?: number;
  id?: string;
  navigationType?: string;
  context?: Record<string, any>;
}

class RUMClient {
  private buffer: PerformanceMetric[] = [];
  private readonly batchSize = 10;
  private readonly flushInterval = 30000; // 30s
  private flushTimer?: number;

  constructor() {
    this.startPeriodicFlush();
    this.collectWebVitals();
    this.setupVisibilityHandling();
  }

  private collectWebVitals() {
    const reportMetric = (metric: any) => {
      this.logMetric({
        name: metric.name,
        value: metric.value,
        rating: metric.rating,
        delta: metric.delta,
        id: metric.id,
        navigationType: metric.navigationType,
        context: {
          url: window.location.pathname,
          userAgent: navigator.userAgent,
          connection: (navigator as any).connection?.effectiveType,
        },
      });
    };

    onCLS(reportMetric);
    onLCP(reportMetric);
    onFCP(reportMetric);
    onTTFB(reportMetric);
    onINP(reportMetric);
  }

  private setupVisibilityHandling() {
    // Flush on page hide
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.flush();
      }
    });
  }

  logMetric(metric: PerformanceMetric) {
    this.buffer.push({
      ...metric,
      context: {
        ...metric.context,
        timestamp: Date.now(),
      },
    });

    if (this.buffer.length >= this.batchSize) {
      this.flush();
    }
  }

  async flush() {
    if (this.buffer.length === 0) return;

    const metrics = [...this.buffer];
    this.buffer = [];

    try {
      // Use sendBeacon for reliability (works even when page is closing)
      const blob = new Blob([JSON.stringify({ metrics })], {
        type: 'application/json',
      });

      // In development, log to console
      if (import.meta.env.DEV) {
        console.log('[RUM] Metrics:', metrics);
      }

      // In production, send to backend
      if (import.meta.env.PROD && navigator.sendBeacon) {
        navigator.sendBeacon('/api/analytics/rum', blob);
      }
    } catch (error) {
      console.error('[RUM] Failed to send metrics:', error);
    }
  }

  private startPeriodicFlush() {
    this.flushTimer = window.setInterval(() => this.flush(), this.flushInterval);
  }
}

export const rumClient = new RUMClient();

// Export for custom metric logging
export const logCustomMetric = (metric: PerformanceMetric) => {
  rumClient.logMetric(metric);
};
