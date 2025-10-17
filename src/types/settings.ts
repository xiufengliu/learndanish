// Settings type definitions

export interface VoiceConfig {
  name: string;
  displayName: string;
}

export interface AppSettings {
  voice: VoiceConfig;
  speechSpeed: number; // 0.5 to 2.0
  difficultyLevel: 'beginner' | 'intermediate' | 'advanced';
  theme: 'light' | 'dark' | 'system';
  audioQualityIndicators: boolean;
  grammarCorrections: boolean;
  vocabularyTracking: boolean;
  autoTranslate: boolean;
  keyboardShortcuts: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  voice: {
    name: 'Kore',
    displayName: 'Kore (Default)'
  },
  speechSpeed: 1.0,
  difficultyLevel: 'beginner',
  theme: 'system',
  audioQualityIndicators: true,
  grammarCorrections: true,
  vocabularyTracking: true,
  autoTranslate: false,
  keyboardShortcuts: true
};
