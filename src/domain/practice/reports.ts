import {
  Attempt,
  MistakeReason,
  PracticeCompletionReport,
  PracticeSession,
  ReviewItem,
  SkillArea,
  SkillProfile,
} from '../../types';

type ChoiceAnswer = 'A' | 'B' | 'C' | 'D';

export interface ChoicePracticeQuestion {
  id: number | string;
  question: string;
  correctAnswer: ChoiceAnswer;
  type?: string;
  trapType?: string;
  moduleId?: string;
  questionTypeId?: string;
}

export interface ChoicePracticeAnswer {
  selected?: ChoiceAnswer;
  correct: boolean;
  confidence?: 'sure' | 'not_sure' | 'guess' | 'Low' | 'Medium' | 'High';
}

interface BuildChoicePracticeReportInput {
  examId?: string;
  moduleId: string;
  questionTypeId: string;
  modeId: string;
  skillArea: SkillArea;
  plannedMinutes: number;
  startedAt: string;
  questions: ChoicePracticeQuestion[];
  answers: ChoicePracticeAnswer[];
}

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function confidenceToScore(confidence: ChoicePracticeAnswer['confidence']): 1 | 2 | 3 | 4 | 5 | undefined {
  if (confidence === 'sure' || confidence === 'High') return 5;
  if (confidence === 'not_sure' || confidence === 'Medium') return 3;
  if (confidence === 'guess' || confidence === 'Low') return 1;
  return undefined;
}

function deriveMistakeReasons(params: {
  answer: ChoicePracticeAnswer;
  skillArea: SkillArea;
  questionType?: string;
  trapType?: string;
}): MistakeReason[] {
  const reasons: MistakeReason[] = [];
  const confidence = params.answer.confidence;

  if (confidence === 'guess') reasons.push('盲猜');
  if (confidence === 'not_sure' || confidence === 'Low' || confidence === 'Medium') reasons.push('低信心');

  if (!params.answer.correct) {
    if (params.trapType) {
      reasons.push(params.trapType as MistakeReason);
    } else if (params.skillArea === 'listening') {
      reasons.push('关键词漏听');
    } else if (params.questionType?.includes('同义') || params.questionType?.includes('推')) {
      reasons.push('同义替换未识别');
    } else {
      reasons.push('定位失准');
    }
  }

  return Array.from(new Set(reasons));
}

function buildReviewItem(params: {
  attempt: Attempt;
  question: ChoicePracticeQuestion;
  reasons: MistakeReason[];
  skillArea: SkillArea;
}): ReviewItem | null {
  if (params.reasons.length === 0) return null;

  const isIncorrect = params.attempt.isCorrect === false;
  const nextReviewAt = new Date();
  nextReviewAt.setDate(nextReviewAt.getDate() + (isIncorrect ? 1 : 2));

  return {
    id: makeId('review'),
    title: `${params.skillArea === 'listening' ? '听力' : '阅读'}错因：${params.reasons[0]}`,
    category: '错题',
    detail: `题目：${params.question.question}\n你的答案：${String(params.attempt.answer || '未作答')}；正确答案：${params.question.correctAnswer}。\n复习重点：${params.reasons.join('、')}。`,
    daysAgo: 0,
    targetType: 'question',
    targetId: String(params.question.id),
    examId: params.attempt.examId,
    moduleId: params.attempt.moduleId,
    skillArea: params.skillArea,
    masteryScore: isIncorrect ? 35 : 62,
    priorityScore: (isIncorrect ? 80 : 45) + params.reasons.length * 5,
    reviewIntervalDays: isIncorrect ? 1 : 2,
    nextReviewAt: nextReviewAt.toISOString(),
    sourceAttemptId: params.attempt.id,
    createdAt: params.attempt.createdAt,
  };
}

export function buildChoicePracticeReport(input: BuildChoicePracticeReportInput): PracticeCompletionReport {
  const examId = input.examId ?? 'cet4';
  const sessionId = makeId(`session-${input.moduleId}`);
  const now = new Date().toISOString();
  const totalSeconds = Math.max(1, Math.round((Date.now() - new Date(input.startedAt).getTime()) / 1000));
  const elapsedPerQuestion = Math.max(1, Math.round(totalSeconds / Math.max(1, input.questions.length)));

  const session: PracticeSession = {
    id: sessionId,
    examId,
    moduleId: input.moduleId,
    modeId: input.modeId,
    startedAt: input.startedAt,
    finishedAt: now,
    plannedMinutes: input.plannedMinutes,
    questionIds: input.questions.map((question) => String(question.id)),
    status: 'completed',
  };

  const attempts: Attempt[] = input.questions.map((question, index) => {
    const answer = input.answers[index] ?? { correct: false };
    const mistakeReasons = deriveMistakeReasons({
      answer,
      skillArea: input.skillArea,
      questionType: question.type,
      trapType: question.trapType,
    });

    return {
      id: makeId('attempt'),
      sessionId,
      questionId: String(question.id),
      examId,
      moduleId: question.moduleId ?? input.moduleId,
      questionTypeId: question.questionTypeId ?? input.questionTypeId,
      answer: answer.selected ?? null,
      isCorrect: answer.correct,
      elapsedSeconds: elapsedPerQuestion,
      confidence: confidenceToScore(answer.confidence),
      mistakeReasons,
      createdAt: now,
    };
  });

  const reviewItems = attempts
    .map((attempt, index) =>
      buildReviewItem({
        attempt,
        question: input.questions[index],
        reasons: attempt.mistakeReasons,
        skillArea: input.skillArea,
      }),
    )
    .filter((item): item is ReviewItem => Boolean(item));

  const correctCount = attempts.filter((attempt) => attempt.isCorrect).length;
  const score = Math.round((correctCount / Math.max(1, attempts.length)) * 100);
  const skillProfiles: SkillProfile[] = [
    {
      id: `${examId}-${input.moduleId}-${input.questionTypeId}`,
      skillArea: input.skillArea,
      subSkillId: input.questionTypeId,
      score,
      confidence: Math.round(
        attempts.reduce((sum, attempt) => sum + (attempt.confidence ?? 3), 0) / Math.max(1, attempts.length),
      ),
      evidenceCount: attempts.length,
      lastUpdatedAt: now,
    },
  ];

  return {
    session,
    attempts,
    reviewItems,
    skillProfiles,
  };
}
