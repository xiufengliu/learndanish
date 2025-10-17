// Audio quality type definitions

export interface AudioQualityMetrics {
  inputLevel: number; // 0-100
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor';
  isListening: boolean;
  isSpeaking: boolean;
  latency: number; // milliseconds
}
