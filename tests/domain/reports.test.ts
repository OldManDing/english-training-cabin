import { describe, expect, it } from 'vitest';
import { buildChoicePracticeReport } from '../../src/domain/practice/reports';

describe('buildChoicePracticeReport', () => {
  it('creates attempts, review items, and skill evidence from wrong answers', () => {
    const report = buildChoicePracticeReport({
      examId: 'cet4',
      moduleId: 'reading',
      questionTypeId: 'careful-reading',
      modeId: 'unit-test',
      skillArea: 'reading',
      plannedMinutes: 18,
      startedAt: new Date(Date.now() - 60_000).toISOString(),
      questions: [
        {
          id: 1,
          question: 'What is the main idea?',
          correctAnswer: 'B',
          type: '同义替换',
        },
      ],
      answers: [
        {
          selected: 'A',
          correct: false,
          confidence: 'sure',
        },
      ],
    });

    expect(report.session.status).toBe('completed');
    expect(report.attempts).toHaveLength(1);
    expect(report.attempts[0].mistakeReasons).toContain('同义替换未识别');
    expect(report.reviewItems).toHaveLength(1);
    expect(report.skillProfiles[0]).toMatchObject({
      skillArea: 'reading',
      subSkillId: 'careful-reading',
      score: 0,
    });
  });

  it('does not create review work for confident correct answers', () => {
    const report = buildChoicePracticeReport({
      moduleId: 'listening',
      questionTypeId: 'long-conversation',
      modeId: 'unit-test',
      skillArea: 'listening',
      plannedMinutes: 10,
      startedAt: new Date(Date.now() - 30_000).toISOString(),
      questions: [
        {
          id: 1,
          question: 'What does the woman mean?',
          correctAnswer: 'C',
          trapType: '转折信息漏听',
        },
      ],
      answers: [
        {
          selected: 'C',
          correct: true,
          confidence: 'High',
        },
      ],
    });

    expect(report.attempts[0].mistakeReasons).toEqual([]);
    expect(report.reviewItems).toEqual([]);
    expect(report.skillProfiles[0].score).toBe(100);
  });
});
