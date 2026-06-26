import { describe, expect, it } from 'vitest';
import { isReviewItemDueOn, sortReviewItems, toLocalDateKey } from '../../src/domain/review/reviewQueue';
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

  it('sorts every actionable review by due time before priority', () => {
    const futureHighPriority = reviewItem('2026-06-25T00:00:00.000Z');
    futureHighPriority.id = 'future-high';
    futureHighPriority.priorityScore = 100;

    const dueMemoryOnly = reviewItem('2026-06-24T00:00:00.000Z');
    dueMemoryOnly.id = 'due-memory';
    dueMemoryOnly.priorityScore = 20;
    dueMemoryOnly.redoQuestion = undefined;
    dueMemoryOnly.memoryTask = {
      version: 1,
      sourceText: 'Review a phrase.',
      recallPrompt: '回忆语块。',
      recallAnswer: 'phrase',
      clozePrompt: '____',
      clozeAnswer: 'phrase',
      chunks: ['phrase'],
      productionPrompt: '造句。',
      methodNotes: ['主动回忆'],
      spacingPlanDays: [1, 3],
    };

    const dueHighPriority = reviewItem('2026-06-24T00:00:00.000Z');
    dueHighPriority.id = 'due-high';
    dueHighPriority.priorityScore = 90;

    expect(sortReviewItems([futureHighPriority, dueMemoryOnly, dueHighPriority]).map((item) => item.id)).toEqual([
      'due-high',
      'due-memory',
      'future-high',
    ]);
  });
});
