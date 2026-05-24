import Dexie, { Table } from 'dexie';
import { Attempt, PracticeSession, ReviewItem, SkillProfile, StudyGoal } from '../../types';

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
    examDate: '2026-06-15',
    targetScore: 550,
    dailyMinutes: 60,
    prioritySkills: ['reading', 'listening', 'speaking'],
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
      await db.skillProfiles.bulkPut(payload.skillProfiles);
    }
  });
}

export async function loadReviewItems(): Promise<ReviewItem[]> {
  return db.reviewItems.orderBy('priorityScore').reverse().toArray();
}

export async function loadSkillProfiles(): Promise<SkillProfile[]> {
  return db.skillProfiles.orderBy('lastUpdatedAt').reverse().toArray();
}
