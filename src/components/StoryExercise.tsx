import React, { useEffect, useMemo, useState } from 'react';
import type { ExerciseQuestion, ExerciseOption, ExerciseQuestionType } from '../types/exercise';

type AudienceLanguage = 'english' | 'chinese';
type OptionStatus = 'idle' | 'correct' | 'incorrect';

interface ExerciseOptionState extends ExerciseOption {
  id: string;
  status?: OptionStatus;
  disabled?: boolean;
}

interface StoryExerciseQuestionState extends ExerciseQuestion {
  danishSentence: string;
  options: ExerciseOptionState[];
  difficultyScore: number;
  attempts: number;
  incorrectAttempts: number;
  answeredCorrectly: boolean;
  firstAttemptCorrect: boolean;
  selectedOptionId?: string;
  feedback?: string;
  skipped?: boolean;
}

interface StoryExerciseProps {
  danishSentences: string[];
  englishSentences: string[];
  audienceLanguage: AudienceLanguage;
  exercises?: ExerciseQuestion[];
}

const QUESTIONS_PER_TEST = 10;
const MIN_COMPREHENSION_PER_TEST = Math.min(QUESTIONS_PER_TEST, 5);

const commonPrepositions = ['i', 'på', 'til', 'af', 'med', 'for', 'om', 'under', 'over', 'fra', 'efter', 'før'];

function shuffleArray<T>(items: T[]): T[] {
  const array = [...items];
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function pickRandom<T>(items: T[], count: number): T[] {
  if (items.length <= count) {
    return shuffleArray(items);
  }
  return shuffleArray(items).slice(0, count);
}

function sentenceTokens(sentence: string): string[] {
  return sentence.split(/\s+/).filter(Boolean);
}

function buildTranslationQuestion(
  danish: string,
  english: string,
  distractors: string[],
  index: number,
  audienceLanguage: AudienceLanguage
): ExerciseQuestion {
  const prompt =
    audienceLanguage === 'chinese'
      ? `“${danish}” 的正确意思是什么？`
      : `What is the correct meaning of “${danish}”?`;

  const baseExplanation =
    audienceLanguage === 'chinese'
      ? `这句话的意思是：“${english}”。`
      : `This sentence means “${english}”.`;

  const options: ExerciseOption[] = shuffleArray<ExerciseOption>([
    {
      label: english,
      isCorrect: true,
      explanation: baseExplanation
    },
    ...distractors.map(choice => ({
      label: choice,
      isCorrect: false,
      explanation: baseExplanation
    }))
  ]);

  return {
    id: `fallback-translation-${index}`,
    type: 'translation',
    prompt,
    danishSentence: danish,
    options,
    difficultyScore: sentenceTokens(danish).length
  };
}

function buildClozeQuestion(
  danish: string,
  english: string,
  distractors: string[],
  index: number,
  audienceLanguage: AudienceLanguage
): ExerciseQuestion | null {
  const tokens = sentenceTokens(danish);
  if (tokens.length < 3) {
    return null;
  }

  const midIndex = Math.floor(tokens.length / 2);
  const removedToken = tokens[midIndex];
  const clozeTokens = [...tokens];
  clozeTokens[midIndex] = '_____';
  const clozeSentence = clozeTokens.join(' ');

  const baseExplanation =
    audienceLanguage === 'chinese'
      ? `缺失的单词是 “${removedToken}”，整句意思是 “${english}”。`
      : `The missing word is “${removedToken}”. The full sentence means “${english}”.`;

  const options: ExerciseOption[] = shuffleArray<ExerciseOption>([
    {
      label: removedToken,
      isCorrect: true,
      explanation: baseExplanation
    },
    ...distractors.map(choice => ({
      label: choice,
      isCorrect: false,
      explanation: baseExplanation
    }))
  ]);

  return {
    id: `fallback-cloze-${index}`,
    type: 'cloze',
    prompt:
      audienceLanguage === 'chinese'
        ? '请选择最合适的单词填入空格：'
        : 'Choose the best word to fill in the blank:',
    body: clozeSentence,
    danishSentence: danish,
    options,
    difficultyScore: sentenceTokens(danish).length + 3
  };
}

function buildPrepositionQuestion(
  danish: string,
  english: string,
  distractorPrepositions: string[],
  index: number,
  audienceLanguage: AudienceLanguage
): ExerciseQuestion | null {
  const tokens = sentenceTokens(danish);
  const prepositionIndex = tokens.findIndex((token) => commonPrepositions.includes(token.toLowerCase()));
  if (prepositionIndex === -1) {
    return null;
  }

  const missing = tokens[prepositionIndex];
  const modifiedTokens = [...tokens];
  modifiedTokens[prepositionIndex] = '_____';
  const clozeSentence = modifiedTokens.join(' ');

  const baseExplanation =
    audienceLanguage === 'chinese'
      ? `这里应该使用介词 “${missing}”，原句意思是 “${english}”。`
      : `The correct preposition is “${missing}”. The sentence means “${english}”.`;

  const options: ExerciseOption[] = shuffleArray<ExerciseOption>([
    {
      label: missing,
      isCorrect: true,
      explanation: baseExplanation
    },
    ...distractorPrepositions.map(choice => ({
      label: choice,
      isCorrect: false,
      explanation: baseExplanation
    }))
  ]);

  return {
    id: `fallback-preposition-${index}`,
    type: 'preposition',
    prompt:
      audienceLanguage === 'chinese'
        ? '请选择正确的介词：'
        : 'Select the correct preposition:',
    body: clozeSentence,
    danishSentence: danish,
    options,
    difficultyScore: sentenceTokens(danish).length + 4
  };
}

function generateStoryQuestions(
  danishSentences: string[],
  englishSentences: string[],
  audienceLanguage: AudienceLanguage
): ExerciseQuestion[] {
  const paired = danishSentences
    .map((sentence, index) => ({
      danish: sentence.trim(),
      english: englishSentences[index]?.trim() ?? ''
    }))
    .filter((item) => item.danish && item.english);

  if (paired.length === 0) {
    return [];
  }

  const maxTranslationQuestions = Math.max(1, Math.min(Math.ceil(QUESTIONS_PER_TEST * 0.2), paired.length));
  const maxClozeQuestions = Math.max(1, Math.min(Math.ceil(QUESTIONS_PER_TEST * 0.3), paired.length));
  const maxPrepositionQuestions = Math.max(1, Math.min(Math.ceil(QUESTIONS_PER_TEST * 0.2), paired.length));

  const translationQuestions: ExerciseQuestion[] = [];
  const clozeQuestions: ExerciseQuestion[] = [];
  const prepositionQuestions: ExerciseQuestion[] = [];

  let translationCreated = 0;
  let clozeCreated = 0;
  let prepositionCreated = 0;

  paired.forEach((item, index) => {
    if (translationCreated < maxTranslationQuestions) {
      const translationDistractors = pickRandom(
        paired
          .filter((other) => other.english !== item.english)
          .map((other) => other.english),
        3
      );
      translationQuestions.push(
        buildTranslationQuestion(item.danish, item.english, translationDistractors, index, audienceLanguage)
      );
      translationCreated += 1;
    }

    if (clozeCreated < maxClozeQuestions) {
      const clozeDistractors = pickRandom(
        paired
          .filter((other) => other.english !== item.english)
          .flatMap((other) => sentenceTokens(other.danish)),
        3
      );
      const clozeQuestion = buildClozeQuestion(item.danish, item.english, clozeDistractors, index, audienceLanguage);
      if (clozeQuestion) {
        clozeQuestions.push(clozeQuestion);
        clozeCreated += 1;
      }
    }

    if (prepositionCreated < maxPrepositionQuestions) {
      const prepositionDistractors = pickRandom(
        commonPrepositions.filter((prep) => !item.danish.toLowerCase().includes(prep)),
        3
      );
      const prepositionQuestion = buildPrepositionQuestion(
        item.danish,
        item.english,
        prepositionDistractors,
        index,
        audienceLanguage
      );
      if (prepositionQuestion) {
        prepositionQuestions.push(prepositionQuestion);
        prepositionCreated += 1;
      }
    }
  });

  const comprehensionQuestions: ExerciseQuestion[] = [];

  if (paired.length >= 3) {
    const createSequenceQuestion = (
      mode: 'earliest' | 'latest',
      questionIndex: number
    ): ExerciseQuestion | null => {
      const optionCount = Math.min(4, paired.length);
      const optionIndices = pickRandom(
        Array.from({ length: paired.length }, (_, idx) => idx),
        optionCount
      );

      if (optionIndices.length < 2) {
        return null;
      }

      const targetIndex =
        mode === 'earliest'
          ? optionIndices.reduce((acc, value) => (value < acc ? value : acc), optionIndices[0])
          : optionIndices.reduce((acc, value) => (value > acc ? value : acc), optionIndices[0]);

      const prompt =
        audienceLanguage === 'chinese'
          ? mode === 'earliest'
            ? '以下哪件事情在故事中最先发生？'
            : '以下哪件事情在故事中最晚发生？'
          : mode === 'earliest'
          ? 'Which of these events happens first in the story?'
          : 'Which of these events happens last in the story?';

      const options: ExerciseOption[] = optionIndices.map((idx) => {
        const isCorrect = idx === targetIndex;
        const position = idx + 1;
        const explanation =
          audienceLanguage === 'chinese'
            ? isCorrect
              ? `该事件出现在第 ${position} 句，是选项中最${mode === 'earliest' ? '早' : '晚'}发生的。`
              : `该事件出现在第 ${position} 句，比正确答案发生得${mode === 'earliest' ? '晚' : '早'}。`
            : isCorrect
            ? `This event appears in sentence ${position}, making it the ${mode === 'earliest' ? 'earliest' : 'latest'} among the options.`
            : `This event appears in sentence ${position}, so it happens ${mode === 'earliest' ? 'later' : 'earlier'} than the correct answer.`;

        return {
          label: paired[idx].english,
          isCorrect,
          explanation
        };
      });

      return {
        id: `fallback-comprehension-seq-${questionIndex}`,
        type: 'comprehension',
        prompt,
        danishSentence: paired[targetIndex].danish,
        options: shuffleArray(options),
        difficultyScore: sentenceTokens(paired[targetIndex].danish).length + 1
      };
    };

    const earliestQuestion = createSequenceQuestion('earliest', 0);
    if (earliestQuestion) {
      comprehensionQuestions.push(earliestQuestion);
    }

    const latestQuestion = createSequenceQuestion('latest', 1);
    if (latestQuestion) {
      comprehensionQuestions.push(latestQuestion);
    }
  }

  const createTrueStatementQuestion = (targetIdx: number, serial: number): ExerciseQuestion | null => {
    const target = paired[targetIdx];
    if (!target) {
      return null;
    }

    const correctSentence = target.english;
    if (!correctSentence) {
      return null;
    }

    const otherSentences = paired
      .map((item) => item.english)
      .filter((sentence) => sentence && sentence !== correctSentence);

    const genericFalseStatements = audienceLanguage === 'chinese'
      ? [
          '故事中没有提到去外太空旅行。',
          '故事里没有出现机器人角色。',
          '没有任何角色谈到天气情况。',
          '故事没有描述任何节日活动。'
        ]
      : [
          'The story never mentions traveling to outer space.',
          'No robot characters appear in the story.',
          'None of the characters comment on the weather.',
          'The story does not describe any holiday celebration.'
        ];

    const negativeStatements = pickRandom(otherSentences, Math.min(2, otherSentences.length)).map((sentence) =>
      audienceLanguage === 'chinese'
        ? `故事中并没有提到：“${sentence}”。`
        : `It is not true that ${sentence}.`
    );

    const remainingNeeded = Math.max(0, 3 - negativeStatements.length);
    const additionalGenerics = remainingNeeded > 0
      ? pickRandom(genericFalseStatements, remainingNeeded)
      : [];

    const options: ExerciseOption[] = shuffleArray([
      {
        label: correctSentence,
        isCorrect: true,
        explanation:
          audienceLanguage === 'chinese'
            ? '这句话确实出现在故事中。'
            : 'This statement appears in the story.'
      },
      ...negativeStatements.map(statement => ({
        label: statement,
        isCorrect: false,
        explanation:
          audienceLanguage === 'chinese'
            ? '原文描述了相反的情节。'
            : 'The original story describes the opposite event.'
      })),
      ...additionalGenerics.map(statement => ({
        label: statement,
        isCorrect: false,
        explanation:
          audienceLanguage === 'chinese'
            ? '这些情节未在故事中出现。'
            : 'This event never happens in the story.'
      }))
    ]);

    return {
      id: `fallback-comprehension-true-${serial}`,
      type: 'comprehension',
      prompt:
        audienceLanguage === 'chinese'
          ? '以下哪句话与故事描述一致？'
          : 'Which of these statements matches the story?',
      danishSentence: target.danish,
      options,
      difficultyScore: sentenceTokens(target.danish).length + 2
    };
  };

  let serialCounter = 0;
  for (
    let idx = 0;
    idx < paired.length && comprehensionQuestions.length < MIN_COMPREHENSION_PER_TEST;
    idx += 1
  ) {
    const question = createTrueStatementQuestion(idx, serialCounter++);
    if (question) {
      comprehensionQuestions.push(question);
    }
  }

  while (comprehensionQuestions.length < MIN_COMPREHENSION_PER_TEST) {
    const question = createTrueStatementQuestion(serialCounter % paired.length, serialCounter++);
    if (!question) {
      break;
    }
    comprehensionQuestions.push(question);
  }

  const combined = [
    ...translationQuestions,
    ...clozeQuestions,
    ...prepositionQuestions,
    ...comprehensionQuestions
  ];

  return combined.sort((a, b) => (a.difficultyScore ?? 0) - (b.difficultyScore ?? 0));
}

function createBatchesFromQuestions(questions: ExerciseQuestion[]): StoryExerciseQuestionState[][] {
  const comprehensionPool = questions
    .filter((question) => question.type === 'comprehension')
    .map(question => ({ ...question }));
  const otherPool = questions
    .filter((question) => question.type !== 'comprehension')
    .map(question => ({ ...question }));

  const totalQuestions = comprehensionPool.length + otherPool.length;
  if (totalQuestions === 0) {
    return [];
  }

  const totalBatches = Math.max(1, Math.ceil(totalQuestions / QUESTIONS_PER_TEST));
  const batches: StoryExerciseQuestionState[][] = [];

  for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
    const remainingBatches = totalBatches - batchIndex;
    const batchQuestions: ExerciseQuestion[] = [];

    let comprehensionToTake = 0;
    if (comprehensionPool.length > 0) {
      if (comprehensionPool.length >= MIN_COMPREHENSION_PER_TEST * remainingBatches) {
        comprehensionToTake = Math.min(MIN_COMPREHENSION_PER_TEST, comprehensionPool.length, QUESTIONS_PER_TEST);
      } else {
        comprehensionToTake = Math.min(
          Math.max(1, Math.ceil(comprehensionPool.length / remainingBatches)),
          comprehensionPool.length,
          QUESTIONS_PER_TEST
        );
      }
    }

    for (let i = 0; i < comprehensionToTake; i += 1) {
      const next = comprehensionPool.shift();
      if (next) {
        batchQuestions.push(next);
      }
    }

    while (batchQuestions.length < QUESTIONS_PER_TEST && (otherPool.length > 0 || comprehensionPool.length > 0)) {
      if (otherPool.length > 0) {
        const nextOther = otherPool.shift();
        if (nextOther) {
          batchQuestions.push(nextOther);
        }
      } else if (comprehensionPool.length > 0) {
        const nextComp = comprehensionPool.shift();
        if (nextComp) {
          batchQuestions.push(nextComp);
        }
      } else {
        break;
      }
    }

    while (batchQuestions.length < QUESTIONS_PER_TEST && comprehensionPool.length > 0) {
      const nextComp = comprehensionPool.shift();
      if (!nextComp) {
        break;
      }
      batchQuestions.push(nextComp);
    }

    const preparedBatch: StoryExerciseQuestionState[] = batchQuestions.map((question, index) => {
      const danishSentence = question.danishSentence ?? '';
      const options: ExerciseOptionState[] = (question.options ?? []).map((option, optionIndex) => ({
        ...option,
        id: `${question.id ?? `question-${index}`}-opt-${optionIndex + 1}`
      }));

      const difficultyScore = question.difficultyScore ?? Math.max(1, sentenceTokens(danishSentence).length);

      return {
        ...question,
        danishSentence,
        options,
        difficultyScore,
        attempts: 0,
        incorrectAttempts: 0,
        answeredCorrectly: false,
        firstAttemptCorrect: false
      };
    });

    batches.push(preparedBatch);
  }

  return batches;
}

function localizeStoryQuestionType(type: ExerciseQuestionType, audienceLanguage: AudienceLanguage): string {
  const mapping =
    audienceLanguage === 'chinese'
      ? {
          translation: '翻译理解',
          cloze: '完形填空',
          preposition: '介词用法',
          comprehension: '阅读理解'
        }
      : {
          translation: 'Translation',
          cloze: 'Cloze',
          preposition: 'Prepositions',
          comprehension: 'Comprehension'
        };
  return mapping[type];
}

function hasSufficientComprehension(questions: ExerciseQuestion[] | undefined): boolean {
  if (!questions) {
    return false;
  }
  const comprehensionCount = questions.filter(question => question.type === 'comprehension').length;
  return questions.length >= QUESTIONS_PER_TEST && comprehensionCount >= MIN_COMPREHENSION_PER_TEST;
}

const StoryExercise: React.FC<StoryExerciseProps> = ({
  danishSentences,
  englishSentences,
  audienceLanguage,
  exercises
}) => {
  const danishKey = useMemo(() => danishSentences.join('\\n'), [danishSentences]);
  const englishKey = useMemo(() => englishSentences.join('\\n'), [englishSentences]);

  const fallbackQuestions = useMemo(
    () => generateStoryQuestions(danishSentences, englishSentences, audienceLanguage),
    [danishKey, englishKey, audienceLanguage]
  );

  const sourceQuestions = useMemo<ExerciseQuestion[]>(() => {
    if (hasSufficientComprehension(exercises)) {
      return exercises as ExerciseQuestion[];
    }
    return fallbackQuestions;
  }, [exercises, fallbackQuestions]);

  const [questionBatches, setQuestionBatches] = useState<StoryExerciseQuestionState[][]>(() =>
    createBatchesFromQuestions(sourceQuestions)
  );
  const [currentBatchIndex, setCurrentBatchIndex] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showSummary, setShowSummary] = useState(false);

  useEffect(() => {
    const batches = createBatchesFromQuestions(sourceQuestions);
    setQuestionBatches(batches);
    setCurrentBatchIndex(0);
    setCurrentIndex(0);
    setShowSummary(false);
  }, [sourceQuestions]);

  const currentBatch = questionBatches[currentBatchIndex] ?? [];
  const currentQuestion = currentBatch[currentIndex];
  const totalBatches = questionBatches.length;
  const isLastBatch = currentBatchIndex >= totalBatches - 1;

  const stats = useMemo(() => {
    const batch = currentBatch;
    const totalQuestions = batch.length;
    const completed = batch.filter((question) => question.answeredCorrectly || question.skipped).length;
    const correct = batch.filter((question) => question.answeredCorrectly).length;
    const firstTry = batch.filter((question) => question.firstAttemptCorrect).length;
    const incorrectAttempts = batch.reduce(
      (sum, question) => sum + question.incorrectAttempts,
      0
    );

    return {
      totalQuestions,
      completed,
      correct,
      firstTry,
      incorrectAttempts,
      accuracy: totalQuestions > 0 ? Math.round((correct / totalQuestions) * 100) : 0,
      firstTryAccuracy: totalQuestions > 0 ? Math.round((firstTry / totalQuestions) * 100) : 0
    };
  }, [currentBatch]);

  const handleOptionSelect = (optionId: string) => {
    if (!currentQuestion) {
      return;
    }

    setQuestionBatches((prev) =>
      prev.map((batch, batchIndex) => {
        if (batchIndex !== currentBatchIndex) {
          return batch;
        }
        return batch.map((question, questionIndex) => {
          if (questionIndex !== currentIndex) {
            return question;
          }

          if (question.answeredCorrectly) {
            return question;
          }

          const selectedOption = question.options.find((option) => option.id === optionId);
          if (!selectedOption) {
            return question;
          }

          const successPrefix = audienceLanguage === 'chinese' ? '✅ 正确！' : '✅ Correct!';
          const retryPrefix = audienceLanguage === 'chinese' ? '❌ 再试一次：' : '❌ Try again: ';

          const feedback = selectedOption.isCorrect
            ? `${successPrefix} ${selectedOption.explanation}`
            : `${retryPrefix}${selectedOption.explanation}`;

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
            answeredCorrectly: selectedOption.isCorrect ? true : question.answeredCorrectly,
            firstAttemptCorrect: selectedOption.isCorrect ? question.attempts === 0 : question.firstAttemptCorrect,
            selectedOptionId: optionId,
            feedback,
            options: updatedOptions
          };
        });
      })
    );
  };

  const handleSkipQuestion = () => {
    setQuestionBatches((prev) =>
      prev.map((batch, batchIndex) => {
        if (batchIndex !== currentBatchIndex) {
          return batch;
        }

        return batch.map((question, questionIndex) => {
          if (questionIndex !== currentIndex) {
            return question;
          }

          if (question.answeredCorrectly || question.skipped) {
            return question;
          }

          const correctOption = question.options.find((option) => option.isCorrect);
          const feedback =
            audienceLanguage === 'chinese'
              ? `已跳过。正确答案是 “${correctOption?.label ?? ''}”。`
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
        });
      })
    );

    if (currentIndex >= currentBatch.length - 1) {
      setShowSummary(true);
    } else {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleNextQuestion = () => {
    if (currentIndex >= currentBatch.length - 1) {
      setShowSummary(true);
    } else {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleNextTest = () => {
    if (isLastBatch) {
      return;
    }
    setCurrentBatchIndex(currentBatchIndex + 1);
    setCurrentIndex(0);
    setShowSummary(false);
  };

  const handleRestart = () => {
    const batches = createBatchesFromQuestions(sourceQuestions);
    setQuestionBatches(batches);
    setCurrentBatchIndex(0);
    setCurrentIndex(0);
    setShowSummary(false);
  };

  if (questionBatches.length === 0) {
    return null;
  }

  if (showSummary) {
    return (
      <div className="story-exercise-section">
        <div className="story-exercise-header">
          <div>
            <h3>{audienceLanguage === 'chinese' ? '练习总结' : 'Exercise Summary'}</h3>
            <span className="story-exercise-progress">
              {audienceLanguage === 'chinese'
                ? `测试 ${currentBatchIndex + 1} / ${totalBatches}`
                : `Test ${currentBatchIndex + 1} of ${totalBatches}`}
            </span>
          </div>
        </div>
        <div className="exercise-summary">
          <div className="exercise-summary-stats">
            <div className="exercise-summary-card">
              <span className="exercise-summary-value">{stats.correct}</span>
              <span className="exercise-summary-label">
                {audienceLanguage === 'chinese' ? '答对题目' : 'Correct answers'}
              </span>
            </div>
            <div className="exercise-summary-card">
              <span className="exercise-summary-value">{`${stats.accuracy}%`}</span>
              <span className="exercise-summary-label">
                {audienceLanguage === 'chinese' ? '整体准确率' : 'Overall accuracy'}
              </span>
            </div>
            <div className="exercise-summary-card">
              <span className="exercise-summary-value">{`${stats.firstTryAccuracy}%`}</span>
              <span className="exercise-summary-label">
                {audienceLanguage === 'chinese' ? '首轮正确率' : 'First-try accuracy'}
              </span>
            </div>
            <div className="exercise-summary-card">
              <span className="exercise-summary-value">{stats.incorrectAttempts}</span>
              <span className="exercise-summary-label">
                {audienceLanguage === 'chinese' ? '错误尝试' : 'Incorrect attempts'}
              </span>
            </div>
          </div>
          <div className="exercise-summary-actions">
            {!isLastBatch && (
              <button className="primary-button" onClick={handleNextTest}>
                {audienceLanguage === 'chinese' ? '开始下一组测试' : 'Start next test'}
              </button>
            )}
            {isLastBatch && (
              <button className="primary-button" onClick={handleRestart}>
                {audienceLanguage === 'chinese' ? '重新练习故事' : 'Restart story practice'}
              </button>
            )}
            <button className="secondary-button" onClick={handleRestart}>
              {audienceLanguage === 'chinese' ? '再练一遍' : 'Practice again'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return null;
  }

  return (
    <div className="story-exercise-section">
      <div className="story-exercise-header">
        <div>
          <h3>{audienceLanguage === 'chinese' ? '故事练习' : 'Story Practice'}</h3>
          <span className="story-exercise-progress">
            {audienceLanguage === 'chinese'
              ? `测试 ${currentBatchIndex + 1} / ${totalBatches} · 题目 ${currentIndex + 1} / ${currentBatch.length}`
              : `Test ${currentBatchIndex + 1} of ${totalBatches} · Question ${currentIndex + 1} of ${currentBatch.length}`}
          </span>
        </div>
        <div className="story-exercise-meta">
          <span className="story-exercise-danish">
            {audienceLanguage === 'chinese' ? '丹麦语句子' : 'Danish sentence'}:
          </span>
          <q className="story-exercise-quote">{currentQuestion.danishSentence}</q>
        </div>
      </div>

      <div className="exercise-content inline">
        <div className="exercise-question">
          <span className="story-exercise-type-chip">
            {localizeStoryQuestionType(currentQuestion.type, audienceLanguage)}
          </span>
          <p className="exercise-question-prompt">{currentQuestion.prompt}</p>
          {currentQuestion.body && (
            <blockquote className="exercise-question-body">{currentQuestion.body}</blockquote>
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

      <div className="story-exercise-footer">
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
          disabled={!currentQuestion.answeredCorrectly && !currentQuestion.skipped}
        >
          {audienceLanguage === 'chinese'
            ? currentIndex === currentBatch.length - 1
              ? '查看总结'
              : '下一题'
            : currentIndex === currentBatch.length - 1
            ? 'See summary'
            : 'Next question'}
        </button>
      </div>
    </div>
  );
};

export default StoryExercise;
