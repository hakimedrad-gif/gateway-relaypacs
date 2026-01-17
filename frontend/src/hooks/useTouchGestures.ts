import { useState, useRef, TouchEvent } from 'react';

interface TouchHandlers {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
}

interface UseTouchGesturesProps {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number;
}

export const useTouchGestures = ({
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  threshold = 50,
}: UseTouchGesturesProps): TouchHandlers => {
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const touchEnd = useRef<{ x: number; y: number } | null>(null);

  // Required for identifying swipe direction
  const minSwipeDistance = threshold;

  const onTouchStart = (e: React.TouchEvent) => {
    touchEnd.current = null; // Reset touch end
    touchStart.current = {
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    };
  };

  const onTouchMove = (e: React.TouchEvent) => {
    touchEnd.current = {
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    };
  };

  const onTouchEnd = () => {
    if (!touchStart.current || !touchEnd.current) return;

    const distanceX = touchStart.current.x - touchEnd.current.x;
    const distanceY = touchStart.current.y - touchEnd.current.y;
    const isHorizontal = Math.abs(distanceX) > Math.abs(distanceY);

    if (isHorizontal) {
      if (Math.abs(distanceX) < minSwipeDistance) return;

      if (distanceX > 0) {
        // Swiped Left
        onSwipeLeft && onSwipeLeft();
      } else {
        // Swiped Right
        onSwipeRight && onSwipeRight();
      }
    } else {
      if (Math.abs(distanceY) < minSwipeDistance) return;

      if (distanceY > 0) {
        // Swiped Up
        onSwipeUp && onSwipeUp();
      } else {
        // Swiped Down
        onSwipeDown && onSwipeDown();
      }
    }
  };

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
  };
};
