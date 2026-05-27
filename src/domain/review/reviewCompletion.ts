import {
  Attempt,
  MistakeReason,
  PracticeSession,
  ReviewCompletionEvidence,
  ReviewItem,
  SkillProfile,
} from '../../types';

interface BuildReviewCompletionRecordsInput {
  reviewItem: ReviewItem;
  evidence: ReviewCompletionEvidence;
  now?: string;
}

export interface ReviewCompletionRecords {
  reviewItem: ReviewItem;
  session: PracticeSession;
  attempt: Attempt;
  skillProfile?: SkillProfile;
}

const KNOWN_MISTAKE_REASONS: MistakeReason[] = [
  '定位失准',
  '同义替换未识别',
  '细节偷换',
  '关键词漏听',
  '转折信息漏听',
  '数字时间混淆',
  '选项判断失误',
  '低信心',
  '盲猜',
  '表达不自然',
  '语法错误',
  '论证结构松散',
  '搭配错误',
  '时态语态错误',
  '中文干扰',
];

function makeReviewEvidenceId(prefix: string, reviewItemId: string, now: string): string {
  const timestamp = now.replace(/[-:.TZ]/g, '').slice(0, 14);
  const safeReviewId = reviewItemId.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 48);
  return `${prefix}-${safeReviewId}-${timestamp}`;
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function completedStepCount(evidence: ReviewCompletionEvidence): number {
  return Math.max(0, Math.min(3, Math.floor(evidence.completedStepCount)));
}

function calculateMasteryScore(currentMastery: number, evidence: ReviewCompletionEvidence): number {
  const completedSteps = completedStepCount(evidence);
  if (completedSteps < 3) return clampScore(currentMastery + completedSteps * 5);
  return clampScore(currentMastery + (currentMastery < 60 ? 25 : 15));
}

function nextReviewIntervalDays(masteryScore: number): number {
  if (masteryScore >= 95) return 30;
  if (masteryScore >= 85) return 14;
  if (masteryScore >= 70) return 7;
  if (masteryScore >= 55) return 3;
  return 1;
}

function elapsedSeconds(startedAt: string | undefined, now: string): number {
  if (!startedAt) return 1;
  const start = new Date(startedAt).getTime();
  const end = new Date(now).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 1;
  return Math.max(1, Math.round((end - start) / 1000));
}

function extractMistakeReasons(item: ReviewItem): MistakeReason[] {
  const source = `${item.title}\n${item.detail}`;
  return KNOWN_MISTAKE_REASONS.filter((reason) => source.includes(reason));
}

function evidenceConfidence(evidence: ReviewCompletionEvidence): 1 | 2 | 3 | 4 | 5 {
  const textLength =
    evidence.recallAnswer.trim().length +
    evidence.clozeAnswer.trim().length +
    evidence.productionAnswer.trim().length;
  if (completedStepCount(evidence) >= 3 && textLength >= 100) return 5;
  if (completedStepCount(evidence) >= 3 && textLength >= 40) return 4;
  if (completedStepCount(evidence) >= 2) return 3;
  return 2;
}

export function buildReviewCompletionRecords(input: BuildReviewCompletionRecordsInput): ReviewCompletionRecords {
  const now = input.now ?? new Date().toISOString();
  const currentMastery = input.reviewItem.masteryScore ?? 35;
  const masteryScore = calculateMasteryScore(currentMastery, input.evidence);
  const reviewIntervalDays = nextReviewIntervalDays(masteryScore);
  const nextReviewAt = new Date(now);
  nextReviewAt.setDate(nextReviewAt.getDate() + reviewIntervalDays);

  const examId = input.reviewItem.examId ?? 'cet4';
  const skillArea = input.reviewItem.skillArea;
  const sessionId = makeReviewEvidenceId('session-review', input.reviewItem.id, now);
  const questionId = input.reviewItem.targetId ?? input.reviewItem.id;
  const mistakeReasons = extractMistakeReasons(input.reviewItem);

  const reviewItem: ReviewItem = {
    ...input.reviewItem,
    masteryScore,
    priorityScore: Math.max(10, (input.reviewItem.priorityScore ?? 50) - 25),
    reviewIntervalDays,
    lastReviewedAt: now,
    nextReviewAt: nextReviewAt.toISOString(),
    daysAgo: 0,
    retrievalCount: (input.reviewItem.retrievalCount ?? 0) + 1,
  };

  const session: PracticeSession = {
    id: sessionId,
    examId,
    moduleId: 'review',
    modeId: 'active-recall-cloze-production',
    startedAt: input.evidence.startedAt ?? now,
    finishedAt: now,
    plannedMinutes: 8,
    questionIds: [String(questionId)],
    status: 'completed',
  };

  const attempt: Attempt = {
    id: makeReviewEvidenceId('attempt-review', input.reviewItem.id, now),
    sessionId,
    questionId: String(questionId),
    examId,
    moduleId: 'review',
    questionTypeId: input.reviewItem.learningMethod ?? 'active-recall-cloze-production',
    answer: {
      reviewItemId: input.reviewItem.id,
      recallAnswer: input.evidence.recallAnswer,
      clozeAnswer: input.evidence.clozeAnswer,
      productionAnswer: input.evidence.productionAnswer,
      referenceRecallAnswer: input.reviewItem.memoryTask?.recallAnswer,
      referenceClozeAnswer: input.reviewItem.memoryTask?.clozeAnswer,
      productionPrompt: input.reviewItem.memoryTask?.productionPrompt,
      completedStepCount: completedStepCount(input.evidence),
    },
    isCorrect: completedStepCount(input.evidence) >= 3,
    elapsedSeconds: elapsedSeconds(input.evidence.startedAt, now),
    confidence: evidenceConfidence(input.evidence),
    mistakeReasons,
    createdAt: now,
  };

  const skillProfile = skillArea
    ? {
        id: `${examId}-${skillArea}-review`,
        skillArea,
        subSkillId: `review-${input.reviewItem.targetType ?? 'evidence'}`,
        score: masteryScore,
        confidence: attempt.confidence ?? 3,
        evidenceCount: 1,
        lastUpdatedAt: now,
      } satisfies SkillProfile
    : undefined;

  return {
    reviewItem,
    session,
    attempt,
    skillProfile,
  };
}
