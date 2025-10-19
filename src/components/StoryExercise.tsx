import React, { useEffect, useMemo, useState } from 'react';

type AudienceLanguage = 'english' | 'chinese';

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
  danishSentence: string;
  prompt: string;
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

  return paired.map((item, index) => {
    const distractors = paired
      .filter((other, otherIndex) => otherIndex !== index)
      .map((other) => other.english);

    const shuffledDistractors = [...distractors];
    for (let i = shuffledDistractors.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledDistractors[i], shuffledDistractors[j]] = [shuffledDistractors[j], shuffledDistractors[i]];
    }

    const requiredDistractors = Math.min(3, Math.max(0, shuffledDistractors.length));
    const optionsPool = shuffledDistractors.slice(0, requiredDistractors);

    const baseExplanation =
      audienceLanguage === 'chinese'
        ? `这句话的意思是：“${item.english}”。`
        : `This sentence means: “${item.english}”.`;

    const options = [
      {
        id: `${index}-option-correct`,
        label: item.english,
        isCorrect: true,
        explanation: baseExplanation
      },
      ...optionsPool.map((choice, choiceIndex) => ({
        id: `${index}-option-${choiceIndex}`,
        label: choice,
        isCorrect: false,
        explanation: baseExplanation
      }))
    ];

    // Shuffle options
    const shuffledOptions = [...options];
    for (let i = shuffledOptions.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledOptions[i], shuffledOptions[j]] = [shuffledOptions[j], shuffledOptions[i]];
    }

    const prompt =
      audienceLanguage === 'chinese'
        ? `“${item.danish}” 的正确意思是什么？`
        : `What is the correct meaning of “${item.danish}”?`;

    const difficultyScore = item.danish.split(/\s+/).length;

    return {
      id: `story-question-${index}`,
      danishSentence: item.danish,
      prompt,
      options: shuffledOptions,
      difficultyScore
    };
  });
}

function prepareQuestionBatches(
  danishSentences: string[],
  englishSentences: string[],
  audienceLanguage: AudienceLanguage
): StoryExerciseQuestionState[][] {
  const questions = generateStoryQuestions(danishSentences, englishSentences, audienceLanguage)
    .sort((a, b) => a.difficultyScore - b.difficultyScore);

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

          const feedback = selectedOption.isCorrect
            ? audienceLanguage === 'chinese'
              ? `✅ 正确！${selectedOption.explanation}`
              : `✅ Correct! ${selectedOption.explanation}`
            : audienceLanguage === 'chinese'
            ? `❌ 再试一次：${selectedOption.explanation}`
            : `❌ Try again: ${selectedOption.explanation}`;

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
          <p className="exercise-question-prompt">{currentQuestion.prompt}</p>
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
