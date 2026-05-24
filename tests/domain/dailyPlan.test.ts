import { describe, expect, it } from 'vitest';
import { buildDailyPlan } from '../../src/domain/planner/dailyPlan';
import { StudyGoal } from '../../src/types';

describe('buildDailyPlan', () => {
  const goal: Pick<StudyGoal, 'id' | 'examId' | 'examDate' | 'dailyMinutes' | 'prioritySkills'> = {
    id: 'goal-cet4-primary',
    examId: 'cet4',
    examDate: '2026-06-15',
    dailyMinutes: 60,
    prioritySkills: ['reading', 'listening', 'speaking'],
  };

  it('prioritizes due review items before new practice', () => {
    const plan = buildDailyPlan({
      goal,
      date: '2026-05-24',
      reviewItems: [
        {
          id: 'review-1',
          title: '阅读错因：同义替换未识别',
          category: '错题',
          detail: 'test',
          daysAgo: 0,
          skillArea: 'reading',
          priorityScore: 90,
          nextReviewAt: '2026-05-24T00:00:00.000Z',
        },
      ],
      skillProfiles: [],
    });

    expect(plan.tasks[0]).toMatchObject({
      type: 'review',
      priority: 'high',
    });
    expect(plan.rationale[0]).toContain('到期复习');
  });

  it('uses the weakest skill profile for the main practice task', () => {
    const plan = buildDailyPlan({
      goal,
      date: '2026-05-24',
      skillProfiles: [
        {
          id: 'cet4-reading-careful-reading',
          skillArea: 'reading',
          subSkillId: 'careful-reading',
          score: 88,
          confidence: 5,
          evidenceCount: 5,
          lastUpdatedAt: '2026-05-24T00:00:00.000Z',
        },
        {
          id: 'cet4-listening-long-conversation',
          skillArea: 'listening',
          subSkillId: 'long-conversation',
          score: 42,
          confidence: 2,
          evidenceCount: 3,
          lastUpdatedAt: '2026-05-24T00:00:00.000Z',
        },
      ],
    });

    expect(plan.tasks.find((task) => task.type === 'practice')).toMatchObject({
      skillArea: 'listening',
    });
  });
});
