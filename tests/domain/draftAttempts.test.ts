import { afterEach, describe, expect, it, vi } from 'vitest';
import { CET4_VOCABULARY_BANK } from '../../src/data';
import { CET4_READING_BANK } from '../../src/questionBank';
import { buildDraftPracticeAttempts } from '../../src/domain/practice/draftAttempts';
import { practiceDraftKeys } from '../../src/domain/practice/draftProgress';

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

function installLocalStorage() {
  const localStorage = createLocalStorageMock();
  vi.stubGlobal('window', { localStorage });
  return localStorage;
}

describe('draft practice attempts', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('keeps the explicit vocabulary question id instead of remapping by draft answer index', () => {
    const localStorage = installLocalStorage();
    const answeredItem = CET4_VOCABULARY_BANK[5];
    const now = '2026-06-14T10:00:00.000Z';
    localStorage.setItem(practiceDraftKeys.vocabulary, JSON.stringify({
      version: 1,
      startedAt: now,
      packIndex: 0,
      currentIdx: 0,
      selectedOpt: 'A',
      confidence: 'sure',
      isSubmitted: true,
      answers: [{
        selected: 'A',
        correct: true,
        confidence: 'sure',
        questionId: answeredItem.id,
        moduleId: 'vocabulary',
        questionTypeId: 'cet4-core-vocabulary',
      }],
      updatedAt: now,
    }));

    const attempts = buildDraftPracticeAttempts();

    expect(attempts.find((attempt) => attempt.moduleId === 'vocabulary')?.questionId).toBe(answeredItem.id);
    expect(attempts.find((attempt) => attempt.moduleId === 'vocabulary')?.questionId).not.toBe(CET4_VOCABULARY_BANK[0].id);
  });

  it('keeps the explicit reading question id when a passage has been filtered', () => {
    const localStorage = installLocalStorage();
    const passage = CET4_READING_BANK[0];
    const answeredQuestion = passage.questions[1];
    const filteredPassage = { ...passage, questions: [passage.questions[0]] };
    const now = '2026-06-14T10:00:00.000Z';
    localStorage.setItem(practiceDraftKeys.reading(passage.id), JSON.stringify({
      version: 1,
      passageId: passage.id,
      startedAt: now,
      currentIdx: 0,
      selectedOpt: 'B',
      confidence: 'not_sure',
      isSubmitted: true,
      answers: [{
        selected: 'B',
        correct: false,
        confidence: 'not_sure',
        questionId: String(answeredQuestion.id),
        moduleId: answeredQuestion.moduleId ?? passage.moduleId ?? 'reading',
        questionTypeId: answeredQuestion.questionTypeId,
      }],
      updatedAt: now,
    }));

    const attempts = buildDraftPracticeAttempts({
      readingPassages: [filteredPassage],
    });

    expect(attempts.find((attempt) => attempt.moduleId === 'reading')?.questionId).toBe(String(answeredQuestion.id));
    expect(attempts.find((attempt) => attempt.moduleId === 'reading')?.questionId).not.toBe(String(passage.questions[0].id));
  });
});
