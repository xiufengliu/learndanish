import { useState, useCallback } from 'react';
import { VocabularyWord, SRSData } from '../types/vocabulary';
import { StorageManager } from '../utils/storageManager';
import { STORAGE_KEYS } from '../constants/storage';
import { extractVocabularyFromMessage, generateVocabularyId } from '../utils/vocabularyExtractor';

interface UseVocabularyTrackerResult {
  vocabulary: VocabularyWord[];
  addWord: (word: Omit<VocabularyWord, 'id' | 'srsData'>) => void;
  updateWord: (id: string, updates: Partial<VocabularyWord>) => void;
  getWordsDueForReview: () => VocabularyWord[];
  extractAndAddVocabulary: (message: string, context: string, audienceLanguage?: 'english' | 'chinese') => Promise<void>;
  deleteWord: (id: string) => void;
  clearAllWords: () => void;
}

function createInitialSRSData(): SRSData {
  return {
    easeFactor: 2.5,
    interval: 1,
    repetitions: 0,
    nextReviewDate: new Date(Date.now() + 24 * 60 * 60 * 1000) // Tomorrow
  };
}

export function useVocabularyTracker(): UseVocabularyTrackerResult {
  const [vocabulary, setVocabulary] = useState<VocabularyWord[]>(() => {
    return StorageManager.getItem<VocabularyWord[]>(STORAGE_KEYS.VOCABULARY, []);
  });

  const saveVocabulary = useCallback((words: VocabularyWord[]) => {
    setVocabulary(words);
    StorageManager.setItem(STORAGE_KEYS.VOCABULARY, words);
  }, []);

  const addWord = useCallback((word: Omit<VocabularyWord, 'id' | 'srsData'>) => {
    const newWord: VocabularyWord = {
      ...word,
      id: generateVocabularyId(word.danishWord),
      srsData: createInitialSRSData()
    };

    setVocabulary(prev => {
      // Check if word already exists
      const exists = prev.find(w => 
        w.danishWord.toLowerCase() === word.danishWord.toLowerCase()
      );
      
      if (exists) {
        // Update practice count and last practiced
        return prev.map(w => 
          w.id === exists.id 
            ? { ...w, practiceCount: w.practiceCount + 1, lastPracticed: new Date() }
            : w
        );
      }
      
      const updated = [...prev, newWord];
      StorageManager.setItem(STORAGE_KEYS.VOCABULARY, updated);
      return updated;
    });
  }, []);

  const updateWord = useCallback((id: string, updates: Partial<VocabularyWord>) => {
    setVocabulary(prev => {
      const updated = prev.map(word => 
        word.id === id ? { ...word, ...updates } : word
      );
      StorageManager.setItem(STORAGE_KEYS.VOCABULARY, updated);
      return updated;
    });
  }, []);

  const deleteWord = useCallback((id: string) => {
    setVocabulary(prev => {
      const updated = prev.filter(word => word.id !== id);
      StorageManager.setItem(STORAGE_KEYS.VOCABULARY, updated);
      return updated;
    });
  }, []);

  const clearAllWords = useCallback(() => {
    setVocabulary([]);
    StorageManager.removeItem(STORAGE_KEYS.VOCABULARY);
  }, []);

  const getWordsDueForReview = useCallback(() => {
    const now = new Date();
    return vocabulary.filter(word => 
      new Date(word.srsData.nextReviewDate) <= now
    );
  }, [vocabulary]);

  const extractAndAddVocabulary = useCallback(async (message: string, context: string, audienceLanguage: 'english' | 'chinese' = 'english') => {
    try {
      const extractedWords = await extractVocabularyFromMessage(message, context, audienceLanguage);
      
      for (const word of extractedWords) {
        addWord({
          ...word,
          firstEncountered: new Date(),
          lastPracticed: new Date(),
          practiceCount: 1,
          proficiencyLevel: 'new'
        });
      }
    } catch (error) {
      console.error('Failed to extract and add vocabulary:', error);
    }
  }, [addWord]);

  return {
    vocabulary,
    addWord,
    updateWord,
    getWordsDueForReview,
    extractAndAddVocabulary,
    deleteWord,
    clearAllWords
  };
}
