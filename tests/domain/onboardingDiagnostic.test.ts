import { describe, expect, it } from 'vitest';
import {
  buildOnboardingDiagnosticReport,
  createOnboardingDiagnosticItems,
  ONBOARDING_DIAGNOSTIC_EXPECTED_ITEM_COUNT,
  scoreDiagnosticAnswers,
  type DiagnosticItem,
} from '../../src/domain/diagnostic/onboardingDiagnostic';

const strongTextAnswers: Record<string, string> = {
  'diag-translation-structure':
    'With the development of online learning, more college students can arrange their study time more flexibly.',
  'diag-translation-pressure':
    'To reduce exam pressure, students should divide review tasks into several small steps.',
  'diag-translation-review-loop':
    'As long as students review in time after finishing an exercise, the same mistakes are less likely to appear again.',
  'diag-writing-argument':
    'In my opinion, students can use AI tools wisely because they can receive quick feedback. For example, when I write an English paragraph, AI can point out grammar problems and suggest better expressions. However, students should revise the answer themselves instead of copying it.',
  'diag-writing-review-habit':
    'In my opinion, regular review is more useful because it helps students keep new knowledge active in memory. For example, I spend ten minutes every evening checking vocabulary and grammar mistakes, so I feel calmer and remember more in the next class.',
  'diag-writing-study-partner':
    'I think studying with a partner is better because students can explain ideas to each other and notice mistakes quickly. For example, my classmate checks my word choice when we review together, so I understand difficult grammar points more clearly.',
  'diag-speaking-response':
    'One habit that helps me learn English is reading aloud every morning. It works because I can practice pronunciation and remember useful expressions. For example, I repeat one short paragraph three times, so I become more confident.',
  'diag-speaking-mistake':
    'One mistake I often make is using the wrong verb tense when I speak English. I will correct it by recording short answers and checking them after class. For example, next time I describe my weekend, I will review the past tense before I speak.',
  'diag-speaking-word-check':
    'One way I check whether I remember a new English word is to use it in my own sentence. It works because I can test the meaning and the grammar at the same time. For example, I write the word in my notebook and say it aloud again later.',
};

function buildStrongAnswer(item: DiagnosticItem): string {
  if (item.kind === 'single-choice') return item.correctAnswer;
  const answer = strongTextAnswers[item.id];
  if (!answer) throw new Error(`Missing strong text answer for ${item.id}`);
  return answer;
}

function buildWrongChoice(item: DiagnosticItem): string {
  if (item.kind !== 'single-choice') return buildStrongAnswer(item);
  return item.options.find((option) => option.id !== item.correctAnswer)?.id ?? item.correctAnswer;
}

function buildAnswersForItems(items: DiagnosticItem[], weakSkills: Array<DiagnosticItem['skillArea']> = []) {
  return Object.fromEntries(items.map((item) => [
    item.id,
    weakSkills.includes(item.skillArea) ? buildWrongChoice(item) : buildStrongAnswer(item),
  ]));
}

describe('onboarding diagnostic scoring', () => {
  it('selects a random diagnostic snapshot and can avoid the previous item set', () => {
    const firstRunItems = createOnboardingDiagnosticItems({ random: () => 0, shuffleOrder: false });
    const secondRunItems = createOnboardingDiagnosticItems({
      excludeItemIds: firstRunItems.map((item) => item.id),
      random: () => 0,
      shuffleOrder: false,
    });

    expect(firstRunItems).toHaveLength(ONBOARDING_DIAGNOSTIC_EXPECTED_ITEM_COUNT);
    expect(secondRunItems).toHaveLength(ONBOARDING_DIAGNOSTIC_EXPECTED_ITEM_COUNT);
    expect(secondRunItems.map((item) => item.id)).not.toEqual(firstRunItems.map((item) => item.id));

    const report = buildOnboardingDiagnosticReport({
      answers: buildAnswersForItems(secondRunItems),
      items: secondRunItems,
      targetScore: 550,
      dailyMinutes: 45,
      startedAt: '2026-05-26T08:00:00.000Z',
      completedAt: '2026-05-26T08:08:00.000Z',
    });

    expect(report.session.questionIds).toEqual(secondRunItems.map((item) => item.id));
    expect(report.attempts.map((attempt) => attempt.questionId)).toEqual(secondRunItems.map((item) => item.id));
    expect(report.skillProfiles).toHaveLength(4);
    expect(report.confidenceSummary.level).toBe('medium');
  });

  it('keeps Chinese support available for post-answer review only', () => {
    const collectedItems = new Map<string, DiagnosticItem>();
    const excludedItemIds: string[] = [];

    for (let runIndex = 0; runIndex < 3; runIndex += 1) {
      const items = createOnboardingDiagnosticItems({
        excludeItemIds: excludedItemIds,
        random: () => 0,
        shuffleOrder: false,
      });
      items.forEach((item) => collectedItems.set(item.id, item));
      excludedItemIds.push(...items.map((item) => item.id));
    }

    const chineseText = /[\u4e00-\u9fff]/u;
    const englishFacingItems = [...collectedItems.values()].filter((item) => (
      item.kind === 'single-choice'
      || item.context.startsWith('Topic:')
      || item.context.startsWith('Question:')
    ));

    expect(englishFacingItems).toHaveLength(18);
    expect(
      englishFacingItems
        .filter((item) => !chineseText.test(item.chineseSupport?.context ?? ''))
        .map((item) => item.id),
    ).toEqual([]);
    expect(
      englishFacingItems
        .filter((item) => item.kind === 'single-choice' && !chineseText.test(item.chineseSupport?.prompt ?? ''))
        .map((item) => item.id),
    ).toEqual([]);
    expect(
      englishFacingItems.flatMap((item) => {
        if (item.kind !== 'single-choice') return [];
        return item.options
          .filter((option) => !chineseText.test(item.chineseSupport?.options?.[option.id] ?? ''))
          .map((option) => `${item.id}:${option.id}`);
      }),
    ).toEqual([]);
  });

  it('persists only confirmed objective baselines and keeps subjective results provisional', () => {
    const items = createOnboardingDiagnosticItems({ random: () => 0, shuffleOrder: false });
    const report = buildOnboardingDiagnosticReport({
      answers: buildAnswersForItems(items),
      items,
      targetScore: 550,
      dailyMinutes: 45,
      startedAt: '2026-05-26T08:00:00.000Z',
      completedAt: '2026-05-26T08:08:00.000Z',
    });

    expect(report.session).toMatchObject({
      examId: 'cet4',
      moduleId: 'onboarding',
      modeId: 'diagnostic',
      status: 'completed',
    });
    expect(report.session.questionIds).toHaveLength(ONBOARDING_DIAGNOSTIC_EXPECTED_ITEM_COUNT);
    expect(report.attempts).toHaveLength(ONBOARDING_DIAGNOSTIC_EXPECTED_ITEM_COUNT);
    expect(report.skillProfiles).toHaveLength(4);
    expect(report.averageScore).toBe(82);
    expect(report.confidenceSummary.level).toBe('medium');
    expect(report.details.find((detail) => detail.skillArea === 'reading')).toMatchObject({
      confirmedForProfile: true,
      confidenceLevel: 'medium',
      validEvidenceCount: 2,
      evidenceSummary: expect.stringContaining('有效客观证据 2/2'),
      scoringMethod: 'objective-aggregate',
      score: 82,
    });
    expect(report.details.find((detail) => detail.skillArea === 'writing')).toMatchObject({
      confirmedForProfile: false,
      confidenceLevel: 'low',
      validEvidenceCount: 1,
      evidenceSummary: expect.stringContaining('有效主观样本 1/1'),
      scoringMethod: 'rubric-screening',
      score: null,
    });
    expect(report.reviewItems.length).toBeLessThanOrEqual(1);
  });

  it('keeps unanswered items as missing evidence instead of fake attempts', () => {
    const items = createOnboardingDiagnosticItems({ random: () => 0, shuffleOrder: false });
    const answeredChoice = items.find((item) => item.kind === 'single-choice');
    const answeredText = items.find((item) => item.kind === 'text');
    if (!answeredChoice || !answeredText) throw new Error('Expected diagnostic to contain choice and text items');
    const answeredIds = [answeredChoice.id, answeredText.id].sort();

    const report = buildOnboardingDiagnosticReport({
      answers: {
        [answeredChoice.id]: buildStrongAnswer(answeredChoice),
        [answeredText.id]: buildStrongAnswer(answeredText),
      },
      items,
      targetScore: 550,
      dailyMinutes: 45,
      startedAt: '2026-05-26T08:00:00.000Z',
      completedAt: '2026-05-26T08:04:00.000Z',
    });

    expect(report.session.questionIds).toHaveLength(ONBOARDING_DIAGNOSTIC_EXPECTED_ITEM_COUNT);
    expect(report.attempts.map((attempt) => attempt.questionId).sort()).toEqual(answeredIds);
    expect(report.reviewItems.every((item) => answeredIds.includes(item.targetId))).toBe(true);
    expect(report.skillProfiles).toHaveLength(0);
    expect(report.averageScore).toBeNull();
    expect(report.confidenceSummary.level).toBe('low');
    expect(report.details.find((detail) => detail.skillArea === 'reading')).toMatchObject({
      validEvidenceCount: 1,
      evidenceSummary: expect.stringContaining('有效客观证据 1/2'),
    });
    expect(report.details.find((detail) => detail.skillArea === 'listening')).toMatchObject({
      validEvidenceCount: 0,
      evidenceSummary: expect.stringContaining('有效客观证据 0/2'),
    });
  });

  it('changes confirmed weak-skill ordering when an objective ability misses both sampled items', () => {
    const items = createOnboardingDiagnosticItems({ random: () => 0, shuffleOrder: false });
    const weakSkills = ['reading', 'listening'] as const;
    const answers = buildAnswersForItems(items, [...weakSkills]);
    const itemResults = scoreDiagnosticAnswers(answers, items);

    expect(itemResults.filter((detail) => detail.skillArea === 'reading')).toHaveLength(2);
    expect(itemResults.filter((detail) => detail.skillArea === 'reading').every((detail) => detail.score === 48)).toBe(true);
    expect(itemResults.filter((detail) => detail.skillArea === 'listening').every((detail) => detail.score === 48)).toBe(true);
    expect(itemResults.filter((detail) => detail.score < 70)).toHaveLength(4);

    const report = buildOnboardingDiagnosticReport({
      answers,
      items,
      targetScore: 600,
      dailyMinutes: 60,
      startedAt: '2026-05-26T08:00:00.000Z',
      completedAt: '2026-05-26T08:06:00.000Z',
    });

    expect(report.reviewItems).toHaveLength(4);
    const choiceReview = report.reviewItems.find((item) => item.redoQuestion?.kind === 'single-choice');
    expect(choiceReview).toBeTruthy();
    expect(choiceReview?.learningMethod).toBe('wrong-question-redo-active-recall');
    expect(choiceReview?.redoQuestion?.prompt).toBeTruthy();
    expect(choiceReview?.redoQuestion?.options?.A).toBeTruthy();
    expect(choiceReview?.redoQuestion?.userAnswer).not.toBe(choiceReview?.redoQuestion?.correctAnswer);
    expect(report.details.find((detail) => detail.skillArea === 'reading')).toMatchObject({
      score: 42,
      confirmedForProfile: true,
    });
    expect(report.details.find((detail) => detail.skillArea === 'listening')).toMatchObject({
      score: 42,
      confirmedForProfile: true,
    });
    expect(report.weakestSkills).toEqual(['reading', 'listening']);
    expect(report.confidenceSummary.level).toBe('medium');
  });

  it('uses AI-assisted subjective feedback without writing it into the formal ability profile', () => {
    const items = createOnboardingDiagnosticItems({ random: () => 0, shuffleOrder: false });
    const answers = buildAnswersForItems(items);
    const subjectiveItems = items.filter((item) => item.kind === 'text');
    const aiEvaluations = Object.fromEntries(subjectiveItems.map((item) => [
      item.id,
      {
        itemId: item.id,
        score: 86,
        mistakeReasons: [],
        comments: ['AI 复核认为作答覆盖任务要求，结构基本完整。'],
        nextActions: ['继续用同题型限时训练验证稳定性。'],
        evidence: ['答案包含观点、原因和例子。'],
        confidence: 'medium' as const,
        source: 'ai' as const,
      },
    ]));

    const report = buildOnboardingDiagnosticReport({
      answers,
      items,
      aiEvaluations,
      targetScore: 550,
      dailyMinutes: 45,
      startedAt: '2026-05-26T08:00:00.000Z',
      completedAt: '2026-05-26T08:08:00.000Z',
    });

    expect(report.skillProfiles).toHaveLength(4);
    expect(report.confidenceSummary.note).toContain('AI Rubric');
    const writingDetail = report.details.find((detail) => detail.skillArea === 'writing');
    expect(writingDetail).toMatchObject({
      confirmedForProfile: false,
      score: null,
      scoringMethod: 'ai-assisted-rubric',
      confidenceLevel: 'medium',
      validEvidenceCount: 1,
      evidenceSummary: expect.stringContaining('AI 复核分 86'),
    });
    const writingAttempt = report.attempts.find((attempt) => attempt.moduleId === 'writing');
    expect(writingAttempt?.aiFeedback?.comments[0]).toContain('AI');
  });
});
