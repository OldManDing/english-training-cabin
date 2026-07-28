import { describe, expect, it } from 'vitest';
import { getSuggestedExamDate } from '../../src/domain/planner/defaultExamDate';

describe('default exam date', () => {
  it('always creates a future target instead of a stale release date', () => {
    expect(getSuggestedExamDate(new Date('2026-07-28T08:00:00+08:00'))).toBe('2026-11-25');
  });
});
