import { describe, expect, it } from 'vitest';
import {
  buildChoiceOptionInsights,
  buildMockRepairPlan,
  buildProgressTrustBrief,
  buildReviewVariantRecommendations,
  buildTodayCoachInsight,
  buildTrainingCamps,
} from '../../src/domain/productCoach';
import { DailyPlan, ReviewItem, SkillProfile } from '../../src/types';

describe('product coach recommendations', () => {
  const grammarProfile: SkillProfile = {
    id: 'cet4-grammar-structure',
    skillArea: 'grammar',
    subSkillId: 'grammar-structure',
    score: 58,
    confidence: 3,
    evidenceCount: 8,
    lastUpdatedAt: '2026-06-14T08:00:00.000Z',
  };

  it('turns an empty state into a three-minute start goal', () => {
    const insight = buildTodayCoachInsight({
      abilityEvidenceCount: 0,
      answeredQuestionCount: 0,
      skillProfiles: [],
    });

    expect(insight.headline).toContain('3 分钟启动');
    expect(insight.expectedGain).toContain('具体专项');
  });

  it('explains the today coach task with evidence and target risk', () => {
    const dailyPlan: DailyPlan = {
      id: 'plan-1',
      date: '2026-06-14',
      plannedMinutes: 45,
      rationale: [],
      tasks: [{
        id: 'task-grammar',
        type: 'practice',
        title: '语法结构与固定搭配专项',
        skillArea: 'grammar',
        estimatedMinutes: 12,
        priority: 'high',
        reason: '语法结构当前掌握度偏低，需要用新题补证据。',
        payload: { mode: 'grammar-structure' },
      }],
    };

    const insight = buildTodayCoachInsight({
      dailyPlan,
      skillProfiles: [grammarProfile],
      targetScore: 550,
      estimatedScore: 510,
    });

    expect(insight.headline).toContain('语法结构');
    expect(insight.proof).toContain('58%');
    expect(insight.risk).toContain('40');
  });

  it('groups grammar practice into knowledge-point camps', () => {
    const camps = buildTrainingCamps('grammar', [grammarProfile]);

    expect(camps.map((camp) => camp.id)).toContain('grammar-nonfinite');
    expect(camps[0].successMetric).toContain('75%');
  });

  it('creates per-option feedback after an objective answer', () => {
    const insights = buildChoiceOptionInsights({
      options: { A: 'review', B: 'reviewing', C: 'to review', D: 'reviewed' },
      correctAnswer: 'C',
      selectedAnswer: 'B',
      explanation: 'be encouraged to do sth. 是固定结构。',
      trapType: '非谓语混淆',
    });

    expect(insights.find((item) => item.option === 'C')).toMatchObject({ label: '正确项', tone: 'correct' });
    expect(insights.find((item) => item.option === 'B')).toMatchObject({ label: '你的误选', tone: 'selected-wrong' });
    expect(insights).toHaveLength(4);
  });

  it('routes review items to same-type variant practice', () => {
    const reviewItem: ReviewItem = {
      id: 'review-1',
      title: '语法错因：时态语态错误',
      category: '错题',
      detail: 'test',
      daysAgo: 0,
      skillArea: 'grammar',
      moduleId: 'grammar',
    };

    const recommendations = buildReviewVariantRecommendations(reviewItem);

    expect(recommendations[0]).toMatchObject({
      moduleId: 'grammar',
      actionLabel: '去做语法结构',
    });
  });

  it('summarizes progress evidence into trust copy', () => {
    const brief = buildProgressTrustBrief({
      profiles: [grammarProfile],
      sessions: [{
        id: 'session-1',
        examId: 'cet4',
        moduleId: 'grammar',
        modeId: 'grammar-structure',
        startedAt: '2026-06-14T08:00:00.000Z',
        finishedAt: new Date().toISOString(),
        plannedMinutes: 12,
        questionIds: ['q1'],
        status: 'completed',
      }],
      attempts: [{
        id: 'attempt-1',
        sessionId: 'session-1',
        questionId: 'q1',
        examId: 'cet4',
        moduleId: 'grammar',
        questionTypeId: 'grammar-structure',
        answer: 'B',
        isCorrect: false,
        elapsedSeconds: 30,
        mistakeReasons: ['语法错误'],
        createdAt: new Date().toISOString(),
      }],
    });

    expect(brief.weakReason).toContain('grammar-structure');
    expect(brief.nextAction).toContain('语法结构');
    expect(brief.weeklyChange).toContain('1 次作答');
  });

  it('turns mock scores into a prioritized repair plan', () => {
    const plan = buildMockRepairPlan([
      { moduleId: 'writing', label: '写作', score: 82 },
      { moduleId: 'listening', label: '听力', score: 61 },
      { moduleId: 'reading', label: '阅读', score: 74 },
      { moduleId: 'translation', label: '翻译', score: 88 },
    ]);

    expect(plan[0]).toMatchObject({
      moduleId: 'listening',
      priority: 'high',
    });
    expect(plan.map((item) => item.title)).toContain('阅读修复');
  });
});

