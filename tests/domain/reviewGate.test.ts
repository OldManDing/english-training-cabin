import { describe, expect, it } from 'vitest';
import { buildReviewGateStatus } from '../../src/domain/review/reviewGate';
import { ReviewItem } from '../../src/types';

function reviewItem(overrides: Partial<ReviewItem>): ReviewItem {
  return {
    id: `review-${overrides.id ?? 'base'}`,
    title: '测试复习项',
    category: '错题',
    detail: '用于验证复习闸门。',
    daysAgo: 0,
    skillArea: 'reading',
    priorityScore: 50,
    nextReviewAt: '2026-05-27T00:00:00.000Z',
    ...overrides,
  };
}

describe('buildReviewGateStatus', () => {
  it('locks new practice until all due reviews are completed when due count is under the daily limit', () => {
    const status = buildReviewGateStatus([
      reviewItem({ id: 'a', priorityScore: 70 }),
      reviewItem({ id: 'b', priorityScore: 90 }),
    ], '2026-05-27');

    expect(status.locked).toBe(true);
    expect(status.requiredToday).toBe(2);
    expect(status.remainingRequired).toBe(2);
    expect(status.dueItems.map((item) => item.id)).toEqual(['b', 'a']);
  });

  it('requires only the highest-priority daily minimum when the backlog is large', () => {
    const status = buildReviewGateStatus([
      reviewItem({ id: 'a' }),
      reviewItem({ id: 'b' }),
      reviewItem({ id: 'c' }),
      reviewItem({ id: 'd' }),
      reviewItem({ id: 'e' }),
    ], '2026-05-27');

    expect(status.locked).toBe(true);
    expect(status.dueCount).toBe(5);
    expect(status.requiredToday).toBe(3);
    expect(status.remainingRequired).toBe(3);
  });

  it('unlocks new practice after the daily minimum has been completed', () => {
    const status = buildReviewGateStatus([
      reviewItem({ id: 'a', nextReviewAt: '2026-05-30T00:00:00.000Z', lastReviewedAt: '2026-05-27T08:00:00.000Z' }),
      reviewItem({ id: 'b', nextReviewAt: '2026-05-30T00:00:00.000Z', lastReviewedAt: '2026-05-27T08:05:00.000Z' }),
      reviewItem({ id: 'c', nextReviewAt: '2026-05-30T00:00:00.000Z', lastReviewedAt: '2026-05-27T08:10:00.000Z' }),
      reviewItem({ id: 'd', nextReviewAt: '2026-05-27T00:00:00.000Z' }),
      reviewItem({ id: 'e', nextReviewAt: '2026-05-27T00:00:00.000Z' }),
    ], '2026-05-27');

    expect(status.locked).toBe(false);
    expect(status.dueCount).toBe(2);
    expect(status.requiredToday).toBe(3);
    expect(status.remainingRequired).toBe(0);
  });

  it('does not lock when there are no due reviews', () => {
    const status = buildReviewGateStatus([
      reviewItem({ id: 'future', nextReviewAt: '2026-05-28T00:00:00.000Z' }),
    ], '2026-05-27');

    expect(status.locked).toBe(false);
    expect(status.dueCount).toBe(0);
    expect(status.requiredToday).toBe(0);
  });
});
