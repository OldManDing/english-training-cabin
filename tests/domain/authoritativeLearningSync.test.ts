import { describe, expect, it } from 'vitest';
import {
  learningBackupToEntities,
  learningEntitiesToBackup,
  mergeLearningEntities,
  type LearningEntity,
} from '../../src/lib/storage/authoritativeLearningSync';
import type { LearningDataBackup } from '../../src/lib/storage/db';

const backup: LearningDataBackup = {
  app: 'english-training-cabin',
  schemaVersion: 1,
  exportedAt: '2026-07-27T10:00:00.000Z',
  data: {
    studyGoals: [{
      id: 'goal-1',
      examId: 'cet4',
      examDate: '2026-12-12',
      targetScore: 550,
      dailyMinutes: 60,
      prioritySkills: ['reading'],
      status: 'active',
      createdAt: '2026-07-27T09:00:00.000Z',
      updatedAt: '2026-07-27T09:30:00.000Z',
    }],
    practiceSessions: [],
    attempts: [],
    reviewItems: [],
    skillProfiles: [],
  },
};

describe('authoritative learning sync', () => {
  it('converts legacy snapshots into independently syncable entities', () => {
    const entities = learningBackupToEntities(backup);

    expect(entities).toHaveLength(1);
    expect(entities[0]).toMatchObject({
      entityType: 'studyGoal',
      entityId: 'goal-1',
      updatedAt: '2026-07-27T09:30:00.000Z',
    });
    expect(learningEntitiesToBackup(entities, '2026-07-27T11:00:00.000Z').data.studyGoals).toHaveLength(1);
  });

  it('keeps the newest entity and ignores stale device state', () => {
    const older: LearningEntity = {
      entityType: 'studyGoal',
      entityId: 'goal-1',
      updatedAt: '2026-07-27T09:00:00.000Z',
      payload: { id: 'goal-1', targetScore: 500 },
    };
    const newer: LearningEntity = {
      ...older,
      updatedAt: '2026-07-27T10:00:00.000Z',
      payload: { id: 'goal-1', targetScore: 580 },
    };

    expect(mergeLearningEntities([newer], [older])).toEqual([newer]);
    expect(mergeLearningEntities([older], [newer])).toEqual([newer]);
  });
});
