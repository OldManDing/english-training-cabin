import { Attempt, Passage, PracticeSession, Question } from '../../types';
import { CET4_VOCABULARY_BANK } from '../../data';

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

const PRACTICE_PROGRESS_MODULE_IDS = new Set<PracticeProgressModuleId>([
  'vocabulary',
  'cloze',
  'grammar',
  'reading',
  'listening',
  'writing',
  'translation',
  'mock',
]);

function isPracticeProgressModuleId(value: string): value is PracticeProgressModuleId {
  return PRACTICE_PROGRESS_MODULE_IDS.has(value as PracticeProgressModuleId);
}

export function findLatestPracticeAttempt(params: {
  attempts: Attempt[];
  moduleId: string;
  questionId: string | number;
}): Attempt | undefined {
  const questionId = String(params.questionId);
  return params.attempts
    .filter((attempt) => {
      const moduleMatches = isPracticeProgressModuleId(params.moduleId)
        ? matchesPracticeModuleAttempt(attempt, params.moduleId)
        : attempt.moduleId === params.moduleId;
      return moduleMatches && String(attempt.questionId) === questionId;
    })
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0];
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

const LEGACY_VOCABULARY_TARGET_IDS = CET4_VOCABULARY_BANK.slice(120, 130).map((item) => item.id);
const LEGACY_VOCABULARY_WRONG_IDS = CET4_VOCABULARY_BANK.slice(240, 255).map((item) => item.id);
const LEGACY_VOCABULARY_WRONG_ID_SET = new Set(LEGACY_VOCABULARY_WRONG_IDS);

function latestAttempt(left: Attempt | undefined, right: Attempt): Attempt {
  if (!left) return right;
  return right.createdAt.localeCompare(left.createdAt) >= 0 ? right : left;
}

function buildLegacyVocabularyRepairAttempt(source: Attempt, questionId: string): Attempt {
  return {
    ...source,
    id: `legacy-vocabulary-status-repair-${questionId}`,
    questionId,
    moduleId: 'vocabulary',
    questionTypeId: 'cet4-core-vocabulary',
  };
}

export function repairLegacyVocabularyStatusAttempts(attempts: Attempt[]): {
  attempts: Attempt[];
  changed: boolean;
  deleteAttemptIds: string[];
  putAttempts: Attempt[];
} {
  const existingVocabularyIds = new Set(
    attempts
      .filter((attempt) => matchesPracticeModuleAttempt(attempt, 'vocabulary'))
      .map((attempt) => String(attempt.questionId)),
  );
  const missingTargetIds = LEGACY_VOCABULARY_TARGET_IDS.filter((id) => !existingVocabularyIds.has(id));
  if (missingTargetIds.length === 0) {
    return { attempts, changed: false, deleteAttemptIds: [], putAttempts: [] };
  }

  const wrongAttempts = attempts.filter(
    (attempt) =>
      matchesPracticeModuleAttempt(attempt, 'vocabulary')
      && LEGACY_VOCABULARY_WRONG_ID_SET.has(String(attempt.questionId)),
  );
  const latestWrongAttemptByQuestionId = new Map<string, Attempt>();
  wrongAttempts.forEach((attempt) => {
    const questionId = String(attempt.questionId);
    latestWrongAttemptByQuestionId.set(
      questionId,
      latestAttempt(latestWrongAttemptByQuestionId.get(questionId), attempt),
    );
  });

  const hasLegacyWrongPrefix = LEGACY_VOCABULARY_WRONG_IDS
    .slice(0, LEGACY_VOCABULARY_TARGET_IDS.length)
    .every((id) => latestWrongAttemptByQuestionId.has(id));
  if (!hasLegacyWrongPrefix) {
    return { attempts, changed: false, deleteAttemptIds: [], putAttempts: [] };
  }

  const putAttempts = LEGACY_VOCABULARY_TARGET_IDS.flatMap((targetId, index) => {
    if (!missingTargetIds.includes(targetId)) return [];
    const source = latestWrongAttemptByQuestionId.get(LEGACY_VOCABULARY_WRONG_IDS[index]);
    return source ? [buildLegacyVocabularyRepairAttempt(source, targetId)] : [];
  });
  const deleteAttemptIds = wrongAttempts.map((attempt) => attempt.id);
  const deleteAttemptIdSet = new Set(deleteAttemptIds);

  return {
    attempts: [
      ...attempts.filter((attempt) => !deleteAttemptIdSet.has(attempt.id)),
      ...putAttempts,
    ],
    changed: deleteAttemptIds.length > 0 || putAttempts.length > 0,
    deleteAttemptIds,
    putAttempts,
  };
}

export function mergePracticeProgressAttempts(params: {
  persistedAttempts: Attempt[];
  draftAttempts?: Attempt[];
}): Attempt[] {
  const repairedPersistedAttempts = repairLegacyVocabularyStatusAttempts(params.persistedAttempts).attempts;
  const merged = [...repairedPersistedAttempts];
  const seen = new Set(repairedPersistedAttempts.map(buildProgressAttemptKey));

  (params.draftAttempts ?? []).forEach((attempt) => {
    const key = buildProgressAttemptKey(attempt);
    if (seen.has(key)) return;
    seen.add(key);
    merged.push(attempt);
  });

  return merged;
}

function localDateKey(date: Date): string | null {
  const time = date.getTime();
  if (!Number.isFinite(time)) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function countPracticeAttemptsOnLocalDate(
  attempts: Attempt[],
  referenceDate = new Date(),
): number {
  const referenceKey = localDateKey(referenceDate);
  if (!referenceKey) return 0;

  return attempts.filter((attempt) => {
    const attemptKey = localDateKey(new Date(attempt.createdAt));
    return attemptKey === referenceKey;
  }).length;
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

  const progressAttempts = repairLegacyVocabularyStatusAttempts(params.attempts).attempts;
  const moduleAttempts = progressAttempts.filter((attempt) => matchesPracticeModuleAttempt(attempt, params.moduleId));
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
