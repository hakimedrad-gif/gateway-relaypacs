import { useState, useEffect, useCallback } from 'react';

export type NetworkQuality = 'good' | 'fair' | 'poor' | 'offline';

interface NetworkState {
  online: boolean;
  effectiveType: 'slow-2g' | '2g' | '3g' | '4g';
  rtt: number; // Round-trip time in ms
  downlink: number; // Downlink speed in Mbps
  saveData: boolean;
}

interface NetworkQualityContext {
  state: NetworkState;
  quality: NetworkQuality;
  throughput: number; // Measured upload speed in bytes/sec
  recommendedChunkSize: number; // Bytes
  reportUploadMetric: (bytes: number, durationMs: number) => void;
}

// Default chunk sizes
const CHUNK_SIZES = {
  GOOD: 5 * 1024 * 1024, // 5MB
  FAIR: 1024 * 1024, // 1MB
  POOR: 256 * 1024, // 256KB
};

export function useNetworkQuality(): NetworkQualityContext {
  // Initial state from navigator.connection if available
  const getInitialState = (): NetworkState => {
    const conn = (navigator as any).connection || {};
    return {
      online: navigator.onLine,
      effectiveType: conn.effectiveType || '4g',
      rtt: conn.rtt || 0,
      downlink: conn.downlink || 10,
      saveData: conn.saveData || false,
    };
  };

  const [state, setState] = useState<NetworkState>(getInitialState());
  const [throughput, setThroughput] = useState<number>(0); // 0 = unknown

  // Update state when network conditions change
  useEffect(() => {
    const handleOnline = () => setState((s) => ({ ...s, online: true }));
    const handleOffline = () => setState((s) => ({ ...s, online: false }));

    const conn = (navigator as any).connection;
    const handleChange = () => {
      setState((s) => ({
        ...s,
        effectiveType: conn.effectiveType,
        rtt: conn.rtt,
        downlink: conn.downlink,
        saveData: conn.saveData,
      }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    if (conn) {
      conn.addEventListener('change', handleChange);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (conn) {
        conn.removeEventListener('change', handleChange);
      }
    };
  }, []);

  // Calculate quality buffer based on state + throughput
  const quality: NetworkQuality = !state.online
    ? 'offline'
    : throughput > 2 * 1024 * 1024 || (state.effectiveType === '4g' && state.rtt < 100)
      ? 'good'
      : throughput > 500 * 1024 || state.effectiveType === '3g'
        ? 'fair'
        : 'poor';

  // Determine ideal chunk size
  const recommendedChunkSize =
    quality === 'good'
      ? CHUNK_SIZES.GOOD
      : quality === 'fair'
        ? CHUNK_SIZES.FAIR
        : quality === 'poor'
          ? CHUNK_SIZES.POOR
          : CHUNK_SIZES.POOR; // Default to small for offline/unknown

  // Function for upload components to report actual performance
  const reportUploadMetric = useCallback((bytes: number, durationMs: number) => {
    if (durationMs <= 0) return;
    const downloadSpeed = (bytes / durationMs) * 1000; // bytes per second

    // Simple moving average (weight new measurement by 30%)
    setThroughput((prev) => {
      if (prev === 0) return downloadSpeed;
      return prev * 0.7 + downloadSpeed * 0.3;
    });
  }, []);

  return {
    state,
    quality,
    throughput,
    recommendedChunkSize,
    reportUploadMetric,
  };
}
