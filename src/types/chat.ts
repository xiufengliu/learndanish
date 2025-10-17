// Chat message type definitions

export interface GrammarCorrection {
  id: string;
  messageId: string;
  originalText: string;
  correctedText: string;
  errorType: 'verb' | 'article' | 'word-order' | 'spelling' | 'preposition' | 'other';
  explanation: string;
  startIndex: number;
  endIndex: number;
  severity: 'minor' | 'moderate' | 'major';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  translation?: string;
  timestamp: Date;
  grammarCorrections?: GrammarCorrection[];
  extractedVocabulary?: string[]; // IDs of vocabulary words
}
