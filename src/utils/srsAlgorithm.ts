// SM-2 Spaced Repetition Algorithm

import { SRSData } from '../types/vocabulary';

export interface SRSCalculationResult {
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReviewDate: Date;
}

/**
 * Calculate next review using SM-2 algorithm
 * @param quality - Quality of recall (0-5)
 *   0: Complete blackout
 *   1: Incorrect response, correct one remembered
 *   2: Incorrect response, correct one seemed easy to recall
 *   3: Correct response, but required significant effort
 *   4: Correct response, after some hesitation
 *   5: Perfect response
 * @param currentSRS - Current SRS data
 * @returns Updated SRS data
 */
export function calculateNextReview(
  quality: number,
  currentSRS: SRSData
): SRSCalculationResult {
  let { easeFactor, interval, repetitions } = currentSRS;

  // If quality < 3, reset repetitions and start over
  if (quality < 3) {
    repetitions = 0;
    interval = 1;
    easeFactor = Math.max(1.3, easeFactor - 0.2);
  } else {
    // Calculate new ease factor
    easeFactor = Math.max(
      1.3,
      easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    );

    // Calculate new interval based on repetition number
    if (repetitions === 0) {
      interval = 1; // 1 day
    } else if (repetitions === 1) {
      interval = 6; // 6 days
    } else {
      interval = Math.round(interval * easeFactor);
    }

    repetitions += 1;
  }

  // Calculate next review date
  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + interval);

  return {
    easeFactor,
    interval,
    repetitions,
    nextReviewDate
  };
}

/**
 * Map quality rating from flashcard buttons to SM-2 quality (0-5)
 */
export function mapQualityRating(rating: 'again' | 'hard' | 'good' | 'easy'): number {
  switch (rating) {
    case 'again': return 0;
    case 'hard': return 3;
    case 'good': return 4;
    case 'easy': return 5;
    default: return 3;
  }
}

/**
 * Determine proficiency level based on SRS data
 */
export function calculateProficiencyLevel(srsData: SRSData): 'new' | 'learning' | 'familiar' | 'mastered' {
  if (srsData.repetitions === 0) {
    return 'new';
  } else if (srsData.repetitions < 3) {
    return 'learning';
  } else if (srsData.repetitions < 6) {
    return 'familiar';
  } else {
    return 'mastered';
  }
}
