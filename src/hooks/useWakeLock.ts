import { useCallback, useEffect, useRef, useState } from 'react';

type WakeLockType = 'screen';

interface WakeLock {
  request(type: WakeLockType): Promise<WakeLockSentinel>;
}

interface WakeLockSentinel extends EventTarget {
  released: boolean;
  release(): Promise<void>;
}

declare global {
  interface Navigator {
    wakeLock?: WakeLock;
  }
}

export function useWakeLock() {
  const isSupported = typeof navigator !== 'undefined' && 'wakeLock' in navigator;
  const [isActive, setIsActive] = useState(false);
  const sentinelRef = useRef<WakeLockSentinel | null>(null);
  const shouldHoldRef = useRef(false);

  const attemptAcquire = useCallback(async (): Promise<boolean> => {
    if (!isSupported || sentinelRef.current || typeof navigator === 'undefined') {
      return sentinelRef.current !== null;
    }

    if (document.visibilityState !== 'visible') {
      return false;
    }

    try {
      const sentinel = await navigator.wakeLock!.request('screen');
      sentinelRef.current = sentinel;
      setIsActive(true);

      const handleRelease = () => {
        sentinel.removeEventListener('release', handleRelease);
        sentinelRef.current = null;
        setIsActive(false);

        if (shouldHoldRef.current) {
          void attemptAcquire();
        }
      };

      sentinel.addEventListener('release', handleRelease);
      return true;
    } catch (error) {
      console.warn('Wake Lock request failed:', error);
      return false;
    }
  }, [isSupported]);

  const requestWakeLock = useCallback(async () => {
    shouldHoldRef.current = true;
    return attemptAcquire();
  }, [attemptAcquire]);

  const releaseWakeLock = useCallback(async () => {
    shouldHoldRef.current = false;

    const sentinel = sentinelRef.current;
    sentinelRef.current = null;
    setIsActive(false);

    if (!sentinel) {
      return;
    }

    try {
      await sentinel.release();
    } catch (error) {
      console.warn('Failed to release wake lock:', error);
    }
  }, []);

  useEffect(() => {
    if (!isSupported) {
      return;
    }

    const handleVisibilityChange = () => {
      if (
        document.visibilityState === 'visible' &&
        shouldHoldRef.current &&
        !sentinelRef.current
      ) {
        void attemptAcquire();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [attemptAcquire, isSupported]);

  useEffect(() => {
    return () => {
      shouldHoldRef.current = false;
      if (sentinelRef.current) {
        void sentinelRef.current.release();
        sentinelRef.current = null;
      }
    };
  }, []);

  return {
    isSupported,
    isActive,
    requestWakeLock,
    releaseWakeLock
  };
}
