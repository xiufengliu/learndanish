// Error type definitions

export enum ErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  API_ERROR = 'API_ERROR',
  AUDIO_ERROR = 'AUDIO_ERROR',
  STORAGE_ERROR = 'STORAGE_ERROR',
  PERMISSION_ERROR = 'PERMISSION_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export interface AppError {
  type: ErrorType;
  message: string;
  originalError?: Error;
  recoverable: boolean;
  retryable: boolean;
}
