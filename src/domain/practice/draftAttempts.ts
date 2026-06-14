import { CET4_VOCABULARY_BANK, VOCABULARY_SESSION_SIZE } from '../../data';
import {
  CET4_CLOZE_PRACTICE_QUESTIONS,
  CET4_GRAMMAR_PRACTICE_QUESTIONS,
  CET4_LISTENING_PRACTICE_QUESTIONS,
  CET4_READING_BANK,
} from '../../questionBank';
import { Attempt, ChoiceOption, Passage } from '../../types';
import {
  loadPracticeDraft,
  practiceDraftKeys,
  type ChoiceConfidence,
  type ListeningConfidence,
  type ListeningPracticeDraft,
  type ReadingPracticeDraft,
  type VocabularyPracticeDraft,
} from './draftProgress';
import {
  filterUnpracticedItems,
  matchesPracticeModuleAttempt,
  type PracticeProgressModuleId,
} from './practicedQuestions';

const GRAMMAR_DRAFT_PASSAGE_ID = 'cet4-grammar-structure-practice';
const CLOZE_DRAFT_PASSAGE_ID = 'cet4-cloze-context-practice';
const LONG_CONVERSATION_QUESTIONS = CET4_LISTENING_PRACTICE_QUESTIONS
  .filter((question) => question.questionTypeId === 'long-conversation');
const LISTENING_DRAFT_QUESTION_IDS = new Set(
  LONG_CONVERSATION_QUESTIONS.map((_, index) => String(index + 1)),
);

function confidenceScore(confidence?: ChoiceConfidence | ListeningConfidence): Attempt['confidence'] {
  if (confidence === 'sure' || confidence === 'High') return 5;
  if (confidence === 'guess' || confidence === 'Low') return 1;
  if (confidence === 'not_sure' || confidence === 'Medium') return 3;
  return undefined;
}

function createDraftAttempt(params: {
  moduleId: string;
  questionTypeId: string;
  questionId: string;
  answer?: ChoiceOption | string;
  isCorrect?: boolean;
  confidence?: Attempt['confidence'];
  createdAt?: string;
}): Attempt {
  return {
    id: `draft-${params.moduleId}-${params.questionId}`,
    sessionId: `draft-${params.moduleId}`,
    questionId: params.questionId,
    examId: 'cet4',
    moduleId: params.moduleId,
    questionTypeId: params.questionTypeId,
    answer: params.answer ?? 'draft',
    isCorrect: params.isCorrect ?? true,
    confidence: params.confidence,
    elapsedSeconds: 0,
    mistakeReasons: [],
    createdAt: params.createdAt ?? '',
  };
}

function draftCreatedAt(draft: { updatedAt?: string; startedAt?: string }) {
  return draft.updatedAt ?? draft.startedAt;
}

function appendDraftAttemptsFromAnswers(
  draftAttempts: Attempt[],
  params: {
    answers: Array<{ selected?: ChoiceOption; correct?: boolean; confidence?: ChoiceConfidence } | undefined>;
    questions: Array<{ id: string | number; moduleId?: string; questionTypeId?: string }>;
    fallbackModuleId: string;
    fallbackQuestionTypeId: string;
    createdAt?: string;
  },
) {
  params.answers.forEach((answer, index) => {
    if (!answer) return;
    const question = params.questions[index];
    if (!question) return;

    draftAttempts.push(
      createDraftAttempt({
        moduleId: question.moduleId ?? params.fallbackModuleId,
        questionTypeId: question.questionTypeId ?? params.fallbackQuestionTypeId,
        questionId: String(question.id),
        answer: answer.selected,
        isCorrect: answer.correct,
        confidence: confidenceScore(answer.confidence),
        createdAt: params.createdAt,
      }),
    );
  });
}

function filterDraftQuestions(
  questions: Array<{ id: string | number; moduleId?: string; questionTypeId?: string }>,
  moduleId: PracticeProgressModuleId,
  persistedAttempts: Attempt[],
) {
  const unpracticedQuestions = questions.filter((question) => !persistedAttempts.some(
    (attempt) =>
      matchesPracticeModuleAttempt(attempt, moduleId)
      && String(attempt.questionId) === String(question.id),
  ));
  return unpracticedQuestions.length > 0 ? unpracticedQuestions : questions;
}

export function buildDraftPracticeAttempts(params: {
  persistedAttempts?: Attempt[];
  readingPassages?: Passage[];
} = {}): Attempt[] {
  const persistedAttempts = params.persistedAttempts ?? [];
  const readingPassages = params.readingPassages ?? CET4_READING_BANK;
  const draftAttempts: Attempt[] = [];

  const vocabularyDraft = loadPracticeDraft<VocabularyPracticeDraft>(practiceDraftKeys.vocabulary);
  if (vocabularyDraft?.version === 1) {
    const availableVocabularyItems = filterUnpracticedItems(CET4_VOCABULARY_BANK, persistedAttempts, 'vocabulary');
    const packCount = Math.max(1, Math.ceil(availableVocabularyItems.length / VOCABULARY_SESSION_SIZE));
    const packIndex = Math.min(Math.max(0, vocabularyDraft.packIndex), packCount - 1);
    const sessionItems = availableVocabularyItems.slice(
      packIndex * VOCABULARY_SESSION_SIZE,
      (packIndex + 1) * VOCABULARY_SESSION_SIZE,
    );

    appendDraftAttemptsFromAnswers(draftAttempts, {
      answers: Array.isArray(vocabularyDraft.answers) ? vocabularyDraft.answers : [],
      questions: sessionItems.map((item) => ({
        id: item.id,
        moduleId: 'vocabulary',
        questionTypeId: 'cet4-core-vocabulary',
      })),
      fallbackModuleId: 'vocabulary',
      fallbackQuestionTypeId: 'cet4-core-vocabulary',
      createdAt: draftCreatedAt(vocabularyDraft),
    });
  }

  readingPassages.forEach((passage) => {
    const readingDraft = loadPracticeDraft<ReadingPracticeDraft>(practiceDraftKeys.reading(passage.id));
    if (!readingDraft || readingDraft.version !== 1 || readingDraft.passageId !== passage.id) return;

    appendDraftAttemptsFromAnswers(draftAttempts, {
      answers: Array.isArray(readingDraft.answers) ? readingDraft.answers : [],
      questions: passage.questions,
      fallbackModuleId: passage.moduleId ?? 'reading',
      fallbackQuestionTypeId: passage.questions[0]?.questionTypeId ?? 'careful-reading',
      createdAt: draftCreatedAt(readingDraft),
    });
  });

  const grammarDraft = loadPracticeDraft<ReadingPracticeDraft>(practiceDraftKeys.reading(GRAMMAR_DRAFT_PASSAGE_ID));
  if (grammarDraft?.version === 1 && grammarDraft.passageId === GRAMMAR_DRAFT_PASSAGE_ID) {
    appendDraftAttemptsFromAnswers(draftAttempts, {
      answers: Array.isArray(grammarDraft.answers) ? grammarDraft.answers : [],
      questions: filterDraftQuestions(CET4_GRAMMAR_PRACTICE_QUESTIONS, 'grammar', persistedAttempts),
      fallbackModuleId: 'grammar',
      fallbackQuestionTypeId: 'grammar-structure',
      createdAt: draftCreatedAt(grammarDraft),
    });
  }

  const clozeDraft = loadPracticeDraft<ReadingPracticeDraft>(practiceDraftKeys.reading(CLOZE_DRAFT_PASSAGE_ID));
  if (clozeDraft?.version === 1 && clozeDraft.passageId === CLOZE_DRAFT_PASSAGE_ID) {
    appendDraftAttemptsFromAnswers(draftAttempts, {
      answers: Array.isArray(clozeDraft.answers) ? clozeDraft.answers : [],
      questions: filterDraftQuestions(CET4_CLOZE_PRACTICE_QUESTIONS, 'cloze', persistedAttempts),
      fallbackModuleId: 'grammar',
      fallbackQuestionTypeId: 'cloze-choice',
      createdAt: draftCreatedAt(clozeDraft),
    });
  }

  const listeningDraft = loadPracticeDraft<ListeningPracticeDraft>(practiceDraftKeys.listening);
  if (listeningDraft?.version === 1 && listeningDraft.answersByQuestionId) {
    Object.entries(listeningDraft.answersByQuestionId).forEach(([questionId, answer]) => {
      if (!answer?.isSubmitted || !LISTENING_DRAFT_QUESTION_IDS.has(questionId)) return;
      const question = LONG_CONVERSATION_QUESTIONS[Number(questionId) - 1];
      draftAttempts.push(
        createDraftAttempt({
          moduleId: 'listening',
          questionTypeId: 'long-conversation',
          questionId,
          answer: answer.selectedAnswer,
          isCorrect: question && answer.selectedAnswer ? answer.selectedAnswer === question.correctAnswer : undefined,
          confidence: confidenceScore(answer.confidence),
          createdAt: draftCreatedAt(listeningDraft),
        }),
      );
    });
  }

  return draftAttempts;
}
