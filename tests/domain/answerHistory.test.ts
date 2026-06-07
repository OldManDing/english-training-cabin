import { describe, expect, it } from 'vitest';
import { CET4_VOCABULARY_BANK } from '../../src/data';
import { CET4_READING_BANK } from '../../src/questionBank';
import {
  buildAnsweredQuestionHistory,
  formatAttemptAnswer,
  paginateAnsweredQuestionHistory,
} from '../../src/domain/practice/answerHistory';
import { getReadingChineseSupport } from '../../src/domain/practice/chineseSupport';
import { getVocabularyQuestionSupport } from '../../src/domain/practice/sentenceTranslations';
import { Attempt, PracticeSession } from '../../src/types';

function makeAttempt(changes: Partial<Attempt>): Attempt {
  return {
    id: changes.id ?? `attempt-${changes.moduleId ?? 'reading'}-${changes.questionId ?? 'q1'}`,
    sessionId: changes.sessionId ?? 'session-reading',
    questionId: changes.questionId ?? 'q1',
    examId: changes.examId ?? 'cet4',
    moduleId: changes.moduleId ?? 'reading',
    questionTypeId: changes.questionTypeId ?? 'careful-reading',
    answer: changes.answer ?? 'A',
    isCorrect: changes.isCorrect,
    elapsedSeconds: changes.elapsedSeconds ?? 12,
    mistakeReasons: changes.mistakeReasons ?? [],
    aiFeedback: changes.aiFeedback,
    createdAt: changes.createdAt ?? '2026-06-01T00:00:00.000Z',
  };
}

const mockSession: PracticeSession = {
  id: 'session-mock',
  examId: 'cet4',
  moduleId: 'mock',
  modeId: 'cet4-standard-mock',
  startedAt: '2026-06-01T00:00:00.000Z',
  plannedMinutes: 125,
  questionIds: [],
  status: 'completed',
};

describe('answered question history', () => {
  it('resolves vocabulary attempts back to the original question snapshot', () => {
    const item = CET4_VOCABULARY_BANK[0];
    const history = buildAnsweredQuestionHistory({
      attempts: [makeAttempt({
        questionId: item.id,
        moduleId: 'vocabulary',
        questionTypeId: 'cet4-core-vocabulary',
        answer: item.correctAnswer,
        isCorrect: true,
      })],
    });

    expect(history[0]).toMatchObject({
      moduleLabel: '词汇',
      questionTypeLabel: '词义辨析',
      answerText: item.correctAnswer,
    });
    expect(history[0].snapshot.prompt).toContain(item.word);
    expect(history[0].snapshot.correctAnswer).toBe(item.correctAnswer);
    expect(history[0].snapshot.promptTranslation).toContain(item.meaning);
    const correctOptionTranslation = getVocabularyQuestionSupport(item)
      .optionTranslations.find((translation) => translation.key === item.correctAnswer)?.chineseMeaning;
    expect(correctOptionTranslation).toBeTruthy();
    expect(history[0].snapshot.optionTranslations?.[item.correctAnswer]).toBe(correctOptionTranslation);
    expect(history[0].searchText).toContain(correctOptionTranslation!.toLowerCase());
  });

  it('resolves reading attempts and keeps passage context', () => {
    const passage = CET4_READING_BANK[0];
    const question = passage.questions[0];
    const chineseSupport = getReadingChineseSupport(passage.id, question);
    const history = buildAnsweredQuestionHistory({
      attempts: [makeAttempt({
        questionId: String(question.id),
        moduleId: question.moduleId ?? 'reading',
        questionTypeId: question.questionTypeId ?? 'careful-reading',
        answer: question.correctAnswer,
        isCorrect: true,
      })],
    });

    expect(history[0].snapshot.prompt).toBe(question.question);
    expect(chineseSupport?.question).toBeTruthy();
    expect(history[0].snapshot.promptTranslation).toBe(chineseSupport?.question);
    expect(history[0].snapshot.context).toBe(passage.content);
    expect(history[0].searchText).toContain(question.question.toLowerCase());
    expect(history[0].searchText).toContain(chineseSupport!.question!.toLowerCase());
  });

  it('labels objective mock attempts with their mock section', () => {
    const passage = CET4_READING_BANK[0];
    const question = passage.questions[0];
    const history = buildAnsweredQuestionHistory({
      sessions: [mockSession],
      attempts: [makeAttempt({
        sessionId: mockSession.id,
        questionId: String(question.id),
        moduleId: 'reading',
        questionTypeId: question.questionTypeId ?? 'careful-reading',
      })],
    });

    expect(history[0].moduleLabel).toBe('模考 · 阅读');
  });

  it('uses review redo evidence when the original snapshot is not in the bank', () => {
    const history = buildAnsweredQuestionHistory({
      attempts: [makeAttempt({
        moduleId: 'review',
        questionTypeId: 'wrong-question-redo-active-recall',
        questionId: 'old-question-1',
        answer: {
          redoAnswer: 'B',
          redoPrompt: 'Which option best matches the passage?',
          referenceRedoAnswer: 'C',
          recallAnswer: '我错在没有定位转折句。',
        },
        isCorrect: false,
      })],
    });

    expect(history[0].snapshot.prompt).toBe('Which option best matches the passage?');
    expect(history[0].snapshot.correctAnswer).toBe('C');
    expect(history[0].answerText).toContain('重做：B');
  });

  it('formats multi-step review answers for display', () => {
    expect(formatAttemptAnswer({
      redoAnswer: 'A',
      recallAnswer: '忽略同义替换',
      clozeAnswer: 'active recall',
      productionAnswer: 'I will compare choices next time.',
    })).toContain('迁移表达');
  });

  it('paginates answered history lists and clamps invalid page numbers', () => {
    const items = Array.from({ length: 23 }, (_, index) => `item-${index + 1}`);

    expect(paginateAnsweredQuestionHistory(items, 1)).toMatchObject({
      items: items.slice(0, 10),
      page: 1,
      pageSize: 10,
      pageCount: 3,
      totalCount: 23,
      startIndex: 1,
      endIndex: 10,
    });
    expect(paginateAnsweredQuestionHistory(items, 3)).toMatchObject({
      items: items.slice(20, 23),
      page: 3,
      startIndex: 21,
      endIndex: 23,
    });
    expect(paginateAnsweredQuestionHistory(items, 99)).toMatchObject({
      page: 3,
      startIndex: 21,
      endIndex: 23,
    });
    expect(paginateAnsweredQuestionHistory([], -1)).toMatchObject({
      items: [],
      page: 1,
      pageCount: 1,
      totalCount: 0,
      startIndex: 0,
      endIndex: 0,
    });
  });
});
