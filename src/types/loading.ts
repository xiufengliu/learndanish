// Loading state type definitions

export type LoadingState = 
  | { type: 'idle' }
  | { type: 'loading'; message?: string }
  | { type: 'retrying'; attempt: number; maxAttempts: number }
  | { type: 'success' }
  | { type: 'error'; error: Error };
