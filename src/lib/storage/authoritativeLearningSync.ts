import { Attempt, PracticeSession, ReviewItem, SkillProfile, StudyGoal } from '../../types';
import { apiRequest, getStoredAuthToken } from '../api';
import { exportLearningData, mergeLearningData, type LearningDataBackup } from './db';
import { getLearningBackupCounts, type LearningDataCounts } from './learningDataSummary';

export type LearningEntityType = 'studyGoal' | 'practiceSession' | 'attempt' | 'reviewItem' | 'skillProfile';

export interface LearningEntity {
  entityType: LearningEntityType;
  entityId: string;
  payload: Record<string, unknown>;
  updatedAt: string;
  deletedAt?: string;
}

export interface LearningEntityIds {
  studyGoalIds?: string[];
  practiceSessionIds?: string[];
  attemptIds?: string[];
  reviewItemIds?: string[];
  skillProfileIds?: string[];
}

type CloudLearningResponse = {
  snapshot: null | {
    updatedAt: string;
    exportedAt: string;
    backup: LearningDataBackup;
    counts: LearningDataCounts;
  };
};

export type CloudLearningEntity = {
  entityType: string;
  entityId: string;
  payload: Record<string, unknown>;
  updatedAt: string;
  deletedAt?: string;
};

type CloudLearningEntitiesResponse = {
  entities: CloudLearningEntity[];
};

const ENTITY_BATCH_SIZE = 150;
const pendingEntityKeys = new Map<string, number>();
let pendingGeneration = 0;
let synchronizationQueue: Promise<void> = Promise.resolve();

const COLLECTIONS: Array<{
  entityType: LearningEntityType;
  backupKey: keyof LearningDataBackup['data'];
}> = [
  { entityType: 'studyGoal', backupKey: 'studyGoals' },
  { entityType: 'practiceSession', backupKey: 'practiceSessions' },
  { entityType: 'attempt', backupKey: 'attempts' },
  { entityType: 'reviewItem', backupKey: 'reviewItems' },
  { entityType: 'skillProfile', backupKey: 'skillProfiles' },
];

function validIsoDate(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function entityUpdatedAt(entityType: LearningEntityType, payload: Record<string, unknown>, fallback: string): string {
  const candidates = entityType === 'studyGoal'
    ? [payload.updatedAt, payload.createdAt]
    : entityType === 'practiceSession'
      ? [payload.finishedAt, payload.startedAt]
      : entityType === 'attempt'
        ? [payload.createdAt]
        : entityType === 'reviewItem'
          ? [payload.lastReviewedAt, payload.createdAt]
          : [payload.lastUpdatedAt];

  for (const candidate of candidates) {
    const normalized = validIsoDate(candidate);
    if (normalized) return normalized;
  }
  return fallback;
}

function entityKey(entity: Pick<LearningEntity, 'entityType' | 'entityId'>): string {
  return `${entity.entityType}:${entity.entityId}`;
}

function enqueueSynchronization<T>(operation: () => Promise<T>): Promise<T> {
  const queued = synchronizationQueue.then(operation);
  synchronizationQueue = queued.then(() => undefined, () => undefined);
  return queued;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isAuthoritativeLearningEntity(entity: CloudLearningEntity): entity is LearningEntity {
  return COLLECTIONS.some((collection) => collection.entityType === entity.entityType)
    && Boolean(entity.entityId)
    && isRecord(entity.payload);
}

export function filterAuthoritativeLearningEntities(entities: CloudLearningEntity[]): LearningEntity[] {
  return entities.filter(isAuthoritativeLearningEntity);
}

export function learningBackupToEntities(
  backup: LearningDataBackup,
  fallbackUpdatedAt = backup.exportedAt,
): LearningEntity[] {
  const fallback = validIsoDate(fallbackUpdatedAt) ?? new Date().toISOString();

  return COLLECTIONS.flatMap(({ entityType, backupKey }) => {
    return backup.data[backupKey].flatMap((item) => {
      if (!isRecord(item) || typeof item.id !== 'string' || !item.id.trim()) return [];
      return [{
        entityType,
        entityId: item.id,
        payload: item,
        updatedAt: entityUpdatedAt(entityType, item, fallback),
      } satisfies LearningEntity];
    });
  });
}

export function mergeLearningEntities(...sources: LearningEntity[][]): LearningEntity[] {
  const merged = new Map<string, LearningEntity>();

  sources.flat().forEach((entity) => {
    if (!entity || !isRecord(entity.payload) || !entity.entityId) return;
    const key = entityKey(entity);
    const current = merged.get(key);
    if (!current || entity.updatedAt > current.updatedAt) {
      merged.set(key, entity);
    }
  });

  return [...merged.values()].sort((left, right) => {
    return left.updatedAt.localeCompare(right.updatedAt) || entityKey(left).localeCompare(entityKey(right));
  });
}

export function learningEntitiesToBackup(entities: LearningEntity[], exportedAt = new Date().toISOString()): LearningDataBackup {
  const active = mergeLearningEntities(entities).filter((entity) => !entity.deletedAt);
  const byType = (entityType: LearningEntityType) => active
    .filter((entity) => entity.entityType === entityType)
    .map((entity) => entity.payload);

  return {
    app: 'english-training-cabin',
    schemaVersion: 1,
    exportedAt,
    data: {
      studyGoals: byType('studyGoal') as unknown as StudyGoal[],
      practiceSessions: byType('practiceSession') as unknown as PracticeSession[],
      attempts: byType('attempt') as unknown as Attempt[],
      reviewItems: byType('reviewItem') as unknown as ReviewItem[],
      skillProfiles: byType('skillProfile') as unknown as SkillProfile[],
    },
  };
}

function requireToken(token = getStoredAuthToken()): string {
  if (!token) throw new Error('登录状态已失效，学习记录尚未保存到服务器。');
  return token;
}

async function uploadLearningEntities(entities: LearningEntity[], token: string): Promise<LearningEntity[]> {
  const confirmed: LearningEntity[] = [];
  for (let index = 0; index < entities.length; index += ENTITY_BATCH_SIZE) {
    const batch = entities.slice(index, index + ENTITY_BATCH_SIZE);
    const response = await apiRequest<CloudLearningEntitiesResponse>(
      '/api/cloud/learning-entities',
      {
        method: 'PUT',
        body: JSON.stringify({ entities: batch }),
      },
      token,
    );
    confirmed.push(...filterAuthoritativeLearningEntities(response.entities ?? []));
  }
  return confirmed;
}

async function saveConsistencySnapshot(token: string): Promise<LearningDataBackup> {
  const backup = await exportLearningData();
  await apiRequest<CloudLearningResponse>(
    '/api/cloud/learning-data',
    {
      method: 'PUT',
      body: JSON.stringify({ backup }),
    },
    token,
  );
  return backup;
}

function filterEntitiesByIds(entities: LearningEntity[], ids: LearningEntityIds): LearningEntity[] {
  const requested = new Set<string>();
  ids.studyGoalIds?.forEach((id) => requested.add(`studyGoal:${id}`));
  ids.practiceSessionIds?.forEach((id) => requested.add(`practiceSession:${id}`));
  ids.attemptIds?.forEach((id) => requested.add(`attempt:${id}`));
  ids.reviewItemIds?.forEach((id) => requested.add(`reviewItem:${id}`));
  ids.skillProfileIds?.forEach((id) => requested.add(`skillProfile:${id}`));
  return entities.filter((entity) => requested.has(entityKey(entity)));
}

function addPendingEntityIds(ids: LearningEntityIds): void {
  const add = (key: string) => pendingEntityKeys.set(key, ++pendingGeneration);
  ids.studyGoalIds?.forEach((id) => add(`studyGoal:${id}`));
  ids.practiceSessionIds?.forEach((id) => add(`practiceSession:${id}`));
  ids.attemptIds?.forEach((id) => add(`attempt:${id}`));
  ids.reviewItemIds?.forEach((id) => add(`reviewItem:${id}`));
  ids.skillProfileIds?.forEach((id) => add(`skillProfile:${id}`));
}

function clearConfirmedPendingKeys(attempted: Map<string, number>): void {
  attempted.forEach((generation, key) => {
    if (pendingEntityKeys.get(key) === generation) pendingEntityKeys.delete(key);
  });
}

export function syncLearningEntityIds(ids: LearningEntityIds, token?: string): Promise<number> {
  addPendingEntityIds(ids);

  return enqueueSynchronization(async () => {
    const authToken = requireToken(token);
    const attemptedKeys = new Map(pendingEntityKeys);
    const backup = await exportLearningData();
    const entities = learningBackupToEntities(backup).filter((entity) => attemptedKeys.has(entityKey(entity)));
    if (entities.length === 0) {
      clearConfirmedPendingKeys(attemptedKeys);
      return 0;
    }
    const confirmed = await uploadLearningEntities(entities, authToken);
    await mergeLearningData(learningEntitiesToBackup(confirmed));
    await saveConsistencySnapshot(authToken);
    clearConfirmedPendingKeys(attemptedKeys);
    return entities.length;
  });
}

export function syncAllLocalLearningData(token?: string): Promise<number> {
  return enqueueSynchronization(async () => {
    const authToken = requireToken(token);
    const attemptedKeys = new Map(pendingEntityKeys);
    const backup = await exportLearningData();
    const entities = learningBackupToEntities(backup);
    if (entities.length === 0) return 0;
    const confirmed = await uploadLearningEntities(entities, authToken);
    await mergeLearningData(learningEntitiesToBackup(confirmed));
    await saveConsistencySnapshot(authToken);
    clearConfirmedPendingKeys(attemptedKeys);
    return entities.length;
  });
}

export interface AuthoritativeLearningSyncResult {
  localBeforeCounts: LearningDataCounts;
  serverBeforeCounts: LearningDataCounts;
  mergedCounts: LearningDataCounts;
  uploadedEntities: number;
  downloadedEntities: number;
}

async function performAuthoritativeLearningDataSync(token?: string): Promise<AuthoritativeLearningSyncResult> {
  const authToken = requireToken(token);
  const localBackup = await exportLearningData();
  const [entityResponse, snapshotResponse] = await Promise.all([
    apiRequest<CloudLearningEntitiesResponse>('/api/cloud/learning-entities', {}, authToken),
    apiRequest<CloudLearningResponse>('/api/cloud/learning-data', {}, authToken),
  ]);

  const localEntities = learningBackupToEntities(localBackup);
  const snapshotEntities = snapshotResponse.snapshot
    ? learningBackupToEntities(snapshotResponse.snapshot.backup, snapshotResponse.snapshot.updatedAt)
    : [];
  const authoritativeServerEntities = filterAuthoritativeLearningEntities(entityResponse.entities ?? []);
  const serverEntities = mergeLearningEntities(snapshotEntities, authoritativeServerEntities);
  const persistedServerByKey = new Map(authoritativeServerEntities.map((entity) => [entityKey(entity), entity]));
  const serverByKey = new Map(serverEntities.map((entity) => [entityKey(entity), entity]));
  const snapshotMigrationCandidates = snapshotEntities.filter((entity) => {
    const persisted = persistedServerByKey.get(entityKey(entity));
    return !persisted || entity.updatedAt > persisted.updatedAt;
  });
  const localUploadCandidates = localEntities.filter((entity) => {
    const serverEntity = serverByKey.get(entityKey(entity));
    return !serverEntity || entity.updatedAt > serverEntity.updatedAt;
  });
  const uploadCandidates = mergeLearningEntities(snapshotMigrationCandidates, localUploadCandidates);

  const confirmedEntities = uploadCandidates.length > 0
    ? await uploadLearningEntities(uploadCandidates, authToken)
    : [];

  const mergedEntities = mergeLearningEntities(serverEntities, localEntities, confirmedEntities);
  const mergedBackup = learningEntitiesToBackup(mergedEntities);
  await mergeLearningData(mergedBackup);
  const confirmedBackup = await saveConsistencySnapshot(authToken);
  const localByKey = new Map(localEntities.map((entity) => [entityKey(entity), entity]));

  return {
    localBeforeCounts: getLearningBackupCounts(localBackup),
    serverBeforeCounts: getLearningBackupCounts(learningEntitiesToBackup(serverEntities)),
    mergedCounts: getLearningBackupCounts(confirmedBackup),
    uploadedEntities: uploadCandidates.length,
    downloadedEntities: mergedEntities.filter((entity) => {
      const localEntity = localByKey.get(entityKey(entity));
      return !localEntity || entity.updatedAt > localEntity.updatedAt;
    }).length,
  };
}

export function synchronizeAuthoritativeLearningData(token?: string): Promise<AuthoritativeLearningSyncResult> {
  return enqueueSynchronization(() => performAuthoritativeLearningDataSync(token));
}
