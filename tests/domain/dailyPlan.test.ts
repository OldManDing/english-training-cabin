import { describe, expect, it } from 'vitest';
import { buildDailyPlan } from '../../src/domain/planner/dailyPlan';
import { StudyGoal } from '../../src/types';

describe('buildDailyPlan', () => {
  const goal: Pick<StudyGoal, 'id' | 'examId' | 'examDate' | 'dailyMinutes' | 'prioritySkills'> = {
    id: 'goal-cet4-primary',
    examId: 'cet4',
    examDate: '2026-06-13',
    dailyMinutes: 60,
    prioritySkills: ['reading', 'listening', 'vocabulary', 'speaking'],
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
      skillProfiles: [
        {
          id: 'cet4-reading-diagnostic',
          skillArea: 'reading',
          subSkillId: 'diagnostic-reading',
          score: 70,
          confidence: 3,
          evidenceCount: 1,
          lastUpdatedAt: '2026-05-24T00:00:00.000Z',
        },
      ],
    });

    expect(plan.tasks[0]).toMatchObject({
      type: 'review',
      priority: 'high',
    });
    expect(plan.rationale[0]).toContain('到期复习');
  });

  it('starts with diagnostic before recommending practice when there is no ability evidence', () => {
    const plan = buildDailyPlan({
      goal,
      date: '2026-05-24',
      skillProfiles: [],
    });

    expect(plan.tasks[0]).toMatchObject({
      type: 'diagnostic',
      priority: 'high',
    });
    expect(plan.rationale[0]).toContain('入门诊断');
  });

  it('keeps task minutes within the daily budget', () => {
    const plan = buildDailyPlan({
      goal: {
        ...goal,
        dailyMinutes: 20,
      },
      date: '2026-05-24',
      reviewItems: [
        {
          id: 'review-1',
          title: '阅读错因：定位失准',
          category: '错题',
          detail: 'test',
          daysAgo: 0,
          skillArea: 'reading',
          priorityScore: 90,
          nextReviewAt: '2026-05-24T00:00:00.000Z',
        },
      ],
      skillProfiles: [],
      strategy: 'review',
    });

    const totalMinutes = plan.tasks.reduce((sum, task) => sum + task.estimatedMinutes, 0);
    expect(totalMinutes).toBeLessThanOrEqual(plan.plannedMinutes);
    expect(plan.plannedMinutes).toBe(20);
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

  it('adapts the main practice task to staged mock decline even when another skill has the lowest absolute score', () => {
    const plan = buildDailyPlan({
      goal: {
        ...goal,
        examDate: '2026-09-01',
      },
      date: '2026-05-24',
      skillProfiles: [
        {
          id: 'cet4-reading-careful-reading',
          skillArea: 'reading',
          subSkillId: 'careful-reading',
          score: 40,
          confidence: 2,
          evidenceCount: 5,
          lastUpdatedAt: '2026-05-20T00:00:00.000Z',
        },
        {
          id: 'cet4-listening-diagnostic-listening',
          skillArea: 'listening',
          subSkillId: 'diagnostic-listening',
          score: 88,
          confidence: 4,
          evidenceCount: 3,
          lastUpdatedAt: '2026-05-01T00:00:00.000Z',
        },
        {
          id: 'cet4-listening-mock-listening-mixed',
          skillArea: 'listening',
          subSkillId: 'mock-listening-mixed',
          score: 70,
          confidence: 3,
          evidenceCount: 25,
          lastUpdatedAt: '2026-05-23T00:00:00.000Z',
        },
        {
          id: 'cet4-reading-diagnostic-reading',
          skillArea: 'reading',
          subSkillId: 'diagnostic-reading',
          score: 62,
          confidence: 3,
          evidenceCount: 3,
          lastUpdatedAt: '2026-05-01T00:00:00.000Z',
        },
        {
          id: 'cet4-reading-mock-reading-mixed',
          skillArea: 'reading',
          subSkillId: 'mock-reading-mixed',
          score: 64,
          confidence: 3,
          evidenceCount: 30,
          lastUpdatedAt: '2026-05-23T00:00:00.000Z',
        },
        {
          id: 'cet4-vocabulary-cet4-core-vocabulary',
          skillArea: 'vocabulary',
          subSkillId: 'cet4-core-vocabulary',
          score: 82,
          confidence: 4,
          evidenceCount: 12,
          lastUpdatedAt: '2026-05-22T00:00:00.000Z',
        },
      ],
    });

    const practice = plan.tasks.find((task) => task.type === 'practice');
    expect(practice).toMatchObject({
      skillArea: 'listening',
      priority: 'high',
    });
    expect(practice?.reason).toContain('阶段模考');
    expect(plan.rationale).toContain('听力 阶段模考较基线下降 18 个能力点，今日主训练优先修正该回落分项。');
  });

  it('adds staged mock exam when exam is near and ability evidence exists', () => {
    const plan = buildDailyPlan({
      goal,
      date: '2026-05-24',
      skillProfiles: [
        {
          id: 'cet4-reading-careful-reading',
          skillArea: 'reading',
          subSkillId: 'careful-reading',
          score: 72,
          confidence: 3,
          evidenceCount: 5,
          lastUpdatedAt: '2026-05-24T00:00:00.000Z',
        },
        {
          id: 'cet4-listening-long-conversation',
          skillArea: 'listening',
          subSkillId: 'long-conversation',
          score: 68,
          confidence: 3,
          evidenceCount: 3,
          lastUpdatedAt: '2026-05-24T00:00:00.000Z',
        },
      ],
    });

    expect(plan.tasks).toContainEqual(expect.objectContaining({
      type: 'mock',
      title: '阶段模考：写作/听力/阅读/翻译综合校准',
      priority: 'high',
    }));
    expect(plan.tasks.reduce((sum, task) => sum + task.estimatedMinutes, 0)).toBeLessThanOrEqual(plan.plannedMinutes);
  });

  it('adds vocabulary listening practice when vocabulary evidence is missing', () => {
    const plan = buildDailyPlan({
      goal,
      date: '2026-05-24',
      skillProfiles: [
        {
          id: 'cet4-reading-careful-reading',
          skillArea: 'reading',
          subSkillId: 'careful-reading',
          score: 82,
          confidence: 4,
          evidenceCount: 5,
          lastUpdatedAt: '2026-05-24T00:00:00.000Z',
        },
      ],
    });

    expect(plan.tasks).toContainEqual(expect.objectContaining({
      title: '核心词汇听音与语块记忆',
      skillArea: 'vocabulary',
      priority: 'high',
    }));
    expect(plan.rationale).toContain('词汇证据不足或分数偏低，今日任务加入核心词汇听音练习。');
    expect(plan.tasks.reduce((sum, task) => sum + task.estimatedMinutes, 0)).toBeLessThanOrEqual(plan.plannedMinutes);
  });

  it('adds vocabulary practice when vocabulary score is below the stable line', () => {
    const plan = buildDailyPlan({
      goal,
      date: '2026-05-24',
      skillProfiles: [
        {
          id: 'cet4-vocabulary-cet4-core-vocabulary',
          skillArea: 'vocabulary',
          subSkillId: 'cet4-core-vocabulary',
          score: 58,
          confidence: 2,
          evidenceCount: 12,
          lastUpdatedAt: '2026-05-24T00:00:00.000Z',
        },
        {
          id: 'cet4-reading-careful-reading',
          skillArea: 'reading',
          subSkillId: 'careful-reading',
          score: 84,
          confidence: 4,
          evidenceCount: 5,
          lastUpdatedAt: '2026-05-24T00:00:00.000Z',
        },
      ],
    });

    expect(plan.tasks.find((task) => task.skillArea === 'vocabulary')).toMatchObject({
      title: '核心词汇听音与语块记忆',
    });
  });

  it('routes a diagnostic cloze weakness to the cloze practice entry instead of generic vocabulary', () => {
    const plan = buildDailyPlan({
      goal,
      date: '2026-05-24',
      skillProfiles: [
        {
          id: 'cet4-vocabulary-diagnostic-cloze-context',
          skillArea: 'vocabulary',
          subSkillId: 'diagnostic-cloze-context',
          score: 42,
          confidence: 2,
          evidenceCount: 1,
          lastUpdatedAt: '2026-05-24T00:00:00.000Z',
        },
        {
          id: 'cet4-reading-careful-reading',
          skillArea: 'reading',
          subSkillId: 'careful-reading',
          score: 82,
          confidence: 4,
          evidenceCount: 5,
          lastUpdatedAt: '2026-05-24T00:00:00.000Z',
        },
      ],
    });

    expect(plan.tasks.find((task) => task.type === 'practice')).toMatchObject({
      title: '完形/选词填空语境专项',
      payload: expect.objectContaining({
        mode: 'cloze-context',
        sourceSubSkillId: 'diagnostic-cloze-context',
      }),
    });
  });

  it('routes a diagnostic grammar weakness to grammar structure practice', () => {
    const plan = buildDailyPlan({
      goal,
      date: '2026-05-24',
      skillProfiles: [
        {
          id: 'cet4-grammar-diagnostic-grammar-structure',
          skillArea: 'grammar',
          subSkillId: 'diagnostic-grammar-structure',
          score: 42,
          confidence: 2,
          evidenceCount: 1,
          lastUpdatedAt: '2026-05-24T00:00:00.000Z',
        },
        {
          id: 'cet4-reading-careful-reading',
          skillArea: 'reading',
          subSkillId: 'careful-reading',
          score: 82,
          confidence: 4,
          evidenceCount: 5,
          lastUpdatedAt: '2026-05-24T00:00:00.000Z',
        },
      ],
    });

    expect(plan.tasks.find((task) => task.type === 'practice')).toMatchObject({
      title: '语法结构与固定搭配专项',
      skillArea: 'grammar',
      payload: expect.objectContaining({
        mode: 'grammar-structure',
        sourceSubSkillId: 'diagnostic-grammar-structure',
      }),
    });
  });

  it('keeps a severe diagnostic weakness ahead of stage mock calibration near the exam', () => {
    const plan = buildDailyPlan({
      goal,
      date: '2026-05-29',
      skillProfiles: [
        {
          id: 'cet4-grammar-diagnostic-grammar-structure',
          skillArea: 'grammar',
          subSkillId: 'diagnostic-grammar-structure',
          score: 42,
          confidence: 2,
          evidenceCount: 1,
          lastUpdatedAt: '2026-05-29T00:00:00.000Z',
        },
        {
          id: 'cet4-reading-careful-reading',
          skillArea: 'reading',
          subSkillId: 'careful-reading',
          score: 82,
          confidence: 4,
          evidenceCount: 5,
          lastUpdatedAt: '2026-05-29T00:00:00.000Z',
        },
        {
          id: 'cet4-vocabulary-cet4-core-vocabulary',
          skillArea: 'vocabulary',
          subSkillId: 'cet4-core-vocabulary',
          score: 78,
          confidence: 4,
          evidenceCount: 5,
          lastUpdatedAt: '2026-05-29T00:00:00.000Z',
        },
      ],
    });

    expect(plan.tasks[0]).toMatchObject({
      type: 'practice',
      title: '语法结构与固定搭配专项',
      skillArea: 'grammar',
      payload: expect.objectContaining({
        mode: 'grammar-structure',
      }),
    });
    expect(plan.tasks[1]).toMatchObject({
      type: 'mock',
      title: '阶段模考：写作/听力/阅读/翻译综合校准',
    });
  });
});
