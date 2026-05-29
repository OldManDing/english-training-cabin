import { CET4_MOCK_EXAM, Cet4MockChoiceQuestion, Cet4MockExamPaper } from '../../questionBank';
import {
  AiFeedbackSummary,
  Attempt,
  MistakeReason,
  PracticeCompletionReport,
  PracticeSession,
  ReviewItem,
  SkillArea,
  SkillProfile,
} from '../../types';

type Choice = 'A' | 'B' | 'C' | 'D';

export interface MockExamAnswers {
  choices: Record<string, Choice | undefined>;
  writingAnswer: string;
  translationAnswer: string;
}

export interface MockExamSectionScore {
  moduleId: 'writing' | 'listening' | 'reading' | 'grammar' | 'translation';
  label: string;
  score: number;
  correctCount?: number;
  totalCount?: number;
}

export interface MockExamReportResult {
  score: number;
  sectionScores: MockExamSectionScore[];
  report: PracticeCompletionReport;
}

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function clampScore(value: number): number {
  return Math.max(30, Math.min(96, Math.round(value)));
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function countEnglishWords(value: string): number {
  return normalizeText(value).split(/[^\p{L}\p{N}'-]+/u).filter(Boolean).length;
}

function keywordScore(answer: string, keywords: string[]): number {
  const normalized = normalizeText(answer).toLowerCase();
  const hitCount = keywords.filter((keyword) => normalized.includes(keyword.toLowerCase())).length;
  return hitCount / Math.max(1, keywords.length);
}

function scoreSubjectiveAnswer(params: {
  answer: string;
  minWords: number;
  keywords: string[];
  moduleId: 'writing' | 'translation';
}) {
  const normalized = normalizeText(params.answer);
  const words = countEnglishWords(normalized);
  const wordRatio = Math.min(1, words / Math.max(1, params.minWords));
  const hits = keywordScore(normalized, params.keywords);
  const sentenceEvidence = /[.!?。！？]/.test(normalized) ? 8 : 0;
  const score = clampScore(34 + wordRatio * 26 + hits * 28 + sentenceEvidence);
  const reasons: MistakeReason[] = [];

  if (score < 75) {
    reasons.push((params.moduleId === 'translation' ? '中文干扰' : '论证结构松散') as MistakeReason);
  }
  if (wordRatio < 0.75) reasons.push('低信心' as MistakeReason);
  if (hits < 0.45) reasons.push('表达不自然' as MistakeReason);

  return {
    score,
    reasons: Array.from(new Set(reasons)),
  };
}

function deriveChoiceMistakeReason(question: Cet4MockChoiceQuestion): MistakeReason {
  if (question.trapType) return question.trapType as MistakeReason;
  if (question.skillArea === 'listening') return '关键信息漏听' as MistakeReason;
  if (question.questionTypeId === 'grammar-structure') return '语法错误' as MistakeReason;
  if (question.questionTypeId === 'cloze-choice') return '搭配错误' as MistakeReason;
  if (question.questionTypeId === 'word-bank') return '搭配错误' as MistakeReason;
  return '定位失准' as MistakeReason;
}

function buildMemoryTask(sourceText: string, contextLabel: string, reason: MistakeReason) {
  const normalized = normalizeText(sourceText);
  const words = normalized.split(/\s+/);
  const chunk = words.slice(0, Math.min(6, words.length)).join(' ');
  return {
    version: 1 as const,
    sourceText: normalized,
    recallPrompt: `先遮住答案，用中文说清楚这个${contextLabel}的意思、定位线索和错因：${reason}。`,
    recallAnswer: normalized,
    clozePrompt: chunk ? normalized.replace(chunk, '____') : normalized,
    clozeAnswer: chunk || normalized,
    chunks: chunk ? [chunk] : [normalized],
    productionPrompt: chunk ? `用语块“${chunk}”自己造句或复述本题。` : `用自己的话复述这个${contextLabel}。`,
    methodNotes: [
      '主动回忆：先答后看，避免只重读解析。',
      '挖空补全：用缺口迫使大脑提取关键词。',
      '语境输出：最后必须造句、复述或翻译。',
      '间隔重复：按 1/3/7/14/30 天回到同一错因。',
    ],
    spacingPlanDays: [1, 3, 7, 14, 30],
  };
}

function buildReviewItem(params: {
  attempt: Attempt;
  title: string;
  detail: string;
  skillArea: SkillArea;
  reason: MistakeReason;
  sourceText: string;
  createdAt: string;
}): ReviewItem {
  const nextReviewAt = new Date(params.createdAt);
  nextReviewAt.setDate(nextReviewAt.getDate() + 1);

  return {
    id: makeId(`mock-review-${params.skillArea}`),
    title: `模考错因：${params.title}`,
    category: params.skillArea === 'vocabulary' ? '词汇' : params.skillArea === 'writing' || params.skillArea === 'translation' ? '句式' : '错题',
    detail: params.detail,
    daysAgo: 0,
    targetType: params.skillArea === 'writing' || params.skillArea === 'translation' ? 'expression' : 'question',
    targetId: params.attempt.questionId,
    examId: params.attempt.examId,
    moduleId: params.attempt.moduleId,
    skillArea: params.skillArea,
    masteryScore: params.attempt.isCorrect ? 62 : 35,
    priorityScore: params.attempt.isCorrect ? 55 : 85,
    reviewIntervalDays: 1,
    nextReviewAt: nextReviewAt.toISOString(),
    sourceAttemptId: params.attempt.id,
    createdAt: params.createdAt,
    memoryTask: buildMemoryTask(params.sourceText, params.title, params.reason),
    learningMethod: 'active-recall-cloze-production',
    retrievalCount: 0,
  };
}

function buildChoiceAttempts(params: {
  sessionId: string;
  questions: Cet4MockChoiceQuestion[];
  answers: Record<string, Choice | undefined>;
  startedAt: string;
  createdAt: string;
}) {
  const elapsedSeconds = Math.max(1, Math.round((Date.now() - new Date(params.startedAt).getTime()) / Math.max(1, params.questions.length) / 1000));
  const attempts: Attempt[] = params.questions.map((question) => {
    const selected = params.answers[question.id];
    const correct = selected === question.correctAnswer;
    const mistakeReasons = correct ? [] : [deriveChoiceMistakeReason(question)];

    return {
      id: makeId(`mock-attempt-${question.moduleId}`),
      sessionId: params.sessionId,
      questionId: question.id,
      examId: 'cet4',
      moduleId: question.moduleId,
      questionTypeId: question.questionTypeId,
      answer: selected ?? null,
      isCorrect: correct,
      elapsedSeconds,
      confidence: selected ? 4 : 1,
      mistakeReasons,
      createdAt: params.createdAt,
    };
  });

  const reviewItems = attempts
    .map((attempt, index) => {
      if (attempt.mistakeReasons.length === 0) return null;
      const question = params.questions[index];
      return buildReviewItem({
        attempt,
        title: question.title,
        detail: `题目：${question.prompt}\n你的答案：${String(attempt.answer ?? '未作答')}；正确答案：${question.correctAnswer}\n解析：${question.explanation}`,
        skillArea: question.skillArea,
        reason: attempt.mistakeReasons[0],
        sourceText: question.correctSentence,
        createdAt: params.createdAt,
      });
    })
    .filter((item): item is ReviewItem => Boolean(item));

  return { attempts, reviewItems };
}

function buildSubjectiveAttempt(params: {
  sessionId: string;
  moduleId: 'writing' | 'translation';
  questionTypeId: string;
  questionId: string;
  prompt: string;
  answer: string;
  sampleAnswer: string;
  score: number;
  reasons: MistakeReason[];
  startedAt: string;
  createdAt: string;
}): { attempt: Attempt; reviewItem: ReviewItem | null } {
  const aiFeedback: AiFeedbackSummary = {
    score: params.score,
    mistakeReasons: params.reasons,
    comments: [
      params.score >= 80
        ? '表达基本完整，可以继续用限时训练保持稳定。'
        : '本次模考暴露了结构、关键词或句式完整度问题，需要进入间隔复习。',
    ],
    nextActions: [
      params.sampleAnswer,
      params.moduleId === 'writing' ? '重写一版，补足观点、理由和例子。' : '先找英文主干，再补充修饰成分，避免逐字硬译。',
    ],
    confidence: params.score >= 80 ? 'high' : params.score >= 65 ? 'medium' : 'low',
  };
  const attempt: Attempt = {
    id: makeId(`mock-attempt-${params.moduleId}`),
    sessionId: params.sessionId,
    questionId: params.questionId,
    examId: 'cet4',
    moduleId: params.moduleId,
    questionTypeId: params.questionTypeId,
    answer: params.answer,
    isCorrect: params.score >= 70,
    elapsedSeconds: Math.max(1, Math.round((Date.now() - new Date(params.startedAt).getTime()) / 1000)),
    confidence: params.score >= 80 ? 4 : 3,
    mistakeReasons: params.reasons,
    aiFeedback,
    createdAt: params.createdAt,
  };

  const reviewItem = params.reasons.length > 0
    ? buildReviewItem({
        attempt,
        title: params.moduleId === 'writing' ? '写作表达' : '翻译表达',
        detail: `任务：${params.prompt}\n你的作答：${params.answer || '未作答'}\n参考表达：${params.sampleAnswer}`,
        skillArea: params.moduleId,
        reason: params.reasons[0],
        sourceText: params.sampleAnswer,
        createdAt: params.createdAt,
      })
    : null;

  return { attempt, reviewItem };
}

function buildSkillProfile(params: {
  moduleId: SkillArea;
  subSkillId: string;
  score: number;
  evidenceCount: number;
  createdAt: string;
}): SkillProfile {
  return {
    id: `cet4-${params.moduleId}-${params.subSkillId}`,
    skillArea: params.moduleId,
    subSkillId: params.subSkillId,
    score: params.score,
    confidence: params.score >= 80 ? 4 : params.score >= 65 ? 3 : 2,
    evidenceCount: params.evidenceCount,
    lastUpdatedAt: params.createdAt,
  };
}

export function buildMockExamReport(input: {
  paper?: Cet4MockExamPaper;
  answers: MockExamAnswers;
  startedAt: string;
}): MockExamReportResult {
  const paper = input.paper ?? CET4_MOCK_EXAM;
  const createdAt = new Date().toISOString();
  const sessionId = makeId('session-cet4-mock');
  const listeningQuestions = paper.listening.questions;
  const readingQuestions = paper.reading.questions;
  const foundationQuestions = paper.foundation.questions;
  const choiceResult = buildChoiceAttempts({
    sessionId,
    questions: [...listeningQuestions, ...readingQuestions, ...foundationQuestions],
    answers: input.answers.choices,
    startedAt: input.startedAt,
    createdAt,
  });

  const writingScore = scoreSubjectiveAnswer({
    answer: input.answers.writingAnswer,
    minWords: paper.writing.minWords,
    keywords: paper.writing.keywords,
    moduleId: 'writing',
  });
  const translationScore = scoreSubjectiveAnswer({
    answer: input.answers.translationAnswer,
    minWords: 24,
    keywords: paper.translation.keywords,
    moduleId: 'translation',
  });
  const writingResult = buildSubjectiveAttempt({
    sessionId,
    moduleId: 'writing',
    questionTypeId: 'short-essay',
    questionId: `${paper.id}-writing`,
    prompt: paper.writing.prompt,
    answer: input.answers.writingAnswer,
    sampleAnswer: paper.writing.sampleAnswer,
    score: writingScore.score,
    reasons: writingScore.reasons,
    startedAt: input.startedAt,
    createdAt,
  });
  const translationResult = buildSubjectiveAttempt({
    sessionId,
    moduleId: 'translation',
    questionTypeId: 'paragraph-translation',
    questionId: `${paper.id}-translation`,
    prompt: paper.translation.prompt,
    answer: input.answers.translationAnswer,
    sampleAnswer: paper.translation.sampleAnswer,
    score: translationScore.score,
    reasons: translationScore.reasons,
    startedAt: input.startedAt,
    createdAt,
  });

  const objectiveAttempts = choiceResult.attempts;
  const listeningAttempts = objectiveAttempts.filter((attempt) => attempt.moduleId === 'listening');
  const readingAttempts = objectiveAttempts.filter((attempt) => attempt.moduleId === 'reading');
  const foundationAttempts = objectiveAttempts.filter((attempt) => attempt.moduleId === 'grammar');
  const grammarStructureAttempts = foundationAttempts.filter((attempt) => attempt.questionTypeId === 'grammar-structure');
  const clozeAttempts = foundationAttempts.filter((attempt) => attempt.questionTypeId === 'cloze-choice');
  const listeningCorrect = listeningAttempts.filter((attempt) => attempt.isCorrect).length;
  const readingCorrect = readingAttempts.filter((attempt) => attempt.isCorrect).length;
  const foundationCorrect = foundationAttempts.filter((attempt) => attempt.isCorrect).length;
  const grammarStructureCorrect = grammarStructureAttempts.filter((attempt) => attempt.isCorrect).length;
  const clozeCorrect = clozeAttempts.filter((attempt) => attempt.isCorrect).length;
  const listeningScore = Math.round((listeningCorrect / Math.max(1, listeningAttempts.length)) * 100);
  const readingScore = Math.round((readingCorrect / Math.max(1, readingAttempts.length)) * 100);
  const foundationScore = Math.round((foundationCorrect / Math.max(1, foundationAttempts.length)) * 100);
  const grammarStructureScore = Math.round((grammarStructureCorrect / Math.max(1, grammarStructureAttempts.length)) * 100);
  const clozeScore = Math.round((clozeCorrect / Math.max(1, clozeAttempts.length)) * 100);
  const sectionScores: MockExamSectionScore[] = [
    { moduleId: 'writing', label: '写作', score: writingScore.score },
    { moduleId: 'listening', label: '听力', score: listeningScore, correctCount: listeningCorrect, totalCount: listeningAttempts.length },
    { moduleId: 'reading', label: '阅读', score: readingScore, correctCount: readingCorrect, totalCount: readingAttempts.length },
    { moduleId: 'grammar', label: '语法/完形', score: foundationScore, correctCount: foundationCorrect, totalCount: foundationAttempts.length },
    { moduleId: 'translation', label: '翻译', score: translationScore.score },
  ];
  const score = Math.round(
    writingScore.score * 0.15
      + listeningScore * 0.35
      + readingScore * 0.35
      + translationScore.score * 0.15,
  );
  const attempts = [
    writingResult.attempt,
    ...objectiveAttempts,
    translationResult.attempt,
  ];
  const reviewItems = [
    ...choiceResult.reviewItems,
    writingResult.reviewItem,
    translationResult.reviewItem,
  ].filter((item): item is ReviewItem => Boolean(item));
  const skillProfiles = [
    buildSkillProfile({ moduleId: 'writing', subSkillId: 'mock-short-essay', score: writingScore.score, evidenceCount: 1, createdAt }),
    buildSkillProfile({ moduleId: 'listening', subSkillId: 'mock-listening-mixed', score: listeningScore, evidenceCount: listeningAttempts.length, createdAt }),
    buildSkillProfile({ moduleId: 'reading', subSkillId: 'mock-reading-mixed', score: readingScore, evidenceCount: readingAttempts.length, createdAt }),
    buildSkillProfile({ moduleId: 'grammar', subSkillId: 'mock-grammar-structure', score: grammarStructureScore, evidenceCount: grammarStructureAttempts.length, createdAt }),
    buildSkillProfile({ moduleId: 'grammar', subSkillId: 'mock-cloze-choice', score: clozeScore, evidenceCount: clozeAttempts.length, createdAt }),
    buildSkillProfile({ moduleId: 'translation', subSkillId: 'mock-paragraph-translation', score: translationScore.score, evidenceCount: 1, createdAt }),
  ];
  const session: PracticeSession = {
    id: sessionId,
    examId: 'cet4',
    moduleId: 'mock',
    modeId: 'cet4-standard-mock',
    startedAt: input.startedAt,
    finishedAt: createdAt,
    plannedMinutes: paper.plannedMinutes,
    questionIds: attempts.map((attempt) => attempt.questionId),
    status: 'completed',
  };

  return {
    score,
    sectionScores,
    report: {
      session,
      attempts,
      reviewItems,
      skillProfiles,
    },
  };
}
