import { CET4_VOCABULARY_BANK, INITIAL_PASSAGE } from '../../data';
import {
  CET4_CAREFUL_READING_PRACTICE_QUESTIONS,
  CET4_CLOZE_PRACTICE_QUESTIONS,
  CET4_GRAMMAR_PRACTICE_QUESTIONS,
  CET4_LISTENING_PRACTICE_QUESTIONS,
  CET4_LONG_MATCHING_PRACTICE_QUESTIONS,
  CET4_MOCK_EXAM_BANK,
  CET4_READING_BANK,
  CET4_WORD_BANK_PRACTICE_QUESTIONS,
  CET4_TRANSLATION_PROMPT_BANK,
  CET4_WRITING_PROMPT_BANK,
  type Cet4MockChoiceQuestion,
} from '../../questionBank';
import { Attempt, ChoiceOption, Passage, PracticeSession } from '../../types';
import { getReadingChineseSupport, getListeningChineseSupport } from './chineseSupport';
import { getQuestionSentenceSupport, getVocabularyQuestionSupport, getVocabularySentenceSupport } from './sentenceTranslations';

export interface AnsweredQuestionSnapshot {
  id: string;
  moduleId: string;
  questionTypeId: string;
  title: string;
  sourceLabel: string;
  prompt: string;
  promptTranslation?: string;
  context?: string;
  contextTranslation?: string;
  options?: Partial<Record<ChoiceOption, string>>;
  optionTranslations?: Partial<Record<ChoiceOption, string>>;
  correctAnswer?: string;
  explanation?: string;
  sampleAnswer?: string;
}

export interface AnsweredQuestionHistoryItem {
  id: string;
  attempt: Attempt;
  session?: PracticeSession;
  snapshot: AnsweredQuestionSnapshot;
  moduleLabel: string;
  questionTypeLabel: string;
  answerText: string;
  createdAt: string;
  searchText: string;
}

export const ANSWERED_HISTORY_PAGE_SIZE = 10;

export interface PaginatedAnsweredQuestionHistory<T> {
  items: T[];
  page: number;
  pageSize: number;
  pageCount: number;
  totalCount: number;
  startIndex: number;
  endIndex: number;
}

export function paginateAnsweredQuestionHistory<T>(
  items: T[],
  page: number,
  pageSize = ANSWERED_HISTORY_PAGE_SIZE,
): PaginatedAnsweredQuestionHistory<T> {
  const normalizedPageSize = Math.max(1, Math.floor(pageSize));
  const totalCount = items.length;
  const pageCount = Math.max(1, Math.ceil(totalCount / normalizedPageSize));
  const normalizedPage = Math.min(
    pageCount,
    Math.max(1, Number.isFinite(page) ? Math.floor(page) : 1),
  );
  const startOffset = (normalizedPage - 1) * normalizedPageSize;
  const pagedItems = items.slice(startOffset, startOffset + normalizedPageSize);

  return {
    items: pagedItems,
    page: normalizedPage,
    pageSize: normalizedPageSize,
    pageCount,
    totalCount,
    startIndex: totalCount === 0 ? 0 : startOffset + 1,
    endIndex: Math.min(totalCount, startOffset + pagedItems.length),
  };
}

type SnapshotIndex = Map<string, AnsweredQuestionSnapshot>;

const MODULE_LABELS: Record<string, string> = {
  vocabulary: '词汇',
  grammar: '语法',
  reading: '阅读',
  listening: '听力',
  writing: '写作',
  translation: '翻译',
  speaking: '口语',
  review: '复习',
  mock: '模考',
};

const QUESTION_TYPE_LABELS: Record<string, string> = {
  'cet4-core-vocabulary': '词义辨析',
  'careful-reading': '仔细阅读',
  'word-bank': '选词填空',
  'long-matching': '长篇匹配',
  'short-news': '短篇新闻',
  'long-conversation': '长对话',
  'listening-passage': '听力篇章',
  'grammar-structure': '语法结构',
  'cloze-choice': '完形填空',
  'short-essay': '短文写作',
  'paragraph-translation': '段落翻译',
  'cet4-standard-mock': '阶段模考',
  'wrong-question-redo-active-recall': '错题重做',
  'active-recall-cloze-production': '主动回忆',
};

function indexKey(moduleId: string, questionId: string): string {
  return `${moduleId}:${questionId}`;
}

function putSnapshot(index: SnapshotIndex, snapshot: AnsweredQuestionSnapshot) {
  index.set(indexKey(snapshot.moduleId, snapshot.id), snapshot);
  index.set(indexKey('*', snapshot.id), snapshot);
}

function toOptionTranslationRecord(
  items: Array<{ key: ChoiceOption; chineseMeaning: string }>,
): Partial<Record<ChoiceOption, string>> {
  return items.reduce<Partial<Record<ChoiceOption, string>>>((result, item) => {
    if (item.chineseMeaning.trim()) {
      result[item.key] = item.chineseMeaning;
    }
    return result;
  }, {});
}

function putPassage(index: SnapshotIndex, passage: Passage) {
  passage.questions.forEach((question) => {
    const moduleId = question.moduleId ?? passage.moduleId ?? 'reading';
    const chineseSupport = getReadingChineseSupport(passage.id, question);
    putSnapshot(index, {
      id: String(question.id),
      moduleId,
      questionTypeId: question.questionTypeId ?? 'careful-reading',
      title: question.type || passage.title,
      sourceLabel: passage.title,
      prompt: question.question,
      promptTranslation: chineseSupport?.question,
      context: passage.content,
      contextTranslation: chineseSupport?.context ?? passage.chineseSupport?.context,
      options: question.options,
      optionTranslations: chineseSupport?.options,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation,
    });
  });
}

function putMockChoice(index: SnapshotIndex, question: Cet4MockChoiceQuestion, sourceLabel: string) {
  const chineseSupport = question.moduleId === 'listening'
    ? getListeningChineseSupport({
      prompt: question.prompt,
      options: question.options,
    })
    : getReadingChineseSupport(question.id, {
      id: question.id,
      examId: 'cet4',
      moduleId: question.moduleId,
      questionTypeId: question.questionTypeId,
      question: question.prompt,
      options: question.options,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation,
      type: question.title,
      correctSentence: question.correctSentence,
    });
  const sentenceSupport = getQuestionSentenceSupport({
    sentence: question.correctSentence,
    explanation: question.explanation,
  });

  putSnapshot(index, {
    id: question.id,
    moduleId: question.moduleId,
    questionTypeId: question.questionTypeId,
    title: question.title,
    sourceLabel,
    prompt: question.prompt,
    promptTranslation: chineseSupport?.question,
    context: question.correctSentence,
    contextTranslation: chineseSupport?.context ?? sentenceSupport?.chineseMeaning,
    options: question.options,
    optionTranslations: chineseSupport?.options,
    correctAnswer: question.correctAnswer,
    explanation: question.explanation,
  });
}

export function getQuestionTypeLabel(questionTypeId: string): string {
  return QUESTION_TYPE_LABELS[questionTypeId] ?? questionTypeId;
}

export function getModuleLabel(moduleId: string, session?: PracticeSession): string {
  const base = MODULE_LABELS[moduleId] ?? moduleId;
  if (session?.moduleId === 'mock' && moduleId !== 'mock') return `模考 · ${base}`;
  return base;
}

export function buildAnsweredQuestionSnapshotIndex(): SnapshotIndex {
  const index: SnapshotIndex = new Map();

  CET4_VOCABULARY_BANK.forEach((item) => {
    const sentenceSupport = getVocabularySentenceSupport(item);
    const questionSupport = getVocabularyQuestionSupport(item);
    putSnapshot(index, {
      id: item.id,
      moduleId: 'vocabulary',
      questionTypeId: 'cet4-core-vocabulary',
      title: item.word,
      sourceLabel: '词汇听音',
      prompt: `${item.word} ${item.phonetic}: ${item.example}`,
      promptTranslation: `词义：${item.meaning}；例句：${sentenceSupport.chineseMeaning}`,
      context: item.collocation,
      contextTranslation: questionSupport.prompt.chineseMeaning,
      options: item.options,
      optionTranslations: toOptionTranslationRecord(questionSupport.optionTranslations),
      correctAnswer: item.correctAnswer,
      explanation: item.explanation,
    });
  });

  [INITIAL_PASSAGE, ...CET4_READING_BANK].forEach((passage) => putPassage(index, passage));
  [
    ...CET4_WORD_BANK_PRACTICE_QUESTIONS,
    ...CET4_LONG_MATCHING_PRACTICE_QUESTIONS,
    ...CET4_CAREFUL_READING_PRACTICE_QUESTIONS,
    ...CET4_LISTENING_PRACTICE_QUESTIONS,
    ...CET4_GRAMMAR_PRACTICE_QUESTIONS,
    ...CET4_CLOZE_PRACTICE_QUESTIONS,
  ].forEach((question) => putMockChoice(index, question, question.title));

  CET4_MOCK_EXAM_BANK.forEach((paper) => {
    [...paper.listening.questions, ...paper.reading.questions].forEach((question) => putMockChoice(index, question, paper.title));
    putSnapshot(index, {
      id: `${paper.id}-writing`,
      moduleId: 'writing',
      questionTypeId: 'short-essay',
      title: '写作',
      sourceLabel: paper.title,
      prompt: paper.writing.prompt,
      correctAnswer: '参考范文',
      sampleAnswer: paper.writing.sampleAnswer,
    });
    putSnapshot(index, {
      id: `${paper.id}-translation`,
      moduleId: 'translation',
      questionTypeId: 'paragraph-translation',
      title: '翻译',
      sourceLabel: paper.title,
      prompt: paper.translation.prompt,
      correctAnswer: '参考译文',
      sampleAnswer: paper.translation.sampleAnswer,
    });
  });

  CET4_WRITING_PROMPT_BANK.forEach((prompt) => {
    putSnapshot(index, {
      id: prompt.id,
      moduleId: 'writing',
      questionTypeId: prompt.questionTypeId,
      title: prompt.title,
      sourceLabel: '写作专项',
      prompt: prompt.prompt,
      correctAnswer: '参考范文',
      sampleAnswer: prompt.sampleAnswer,
    });
  });

  CET4_TRANSLATION_PROMPT_BANK.forEach((prompt) => {
    putSnapshot(index, {
      id: prompt.id,
      moduleId: 'translation',
      questionTypeId: prompt.questionTypeId,
      title: prompt.title,
      sourceLabel: '翻译专项',
      prompt: prompt.prompt,
      correctAnswer: '参考译文',
      sampleAnswer: prompt.sampleAnswer,
    });
  });

  return index;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function readString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function formatPrimitiveAnswer(answer: unknown): string {
  if (answer === null || answer === undefined || answer === '') return '未作答';
  if (typeof answer === 'string' || typeof answer === 'number' || typeof answer === 'boolean') return String(answer);
  return JSON.stringify(answer);
}

export function formatAttemptAnswer(answer: unknown): string {
  const record = asRecord(answer);
  if (!record) return formatPrimitiveAnswer(answer);

  const redoAnswer = readString(record, 'redoAnswer');
  const recallAnswer = readString(record, 'recallAnswer');
  const clozeAnswer = readString(record, 'clozeAnswer');
  const productionAnswer = readString(record, 'productionAnswer');
  const selected = readString(record, 'selected');

  const sections = [
    redoAnswer ? `重做：${redoAnswer}` : null,
    selected ? `选择：${selected}` : null,
    recallAnswer ? `错因回忆：${recallAnswer}` : null,
    clozeAnswer ? `填空：${clozeAnswer}` : null,
    productionAnswer ? `迁移表达：${productionAnswer}` : null,
  ].filter((item): item is string => Boolean(item));

  return sections.length > 0 ? sections.join('\n') : formatPrimitiveAnswer(answer);
}

function resolveReviewSnapshot(attempt: Attempt): AnsweredQuestionSnapshot | null {
  const answer = asRecord(attempt.answer);
  if (!answer) return null;

  const redoPrompt = readString(answer, 'redoPrompt');
  const productionPrompt = readString(answer, 'productionPrompt');
  if (!redoPrompt && !productionPrompt) return null;

  return {
    id: attempt.questionId,
    moduleId: attempt.moduleId,
    questionTypeId: attempt.questionTypeId,
    title: getQuestionTypeLabel(attempt.questionTypeId),
    sourceLabel: '复习队列',
    prompt: redoPrompt ?? productionPrompt ?? '复习记录',
    correctAnswer: readString(answer, 'referenceRedoAnswer'),
    explanation: readString(answer, 'referenceRecallAnswer'),
  };
}

function buildFallbackSnapshot(attempt: Attempt): AnsweredQuestionSnapshot {
  const moduleLabel = getModuleLabel(attempt.moduleId);
  return {
    id: attempt.questionId,
    moduleId: attempt.moduleId,
    questionTypeId: attempt.questionTypeId,
    title: `${moduleLabel}作答`,
    sourceLabel: getQuestionTypeLabel(attempt.questionTypeId),
    prompt: '旧记录未保存完整题干快照',
    explanation: attempt.aiFeedback?.comments.join('\n'),
  };
}

function findSnapshot(
  index: SnapshotIndex,
  attempt: Attempt,
  session?: PracticeSession,
): AnsweredQuestionSnapshot {
  return index.get(indexKey(attempt.moduleId, attempt.questionId))
    ?? (session ? index.get(indexKey(session.moduleId, attempt.questionId)) : undefined)
    ?? index.get(indexKey('*', attempt.questionId))
    ?? resolveReviewSnapshot(attempt)
    ?? buildFallbackSnapshot(attempt);
}

export function buildAnsweredQuestionHistory(params: {
  attempts: Attempt[];
  sessions?: PracticeSession[];
  index?: SnapshotIndex;
}): AnsweredQuestionHistoryItem[] {
  const index = params.index ?? buildAnsweredQuestionSnapshotIndex();
  const sessionsById = new Map((params.sessions ?? []).map((session) => [session.id, session]));

  return [...params.attempts]
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .map((attempt) => {
      const session = sessionsById.get(attempt.sessionId);
      const snapshot = findSnapshot(index, attempt, session);
      const answerText = formatAttemptAnswer(attempt.answer);
      const moduleLabel = getModuleLabel(attempt.moduleId, session);
      const questionTypeLabel = getQuestionTypeLabel(attempt.questionTypeId);
      const searchText = [
        moduleLabel,
        questionTypeLabel,
        snapshot.title,
        snapshot.sourceLabel,
        snapshot.prompt,
        snapshot.promptTranslation,
        snapshot.context,
        snapshot.contextTranslation,
        snapshot.correctAnswer,
        snapshot.explanation,
        snapshot.sampleAnswer,
        answerText,
        ...Object.values(snapshot.options ?? {}),
        ...Object.values(snapshot.optionTranslations ?? {}),
      ].filter(Boolean).join(' ').toLowerCase();

      return {
        id: attempt.id,
        attempt,
        session,
        snapshot,
        moduleLabel,
        questionTypeLabel,
        answerText,
        createdAt: attempt.createdAt,
        searchText,
      };
    });
}
