import Dexie, { Table } from 'dexie';
import { repairLegacyVocabularyStatusAttempts } from '../../domain/practice/practicedQuestions';
import { buildReviewCompletionRecords, type ReviewCompletionRecords } from '../../domain/review/reviewCompletion';
import { sortReviewItems } from '../../domain/review/reviewQueue';
import { Attempt, PracticeSession, ReviewCompletionEvidence, ReviewItem, SkillProfile, StudyGoal } from '../../types';
import { getSuggestedExamDate } from '../../domain/planner/defaultExamDate';
import { isSettingsBaselineSkillProfile } from '../../domain/progress/skillProfileEvidence';

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

export interface LearningWorkspaceMeta {
  id: 'current';
  userId: string;
  boundAt: string;
  updatedAt: string;
}

export interface LearningWorkspaceArchive {
  id: string;
  userId: string;
  createdAt: string;
  backup: LearningDataBackup;
}

export interface LearningWorkspacePreparation {
  status: 'claimed' | 'unchanged' | 'switched';
  previousUserId?: string;
  archivedRecords: number;
}

class EnglishTrainingDb extends Dexie {
  studyGoals!: Table<StudyGoal, string>;
  practiceSessions!: Table<PracticeSession, string>;
  attempts!: Table<Attempt, string>;
  reviewItems!: Table<ReviewItem, string>;
  skillProfiles!: Table<SkillProfile, string>;
  learningWorkspaceMeta!: Table<LearningWorkspaceMeta, string>;
  learningWorkspaceArchives!: Table<LearningWorkspaceArchive, string>;

  constructor() {
    super('english-training-cabin');
    this.version(1).stores({
      studyGoals: 'id, examId, status, updatedAt',
      practiceSessions: 'id, examId, moduleId, status, startedAt, finishedAt',
      attempts: 'id, sessionId, questionId, examId, moduleId, questionTypeId, createdAt',
      reviewItems: 'id, targetType, targetId, examId, moduleId, skillArea, nextReviewAt, priorityScore',
      skillProfiles: 'id, skillArea, subSkillId, lastUpdatedAt',
    });
    this.version(2).stores({
      studyGoals: 'id, examId, status, updatedAt',
      practiceSessions: 'id, examId, moduleId, status, startedAt, finishedAt',
      attempts: 'id, sessionId, questionId, examId, moduleId, questionTypeId, createdAt',
      reviewItems: 'id, targetType, targetId, examId, moduleId, skillArea, nextReviewAt, priorityScore',
      skillProfiles: 'id, skillArea, subSkillId, lastUpdatedAt',
      learningWorkspaceMeta: 'id, userId, updatedAt',
      learningWorkspaceArchives: 'id, userId, createdAt',
    });
  }
}

export const db = new EnglishTrainingDb();

export const DEFAULT_GOAL_ID = 'goal-cet4-primary';

const LEARNING_TABLES = [
  db.studyGoals,
  db.practiceSessions,
  db.attempts,
  db.reviewItems,
  db.skillProfiles,
] as const;

async function exportLearningDataFromOpenTransaction(exportedAt: string): Promise<LearningDataBackup> {
  const [studyGoals, practiceSessions, attempts, reviewItems, storedSkillProfiles] = await Promise.all([
    db.studyGoals.toArray(),
    db.practiceSessions.toArray(),
    db.attempts.toArray(),
    db.reviewItems.toArray(),
    db.skillProfiles.toArray(),
  ]);
  const skillProfiles = storedSkillProfiles.filter((profile) => !isSettingsBaselineSkillProfile(profile));

  return {
    app: 'english-training-cabin',
    schemaVersion: 1,
    exportedAt,
    data: { studyGoals, practiceSessions, attempts, reviewItems, skillProfiles },
  };
}

function countBackupRecords(backup: LearningDataBackup): number {
  return Object.values(backup.data).reduce((sum, records) => sum + records.length, 0);
}

export async function prepareLearningWorkspaceForAccount(userId: string): Promise<LearningWorkspacePreparation> {
  const normalizedUserId = userId.trim();
  if (!normalizedUserId) throw new Error('无法绑定空的学习账号。');

  return db.transaction(
    'rw',
    [...LEARNING_TABLES, db.learningWorkspaceMeta, db.learningWorkspaceArchives],
    async () => {
      const now = new Date().toISOString();
      const current = await db.learningWorkspaceMeta.get('current');

      if (!current) {
        await db.learningWorkspaceMeta.put({
          id: 'current',
          userId: normalizedUserId,
          boundAt: now,
          updatedAt: now,
        });
        return { status: 'claimed', archivedRecords: 0 };
      }

      if (current.userId === normalizedUserId) {
        await db.learningWorkspaceMeta.update('current', { updatedAt: now });
        return { status: 'unchanged', archivedRecords: 0 };
      }

      const backup = await exportLearningDataFromOpenTransaction(now);
      const archivedRecords = countBackupRecords(backup);
      if (archivedRecords > 0) {
        await db.learningWorkspaceArchives.put({
          id: `${current.userId}:${now}`,
          userId: current.userId,
          createdAt: now,
          backup,
        });
      }

      await Promise.all(LEARNING_TABLES.map((table) => table.clear()));
      await db.learningWorkspaceMeta.put({
        id: 'current',
        userId: normalizedUserId,
        boundAt: now,
        updatedAt: now,
      });

      return {
        status: 'switched',
        previousUserId: current.userId,
        archivedRecords,
      };
    },
  );
}

export async function getLearningWorkspaceMeta(): Promise<LearningWorkspaceMeta | undefined> {
  return db.learningWorkspaceMeta.get('current');
}

export async function getOrCreateActiveGoal(): Promise<StudyGoal> {
  const activeGoals = await db.studyGoals.where('status').equals('active').toArray();
  const existing = activeGoals.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];
  if (existing) return existing;

  const now = new Date().toISOString();
  const goal: StudyGoal = {
    id: DEFAULT_GOAL_ID,
    examId: 'cet4',
    examDate: getSuggestedExamDate(),
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
  return sortReviewItems(await db.reviewItems.toArray());
}

export async function loadSkillProfiles(): Promise<SkillProfile[]> {
  const profiles = await db.skillProfiles.orderBy('lastUpdatedAt').reverse().toArray();
  return profiles.filter((profile) => !isSettingsBaselineSkillProfile(profile));
}

export async function loadPracticeSessions(): Promise<PracticeSession[]> {
  return db.practiceSessions.orderBy('startedAt').reverse().toArray();
}

export async function loadAttempts(): Promise<Attempt[]> {
  const attempts = await db.attempts.orderBy('createdAt').reverse().toArray();
  const repair = repairLegacyVocabularyStatusAttempts(attempts);
  if (!repair.changed) return attempts;

  await db.transaction('rw', db.attempts, async () => {
    if (repair.deleteAttemptIds.length > 0) {
      await db.attempts.bulkDelete(repair.deleteAttemptIds);
    }
    if (repair.putAttempts.length > 0) {
      await db.attempts.bulkPut(repair.putAttempts);
    }
  });

  return repair.attempts.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export async function persistSkillProfiles(skillProfiles: SkillProfile[]): Promise<void> {
  const evidenceProfiles = skillProfiles.filter((profile) => !isSettingsBaselineSkillProfile(profile));
  if (evidenceProfiles.length === 0) return;
  await db.skillProfiles.bulkPut(evidenceProfiles);
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
): Promise<ReviewCompletionRecords | undefined> {
  let completionRecords: ReviewCompletionRecords | undefined;

  await db.transaction('rw', db.practiceSessions, db.attempts, db.reviewItems, db.skillProfiles, async () => {
    const current = await db.reviewItems.get(itemId);
    if (!current) return;

    const now = new Date().toISOString();
    const records = buildReviewCompletionRecords({
      reviewItem: current,
      evidence: evidence ?? buildFallbackReviewEvidence(current, now),
      now,
    });

    completionRecords = records;
    await db.reviewItems.put(records.reviewItem);
    await db.practiceSessions.put(records.session);
    await db.attempts.put(records.attempt);

    if (records.skillProfile) {
      const existingProfile = await db.skillProfiles.get(records.skillProfile.id);
      await db.skillProfiles.put(existingProfile ? mergeSkillProfile(existingProfile, records.skillProfile) : records.skillProfile);
    }
  });

  return completionRecords;
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
  const [studyGoals, practiceSessions, attempts, reviewItems, storedSkillProfiles] = await Promise.all([
    db.studyGoals.toArray(),
    db.practiceSessions.toArray(),
    db.attempts.toArray(),
    db.reviewItems.toArray(),
    db.skillProfiles.toArray(),
  ]);
  const skillProfiles = storedSkillProfiles.filter((profile) => !isSettingsBaselineSkillProfile(profile));

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
  return mergeLearningData(value);
}

export async function mergeLearningData(value: unknown): Promise<{
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
  const skillProfiles = (assertBackupArray(backup.data.skillProfiles, 'skillProfiles') as unknown as SkillProfile[])
    .filter((profile) => !isSettingsBaselineSkillProfile(profile));

  await db.transaction('rw', [db.studyGoals, db.practiceSessions, db.attempts, db.reviewItems, db.skillProfiles], async () => {
    const [currentGoals, currentSessions, currentReviewItems, currentSkillProfiles] = await Promise.all([
      db.studyGoals.bulkGet(studyGoals.map((item) => item.id)),
      db.practiceSessions.bulkGet(practiceSessions.map((item) => item.id)),
      db.reviewItems.bulkGet(reviewItems.map((item) => item.id)),
      db.skillProfiles.bulkGet(skillProfiles.map((item) => item.id)),
    ]);
    const newerOrMissing = <T>(incoming: T[], current: Array<T | undefined>, updatedAt: (item: T) => string) => {
      return incoming.filter((item, index) => !current[index] || updatedAt(item) >= updatedAt(current[index]));
    };
    const goalsToPut = newerOrMissing(studyGoals, currentGoals, (item) => item.updatedAt);
    const sessionsToPut = newerOrMissing(
      practiceSessions,
      currentSessions,
      (item) => item.finishedAt ?? item.startedAt,
    );
    const reviewItemsToPut = newerOrMissing(
      reviewItems,
      currentReviewItems,
      (item) => item.lastReviewedAt ?? item.createdAt,
    );
    const skillProfilesToPut = newerOrMissing(
      skillProfiles,
      currentSkillProfiles,
      (item) => item.lastUpdatedAt,
    );

    await Promise.all([
      goalsToPut.length > 0 ? db.studyGoals.bulkPut(goalsToPut) : Promise.resolve(),
      sessionsToPut.length > 0 ? db.practiceSessions.bulkPut(sessionsToPut) : Promise.resolve(),
      attempts.length > 0 ? db.attempts.bulkPut(attempts) : Promise.resolve(),
      reviewItemsToPut.length > 0 ? db.reviewItems.bulkPut(reviewItemsToPut) : Promise.resolve(),
      skillProfilesToPut.length > 0 ? db.skillProfiles.bulkPut(skillProfilesToPut) : Promise.resolve(),
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
