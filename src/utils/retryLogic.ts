// Retry logic with exponential backoff

export interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2
};

const sleep = (ms: number): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, ms));

export function isNonRetryableError(error: any): boolean {
  // Don't retry on authentication errors, invalid requests, etc.
  if (error?.status === 401 || error?.status === 400 || error?.status === 403) {
    return true;
  }
  
  // Don't retry on specific error messages
  if (error?.message?.includes('Invalid API key')) {
    return true;
  }
  
  return false;
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<T> {
  let lastError: Error;
  let delay = config.initialDelay;
  
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      console.log(`Attempt ${attempt + 1} failed:`, error);
      
      // Don't retry on certain errors
      if (isNonRetryableError(error)) {
        throw error;
      }
      
      // If this was the last attempt, throw the error
      if (attempt >= config.maxRetries) {
        throw lastError;
      }
      
      // Wait before retrying
      console.log(`Retrying in ${delay}ms...`);
      await sleep(delay);
      
      // Increase delay for next attempt
      delay = Math.min(delay * config.backoffMultiplier, config.maxDelay);
    }
  }
  
  throw lastError!;
}
