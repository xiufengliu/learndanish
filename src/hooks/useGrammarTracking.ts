import { useState, useCallback } from 'react';
import { GrammarCorrection } from '../types/grammar';
import { StorageManager } from '../utils/storageManager';

const GRAMMAR_HISTORY_KEY = 'danishTutorGrammarHistory';
const MAX_HISTORY_SIZE = 50; // Keep last 50 corrections

export function useGrammarTracking() {
  const [grammarHistory, setGrammarHistory] = useState<GrammarCorrection[]>(() => {
    return StorageManager.getItem<GrammarCorrection[]>(GRAMMAR_HISTORY_KEY, []);
  });

  const addCorrections = useCallback((corrections: GrammarCorrection[]) => {
    setGrammarHistory(prev => {
      const updated = [...corrections, ...prev].slice(0, MAX_HISTORY_SIZE);
      StorageManager.setItem(GRAMMAR_HISTORY_KEY, updated);
      return updated;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setGrammarHistory([]);
    StorageManager.removeItem(GRAMMAR_HISTORY_KEY);
  }, []);

  const deleteCorrection = useCallback((id: string) => {
    setGrammarHistory(prev => {
      const updated = prev.filter(c => c.id !== id);
      StorageManager.setItem(GRAMMAR_HISTORY_KEY, updated);
      return updated;
    });
  }, []);

  return {
    grammarHistory,
    addCorrections,
    clearHistory,
    deleteCorrection
  };
}
