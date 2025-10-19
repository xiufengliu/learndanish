import React, { useState, useEffect, useRef } from 'react';
import type { Story, StoryExplanation } from '../types/story';
import { generateStoryExplanation } from '../utils/storyGenerator';
import StoryExercise from './StoryExercise';

interface StoryViewProps {
  story: Story;
  audienceLanguage: 'english' | 'chinese';
  onClose: () => void;
}

const StoryView: React.FC<StoryViewProps> = ({ story, audienceLanguage, onClose }) => {
  const [showExplanation, setShowExplanation] = useState(false);
  const [explanation, setExplanation] = useState<StoryExplanation[] | null>(null);
  const [isLoadingExplanation, setIsLoadingExplanation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState({ visible: false, text: '', x: 0, y: 0, isExplanation: false });
  const [isDraggingTooltip, setIsDraggingTooltip] = useState(false);
  const [lastClickedSentence, setLastClickedSentence] = useState<string>('');
  const tooltipDragOffsetRef = useRef({ x: 0, y: 0 });

  const handleGenerateExplanation = async () => {
    if (!lastClickedSentence) {
      alert('Please click on a Danish sentence first to get grammar explanation.');
      return;
    }
    
    setIsLoadingExplanation(true);
    try {
      const explanationData = await generateStoryExplanation(lastClickedSentence, audienceLanguage);
      
      // Format explanation as readable text for the tooltip
      let explanationText = '';
      explanationData.forEach((sentenceExpl, idx) => {
        if (idx > 0) explanationText += '\n\n---\n\n';
        explanationText += `📝 ${sentenceExpl.sentence}\n`;
        explanationText += `${audienceLanguage === 'chinese' ? '🇨🇳' : '🇬🇧'} ${sentenceExpl.translation}\n\n`;
        
        sentenceExpl.grammarPoints.forEach((point, pidx) => {
          explanationText += `${pidx + 1}. [${point.type.toUpperCase()}]\n`;
          explanationText += `   ${point.description}\n`;
          if (point.example) {
            explanationText += `   ${audienceLanguage === 'chinese' ? '例子' : 'Example'}: ${point.example}\n`;
          }
          explanationText += '\n';
        });
      });
      
      setTooltip(current => ({ 
        ...current, 
        text: explanationText, 
        isExplanation: true 
      }));
    } catch (err) {
      setTooltip(current => ({ 
        ...current, 
        text: `${audienceLanguage === 'chinese' ? '错误' : 'Error'}: ${err instanceof Error ? err.message : 'Failed to generate explanation'}`,
        isExplanation: false
      }));
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
    
    // Add light bulb emoji at the beginning
    setTooltip({ visible: true, text: `💡 ${translation}`, x, y, isExplanation: false });
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
                <p>💡 Click any Danish sentence to see its English translation in a popup!</p>
                <p>📚 Click the 💡 light bulb in the popup to get detailed grammar explanations!</p>
              </div>
          </div>

          <StoryExercise
            danishSentences={danishSentences}
            englishSentences={englishSentences}
            audienceLanguage={audienceLanguage}
          />
        </div>
      
        {tooltip.visible && (
          <div 
            className="tooltip draggable-tooltip story-tooltip" 
            style={{ 
              top: `${tooltip.y}px`, 
              left: `${tooltip.x}px`
            }}
            onMouseDown={handleTooltipMouseDown}
            onTouchStart={handleTooltipTouchStart}
          >
            <div 
              className={`tooltip-content ${tooltip.isExplanation ? 'explanation-mode' : ''}`}
              style={{ whiteSpace: 'pre-wrap' }}
              onClick={!tooltip.isExplanation && lastClickedSentence ? handleGenerateExplanation : undefined}
              title={!tooltip.isExplanation ? 'Click the 💡 to see grammar explanation' : ''}
            >
              {isLoadingExplanation ? '⏳ Loading explanation...' : tooltip.text}
            </div>
            <div className="tooltip-buttons">
              <button 
                className="tooltip-close"
                onClick={handleTooltipClose}
                onTouchEnd={handleTooltipClose}
                aria-label="Close"
              >
                ×
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StoryView;
