import { describe, expect, it } from 'vitest';
import {
  countLearningActivity,
  countLearningEvidence,
  getLearningBackupCounts,
  shouldAutoRestoreCloudSnapshot,
  shouldBlockEmptyCloudRestore,
} from '../../src/lib/storage/learningDataSummary';

describe('learning data summary', () => {
  it('counts learning backup records and separates goals from activity evidence', () => {
    const counts = getLearningBackupCounts({
      app: 'english-training-cabin',
      schemaVersion: 1,
      data: {
        studyGoals: [{ id: 'goal' }],
        practiceSessions: [{ id: 'session' }],
        attempts: [{ id: 'attempt-1' }, { id: 'attempt-2' }],
        reviewItems: [],
        skillProfiles: [{ id: 'profile' }],
      },
    });

    expect(counts).toEqual({
      studyGoals: 1,
      practiceSessions: 1,
      attempts: 2,
      reviewItems: 0,
      skillProfiles: 1,
    });
    expect(countLearningActivity(counts)).toBe(4);
    expect(countLearningEvidence(counts)).toBe(3);
  });

  it('blocks restoring an empty cloud snapshot over existing local answer evidence', () => {
    const localCounts = {
      studyGoals: 1,
      practiceSessions: 2,
      attempts: 12,
      reviewItems: 3,
      skillProfiles: 4,
    };
    const emptyCloudCounts = {
      studyGoals: 1,
      practiceSessions: 0,
      attempts: 0,
      reviewItems: 0,
      skillProfiles: 0,
    };
    const activeCloudCounts = {
      ...emptyCloudCounts,
      attempts: 1,
    };
    const localWithProfileOnly = {
      ...emptyCloudCounts,
      skillProfiles: 5,
    };

    expect(shouldBlockEmptyCloudRestore(localCounts, emptyCloudCounts)).toBe(true);
    expect(shouldBlockEmptyCloudRestore(localCounts, activeCloudCounts)).toBe(false);
    expect(shouldBlockEmptyCloudRestore(emptyCloudCounts, emptyCloudCounts)).toBe(false);
    expect(shouldBlockEmptyCloudRestore(localWithProfileOnly, emptyCloudCounts)).toBe(false);
  });

  it('auto-restores only on devices without local answer evidence', () => {
    const localWithDefaultGoalOnly = {
      studyGoals: 1,
      practiceSessions: 0,
      attempts: 0,
      reviewItems: 0,
      skillProfiles: 0,
    };
    const localWithProfileOnly = {
      ...localWithDefaultGoalOnly,
      skillProfiles: 5,
    };
    const localWithAttempts = {
      ...localWithDefaultGoalOnly,
      attempts: 2,
    };
    const cloudWithActivity = {
      studyGoals: 1,
      practiceSessions: 2,
      attempts: 12,
      reviewItems: 3,
      skillProfiles: 4,
    };
    const emptyCloud = {
      ...localWithDefaultGoalOnly,
    };

    expect(shouldAutoRestoreCloudSnapshot(localWithDefaultGoalOnly, cloudWithActivity)).toBe(true);
    expect(shouldAutoRestoreCloudSnapshot(localWithProfileOnly, cloudWithActivity)).toBe(true);
    expect(shouldAutoRestoreCloudSnapshot(localWithAttempts, cloudWithActivity)).toBe(false);
    expect(shouldAutoRestoreCloudSnapshot(localWithDefaultGoalOnly, emptyCloud)).toBe(false);
  });
});
