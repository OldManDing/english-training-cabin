import { describe, expect, it } from 'vitest';
import { CET4_VOCABULARY_BANK } from '../../src/data';
import {
  buildPracticeModuleProgress,
  buildPracticeQuestionStatusList,
  buildUnpracticedReadingPassages,
  countPracticeAttemptsOnLocalDate,
  findLatestPracticeAttempt,
  filterPassageForUnpracticedQuestions,
  filterUnpracticedItems,
  getPracticedQuestionIds,
  mergePracticeProgressAttempts,
} from '../../src/domain/practice/practicedQuestions';
import { Attempt, Passage, PracticeSession } from '../../src/types';

function makeAttempt(questionId: string, moduleId: string): Attempt {
  return {
    id: `attempt-${moduleId}-${questionId}`,
    sessionId: `session-${moduleId}`,
    questionId,
    examId: 'cet4',
    moduleId,
    questionTypeId: 'careful-reading',
    answer: 'A',
    isCorrect: true,
    elapsedSeconds: 12,
    mistakeReasons: [],
    createdAt: '2026-05-31T00:00:00.000Z',
  };
}

function makeSession(id: string, moduleId: string, modeId = moduleId): PracticeSession {
  return {
    id,
    examId: 'cet4',
    moduleId,
    modeId,
    startedAt: '2026-05-31T00:00:00.000Z',
    plannedMinutes: 10,
    questionIds: [],
    status: 'completed',
  };
}

function localIso(year: number, month: number, day: number, hour = 12): string {
  return new Date(year, month - 1, day, hour).toISOString();
}

const passage: Passage = {
  id: 'reading-passage-1',
  examId: 'cet4',
  moduleId: 'reading',
  title: 'Reading Passage',
  content: 'A short passage.',
  questions: [
    {
      id: 'q1',
      examId: 'cet4',
      moduleId: 'reading',
      questionTypeId: 'careful-reading',
      question: 'Question 1',
      options: { A: 'A', B: 'B', C: 'C', D: 'D' },
      correctAnswer: 'A',
      explanation: 'Explanation 1',
      type: 'detail',
    },
    {
      id: 'q2',
      examId: 'cet4',
      moduleId: 'reading',
      questionTypeId: 'careful-reading',
      question: 'Question 2',
      options: { A: 'A', B: 'B', C: 'C', D: 'D' },
      correctAnswer: 'B',
      explanation: 'Explanation 2',
      type: 'detail',
    },
  ],
};

describe('practiced question filtering', () => {
  it('returns practiced ids by module and filters simple item banks', () => {
    const attempts = [makeAttempt('vocab-1', 'vocabulary'), makeAttempt('q1', 'reading')];

    expect(getPracticedQuestionIds(attempts, 'vocabulary')).toEqual(new Set(['vocab-1']));
    expect(filterUnpracticedItems([
      { id: 'vocab-1', label: 'done' },
      { id: 'vocab-2', label: 'next' },
    ], attempts, 'vocabulary')).toEqual([{ id: 'vocab-2', label: 'next' }]);
  });

  it('finds the latest practice attempt by current id or legacy id alias', () => {
    const currentAttempt = makeAttempt('conversation-timed-reading-1', 'listening');
    const legacyAttempt = {
      ...makeAttempt('1', 'listening'),
      id: 'attempt-listening-legacy-1',
      createdAt: '2026-06-01T00:00:00.000Z',
    };

    expect(findLatestPracticeAttempt({
      attempts: [legacyAttempt, currentAttempt],
      moduleId: 'listening',
      questionId: 'conversation-timed-reading-1',
      legacyQuestionIds: ['1'],
    })?.id).toBe('attempt-listening-legacy-1');
  });

  it('falls back to the original bank when every item has been practiced', () => {
    const items = [{ id: 'vocab-1' }, { id: 'vocab-2' }];

    expect(filterUnpracticedItems(
      items,
      [makeAttempt('vocab-1', 'vocabulary'), makeAttempt('vocab-2', 'vocabulary')],
      'vocabulary',
    )).toBe(items);
  });

  it('keeps only unpracticed questions inside a passage', () => {
    const filtered = filterPassageForUnpracticedQuestions(passage, [makeAttempt('q1', 'reading')]);

    expect(filtered?.questions.map((question) => question.id)).toEqual(['q2']);
    expect(filtered?.id).toBe(passage.id);
  });

  it('falls back to full reading passages when all reading questions are done', () => {
    const attempts = [makeAttempt('q1', 'reading'), makeAttempt('q2', 'reading')];

    expect(filterPassageForUnpracticedQuestions(passage, attempts)).toBeNull();
    expect(buildUnpracticedReadingPassages([passage], attempts)).toEqual([passage]);
  });

  it('builds practice module progress from real attempts and mock sessions', () => {
    const attempts: Attempt[] = [
      makeAttempt('vocab-1', 'vocabulary'),
      makeAttempt('vocab-1', 'vocabulary'),
      makeAttempt('listen-1', 'listening'),
      makeAttempt('grammar-1', 'grammar'),
      { ...makeAttempt('cloze-1', 'grammar'), questionTypeId: 'cloze-choice' },
      makeAttempt('writing-short-essay', 'writing'),
      makeAttempt('translation-paragraph', 'translation'),
    ];
    const sessions = [
      makeSession('mock-session-1', 'mock', 'cet4-standard-mock'),
    ];

    const progress = buildPracticeModuleProgress({
      attempts,
      sessions,
      totals: {
        vocabulary: 10,
        cloze: 5,
        grammar: 5,
        reading: 2,
        listening: 8,
        writing: 3,
        translation: 3,
        mock: 2,
      },
    });

    expect(progress.get('vocabulary')).toMatchObject({ practiced: 1, total: 10, remaining: 9 });
    expect(progress.get('listening')).toMatchObject({ practiced: 1, total: 8, remaining: 7 });
    expect(progress.get('grammar')).toMatchObject({ practiced: 1, total: 5, remaining: 4 });
    expect(progress.get('cloze')).toMatchObject({ practiced: 1, total: 5, remaining: 4 });
    expect(progress.get('writing')).toMatchObject({ practiced: 1, total: 3, remaining: 2 });
    expect(progress.get('translation')).toMatchObject({ practiced: 1, total: 3, remaining: 2 });
    expect(progress.get('mock')).toMatchObject({ practiced: 1, total: 2, remaining: 1 });
  });

  it('does not crash when restored attempts miss legacy questionTypeId', () => {
    const legacyAttempt = makeAttempt('legacy-1', 'reading');
    delete (legacyAttempt as Partial<Attempt>).questionTypeId;

    const progress = buildPracticeModuleProgress({
      attempts: [legacyAttempt],
      totals: {
        vocabulary: 10,
        cloze: 5,
        grammar: 5,
        reading: 2,
        listening: 8,
        writing: 3,
        translation: 3,
        mock: 2,
      },
    });

    expect(progress.get('reading')).toMatchObject({ practiced: 1, total: 2, remaining: 1 });
  });

  it('counts repeated writing and translation attempts by unique prompt id', () => {
    const progress = buildPracticeModuleProgress({
      attempts: [
        makeAttempt('writing-campus', 'writing'),
        { ...makeAttempt('writing-campus', 'writing'), id: 'attempt-writing-campus-redo' },
        makeAttempt('translation-tea', 'translation'),
        { ...makeAttempt('translation-tea', 'translation'), id: 'attempt-translation-tea-redo' },
      ],
      totals: {
        vocabulary: 10,
        cloze: 5,
        grammar: 5,
        reading: 2,
        listening: 8,
        writing: 3,
        translation: 3,
        mock: 2,
      },
    });

    expect(progress.get('writing')).toMatchObject({ practiced: 1, total: 3, remaining: 2 });
    expect(progress.get('translation')).toMatchObject({ practiced: 1, total: 3, remaining: 2 });
  });

  it('merges persisted and draft attempts without double-counting the same question', () => {
    const persistedAttempts = [
      makeAttempt('reading-q1', 'reading'),
      makeAttempt('vocab-1', 'vocabulary'),
    ];
    const draftAttempts: Attempt[] = [
      { ...makeAttempt('reading-q1', 'reading'), id: 'draft-reading-q1', sessionId: 'draft-reading' },
      { ...makeAttempt('reading-q2', 'reading'), id: 'draft-reading-q2', sessionId: 'draft-reading' },
      { ...makeAttempt('listen-1', 'listening'), id: 'draft-listen-1', sessionId: 'draft-listening' },
    ];

    const merged = mergePracticeProgressAttempts({
      persistedAttempts,
      draftAttempts,
    });

    expect(merged.map((attempt) => `${attempt.moduleId}:${attempt.questionId}`)).toEqual([
      'reading:reading-q1',
      'vocabulary:vocab-1',
      'reading:reading-q2',
      'listening:listen-1',
    ]);
  });

  it('builds updated progress from merged draft attempts', () => {
    const mergedAttempts = mergePracticeProgressAttempts({
      persistedAttempts: [makeAttempt('vocab-1', 'vocabulary')],
      draftAttempts: [
        { ...makeAttempt('vocab-2', 'vocabulary'), id: 'draft-vocab-2', sessionId: 'draft-vocabulary' },
        { ...makeAttempt('listen-1', 'listening'), id: 'draft-listen-1', sessionId: 'draft-listening' },
      ],
    });
    const progress = buildPracticeModuleProgress({
      attempts: mergedAttempts,
      totals: {
        vocabulary: 10,
        cloze: 5,
        grammar: 5,
        reading: 2,
        listening: 8,
        writing: 3,
        translation: 3,
        mock: 2,
      },
    });

    expect(progress.get('vocabulary')).toMatchObject({ practiced: 2, total: 10, remaining: 8 });
    expect(progress.get('listening')).toMatchObject({ practiced: 1, total: 8, remaining: 7 });
  });

  it('counts visible practice attempts for the current local day only', () => {
    const attempts: Attempt[] = [
      { ...makeAttempt('today-1', 'vocabulary'), createdAt: localIso(2026, 6, 14, 8) },
      { ...makeAttempt('today-2', 'grammar'), createdAt: localIso(2026, 6, 14, 22) },
      { ...makeAttempt('yesterday-1', 'reading'), createdAt: localIso(2026, 6, 13, 23) },
      { ...makeAttempt('invalid-time', 'listening'), createdAt: '' },
    ];

    expect(countPracticeAttemptsOnLocalDate(attempts, new Date(2026, 5, 14, 12))).toBe(2);
  });

  it('builds per-question status for practiced and unpracticed objective items', () => {
    const statuses = buildPracticeQuestionStatusList({
      attempts: [
        makeAttempt('vocab-1', 'vocabulary'),
      ],
      moduleId: 'vocabulary',
      questions: [
        { id: 'vocab-1', label: 'adapt' },
        { id: 'vocab-2', label: 'secure' },
      ],
    });

    expect(statuses).toEqual([
      expect.objectContaining({ id: 'vocab-1', number: 1, practiced: true }),
      expect.objectContaining({ id: 'vocab-2', number: 2, practiced: false }),
    ]);
  });

  it('marks listening status from legacy numeric question ids', () => {
    const statuses = buildPracticeQuestionStatusList({
      attempts: [
        makeAttempt('1', 'listening'),
      ],
      moduleId: 'listening',
      questions: [
        { id: 'listening-long-conversation-1', legacyIds: ['1'], label: '长对话 1' },
        { id: 'listening-long-conversation-2', legacyIds: ['2'], label: '长对话 2' },
      ],
    });

    expect(statuses.map((item) => item.practiced)).toEqual([true, false]);
  });

  it('repairs legacy vocabulary status saved against questions 241 to 255', () => {
    const legacyWrongAttempts = CET4_VOCABULARY_BANK
      .slice(240, 255)
      .map((item) => makeAttempt(item.id, 'vocabulary'));

    const statuses = buildPracticeQuestionStatusList({
      attempts: legacyWrongAttempts,
      moduleId: 'vocabulary',
      questions: CET4_VOCABULARY_BANK.map((item) => ({ id: item.id })),
    });

    const statusByNumber = new Map(statuses.map((status) => [status.number, status.practiced]));

    for (let number = 121; number <= 130; number += 1) {
      expect(statusByNumber.get(number)).toBe(true);
    }
    for (let number = 241; number <= 255; number += 1) {
      expect(statusByNumber.get(number)).toBe(false);
    }
  });

  it('keeps real vocabulary attempts 251 to 255 when repairing the legacy 241 to 250 offset', () => {
    const legacyWrongAttempts = CET4_VOCABULARY_BANK
      .slice(240, 250)
      .map((item) => makeAttempt(item.id, 'vocabulary'));
    const realTailAttempts = CET4_VOCABULARY_BANK
      .slice(250, 255)
      .map((item) => ({
        ...makeAttempt(item.id, 'vocabulary'),
        id: `attempt-real-tail-${item.id}`,
        sessionId: 'session-vocabulary-real-tail',
        createdAt: '2026-06-01T00:00:00.000Z',
      }));

    const statuses = buildPracticeQuestionStatusList({
      attempts: [...legacyWrongAttempts, ...realTailAttempts],
      moduleId: 'vocabulary',
      questions: CET4_VOCABULARY_BANK.map((item) => ({ id: item.id })),
    });

    const statusByNumber = new Map(statuses.map((status) => [status.number, status.practiced]));

    for (let number = 121; number <= 130; number += 1) {
      expect(statusByNumber.get(number)).toBe(true);
    }
    for (let number = 241; number <= 250; number += 1) {
      expect(statusByNumber.get(number)).toBe(false);
    }
    for (let number = 251; number <= 255; number += 1) {
      expect(statusByNumber.get(number)).toBe(true);
    }
  });

  it('keeps cloze status separate from ordinary grammar status', () => {
    const attempts = [
      { ...makeAttempt('grammar-1', 'grammar'), questionTypeId: 'grammar-structure' },
      { ...makeAttempt('cloze-1', 'grammar'), questionTypeId: 'cloze-choice' },
    ];

    expect(buildPracticeQuestionStatusList({
      attempts,
      moduleId: 'grammar',
      questions: [
        { id: 'grammar-1', moduleId: 'grammar', questionTypeId: 'grammar-structure' },
        { id: 'cloze-1', moduleId: 'grammar', questionTypeId: 'cloze-choice' },
      ],
    }).map((item) => item.practiced)).toEqual([true, false]);

    expect(buildPracticeQuestionStatusList({
      attempts,
      moduleId: 'cloze',
      questions: [
        { id: 'grammar-1', moduleId: 'grammar', questionTypeId: 'grammar-structure' },
        { id: 'cloze-1', moduleId: 'grammar', questionTypeId: 'cloze-choice' },
      ],
    }).map((item) => item.practiced)).toEqual([false, true]);
  });

  it('marks subjective prompt ids exactly and keeps legacy attempts visible', () => {
    const statuses = buildPracticeQuestionStatusList({
      attempts: [
        makeAttempt('writing-campus', 'writing'),
        makeAttempt('writing-short-essay', 'writing'),
      ],
      moduleId: 'writing',
      questions: [
        { id: 'writing-consistent' },
        { id: 'writing-campus' },
        { id: 'writing-digital' },
      ],
    });

    expect(statuses.map((item) => item.practiced)).toEqual([true, true, false]);
  });

  it('marks the actual completed mock paper instead of the first paper by count', () => {
    const statuses = buildPracticeQuestionStatusList({
      attempts: [],
      sessions: [
        {
          ...makeSession('mock-session-2', 'mock', 'cet4-standard-mock'),
          questionIds: ['mock-paper-2-writing', 'mock-paper-2-translation'],
        },
      ],
      moduleId: 'mock',
      questions: [
        { id: 'mock-paper-1' },
        { id: 'mock-paper-2' },
        { id: 'mock-paper-3' },
      ],
    });

    expect(statuses.map((item) => item.practiced)).toEqual([false, true, false]);
  });
});
