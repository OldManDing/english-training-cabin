import { apiRequest } from '../api';
import { exportLearningData, importLearningData } from './db';
import {
  getLearningBackupCounts,
  hasLearningEvidence,
  shouldAutoRestoreCloudSnapshot,
  type LearningDataCounts,
} from './learningDataSummary';

type CloudLearningDataResponse = {
  snapshot: null | {
    updatedAt: string;
    exportedAt: string;
    backup: unknown;
    counts: Record<string, number>;
  };
};

type ImportedLearningCounts = {
  studyGoals: number;
  practiceSessions: number;
  attempts: number;
  reviewItems: number;
  skillProfiles: number;
};

export type CloudLearningAutoRestoreResult =
  | {
      status: 'restored';
      cloudUpdatedAt: string;
      localCounts: LearningDataCounts;
      cloudCounts: LearningDataCounts;
      importedCounts: ImportedLearningCounts;
    }
  | {
      status: 'skipped-local-has-activity' | 'skipped-no-cloud-snapshot' | 'skipped-empty-cloud';
      localCounts: LearningDataCounts;
      cloudCounts?: LearningDataCounts;
    };

export async function restoreCloudLearningDataWhenLocalEmpty(token: string): Promise<CloudLearningAutoRestoreResult> {
  const localBackup = await exportLearningData();
  const localCounts = getLearningBackupCounts(localBackup);

  if (hasLearningEvidence(localCounts)) {
    return {
      status: 'skipped-local-has-activity',
      localCounts,
    };
  }

  const response = await apiRequest<CloudLearningDataResponse>('/api/cloud/learning-data', {}, token);
  if (!response.snapshot) {
    return {
      status: 'skipped-no-cloud-snapshot',
      localCounts,
    };
  }

  const cloudCounts = getLearningBackupCounts(response.snapshot.backup);
  if (!shouldAutoRestoreCloudSnapshot(localCounts, cloudCounts)) {
    return {
      status: 'skipped-empty-cloud',
      localCounts,
      cloudCounts,
    };
  }

  const importedCounts = await importLearningData(response.snapshot.backup);
  return {
    status: 'restored',
    cloudUpdatedAt: response.snapshot.updatedAt,
    localCounts,
    cloudCounts,
    importedCounts,
  };
}
