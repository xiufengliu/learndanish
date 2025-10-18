import React, { useState, useEffect } from 'react';
import { VocabularyWord } from '../types/vocabulary';
import Flashcard from './Flashcard';
import { mapQualityRating } from '../utils/srsAlgorithm';
import { updateWordWithReview } from '../hooks/useSpacedRepetition';

interface FlashcardViewProps {
  vocabulary: VocabularyWord[];
  onClose: () => void;
  onUpdateWord: (id: string, updates: Partial<VocabularyWord>) => void;
  onDeleteWord?: (id: string) => void;
}

interface ReviewStats {
  totalReviewed: number;
  forgotCount: number;
  rememberedCount: number;
  masteredCount: number;
  startTime: number;
}

const FlashcardView: React.FC<FlashcardViewProps> = ({ vocabulary, onClose, onUpdateWord, onDeleteWord }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [reviewedWords, setReviewedWords] = useState<Set<string>>(new Set());
  const [remainingWords, setRemainingWords] = useState<VocabularyWord[]>(vocabulary);
  const [stats, setStats] = useState<ReviewStats>({
    totalReviewed: 0,
    forgotCount: 0,
    rememberedCount: 0,
    masteredCount: 0,
    startTime: Date.now()
  });
  const [showSummary, setShowSummary] = useState(false);

  const currentWord = remainingWords[currentIndex];
  const progress = remainingWords.length > 0 ? ((currentIndex + 1) / remainingWords.length) * 100 : 100;

  const handleReview = (result: 'forgot' | 'remembered' | 'mastered') => {
    if (!currentWord) return;

    // Map result to quality rating for SRS
    let qualityNumber: number;
    if (result === 'forgot') {
      qualityNumber = 0; // Complete blackout - reset
    } else if (result === 'remembered') {
      qualityNumber = 3; // Good recall
    } else { // mastered
      qualityNumber = 5; // Perfect recall
    }

    // Update stats
    setStats(prev => ({
      ...prev,
      totalReviewed: prev.totalReviewed + 1,
      [`${result}Count`]: (prev as any)[`${result}Count`] + 1
    }));

    setReviewedWords(prev => new Set(prev).add(currentWord.id));

    // Handle mastered words - remove from deck
    if (result === 'mastered') {
      // Remove from remaining words
      const newRemaining = remainingWords.filter((_, idx) => idx !== currentIndex);
      setRemainingWords(newRemaining);
      
      // Update proficiency to mastered
      onUpdateWord(currentWord.id, { 
        proficiencyLevel: 'mastered',
        srsData: {
          ...currentWord.srsData,
          repetitions: currentWord.srsData.repetitions + 1,
          nextReviewDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year from now
        }
      });

      // Check if we're done
      if (newRemaining.length === 0) {
        setShowSummary(true);
      } else if (currentIndex >= newRemaining.length) {
        // If we were at the end, go to the new last card
        setCurrentIndex(newRemaining.length - 1);
      }
      // else: stay at current index (which now shows the next card)
    } else {
      // For forgot and remembered, update with SRS algorithm
      const updatedWord = updateWordWithReview(currentWord, qualityNumber);
      onUpdateWord(currentWord.id, updatedWord);

      // Move to next card or show summary
      if (currentIndex < remainingWords.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        setShowSummary(true);
      }
    }
  };

  const handleSkip = () => {
    if (currentIndex < remainingWords.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setShowSummary(true);
    }
  };

  const timeSpent = Math.floor((Date.now() - stats.startTime) / 1000);
  const minutes = Math.floor(timeSpent / 60);
  const seconds = timeSpent % 60;

  if (vocabulary.length === 0) {
    return (
      <div className="flashcard-overlay" onClick={onClose}>
        <div className="flashcard-panel" onClick={(e) => e.stopPropagation()}>
          <div className="flashcard-empty">
            <h2>No Vocabulary to Review</h2>
            <p>Start a conversation to build your vocabulary, then come back here to practice!</p>
            <button className="primary-button" onClick={onClose}>
              Back to Chat
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showSummary) {
    const accuracy = stats.totalReviewed > 0
      ? Math.round(((stats.rememberedCount + stats.masteredCount) / stats.totalReviewed) * 100)
      : 0;

    return (
      <div className="flashcard-overlay" onClick={onClose}>
        <div className="flashcard-panel" onClick={(e) => e.stopPropagation()}>
          <div className="flashcard-summary">
            <h2>🎉 Review Complete!</h2>
            <div className="summary-stats">
              <div className="stat-item">
                <span className="stat-value">{stats.totalReviewed}</span>
                <span className="stat-label">Words Reviewed</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{accuracy}%</span>
                <span className="stat-label">Accuracy</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{minutes}:{seconds.toString().padStart(2, '0')}</span>
                <span className="stat-label">Time Spent</span>
              </div>
            </div>
            <div className="summary-breakdown">
              <div className="breakdown-item forgot">
                <span className="breakdown-icon">❌</span>
                <span className="breakdown-text">Forgot: {stats.forgotCount}</span>
              </div>
              <div className="breakdown-item remembered">
                <span className="breakdown-icon">✓</span>
                <span className="breakdown-text">Remembered: {stats.rememberedCount}</span>
              </div>
              <div className="breakdown-item mastered">
                <span className="breakdown-icon">⭐</span>
                <span className="breakdown-text">Mastered: {stats.masteredCount}</span>
              </div>
            </div>
            {stats.masteredCount > 0 && (
              <div className="mastery-message">
                <p>🎉 Congratulations! You've mastered {stats.masteredCount} word{stats.masteredCount > 1 ? 's' : ''}!</p>
                <p className="mastery-note">These words have been removed from your review deck and marked as mastered.</p>
              </div>
            )}
            <button className="primary-button" onClick={onClose}>
              Back to Chat
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flashcard-overlay">
      <div className="flashcard-panel" onClick={(e) => e.stopPropagation()}>
        <div className="flashcard-header">
          <button className="close-button" onClick={onClose} aria-label="Close flashcards">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" aria-hidden="true">
              <path d="M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256 342.6 150.6z"/>
            </svg>
          </button>
          <div className="flashcard-progress">
            <div className="progress-text">
              {currentIndex + 1} / {remainingWords.length}
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>

        <div className="flashcard-main">
          <Flashcard
            word={currentWord}
            onReview={handleReview}
            showContext={true}
          />
        </div>

        <div className="flashcard-footer">
          <button className="skip-button" onClick={handleSkip}>
            Skip
          </button>
        </div>
      </div>
    </div>
  );
};

export default FlashcardView;
