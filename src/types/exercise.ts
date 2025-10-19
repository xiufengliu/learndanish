export type ExerciseQuestionType = 'translation' | 'cloze' | 'preposition' | 'comprehension';

export interface ExerciseOption {
  label: string;
  isCorrect: boolean;
  explanation: string;
}

export interface ExerciseQuestion {
  id: string;
  type: ExerciseQuestionType;
  prompt: string;
  body?: string;
  danishSentence?: string;
  options: ExerciseOption[];
  difficultyScore?: number;
}
