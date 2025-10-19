import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { Story } from '../types/story';
import { generateStoryExplanation } from '../utils/storyGenerator';
import StoryExercise from './StoryExercise';
import { playDanishText } from '../utils/tts';

interface StoryViewProps {
  story: Story;
  audienceLanguage: 'english' | 'chinese';
  onClose: () => void;
}

const StoryView: React.FC<StoryViewProps> = ({ story, audienceLanguage, onClose }) => {
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
    setTooltip({ visible: true, text: translation, x, y, isExplanation: false });
  };

  const handleTooltipMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('tooltip-close') || target.closest('.tooltip-close')) {
      return;
    }
    if (target.classList.contains('tooltip-explain-button') || target.closest('.tooltip-explain-button')) {
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
    if (target.classList.contains('tooltip-explain-button') || target.closest('.tooltip-explain-button')) {
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
  const danishStoryText = useMemo(() => danishSentences.join(' '), [danishSentences]);
  const [isPlayingStory, setIsPlayingStory] = useState(false);

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
            <button className="close-button story-close-button" onClick={onClose} aria-label="Close story">
              <span aria-hidden="true">×</span>
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
                <div className="story-title">
                  <h3>🇩🇰 Danish Story</h3>
                  <button
                    className="story-speak-button"
                    onClick={() => {
                      setIsPlayingStory(true);
                      void playDanishText(danishStoryText).finally(() => setIsPlayingStory(false));
                    }}
                    aria-label={audienceLanguage === 'chinese' ? '朗读丹麦故事' : 'Play Danish story aloud'}
                    disabled={isPlayingStory}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512" aria-hidden="true">
                      <path d="M533.6 32.5C598.5 85.3 640 165.8 640 256s-41.5 170.8-106.4 223.5c-10.3 8.4-25.4 6.8-33.8-3.5s-6.8-25.4 3.5-33.8C557.5 398.2 592 331.2 592 256s-34.5-142.2-88.7-186.3c-10.3-8.4-11.8-23.5-3.5-33.8s23.5-11.8 33.8-3.5zM473.1 107c43.2 35.2 70.9 88.9 70.9 149s-27.7 113.8-70.9 149c-10.3 8.4-25.4 6.8-33.8-3.5s-6.8-25.4 3.5-33.8C475.3 341.3 496 301.1 496 256s-20.7-85.3-53.2-111.8c-10.3-8.4-11.8-23.5-3.5-33.8s23.5-11.8 33.8-3.5zm-60.5 74.5C434.1 199.1 448 225.9 448 256s-13.9 56.9-35.4 74.5c-10.3 8.4-25.4 6.8-33.8-3.5s-6.8-25.4 3.5-33.8C393.1 284.4 400 271 400 256s-6.9-28.4-17.7-37.3c-10.3-8.4-11.8-23.5-3.5-33.8s23.5-11.8 33.8-3.5zM301.1 34.8C312.6 40 320 51.4 320 64V448c0 12.6-7.4 24-18.9 29.2s-25 3.1-34.4-5.3L131.8 352H64c-35.3 0-64-28.7-64-64V224c0-35.3 28.7-64 64-64h67.8L266.7 40.1c9.4-8.4 22.9-10.4 34.4-5.3z" />
                    </svg>
                  </button>
                </div>
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
            exercises={story.exercises}
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
            >
              {isLoadingExplanation ? (
                '⏳ Loading explanation...'
              ) : tooltip.isExplanation ? (
                tooltip.text
              ) : (
                <>
                  <div className="tooltip-translation">{tooltip.text}</div>
                  <button
                    className="tooltip-explain-button"
                    onClick={handleGenerateExplanation}
                    disabled={!lastClickedSentence || isLoadingExplanation}
                  >
                    {audienceLanguage === 'chinese' ? '查看语法说明' : 'Show grammar explanation'}
                  </button>
                </>
              )}
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
