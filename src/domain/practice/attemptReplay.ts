import { Attempt, ChoiceOption } from '../../types';
import { ChoiceConfidence, ChoicePracticeDraftAnswer, ListeningConfidence, ListeningQuestionDraft } from './draftProgress';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function normalizeChoice(value: unknown): ChoiceOption | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toUpperCase();
  return ['A', 'B', 'C', 'D'].includes(normalized) ? normalized as ChoiceOption : null;
}

export function readAttemptChoice(answer: unknown): ChoiceOption | null {
  const direct = normalizeChoice(answer);
  if (direct) return direct;

  const record = asRecord(answer);
  if (!record) return null;
  return normalizeChoice(record.selected) ?? normalizeChoice(record.redoAnswer);
}

function toChoiceConfidence(confidence?: Attempt['confidence']): ChoiceConfidence {
  if (confidence === 5) return 'sure';
  if (confidence === 1 || confidence === 2) return 'guess';
  return 'not_sure';
}

function toListeningConfidence(confidence?: Attempt['confidence']): ListeningConfidence {
  if (confidence === 5 || confidence === 4) return 'High';
  if (confidence === 1 || confidence === 2) return 'Low';
  return 'Medium';
}

export function buildChoiceReplayAnswer(
  attempt: Attempt | undefined,
  correctAnswer: ChoiceOption,
): ChoicePracticeDraftAnswer | null {
  if (!attempt) return null;
  const selected = readAttemptChoice(attempt.answer);
  if (!selected) return null;

  return {
    selected,
    correct: typeof attempt.isCorrect === 'boolean' ? attempt.isCorrect : selected === correctAnswer,
    confidence: toChoiceConfidence(attempt.confidence),
  };
}

export function buildListeningReplayAnswer(attempt: Attempt | undefined): ListeningQuestionDraft | null {
  if (!attempt) return null;
  const selectedAnswer = readAttemptChoice(attempt.answer);
  if (!selectedAnswer) return null;

  return {
    selectedAnswer,
    confidence: toListeningConfidence(attempt.confidence),
    isSubmitted: true,
  };
}

export function readAttemptTextAnswer(attempt: Attempt | undefined): string {
  if (!attempt) return '';
  if (typeof attempt.answer === 'string') return attempt.answer;

  const record = asRecord(attempt.answer);
  if (!record) return '';
  const answer = record.answer ?? record.selected ?? record.redoAnswer;
  return typeof answer === 'string' ? answer : '';
}
