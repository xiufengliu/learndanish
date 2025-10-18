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

  const handleSpeak = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      
      // Create utterance for Danish word
      const utterance = new SpeechSynthesisUtterance(word.danishWord);
      utterance.lang = 'da-DK'; // Danish language
      utterance.rate = 0.9; // Slightly slower for learning
      
      // Speak the word
      window.speechSynthesis.speak(utterance);
      
      // If there's context, speak it after a pause
      if (showContext && word.context) {
        utterance.onend = () => {
          setTimeout(() => {
            const contextUtterance = new SpeechSynthesisUtterance(word.context);
            contextUtterance.lang = 'da-DK';
            contextUtterance.rate = 0.9;
            window.speechSynthesis.speak(contextUtterance);
          }, 300);
        };
      }
    } else {
      console.warn('Text-to-speech not supported in this browser');
    }
  };

  return (
    <div className="flashcard-container">
      <div className={`flashcard ${isFlipped ? 'flipped' : ''}`} onClick={handleFlip}>
        <div className="flashcard-front">
          <button className="speaker-button" onClick={handleSpeak} aria-label="Listen to pronunciation">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512" aria-hidden="true">
              <path d="M533.6 32.5C598.5 85.3 640 165.8 640 256s-41.5 170.8-106.4 223.5c-10.3 8.4-25.4 6.8-33.8-3.5s-6.8-25.4 3.5-33.8C557.5 398.2 592 331.2 592 256s-34.5-142.2-88.7-186.3c-10.3-8.4-11.8-23.5-3.5-33.8s23.5-11.8 33.8-3.5zM473.1 107c43.2 35.2 70.9 88.9 70.9 149s-27.7 113.8-70.9 149c-10.3 8.4-25.4 6.8-33.8-3.5s-6.8-25.4 3.5-33.8C475.3 341.3 496 301.1 496 256s-20.7-85.3-53.2-111.8c-10.3-8.4-11.8-23.5-3.5-33.8s23.5-11.8 33.8-3.5zm-60.5 74.5C434.1 199.1 448 225.9 448 256s-13.9 56.9-35.4 74.5c-10.3 8.4-25.4 6.8-33.8-3.5s-6.8-25.4 3.5-33.8C393.1 284.4 400 271 400 256s-6.9-28.4-17.7-37.3c-10.3-8.4-11.8-23.5-3.5-33.8s23.5-11.8 33.8-3.5zM301.1 34.8C312.6 40 320 51.4 320 64V448c0 12.6-7.4 24-18.9 29.2s-25 3.1-34.4-5.3L131.8 352H64c-35.3 0-64-28.7-64-64V224c0-35.3 28.7-64 64-64h67.8L266.7 40.1c9.4-8.4 22.9-10.4 34.4-5.3z"/>
            </svg>
          </button>
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
          <button className="speaker-button" onClick={handleSpeak} aria-label="Listen to pronunciation">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512" aria-hidden="true">
              <path d="M533.6 32.5C598.5 85.3 640 165.8 640 256s-41.5 170.8-106.4 223.5c-10.3 8.4-25.4 6.8-33.8-3.5s-6.8-25.4 3.5-33.8C557.5 398.2 592 331.2 592 256s-34.5-142.2-88.7-186.3c-10.3-8.4-11.8-23.5-3.5-33.8s23.5-11.8 33.8-3.5zM473.1 107c43.2 35.2 70.9 88.9 70.9 149s-27.7 113.8-70.9 149c-10.3 8.4-25.4 6.8-33.8-3.5s-6.8-25.4 3.5-33.8C475.3 341.3 496 301.1 496 256s-20.7-85.3-53.2-111.8c-10.3-8.4-11.8-23.5-3.5-33.8s23.5-11.8 33.8-3.5zm-60.5 74.5C434.1 199.1 448 225.9 448 256s-13.9 56.9-35.4 74.5c-10.3 8.4-25.4 6.8-33.8-3.5s-6.8-25.4 3.5-33.8C393.1 284.4 400 271 400 256s-6.9-28.4-17.7-37.3c-10.3-8.4-11.8-23.5-3.5-33.8s23.5-11.8 33.8-3.5zM301.1 34.8C312.6 40 320 51.4 320 64V448c0 12.6-7.4 24-18.9 29.2s-25 3.1-34.4-5.3L131.8 352H64c-35.3 0-64-28.7-64-64V224c0-35.3 28.7-64 64-64h67.8L266.7 40.1c9.4-8.4 22.9-10.4 34.4-5.3z"/>
            </svg>
          </button>
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
