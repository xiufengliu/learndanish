// Settings type definitions

export interface AppSettings {
  speechSpeed: number; // 0.5 to 2.0
  difficultyLevel: 'beginner' | 'intermediate' | 'advanced';
  audienceLanguage: 'english' | 'chinese';
  theme: 'light' | 'dark' | 'system';
  audioQualityIndicators: boolean;
  grammarCorrections: boolean;
  vocabularyTracking: boolean;
  autoTranslate: boolean;
  keyboardShortcuts: boolean;
  preventScreenLock: boolean;
  backgroundAudio: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  speechSpeed: 1.0,
  difficultyLevel: 'beginner',
  audienceLanguage: 'english',
  theme: 'system',
  audioQualityIndicators: true,
  grammarCorrections: true,
  vocabularyTracking: true,
  autoTranslate: false,
  keyboardShortcuts: true,
  preventScreenLock: true,
  backgroundAudio: true
};
