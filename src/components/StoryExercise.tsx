import React, { useEffect, useMemo, useState } from 'react';

type AudienceLanguage = 'english' | 'chinese';

type QuestionType = 'translation' | 'cloze' | 'preposition' | 'order' | 'comprehension';
type OptionStatus = 'idle' | 'correct' | 'incorrect';

interface ExerciseOption {
  id: string;
  label: string;
  isCorrect: boolean;
  explanation: string;
  status?: OptionStatus;
  disabled?: boolean;
}

interface StoryExerciseQuestion {
  id: string;
  type: QuestionType;
  danishSentence: string;
  prompt: string;
  body?: string;
  options: ExerciseOption[];
  difficultyScore: number;
}

interface StoryExerciseQuestionState extends StoryExerciseQuestion {
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
}

const QUESTIONS_PER_TEST = 10;

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
): StoryExerciseQuestion {
  const prompt =
    audienceLanguage === 'chinese'
      ? `“${danish}” 的正确意思是什么？`
      : `What is the correct meaning of “${danish}”?`;

  const baseExplanation =
    audienceLanguage === 'chinese'
      ? `这句话的意思是：“${english}”。`
      : `This sentence means: “${english}”.`;

  const options = shuffleArray<ExerciseOption>([
    {
      id: `${index}-translation-correct`,
      label: english,
      isCorrect: true,
      explanation: baseExplanation
    },
    ...distractors.map<ExerciseOption>((choice, choiceIndex) => ({
      id: `${index}-translation-${choiceIndex}`,
      label: choice,
      isCorrect: false,
      explanation: baseExplanation
    }))
  ]);

  return {
    id: `story-translation-${index}`,
    type: 'translation',
    danishSentence: danish,
    prompt,
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
): StoryExerciseQuestion | null {
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

  const options = shuffleArray<ExerciseOption>([
    {
      id: `${index}-cloze-correct`,
      label: removedToken,
      isCorrect: true,
      explanation: baseExplanation
    },
    ...distractors.map<ExerciseOption>((choice, choiceIndex) => ({
      id: `${index}-cloze-${choiceIndex}`,
      label: choice,
      isCorrect: false,
      explanation: baseExplanation
    }))
  ]);

  return {
    id: `story-cloze-${index}`,
    type: 'cloze',
    danishSentence: danish,
    prompt:
      audienceLanguage === 'chinese'
        ? '请选择最合适的单词填入空格：'
        : 'Choose the best word to fill in the blank:',
    body: clozeSentence,
    options,
    difficultyScore: sentenceTokens(danish).length + 3
  };
}

const commonPrepositions = ['i', 'på', 'til', 'af', 'med', 'for', 'om', 'under', 'over', 'fra', 'efter', 'før'];

function buildPrepositionQuestion(
  danish: string,
  english: string,
  distractorPrepositions: string[],
  index: number,
  audienceLanguage: AudienceLanguage
): StoryExerciseQuestion | null {
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
      : `The correct preposition is “${missing}”. The original sentence means “${english}”.`;

  const options = shuffleArray<ExerciseOption>([
    {
      id: `${index}-prep-correct`,
      label: missing,
      isCorrect: true,
      explanation: baseExplanation
    },
    ...distractorPrepositions.map<ExerciseOption>((choice, choiceIndex) => ({
      id: `${index}-prep-${choiceIndex}`,
      label: choice,
      isCorrect: false,
      explanation: baseExplanation
    }))
  ]);

  return {
    id: `story-preposition-${index}`,
    type: 'preposition',
    danishSentence: danish,
    prompt:
      audienceLanguage === 'chinese'
        ? '请选择正确的介词：'
        : 'Select the correct preposition:',
    body: clozeSentence,
    options,
    difficultyScore: sentenceTokens(danish).length + 4
  };
}

function buildOrderQuestion(
  danish: string,
  english: string,
  index: number,
  audienceLanguage: AudienceLanguage
): StoryExerciseQuestion | null {
  const tokens = sentenceTokens(danish);
  if (tokens.length < 4) {
    return null;
  }

  const shuffled = shuffleArray(tokens).slice(0, Math.min(6, tokens.length));
  if (shuffled.join(' ') === tokens.slice(0, shuffled.length).join(' ')) {
    shuffled.reverse();
  }

  const prompt =
    audienceLanguage === 'chinese'
      ? '请点击以下单词，按正确顺序组成丹麦语句子：'
      : 'Click the words with the correct order to rebuild the Danish sentence:';

  const explanation =
    audienceLanguage === 'chinese'
      ? `正确句子：“${danish}”。意思是 “${english}”。`
      : `Correct sentence: “${danish}”. It means “${english}”.`;

  const optionLabel =
    audienceLanguage === 'chinese'
      ? '提示：选择正确的意思即可（顺序练习即将推出）。'
      : 'Tip: choose the correct meaning (ordering mode coming soon).';

  return {
    id: `story-order-${index}`,
    type: 'order',
    danishSentence: danish,
    prompt,
    body: shuffled.join(' / '),
    options: [
      {
        id: `${index}-order-correct`,
        label: english,
        isCorrect: true,
        explanation
      },
      {
        id: `${index}-order-tip`,
        label: optionLabel,
        isCorrect: false,
        explanation
      }
    ],
    difficultyScore: tokens.length + 5
  };
}

function generateStoryQuestions(
  danishSentences: string[],
  englishSentences: string[],
  audienceLanguage: AudienceLanguage
): StoryExerciseQuestion[] {
  const paired = danishSentences
    .map((sentence, index) => ({
      danish: sentence.trim(),
      english: englishSentences[index]?.trim() ?? ''
    }))
    .filter((item) => item.danish && item.english);

  if (paired.length === 0) {
    return [];
  }

  const translationQuestions: StoryExerciseQuestion[] = [];
  const clozeQuestions: StoryExerciseQuestion[] = [];
  const prepositionQuestions: StoryExerciseQuestion[] = [];
  const orderQuestions: StoryExerciseQuestion[] = [];

  const maxTranslationQuestions = Math.max(1, Math.ceil(paired.length / 4));
  let translationCreated = 0;

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

    const clozeDistractors = pickRandom(
      paired
        .filter((other) => other.english !== item.english)
        .flatMap((other) => sentenceTokens(other.danish)),
      3
    );
    const clozeQuestion = buildClozeQuestion(item.danish, item.english, clozeDistractors, index, audienceLanguage);
    if (clozeQuestion) {
      clozeQuestions.push(clozeQuestion);
    }

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
    }

    const orderQuestion = buildOrderQuestion(item.danish, item.english, index, audienceLanguage);
    if (orderQuestion) {
      orderQuestions.push(orderQuestion);
    }
  });

  const comprehensionQuestions: StoryExerciseQuestion[] = [];

  if (paired.length >= 3) {
    const createSequenceQuestion = (
      mode: 'earliest' | 'latest',
      questionIndex: number
    ): StoryExerciseQuestion | null => {
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

      const options = optionIndices.map<ExerciseOption>((idx, optIdx) => {
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
          id: `${questionIndex}-comp-${mode}-${optIdx}`,
          label: paired[idx].english,
          isCorrect,
          explanation
        };
      });

      return {
        id: `story-comprehension-${mode}-${questionIndex}`,
        type: 'comprehension',
        danishSentence: paired[targetIndex].danish,
        prompt,
        options: shuffleArray(options),
        difficultyScore: paired[targetIndex].danish.split(/\s+/).length + 6
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

  const createTrueStatementQuestion = (questionIndex: number): StoryExerciseQuestion | null => {
    if (paired.length === 0) {
      return null;
    }

    const correctIdx = questionIndex % paired.length;
    const correctSentence = paired[correctIdx].english;

    const distractorSources = pickRandom(
      paired
        .map((item) => item.english)
        .filter((sentence) => sentence !== correctSentence),
      3
    );

    const buildNegativeStatement = (sentence: string): string =>
      audienceLanguage === 'chinese'
        ? `故事中并没有提到：“${sentence}”。`
        : `It is not true that ${sentence}.`;

    const options: ExerciseOption[] = [
      {
        id: `${questionIndex}-comp-true-correct`,
        label: correctSentence,
        isCorrect: true,
        explanation:
          audienceLanguage === 'chinese'
            ? '这句话确实出现在故事中。'
            : 'This statement appears in the story.'
      },
      ...distractorSources.map<ExerciseOption>((sentence, idx) => ({
        id: `${questionIndex}-comp-true-${idx}`,
        label: buildNegativeStatement(sentence),
        isCorrect: false,
        explanation:
          audienceLanguage === 'chinese'
            ? `原文确实写道：“${sentence}”，因此该否定说法不正确。`
            : `The story actually states “${sentence}”, so this negative claim is incorrect.`
      }))
    ];

    return {
      id: `story-comprehension-true-${questionIndex}`,
      type: 'comprehension',
      danishSentence: paired[correctIdx].danish,
      prompt:
        audienceLanguage === 'chinese'
          ? '以下哪句话与故事描述一致？'
          : 'Which of these statements matches the story?',
      options: shuffleArray(options),
      difficultyScore: paired[correctIdx].danish.split(/\s+/).length + 7
    };
  };

  const trueStatementQuestion = createTrueStatementQuestion(2);
  if (trueStatementQuestion) {
    comprehensionQuestions.push(trueStatementQuestion);
  }

  const combined = [
    ...translationQuestions,
    ...clozeQuestions,
    ...prepositionQuestions,
    ...orderQuestions,
    ...comprehensionQuestions
  ];

  return combined.sort((a, b) => a.difficultyScore - b.difficultyScore);
}

function prepareQuestionBatches(
  danishSentences: string[],
  englishSentences: string[],
  audienceLanguage: AudienceLanguage
): StoryExerciseQuestionState[][] {
  const questions = generateStoryQuestions(danishSentences, englishSentences, audienceLanguage);

  const batches: StoryExerciseQuestionState[][] = [];
  for (let i = 0; i < questions.length; i += QUESTIONS_PER_TEST) {
    const batch = questions.slice(i, i + QUESTIONS_PER_TEST).map((question) => ({
      ...question,
      attempts: 0,
      incorrectAttempts: 0,
      answeredCorrectly: false,
      firstAttemptCorrect: false
    }));
    batches.push(batch);
  }
  return batches;
}

function localizeStoryQuestionType(type: QuestionType, audienceLanguage: AudienceLanguage): string {
  const mapping =
    audienceLanguage === 'chinese'
      ? {
          translation: '翻译理解',
          cloze: '完形填空',
          preposition: '介词用法',
          order: '语序提示',
          comprehension: '阅读理解'
        }
      : {
          translation: 'Translation',
          cloze: 'Cloze',
          preposition: 'Prepositions',
          order: 'Word order',
          comprehension: 'Comprehension'
        };
  return mapping[type];
}

const StoryExercise: React.FC<StoryExerciseProps> = ({
  danishSentences,
  englishSentences,
  audienceLanguage
}) => {
  const [questionBatches, setQuestionBatches] = useState<StoryExerciseQuestionState[][]>(() =>
    prepareQuestionBatches(danishSentences, englishSentences, audienceLanguage)
  );
  const [currentBatchIndex, setCurrentBatchIndex] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showSummary, setShowSummary] = useState(false);

  useEffect(() => {
    const prepared = prepareQuestionBatches(danishSentences, englishSentences, audienceLanguage);
    setQuestionBatches(prepared);
    setCurrentBatchIndex(0);
    setCurrentIndex(0);
    setShowSummary(false);
  }, [danishSentences, englishSentences, audienceLanguage]);

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

    moveToNext();
  };

  const moveToNext = () => {
    if (currentIndex >= currentBatch.length - 1) {
      setShowSummary(true);
      return;
    }
    setCurrentIndex((index) => index + 1);
  };

  const handleNextQuestion = () => {
    moveToNext();
  };

  const handleNextTest = () => {
    if (isLastBatch) {
      return;
    }
    setCurrentBatchIndex((index) => index + 1);
    setCurrentIndex(0);
    setShowSummary(false);
  };

  const handleRestart = () => {
    const prepared = prepareQuestionBatches(danishSentences, englishSentences, audienceLanguage);
    setQuestionBatches(prepared);
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
            <h3>{audienceLanguage === 'chinese' ? '故事练习总结' : 'Story Exercise Summary'}</h3>
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
