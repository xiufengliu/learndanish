import { useCallback } from 'react';
import { VocabularyWord, SRSReview } from '../types/vocabulary';
import { calculateNextReview, calculateProficiencyLevel } from '../utils/srsAlgorithm';

interface UseSpacedRepetitionResult {
  reviewWord: (review: SRSReview, updateWord: (id: string, updates: Partial<VocabularyWord>) => void) => void;
  getNextReviewDate: (word: VocabularyWord) => Date;
  getDueWords: (vocabulary: VocabularyWord[]) => VocabularyWord[];
  getDueCount: (vocabulary: VocabularyWord[]) => number;
}

export function useSpacedRepetition(): UseSpacedRepetitionResult {
  const reviewWord = useCallback((
    review: SRSReview,
    updateWord: (id: string, updates: Partial<VocabularyWord>) => void
  ) => {
    // This will be called with the current word's SRS data
    // We need to get the word first, but since this is a hook,
    // we'll pass the update function from the parent
    updateWord(review.wordId, {
      lastPracticed: new Date(),
      practiceCount: 0, // Will be incremented by the update
      srsData: {
        ...calculateNextReview(review.quality, { easeFactor: 2.5, interval: 1, repetitions: 0, nextReviewDate: new Date() }),
        lastQuality: review.quality
      }
    });
  }, []);

  const getNextReviewDate = useCallback((word: VocabularyWord): Date => {
    return new Date(word.srsData.nextReviewDate);
  }, []);

  const getDueWords = useCallback((vocabulary: VocabularyWord[]): VocabularyWord[] => {
    const now = new Date();
    return vocabulary.filter(word => 
      new Date(word.srsData.nextReviewDate) <= now
    ).sort((a, b) => 
      new Date(a.srsData.nextReviewDate).getTime() - new Date(b.srsData.nextReviewDate).getTime()
    );
  }, []);

  const getDueCount = useCallback((vocabulary: VocabularyWord[]): number => {
    return getDueWords(vocabulary).length;
  }, [getDueWords]);

  return {
    reviewWord,
    getNextReviewDate,
    getDueWords,
    getDueCount
  };
}

// Helper function to update word with SRS review
export function updateWordWithReview(
  word: VocabularyWord,
  quality: number
): VocabularyWord {
  const newSRSData = calculateNextReview(quality, word.srsData);
  const newProficiencyLevel = calculateProficiencyLevel(newSRSData);

  return {
    ...word,
    lastPracticed: new Date(),
    practiceCount: word.practiceCount + 1,
    proficiencyLevel: newProficiencyLevel,
    srsData: {
      ...newSRSData,
      lastQuality: quality
    }
  };
}
