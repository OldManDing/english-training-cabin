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

export interface SpeakingPracticeAnalysis {
  originalTextWithMarkings: string;
  improvedTextWithConnectors: string;
  fillerCount: number;
  fluencyAnalysis: string;
  logicAnalysis: string;
  vocabularyAnalysis: string;
  scoreImprovementFrom: number;
  scoreImprovementTo: number;
}

export interface BuildSpeakingPracticeReportInput {
  examId?: string;
  modeId: string;
  startedAt: string;
  originalSpeech: string;
  secondSpeech?: string;
  analysis: SpeakingPracticeAnalysis;
  analysisMode: 'live' | 'fallback' | 'unknown';
}

export interface SubjectivePracticeAnalysis {
  score: number;
  mistakeReasons: MistakeReason[];
  comments: string[];
  nextActions: string[];
  sampleAnswer: string;
  confidence: 'low' | 'medium' | 'high';
}

export interface BuildSubjectivePracticeReportInput {
  examId?: string;
  moduleId: 'writing' | 'translation';
  questionTypeId: string;
  modeId: string;
  plannedMinutes: number;
  startedAt: string;
  prompt: string;
  answer: string;
  analysis: SubjectivePracticeAnalysis;
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

export function buildSpeakingPracticeReport(input: BuildSpeakingPracticeReportInput): PracticeCompletionReport {
  const examId = input.examId ?? 'cet4';
  const sessionId = makeId('session-speaking');
  const now = new Date().toISOString();
  const targetScore = Math.max(0, Math.min(100, input.analysis.scoreImprovementTo));
  const mistakeReasons: MistakeReason[] = [];

  if (input.analysis.fillerCount > 0) mistakeReasons.push('表达不自然');
  if (targetScore < 70) mistakeReasons.push('语法错误');
  if (input.analysisMode === 'fallback') mistakeReasons.push('低信心');
  if (mistakeReasons.length === 0 && targetScore < 85) mistakeReasons.push('表达不自然');

  const attempt: Attempt = {
    id: makeId('attempt-speaking'),
    sessionId,
    questionId: 'cet-set4-retell',
    examId,
    moduleId: 'speaking',
    questionTypeId: 'cet-set4-retell',
    answer: {
      firstAttempt: input.originalSpeech,
      secondAttempt: input.secondSpeech ?? input.analysis.improvedTextWithConnectors,
    },
    isCorrect: targetScore >= 70,
    elapsedSeconds: Math.max(1, Math.round((Date.now() - new Date(input.startedAt).getTime()) / 1000)),
    confidence: targetScore >= 80 ? 4 : 3,
    mistakeReasons,
    aiFeedback: {
      score: targetScore,
      mistakeReasons,
      comments: [
        input.analysis.fluencyAnalysis,
        input.analysis.logicAnalysis,
        input.analysis.vocabularyAnalysis,
      ],
      nextActions: [
        input.analysis.improvedTextWithConnectors,
      ],
      confidence: input.analysisMode === 'fallback' ? 'low' : 'medium',
    },
    createdAt: now,
  };

  const nextReviewAt = new Date();
  nextReviewAt.setDate(nextReviewAt.getDate() + 1);

  const reviewItems: ReviewItem[] = mistakeReasons.length > 0
    ? [
        {
          id: makeId('review-speaking'),
          title: `口语错因：${mistakeReasons[0]}`,
          category: '句式',
          detail: `原表达：${input.originalSpeech}\n建议表达：${input.analysis.improvedTextWithConnectors}\n复习重点：${mistakeReasons.join('、')}。`,
          daysAgo: 0,
          targetType: 'speaking-pattern',
          targetId: 'cet-set4-retell',
          examId,
          moduleId: 'speaking',
          skillArea: 'speaking',
          masteryScore: Math.max(30, Math.min(75, targetScore)),
          priorityScore: 75 + mistakeReasons.length * 5,
          reviewIntervalDays: 1,
          nextReviewAt: nextReviewAt.toISOString(),
          sourceAttemptId: attempt.id,
          createdAt: now,
        },
      ]
    : [];

  return {
    session: {
      id: sessionId,
      examId,
      moduleId: 'speaking',
      modeId: input.modeId,
      startedAt: input.startedAt,
      finishedAt: now,
      plannedMinutes: 15,
      questionIds: ['cet-set4-retell'],
      status: 'completed',
    },
    attempts: [attempt],
    reviewItems,
    skillProfiles: [
      {
        id: `${examId}-speaking-cet-set4-retell`,
        skillArea: 'speaking',
        subSkillId: 'cet-set4-retell',
        score: targetScore,
        confidence: targetScore >= 80 ? 4 : 3,
        evidenceCount: 1,
        lastUpdatedAt: now,
      },
    ],
  };
}

export function buildSubjectivePracticeReport(input: BuildSubjectivePracticeReportInput): PracticeCompletionReport {
  const examId = input.examId ?? 'cet4';
  const now = new Date().toISOString();
  const sessionId = makeId(`session-${input.moduleId}`);
  const score = Math.max(0, Math.min(100, Math.round(input.analysis.score)));
  const mistakeReasons = input.analysis.mistakeReasons.length > 0
    ? input.analysis.mistakeReasons
    : score < 85
    ? ['表达不自然' as MistakeReason]
    : [];
  const questionId = `${input.moduleId}-${input.questionTypeId}`;

  const attempt: Attempt = {
    id: makeId(`attempt-${input.moduleId}`),
    sessionId,
    questionId,
    examId,
    moduleId: input.moduleId,
    questionTypeId: input.questionTypeId,
    answer: input.answer,
    isCorrect: score >= 70,
    elapsedSeconds: Math.max(1, Math.round((Date.now() - new Date(input.startedAt).getTime()) / 1000)),
    confidence: input.analysis.confidence === 'high' ? 5 : input.analysis.confidence === 'low' ? 2 : 3,
    mistakeReasons,
    aiFeedback: {
      score,
      mistakeReasons,
      comments: input.analysis.comments,
      nextActions: input.analysis.nextActions,
      confidence: input.analysis.confidence,
    },
    createdAt: now,
  };

  const nextReviewAt = new Date();
  nextReviewAt.setDate(nextReviewAt.getDate() + (score < 70 ? 1 : 2));
  const moduleName = input.moduleId === 'writing' ? '写作' : '翻译';
  const reviewItems: ReviewItem[] = mistakeReasons.length > 0
    ? [{
        id: makeId(`review-${input.moduleId}`),
        title: `${moduleName}错因：${mistakeReasons[0]}`,
        category: '句式',
        detail: `任务：${input.prompt}\n你的作答：${input.answer}\n改进示例：${input.analysis.sampleAnswer}\n下一步：${input.analysis.nextActions.join('；')}。`,
        daysAgo: 0,
        targetType: 'expression',
        targetId: questionId,
        examId,
        moduleId: input.moduleId,
        skillArea: input.moduleId,
        masteryScore: Math.max(30, Math.min(80, score)),
        priorityScore: (score < 70 ? 85 : 60) + mistakeReasons.length * 5,
        reviewIntervalDays: score < 70 ? 1 : 2,
        nextReviewAt: nextReviewAt.toISOString(),
        sourceAttemptId: attempt.id,
        createdAt: now,
      }]
    : [];

  return {
    session: {
      id: sessionId,
      examId,
      moduleId: input.moduleId,
      modeId: input.modeId,
      startedAt: input.startedAt,
      finishedAt: now,
      plannedMinutes: input.plannedMinutes,
      questionIds: [questionId],
      status: 'completed',
    },
    attempts: [attempt],
    reviewItems,
    skillProfiles: [{
      id: `${examId}-${input.moduleId}-${input.questionTypeId}`,
      skillArea: input.moduleId,
      subSkillId: input.questionTypeId,
      score,
      confidence: attempt.confidence ?? 3,
      evidenceCount: 1,
      lastUpdatedAt: now,
    }],
  };
}
