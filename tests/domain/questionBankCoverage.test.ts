import { describe, expect, it } from 'vitest';
import { CET4_VOCABULARY_BANK } from '../../src/data';
import {
  CET4_LISTENING_PRACTICE_QUESTIONS,
  CET4_CLOZE_PRACTICE_QUESTIONS,
  CET4_GRAMMAR_PRACTICE_QUESTIONS,
  CET4_MOCK_EXAM,
  CET4_MOCK_EXAM_BANK,
  CET4_QUESTION_BANK_COVERAGE,
  CET4_READING_PRACTICE_QUESTIONS,
  CET4_READING_BANK,
  CET4_TRANSLATION_PROMPT_BANK,
  CET4_WORD_BANK_PRACTICE_QUESTIONS,
  CET4_LONG_MATCHING_PRACTICE_QUESTIONS,
  CET4_WRITING_PROMPT_BANK,
  DEGREE_ENGLISH_MOCK_EXAM,
  DEGREE_ENGLISH_OUTLINE_2025,
  DEGREE_ENGLISH_QUESTION_BANK_COVERAGE,
  DEGREE_ENGLISH_USE_OF_ENGLISH_QUESTIONS,
  DEGREE_ENGLISH_VOCABULARY_STRUCTURE_QUESTIONS,
  DEGREE_ENGLISH_WRITING_PROMPT_BANK,
} from '../../src/questionBank';

describe('CET-4 syllabus-aligned question bank coverage', () => {
  it('keeps the standard mock exam aligned with the CET-4 written-test structure', () => {
    const listeningCounts = countBy(CET4_MOCK_EXAM.listening.questions, (question) => question.questionTypeId);
    const readingCounts = countBy(CET4_MOCK_EXAM.reading.questions, (question) => question.questionTypeId);
    const foundationCounts = countBy(CET4_MOCK_EXAM.foundation.questions, (question) => question.questionTypeId);

    expect(CET4_MOCK_EXAM.plannedMinutes).toBe(137);
    expect(CET4_MOCK_EXAM.listening.questions).toHaveLength(25);
    expect(CET4_MOCK_EXAM.reading.questions).toHaveLength(30);
    expect(CET4_MOCK_EXAM.foundation.questions).toHaveLength(8);
    expect(listeningCounts).toMatchObject({
      'short-news': 7,
      'long-conversation': 8,
      'listening-passage': 10,
    });
    expect(readingCounts).toMatchObject({
      'word-bank': 10,
      'long-matching': 10,
      'careful-reading': 10,
    });
    expect(foundationCounts).toMatchObject({
      'grammar-structure': 4,
      'cloze-choice': 4,
    });
  });

  it('publishes expanded original practice material for visible CET-4 training', () => {
    const carefulReadingQuestionCount = CET4_READING_BANK.reduce((sum, passage) => sum + passage.questions.length, 0);
    const coverageByType = Object.fromEntries(
      CET4_QUESTION_BANK_COVERAGE.map((item) => [item.questionTypeId, item.builtInCount]),
    );

    expect(CET4_VOCABULARY_BANK.length).toBeGreaterThanOrEqual(1_500);
    expect(CET4_LISTENING_PRACTICE_QUESTIONS.length).toBeGreaterThanOrEqual(1_000);
    expect(CET4_WORD_BANK_PRACTICE_QUESTIONS.length).toBeGreaterThanOrEqual(1_500);
    expect(CET4_LONG_MATCHING_PRACTICE_QUESTIONS.length).toBeGreaterThanOrEqual(1_000);
    expect(CET4_GRAMMAR_PRACTICE_QUESTIONS.length).toBeGreaterThanOrEqual(10);
    expect(CET4_CLOZE_PRACTICE_QUESTIONS.length).toBeGreaterThanOrEqual(1_500);
    expect(CET4_READING_BANK.length).toBeGreaterThanOrEqual(300);
    expect(CET4_READING_PRACTICE_QUESTIONS.length).toBeGreaterThanOrEqual(4_000);
    expect(carefulReadingQuestionCount).toBeGreaterThanOrEqual(1_200);
    expect(CET4_WRITING_PROMPT_BANK.length).toBeGreaterThanOrEqual(350);
    expect(CET4_TRANSLATION_PROMPT_BANK.length).toBeGreaterThanOrEqual(300);
    expect(CET4_MOCK_EXAM_BANK.length).toBeGreaterThanOrEqual(10);
    expect(coverageByType['cet4-core-vocabulary']).toBe(CET4_VOCABULARY_BANK.length);
    expect(coverageByType['word-bank']).toBe(
      CET4_READING_PRACTICE_QUESTIONS.filter((question) => question.questionTypeId === 'word-bank').length,
    );
    expect(coverageByType['long-matching']).toBe(
      CET4_READING_PRACTICE_QUESTIONS.filter((question) => question.questionTypeId === 'long-matching').length,
    );
    expect(coverageByType['grammar-structure']).toBe(CET4_GRAMMAR_PRACTICE_QUESTIONS.length);
    expect(coverageByType['cloze-choice']).toBe(CET4_CLOZE_PRACTICE_QUESTIONS.length);
    expect(coverageByType['short-essay']).toBe(CET4_WRITING_PROMPT_BANK.length);
    expect(coverageByType['paragraph-translation']).toBe(CET4_TRANSLATION_PROMPT_BANK.length);
  });

  it('adds a 2025 degree-English outline bank without incorrectly adding listening', () => {
    const degreeCoverageByType = Object.fromEntries(
      DEGREE_ENGLISH_QUESTION_BANK_COVERAGE.map((item) => [item.questionTypeId, item.builtInCount]),
    );
    const objectiveQuestionCount = DEGREE_ENGLISH_MOCK_EXAM.vocabularyStructure.length
      + DEGREE_ENGLISH_MOCK_EXAM.useOfEnglish.questions.length
      + DEGREE_ENGLISH_MOCK_EXAM.reading.traditionalQuestions.length
      + DEGREE_ENGLISH_MOCK_EXAM.reading.matchingQuestions.length;

    expect(DEGREE_ENGLISH_OUTLINE_2025.hasListening).toBe(false);
    expect(DEGREE_ENGLISH_OUTLINE_2025.plannedMinutes).toBe(120);
    expect(DEGREE_ENGLISH_OUTLINE_2025.totalScore).toBe(100);
    expect(DEGREE_ENGLISH_OUTLINE_2025.totalQuestionCount).toBe(67);
    expect(DEGREE_ENGLISH_MOCK_EXAM.totalQuestionCount).toBe(67);
    expect(DEGREE_ENGLISH_MOCK_EXAM.vocabularyStructure).toHaveLength(25);
    expect(DEGREE_ENGLISH_MOCK_EXAM.useOfEnglish.questions).toHaveLength(20);
    expect(DEGREE_ENGLISH_MOCK_EXAM.reading.traditionalQuestions).toHaveLength(15);
    expect(DEGREE_ENGLISH_MOCK_EXAM.reading.matchingQuestions).toHaveLength(5);
    expect(objectiveQuestionCount + 2).toBe(67);
    expect(DEGREE_ENGLISH_WRITING_PROMPT_BANK.filter((item) => item.id.startsWith('degree-practical-writing-')).length).toBeGreaterThanOrEqual(12);
    expect(DEGREE_ENGLISH_WRITING_PROMPT_BANK.filter((item) => item.id.startsWith('degree-summary-comment-')).length).toBeGreaterThanOrEqual(12);
    expect(degreeCoverageByType['vocabulary-structure']).toBe(DEGREE_ENGLISH_VOCABULARY_STRUCTURE_QUESTIONS.length);
    expect(degreeCoverageByType['cloze-choice']).toBe(DEGREE_ENGLISH_USE_OF_ENGLISH_QUESTIONS.length);
    expect(degreeCoverageByType['not-tested']).toBe(0);
  });

  it('keeps content identifiers unique so attempts and review evidence can be traced', () => {
    const vocabularyIds = CET4_VOCABULARY_BANK.map((item) => item.id);
    const vocabularyWords = CET4_VOCABULARY_BANK.map((item) => item.word);
    const passageIds = CET4_READING_BANK.map((passage) => passage.id);
    const readingQuestionIds = CET4_READING_BANK.flatMap((passage) => passage.questions.map((question) => question.id));
    const mockQuestionIds = [
      ...CET4_MOCK_EXAM_BANK.flatMap((paper) => paper.listening.questions.map((question) => `${paper.id}-${question.id}`)),
      ...CET4_MOCK_EXAM_BANK.flatMap((paper) => paper.reading.questions.map((question) => `${paper.id}-${question.id}`)),
      ...CET4_MOCK_EXAM_BANK.flatMap((paper) => paper.foundation.questions.map((question) => `${paper.id}-${question.id}`)),
    ];
    const readingPracticeQuestionIds = CET4_READING_PRACTICE_QUESTIONS.map((question) => question.id);
    const listeningPracticeQuestionIds = CET4_LISTENING_PRACTICE_QUESTIONS.map((question) => question.id);
    const degreeQuestionIds = [
      ...DEGREE_ENGLISH_MOCK_EXAM.vocabularyStructure.map((question) => question.id),
      ...DEGREE_ENGLISH_MOCK_EXAM.useOfEnglish.questions.map((question) => question.id),
      ...DEGREE_ENGLISH_MOCK_EXAM.reading.traditionalQuestions.map((question) => question.id),
      ...DEGREE_ENGLISH_MOCK_EXAM.reading.matchingQuestions.map((question) => question.id),
    ];

    expect(new Set(vocabularyIds).size).toBe(vocabularyIds.length);
    expect(new Set(vocabularyWords).size).toBe(vocabularyWords.length);
    expect(new Set(passageIds).size).toBe(passageIds.length);
    expect(new Set(readingQuestionIds).size).toBe(readingQuestionIds.length);
    expect(new Set(mockQuestionIds).size).toBe(mockQuestionIds.length);
    expect(new Set(readingPracticeQuestionIds).size).toBe(readingPracticeQuestionIds.length);
    expect(new Set(listeningPracticeQuestionIds).size).toBe(listeningPracticeQuestionIds.length);
    expect(new Set(degreeQuestionIds).size).toBe(degreeQuestionIds.length);
  });
});

function countBy<T>(items: T[], getKey: (item: T) => string) {
  return items.reduce<Record<string, number>>((accumulator, item) => {
    const key = getKey(item);
    accumulator[key] = (accumulator[key] ?? 0) + 1;
    return accumulator;
  }, {});
}
