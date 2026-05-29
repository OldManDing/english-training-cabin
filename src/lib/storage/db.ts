import Dexie, { Table } from 'dexie';
import { buildReviewCompletionRecords } from '../../domain/review/reviewCompletion';
import { Attempt, PracticeSession, ReviewCompletionEvidence, ReviewItem, SkillProfile, StudyGoal } from '../../types';

export interface LearningDataBackup {
  app: 'english-training-cabin';
  schemaVersion: 1;
  exportedAt: string;
  data: {
    studyGoals: StudyGoal[];
    practiceSessions: PracticeSession[];
    attempts: Attempt[];
    reviewItems: ReviewItem[];
    skillProfiles: SkillProfile[];
  };
}

class EnglishTrainingDb extends Dexie {
  studyGoals!: Table<StudyGoal, string>;
  practiceSessions!: Table<PracticeSession, string>;
  attempts!: Table<Attempt, string>;
  reviewItems!: Table<ReviewItem, string>;
  skillProfiles!: Table<SkillProfile, string>;

  constructor() {
    super('english-training-cabin');
    this.version(1).stores({
      studyGoals: 'id, examId, status, updatedAt',
      practiceSessions: 'id, examId, moduleId, status, startedAt, finishedAt',
      attempts: 'id, sessionId, questionId, examId, moduleId, questionTypeId, createdAt',
      reviewItems: 'id, targetType, targetId, examId, moduleId, skillArea, nextReviewAt, priorityScore',
      skillProfiles: 'id, skillArea, subSkillId, lastUpdatedAt',
    });
  }
}

export const db = new EnglishTrainingDb();

export const DEFAULT_GOAL_ID = 'goal-cet4-primary';

export async function getOrCreateActiveGoal(): Promise<StudyGoal> {
  const existing = await db.studyGoals.where('status').equals('active').first();
  if (existing) return existing;

  const now = new Date().toISOString();
  const goal: StudyGoal = {
    id: DEFAULT_GOAL_ID,
    examId: 'cet4',
    examDate: '2026-06-13',
    targetScore: 550,
    dailyMinutes: 60,
    prioritySkills: ['reading', 'listening', 'vocabulary', 'speaking'],
    status: 'active',
    createdAt: now,
    updatedAt: now,
  };

  await db.studyGoals.put(goal);
  return goal;
}

export async function upsertActiveGoal(changes: Partial<StudyGoal>): Promise<StudyGoal> {
  const current = await getOrCreateActiveGoal();
  const next: StudyGoal = {
    ...current,
    ...changes,
    id: current.id,
    examId: changes.examId ?? current.examId,
    status: changes.status ?? current.status,
    updatedAt: new Date().toISOString(),
  };

  await db.studyGoals.put(next);
  return next;
}

function mergeSkillProfile(existing: SkillProfile, incoming: SkillProfile): SkillProfile {
  const existingEvidence = Math.max(0, existing.evidenceCount ?? 0);
  const incomingEvidence = Math.max(1, incoming.evidenceCount ?? 1);
  const totalEvidence = existingEvidence + incomingEvidence;

  return {
    ...incoming,
    score: Math.round(((existing.score * existingEvidence) + (incoming.score * incomingEvidence)) / totalEvidence),
    confidence: Math.round(((existing.confidence * existingEvidence) + (incoming.confidence * incomingEvidence)) / totalEvidence),
    evidenceCount: totalEvidence,
    lastUpdatedAt: incoming.lastUpdatedAt >= existing.lastUpdatedAt ? incoming.lastUpdatedAt : existing.lastUpdatedAt,
  };
}

async function mergeAndPutSkillProfiles(skillProfiles: SkillProfile[]): Promise<void> {
  for (const profile of skillProfiles) {
    const existing = await db.skillProfiles.get(profile.id);
    await db.skillProfiles.put(existing ? mergeSkillProfile(existing, profile) : profile);
  }
}

export async function persistPracticeCompletion(payload: {
  session: PracticeSession;
  attempts: Attempt[];
  reviewItems: ReviewItem[];
  skillProfiles: SkillProfile[];
}): Promise<void> {
  await db.transaction('rw', db.practiceSessions, db.attempts, db.reviewItems, db.skillProfiles, async () => {
    await db.practiceSessions.put(payload.session);
    await db.attempts.bulkPut(payload.attempts);
    if (payload.reviewItems.length > 0) {
      await db.reviewItems.bulkPut(payload.reviewItems);
    }
    if (payload.skillProfiles.length > 0) {
      await mergeAndPutSkillProfiles(payload.skillProfiles);
    }
  });
}

export async function loadReviewItems(): Promise<ReviewItem[]> {
  return db.reviewItems.orderBy('priorityScore').reverse().toArray();
}

export async function loadSkillProfiles(): Promise<SkillProfile[]> {
  return db.skillProfiles.orderBy('lastUpdatedAt').reverse().toArray();
}

export async function loadPracticeSessions(): Promise<PracticeSession[]> {
  return db.practiceSessions.orderBy('startedAt').reverse().toArray();
}

export async function loadAttempts(): Promise<Attempt[]> {
  return db.attempts.orderBy('createdAt').reverse().toArray();
}

export async function persistSkillProfiles(skillProfiles: SkillProfile[]): Promise<void> {
  if (skillProfiles.length === 0) return;
  await db.skillProfiles.bulkPut(skillProfiles);
}

function buildFallbackReviewEvidence(item: ReviewItem, now: string): ReviewCompletionEvidence {
  return {
    recallAnswer: item.memoryTask?.recallAnswer ?? item.detail,
    clozeAnswer: item.memoryTask?.clozeAnswer ?? item.title,
    productionAnswer: item.memoryTask?.productionPrompt ?? item.detail,
    completedStepCount: 3,
    startedAt: now,
  };
}

export async function completeReviewItem(
  itemId: string,
  evidence?: ReviewCompletionEvidence,
): Promise<ReviewItem | undefined> {
  let updatedItem: ReviewItem | undefined;

  await db.transaction('rw', db.practiceSessions, db.attempts, db.reviewItems, db.skillProfiles, async () => {
    const current = await db.reviewItems.get(itemId);
    if (!current) return;

    const now = new Date().toISOString();
    const records = buildReviewCompletionRecords({
      reviewItem: current,
      evidence: evidence ?? buildFallbackReviewEvidence(current, now),
      now,
    });

    updatedItem = records.reviewItem;
    await db.reviewItems.put(records.reviewItem);
    await db.practiceSessions.put(records.session);
    await db.attempts.put(records.attempt);

    if (records.skillProfile) {
      const existingProfile = await db.skillProfiles.get(records.skillProfile.id);
      await db.skillProfiles.put(existingProfile ? mergeSkillProfile(existingProfile, records.skillProfile) : records.skillProfile);
    }
  });

  return updatedItem;
}

function assertBackupArray(value: unknown, label: string): Record<string, unknown>[] {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array`);
  }
  if (value.some((item) => !item || typeof item !== 'object' || Array.isArray(item))) {
    throw new Error(`${label} must only contain objects`);
  }
  return value as Record<string, unknown>[];
}

export async function exportLearningData(): Promise<LearningDataBackup> {
  const [studyGoals, practiceSessions, attempts, reviewItems, skillProfiles] = await Promise.all([
    db.studyGoals.toArray(),
    db.practiceSessions.toArray(),
    db.attempts.toArray(),
    db.reviewItems.toArray(),
    db.skillProfiles.toArray(),
  ]);

  return {
    app: 'english-training-cabin',
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    data: {
      studyGoals,
      practiceSessions,
      attempts,
      reviewItems,
      skillProfiles,
    },
  };
}

export async function importLearningData(value: unknown): Promise<{
  studyGoals: number;
  practiceSessions: number;
  attempts: number;
  reviewItems: number;
  skillProfiles: number;
}> {
  const backup = value && typeof value === 'object' ? value as Partial<LearningDataBackup> : null;
  if (!backup || backup.app !== 'english-training-cabin' || backup.schemaVersion !== 1 || !backup.data) {
    throw new Error('备份文件格式不正确。');
  }

  const studyGoals = assertBackupArray(backup.data.studyGoals, 'studyGoals') as unknown as StudyGoal[];
  const practiceSessions = assertBackupArray(backup.data.practiceSessions, 'practiceSessions') as unknown as PracticeSession[];
  const attempts = assertBackupArray(backup.data.attempts, 'attempts') as unknown as Attempt[];
  const reviewItems = assertBackupArray(backup.data.reviewItems, 'reviewItems') as unknown as ReviewItem[];
  const skillProfiles = assertBackupArray(backup.data.skillProfiles, 'skillProfiles') as unknown as SkillProfile[];

  await db.transaction('rw', [db.studyGoals, db.practiceSessions, db.attempts, db.reviewItems, db.skillProfiles], async () => {
    await Promise.all([
      db.studyGoals.clear(),
      db.practiceSessions.clear(),
      db.attempts.clear(),
      db.reviewItems.clear(),
      db.skillProfiles.clear(),
    ]);

    await Promise.all([
      studyGoals.length > 0 ? db.studyGoals.bulkPut(studyGoals) : Promise.resolve(),
      practiceSessions.length > 0 ? db.practiceSessions.bulkPut(practiceSessions) : Promise.resolve(),
      attempts.length > 0 ? db.attempts.bulkPut(attempts) : Promise.resolve(),
      reviewItems.length > 0 ? db.reviewItems.bulkPut(reviewItems) : Promise.resolve(),
      skillProfiles.length > 0 ? db.skillProfiles.bulkPut(skillProfiles) : Promise.resolve(),
    ]);
  });

  return {
    studyGoals: studyGoals.length,
    practiceSessions: practiceSessions.length,
    attempts: attempts.length,
    reviewItems: reviewItems.length,
    skillProfiles: skillProfiles.length,
  };
}
