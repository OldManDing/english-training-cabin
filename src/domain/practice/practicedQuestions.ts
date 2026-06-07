import { Attempt, Passage, PracticeSession, Question } from '../../types';

type QuestionIdentity = Pick<Question, 'id' | 'moduleId'>;
export type PracticeProgressModuleId = 'vocabulary' | 'cloze' | 'grammar' | 'reading' | 'listening' | 'writing' | 'translation' | 'mock';

export interface PracticeModuleProgress {
  practiced: number;
  total: number;
  remaining: number;
}

export type PracticeModuleTotals = Record<PracticeProgressModuleId, number>;

export interface PracticeQuestionDescriptor {
  id: string | number;
  moduleId?: string;
  questionTypeId?: string;
  label?: string;
  groupLabel?: string;
}

export interface PracticeQuestionStatusItem {
  id: string;
  number: number;
  label: string;
  groupLabel?: string;
  practiced: boolean;
}

export function matchesPracticeModuleAttempt(attempt: Attempt, moduleId: PracticeProgressModuleId): boolean {
  const questionTypeId = attempt.questionTypeId.toLowerCase();
  if (moduleId === 'cloze') return attempt.moduleId === 'grammar' && questionTypeId.includes('cloze');
  if (moduleId === 'grammar') return attempt.moduleId === 'grammar' && !questionTypeId.includes('cloze');
  return attempt.moduleId === moduleId;
}

export function getPracticedQuestionIds(attempts: Attempt[], moduleId: string): Set<string> {
  return new Set(
    attempts
      .filter((attempt) => attempt.moduleId === moduleId)
      .map((attempt) => String(attempt.questionId)),
  );
}

export function filterUnpracticedItems<T extends { id: string | number }>(
  items: T[],
  attempts: Attempt[],
  moduleId: string,
): T[] {
  const practicedIds = getPracticedQuestionIds(attempts, moduleId);
  if (practicedIds.size === 0) return items;

  const unpracticedItems = items.filter((item) => !practicedIds.has(String(item.id)));
  return unpracticedItems.length > 0 ? unpracticedItems : items;
}

function isPracticedQuestion(
  attempts: Attempt[],
  question: QuestionIdentity,
  fallbackModuleId: string,
): boolean {
  const questionId = String(question.id);
  const moduleId = question.moduleId ?? fallbackModuleId;
  return attempts.some((attempt) => attempt.moduleId === moduleId && attempt.questionId === questionId);
}

export function filterPassageForUnpracticedQuestions(
  passage: Passage,
  attempts: Attempt[],
): Passage | null {
  const fallbackModuleId = passage.moduleId ?? 'reading';
  const questions = passage.questions.filter(
    (question) => !isPracticedQuestion(attempts, question, fallbackModuleId),
  );

  if (questions.length === 0) return null;
  if (questions.length === passage.questions.length) return passage;
  return { ...passage, questions };
}

export function buildUnpracticedReadingPassages(passages: Passage[], attempts: Attempt[]): Passage[] {
  const unpracticedPassages = passages
    .map((passage) => filterPassageForUnpracticedQuestions(passage, attempts))
    .filter((passage): passage is Passage => Boolean(passage));

  return unpracticedPassages.length > 0 ? unpracticedPassages : passages;
}

function buildProgressAttemptKey(attempt: Pick<Attempt, 'moduleId' | 'questionId'>): string {
  return `${attempt.moduleId}:${attempt.questionId}`;
}

export function mergePracticeProgressAttempts(params: {
  persistedAttempts: Attempt[];
  draftAttempts?: Attempt[];
}): Attempt[] {
  const merged = [...params.persistedAttempts];
  const seen = new Set(params.persistedAttempts.map(buildProgressAttemptKey));

  (params.draftAttempts ?? []).forEach((attempt) => {
    const key = buildProgressAttemptKey(attempt);
    if (seen.has(key)) return;
    seen.add(key);
    merged.push(attempt);
  });

  return merged;
}

function countPracticedItems(params: {
  attempts: Attempt[];
  sessions: PracticeSession[];
  moduleId: PracticeProgressModuleId;
}): number {
  if (params.moduleId === 'mock') {
    return new Set(
      params.sessions
        .filter((session) => session.moduleId === 'mock' || session.modeId.toLowerCase().includes('mock'))
        .map((session) => session.id),
    ).size;
  }

  const matchedAttempts = params.attempts.filter((attempt) => matchesPracticeModuleAttempt(attempt, params.moduleId));
  if (params.moduleId === 'writing' || params.moduleId === 'translation') {
    return matchedAttempts.length;
  }

  return new Set(matchedAttempts.map((attempt) => String(attempt.questionId))).size;
}

export function buildPracticeModuleProgress(params: {
  attempts: Attempt[];
  sessions?: PracticeSession[];
  totals: PracticeModuleTotals;
}): Map<PracticeProgressModuleId, PracticeModuleProgress> {
  const result = new Map<PracticeProgressModuleId, PracticeModuleProgress>();

  (Object.keys(params.totals) as PracticeProgressModuleId[]).forEach((moduleId) => {
    const total = params.totals[moduleId];
    const practiced = Math.min(
      countPracticedItems({
        attempts: params.attempts,
        sessions: params.sessions ?? [],
        moduleId,
      }),
      total,
    );

    result.set(moduleId, {
      practiced,
      total,
      remaining: Math.max(0, total - practiced),
    });
  });

  return result;
}

function countCompletedMockSessions(sessions: PracticeSession[]): number {
  return new Set(
    sessions
      .filter((session) => session.moduleId === 'mock' || session.modeId.toLowerCase().includes('mock'))
      .map((session) => session.id),
  ).size;
}

export function buildPracticeQuestionStatusList(params: {
  attempts: Attempt[];
  sessions?: PracticeSession[];
  moduleId: PracticeProgressModuleId;
  questions: PracticeQuestionDescriptor[];
}): PracticeQuestionStatusItem[] {
  if (params.moduleId === 'mock') {
    const completedMockCount = countCompletedMockSessions(params.sessions ?? []);
    return params.questions.map((question, index) => ({
      id: String(question.id),
      number: index + 1,
      label: question.label ?? String(index + 1),
      groupLabel: question.groupLabel,
      practiced: index < completedMockCount,
    }));
  }

  const moduleAttempts = params.attempts.filter((attempt) => matchesPracticeModuleAttempt(attempt, params.moduleId));
  const questionIds = new Set(params.questions.map((question) => String(question.id)));
  const practicedIds = new Set(moduleAttempts.map((attempt) => String(attempt.questionId)));
  let legacySubjectiveCount = 0;

  if (params.moduleId === 'writing' || params.moduleId === 'translation') {
    legacySubjectiveCount = moduleAttempts.filter((attempt) => !questionIds.has(String(attempt.questionId))).length;
  }

  return params.questions.map((question, index) => {
    const exactPracticed = practicedIds.has(String(question.id));
    const legacyPracticed = !exactPracticed && legacySubjectiveCount > 0;
    if (legacyPracticed) legacySubjectiveCount -= 1;

    return {
      id: String(question.id),
      number: index + 1,
      label: question.label ?? String(index + 1),
      groupLabel: question.groupLabel,
      practiced: exactPracticed || legacyPracticed,
    };
  });
}
