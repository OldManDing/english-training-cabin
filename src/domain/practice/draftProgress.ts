import { ChoiceOption } from '../../types';
import { apiRequest, getStoredAuthToken } from '../../lib/api';
import type { SubjectivePracticeAnalysis } from './reports';

const DRAFT_KEY_PREFIX = 'english-training-cabin:practice-draft';
const REAL_PAPER_DRAFT_KEY_PREFIX = 'english-training-cabin:local-real-paper-draft:v1:';
const DRAFT_WORKSPACE_USER_KEY = 'english-training-cabin:practice-draft-user';
const DRAFT_KEY_PREFIXES = [DRAFT_KEY_PREFIX, REAL_PAPER_DRAFT_KEY_PREFIX];
const DRAFT_SYNC_DEBOUNCE_MS = 600;

export const PRACTICE_DRAFT_SYNC_EVENT = 'english-training-cabin:practice-draft-sync-state';
export type PracticeDraftSyncState = 'syncing' | 'synced' | 'pending';

export type ChoiceConfidence = 'sure' | 'not_sure' | 'guess';
export type ListeningConfidence = 'Low' | 'Medium' | 'High';
export type SubjectiveDraftMode = 'writing' | 'translation';

export interface ChoicePracticeDraftAnswer {
  selected: ChoiceOption;
  correct: boolean;
  confidence: ChoiceConfidence;
  questionId?: string;
  moduleId?: string;
  questionTypeId?: string;
}

export type ChoicePracticeDraftStoredAnswer = ChoicePracticeDraftAnswer | null;

export interface ReadingPracticeDraft {
  version: 1;
  passageId: string;
  startedAt: string;
  currentIdx: number;
  selectedOpt: ChoiceOption | null;
  confidence: ChoiceConfidence | null;
  isSubmitted: boolean;
  answers: ChoicePracticeDraftStoredAnswer[];
  updatedAt: string;
}

export interface VocabularyPracticeDraft {
  version: 1;
  sessionId?: string;
  startedAt: string;
  packIndex: number;
  currentIdx: number;
  selectedOpt: ChoiceOption | null;
  confidence: ChoiceConfidence | null;
  isSubmitted: boolean;
  answers: ChoicePracticeDraftAnswer[];
  updatedAt: string;
}

export interface ListeningQuestionDraft {
  selectedAnswer?: ChoiceOption;
  confidence?: ListeningConfidence;
  isSubmitted?: boolean;
}

export interface ListeningPracticeDraft {
  version: 1;
  startedAt: string;
  currentQuestionIndex: number;
  answersByQuestionId: Record<string, ListeningQuestionDraft>;
  updatedAt: string;
}

export interface SubjectivePracticeDraft {
  version: 1;
  mode: SubjectiveDraftMode;
  startedAt: string;
  taskIndex: number;
  answer: string;
  analysis?: SubjectivePracticeAnalysis;
  updatedAt: string;
}

export interface MockExamPracticeDraft {
  version: 1;
  startedAt: string;
  paperId: string;
  activeSection: 'writing' | 'listening' | 'reading' | 'translation' | 'review';
  choices: Record<string, ChoiceOption | undefined>;
  writingAnswer: string;
  translationAnswer: string;
  updatedAt: string;
}

export const practiceDraftKeys = {
  reading: (passageId: string) => `${DRAFT_KEY_PREFIX}:reading:${passageId}`,
  vocabulary: `${DRAFT_KEY_PREFIX}:vocabulary`,
  listening: `${DRAFT_KEY_PREFIX}:listening-long-conversation`,
  subjective: (mode: SubjectiveDraftMode) => `${DRAFT_KEY_PREFIX}:subjective:${mode}`,
  mockExam: `${DRAFT_KEY_PREFIX}:mock-exam`,
  realPaper: (paperId: string) => `${REAL_PAPER_DRAFT_KEY_PREFIX}${paperId}`,
};

interface CloudPracticeDraftEntity {
  entityType: 'practiceDraft';
  entityId: string;
  payload: {
    id: string;
    draft: Record<string, unknown> | null;
  };
  updatedAt: string;
  deletedAt?: string;
}

interface PendingDraftSync {
  entity: CloudPracticeDraftEntity;
  token: string;
  timer: ReturnType<typeof setTimeout>;
}

const pendingDraftSyncs = new Map<string, PendingDraftSync>();
const failedDraftSyncKeys = new Set<string>();
let activeDraftSynchronizations = 0;
let draftSynchronizationFailed = false;
let pageHideFlushInstalled = false;

const canUseLocalStorage = () => {
  try {
    return typeof window !== 'undefined' && Boolean(window.localStorage);
  } catch {
    return false;
  }
};

function dispatchDraftSyncState(state: PracticeDraftSyncState) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(PRACTICE_DRAFT_SYNC_EVENT, { detail: { state } }));
}

function dispatchCurrentDraftSyncState() {
  if (activeDraftSynchronizations > 0 || pendingDraftSyncs.size > 0) {
    dispatchDraftSyncState('syncing');
    return;
  }
  dispatchDraftSyncState(draftSynchronizationFailed || failedDraftSyncKeys.size > 0 ? 'pending' : 'synced');
}

function isDraftKey(key: string): boolean {
  return DRAFT_KEY_PREFIXES.some((prefix) => key.startsWith(prefix));
}

function localStorageKeys(): string[] {
  if (!canUseLocalStorage()) return [];
  return Array.from({ length: window.localStorage.length }, (_, index) => window.localStorage.key(index))
    .filter((key): key is string => Boolean(key));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isDraftTombstone(value: Record<string, unknown>): boolean {
  return value.__practiceDraftDeleted === true;
}

function draftUpdatedAt(value: Record<string, unknown>): string {
  const candidate = typeof value.updatedAt === 'string' ? new Date(value.updatedAt) : null;
  return candidate && !Number.isNaN(candidate.getTime()) ? candidate.toISOString() : new Date().toISOString();
}

function loadLocalDraftRecord(key: string): Record<string, unknown> | null {
  if (!canUseLocalStorage()) return null;
  try {
    const value = JSON.parse(window.localStorage.getItem(key) ?? 'null');
    return isRecord(value) ? value : null;
  } catch {
    return null;
  }
}

function listLocalDrafts(): Map<string, Record<string, unknown>> {
  const drafts = new Map<string, Record<string, unknown>>();
  if (!canUseLocalStorage()) return drafts;

  localStorageKeys().filter(isDraftKey).forEach((key) => {
    const value = loadLocalDraftRecord(key);
    if (value) drafts.set(key, value);
  });
  return drafts;
}

function toCloudEntity(key: string, draft: Record<string, unknown> | null, deletedAt?: string): CloudPracticeDraftEntity {
  const updatedAt = draft ? draftUpdatedAt(draft) : deletedAt ?? new Date().toISOString();
  return {
    entityType: 'practiceDraft',
    entityId: key,
    payload: { id: key, draft },
    updatedAt,
    deletedAt,
  };
}

async function persistCloudDraft(entity: CloudPracticeDraftEntity, token: string) {
  await apiRequest<{ entities: CloudPracticeDraftEntity[] }>(
    '/api/cloud/learning-entities',
    {
      method: 'PUT',
      body: JSON.stringify({ entities: [entity] }),
      keepalive: true,
    },
    token,
  );
}

function installPageHideFlush() {
  if (pageHideFlushInstalled || typeof window === 'undefined') return;
  pageHideFlushInstalled = true;
  window.addEventListener('pagehide', () => {
    const queued = [...pendingDraftSyncs.values()];
    pendingDraftSyncs.clear();
    queued.forEach((pending) => {
      clearTimeout(pending.timer);
      void persistCloudDraft(pending.entity, pending.token).catch(() => undefined);
    });
  });
}

function scheduleCloudDraftSync(entity: CloudPracticeDraftEntity) {
  const token = getStoredAuthToken();
  if (!token) {
    failedDraftSyncKeys.add(entity.entityId);
    dispatchCurrentDraftSyncState();
    return;
  }

  const current = pendingDraftSyncs.get(entity.entityId);
  if (current) clearTimeout(current.timer);
  failedDraftSyncKeys.delete(entity.entityId);
  installPageHideFlush();

  let pending: PendingDraftSync;
  const timer = setTimeout(() => {
    void persistCloudDraft(entity, token)
      .then(() => {
        if (pendingDraftSyncs.get(entity.entityId) !== pending) return;
        pendingDraftSyncs.delete(entity.entityId);
        failedDraftSyncKeys.delete(entity.entityId);
        if (entity.deletedAt && canUseLocalStorage()) {
          const local = loadLocalDraftRecord(entity.entityId);
          if (local && isDraftTombstone(local) && draftUpdatedAt(local) === entity.updatedAt) {
            window.localStorage.removeItem(entity.entityId);
          }
        }
        dispatchCurrentDraftSyncState();
      })
      .catch(() => {
        if (pendingDraftSyncs.get(entity.entityId) !== pending) return;
        pendingDraftSyncs.delete(entity.entityId);
        failedDraftSyncKeys.add(entity.entityId);
        dispatchCurrentDraftSyncState();
      });
  }, DRAFT_SYNC_DEBOUNCE_MS);
  pending = { entity, token, timer };
  pendingDraftSyncs.set(entity.entityId, pending);
  dispatchCurrentDraftSyncState();
}

export const clampDraftIndex = (index: number, length: number) => {
  if (length <= 0) return 0;
  if (!Number.isFinite(index)) return 0;
  return Math.min(Math.max(0, Math.floor(index)), length - 1);
};

export function loadPracticeDraft<T>(key: string): T | null {
  if (!canUseLocalStorage()) return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const value = JSON.parse(raw);
    return isRecord(value) && isDraftTombstone(value) ? null : value as T;
  } catch {
    return null;
  }
}

export function savePracticeDraft<T extends { updatedAt?: string }>(key: string, draft: T) {
  const nextDraft = {
    ...draft,
    updatedAt: new Date().toISOString(),
  };
  if (canUseLocalStorage()) {
    try {
      window.localStorage.setItem(key, JSON.stringify(nextDraft));
    } catch {
      // Continue to the server write even when the browser cache is unavailable.
    }
  }
  scheduleCloudDraftSync(toCloudEntity(key, nextDraft));
}

export function clearPracticeDraft(key: string) {
  const deletedAt = new Date().toISOString();
  if (canUseLocalStorage()) {
    try {
      window.localStorage.setItem(key, JSON.stringify({
        __practiceDraftDeleted: true,
        updatedAt: deletedAt,
      }));
    } catch {
      // Continue to the server deletion even when the browser cache is unavailable.
    }
  }
  scheduleCloudDraftSync(toCloudEntity(key, null, deletedAt));
}

export async function clearPracticeDraftAfterCompletion(
  key: string,
  complete: () => Promise<boolean | void> | boolean | void,
): Promise<boolean> {
  const completed = await complete();
  if (completed === false) return false;
  clearPracticeDraft(key);
  return true;
}

export function clearAllPracticeDrafts(options: { sync?: boolean } = {}) {
  if (!canUseLocalStorage()) return;
  try {
    localStorageKeys()
      .filter(isDraftKey)
      .forEach((key) => {
        if (options.sync === false) window.localStorage.removeItem(key);
        else clearPracticeDraft(key);
      });
  } catch {
    // Ignore storage cleanup failures.
  }
}

export function preparePracticeDraftWorkspaceForAccount(userId: string): 'claimed' | 'unchanged' | 'switched' {
  if (!canUseLocalStorage()) return 'unchanged';
  const normalizedUserId = userId.trim();
  if (!normalizedUserId) return 'unchanged';
  const currentUserId = window.localStorage.getItem(DRAFT_WORKSPACE_USER_KEY);
  if (!currentUserId) {
    window.localStorage.setItem(DRAFT_WORKSPACE_USER_KEY, normalizedUserId);
    return 'claimed';
  }
  if (currentUserId === normalizedUserId) return 'unchanged';

  pendingDraftSyncs.forEach((pending) => clearTimeout(pending.timer));
  pendingDraftSyncs.clear();
  failedDraftSyncKeys.clear();
  draftSynchronizationFailed = false;
  clearAllPracticeDrafts({ sync: false });
  window.localStorage.setItem(DRAFT_WORKSPACE_USER_KEY, normalizedUserId);
  return 'switched';
}

export async function synchronizePracticeDrafts(token = getStoredAuthToken()): Promise<number> {
  if (!token || !canUseLocalStorage()) return 0;
  activeDraftSynchronizations += 1;
  dispatchCurrentDraftSyncState();

  try {
    const response = await apiRequest<{ entities: CloudPracticeDraftEntity[] }>(
      '/api/cloud/learning-entities',
      {},
      token,
    );
    const serverDrafts = (response.entities ?? []).filter((entity) => entity.entityType === 'practiceDraft');
    const serverByKey = new Map(serverDrafts.map((entity) => [entity.entityId, entity]));
    const localDrafts = listLocalDrafts();
    const uploads: CloudPracticeDraftEntity[] = [];
    let restored = 0;

    new Set([...serverByKey.keys(), ...localDrafts.keys()]).forEach((key) => {
      const server = serverByKey.get(key);
      const local = localDrafts.get(key);
      const localDeleted = local ? isDraftTombstone(local) : false;
      const localUpdatedAt = local ? draftUpdatedAt(local) : '';
      const serverUpdatedAt = server?.updatedAt ?? '';

      if (server?.deletedAt && serverUpdatedAt >= localUpdatedAt) {
        window.localStorage.removeItem(key);
        return;
      }
      if (local && (!server || localUpdatedAt > serverUpdatedAt)) {
        uploads.push(localDeleted ? toCloudEntity(key, null, localUpdatedAt) : toCloudEntity(key, local));
        return;
      }
      const serverValue = server?.payload?.draft;
      if (server && !server.deletedAt && isRecord(serverValue) && (!local || serverUpdatedAt >= localUpdatedAt)) {
        window.localStorage.setItem(key, JSON.stringify({ ...serverValue, updatedAt: server.updatedAt }));
        restored += 1;
      }
    });

    for (let index = 0; index < uploads.length; index += 200) {
      await apiRequest<{ entities: CloudPracticeDraftEntity[] }>(
        '/api/cloud/learning-entities',
        {
          method: 'PUT',
          body: JSON.stringify({ entities: uploads.slice(index, index + 200) }),
        },
        token,
      );
    }
    uploads.filter((entity) => entity.deletedAt).forEach((entity) => {
      const local = loadLocalDraftRecord(entity.entityId);
      if (local && isDraftTombstone(local) && draftUpdatedAt(local) === entity.updatedAt) {
        window.localStorage.removeItem(entity.entityId);
      }
    });
    draftSynchronizationFailed = false;
    failedDraftSyncKeys.clear();
    return restored;
  } catch (error) {
    draftSynchronizationFailed = true;
    throw error;
  } finally {
    activeDraftSynchronizations = Math.max(0, activeDraftSynchronizations - 1);
    dispatchCurrentDraftSyncState();
  }
}
