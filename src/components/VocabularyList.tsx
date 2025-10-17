import React, { useState } from 'react';
import { VocabularyWord } from '../types/vocabulary';

interface VocabularyListProps {
  vocabulary: VocabularyWord[];
  onClose: () => void;
  onDeleteWord?: (id: string) => void;
}

type SortBy = 'recent' | 'alphabetical' | 'proficiency';
type FilterBy = 'all' | 'new' | 'learning' | 'familiar' | 'mastered';

const VocabularyList: React.FC<VocabularyListProps> = ({ vocabulary, onClose, onDeleteWord }) => {
  const [sortBy, setSortBy] = useState<SortBy>('recent');
  const [filterBy, setFilterBy] = useState<FilterBy>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredAndSorted = vocabulary
    .filter(word => {
      if (filterBy !== 'all' && word.proficiencyLevel !== filterBy) return false;
      if (searchTerm && !word.danishWord.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !word.englishTranslation.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'recent':
          return new Date(b.lastPracticed).getTime() - new Date(a.lastPracticed).getTime();
        case 'alphabetical':
          return a.danishWord.localeCompare(b.danishWord);
        case 'proficiency':
          const proficiencyOrder = { new: 0, learning: 1, familiar: 2, mastered: 3 };
          return proficiencyOrder[a.proficiencyLevel] - proficiencyOrder[b.proficiencyLevel];
        default:
          return 0;
      }
    });

  const getProficiencyColor = (level: string) => {
    switch (level) {
      case 'new': return '#f9ab00';
      case 'learning': return '#8ab4f8';
      case 'familiar': return '#81c995';
      case 'mastered': return '#1e8e3e';
      default: return '#5f6368';
    }
  };

  return (
    <div className="vocabulary-overlay" onClick={onClose}>
      <div className="vocabulary-panel" onClick={(e) => e.stopPropagation()}>
        <div className="vocabulary-header">
          <h2>Vocabulary ({vocabulary.length} words)</h2>
          <button className="close-button" onClick={onClose} aria-label="Close vocabulary">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" aria-hidden="true">
              <path d="M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256 342.6 150.6z"/>
            </svg>
          </button>
        </div>

        <div className="vocabulary-controls">
          <input
            type="text"
            placeholder="Search vocabulary..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="vocabulary-search"
          />
          
          <div className="vocabulary-filters">
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortBy)}>
              <option value="recent">Most Recent</option>
              <option value="alphabetical">Alphabetical</option>
              <option value="proficiency">Proficiency</option>
            </select>
            
            <select value={filterBy} onChange={(e) => setFilterBy(e.target.value as FilterBy)}>
              <option value="all">All Words</option>
              <option value="new">New</option>
              <option value="learning">Learning</option>
              <option value="familiar">Familiar</option>
              <option value="mastered">Mastered</option>
            </select>
          </div>
        </div>

        <div className="vocabulary-content">
          {filteredAndSorted.length === 0 ? (
            <div className="vocabulary-empty">
              <p>No vocabulary words yet.</p>
              <p>Start a conversation to build your vocabulary!</p>
            </div>
          ) : (
            <div className="vocabulary-grid">
              {filteredAndSorted.map(word => (
                <div key={word.id} className="vocabulary-card">
                  <div className="vocabulary-card-header">
                    <h3>{word.danishWord}</h3>
                    <span 
                      className="proficiency-badge"
                      style={{ backgroundColor: getProficiencyColor(word.proficiencyLevel) }}
                    >
                      {word.proficiencyLevel}
                    </span>
                  </div>
                  <p className="vocabulary-translation">{word.englishTranslation}</p>
                  {word.partOfSpeech && (
                    <p className="vocabulary-pos">{word.partOfSpeech}</p>
                  )}
                  <p className="vocabulary-context">"{word.context}"</p>
                  <div className="vocabulary-stats">
                    <span>Practiced: {word.practiceCount}x</span>
                    <span>Next review: {new Date(word.srsData.nextReviewDate).toLocaleDateString()}</span>
                  </div>
                  {onDeleteWord && (
                    <button 
                      className="delete-word-button"
                      onClick={() => onDeleteWord(word.id)}
                      aria-label="Delete word"
                    >
                      Delete
                    </button>
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

export default VocabularyList;
