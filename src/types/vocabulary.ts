// Vocabulary and SRS type definitions

export interface SRSData {
  easeFactor: number; // 1.3 to 2.5
  interval: number; // days until next review
  repetitions: number;
  nextReviewDate: Date;
  lastQuality?: number; // 0-5
}

export interface GrammaticalForms {
  // For verbs
  infinitive?: string;
  present?: string;
  past?: string;
  presentPerfect?: string;
  imperative?: string;
  
  // For nouns
  singular?: string;
  plural?: string;
  definite?: string;
  definitePlural?: string;
  gender?: 'common' | 'neuter'; // en-word or et-word
  
  // For adjectives
  positive?: string;
  comparative?: string;
  superlative?: string;
}

export interface VocabularyWord {
  id: string;
  danishWord: string;
  englishTranslation: string;
  context: string;
  partOfSpeech?: string;
  firstEncountered: Date;
  lastPracticed: Date;
  practiceCount: number;
  proficiencyLevel: 'new' | 'learning' | 'familiar' | 'mastered';
  srsData: SRSData;
  relatedWords?: string[]; // IDs of related vocabulary
  topicTags?: string[];
  exampleSentences?: string[]; // Additional example sentences
  culturalNotes?: string; // Cultural context about the word/phrase
  grammaticalForms?: GrammaticalForms; // Verb conjugations, noun declensions, etc.
}

export interface SRSReview {
  wordId: string;
  quality: 0 | 1 | 2 | 3 | 4 | 5; // 0=complete blackout, 5=perfect recall
}
