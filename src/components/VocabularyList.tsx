import React, { useState } from 'react';
import { VocabularyWord } from '../types/vocabulary';
import { generateExampleSentences, generateCulturalNote, generateGrammaticalForms } from '../utils/exampleGenerator';
import { playDanishText } from '../utils/tts';

interface VocabularyListProps {
  vocabulary: VocabularyWord[];
  audienceLanguage: 'english' | 'chinese';
  onClose: () => void;
  onDeleteWord?: (id: string) => void;
  onUpdateWord?: (id: string, updates: Partial<VocabularyWord>) => void;
  onClearAll?: () => void;
}


type SortBy = 'recent' | 'alphabetical' | 'proficiency';
type FilterBy = 'all' | 'unmastered' | 'mastered';

const VocabularyList: React.FC<VocabularyListProps> = ({ vocabulary, audienceLanguage, onClose, onDeleteWord, onUpdateWord, onClearAll }) => {
  const [sortBy, setSortBy] = useState<SortBy>('recent');
  const [filterBy, setFilterBy] = useState<FilterBy>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedWords, setExpandedWords] = useState<Set<string>>(new Set());
  const [loadingExamples, setLoadingExamples] = useState<Set<string>>(new Set());
  const [loadingCultural, setLoadingCultural] = useState<Set<string>>(new Set());
  const [loadingGrammar, setLoadingGrammar] = useState<Set<string>>(new Set());

  const handleClearAll = () => {
    if (vocabulary.length > 0 && window.confirm('Are you sure you want to delete all vocabulary words? This cannot be undone.')) {
      onClearAll?.();
    }
  };

  const filteredAndSorted = vocabulary
    .filter(word => {
      if (filterBy === 'mastered' && word.proficiencyLevel !== 'mastered') return false;
      if (filterBy === 'unmastered' && word.proficiencyLevel === 'mastered') return false;
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

  const toggleExpanded = (wordId: string) => {
    const newExpanded = new Set(expandedWords);
    if (newExpanded.has(wordId)) {
      newExpanded.delete(wordId);
    } else {
      newExpanded.add(wordId);
    }
    setExpandedWords(newExpanded);
  };

  const handleGenerateExamples = async (word: VocabularyWord) => {
    if (!onUpdateWord || word.exampleSentences) return;
    
    setLoadingExamples(prev => new Set(prev).add(word.id));
    try {
      const examples = await generateExampleSentences(
        word.danishWord,
        word.englishTranslation,
        word.partOfSpeech,
        audienceLanguage
      );
      onUpdateWord(word.id, { exampleSentences: examples });
    } catch (error) {
      console.error('Failed to generate examples:', error);
    } finally {
      setLoadingExamples(prev => {
        const newSet = new Set(prev);
        newSet.delete(word.id);
        return newSet;
      });
    }
  };

  const handleGenerateCultural = async (word: VocabularyWord) => {
    if (!onUpdateWord || word.culturalNotes) return;
    
    setLoadingCultural(prev => new Set(prev).add(word.id));
    try {
      const note = await generateCulturalNote(word.danishWord, word.englishTranslation, audienceLanguage);
      if (note) {
        onUpdateWord(word.id, { culturalNotes: note });
      }
    } catch (error) {
      console.error('Failed to generate cultural note:', error);
    } finally {
      setLoadingCultural(prev => {
        const newSet = new Set(prev);
        newSet.delete(word.id);
        return newSet;
      });
    }
  };

  const handleGenerateGrammar = async (word: VocabularyWord) => {
    if (!onUpdateWord || word.grammaticalForms) return;
    
    setLoadingGrammar(prev => new Set(prev).add(word.id));
    try {
      const forms = await generateGrammaticalForms(
        word.danishWord,
        word.englishTranslation,
        word.partOfSpeech,
        audienceLanguage
      );
      if (forms) {
        onUpdateWord(word.id, { grammaticalForms: forms });
      }
    } catch (error) {
      console.error('Failed to generate grammatical forms:', error);
    } finally {
      setLoadingGrammar(prev => {
        const newSet = new Set(prev);
        newSet.delete(word.id);
        return newSet;
      });
    }
  };

  return (
    <div className="vocabulary-overlay" onClick={onClose}>
      <div className="vocabulary-panel" onClick={(e) => e.stopPropagation()}>
        <div className="vocabulary-header">
          <h2>Vocabulary ({vocabulary.length} words)</h2>
          <div className="vocabulary-header-actions">
            {vocabulary.length > 0 && onClearAll && (
              <button 
                className="clear-all-button" 
                onClick={handleClearAll}
                aria-label="Clear all vocabulary"
                title="Clear all vocabulary"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" aria-hidden="true">
                  <path d="M135.2 17.7L128 32H32C14.3 32 0 46.3 0 64S14.3 96 32 96H416c17.7 0 32-14.3 32-32s-14.3-32-32-32H320l-7.2-14.3C307.4 6.8 296.3 0 284.2 0H163.8c-12.1 0-23.2 6.8-28.6 17.7zM416 128H32L53.2 467c1.6 25.3 22.6 45 47.9 45H346.9c25.3 0 46.3-19.7 47.9-45L416 128z"/>
                </svg>
              </button>
            )}
            <button className="close-button" onClick={onClose} aria-label="Close vocabulary">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" aria-hidden="true">
                <path d="M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256 342.6 150.6z" />
              </svg>
            </button>
          </div>
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
              <option value="unmastered">Unmastered</option>
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
                      onClick={() => void playDanishText(word.danishWord)}
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
                      onClick={() => void playDanishText(word.context)}
                      aria-label="Read example sentence"
                      title="Hear example sentence"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512">
                        <path d="M301.1 34.8C312.6 40 320 51.4 320 64V448c0 12.6-7.4 24-18.9 29.2s-25 3.1-34.4-5.3L131.8 352H64c-35.3 0-64-28.7-64-64V224c0-35.3 28.7-64 64-64h67.8L266.7 40.1c9.4-8.4 22.9-10.4 34.4-5.3zM412.6 181.5C434.1 199.1 448 225.9 448 256s-13.9 56.9-35.4 74.5c-10.3 8.4-25.4 6.8-33.8-3.5s-6.8-25.4 3.5-33.8C393.1 284.4 400 271 400 256s-6.9-28.4-17.7-37.3c-10.3-8.4-11.8-23.5-3.5-33.8s23.5-11.8 33.8-3.5zm90.5-90.5C528.2 115.2 560 183.8 560 256s-31.8 140.8-56.9 165.1c-10.3 9.9-26.8 9.6-36.7-.7s-9.6-26.8 .7-36.7C489.8 362.3 512 311.7 512 256s-22.2-106.3-44.9-127.7c-10.3-9.9-10.6-26.3-.7-36.7s26.3-10.6 36.7-.7z" />
                      </svg>
                    </button>
                  </div>

                  {/* Cultural Notes Section */}
                  {word.culturalNotes && (
                    <div className="vocabulary-cultural-note">
                      <div className="cultural-note-header">🇩🇰 Cultural Note</div>
                      <p>{word.culturalNotes}</p>
                    </div>
                  )}

                  {/* Grammatical Forms Section */}
                  {word.grammaticalForms && (
                    <div className="vocabulary-grammar-forms">
                      <div className="grammar-forms-header">📖 Grammar Forms</div>
                      {word.grammaticalForms.infinitive && (
                        <div className="grammar-forms-grid">
                          <div className="grammar-form-item">
                            <span className="grammar-form-label">Infinitive:</span>
                            <span className="grammar-form-value">{word.grammaticalForms.infinitive}</span>
                          </div>
                          <div className="grammar-form-item">
                            <span className="grammar-form-label">Present:</span>
                            <span className="grammar-form-value">{word.grammaticalForms.present}</span>
                          </div>
                          <div className="grammar-form-item">
                            <span className="grammar-form-label">Past:</span>
                            <span className="grammar-form-value">{word.grammaticalForms.past}</span>
                          </div>
                          {word.grammaticalForms.presentPerfect && (
                            <div className="grammar-form-item">
                              <span className="grammar-form-label">Perfect:</span>
                              <span className="grammar-form-value">{word.grammaticalForms.presentPerfect}</span>
                            </div>
                          )}
                          {word.grammaticalForms.imperative && (
                            <div className="grammar-form-item">
                              <span className="grammar-form-label">Imperative:</span>
                              <span className="grammar-form-value">{word.grammaticalForms.imperative}</span>
                            </div>
                          )}
                        </div>
                      )}
                      {word.grammaticalForms.singular && (
                        <div className="grammar-forms-grid">
                          {word.grammaticalForms.gender && (
                            <div className="grammar-form-item grammar-form-full">
                              <span className="grammar-form-label">Gender:</span>
                              <span className="grammar-form-value grammar-gender">
                                {word.grammaticalForms.gender === 'common' ? 'en-word (common)' : 'et-word (neuter)'}
                              </span>
                            </div>
                          )}
                          <div className="grammar-form-item">
                            <span className="grammar-form-label">Singular:</span>
                            <span className="grammar-form-value">{word.grammaticalForms.singular}</span>
                          </div>
                          <div className="grammar-form-item">
                            <span className="grammar-form-label">Plural:</span>
                            <span className="grammar-form-value">{word.grammaticalForms.plural}</span>
                          </div>
                          {word.grammaticalForms.definite && (
                            <div className="grammar-form-item">
                              <span className="grammar-form-label">Definite:</span>
                              <span className="grammar-form-value">{word.grammaticalForms.definite}</span>
                            </div>
                          )}
                          {word.grammaticalForms.definitePlural && (
                            <div className="grammar-form-item">
                              <span className="grammar-form-label">Def. Plural:</span>
                              <span className="grammar-form-value">{word.grammaticalForms.definitePlural}</span>
                            </div>
                          )}
                        </div>
                      )}
                      {word.grammaticalForms.positive && (
                        <div className="grammar-forms-grid">
                          <div className="grammar-form-item">
                            <span className="grammar-form-label">Positive:</span>
                            <span className="grammar-form-value">{word.grammaticalForms.positive}</span>
                          </div>
                          <div className="grammar-form-item">
                            <span className="grammar-form-label">Comparative:</span>
                            <span className="grammar-form-value">{word.grammaticalForms.comparative}</span>
                          </div>
                          <div className="grammar-form-item">
                            <span className="grammar-form-label">Superlative:</span>
                            <span className="grammar-form-value">{word.grammaticalForms.superlative}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="vocabulary-stats">
                    <span>Practiced: {word.practiceCount}x</span>
                    <span>Next review: {new Date(word.srsData.nextReviewDate).toLocaleDateString()}</span>
                  </div>

                  {/* Expandable section for additional features */}
                  <div className="vocabulary-actions">
                    <button
                      className="vocab-expand-button"
                      onClick={() => toggleExpanded(word.id)}
                      aria-label={expandedWords.has(word.id) ? 'Show less' : 'Show more'}
                    >
                      {expandedWords.has(word.id) ? '▼ Show Less' : '▶ More Examples & Notes'}
                    </button>
                  </div>

                  {expandedWords.has(word.id) && (
                    <div className="vocabulary-expanded">
                      {/* Example Sentences */}
                      <div className="vocabulary-examples-section">
                        <h4>Example Sentences</h4>
                        {word.exampleSentences && word.exampleSentences.length > 0 ? (
                          <ul className="example-sentences-list">
                            {word.exampleSentences.map((sentence, idx) => {
                              const [danishPart, englishPart] = sentence.split(' - ');
                              return (
                                <li key={idx}>
                                  <div className="example-sentence-text">
                                    <span className="example-sentence-danish">{danishPart}</span>
                                    {englishPart && (
                                      <span className="example-sentence-english">{englishPart}</span>
                                    )}
                                  </div>
                                  <button
                                    className="vocab-speaker-button-small"
                                    onClick={() => {
                    void playDanishText(danishPart ?? sentence);
                                    }}
                                    aria-label="Hear sentence"
                                  >
                                    🔊
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                        ) : (
                          <button
                            className="generate-button"
                            onClick={() => handleGenerateExamples(word)}
                            disabled={loadingExamples.has(word.id) || !onUpdateWord}
                          >
                            {loadingExamples.has(word.id) ? '⏳ Generating...' : '✨ Generate Examples'}
                          </button>
                        )}
                      </div>

                      {/* Cultural Notes */}
                      {!word.culturalNotes && (
                        <div className="vocabulary-cultural-section">
                          <button
                            className="generate-button"
                            onClick={() => handleGenerateCultural(word)}
                            disabled={loadingCultural.has(word.id) || !onUpdateWord}
                          >
                            {loadingCultural.has(word.id) ? '⏳ Checking...' : '🇩🇰 Check Cultural Context'}
                          </button>
                        </div>
                      )}

                      {/* Grammatical Forms */}
                      {!word.grammaticalForms && (word.partOfSpeech === 'verb' || word.partOfSpeech === 'noun' || word.partOfSpeech === 'adjective') && (
                        <div className="vocabulary-grammar-section">
                          <button
                            className="generate-button"
                            onClick={() => handleGenerateGrammar(word)}
                            disabled={loadingGrammar.has(word.id) || !onUpdateWord}
                          >
                            {loadingGrammar.has(word.id) ? '⏳ Generating...' : '📖 Generate Grammar Forms'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

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
