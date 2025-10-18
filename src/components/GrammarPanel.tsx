import React from 'react';
import { GrammarCorrection } from '../types/grammar';

interface GrammarPanelProps {
  corrections: GrammarCorrection[];
  onClose: () => void;
  onClearHistory: () => void;
}

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'verb': return '⚡';
    case 'noun': return '📦';
    case 'adjective': return '🎨';
    case 'word-order': return '🔄';
    case 'preposition': return '➡️';
    case 'article': return '📰';
    default: return '📝';
  }
};

const getCategoryColor = (category: string) => {
  switch (category) {
    case 'verb': return '#8ab4f8';
    case 'noun': return '#81c995';
    case 'adjective': return '#fdd663';
    case 'word-order': return '#f28b82';
    case 'preposition': return '#aecbfa';
    case 'article': return '#c58af9';
    default: return '#9aa0a6';
  }
};

const GrammarPanel: React.FC<GrammarPanelProps> = ({ corrections, onClose, onClearHistory }) => {
  const handleClearAll = () => {
    if (corrections.length > 0 && window.confirm('Are you sure you want to clear all grammar corrections? This cannot be undone.')) {
      onClearHistory();
    }
  };

  return (
    <div className="grammar-overlay" onClick={onClose}>
      <div className="grammar-panel" onClick={(e) => e.stopPropagation()}>
        <div className="grammar-header">
          <h2>Grammar Corrections ({corrections.length})</h2>
          <div className="grammar-header-actions">
            {corrections.length > 0 && (
              <button 
                className="clear-all-button" 
                onClick={handleClearAll}
                aria-label="Clear all grammar corrections"
                title="Clear all corrections"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" aria-hidden="true">
                  <path d="M135.2 17.7L128 32H32C14.3 32 0 46.3 0 64S14.3 96 32 96H416c17.7 0 32-14.3 32-32s-14.3-32-32-32H320l-7.2-14.3C307.4 6.8 296.3 0 284.2 0H163.8c-12.1 0-23.2 6.8-28.6 17.7zM416 128H32L53.2 467c1.6 25.3 22.6 45 47.9 45H346.9c25.3 0 46.3-19.7 47.9-45L416 128z"/>
                </svg>
              </button>
            )}
            <button className="close-button" onClick={onClose} aria-label="Close grammar panel">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" aria-hidden="true">
                <path d="M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256 342.6 150.6z" />
              </svg>
            </button>
          </div>
        </div>

        <div className="grammar-content">
          {corrections.length === 0 ? (
            <div className="grammar-empty">
              <p>No grammar corrections to show.</p>
              <p>Keep practicing and corrections will appear here when needed!</p>
            </div>
          ) : (
            <div className="grammar-list">
              {corrections.map(correction => (
                <div key={correction.id} className="grammar-card">
                  <div className="grammar-card-header">
                    <span 
                      className="grammar-category-badge"
                      style={{ backgroundColor: getCategoryColor(correction.category) }}
                    >
                      {getCategoryIcon(correction.category)} {correction.category}
                    </span>
                    <span className="grammar-timestamp">
                      {new Date(correction.timestamp).toLocaleTimeString()}
                    </span>
                  </div>

                  <div className="grammar-comparison">
                    <div className="grammar-incorrect">
                      <div className="grammar-label">❌ Your text:</div>
                      <div className="grammar-text">{correction.originalText}</div>
                    </div>
                    <div className="grammar-arrow">→</div>
                    <div className="grammar-correct">
                      <div className="grammar-label">✅ Correct:</div>
                      <div className="grammar-text">{correction.correctedText}</div>
                    </div>
                  </div>

                  <div className="grammar-rule">
                    <strong>Rule:</strong> {correction.rule}
                  </div>

                  <div className="grammar-explanation">
                    <strong>Explanation:</strong> {correction.explanation}
                  </div>

                  {correction.examples.length > 0 && (
                    <div className="grammar-examples">
                      <strong>Examples:</strong>
                      <ul>
                        {correction.examples.map((example, index) => (
                          <li key={index}>{example}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GrammarPanel;
