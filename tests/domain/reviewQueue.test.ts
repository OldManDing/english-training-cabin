import { describe, expect, it } from 'vitest';
import {
  coalesceReviewItems,
  isReviewItemDueOn,
  sortReviewItems,
  toLocalDateKey,
} from '../../src/domain/review/reviewQueue';
import type { ReviewItem } from '../../src/types';

function reviewItem(overrides: Partial<ReviewItem>): ReviewItem {
  return {
    id: 'review-default',
    title: '词汇错因：低信心',
    category: '词汇',
    detail: '需要重新判断。',
    daysAgo: 0,
    targetType: 'question',
    targetId: 'vocab-consistent',
    examId: 'cet4',
    moduleId: 'vocabulary',
    skillArea: 'vocabulary',
    priorityScore: 70,
    nextReviewAt: '2026-07-28T08:00:00.000Z',
    createdAt: '2026-07-27T08:00:00.000Z',
    ...overrides,
  };
}

describe('review queue projection', () => {
  it('keeps only the latest review state for the same exam question', () => {
    const older = reviewItem({ id: 'review-old' });
    const newer = reviewItem({
      id: 'review-new',
      createdAt: '2026-07-28T09:00:00.000Z',
      nextReviewAt: '2026-07-29T09:00:00.000Z',
    });

    expect(coalesceReviewItems([older, newer])).toEqual([newer]);
    expect(sortReviewItems([older, newer])).toHaveLength(1);
  });

  it('does not merge different vocabulary targets that share the same title', () => {
    const first = reviewItem({ id: 'review-consistent' });
    const second = reviewItem({ id: 'review-relevant', targetId: 'vocab-relevant' });

    expect(coalesceReviewItems([first, second])).toHaveLength(2);
  });
});

describe('review queue date helpers', () => {
  it('uses the local calendar date for early-morning reviews', () => {
    const localEarlyMorning = new Date(2026, 5, 24, 0, 30, 0);
    const item = reviewItem({
      id: 'review-local-date',
      nextReviewAt: localEarlyMorning.toISOString(),
    });

    expect(toLocalDateKey(localEarlyMorning)).toBe('2026-06-24');
    expect(isReviewItemDueOn(item, '2026-06-23')).toBe(false);
    expect(isReviewItemDueOn(item, '2026-06-24')).toBe(true);
  });

  it('sorts every actionable review by due time before priority', () => {
    const futureHighPriority = reviewItem({
      id: 'future-high',
      targetId: 'future-high',
      priorityScore: 100,
      nextReviewAt: '2026-06-25T00:00:00.000Z',
    });
    const dueMemoryOnly = reviewItem({
      id: 'due-memory',
      targetId: 'due-memory',
      priorityScore: 20,
      nextReviewAt: '2026-06-24T00:00:00.000Z',
      memoryTask: {
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
      },
    });
    const dueHighPriority = reviewItem({
      id: 'due-high',
      targetId: 'due-high',
      priorityScore: 90,
      nextReviewAt: '2026-06-24T00:00:00.000Z',
    });

    expect(sortReviewItems([futureHighPriority, dueMemoryOnly, dueHighPriority]).map((item) => item.id)).toEqual([
      'due-high',
      'due-memory',
      'future-high',
    ]);
  });
});
