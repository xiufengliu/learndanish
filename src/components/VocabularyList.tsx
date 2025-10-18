import React, { useState } from 'react';
import { VocabularyWord } from '../types/vocabulary';

interface VocabularyListProps {
  vocabulary: VocabularyWord[];
  onClose: () => void;
  onDeleteWord?: (id: string) => void;
}

const speakText = (text: string, lang: string = 'da-DK') => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  }
};

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
              <path d="M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256 342.6 150.6z" />
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
                    <div className="vocabulary-word-with-speaker">
                      <h3>{word.danishWord}</h3>
                      <button
                        className="vocab-speaker-button"
                        onClick={() => speakText(word.danishWord, 'da-DK')}
                        aria-label="Pronounce Danish word"
                        title="Hear pronunciation"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512">
                          <path d="M301.1 34.8C312.6 40 320 51.4 320 64V448c0 12.6-7.4 24-18.9 29.2s-25 3.1-34.4-5.3L131.8 352H64c-35.3 0-64-28.7-64-64V224c0-35.3 28.7-64 64-64h67.8L266.7 40.1c9.4-8.4 22.9-10.4 34.4-5.3zM412.6 181.5C434.1 199.1 448 225.9 448 256s-13.9 56.9-35.4 74.5c-10.3 8.4-25.4 6.8-33.8-3.5s-6.8-25.4 3.5-33.8C393.1 284.4 400 271 400 256s-6.9-28.4-17.7-37.3c-10.3-8.4-11.8-23.5-3.5-33.8s23.5-11.8 33.8-3.5zm90.5-90.5C528.2 115.2 560 183.8 560 256s-31.8 140.8-56.9 165.1c-10.3 9.9-26.8 9.6-36.7-.7s-9.6-26.8 .7-36.7C489.8 362.3 512 311.7 512 256s-22.2-106.3-44.9-127.7c-10.3-9.9-10.6-26.3-.7-36.7s26.3-10.6 36.7-.7z" />
                        </svg>
                      </button>
                    </div>
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
                  <div className="vocabulary-context-with-speaker">
                    <p className="vocabulary-context">"{word.context}"</p>
                    <button
                      className="vocab-speaker-button context-speaker"
                      onClick={() => speakText(word.context, 'da-DK')}
                      aria-label="Read example sentence"
                      title="Hear example sentence"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512">
                        <path d="M301.1 34.8C312.6 40 320 51.4 320 64V448c0 12.6-7.4 24-18.9 29.2s-25 3.1-34.4-5.3L131.8 352H64c-35.3 0-64-28.7-64-64V224c0-35.3 28.7-64 64-64h67.8L266.7 40.1c9.4-8.4 22.9-10.4 34.4-5.3zM412.6 181.5C434.1 199.1 448 225.9 448 256s-13.9 56.9-35.4 74.5c-10.3 8.4-25.4 6.8-33.8-3.5s-6.8-25.4 3.5-33.8C393.1 284.4 400 271 400 256s-6.9-28.4-17.7-37.3c-10.3-8.4-11.8-23.5-3.5-33.8s23.5-11.8 33.8-3.5zm90.5-90.5C528.2 115.2 560 183.8 560 256s-31.8 140.8-56.9 165.1c-10.3 9.9-26.8 9.6-36.7-.7s-9.6-26.8 .7-36.7C489.8 362.3 512 311.7 512 256s-22.2-106.3-44.9-127.7c-10.3-9.9-10.6-26.3-.7-36.7s26.3-10.6 36.7-.7z" />
                      </svg>
                    </button>
                  </div>
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
