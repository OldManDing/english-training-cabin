import { describe, expect, it } from 'vitest';
import { normalizePassage } from '../../src/domain/materials/passage';

const validPassage = {
  title: 'Urban Green Spaces',
  content:
    'Urban green spaces can help students relax and recover attention. Researchers have found that short exposure to natural environments may reduce stress and improve concentration.',
  questions: [
    {
      id: 1,
      question: 'What is one benefit of green spaces?',
      options: {
        A: 'They replace teachers.',
        B: 'They may reduce stress.',
        C: 'They remove exams.',
        D: 'They guarantee high scores.',
      },
      correctAnswer: 'B',
      explanation: 'The answer is directly supported by the second sentence.',
      type: 'detail',
      correctSentence: 'Researchers have found that short exposure to natural environments may reduce stress and improve concentration.',
    },
  ],
};

describe('normalizePassage', () => {
  it('normalizes imported material into CET-4 reading practice shape', () => {
    const passage = normalizePassage(validPassage);

    expect(passage.examId).toBe('cet4');
    expect(passage.moduleId).toBe('reading');
    expect(passage.questions[0]).toMatchObject({
      questionTypeId: 'careful-reading',
      correctAnswer: 'B',
      sourceType: 'user-imported',
    });
    expect(passage.questions[0].highlightTextIndices?.correct[0]).toBeGreaterThan(0);
  });

  it('rejects invalid question options before entering practice', () => {
    expect(() =>
      normalizePassage({
        ...validPassage,
        questions: [
          {
            ...validPassage.questions[0],
            options: { A: 'Only one option' },
          },
        ],
      }),
    ).toThrow('B must be a string');
  });
});
