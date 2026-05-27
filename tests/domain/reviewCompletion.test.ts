import { describe, expect, it } from 'vitest';
import { buildReviewCompletionRecords } from '../../src/domain/review/reviewCompletion';
import { ReviewCompletionEvidence, ReviewItem } from '../../src/types';

function reviewItem(overrides: Partial<ReviewItem> = {}): ReviewItem {
  return {
    id: 'review-reading-synonym',
    title: '阅读错因：同义替换未识别',
    category: '错题',
    detail: '题目：Why does the writer mention the library?\n复习重点：同义替换未识别。',
    daysAgo: 0,
    targetType: 'question',
    targetId: 'reading-q1',
    examId: 'cet4',
    moduleId: 'reading',
    skillArea: 'reading',
    masteryScore: 35,
    priorityScore: 90,
    reviewIntervalDays: 1,
    nextReviewAt: '2026-05-27T00:00:00.000Z',
    createdAt: '2026-05-26T08:00:00.000Z',
    memoryTask: {
      version: 1,
      sourceText: 'The library provides quiet spaces for focused study.',
      recallPrompt: '先说明这道题的定位线索。',
      recallAnswer: 'The library gives students quiet study spaces.',
      clozePrompt: 'The library provides ____ for focused study.',
      clozeAnswer: 'quiet spaces',
      chunks: ['provides quiet spaces'],
      productionPrompt: '用 provides quiet spaces 造句。',
      methodNotes: ['主动回忆', '挖空补全', '语境输出'],
      spacingPlanDays: [1, 3, 7, 14, 30],
    },
    learningMethod: 'active-recall-cloze-production',
    retrievalCount: 0,
    ...overrides,
  };
}

const evidence: ReviewCompletionEvidence = {
  recallAnswer: 'The key point is that library equals quiet study space.',
  clozeAnswer: 'quiet spaces',
  productionAnswer: 'Community libraries provide quiet spaces for students who need focused study time.',
  completedStepCount: 3,
  startedAt: '2026-05-27T08:00:00.000Z',
};

describe('buildReviewCompletionRecords', () => {
  it('turns an active recall review into persisted learning evidence', () => {
    const records = buildReviewCompletionRecords({
      reviewItem: reviewItem(),
      evidence,
      now: '2026-05-27T08:05:00.000Z',
    });

    expect(records.reviewItem).toMatchObject({
      id: 'review-reading-synonym',
      masteryScore: 60,
      priorityScore: 65,
      retrievalCount: 1,
      lastReviewedAt: '2026-05-27T08:05:00.000Z',
    });
    expect(records.reviewItem.nextReviewAt).toBe('2026-05-30T08:05:00.000Z');

    expect(records.session).toMatchObject({
      examId: 'cet4',
      moduleId: 'review',
      modeId: 'active-recall-cloze-production',
      startedAt: '2026-05-27T08:00:00.000Z',
      finishedAt: '2026-05-27T08:05:00.000Z',
      status: 'completed',
    });
    expect(records.session.questionIds).toEqual(['reading-q1']);

    expect(records.attempt).toMatchObject({
      examId: 'cet4',
      moduleId: 'review',
      questionId: 'reading-q1',
      questionTypeId: 'active-recall-cloze-production',
      isCorrect: true,
      elapsedSeconds: 300,
      mistakeReasons: ['同义替换未识别'],
    });
    expect(records.attempt.answer).toMatchObject({
      recallAnswer: evidence.recallAnswer,
      clozeAnswer: evidence.clozeAnswer,
      productionAnswer: evidence.productionAnswer,
      referenceClozeAnswer: 'quiet spaces',
      completedStepCount: 3,
    });

    expect(records.skillProfile).toMatchObject({
      id: 'cet4-reading-review',
      skillArea: 'reading',
      subSkillId: 'review-question',
      score: 60,
      evidenceCount: 1,
    });
  });
});
