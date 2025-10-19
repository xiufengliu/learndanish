import React, { useEffect, useMemo, useState } from 'react';
import { VocabularyWord } from '../types/vocabulary';

type AudienceLanguage = 'english' | 'chinese';
type ExerciseType = 'vocabulary' | 'grammar' | 'cloze';
type OptionStatus = 'idle' | 'correct' | 'incorrect';

interface ExerciseOption {
  id: string;
  label: string;
  isCorrect: boolean;
  explanation: string;
  status?: OptionStatus;
  disabled?: boolean;
}

interface ExerciseQuestion {
  id: string;
  type: ExerciseType;
  prompt: string;
  body?: string;
  hint?: string;
  options: ExerciseOption[];
}

interface ExerciseQuestionState extends ExerciseQuestion {
  attempts: number;
  incorrectAttempts: number;
  answeredCorrectly: boolean;
  firstAttemptCorrect: boolean;
  selectedOptionId?: string;
  feedback?: string;
  skipped?: boolean;
}

interface ExercisePanelProps {
  vocabulary: VocabularyWord[];
  audienceLanguage: AudienceLanguage;
  onClose: () => void;
}

const MAX_TRANSLATION_QUESTIONS = 5;
const MAX_GRAMMAR_QUESTIONS = 3;
const MAX_CLOZE_QUESTIONS = 3;
const MAX_TOTAL_QUESTIONS = 10;

const TRANSLATION_FALLBACKS_EN = [
  'journey',
  'coffee',
  'teacher',
  'morning',
  'friendship',
  'weather',
  'library',
  'music',
  'family',
  'evening'
];

const TRANSLATION_FALLBACKS_CN = [
  '旅程',
  '咖啡',
  '老师',
  '早晨',
  '朋友',
  '天气',
  '图书馆',
  '音乐',
  '家庭',
  '晚上'
];

const DANISH_FALLBACKS = [
  'ven',
  'hus',
  'bog',
  'mad',
  'kaffe',
  'dag',
  'morgen',
  'by',
  'familie',
  'vej'
];

const PART_OF_SPEECH_LABELS: Record<
  string,
  { english: string; chinese: string }
> = {
  noun: { english: 'Noun', chinese: '名词' },
  verb: { english: 'Verb', chinese: '动词' },
  adjective: { english: 'Adjective', chinese: '形容词' },
  adverb: { english: 'Adverb', chinese: '副词' },
  pronoun: { english: 'Pronoun', chinese: '代词' },
  preposition: { english: 'Preposition', chinese: '介词' },
  conjunction: { english: 'Conjunction', chinese: '连词' },
  interjection: { english: 'Interjection', chinese: '感叹词' },
  phrase: { english: 'Phrase', chinese: '短语' },
  expression: { english: 'Expression', chinese: '表达' }
};

const FALLBACK_PARTS_OF_SPEECH = [
  'noun',
  'verb',
  'adjective',
  'adverb',
  'pronoun',
  'preposition',
  'phrase'
];

function shuffleArray<T>(items: T[]): T[] {
  const array = [...items];
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function pickRandomElements<T>(items: T[], count: number): T[] {
  if (items.length <= count) {
    return shuffleArray(items);
  }
  return shuffleArray(items).slice(0, count);
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function formatPartOfSpeechLabel(
  value: string,
  audienceLanguage: AudienceLanguage
): string {
  const normalized = value.trim().toLowerCase();
  const mapping = PART_OF_SPEECH_LABELS[normalized];
  const readable =
    mapping?.english ?? value.charAt(0).toUpperCase() + value.slice(1);

  if (audienceLanguage === 'chinese') {
    const localized = mapping?.chinese ?? '词性';
    return `${readable} (${localized})`;
  }

  return readable;
}

function buildTranslationDistractors(
  words: VocabularyWord[],
  correctTranslation: string,
  audienceLanguage: AudienceLanguage,
  required: number
): string[] {
  const pool = words
    .map((word) => word.englishTranslation.trim())
    .filter(
      (translation) =>
        translation &&
        translation.toLowerCase() !== correctTranslation.toLowerCase()
    );

  const unique: string[] = [];
  for (const option of shuffleArray(pool)) {
    if (unique.length >= required) {
      break;
    }
    if (!unique.some((item) => item.toLowerCase() === option.toLowerCase())) {
      unique.push(option);
    }
  }

  const fallbacks =
    audienceLanguage === 'chinese'
      ? TRANSLATION_FALLBACKS_CN
      : TRANSLATION_FALLBACKS_EN;

  for (const fallback of fallbacks) {
    if (unique.length >= required) {
      break;
    }
    if (
      fallback.toLowerCase() !== correctTranslation.toLowerCase() &&
      !unique.some((item) => item.toLowerCase() === fallback.toLowerCase())
    ) {
      unique.push(fallback);
    }
  }

  return unique.slice(0, required);
}

function buildPartOfSpeechDistractors(
  words: VocabularyWord[],
  correctPartOfSpeech: string,
  required: number
): string[] {
  const pool = words
    .map((word) => word.partOfSpeech?.trim().toLowerCase())
    .filter(
      (pos): pos is string =>
        Boolean(pos) && pos !== correctPartOfSpeech.toLowerCase()
    );

  const unique: string[] = [];
  for (const option of shuffleArray(pool)) {
    if (unique.length >= required) {
      break;
    }
    if (!unique.includes(option)) {
      unique.push(option);
    }
  }

  for (const fallback of FALLBACK_PARTS_OF_SPEECH) {
    if (unique.length >= required) {
      break;
    }
    if (
      fallback !== correctPartOfSpeech.toLowerCase() &&
      !unique.includes(fallback)
    ) {
      unique.push(fallback);
    }
  }

  return unique.slice(0, required);
}

function buildDanishDistractors(
  words: VocabularyWord[],
  correctWord: string,
  required: number
): string[] {
  const pool = words
    .map((word) => word.danishWord.trim())
    .filter(
      (text) => text && text.toLowerCase() !== correctWord.toLowerCase()
    );

  const unique: string[] = [];
  for (const option of shuffleArray(pool)) {
    if (unique.length >= required) {
      break;
    }
    if (!unique.some((item) => item.toLowerCase() === option.toLowerCase())) {
      unique.push(option);
    }
  }

  for (const fallback of DANISH_FALLBACKS) {
    if (unique.length >= required) {
      break;
    }
    if (
      fallback.toLowerCase() !== correctWord.toLowerCase() &&
      !unique.some((item) => item.toLowerCase() === fallback.toLowerCase())
    ) {
      unique.push(fallback);
    }
  }

  return unique.slice(0, required);
}

function selectSentenceForWord(word: VocabularyWord): string | null {
  const lowered = word.danishWord.toLowerCase();

  const fromExamples = word.exampleSentences?.find((sentence) =>
    sentence.toLowerCase().includes(lowered)
  );
  if (fromExamples) {
    return fromExamples;
  }

  if (word.context && word.context.toLowerCase().includes(lowered)) {
    return word.context;
  }

  return null;
}

function createTranslationQuestions(
  words: VocabularyWord[],
  audienceLanguage: AudienceLanguage
): ExerciseQuestion[] {
  const count = Math.min(MAX_TRANSLATION_QUESTIONS, words.length);
  return pickRandomElements(words, count).map((word, index) => {
    const questionId = `${word.id}-translation-${index}`;
    const prompt =
      audienceLanguage === 'chinese'
        ? `请选择 “${word.danishWord}” 的正确含义：`
        : `Choose the correct meaning of “${word.danishWord}”.`;

    const baseExplanation =
      audienceLanguage === 'chinese'
        ? `“${word.danishWord}” 的意思是 “${word.englishTranslation}”。`
        : `“${word.danishWord}” means “${word.englishTranslation}”.`;

    const distractors = buildTranslationDistractors(
      words.filter((other) => other.id !== word.id),
      word.englishTranslation,
      audienceLanguage,
      3
    );

    const options = shuffleArray<ExerciseOption>([
      {
        id: `${questionId}-option-correct`,
        label: word.englishTranslation,
        isCorrect: true,
        explanation: baseExplanation
      },
      ...distractors.map<ExerciseOption>((text, optionIndex) => ({
        id: `${questionId}-option-${optionIndex}`,
        label: text,
        isCorrect: false,
        explanation: baseExplanation
      }))
    ]);

    return {
      id: questionId,
      type: 'vocabulary',
      prompt,
      hint:
        audienceLanguage === 'chinese'
          ? '提示：回想它在对话中的翻译。'
          : 'Hint: Think about how it was translated in your conversation.',
      options
    };
  });
}

function createGrammarQuestions(
  words: VocabularyWord[],
  audienceLanguage: AudienceLanguage
): ExerciseQuestion[] {
  const candidates = words.filter((word) => Boolean(word.partOfSpeech));
  if (candidates.length === 0) {
    return [];
  }

  const count = Math.min(MAX_GRAMMAR_QUESTIONS, candidates.length);
  return pickRandomElements(candidates, count).map((word, index) => {
    const partOfSpeech = word.partOfSpeech ?? '';
    const questionId = `${word.id}-grammar-${index}`;
    const prompt =
      audienceLanguage === 'chinese'
        ? `“${word.danishWord}” 在语法中属于哪一类？`
        : `Which part of speech best describes “${word.danishWord}”?`;

    const partLabel = formatPartOfSpeechLabel(partOfSpeech, audienceLanguage);
    const baseExplanation =
      audienceLanguage === 'chinese'
        ? `“${word.danishWord}” 在句子里通常作为 ${partLabel} 使用。`
        : `“${word.danishWord}” is typically used as a ${partLabel}.`;

    const distractors = buildPartOfSpeechDistractors(
      words.filter((other) => other.id !== word.id),
      partOfSpeech,
      3
    );

    const options = shuffleArray<ExerciseOption>([
      {
        id: `${questionId}-option-correct`,
        label: partLabel,
        isCorrect: true,
        explanation: baseExplanation
      },
      ...distractors.map<ExerciseOption>((pos, optionIndex) => ({
        id: `${questionId}-option-${optionIndex}`,
        label: formatPartOfSpeechLabel(pos, audienceLanguage),
        isCorrect: false,
        explanation: baseExplanation
      }))
    ]);

    return {
      id: questionId,
      type: 'grammar',
      prompt,
      hint:
        audienceLanguage === 'chinese'
          ? '提示：注意单词在句子中的作用。'
          : 'Hint: Think about the role this word plays in a sentence.',
      options
    };
  });
}

function createClozeQuestions(
  words: VocabularyWord[],
  audienceLanguage: AudienceLanguage
): ExerciseQuestion[] {
  const candidates = words
    .map((word) => {
      const sentence = selectSentenceForWord(word);
      return { word, sentence };
    })
    .filter((item): item is { word: VocabularyWord; sentence: string } =>
      Boolean(item.sentence)
    );

  if (candidates.length === 0) {
    return [];
  }

  const count = Math.min(MAX_CLOZE_QUESTIONS, candidates.length);
  return pickRandomElements(candidates, count)
    .map(({ word, sentence }, index) => {
      const questionId = `${word.id}-cloze-${index}`;
      const cleanSentence = sentence.replace(/\s+/g, ' ').trim();

      const regex = new RegExp(`\\b${escapeRegExp(word.danishWord)}\\b`, 'i');
      const hasExactWord = regex.test(cleanSentence);
      const displayedSentence = hasExactWord
        ? cleanSentence.replace(
            new RegExp(`\\b${escapeRegExp(word.danishWord)}\\b`, 'gi'),
            '____'
          )
        : `____ ${cleanSentence}`;

      const baseExplanation =
        audienceLanguage === 'chinese'
          ? `句子中缺少的单词是 “${word.danishWord}”，意思是 “${word.englishTranslation}”。`
          : `The missing word is “${word.danishWord}”, which means “${word.englishTranslation}”.`;

      const distractors = buildDanishDistractors(
        words.filter((other) => other.id !== word.id),
        word.danishWord,
        3
      );

      if (distractors.length === 0) {
        return null;
      }

      const options = shuffleArray<ExerciseOption>([
        {
          id: `${questionId}-option-correct`,
          label: word.danishWord,
          isCorrect: true,
          explanation: baseExplanation
        },
        ...distractors.map<ExerciseOption>((text, optionIndex) => ({
          id: `${questionId}-option-${optionIndex}`,
          label: text,
          isCorrect: false,
          explanation: baseExplanation
        }))
      ]);

      return {
        id: questionId,
        type: 'cloze',
        prompt:
          audienceLanguage === 'chinese'
            ? '请选择最合适的单词完成句子：'
            : 'Select the word that best completes the sentence:',
        body: displayedSentence,
        hint:
          audienceLanguage === 'chinese'
            ? `提示：它的意思是 “${word.englishTranslation}”。`
            : `Hint: It means “${word.englishTranslation}”.`,
        options
      };
    })
    .filter((question): question is ExerciseQuestion => question !== null);
}

function generateExerciseQuestions(
  vocabulary: VocabularyWord[],
  audienceLanguage: AudienceLanguage
): ExerciseQuestion[] {
  const usableWords = vocabulary.filter(
    (word) => word.danishWord?.trim() && word.englishTranslation?.trim()
  );

  if (usableWords.length === 0) {
    return [];
  }

  const translationQuestions = createTranslationQuestions(
    usableWords,
    audienceLanguage
  );
  const grammarQuestions = createGrammarQuestions(
    usableWords,
    audienceLanguage
  );
  const clozeQuestions = createClozeQuestions(usableWords, audienceLanguage);

  const combined = [
    ...translationQuestions,
    ...grammarQuestions,
    ...clozeQuestions
  ];

  if (combined.length === 0 && usableWords.length > 0) {
    return createTranslationQuestions(usableWords, audienceLanguage).slice(
      0,
      3
    );
  }

  return shuffleArray(combined).slice(
    0,
    Math.min(MAX_TOTAL_QUESTIONS, combined.length)
  );
}

function localizeExerciseTypeLabel(
  type: ExerciseType,
  audienceLanguage: AudienceLanguage
): string {
  if (audienceLanguage === 'chinese') {
    switch (type) {
      case 'vocabulary':
        return '词汇';
      case 'grammar':
        return '语法';
      case 'cloze':
        return '完形填空';
      default:
        return '练习';
    }
  }

  switch (type) {
    case 'vocabulary':
      return 'Vocabulary';
    case 'grammar':
      return 'Grammar';
    case 'cloze':
      return 'Cloze';
    default:
      return 'Exercise';
  }
}

const ExercisePanel: React.FC<ExercisePanelProps> = ({
  vocabulary,
  audienceLanguage,
  onClose
}) => {
  const [questions, setQuestions] = useState<ExerciseQuestionState[]>(() =>
    generateExerciseQuestions(vocabulary, audienceLanguage).map((question) => ({
      ...question,
      attempts: 0,
      incorrectAttempts: 0,
      answeredCorrectly: false,
      firstAttemptCorrect: false
    }))
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showSummary, setShowSummary] = useState(false);

  useEffect(() => {
    const generated = generateExerciseQuestions(vocabulary, audienceLanguage);
    setQuestions(
      generated.map((question) => ({
        ...question,
        attempts: 0,
        incorrectAttempts: 0,
        answeredCorrectly: false,
        firstAttemptCorrect: false
      }))
    );
    setCurrentIndex(0);
    setShowSummary(false);
  }, [vocabulary, audienceLanguage]);

  const currentQuestion = questions[currentIndex];

  const stats = useMemo(() => {
    const totalQuestions = questions.length;
    const completed = questions.filter(
      (question) => question.answeredCorrectly || question.skipped
    ).length;
    const correct = questions.filter((question) => question.answeredCorrectly)
      .length;
    const firstTry = questions.filter(
      (question) => question.firstAttemptCorrect
    ).length;
    const incorrectAttempts = questions.reduce(
      (sum, question) => sum + question.incorrectAttempts,
      0
    );

    return {
      totalQuestions,
      completed,
      correct,
      firstTry,
      incorrectAttempts,
      accuracy:
        totalQuestions > 0 ? Math.round((correct / totalQuestions) * 100) : 0,
      firstTryAccuracy:
        totalQuestions > 0
          ? Math.round((firstTry / totalQuestions) * 100)
          : 0
    };
  }, [questions]);

  const handleOptionSelect = (optionId: string) => {
    setQuestions((prev) =>
      prev.map((question, index) => {
        if (index !== currentIndex) {
          return question;
        }

        if (question.answeredCorrectly) {
          return question;
        }

        const selectedOption = question.options.find(
          (option) => option.id === optionId
        );
        if (!selectedOption) {
          return question;
        }

        const baseFeedback = selectedOption.explanation;
        const feedback = selectedOption.isCorrect
          ? audienceLanguage === 'chinese'
            ? `太棒了！${baseFeedback}`
            : `Great job! ${baseFeedback}`
          : audienceLanguage === 'chinese'
          ? `不太对：${baseFeedback}`
          : `Not quite: ${baseFeedback}`;

        const updatedOptions = question.options.map((option) => {
          if (option.id === optionId) {
            return {
              ...option,
              status: selectedOption.isCorrect ? 'correct' : 'incorrect',
              disabled: true
            };
          }
          if (selectedOption.isCorrect) {
            return { ...option, disabled: true };
          }
          return option;
        });

        return {
          ...question,
          attempts: question.attempts + 1,
          incorrectAttempts: selectedOption.isCorrect
            ? question.incorrectAttempts
            : question.incorrectAttempts + 1,
          answeredCorrectly: selectedOption.isCorrect
            ? true
            : question.answeredCorrectly,
          firstAttemptCorrect: selectedOption.isCorrect
            ? question.attempts === 0
            : question.firstAttemptCorrect,
          selectedOptionId: optionId,
          feedback,
          options: updatedOptions
        };
      })
    );
  };

  const handleSkipQuestion = () => {
    setQuestions((prev) =>
      prev.map((question, index) => {
        if (index !== currentIndex) {
          return question;
        }

        if (question.answeredCorrectly || question.skipped) {
          return question;
        }

        const correctOption = question.options.find(
          (option) => option.isCorrect
        );
        const feedback =
          audienceLanguage === 'chinese'
            ? `已跳过。本题正确答案是 “${correctOption?.label ?? ''}”。`
            : `Skipped. The correct answer is “${correctOption?.label ?? ''}”.`;

        const updatedOptions = question.options.map((option) => ({
          ...option,
          disabled: true,
          status: option.isCorrect ? 'correct' : option.status
        }));

        return {
          ...question,
          attempts: question.attempts === 0 ? 1 : question.attempts,
          incorrectAttempts: question.incorrectAttempts + 1,
          skipped: true,
          feedback,
          options: updatedOptions
        };
      })
    );

    moveToNext();
  };

  const moveToNext = () => {
    if (currentIndex >= questions.length - 1) {
      setShowSummary(true);
      return;
    }
    setCurrentIndex((index) => index + 1);
  };

  const handleNextQuestion = () => {
    moveToNext();
  };

  const handleRestart = () => {
    const regenerated = generateExerciseQuestions(vocabulary, audienceLanguage);
    setQuestions(
      regenerated.map((question) => ({
        ...question,
        attempts: 0,
        incorrectAttempts: 0,
        answeredCorrectly: false,
        firstAttemptCorrect: false
      }))
    );
    setCurrentIndex(0);
    setShowSummary(false);
  };

  if (questions.length === 0) {
    return (
      <div className="exercise-overlay" onClick={onClose}>
        <div className="exercise-panel" onClick={(event) => event.stopPropagation()}>
          <div className="exercise-header">
            <h2>
              {audienceLanguage === 'chinese'
                ? '词汇练习'
                : 'Vocabulary Exercises'}
            </h2>
            <button
              className="close-button"
              onClick={onClose}
              aria-label="Close exercises"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 384 512"
                aria-hidden="true"
              >
                <path d="M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256 342.6 150.6z" />
              </svg>
            </button>
          </div>
          <div className="exercise-empty">
            <h3>
              {audienceLanguage === 'chinese'
                ? '还没有可练习的单词'
                : 'No vocabulary to practice yet'}
            </h3>
            <p>
              {audienceLanguage === 'chinese'
                ? '请先在会话中收集一些生词，然后再来进行练习。'
                : 'Capture new words in your conversation to unlock practice exercises.'}
            </p>
            <button className="primary-button" onClick={onClose}>
              {audienceLanguage === 'chinese' ? '返回' : 'Back to chat'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showSummary) {
    return (
      <div className="exercise-overlay" onClick={onClose}>
        <div className="exercise-panel" onClick={(event) => event.stopPropagation()}>
          <div className="exercise-header">
            <h2>
              {audienceLanguage === 'chinese'
                ? '练习总结'
                : 'Exercise Summary'}
            </h2>
            <button
              className="close-button"
              onClick={onClose}
              aria-label="Close exercises"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 384 512"
                aria-hidden="true"
              >
                <path d="M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256 342.6 150.6z" />
              </svg>
            </button>
          </div>
          <div className="exercise-summary">
            <div className="exercise-summary-stats">
              <div className="exercise-summary-card">
                <span className="exercise-summary-value">{stats.correct}</span>
                <span className="exercise-summary-label">
                  {audienceLanguage === 'chinese'
                    ? '答对题目'
                    : 'Correct answers'}
                </span>
              </div>
              <div className="exercise-summary-card">
                <span className="exercise-summary-value">
                  {`${stats.accuracy}%`}
                </span>
                <span className="exercise-summary-label">
                  {audienceLanguage === 'chinese'
                    ? '整体准确率'
                    : 'Overall accuracy'}
                </span>
              </div>
              <div className="exercise-summary-card">
                <span className="exercise-summary-value">
                  {`${stats.firstTryAccuracy}%`}
                </span>
                <span className="exercise-summary-label">
                  {audienceLanguage === 'chinese'
                    ? '首轮正确率'
                    : 'First-try accuracy'}
                </span>
              </div>
              <div className="exercise-summary-card">
                <span className="exercise-summary-value">
                  {stats.incorrectAttempts}
                </span>
                <span className="exercise-summary-label">
                  {audienceLanguage === 'chinese'
                    ? '错误尝试'
                    : 'Incorrect attempts'}
                </span>
              </div>
            </div>
            <div className="exercise-summary-actions">
              <button className="primary-button" onClick={handleRestart}>
                {audienceLanguage === 'chinese'
                  ? '再练一组'
                  : 'Practice again'}
              </button>
              <button className="secondary-button" onClick={onClose}>
                {audienceLanguage === 'chinese'
                  ? '返回会话'
                  : 'Back to chat'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="exercise-overlay" onClick={onClose}>
      <div className="exercise-panel" onClick={(event) => event.stopPropagation()}>
        <div className="exercise-header">
          <div className="exercise-header-titles">
            <h2>
              {audienceLanguage === 'chinese'
                ? '词汇练习'
                : 'Vocabulary Exercises'}
            </h2>
            <span className="exercise-progress">
              {audienceLanguage === 'chinese'
                ? `题目 ${currentIndex + 1} / ${questions.length}`
                : `Question ${currentIndex + 1} of ${questions.length}`}
            </span>
          </div>
          <button
            className="close-button"
            onClick={onClose}
            aria-label="Close exercises"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 384 512"
              aria-hidden="true"
            >
              <path d="M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256 342.6 150.6z" />
            </svg>
          </button>
        </div>

        <div className="exercise-content">
          <div className="exercise-type-chip">
            {localizeExerciseTypeLabel(currentQuestion.type, audienceLanguage)}
          </div>
          <div className="exercise-question">
            <p className="exercise-question-prompt">{currentQuestion.prompt}</p>
            {currentQuestion.body && (
              <blockquote className="exercise-question-body">
                {currentQuestion.body}
              </blockquote>
            )}
            {currentQuestion.hint && (
              <p className="exercise-question-hint">{currentQuestion.hint}</p>
            )}
          </div>

          <div className="exercise-options">
            {currentQuestion.options.map((option) => (
              <button
                key={option.id}
                className={`exercise-option ${
                  option.status === 'correct'
                    ? 'exercise-option-correct'
                    : option.status === 'incorrect'
                    ? 'exercise-option-incorrect'
                    : ''
                }`}
                onClick={() => handleOptionSelect(option.id)}
                disabled={option.disabled}
              >
                {option.label}
              </button>
            ))}
          </div>

          {currentQuestion.feedback && (
            <div
              className={`exercise-feedback ${
                currentQuestion.answeredCorrectly
                  ? 'exercise-feedback-success'
                  : currentQuestion.skipped
                  ? 'exercise-feedback-muted'
                  : 'exercise-feedback-error'
              }`}
            >
              {currentQuestion.feedback}
            </div>
          )}
        </div>

        <div className="exercise-footer">
          <button
            className="secondary-button"
            onClick={handleSkipQuestion}
            disabled={currentQuestion.answeredCorrectly || currentQuestion.skipped}
          >
            {audienceLanguage === 'chinese' ? '跳过' : 'Skip'}
          </button>
          <button
            className="primary-button"
            onClick={handleNextQuestion}
            disabled={
              !currentQuestion.answeredCorrectly && !currentQuestion.skipped
            }
          >
            {audienceLanguage === 'chinese'
              ? currentIndex === questions.length - 1
                ? '查看总结'
                : '下一题'
              : currentIndex === questions.length - 1
              ? 'See summary'
              : 'Next question'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExercisePanel;
