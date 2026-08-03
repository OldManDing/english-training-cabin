import { CET4_OUTPUT_PHRASE_BANK, CET4_VOCABULARY_BANK } from '../src/data';
import {
  CET4_CLOZE_PRACTICE_QUESTIONS,
  CET4_GRAMMAR_PRACTICE_QUESTIONS,
  CET4_LISTENING_PRACTICE_QUESTIONS,
  CET4_READING_BANK,
  CET4_TRANSLATION_PROMPT_BANK,
  CET4_WRITING_PROMPT_BANK,
  DEGREE_ENGLISH_MOCK_EXAM,
  DEGREE_ENGLISH_VOCABULARY_STRUCTURE_QUESTIONS,
} from '../src/questionBank';
import { getListeningChineseSupport, getReadingChineseSupport } from '../src/domain/practice/chineseSupport';
import { getVocabularySentenceSupport } from '../src/domain/practice/sentenceTranslations';

const forbiddenChineseMeaning = [
  /暂缺/u,
  /请以英文原句/u,
  /重点理解/u,
  /可译为/u,
  /写作中比/u,
];

function collectStrings(value: unknown, output: string[] = []): string[] {
  if (typeof value === 'string') {
    output.push(value);
  } else if (Array.isArray(value)) {
    value.forEach((entry) => collectStrings(entry, output));
  } else if (value && typeof value === 'object') {
    Object.values(value as Record<string, unknown>).forEach((entry) => collectStrings(entry, output));
  }
  return output;
}

const vocabularySupport = CET4_VOCABULARY_BANK.map((item) => ({
  item,
  support: getVocabularySentenceSupport(item),
}));
const outputPhraseSupport = CET4_OUTPUT_PHRASE_BANK.map((item) => ({
  item,
  support: getVocabularySentenceSupport(item),
}));
const readingQuestions = CET4_READING_BANK.flatMap((passage) =>
  passage.questions.map((question) => ({ passage, question })),
);
const clozeAnswerLeaks = CET4_CLOZE_PRACTICE_QUESTIONS
  .filter((question) => /(?:collocation|sentence-logic)/u.test(question.id))
  .filter((question) => {
    const answer = question.options[question.correctAnswer];
    if (!/^[A-Za-z-]+$/u.test(answer)) return false;
    const taskText = question.prompt.slice(question.prompt.lastIndexOf(':') + 1);
    const escaped = answer.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
    return new RegExp(`\\b${escaped}\\b`, 'iu').test(taskText);
  });
const learnerFacingEnglish = [
  ...CET4_VOCABULARY_BANK.flatMap((item) => [item.word, item.collocation, item.example]),
  ...CET4_OUTPUT_PHRASE_BANK.flatMap((item) => [item.word, item.collocation, item.example]),
  ...CET4_READING_BANK.flatMap((passage) => [
    passage.title,
    passage.content,
    ...passage.questions.flatMap((question) => [
      question.question,
      question.correctSentence,
      ...Object.values(question.options),
    ]),
  ]),
  ...CET4_LISTENING_PRACTICE_QUESTIONS.flatMap((question) => [
    question.prompt,
    question.correctSentence,
    ...Object.values(question.options),
  ]),
  ...CET4_GRAMMAR_PRACTICE_QUESTIONS.flatMap((question) => [
    question.prompt,
    question.correctSentence,
    ...Object.values(question.options),
  ]),
  ...CET4_CLOZE_PRACTICE_QUESTIONS.flatMap((question) => [
    question.prompt,
    question.correctSentence,
    ...Object.values(question.options),
  ]),
  ...CET4_WRITING_PROMPT_BANK.flatMap((prompt) => [prompt.prompt, prompt.sampleAnswer]),
  ...CET4_TRANSLATION_PROMPT_BANK.map((prompt) => prompt.sampleAnswer),
  ...DEGREE_ENGLISH_VOCABULARY_STRUCTURE_QUESTIONS.flatMap((question) => [
    question.prompt,
    question.correctSentence ?? '',
    ...Object.values(question.options),
  ]),
  ...collectStrings(DEGREE_ENGLISH_MOCK_EXAM).filter((text) =>
    /[A-Za-z]/u.test(text) && !/[\u3400-\u9fff]/u.test(text),
  ),
].filter(Boolean);
const readingChineseFallbacks = readingQuestions.filter(({ passage, question }) =>
  (getReadingChineseSupport(passage.id, question)?.question ?? '')
    .includes('正确答案和定位解析提交后显示'),
);
const listeningChineseFallbacks = CET4_LISTENING_PRACTICE_QUESTIONS.filter((question) =>
  (getListeningChineseSupport({ prompt: question.prompt, options: question.options })?.question ?? '')
    .includes('正确答案和听力原句译文提交后显示'),
);

const report = {
  coverage: {
    vocabulary: CET4_VOCABULARY_BANK.length,
    outputPhrases: CET4_OUTPUT_PHRASE_BANK.length,
    readingPassages: CET4_READING_BANK.length,
    readingQuestions: readingQuestions.length,
    listening: CET4_LISTENING_PRACTICE_QUESTIONS.length,
    grammar: CET4_GRAMMAR_PRACTICE_QUESTIONS.length,
    cloze: CET4_CLOZE_PRACTICE_QUESTIONS.length,
    writing: CET4_WRITING_PROMPT_BANK.length,
    translation: CET4_TRANSLATION_PROMPT_BANK.length,
    degreeVocabularyStructure: DEGREE_ENGLISH_VOCABULARY_STRUCTURE_QUESTIONS.length,
    learnerFacingEnglishStrings: learnerFacingEnglish.length,
  },
  anomalies: {
    vocabularyMissingMeaning: vocabularySupport.filter(({ support }) => !support.chineseMeaning.trim()).length,
    vocabularyPlaceholderMeaning: vocabularySupport.filter(({ support }) =>
      forbiddenChineseMeaning.some((pattern) => pattern.test(support.chineseMeaning)),
    ).length,
    outputPhraseMissingMeaning: outputPhraseSupport.filter(({ support }) => !support.chineseMeaning.trim()).length,
    outputPhrasePlaceholderMeaning: outputPhraseSupport.filter(({ support }) =>
      forbiddenChineseMeaning.some((pattern) => pattern.test(support.chineseMeaning)),
    ).length,
    duplicateEnglishWords: learnerFacingEnglish.filter((text) => /\b([A-Za-z]+)\s+\1\b/iu.test(text)).length,
    clozeAnswerLeaks: clozeAnswerLeaks.length,
    readingChineseFallbacks: readingChineseFallbacks.length,
    listeningChineseFallbacks: listeningChineseFallbacks.length,
    grammarMetadataLeaks: CET4_GRAMMAR_PRACTICE_QUESTIONS.filter((question) =>
      /\([^)]*\|[^)]*\)$/u.test(question.correctSentence),
    ).length,
    readingChineseInsideEnglishFields: CET4_READING_BANK.flatMap((passage) => [
      passage.content,
      ...passage.questions.flatMap((question) => [
        question.question,
        question.correctSentence,
        ...Object.values(question.options),
      ]),
    ]).filter((text) => /[\u3400-\u9fff]/u.test(text)).length,
  },
};

console.log(JSON.stringify(report, null, 2));

if (Object.values(report.anomalies).some((count) => count > 0)) {
  process.exitCode = 1;
}
