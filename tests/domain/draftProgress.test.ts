import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { apiRequestMock, getStoredAuthTokenMock } = vi.hoisted(() => ({
  apiRequestMock: vi.fn(),
  getStoredAuthTokenMock: vi.fn(() => 'draft-token'),
}));

vi.mock('../../src/lib/api', () => ({
  apiRequest: apiRequestMock,
  getStoredAuthToken: getStoredAuthTokenMock,
}));

import {
  clearPracticeDraft,
  loadPracticeDraft,
  PRACTICE_DRAFT_SYNC_EVENT,
  preparePracticeDraftWorkspaceForAccount,
  practiceDraftKeys,
  savePracticeDraft,
  synchronizePracticeDrafts,
} from '../../src/domain/practice/draftProgress';

function createLocalStorageMock(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.get(key) ?? null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
  };
}

function installBrowserStorage() {
  const localStorage = createLocalStorageMock();
  vi.stubGlobal('window', {
    localStorage,
    addEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  });
  vi.stubGlobal('CustomEvent', class {
    constructor(public type: string, public init?: unknown) {}
  });
  return localStorage;
}

describe('account practice draft synchronization', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    apiRequestMock.mockReset();
    getStoredAuthTokenMock.mockReturnValue('draft-token');
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('keeps the local write immediate and confirms the draft as an account entity', async () => {
    const storage = installBrowserStorage();
    apiRequestMock.mockResolvedValue({ entities: [] });

    savePracticeDraft(practiceDraftKeys.subjective('writing'), {
      version: 1,
      mode: 'writing',
      startedAt: '2026-07-28T10:00:00.000Z',
      taskIndex: 0,
      answer: 'A saved writing answer.',
      updatedAt: '2026-07-28T10:00:00.000Z',
    });

    expect(storage.getItem(practiceDraftKeys.subjective('writing'))).toContain('A saved writing answer.');
    await vi.advanceTimersByTimeAsync(600);

    expect(apiRequestMock).toHaveBeenCalledWith(
      '/api/cloud/learning-entities',
      expect.objectContaining({ method: 'PUT', keepalive: true }),
      'draft-token',
    );
    const request = apiRequestMock.mock.calls[0][1];
    const body = JSON.parse(request.body);
    expect(body.entities[0]).toMatchObject({
      entityType: 'practiceDraft',
      entityId: practiceDraftKeys.subjective('writing'),
      payload: { id: practiceDraftKeys.subjective('writing') },
    });
  });

  it('restores a newer server draft into an empty browser', async () => {
    const storage = installBrowserStorage();
    apiRequestMock.mockResolvedValue({
      entities: [{
        entityType: 'practiceDraft',
        entityId: practiceDraftKeys.mockExam,
        payload: {
          id: practiceDraftKeys.mockExam,
          draft: {
            version: 1,
            startedAt: '2026-07-28T09:00:00.000Z',
            paperId: 'mock-a',
            activeSection: 'reading',
            choices: { q1: 'B' },
            writingAnswer: 'restored essay',
            translationAnswer: '',
            updatedAt: '2026-07-28T10:00:00.000Z',
          },
        },
        updatedAt: '2026-07-28T10:00:00.000Z',
      }],
    });

    await expect(synchronizePracticeDrafts('draft-token')).resolves.toBe(1);
    expect(storage.getItem(practiceDraftKeys.mockExam)).toContain('restored essay');
  });

  it('clears another account draft before binding the next account', () => {
    const storage = installBrowserStorage();
    expect(preparePracticeDraftWorkspaceForAccount('user-a')).toBe('claimed');
    storage.setItem(practiceDraftKeys.vocabulary, JSON.stringify({ version: 1, updatedAt: '2026-07-28T10:00:00.000Z' }));

    expect(preparePracticeDraftWorkspaceForAccount('user-b')).toBe('switched');
    expect(storage.getItem(practiceDraftKeys.vocabulary)).toBeNull();
  });

  it('keeps an offline deletion tombstone until the server confirms it', async () => {
    const storage = installBrowserStorage();
    const key = practiceDraftKeys.mockExam;
    storage.setItem(key, JSON.stringify({ version: 1, updatedAt: '2026-07-28T10:00:00.000Z' }));
    apiRequestMock.mockRejectedValueOnce(new Error('offline'));

    clearPracticeDraft(key);
    expect(loadPracticeDraft(key)).toBeNull();
    expect(storage.getItem(key)).toContain('__practiceDraftDeleted');
    await vi.advanceTimersByTimeAsync(600);
    expect(storage.getItem(key)).toContain('__practiceDraftDeleted');

    apiRequestMock.mockResolvedValueOnce({ entities: [] });
    await synchronizePracticeDrafts('draft-token');
    expect(storage.getItem(key)).toBeNull();
    const uploaded = JSON.parse(apiRequestMock.mock.calls.at(-1)?.[1].body);
    expect(uploaded.entities[0]).toMatchObject({ entityId: key, deletedAt: expect.any(String) });
  });

  it('keeps the global state pending when one of two concurrent saves fails', async () => {
    installBrowserStorage();
    apiRequestMock
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ entities: [] });

    savePracticeDraft(practiceDraftKeys.mockExam, { version: 1, updatedAt: '2026-07-28T10:00:00.000Z' });
    savePracticeDraft(practiceDraftKeys.vocabulary, { version: 1, updatedAt: '2026-07-28T10:00:00.000Z' });
    await vi.advanceTimersByTimeAsync(600);

    const dispatchEvent = vi.mocked(window.dispatchEvent);
    const states = dispatchEvent.mock.calls
      .map(([event]) => (event as unknown as { type: string; init?: { detail?: { state?: string } } }))
      .filter((event) => event.type === PRACTICE_DRAFT_SYNC_EVENT)
      .map((event) => event.init?.detail?.state);
    expect(states.at(-1)).toBe('pending');
  });

  it('still writes to the account when the browser cache rejects a local write', async () => {
    const storage = installBrowserStorage();
    vi.spyOn(storage, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });
    apiRequestMock.mockResolvedValue({ entities: [] });

    savePracticeDraft(practiceDraftKeys.subjective('translation'), {
      version: 1,
      updatedAt: '2026-07-28T10:00:00.000Z',
    });
    await vi.advanceTimersByTimeAsync(600);

    expect(apiRequestMock).toHaveBeenCalledWith(
      '/api/cloud/learning-entities',
      expect.objectContaining({ method: 'PUT' }),
      'draft-token',
    );
  });
});
