import { ChoiceOption } from '../../types';

const DRAFT_KEY_PREFIX = 'english-training-cabin:practice-draft';

export type ChoiceConfidence = 'sure' | 'not_sure' | 'guess';
export type ListeningConfidence = 'Low' | 'Medium' | 'High';
export type SubjectiveDraftMode = 'writing' | 'translation';

export interface ChoicePracticeDraftAnswer {
  selected: ChoiceOption;
  correct: boolean;
  confidence: ChoiceConfidence;
}

export interface ReadingPracticeDraft {
  version: 1;
  passageId: string;
  startedAt: string;
  currentIdx: number;
  selectedOpt: ChoiceOption | null;
  confidence: ChoiceConfidence | null;
  isSubmitted: boolean;
  answers: ChoicePracticeDraftAnswer[];
  updatedAt: string;
}

export interface VocabularyPracticeDraft {
  version: 1;
  startedAt: string;
  packIndex: number;
  currentIdx: number;
  selectedOpt: ChoiceOption | null;
  confidence: ChoiceConfidence | null;
  isSubmitted: boolean;
  answers: ChoicePracticeDraftAnswer[];
  updatedAt: string;
}

export interface ListeningQuestionDraft {
  selectedAnswer?: ChoiceOption;
  confidence?: ListeningConfidence;
  isSubmitted?: boolean;
}

export interface ListeningPracticeDraft {
  version: 1;
  startedAt: string;
  currentQuestionIndex: number;
  answersByQuestionId: Record<string, ListeningQuestionDraft>;
  updatedAt: string;
}

export interface SubjectivePracticeDraft {
  version: 1;
  mode: SubjectiveDraftMode;
  startedAt: string;
  taskIndex: number;
  answer: string;
  updatedAt: string;
}

export const practiceDraftKeys = {
  reading: (passageId: string) => `${DRAFT_KEY_PREFIX}:reading:${passageId}`,
  vocabulary: `${DRAFT_KEY_PREFIX}:vocabulary`,
  listening: `${DRAFT_KEY_PREFIX}:listening-long-conversation`,
  subjective: (mode: SubjectiveDraftMode) => `${DRAFT_KEY_PREFIX}:subjective:${mode}`,
};

const canUseLocalStorage = () => {
  try {
    return typeof window !== 'undefined' && Boolean(window.localStorage);
  } catch {
    return false;
  }
};

export const clampDraftIndex = (index: number, length: number) => {
  if (length <= 0) return 0;
  if (!Number.isFinite(index)) return 0;
  return Math.min(Math.max(0, Math.floor(index)), length - 1);
};

export function loadPracticeDraft<T>(key: string): T | null {
  if (!canUseLocalStorage()) return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function savePracticeDraft<T extends { updatedAt?: string }>(key: string, draft: T) {
  if (!canUseLocalStorage()) return;
  try {
    window.localStorage.setItem(
      key,
      JSON.stringify({
        ...draft,
        updatedAt: new Date().toISOString(),
      }),
    );
  } catch {
    // Draft persistence is best-effort and must not block answering.
  }
}

export function clearPracticeDraft(key: string) {
  if (!canUseLocalStorage()) return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore storage cleanup failures.
  }
}

export function clearAllPracticeDrafts() {
  if (!canUseLocalStorage()) return;
  try {
    Object.keys(window.localStorage)
      .filter((key) => key.startsWith(DRAFT_KEY_PREFIX))
      .forEach((key) => window.localStorage.removeItem(key));
  } catch {
    // Ignore storage cleanup failures.
  }
}
