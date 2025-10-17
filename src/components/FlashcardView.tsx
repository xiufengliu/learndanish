import React, { useState, useEffect } from 'react';
import { VocabularyWord } from '../types/vocabulary';
import Flashcard from './Flashcard';
import { mapQualityRating } from '../utils/srsAlgorithm';
import { updateWordWithReview } from '../hooks/useSpacedRepetition';

interface FlashcardViewProps {
  vocabulary: VocabularyWord[];
  onClose: () => void;
  onUpdateWord: (id: string, updates: Partial<VocabularyWord>) => void;
}

interface ReviewStats {
  totalReviewed: number;
  againCount: number;
  hardCount: number;
  goodCount: number;
  easyCount: number;
  startTime: number;
}

const FlashcardView: React.FC<FlashcardViewProps> = ({ vocabulary, onClose, onUpdateWord }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [reviewedWords, setReviewedWords] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState<ReviewStats>({
    totalReviewed: 0,
    againCount: 0,
    hardCount: 0,
    goodCount: 0,
    easyCount: 0,
    startTime: Date.now()
  });
  const [showSummary, setShowSummary] = useState(false);

  const currentWord = vocabulary[currentIndex];
  const progress = ((currentIndex + 1) / vocabulary.length) * 100;

  const handleReview = (quality: 'again' | 'hard' | 'good' | 'easy') => {
    if (!currentWord) return;

    // Update word with SRS algorithm
    const qualityNumber = mapQualityRating(quality);
    const updatedWord = updateWordWithReview(currentWord, qualityNumber);
    onUpdateWord(currentWord.id, updatedWord);

    // Update stats
    setStats(prev => ({
      ...prev,
      totalReviewed: prev.totalReviewed + 1,
      [`${quality}Count`]: (prev as any)[`${quality}Count`] + 1
    }));

    setReviewedWords(prev => new Set(prev).add(currentWord.id));

    // Move to next card or show summary
    if (currentIndex < vocabulary.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setShowSummary(true);
    }
  };

  const handleSkip = () => {
    if (currentIndex < vocabulary.length - 1) {
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
      ? Math.round(((stats.goodCount + stats.easyCount) / stats.totalReviewed) * 100)
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
              <div className="breakdown-item again">Again: {stats.againCount}</div>
              <div className="breakdown-item hard">Hard: {stats.hardCount}</div>
              <div className="breakdown-item good">Good: {stats.goodCount}</div>
              <div className="breakdown-item easy">Easy: {stats.easyCount}</div>
            </div>
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
              {currentIndex + 1} / {vocabulary.length}
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
