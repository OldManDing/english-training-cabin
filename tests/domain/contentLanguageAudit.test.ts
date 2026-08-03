import { describe, expect, it } from 'vitest';
import {
  CET4_CLOZE_PRACTICE_QUESTIONS,
  CET4_GRAMMAR_PRACTICE_QUESTIONS,
  CET4_READING_BANK,
  CET4_TRANSLATION_PROMPT_BANK,
  CET4_WRITING_PROMPT_BANK,
} from '../../src/questionBank';
import { INITIAL_PASSAGE } from '../../src/data';

describe('generated learning content language audit', () => {
  it('keeps generated grammar sentences free of duplicated words and metadata', () => {
    const invalid = CET4_GRAMMAR_PRACTICE_QUESTIONS.filter((question) => {
      const text = `${question.prompt} ${question.correctSentence}`;
      return /\b([A-Za-z]+)\s+\1\b/iu.test(text)
        || /\b(?:that|because|although|while|when|if|unless|so that|now that)\s+[A-Z][a-z]+\s/u.test(text)
        || /\([^)]*\|[^)]*\)$/u.test(question.correctSentence);
    });

    expect(invalid).toEqual([]);
  });

  it('keeps every reading word-meaning target present in its passage', () => {
    const invalid = CET4_READING_BANK.flatMap((passage) =>
      passage.questions
        .filter((question) => question.type === '词义猜测')
        .map((question) => ({ passage, question })),
    ).filter(({ passage, question }) => {
      const target = question.question.match(/["“]([^"”]+)["”]/u)?.[1];
      if (!target) return true;
      const escaped = target.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
      return !new RegExp(`\\b${escaped}\\b`, 'iu').test(passage.content);
    });

    expect(invalid).toEqual([]);
  });

  it('keeps the initial reading passage highlight ranges aligned with locator sentences', () => {
    const expectedCorrectText = new Map<number | string, string>([
      [1, 'One major study recently indicated that while AI tools excel at teaching foundational concepts, they often struggle to foster critical thinking and emotional intelligence, skills traditionally nurtured through complex human interaction.'],
      [2, 'Adaptive AI tools can instantly modify the difficulty of subsequent exercises, ensuring the learner remains in the optimal zone of proximal development.'],
      [3, 'Furthermore, the over-reliance on technology might exacerbate existing inequalities if access to sophisticated AI platforms is disproportionately available only to well-funded institutions.'],
      [4, 'In conclusion, while the integration of AI into classrooms presents unprecedented opportunities for educational advancement, it requires careful regulation and a balanced approach that preserves the irreplaceable value of human mentorship.'],
      [5, 'The impact of artificial intelligence on modern education is a subject of intense debate among scholars and practitioners.'],
    ]);

    for (const question of INITIAL_PASSAGE.questions) {
      const range = question.highlightTextIndices?.correct;
      expect(range).toBeDefined();
      expect(INITIAL_PASSAGE.content.slice(...range!)).toBe(expectedCorrectText.get(question.id));
    }
  });

  it('does not reveal cloze answers inside the actual blanked text', () => {
    const invalid = CET4_CLOZE_PRACTICE_QUESTIONS.filter((question) => (
      /(?:collocation|sentence-logic)/u.test(question.id)
    )).filter((question) => {
      const answer = question.options[question.correctAnswer];
      if (!/^[A-Za-z-]+$/u.test(answer)) return false;
      const taskText = question.prompt.slice(question.prompt.lastIndexOf(':') + 1);
      const escaped = answer.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
      return new RegExp(`\\b${escaped}\\b`, 'iu').test(taskText);
    });

    expect(invalid).toEqual([]);
  });

  it('keeps expanded reading passages free of plural subject agreement defects', () => {
    const pluralTopics = '(?:Campus health programs|Online courses|Smart devices|Public sports facilities|Campus library services|Green travel choices|Traditional crafts|Digital museums)';
    const invalid = CET4_READING_BANK.filter((passage) => [
      new RegExp(`(?:^|[.!?]\\s+)${pluralTopics}\\s+(?:is|has|works|offers)\\b`, 'iu'),
      new RegExp(`\\b${pluralTopics}\\b[^.!?]{0,120}\\bits\\b`, 'iu'),
    ].some((pattern) => pattern.test(passage.content)));

    expect(invalid).toEqual([]);
  });

  it('keeps learner-facing English fields free of Chinese interpolation', () => {
    const invalid = CET4_READING_BANK.flatMap((passage) => [
      { id: passage.id, text: passage.content },
      ...passage.questions.flatMap((question) => [
        { id: `${passage.id}:${question.id}:question`, text: question.question },
        { id: `${passage.id}:${question.id}:sentence`, text: question.correctSentence },
        ...Object.entries(question.options).map(([choice, text]) => ({
          id: `${passage.id}:${question.id}:${choice}`,
          text,
        })),
      ]),
    ]).filter(({ text }) => /[\u3400-\u9fff]/u.test(text));

    expect(invalid).toEqual([]);
  });

  it('keeps writing and translation templates natural after topic interpolation', () => {
    const subjectiveContent = [
      ...CET4_WRITING_PROMPT_BANK.map((item) => `${item.prompt}\n${item.sampleAnswer}`),
      ...CET4_TRANSLATION_PROMPT_BANK.map((item) => `${item.prompt}\n${item.sampleAnswer}`),
    ];
    const invalid = subjectiveContent.filter((text) => [
      /^\s*(?:Campus library services|Green travel choices|Traditional crafts|Digital museums)\s+(?:is|has|offers)\b/imu,
      /\b(?:Campus library services|Green travel choices|Traditional crafts|Digital museums)\b[^.]{0,100}\bbut it can\b/iu,
      /\bdevelopment of rural development\b/iu,
      /乡村发展的发展/u,
      /\b(?:an ability that can be practiced|To play a long-term role|The topic of|at the level of slogans)\b/iu,
      /\b([A-Za-z]+)\s+\1\b/iu,
    ].some((pattern) => pattern.test(text)));

    expect(invalid).toEqual([]);
  });
});
