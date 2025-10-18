// Grammar correction type definitions

export interface GrammarCorrection {
  id: string;
  originalText: string;
  correctedText: string;
  explanation: string;
  rule: string;
  examples: string[];
  timestamp: Date;
  category: 'verb' | 'noun' | 'adjective' | 'word-order' | 'preposition' | 'article' | 'other';
}

export interface GrammarAnalysis {
  hasErrors: boolean;
  corrections: GrammarCorrection[];
}
