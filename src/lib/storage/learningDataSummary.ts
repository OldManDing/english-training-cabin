export interface LearningDataCounts {
  studyGoals: number;
  practiceSessions: number;
  attempts: number;
  reviewItems: number;
  skillProfiles: number;
}

const EMPTY_COUNTS: LearningDataCounts = {
  studyGoals: 0,
  practiceSessions: 0,
  attempts: 0,
  reviewItems: 0,
  skillProfiles: 0,
};

const ACTIVITY_KEYS: Array<keyof Pick<LearningDataCounts, 'practiceSessions' | 'attempts' | 'reviewItems' | 'skillProfiles'>> = [
  'practiceSessions',
  'attempts',
  'reviewItems',
  'skillProfiles',
];

function getDataRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const data = (value as { data?: unknown }).data;
  if (!data || typeof data !== 'object' || Array.isArray(data)) return undefined;
  return data as Record<string, unknown>;
}

function arrayLength(data: Record<string, unknown> | undefined, key: keyof LearningDataCounts): number {
  const value = data?.[key];
  return Array.isArray(value) ? value.length : 0;
}

export function getLearningBackupCounts(value: unknown): LearningDataCounts {
  const data = getDataRecord(value);
  if (!data) return { ...EMPTY_COUNTS };

  return {
    studyGoals: arrayLength(data, 'studyGoals'),
    practiceSessions: arrayLength(data, 'practiceSessions'),
    attempts: arrayLength(data, 'attempts'),
    reviewItems: arrayLength(data, 'reviewItems'),
    skillProfiles: arrayLength(data, 'skillProfiles'),
  };
}

export function countLearningActivity(counts: LearningDataCounts): number {
  return ACTIVITY_KEYS.reduce((total, key) => total + Math.max(0, counts[key]), 0);
}

export function hasLearningActivity(counts: LearningDataCounts): boolean {
  return countLearningActivity(counts) > 0;
}

export function shouldBlockEmptyCloudRestore(localCounts: LearningDataCounts, cloudCounts: LearningDataCounts): boolean {
  return hasLearningActivity(localCounts) && !hasLearningActivity(cloudCounts);
}
