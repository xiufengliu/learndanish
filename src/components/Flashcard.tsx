import React, { useState } from 'react';
import { VocabularyWord } from '../types/vocabulary';

interface FlashcardProps {
  word: VocabularyWord;
  onReview: (quality: 'again' | 'hard' | 'good' | 'easy') => void;
  showContext?: boolean;
}

const Flashcard: React.FC<FlashcardProps> = ({ word, onReview, showContext = true }) => {
  const [isFlipped, setIsFlipped] = useState(false);

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleReview = (quality: 'again' | 'hard' | 'good' | 'easy') => {
    onReview(quality);
    setIsFlipped(false);
  };

  return (
    <div className="flashcard-container">
      <div className={`flashcard ${isFlipped ? 'flipped' : ''}`} onClick={handleFlip}>
        <div className="flashcard-front">
          <div className="flashcard-content">
            <p className="flashcard-label">Danish</p>
            <h2 className="flashcard-word">{word.danishWord}</h2>
            {word.partOfSpeech && (
              <p className="flashcard-pos">{word.partOfSpeech}</p>
            )}
            <p className="flashcard-hint">Click to reveal translation</p>
          </div>
        </div>
        <div className="flashcard-back">
          <div className="flashcard-content">
            <p className="flashcard-label">English</p>
            <h2 className="flashcard-word">{word.englishTranslation}</h2>
            {showContext && word.context && (
              <p className="flashcard-context">"{word.context}"</p>
            )}
          </div>
        </div>
      </div>

      {isFlipped && (
        <div className="flashcard-buttons">
          <button 
            className="review-button again"
            onClick={(e) => { e.stopPropagation(); handleReview('again'); }}
          >
            Again
          </button>
          <button 
            className="review-button hard"
            onClick={(e) => { e.stopPropagation(); handleReview('hard'); }}
          >
            Hard
          </button>
          <button 
            className="review-button good"
            onClick={(e) => { e.stopPropagation(); handleReview('good'); }}
          >
            Good
          </button>
          <button 
            className="review-button easy"
            onClick={(e) => { e.stopPropagation(); handleReview('easy'); }}
          >
            Easy
          </button>
        </div>
      )}
    </div>
  );
};

export default Flashcard;
