import { describe, expect, it } from 'vitest';
import { buildMockExamReport } from '../../src/domain/practice/mockExam';
import { CET4_MOCK_EXAM, CET4_MOCK_EXAM_BANK } from '../../src/questionBank';

const MOCK_WRITING_ESSAY =
  'Consistent practice matters in English learning because real ability grows only when students use knowledge again and again in meaningful tasks. When learners write, listen, and review on a fixed schedule, they notice mistakes earlier and build stronger memory. For example, I write a short paragraph after class, read it aloud, and then check whether my topic sentence, reasons, and examples are clear. This routine may look simple, but it helps me turn passive vocabulary into active language and stops me from depending on last minute memorization. It also gives teachers enough evidence to offer specific feedback. In my view, the biggest value of consistent practice is that it makes progress visible, keeps confidence stable, and supports long term improvement before the CET-4 exam.';

describe('buildMockExamReport', () => {
  it('keeps every staged mock paper aligned with CET-4 real exam question types', () => {
    for (const paper of CET4_MOCK_EXAM_BANK) {
      const counts = [...paper.listening.questions, ...paper.reading.questions].reduce<Record<string, number>>(
        (accumulator, question) => ({
          ...accumulator,
          [question.questionTypeId]: (accumulator[question.questionTypeId] ?? 0) + 1,
        }),
        {},
      );

      expect(paper.writing.minWords).toBeGreaterThanOrEqual(120);
      expect(paper.listening.questions).toHaveLength(25);
      expect(paper.reading.questions).toHaveLength(30);
      expect(counts).toMatchObject({
        'short-news': 7,
        'long-conversation': 8,
        'listening-passage': 10,
        'word-bank': 10,
        'long-matching': 10,
        'careful-reading': 10,
      });
      expect(counts).not.toHaveProperty('grammar-structure');
      expect(counts).not.toHaveProperty('cloze-choice');
    }
  });

  it('scores a standard-structure CET-4 mock exam and creates review evidence', () => {
    const choices = Object.fromEntries(
      [
        ...CET4_MOCK_EXAM.listening.questions,
        ...CET4_MOCK_EXAM.reading.questions,
      ].map((question, index) => [
        question.id,
        index === 0 ? (question.correctAnswer === 'A' ? 'B' : 'A') : question.correctAnswer,
      ]),
    );

    const result = buildMockExamReport({
      startedAt: new Date(Date.now() - 120_000).toISOString(),
      answers: {
        choices,
        writingAnswer: MOCK_WRITING_ESSAY,
        translationAnswer:
          'More college students use digital tools to learn English. Effective tools should help students find mistakes, recall key knowledge actively, and review weak points at the right time instead of only showing answers.',
      },
    });

    expect(result.score).toBeGreaterThan(0);
    expect(result.sectionScores).toHaveLength(4);
    expect(result.report.session).toMatchObject({
      moduleId: 'mock',
      modeId: 'cet4-standard-mock',
      status: 'completed',
    });
    expect(result.report.attempts).toHaveLength(
      CET4_MOCK_EXAM.listening.questions.length
        + CET4_MOCK_EXAM.reading.questions.length
        + 2,
    );
    expect(result.report.reviewItems.length).toBeGreaterThanOrEqual(1);
    expect(result.report.reviewItems[0].memoryTask?.spacingPlanDays).toEqual([1, 3, 7, 14, 30]);
    const objectiveReview = result.report.reviewItems.find((item) => item.redoQuestion?.kind === 'single-choice');
    expect(objectiveReview).toBeTruthy();
    expect(objectiveReview?.learningMethod).toBe('wrong-question-redo-active-recall');
    expect(objectiveReview?.redoQuestion).toMatchObject({
      kind: 'single-choice',
    });
    expect(objectiveReview?.redoQuestion?.userAnswer).not.toBe(objectiveReview?.redoQuestion?.correctAnswer);
    expect(objectiveReview?.redoQuestion?.options?.A).toBeTruthy();
    expect(result.report.skillProfiles.map((profile) => profile.subSkillId)).toEqual([
      'mock-short-essay',
      'mock-listening-mixed',
      'mock-short-news',
      'mock-long-conversation',
      'mock-listening-passage',
      'mock-reading-mixed',
      'mock-word-bank',
      'mock-long-matching',
      'mock-careful-reading',
      'mock-paragraph-translation',
    ]);
  });
});
