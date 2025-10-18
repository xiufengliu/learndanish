import React, { useState, useEffect, useRef } from 'react';
import type { Story, StoryExplanation } from '../types/story';
import { generateStoryExplanation } from '../utils/storyGenerator';

interface StoryViewProps {
  story: Story;
  onClose: () => void;
}

const StoryView: React.FC<StoryViewProps> = ({ story, onClose }) => {
  const [showExplanation, setShowExplanation] = useState(false);
  const [explanation, setExplanation] = useState<StoryExplanation[] | null>(null);
  const [isLoadingExplanation, setIsLoadingExplanation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState({ visible: false, text: '', x: 0, y: 0 });
  const [isDraggingTooltip, setIsDraggingTooltip] = useState(false);
  const [selectedText, setSelectedText] = useState<string>('');
  const [lastClickedSentence, setLastClickedSentence] = useState<string>('');
  const tooltipDragOffsetRef = useRef({ x: 0, y: 0 });

  const handleGenerateExplanation = async () => {
    // Try to get manually selected text first
    const selection = window.getSelection();
    const manuallySelected = selection?.toString().trim() || '';
    
    // Use manually selected text if available, otherwise use last clicked sentence
    const textToExplain = manuallySelected || lastClickedSentence;
    
    if (!textToExplain) {
      alert('Please click on a Danish sentence first or select some text to get grammar explanation.');
      return;
    }
    
    setSelectedText(textToExplain);
    setIsLoadingExplanation(true);
    setError(null);
    try {
      const explanationData = await generateStoryExplanation(textToExplain);
      setExplanation(explanationData);
      setShowExplanation(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate explanation');
    } finally {
      setIsLoadingExplanation(false);
    }
  };

  const handleSentenceClick = (e: React.MouseEvent, index: number) => {
    const danishSentences = story.danishText.split('\n').filter(s => s.trim());
    const englishSentences = story.englishTranslation.split('\n').filter(s => s.trim());
    
    const clickedSentence = danishSentences[index] || '';
    const translation = englishSentences[index] || 'Translation not available';
    
    // Store the clicked sentence for later explanation
    setLastClickedSentence(clickedSentence);
    
    const x = e.clientX + 15;
    const y = e.clientY + 15;
    
    setTooltip({ visible: true, text: translation, x, y });
  };

  const handleTooltipMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('tooltip-close') || target.closest('.tooltip-close')) {
      return;
    }
    
    e.preventDefault();
    e.stopPropagation();
    
    setIsDraggingTooltip(true);
    tooltipDragOffsetRef.current = {
      x: e.clientX - tooltip.x,
      y: e.clientY - tooltip.y
    };
  };

  const handleTooltipTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('tooltip-close') || target.closest('.tooltip-close')) {
      return;
    }
    
    e.stopPropagation();
    
    const touch = e.touches[0];
    setIsDraggingTooltip(true);
    tooltipDragOffsetRef.current = {
      x: touch.clientX - tooltip.x,
      y: touch.clientY - tooltip.y
    };
  };

  const handleTooltipClose = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setTooltip({ visible: false, text: '', x: 0, y: 0 });
    setIsDraggingTooltip(false);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingTooltip) {
        setTooltip(current => ({
          ...current,
          x: e.clientX - tooltipDragOffsetRef.current.x,
          y: e.clientY - tooltipDragOffsetRef.current.y
        }));
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isDraggingTooltip && e.touches.length > 0) {
        const touch = e.touches[0];
        setTooltip(current => ({
          ...current,
          x: touch.clientX - tooltipDragOffsetRef.current.x,
          y: touch.clientY - tooltipDragOffsetRef.current.y
        }));
      }
    };

    const handleMouseUp = () => {
      setIsDraggingTooltip(false);
    };

    const handleTouchEnd = () => {
      setIsDraggingTooltip(false);
    };

    if (isDraggingTooltip) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDraggingTooltip]);

  const getGrammarIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'verb': return '⚡';
      case 'noun': return '📦';
      case 'tense': return '⏰';
      case 'word-order': return '🔄';
      case 'article': return '📰';
      default: return '📝';
    }
  };

  const getGrammarColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'verb': return '#8ab4f8';
      case 'noun': return '#81c995';
      case 'tense': return '#fdd663';
      case 'word-order': return '#f28b82';
      case 'article': return '#c58af9';
      default: return '#9aa0a6';
    }
  };

  const danishSentences = story.danishText.split('\n').filter(s => s.trim());
  const englishSentences = story.englishTranslation.split('\n').filter(s => s.trim());

  return (
    <div className="story-overlay" onClick={onClose}>
      <div className="story-panel" onClick={(e) => e.stopPropagation()}>
        <div className="story-header">
          <div className="story-header-left">
            <h2>📖 Danish Story</h2>
            <span className="difficulty-badge" style={{ 
              backgroundColor: story.difficultyLevel === 'beginner' ? '#81c995' : 
                              story.difficultyLevel === 'intermediate' ? '#fdd663' : '#f28b82' 
            }}>
              {story.difficultyLevel}
            </span>
          </div>
          <div className="story-header-actions">
            {!showExplanation && (
              <button 
                className="explain-button" 
                onClick={handleGenerateExplanation}
                disabled={isLoadingExplanation}
                aria-label="Generate grammar explanation"
                title="Explain grammar"
              >
                {isLoadingExplanation ? '⏳' : '💡'}
              </button>
            )}
            <button className="close-button" onClick={onClose} aria-label="Close story">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" aria-hidden="true">
                <path d="M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256 342.6 150.6z" />
              </svg>
            </button>
          </div>
        </div>

        <div className="story-content">
          {error && (
            <div className="story-error">
              <p>{error}</p>
            </div>
          )}

          {!showExplanation ? (
            <div className="story-text-container">
              <div className="story-section">
                <h3>🇩🇰 Danish Story</h3>
                <div className="story-text danish-text">
                  {danishSentences.map((sentence, idx) => (
                    <p 
                      key={idx} 
                      className="clickable-sentence"
                      onClick={(e) => handleSentenceClick(e, idx)}
                      title="Click to see English translation"
                    >
                      {sentence}
                    </p>
                  ))}
                </div>
              </div>

              <div className="story-hint">
                <p>💡 Click any Danish sentence to see its English translation in a draggable popup!</p>
                <p>📚 After clicking a sentence, click the light bulb icon to get grammar explanations for that sentence. You can also manually select any text for explanation.</p>
              </div>
            </div>
          ) : (
            <div className="story-explanation-container">
              <div className="explanation-header">
                <div>
                  <h3>📚 Grammar Explanation</h3>
                  <p className="explanation-selected-text">Selected: "{selectedText}"</p>
                </div>
                <button 
                  className="back-to-story-button"
                  onClick={() => setShowExplanation(false)}
                >
                  ← Back to Story
                </button>
              </div>

              {explanation && explanation.map((sentenceExplanation, idx) => (
                <div key={idx} className="explanation-card">
                  <div className="explanation-sentence">
                    <div className="sentence-danish">
                      <strong>🇩🇰</strong> {sentenceExplanation.sentence}
                    </div>
                    <div className="sentence-english">
                      <strong>🇬🇧</strong> {sentenceExplanation.translation}
                    </div>
                  </div>

                  <div className="grammar-points">
                    {sentenceExplanation.grammarPoints.map((point, pidx) => (
                      <div key={pidx} className="grammar-point">
                        <div className="grammar-point-header">
                          <span 
                            className="grammar-type-badge"
                            style={{ backgroundColor: getGrammarColor(point.type) }}
                          >
                            {getGrammarIcon(point.type)} {point.type}
                          </span>
                        </div>
                        <p className="grammar-description">{point.description}</p>
                        {point.example && (
                          <div className="grammar-example">
                            <strong>Example:</strong> {point.example}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {tooltip.visible && (
          <div 
            className="tooltip draggable-tooltip" 
            style={{ 
              top: `${tooltip.y}px`, 
              left: `${tooltip.x}px`
            }}
            onMouseDown={handleTooltipMouseDown}
            onTouchStart={handleTooltipTouchStart}
          >
            <div className="tooltip-content">{tooltip.text}</div>
            <button 
              className="tooltip-close"
              onClick={handleTooltipClose}
              onTouchEnd={handleTooltipClose}
              aria-label="Close translation"
            >
              ×
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default StoryView;
