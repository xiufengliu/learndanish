// Settings type definitions

export interface AppSettings {
  speechSpeed: number; // 0.5 to 2.0
  difficultyLevel: 'beginner' | 'intermediate' | 'advanced';
  theme: 'light' | 'dark' | 'system';
  audioQualityIndicators: boolean;
  grammarCorrections: boolean;
  vocabularyTracking: boolean;
  autoTranslate: boolean;
  keyboardShortcuts: boolean;
  preventScreenLock: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  speechSpeed: 1.0,
  difficultyLevel: 'beginner',
  theme: 'system',
  audioQualityIndicators: true,
  grammarCorrections: true,
  vocabularyTracking: true,
  autoTranslate: false,
  keyboardShortcuts: true,
  preventScreenLock: true
};
