import type { ExerciseQuestion } from './exercise';

export interface Story {
  id: string;
  danishText: string;
  englishTranslation: string;
  difficultyLevel: 'beginner' | 'intermediate' | 'advanced';
  timestamp: Date;
  explanation?: StoryExplanation[];
  exercises?: ExerciseQuestion[];
}

export interface StoryExplanation {
  sentence: string;
  translation: string;
  grammarPoints: GrammarPoint[];
}

export interface GrammarPoint {
  type: string; // e.g., "verb", "noun", "tense", "word order"
  description: string;
  example?: string;
}
