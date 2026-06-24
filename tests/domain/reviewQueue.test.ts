import { describe, expect, it } from 'vitest';
import { isReviewItemDueOn, toLocalDateKey } from '../../src/domain/review/reviewQueue';
import { ReviewItem } from '../../src/types';

function reviewItem(nextReviewAt: string): ReviewItem {
  return {
    id: 'review-local-date',
    title: '本地日期复习项',
    category: '错题',
    detail: '用于验证本地日期边界。',
    daysAgo: 0,
    priorityScore: 90,
    nextReviewAt,
    redoQuestion: {
      kind: 'single-choice',
      prompt: 'Which option is correct?',
      correctAnswer: 'A',
      userAnswer: 'B',
    },
    learningMethod: 'wrong-question-redo-active-recall',
  };
}

describe('review queue date helpers', () => {
  it('uses the local calendar date for early-morning reviews', () => {
    const localEarlyMorning = new Date(2026, 5, 24, 0, 30, 0);
    const item = reviewItem(localEarlyMorning.toISOString());

    expect(toLocalDateKey(localEarlyMorning)).toBe('2026-06-24');
    expect(isReviewItemDueOn(item, '2026-06-23')).toBe(false);
    expect(isReviewItemDueOn(item, '2026-06-24')).toBe(true);
  });
});
