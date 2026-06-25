import { afterEach, describe, expect, it, vi } from 'vitest';
import { CET4_VOCABULARY_BANK } from '../../src/data';
import { CET4_GRAMMAR_PRACTICE_QUESTIONS, CET4_READING_BANK } from '../../src/questionBank';
import { buildDraftPracticeAttempts } from '../../src/domain/practice/draftAttempts';
import { practiceDraftKeys } from '../../src/domain/practice/draftProgress';
import { orderGrammarStructureQuestions } from '../../src/domain/practice/grammarStructureGuides';
import type { Attempt } from '../../src/types';

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

function makeVocabularyAttempt(questionId: string): Attempt {
  return {
    id: `attempt-${questionId}`,
    sessionId: 'session-vocabulary',
    questionId,
    examId: 'cet4',
    moduleId: 'vocabulary',
    questionTypeId: 'cet4-core-vocabulary',
    answer: 'A',
    isCorrect: true,
    elapsedSeconds: 10,
    mistakeReasons: [],
    createdAt: '2026-06-14T09:00:00.000Z',
  };
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

  it('maps a legacy vocabulary draft to questions 121-130 instead of 241-255', () => {
    const localStorage = installLocalStorage();
    const now = '2026-06-14T10:00:00.000Z';
    localStorage.setItem(practiceDraftKeys.vocabulary, JSON.stringify({
      version: 1,
      startedAt: now,
      packIndex: 6,
      currentIdx: 9,
      selectedOpt: 'A',
      confidence: 'sure',
      isSubmitted: true,
      answers: Array.from({ length: 10 }, () => ({
        selected: 'A',
        correct: true,
        confidence: 'sure',
      })),
      updatedAt: now,
    }));
    const persistedAttempts = [
      ...CET4_VOCABULARY_BANK.slice(135, 240),
      ...CET4_VOCABULARY_BANK.slice(255),
    ].map((item) => makeVocabularyAttempt(item.id));

    const attempts = buildDraftPracticeAttempts({ persistedAttempts });

    expect(attempts
      .filter((attempt) => attempt.moduleId === 'vocabulary')
      .map((attempt) => attempt.questionId)).toEqual(CET4_VOCABULARY_BANK.slice(120, 130).map((item) => item.id));
    expect(attempts
      .filter((attempt) => attempt.moduleId === 'vocabulary')
      .map((attempt) => attempt.questionId)).not.toContain(CET4_VOCABULARY_BANK[240].id);
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

  it('maps legacy grammar drafts with the same ordered question list used by the status grid', () => {
    const localStorage = installLocalStorage();
    const orderedGrammarQuestions = orderGrammarStructureQuestions(CET4_GRAMMAR_PRACTICE_QUESTIONS);
    const now = '2026-06-14T10:00:00.000Z';
    localStorage.setItem(practiceDraftKeys.reading('cet4-grammar-structure-practice'), JSON.stringify({
      version: 1,
      passageId: 'cet4-grammar-structure-practice',
      startedAt: now,
      currentIdx: 0,
      selectedOpt: 'A',
      confidence: 'sure',
      isSubmitted: true,
      answers: [{
        selected: 'A',
        correct: true,
        confidence: 'sure',
      }],
      updatedAt: now,
    }));

    const attempts = buildDraftPracticeAttempts();
    const grammarAttempt = attempts.find((attempt) => attempt.moduleId === 'grammar');

    expect(grammarAttempt?.questionId).toBe(String(orderedGrammarQuestions[0].id));
    expect(grammarAttempt?.questionId).not.toBe(String(orderedGrammarQuestions[1].id));
  });
});
