import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// Create a mock for useNetworkStatus
const mockNavigatorOnLine = vi.fn(() => true);

describe('useNetworkStatus Hook', () => {
  beforeEach(() => {
    // Mock navigator.onLine
    Object.defineProperty(window.navigator, 'onLine', {
      value: true,
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return true when online', async () => {
    Object.defineProperty(window.navigator, 'onLine', {
      value: true,
      configurable: true,
    });

    // Import the hook dynamically to get fresh state
    const { useNetworkStatus } = await import('../useNetworkStatus');
    const { result } = renderHook(() => useNetworkStatus());

    expect(result.current).toBe(true);
  });

  it('should return false when offline', async () => {
    Object.defineProperty(window.navigator, 'onLine', {
      value: false,
      configurable: true,
    });

    const { useNetworkStatus } = await import('../useNetworkStatus');
    const { result } = renderHook(() => useNetworkStatus());

    expect(result.current).toBe(false);
  });

  it('should update when online status changes', async () => {
    Object.defineProperty(window.navigator, 'onLine', {
      value: true,
      configurable: true,
      writable: true,
    });

    const { useNetworkStatus } = await import('../useNetworkStatus');
    const { result } = renderHook(() => useNetworkStatus());

    expect(result.current).toBe(true);

    // Simulate going offline
    act(() => {
      Object.defineProperty(window.navigator, 'onLine', {
        value: false,
        configurable: true,
      });
      window.dispatchEvent(new Event('offline'));
    });

    await waitFor(() => {
      expect(result.current).toBe(false);
    });
  });
});
