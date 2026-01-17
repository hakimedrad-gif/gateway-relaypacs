import { useEffect, useCallback, useRef } from 'react';
import { useAuth } from './useAuth';

const LOGOUT_TIMEOUT_MS = 15 * 60 * 1000; // 15 Minutes
// const LOGOUT_TIMEOUT_MS = 10 * 1000; // Debugging: 10s

export const useAutoLogout = () => {
  const { logout, isAuthenticated } = useAuth();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const performLogout = useCallback(() => {
    if (isAuthenticated) {
      console.warn('Auto-logout triggered due to inactivity.');
      logout();
    }
  }, [isAuthenticated, logout]);

  const resetTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    if (isAuthenticated) {
      timerRef.current = setTimeout(performLogout, LOGOUT_TIMEOUT_MS);
    }
  }, [isAuthenticated, performLogout]);

  useEffect(() => {
    if (!isAuthenticated) return;

    // Events to track activity
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];

    const handleActivity = () => {
      resetTimer();
    };

    // Initial timer
    resetTimer();

    // Attach listeners
    events.forEach((event) => {
      window.addEventListener(event, handleActivity);
    });

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [isAuthenticated, resetTimer]);

  return {};
};
