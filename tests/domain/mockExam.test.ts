import { describe, expect, it } from 'vitest';
import { buildMockExamReport } from '../../src/domain/practice/mockExam';
import { CET4_MOCK_EXAM } from '../../src/questionBank';

describe('buildMockExamReport', () => {
  it('scores a standard-structure CET-4 mock exam and creates review evidence', () => {
    const choices = Object.fromEntries(
      [...CET4_MOCK_EXAM.listening.questions, ...CET4_MOCK_EXAM.reading.questions].map((question, index) => [
        question.id,
        index === 0 ? 'A' : question.correctAnswer,
      ]),
    );

    const result = buildMockExamReport({
      startedAt: new Date(Date.now() - 120_000).toISOString(),
      answers: {
        choices,
        writingAnswer:
          'Consistent practice is important because students can receive feedback and improve slowly. For example, I write one short paragraph every day and check grammar mistakes after class.',
        translationAnswer:
          'More college students use digital tools to learn English. Effective tools should help students find mistakes, active recall knowledge and review at the right time.',
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
      CET4_MOCK_EXAM.listening.questions.length + CET4_MOCK_EXAM.reading.questions.length + 2,
    );
    expect(result.report.reviewItems.length).toBeGreaterThanOrEqual(1);
    expect(result.report.reviewItems[0].memoryTask?.spacingPlanDays).toEqual([1, 3, 7, 14, 30]);
    expect(result.report.skillProfiles.map((profile) => profile.skillArea).sort()).toEqual([
      'listening',
      'reading',
      'translation',
      'writing',
    ]);
  });
});
