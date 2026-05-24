import { Passage, Question } from '../../types';

type SourceType = NonNullable<Question['sourceType']>;
type AnswerKey = Question['correctAnswer'];

const ANSWER_KEYS: AnswerKey[] = ['A', 'B', 'C', 'D'];
const SOURCE_TYPES: SourceType[] = ['original', 'user-imported', 'licensed', 'ai-generated'];

interface NormalizePassageOptions {
  defaultExamId?: string;
  defaultModuleId?: string;
  defaultQuestionTypeId?: string;
  defaultSourceType?: SourceType;
}

function assertRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function readRequiredString(record: Record<string, unknown>, field: string, maxLength: number): string {
  const value = record[field];
  if (typeof value !== 'string') {
    throw new Error(`${field} must be a string`);
  }

  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${field} is required`);
  }
  if (trimmed.length > maxLength) {
    throw new Error(`${field} is too long`);
  }

  return trimmed;
}

function readOptionalString(record: Record<string, unknown>, field: string, maxLength: number): string | undefined {
  const value = record[field];
  if (value == null || value === '') return undefined;
  if (typeof value !== 'string') {
    throw new Error(`${field} must be a string`);
  }

  const trimmed = value.trim();
  if (trimmed.length > maxLength) {
    throw new Error(`${field} is too long`);
  }
  return trimmed || undefined;
}

function normalizeAnswerKey(value: unknown, field: string): AnswerKey {
  if (typeof value !== 'string' || !ANSWER_KEYS.includes(value as AnswerKey)) {
    throw new Error(`${field} must be one of A, B, C, D`);
  }
  return value as AnswerKey;
}

function normalizeOptions(value: unknown, questionIndex: number): Question['options'] {
  const record = assertRecord(value, `questions[${questionIndex}].options`);
  return {
    A: readRequiredString(record, 'A', 500),
    B: readRequiredString(record, 'B', 500),
    C: readRequiredString(record, 'C', 500),
    D: readRequiredString(record, 'D', 500),
  };
}

function normalizeSourceType(value: unknown, fallback: SourceType): SourceType {
  if (typeof value === 'string' && SOURCE_TYPES.includes(value as SourceType)) {
    return value as SourceType;
  }
  return fallback;
}

function clampRange(start: number, end: number, max: number): [number, number] {
  const safeStart = Math.max(0, Math.min(start, max));
  const safeEnd = Math.max(safeStart, Math.min(end, max));
  return [safeStart, safeEnd];
}

function buildHighlightIndices(question: Record<string, unknown>, content: string): Question['highlightTextIndices'] | undefined {
  const existing = question.highlightTextIndices;
  if (existing && typeof existing === 'object') {
    const indices = existing as { correct?: unknown; distractor?: unknown };
    const correct = Array.isArray(indices.correct) ? indices.correct : undefined;
    const distractor = Array.isArray(indices.distractor) ? indices.distractor : undefined;
    if (correct?.length === 2 && correct.every((item) => Number.isFinite(Number(item)))) {
      const normalized: Question['highlightTextIndices'] = {
        correct: clampRange(Number(correct[0]), Number(correct[1]), content.length),
      };
      if (distractor?.length === 2 && distractor.every((item) => Number.isFinite(Number(item)))) {
        normalized.distractor = clampRange(Number(distractor[0]), Number(distractor[1]), content.length);
      }
      return normalized;
    }
  }

  const correctSentence = typeof question.correctSentence === 'string' ? question.correctSentence.trim() : '';
  if (!correctSentence) return undefined;

  const correctStart = content.indexOf(correctSentence);
  if (correctStart < 0) return undefined;

  const result: Question['highlightTextIndices'] = {
    correct: [correctStart, correctStart + correctSentence.length],
  };

  const distractorSentence = typeof question.distractorSentence === 'string' ? question.distractorSentence.trim() : '';
  if (distractorSentence) {
    const distractorStart = content.indexOf(distractorSentence);
    if (distractorStart >= 0) {
      result.distractor = [distractorStart, distractorStart + distractorSentence.length];
    }
  }

  return result;
}

function normalizeQuestion(
  value: unknown,
  index: number,
  content: string,
  options: Required<NormalizePassageOptions>,
): Question {
  const record = assertRecord(value, `questions[${index}]`);
  const id = typeof record.id === 'string' || typeof record.id === 'number' ? record.id : index + 1;
  const type = readOptionalString(record, 'type', 80) ?? readOptionalString(record, 'questionType', 80) ?? '细节理解';
  const sourceType = normalizeSourceType(record.sourceType, options.defaultSourceType);

  return {
    id,
    examId: readOptionalString(record, 'examId', 40) ?? options.defaultExamId,
    moduleId: readOptionalString(record, 'moduleId', 40) ?? options.defaultModuleId,
    questionTypeId: readOptionalString(record, 'questionTypeId', 80) ?? options.defaultQuestionTypeId,
    question: readRequiredString(record, 'question', 1000),
    options: normalizeOptions(record.options, index),
    correctAnswer: normalizeAnswerKey(record.correctAnswer, `questions[${index}].correctAnswer`),
    explanation: readOptionalString(record, 'explanation', 3000) ?? '已导入题目，建议补充详细解析以提升复习质量。',
    type,
    tags: Array.isArray(record.tags) ? record.tags.filter((tag): tag is string => typeof tag === 'string') : [type],
    difficulty: [1, 2, 3, 4, 5].includes(Number(record.difficulty))
      ? (Number(record.difficulty) as Question['difficulty'])
      : 3,
    sourceType,
    highlightTextIndices: buildHighlightIndices(record, content),
    correctSentence: readOptionalString(record, 'correctSentence', 1200),
    distractorSentence: readOptionalString(record, 'distractorSentence', 1200),
  };
}

export function normalizePassage(value: unknown, normalizeOptionsInput: NormalizePassageOptions = {}): Passage {
  const record = assertRecord(value, 'passage');
  const content = readRequiredString(record, 'content', 20000);
  const options: Required<NormalizePassageOptions> = {
    defaultExamId: normalizeOptionsInput.defaultExamId ?? 'cet4',
    defaultModuleId: normalizeOptionsInput.defaultModuleId ?? 'reading',
    defaultQuestionTypeId: normalizeOptionsInput.defaultQuestionTypeId ?? 'careful-reading',
    defaultSourceType: normalizeOptionsInput.defaultSourceType ?? 'user-imported',
  };

  if (!Array.isArray(record.questions) || record.questions.length === 0) {
    throw new Error('questions must contain at least one question');
  }
  if (record.questions.length > 50) {
    throw new Error('questions cannot contain more than 50 questions');
  }

  return {
    id: readOptionalString(record, 'id', 120) ?? `passage-${Date.now()}`,
    examId: readOptionalString(record, 'examId', 40) ?? options.defaultExamId,
    moduleId: readOptionalString(record, 'moduleId', 40) ?? options.defaultModuleId,
    title: readRequiredString(record, 'title', 300),
    content,
    questions: record.questions.map((question, index) => normalizeQuestion(question, index, content, options)),
  };
}
