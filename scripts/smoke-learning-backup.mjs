const REVIEW_SESSION_ID = 'smoke-session-review';
const REVIEW_ATTEMPT_ID = 'smoke-attempt-review';
const REVIEW_ITEM_ID = 'smoke-review-item';
const REVIEW_PROFILE_ID = 'cet4-reading-review';

export function createSmokeLearningBackup(runId = 'local') {
  const now = new Date().toISOString();
  const nextReview = new Date(Date.now() + 3 * 86400000).toISOString();

  return {
    app: 'english-training-cabin',
    schemaVersion: 1,
    exportedAt: now,
    data: {
      studyGoals: [{
        id: `smoke-goal-${runId}`,
        examId: 'cet4',
        examDate: '2026-06-13',
        targetScore: 550,
        dailyMinutes: 45,
        prioritySkills: ['reading', 'listening', 'vocabulary'],
        status: 'active',
        createdAt: now,
        updatedAt: now,
      }],
      practiceSessions: [{
        id: REVIEW_SESSION_ID,
        examId: 'cet4',
        moduleId: 'review',
        modeId: 'active-recall-cloze-production',
        startedAt: now,
        finishedAt: now,
        plannedMinutes: 8,
        questionIds: ['smoke-reading-question'],
        status: 'completed',
      }],
      attempts: [{
        id: REVIEW_ATTEMPT_ID,
        sessionId: REVIEW_SESSION_ID,
        questionId: 'smoke-reading-question',
        examId: 'cet4',
        moduleId: 'review',
        questionTypeId: 'active-recall-cloze-production',
        answer: {
          reviewItemId: REVIEW_ITEM_ID,
          recallAnswer: 'The learner recalled the synonym replacement clue before seeing the answer.',
          clozeAnswer: 'quiet study spaces',
          productionAnswer: 'Modern libraries provide quiet study spaces for learners who need focused practice.',
          referenceClozeAnswer: 'quiet study spaces',
          completedStepCount: 3,
        },
        isCorrect: true,
        elapsedSeconds: 420,
        confidence: 4,
        mistakeReasons: ['同义替换未识别'],
        createdAt: now,
      }],
      reviewItems: [{
        id: REVIEW_ITEM_ID,
        title: '阅读错因：同义替换未识别',
        category: '错题',
        detail: '题目：Why does the writer mention the library?\n复习重点：同义替换未识别。',
        daysAgo: 0,
        targetType: 'question',
        targetId: 'smoke-reading-question',
        examId: 'cet4',
        moduleId: 'reading',
        skillArea: 'reading',
        masteryScore: 60,
        priorityScore: 65,
        reviewIntervalDays: 3,
        nextReviewAt: nextReview,
        lastReviewedAt: now,
        sourceAttemptId: REVIEW_ATTEMPT_ID,
        createdAt: now,
        learningMethod: 'active-recall-cloze-production',
        retrievalCount: 1,
        memoryTask: {
          version: 1,
          sourceText: 'The library provides quiet study spaces for focused study.',
          recallPrompt: '先说明这道题的定位线索和同义替换关系。',
          recallAnswer: 'The library gives students quiet study spaces.',
          clozePrompt: 'The library provides ____ for focused study.',
          clozeAnswer: 'quiet study spaces',
          chunks: ['provides quiet study spaces'],
          productionPrompt: '用 provides quiet study spaces 造句。',
          methodNotes: ['主动回忆', '挖空补全', '语境输出'],
          spacingPlanDays: [1, 3, 7, 14, 30],
        },
      }],
      skillProfiles: [{
        id: REVIEW_PROFILE_ID,
        skillArea: 'reading',
        subSkillId: 'review-question',
        score: 60,
        confidence: 4,
        evidenceCount: 1,
        lastUpdatedAt: now,
      }],
    },
  };
}

export function getSmokeReviewEvidenceIds() {
  return {
    reviewSessionId: REVIEW_SESSION_ID,
    reviewAttemptId: REVIEW_ATTEMPT_ID,
    reviewItemId: REVIEW_ITEM_ID,
    reviewProfileId: REVIEW_PROFILE_ID,
  };
}

export function assertSmokeLearningBackupRoundTrip(snapshot, assertFn = defaultAssert) {
  const backup = snapshot?.backup ?? snapshot;
  const data = backup?.data;
  assertFn(backup?.app === 'english-training-cabin', 'cloud backup app marker is missing');
  assertFn(data?.studyGoals?.length === 1, 'cloud backup did not preserve study goal evidence');
  assertFn(data?.practiceSessions?.some((session) =>
    session.id === REVIEW_SESSION_ID &&
    session.moduleId === 'review' &&
    session.modeId === 'active-recall-cloze-production'
  ), 'cloud backup did not preserve active recall review session');
  assertFn(data?.attempts?.some((attempt) =>
    attempt.id === REVIEW_ATTEMPT_ID &&
    attempt.moduleId === 'review' &&
    attempt.questionTypeId === 'active-recall-cloze-production' &&
    attempt.answer?.recallAnswer &&
    attempt.answer?.clozeAnswer === 'quiet study spaces' &&
    attempt.answer?.completedStepCount === 3
  ), 'cloud backup did not preserve review attempt answers');
  assertFn(data?.reviewItems?.some((item) =>
    item.id === REVIEW_ITEM_ID &&
    item.lastReviewedAt &&
    item.learningMethod === 'active-recall-cloze-production'
  ), 'cloud backup did not preserve updated review item state');
  assertFn(data?.skillProfiles?.some((profile) =>
    profile.id === REVIEW_PROFILE_ID &&
    profile.skillArea === 'reading' &&
    profile.evidenceCount === 1
  ), 'cloud backup did not preserve review ability profile');
}

function defaultAssert(condition, message) {
  if (!condition) throw new Error(message);
}
