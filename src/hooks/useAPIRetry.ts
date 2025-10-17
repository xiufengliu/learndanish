import { useState, useCallback } from 'react';
import { retryWithBackoff, RetryConfig, DEFAULT_RETRY_CONFIG } from '../utils/retryLogic';

interface UseAPIRetryResult<T> {
  execute: () => Promise<T>;
  isRetrying: boolean;
  retryCount: number;
  error: Error | null;
  reset: () => void;
}

export function useAPIRetry<T>(
  apiCall: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): UseAPIRetryResult<T> {
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  const fullConfig: RetryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };

  const execute = useCallback(async (): Promise<T> => {
    setIsRetrying(true);
    setError(null);
    setRetryCount(0);

    try {
      const result = await retryWithBackoff(
        async () => {
          setRetryCount(prev => prev + 1);
          return await apiCall();
        },
        fullConfig
      );
      setIsRetrying(false);
      return result;
    } catch (err) {
      const error = err as Error;
      setError(error);
      setIsRetrying(false);
      throw error;
    }
  }, [apiCall, fullConfig]);

  const reset = useCallback(() => {
    setIsRetrying(false);
    setRetryCount(0);
    setError(null);
  }, []);

  return {
    execute,
    isRetrying,
    retryCount,
    error,
    reset
  };
}
