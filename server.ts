import express, { NextFunction, Request, Response } from 'express';
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'path';
import { promisify } from 'node:util';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import {
  CET4_LOCAL_REAL_PAPERS,
  type LocalRealExamPaper,
  type LocalRealPaperAnswerReference,
  type LocalRealPaperContent,
  type LocalRealPaperContentSection,
} from './src/domain/practice/localRealPapers';
import { getExamRegistryEntry, listPublicExamProfiles, normalizeExamId } from './src/exams/registry';
import {
  CET4_QUESTION_BANK_COVERAGE,
  CET4_MOCK_EXAM,
  DEGREE_ENGLISH_MOCK_EXAM,
  DEGREE_ENGLISH_OUTLINE_2025,
  DEGREE_ENGLISH_QUESTION_BANK_COVERAGE,
} from './src/questionBank';
import { buildDailyPlan } from './src/domain/planner/dailyPlan';
import { normalizePassage } from './src/domain/materials/passage';
import { buildMockExamReport, MockExamAnswers } from './src/domain/practice/mockExam';
import {
  buildChoicePracticeReport,
  buildSpeakingPracticeReport,
  buildSubjectivePracticeReport,
  BuildSubjectivePracticeReportInput,
  ChoicePracticeAnswer,
  ChoicePracticeQuestion,
  SpeakingPracticeAnalysis,
  SubjectivePracticeAnalysis,
} from './src/domain/practice/reports';
import { MistakeReason, ReviewItem, SkillArea, SkillProfile, StudyGoal } from './src/types';
import {
  acceptWorkspaceInvitation,
  changeSaasPassword,
  createFileSaasStore,
  createInMemorySaasStore,
  createWorkspaceInvitation,
  getDefaultSaasDataFile,
  getSaasSessionSecret,
  getSessionExpiresAt,
  issueSessionToken,
  issuePasswordRecoveryCode,
  isRegistrationInviteConfigured,
  loginSaasAccount,
  registerSaasAccount,
  resetSaasPassword,
  SaasAccountRecord,
  SaasApiError,
  SaasSessionPayload,
  SaasStore,
  summarizeLearningSnapshot,
  shouldBlockEmptyLearningSnapshotOverwrite,
  shouldBlockLearningSnapshotRegression,
  toPublicAccountContext,
  toPublicContentAssets,
  toPublicDataRequests,
  toPublicInvitations,
  toPublicMembers,
  toPublicSessions,
  validateBillingEvent,
  validateLearningEntities,
  validateLearningBackup,
  verifyBillingWebhookSignature,
  verifySessionToken,
} from './src/server/saas';
import { createPostgresSaasStore } from './src/server/saas-postgres';
import {
  canGenerateLocalRealPaperListeningAudio,
  findLocalRealPaperFile,
  listLocalRealPapers,
  normalizeLocalRealPaperExamId,
} from './src/server/localRealPapers';
import { extractPdfText } from './src/server/pdfText';

const execFileAsync = promisify(execFile);

if (process.env.NODE_ENV !== 'test') {
  dotenv.config({ path: ['.env.local', '.env'] });
} else {
  dotenv.config({ path: '.env.test' });
}

function readEnvironmentValue(name: string): string | undefined {
  const value = process.env[name]?.trim();
  if (!value) return undefined;
  const unquoted = value.replace(/^(['"])(.*)\1$/, '$2').trim();
  return unquoted || undefined;
}

const PORT = Number(readEnvironmentValue('PORT') ?? 3000);
const JSON_LIMIT = readEnvironmentValue('JSON_LIMIT') ?? '2mb';
const AI_TIMEOUT_MS = Number(readEnvironmentValue('AI_TIMEOUT_MS') ?? 20_000);
const PRACTICE_TTS_MAX_CHARACTERS = 2_500;
const PRACTICE_TTS_DEFAULT_COMMANDS = ['espeak-ng', 'espeak'];
const DEFAULT_EDGE_TTS_COMMAND = '/opt/edge-tts/bin/edge-tts';
const DEFAULT_EDGE_TTS_VOICE = 'en-US-JennyNeural';
const PRACTICE_TTS_CACHE_VERSION = 'practice-tts-v2';
const PRACTICE_TTS_CACHE_MAX_FILES = 400;

function isProductionServerRuntime() {
  return process.env.NODE_ENV === 'production' || path.basename(process.argv[1] ?? '') === 'server.cjs';
}

function getPublicAppUrl() {
  return readEnvironmentValue('APP_URL') ?? `http://localhost:${PORT}`;
}

function buildActionUrl(pathname: string, token: string) {
  const url = new URL(pathname, getPublicAppUrl());
  url.searchParams.set('token', token);
  return url.toString();
}

export function buildContentSecurityPolicy() {
  const isDevRuntime = process.env.NODE_ENV !== 'test' && !isProductionServerRuntime();
  return [
    "default-src 'self'",
    isDevRuntime ? "script-src 'self' 'unsafe-inline'" : "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self' data:",
    isDevRuntime
      ? "connect-src 'self' ws://127.0.0.1:* ws://localhost:* http://127.0.0.1:* http://localhost:*"
      : "connect-src 'self'",
    "media-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ');
}

type RateBucket = {
  count: number;
  resetAt: number;
};

type AiProviderConfig =
  | {
      type: 'openai-compatible';
      providerName: 'baseui' | 'openai-compatible';
      baseUrl: string;
      apiKey: string;
      model: string;
    }
  | {
      type: 'gemini';
      providerName: 'gemini';
      apiKey: string;
      model: string;
    };

type AiFallbackReason =
  | 'not_configured'
  | 'usage_limited'
  | 'timeout'
  | 'provider_error'
  | 'invalid_response'
  | 'unknown';

const rateBuckets = new Map<string, RateBucket>();
let lastRateBucketPruneAt = 0;
const observability = {
  startedAt: new Date().toISOString(),
  apiRequestsTotal: 0,
  apiErrorsTotal: 0,
  requestsByPath: new Map<string, number>(),
  errorsByPath: new Map<string, number>(),
  aiRequestsTotal: 0,
  aiFallbacksTotal: 0,
  aiLatencyMsTotal: 0,
  aiLatencySamples: 0,
  aiFallbacksByReason: new Map<AiFallbackReason, number>(),
  lastAiFallbackReason: null as AiFallbackReason | null,
  lastAiFallbackAt: null as string | null,
  eventsByName: new Map<string, number>(),
};

const ALLOWED_TELEMETRY_EVENTS = new Set([
  'section_viewed',
  'practice_completed',
  'speaking_analyzed',
  'speaking_completed',
  'subjective_evaluated',
  'material_generated',
  'material_generation_failed',
  'material_imported',
  'material_import_failed',
  'feedback_submitted',
  'client_error',
]);

const VALID_FEEDBACK_CATEGORIES = new Set(['bug', 'ui', 'content', 'idea', 'other']);

const VALID_MISTAKE_REASONS: MistakeReason[] = [
  '定位失准',
  '同义替换未识别',
  '细节偷换',
  '关键词漏听',
  '转折信息漏听',
  '数字时间混淆',
  '选项判断失误',
  '低信心',
  '盲猜',
  '表达不自然',
  '语法错误',
  '论证结构松散',
  '搭配错误',
  '时态语态错误',
  '中文干扰',
];

function incrementCounter<Key extends string>(counter: Map<Key, number>, key: Key) {
  counter.set(key, (counter.get(key) ?? 0) + 1);
}

function toPlainCounter<Key extends string>(counter: Map<Key, number>) {
  return Object.fromEntries([...counter.entries()].sort(([left], [right]) => left.localeCompare(right)));
}

function classifyAiFallbackReason(error: unknown): AiFallbackReason {
  const message = error instanceof Error ? error.message : String(error ?? '');
  if (/No AI provider configured|Gemini provider is not configured/i.test(message)) return 'not_configured';
  if (/USAGE_LIMIT_EXCEEDED|MONTHLY_LIMIT_EXCEEDED|quota|rate limit|HTTP 429|429/i.test(message)) return 'usage_limited';
  if (/AbortError|aborted|timeout|timed out/i.test(message)) return 'timeout';
  if (/invalid JSON|empty message|returned invalid|parse/i.test(message)) return 'invalid_response';
  if (/provider failed|generateContent|HTTP 5\d\d|HTTP 4\d\d/i.test(message)) return 'provider_error';
  return 'unknown';
}

function observeAiResult(startedAt: number, usedFallback: boolean, reason?: AiFallbackReason) {
  observability.aiRequestsTotal += 1;
  observability.aiLatencySamples += 1;
  observability.aiLatencyMsTotal += Date.now() - startedAt;
  if (usedFallback) {
    const fallbackReason = reason ?? 'unknown';
    observability.aiFallbacksTotal += 1;
    incrementCounter(observability.aiFallbacksByReason, fallbackReason);
    observability.lastAiFallbackReason = fallbackReason;
    observability.lastAiFallbackAt = new Date().toISOString();
  }
}

function getObservabilitySummary() {
  const aiAverageLatencyMs = observability.aiLatencySamples > 0
    ? Math.round(observability.aiLatencyMsTotal / observability.aiLatencySamples)
    : 0;
  const aiFallbackRate = observability.aiRequestsTotal > 0
    ? Number((observability.aiFallbacksTotal / observability.aiRequestsTotal).toFixed(4))
    : 0;
  const apiErrorRate = observability.apiRequestsTotal > 0
    ? Number((observability.apiErrorsTotal / observability.apiRequestsTotal).toFixed(4))
    : 0;

  return {
    startedAt: observability.startedAt,
    api: {
      requestsTotal: observability.apiRequestsTotal,
      errorsTotal: observability.apiErrorsTotal,
      errorRate: apiErrorRate,
      requestsByPath: toPlainCounter(observability.requestsByPath),
      errorsByPath: toPlainCounter(observability.errorsByPath),
    },
    ai: {
      requestsTotal: observability.aiRequestsTotal,
      fallbacksTotal: observability.aiFallbacksTotal,
      fallbackRate: aiFallbackRate,
      averageLatencyMs: aiAverageLatencyMs,
      fallbacksByReason: toPlainCounter(observability.aiFallbacksByReason),
      lastFallbackReason: observability.lastAiFallbackReason,
      lastFallbackAt: observability.lastAiFallbackAt,
    },
    productEvents: toPlainCounter(observability.eventsByName),
  };
}

function createRateLimiter(limit: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = `${req.ip}:${req.path}`;
    const now = Date.now();
    if (now - lastRateBucketPruneAt > windowMs) {
      lastRateBucketPruneAt = now;
      for (const [bucketKey, bucket] of rateBuckets.entries()) {
        if (bucket.resetAt <= now) rateBuckets.delete(bucketKey);
      }
    }
    const bucket = rateBuckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    bucket.count += 1;
    if (bucket.count > limit) {
      res.status(429).json({
        error: 'rate_limited',
        message: '请求过于频繁，请稍后再试。',
        retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000),
      });
      return;
    }

    next();
  };
}

function sanitizeText(value: unknown, field: string, maxLength: number): string {
  if (typeof value !== 'string') {
    throw new Error(`${field} must be a string`);
  }
  const trimmed = value.trim().replace(/[\u0000-\u001F\u007F]/g, ' ');
  if (!trimmed) {
    throw new Error(`${field} is required`);
  }
  if (trimmed.length > maxLength) {
    throw new Error(`${field} is too long`);
  }
  return trimmed;
}

function sanitizeOptionalText(value: unknown, field: string, maxLength: number): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') {
    throw new SaasApiError(400, `${field}_invalid`, `${field} must be a string.`);
  }
  const trimmed = value.trim().replace(/[\u0000-\u001F\u007F]/g, ' ');
  if (!trimmed) return undefined;
  if (trimmed.length > maxLength) {
    throw new SaasApiError(400, `${field}_too_long`, `${field} is too long.`);
  }
  return trimmed || undefined;
}

function getDefaultFeedbackFilePath() {
  return path.join(process.cwd(), '.data', 'feedback', 'feedback.jsonl');
}

function validateUserFeedback(value: unknown) {
  const input = typeof value === 'object' && value ? value as Record<string, unknown> : {};
  let message = '';
  try {
    message = sanitizeText(input.message, 'message', 800);
  } catch {
    throw new SaasApiError(400, 'feedback_message_required', '请填写反馈内容。');
  }
  if (message.length < 8) {
    throw new SaasApiError(400, 'feedback_message_too_short', '反馈内容至少需要 8 个字。');
  }

  const rawCategory = typeof input.category === 'string' ? input.category.trim() : 'other';
  const category = VALID_FEEDBACK_CATEGORIES.has(rawCategory) ? rawCategory : 'other';

  return {
    category,
    message,
    contact: sanitizeOptionalText(input.contact, 'contact', 120),
    page: sanitizeOptionalText(input.page, 'page', 240),
    userAgent: sanitizeOptionalText(input.userAgent, 'userAgent', 240),
  };
}

async function appendUserFeedback(filePath: string, feedback: ReturnType<typeof validateUserFeedback>) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.appendFile(
    filePath,
    `${JSON.stringify({
      ...feedback,
      receivedAt: new Date().toISOString(),
    })}\n`,
    'utf8',
  );
}

function validateGoal(value: unknown): Pick<StudyGoal, 'id' | 'examId' | 'examDate' | 'dailyMinutes' | 'prioritySkills'> {
  const input = typeof value === 'object' && value ? value as Partial<StudyGoal> : {};
  const dailyMinutes = Number(input.dailyMinutes ?? 60);
  const validSkills: SkillArea[] = ['reading', 'listening', 'writing', 'translation', 'speaking', 'vocabulary', 'grammar'];
  const prioritySkills = Array.isArray(input.prioritySkills)
    ? input.prioritySkills.filter((skill): skill is SkillArea => typeof skill === 'string' && validSkills.includes(skill as SkillArea))
    : [];
  const examId = normalizeExamId(typeof input.examId === 'string' ? input.examId : 'cet4');
  const examEntry = getExamRegistryEntry(examId);

  if (!examEntry) {
    throw new SaasApiError(400, 'unsupported_exam', '目标考试暂不支持。');
  }
  if (examEntry.routeAvailability !== 'trainable') {
    throw new SaasApiError(409, 'exam_not_trainable', `${examEntry.profile.name} 仍处于路线图阶段，尚未开放训练闭环。`);
  }

  return {
    id: typeof input.id === 'string' ? input.id : `goal-${examId}-primary`,
    examId,
    examDate: typeof input.examDate === 'string' ? input.examDate : examEntry.defaultExamDate ?? '2026-06-13',
    dailyMinutes: Number.isFinite(dailyMinutes) ? Math.min(180, Math.max(20, dailyMinutes)) : 60,
    prioritySkills: prioritySkills.length > 0
      ? prioritySkills
      : examEntry.profile.defaultPlanTemplates[0]?.prioritySkills ?? ['reading', 'listening', 'vocabulary', 'speaking'],
  };
}

function validateSkillArea(value: unknown): SkillArea {
  const validSkills: SkillArea[] = ['reading', 'listening', 'writing', 'translation', 'speaking', 'vocabulary', 'grammar'];
  if (typeof value === 'string' && validSkills.includes(value as SkillArea)) {
    return value as SkillArea;
  }
  throw new Error('skillArea must be a supported skill area');
}

function validateChoicePracticePayload(value: unknown) {
  const input = typeof value === 'object' && value ? value as Record<string, unknown> : {};
  const questions = Array.isArray(input.questions) ? input.questions : [];
  const answers = Array.isArray(input.answers) ? input.answers : [];

  if (questions.length === 0) {
    throw new Error('questions must contain at least one question');
  }
  if (questions.length > 100) {
    throw new Error('questions cannot contain more than 100 questions');
  }
  if (answers.length > questions.length) {
    throw new Error('answers cannot contain more entries than questions');
  }

  const normalizedQuestions = questions.map((question, index) => {
    const item = typeof question === 'object' && question ? question as Record<string, unknown> : {};
    const correctAnswer = item.correctAnswer;
    if (!['A', 'B', 'C', 'D'].includes(String(correctAnswer))) {
      throw new Error(`questions[${index}].correctAnswer must be A, B, C, or D`);
    }
    return {
      id: typeof item.id === 'string' || typeof item.id === 'number' ? item.id : index + 1,
      question: sanitizeText(item.question, `questions[${index}].question`, 1000),
      correctAnswer: correctAnswer as ChoicePracticeQuestion['correctAnswer'],
      type: typeof item.type === 'string' ? item.type : undefined,
      trapType: typeof item.trapType === 'string' ? item.trapType : undefined,
      moduleId: typeof item.moduleId === 'string' ? item.moduleId : undefined,
      questionTypeId: typeof item.questionTypeId === 'string' ? item.questionTypeId : undefined,
      correctSentence: typeof item.correctSentence === 'string' ? sanitizeText(item.correctSentence, `questions[${index}].correctSentence`, 1200) : undefined,
      explanation: typeof item.explanation === 'string' ? sanitizeText(item.explanation, `questions[${index}].explanation`, 2000) : undefined,
    } satisfies ChoicePracticeQuestion;
  });

  const normalizedAnswers = answers.map((answer, index) => {
    const item = typeof answer === 'object' && answer ? answer as Record<string, unknown> : {};
    const selected = item.selected;
    if (selected != null && !['A', 'B', 'C', 'D'].includes(String(selected))) {
      throw new Error(`answers[${index}].selected must be A, B, C, or D`);
    }
    if (typeof item.correct !== 'boolean') {
      throw new Error(`answers[${index}].correct must be a boolean`);
    }
    return {
      selected: selected as ChoicePracticeAnswer['selected'],
      correct: item.correct,
      confidence: item.confidence as ChoicePracticeAnswer['confidence'],
    } satisfies ChoicePracticeAnswer;
  });

  return {
    examId: typeof input.examId === 'string' ? input.examId : 'cet4',
    moduleId: sanitizeText(input.moduleId, 'moduleId', 80),
    questionTypeId: sanitizeText(input.questionTypeId, 'questionTypeId', 80),
    modeId: typeof input.modeId === 'string' ? input.modeId : 'api-choice-practice',
    skillArea: validateSkillArea(input.skillArea),
    plannedMinutes: Number.isFinite(Number(input.plannedMinutes)) ? Math.max(1, Math.min(240, Number(input.plannedMinutes))) : 20,
    startedAt: typeof input.startedAt === 'string' ? input.startedAt : new Date().toISOString(),
    questions: normalizedQuestions,
    answers: normalizedAnswers,
  };
}

function validateMockExamPayload(value: unknown): { answers: MockExamAnswers; startedAt: string } {
  const input = typeof value === 'object' && value ? value as Record<string, unknown> : {};
  const rawAnswers = typeof input.answers === 'object' && input.answers ? input.answers as Record<string, unknown> : input;
  const rawChoices = typeof rawAnswers.choices === 'object' && rawAnswers.choices ? rawAnswers.choices as Record<string, unknown> : {};
  const choices: MockExamAnswers['choices'] = {};

  for (const [questionId, selected] of Object.entries(rawChoices)) {
    if (!/^[A-Za-z0-9_-]{1,120}$/.test(questionId)) {
      throw new Error('choices contains an invalid question id');
    }
    if (selected !== undefined && selected !== null) {
      if (!['A', 'B', 'C', 'D'].includes(String(selected))) {
        throw new Error(`choices.${questionId} must be A, B, C, or D`);
      }
      choices[questionId] = selected as 'A' | 'B' | 'C' | 'D';
    }
  }

  return {
    answers: {
      choices,
      writingAnswer: sanitizeText(rawAnswers.writingAnswer, 'writingAnswer', 5000),
      translationAnswer: sanitizeText(rawAnswers.translationAnswer, 'translationAnswer', 3000),
    },
    startedAt: typeof input.startedAt === 'string' ? input.startedAt : new Date().toISOString(),
  };
}

function numberInRange(value: unknown, fallback: number, min = 0, max = 100): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(min, Math.min(max, numeric));
}

function validateSpeakingAnalysis(value: unknown): SpeakingPracticeAnalysis {
  const input = typeof value === 'object' && value ? value as Record<string, unknown> : {};

  return {
    originalTextWithMarkings: sanitizeText(input.originalTextWithMarkings, 'analysis.originalTextWithMarkings', 4000),
    improvedTextWithConnectors: sanitizeText(input.improvedTextWithConnectors, 'analysis.improvedTextWithConnectors', 4000),
    fillerCount: Math.round(numberInRange(input.fillerCount, 0, 0, 200)),
    fluencyAnalysis: sanitizeText(input.fluencyAnalysis, 'analysis.fluencyAnalysis', 1000),
    logicAnalysis: sanitizeText(input.logicAnalysis, 'analysis.logicAnalysis', 1000),
    vocabularyAnalysis: sanitizeText(input.vocabularyAnalysis, 'analysis.vocabularyAnalysis', 1000),
    scoreImprovementFrom: Math.round(numberInRange(input.scoreImprovementFrom, 58)),
    scoreImprovementTo: Math.round(numberInRange(input.scoreImprovementTo, 66)),
  };
}

function validateSpeakingPracticePayload(value: unknown) {
  const input = typeof value === 'object' && value ? value as Record<string, unknown> : {};
  const analysisMode = ['live', 'fallback', 'unknown'].includes(String(input.analysisMode))
    ? input.analysisMode as 'live' | 'fallback' | 'unknown'
    : 'unknown';

  return {
    examId: typeof input.examId === 'string' ? input.examId : 'cet4',
    modeId: typeof input.modeId === 'string' ? input.modeId : 'cet-set4-retell',
    startedAt: typeof input.startedAt === 'string' ? input.startedAt : new Date().toISOString(),
    originalSpeech: sanitizeText(input.originalSpeech, 'originalSpeech', 3000),
    analysis: validateSpeakingAnalysis(input.analysis),
    analysisMode,
  };
}

function normalizeMistakeReasons(value: unknown, fallback: MistakeReason[]): MistakeReason[] {
  const raw = Array.isArray(value) ? value : fallback;
  const reasons = raw.filter((item): item is MistakeReason =>
    typeof item === 'string' && VALID_MISTAKE_REASONS.includes(item as MistakeReason),
  );
  return Array.from(new Set(reasons.length > 0 ? reasons : fallback));
}

function normalizeStringArray(value: unknown, fallback: string[], label: string): string[] {
  const raw = Array.isArray(value) ? value : fallback;
  const items = raw
    .map((item, index) => sanitizeText(item, `${label}[${index}]`, 1000))
    .filter(Boolean);
  return items.length > 0 ? items : fallback;
}

function normalizeSubjectiveAnalysis(value: unknown, moduleId: 'writing' | 'translation'): SubjectivePracticeAnalysis {
  const input = typeof value === 'object' && value ? value as Record<string, unknown> : {};
  const fallbackReason: MistakeReason = moduleId === 'translation' ? '中文干扰' : '论证结构松散';

  return {
    score: Math.round(numberInRange(input.score, 66)),
    mistakeReasons: normalizeMistakeReasons(input.mistakeReasons, [fallbackReason]),
    comments: normalizeStringArray(input.comments, ['反馈暂时不可用，请先检查结构、语法和表达是否完整。'], 'comments'),
    nextActions: normalizeStringArray(input.nextActions, ['重写一版，明确主题句并修正高频表达错误。'], 'nextActions'),
    sampleAnswer: sanitizeText(input.sampleAnswer, 'sampleAnswer', 4000),
    confidence: ['low', 'medium', 'high'].includes(String(input.confidence))
      ? input.confidence as 'low' | 'medium' | 'high'
      : 'medium',
  };
}

function validateSubjectivePracticePayload(value: unknown): BuildSubjectivePracticeReportInput {
  const input = typeof value === 'object' && value ? value as Record<string, unknown> : {};
  const moduleId = input.moduleId === 'translation' ? 'translation' : 'writing';

  return {
    examId: typeof input.examId === 'string' ? input.examId : 'cet4',
    moduleId,
    questionTypeId: typeof input.questionTypeId === 'string' ? input.questionTypeId : `${moduleId}-prompt`,
    modeId: typeof input.modeId === 'string' ? input.modeId : `${moduleId}-practice`,
    plannedMinutes: Number.isFinite(Number(input.plannedMinutes)) ? Math.max(1, Math.min(240, Number(input.plannedMinutes))) : moduleId === 'translation' ? 30 : 30,
    startedAt: typeof input.startedAt === 'string' ? input.startedAt : new Date().toISOString(),
    prompt: sanitizeText(input.prompt, 'prompt', 2000),
    answer: sanitizeText(input.answer, 'answer', 5000),
    analysis: normalizeSubjectiveAnalysis(input.analysis, moduleId),
  };
}

function parseJsonResponse(text: string): unknown {
  const normalized = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '');

  try {
    return JSON.parse(normalized);
  } catch {
    throw new Error('AI provider returned invalid JSON');
  }
}

function getAiProviderConfig(): AiProviderConfig | null {
  if (process.env.NODE_ENV === 'test' && process.env.ALLOW_LIVE_AI_IN_TESTS !== 'true') {
    return null;
  }

  const explicitProvider = readEnvironmentValue('AI_PROVIDER')?.toLowerCase();
  const openAiBaseUrl = readEnvironmentValue('AI_BASE_URL');
  const openAiApiKey = readEnvironmentValue('AI_API_KEY');

  if ((explicitProvider === 'openai-compatible' || explicitProvider === 'baseui' || !explicitProvider) && openAiBaseUrl && openAiApiKey) {
    return {
      type: 'openai-compatible',
      providerName: explicitProvider === 'baseui' ? 'baseui' : 'openai-compatible',
      baseUrl: openAiBaseUrl.replace(/\/+$/, ''),
      apiKey: openAiApiKey,
      model: readEnvironmentValue('AI_MODEL') || 'gpt-4o-mini',
    };
  }

  const geminiApiKey = readEnvironmentValue('GEMINI_API_KEY');
  if ((explicitProvider === 'gemini' || !explicitProvider) && geminiApiKey) {
    return {
      type: 'gemini',
      providerName: 'gemini',
      apiKey: geminiApiKey,
      model: readEnvironmentValue('GEMINI_MODEL') || 'gemini-3.5-flash',
    };
  }

  return null;
}

function getAiProviderStatus() {
  const config = getAiProviderConfig();
  return {
    configured: Boolean(config),
    provider: config?.providerName ?? 'mock',
    model: config?.model ?? 'offline-fallback',
  };
}

function getPublicAiStatus() {
  const providerStatus = getAiProviderStatus();
  const ai = getObservabilitySummary().ai;
  const hasFallbacks = ai.fallbacksTotal > 0;
  const statusReason = !providerStatus.configured
    ? 'not_configured'
    : ai.lastFallbackReason;
  const hasUsageLimitFallback = statusReason === 'usage_limited';
  const isMostlyFallback = ai.requestsTotal >= 3 && ai.fallbackRate >= 0.5;
  const state = !providerStatus.configured
    ? 'offline-fallback'
    : hasUsageLimitFallback || isMostlyFallback
      ? 'degraded'
      : 'ready';

  return {
    configured: providerStatus.configured,
    provider: providerStatus.provider,
    model: providerStatus.model,
    state,
    fallbackAvailable: true,
    shouldNotifyUser: !providerStatus.configured || isMostlyFallback || hasFallbacks,
    requestsTotal: ai.requestsTotal,
    fallbacksTotal: ai.fallbacksTotal,
    fallbackRate: ai.fallbackRate,
    averageLatencyMs: ai.averageLatencyMs,
    fallbacksByReason: ai.fallbacksByReason,
    lastFallbackReason: ai.lastFallbackReason,
    lastFallbackAt: ai.lastFallbackAt,
    statusReason,
    checkedAt: new Date().toISOString(),
  };
}

function getGenAI(): GoogleGenAI {
  const config = getAiProviderConfig();
  if (!config || config.type !== 'gemini') {
    throw new Error('Gemini provider is not configured.');
  }
  return new GoogleGenAI({
    apiKey: config.apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'english-training-cabin',
      },
    },
  });
}

async function callOpenAiCompatibleJson(config: Extract<AiProviderConfig, { type: 'openai-compatible' }>, params: {
  systemInstruction: string;
  prompt: string;
}): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  try {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.model,
        temperature: 0.4,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: params.systemInstruction },
          { role: 'user', content: params.prompt },
        ],
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`OpenAI-compatible provider failed with HTTP ${response.status}: ${detail.slice(0, 240)}`);
    }

    const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('OpenAI-compatible provider returned an empty message');
    }

    return parseJsonResponse(content);
  } finally {
    clearTimeout(timeout);
  }
}

async function generateStructuredJson(params: {
  systemInstruction: string;
  prompt: string;
  geminiSchema: object;
}): Promise<unknown> {
  const config = getAiProviderConfig();
  if (!config) {
    throw new Error('No AI provider configured');
  }

  if (config.type === 'openai-compatible') {
    return callOpenAiCompatibleJson(config, params);
  }

  const ai = getGenAI();
  const response = await ai.models.generateContent({
    model: config.model,
    contents: params.prompt,
    config: {
      responseMimeType: 'application/json',
      systemInstruction: params.systemInstruction,
      responseSchema: params.geminiSchema,
    },
  });

  return parseJsonResponse(response.text || '');
}

function buildMockPassage(topic: string) {
  return {
    title: `${topic} (CET-4 模拟阅读)`,
    content: `The development of modern technology is changing the way people study and communicate. Supporters believe that digital tools can provide flexible learning resources and help students review difficult points at their own pace. This flexibility is especially useful for learners who have limited time every day.

However, experts also warn that technology cannot replace active thinking. If students only read explanations without testing themselves, they may feel familiar with the material but fail to remember it during an exam. A recent classroom observation found that learners improved more quickly when they combined short practice sessions with spaced review.

Therefore, a balanced learning plan should include practice, feedback, and review. Teachers and learning systems can guide students to notice why they make mistakes and when they should return to the same problem. In this way, technology becomes a training assistant rather than a shortcut.`,
    questions: [
      {
        id: 1,
        question: 'What is one benefit of digital learning tools mentioned in the passage?',
        options: { A: 'They remove the need for practice.', B: 'They provide flexible learning resources.', C: 'They guarantee perfect exam scores.', D: 'They replace all teachers.' },
        correctAnswer: 'B',
        explanation: '第一段提到 digital tools can provide flexible learning resources，因此 B 是正确答案。',
        type: '细节理解',
        correctSentence: 'Supporters believe that digital tools can provide flexible learning resources and help students review difficult points at their own pace.',
        distractorSentence: 'However, experts also warn that technology cannot replace active thinking.',
      },
      {
        id: 2,
        question: 'What problem may happen if students only read explanations?',
        options: { A: 'They may not remember material in an exam.', B: 'They will improve pronunciation immediately.', C: 'They will finish every review task.', D: 'They may stop using technology.' },
        correctAnswer: 'A',
        explanation: '第二段说明只看解析会产生熟悉感，但考试时可能记不住。',
        type: '因果推理',
        correctSentence: 'If students only read explanations without testing themselves, they may feel familiar with the material but fail to remember it during an exam.',
        distractorSentence: 'This flexibility is especially useful for learners who have limited time every day.',
      },
      {
        id: 3,
        question: 'Which learning method helped learners improve more quickly?',
        options: { A: 'Long lectures without review.', B: 'Short practice sessions with spaced review.', C: 'Memorizing answers only.', D: 'Avoiding feedback.' },
        correctAnswer: 'B',
        explanation: '原文指出 combined short practice sessions with spaced review 的学习者进步更快。',
        type: '细节理解',
        correctSentence: 'A recent classroom observation found that learners improved more quickly when they combined short practice sessions with spaced review.',
        distractorSentence: 'Teachers and learning systems can guide students to notice why they make mistakes and when they should return to the same problem.',
      },
      {
        id: 4,
        question: 'According to the passage, what should a balanced learning plan include?',
        options: { A: 'Practice, feedback, and review.', B: 'Games, rankings, and rewards.', C: 'Only reading and translation.', D: 'Only AI-generated summaries.' },
        correctAnswer: 'A',
        explanation: '最后一段第一句直接给出 balanced learning plan should include practice, feedback, and review。',
        type: '细节定位',
        correctSentence: 'Therefore, a balanced learning plan should include practice, feedback, and review.',
        distractorSentence: 'In this way, technology becomes a training assistant rather than a shortcut.',
      },
      {
        id: 5,
        question: 'What is the best title for this passage?',
        options: { A: 'Why Exams Should Disappear', B: 'Technology as a Balanced Learning Assistant', C: 'The End of Classroom Learning', D: 'How to Avoid All Mistakes' },
        correctAnswer: 'B',
        explanation: '文章围绕技术如何辅助练习、反馈和复习展开，最佳标题是 B。',
        type: '主旨大意',
        correctSentence: 'In this way, technology becomes a training assistant rather than a shortcut.',
        distractorSentence: 'The development of modern technology is changing the way people study and communicate.',
      },
    ],
  };
}

function buildMockSpeechAnalysis(originalSpeech: string) {
  const fillerMatches = originalSpeech.match(/\b(um|uh|ah|you know|like)\b/gi) ?? [];
  return {
    originalTextWithMarkings: originalSpeech.replace(/\b(um|uh|ah|you know|like)\b/gi, '[filler $1]'),
    improvedTextWithConnectors:
      'In my opinion, this topic is meaningful because it is closely connected with daily learning. However, we should use technology carefully and keep active thinking during practice.',
    fillerCount: fillerMatches.length,
    fluencyAnalysis: fillerMatches.length > 0
      ? '检测到若干填充词，建议先用短句表达核心观点，再补充原因。'
      : '整体停顿较少，可以继续提升意群停顿和句间衔接。',
    logicAnalysis: '建议固定使用观点、原因、转折、总结四段式，让 CET-SET4 回答更稳定。',
    vocabularyAnalysis: '可以用 meaningful、closely connected、active thinking 等表达替换 very good、important 等基础词。',
    scoreImprovementFrom: 58,
    scoreImprovementTo: 66,
  };
}

function buildMockSubjectiveAnalysis(moduleId: 'writing' | 'translation', answer: string): SubjectivePracticeAnalysis {
  if (moduleId === 'translation') {
    return {
      score: 68,
      mistakeReasons: ['中文干扰', '搭配错误'],
      comments: [
        '译文基本传达了原意，但句序仍受中文影响较明显。',
        '部分动词搭配和抽象名词表达不够自然。',
      ],
      nextActions: [
        '先确定英文主干，再处理修饰成分。',
        '把“促进发展”优先改为 promote development 或 support growth。',
      ],
      sampleAnswer:
        'In recent years, renewable energy has played an increasingly important role in urban development, helping cities reduce pollution and build a more sustainable future.',
      confidence: answer.length > 120 ? 'medium' : 'low',
    };
  }

  return {
    score: 70,
    mistakeReasons: ['论证结构松散', '语法错误'],
    comments: [
      '观点能够成立，但段落结构需要更清楚地区分论点和原因。',
      '建议减少重复基础词，补充具体例子支撑主题句。',
    ],
    nextActions: [
      '按 topic sentence、reason、example、conclusion 重写一段。',
      '至少加入一个连接词，如 however、therefore 或 in addition。',
    ],
    sampleAnswer:
      'Digital learning tools can improve study efficiency when they are used with clear goals. For example, students can review mistakes immediately and return to weak points through spaced practice. Therefore, technology should serve as a training assistant rather than a shortcut.',
    confidence: answer.length > 140 ? 'medium' : 'low',
  };
}

type DiagnosticAiRequestItem = {
  id: string;
  skillArea: 'translation' | 'writing' | 'speaking';
  title: string;
  context: string;
  prompt: string;
  answer: string;
  minWords: number;
};

type DiagnosticAiEvaluationPayload = {
  itemId: string;
  score: number;
  mistakeReasons: MistakeReason[];
  comments: string[];
  nextActions: string[];
  evidence: string[];
  confidence: 'low' | 'medium' | 'high';
  source: 'ai' | 'fallback';
};

function validateDiagnosticAiPayload(value: unknown): { examId: string; items: DiagnosticAiRequestItem[] } {
  const input = typeof value === 'object' && value ? value as Record<string, unknown> : {};
  const rawItems = Array.isArray(input.items) ? input.items : [];
  if (rawItems.length === 0) {
    throw new Error('items must contain at least one subjective diagnostic item');
  }
  if (rawItems.length > 3) {
    throw new Error('items cannot contain more than 3 subjective diagnostic items');
  }

  const items = rawItems.map((rawItem, index) => {
    const item = typeof rawItem === 'object' && rawItem ? rawItem as Record<string, unknown> : {};
    const skillArea = ['translation', 'writing', 'speaking'].includes(String(item.skillArea))
      ? item.skillArea as DiagnosticAiRequestItem['skillArea']
      : null;
    if (!skillArea) {
      throw new Error(`items[${index}].skillArea must be translation, writing, or speaking`);
    }

    return {
      id: sanitizeText(item.id, `items[${index}].id`, 120),
      skillArea,
      title: sanitizeText(item.title, `items[${index}].title`, 200),
      context: sanitizeText(item.context, `items[${index}].context`, 2000),
      prompt: sanitizeText(item.prompt, `items[${index}].prompt`, 2000),
      answer: sanitizeText(item.answer, `items[${index}].answer`, 5000),
      minWords: Math.round(numberInRange(item.minWords, 30, 1, 120)),
    };
  });

  return {
    examId: typeof input.examId === 'string' ? input.examId : 'cet4',
    items,
  };
}

function normalizeDiagnosticAiEvaluation(
  value: unknown,
  item: DiagnosticAiRequestItem,
  source: 'ai' | 'fallback',
): DiagnosticAiEvaluationPayload {
  const input = typeof value === 'object' && value ? value as Record<string, unknown> : {};
  const fallbackReason: MistakeReason =
    item.skillArea === 'translation' ? '中文干扰' : item.skillArea === 'writing' ? '论证结构松散' : '表达不自然';
  const confidence = ['low', 'medium', 'high'].includes(String(input.confidence))
    ? input.confidence as 'low' | 'medium' | 'high'
    : source === 'ai' ? 'medium' : 'low';

  return {
    itemId: item.id,
    score: Math.round(numberInRange(input.score, source === 'ai' ? 66 : 60, 0, 100)),
    mistakeReasons: normalizeMistakeReasons(input.mistakeReasons, [fallbackReason]),
    comments: normalizeStringArray(input.comments, ['主观题已完成规则兜底初筛，AI 复核暂不可用。'], 'comments'),
    nextActions: normalizeStringArray(input.nextActions, ['先按本地规则反馈完成专项训练，再用新题复测。'], 'nextActions'),
    evidence: normalizeStringArray(input.evidence, ['当前仅使用本地兜底证据。'], 'evidence'),
    confidence,
    source,
  };
}

function buildFallbackDiagnosticAiEvaluation(item: DiagnosticAiRequestItem): DiagnosticAiEvaluationPayload {
  const wordCount = item.answer.split(/[^\p{L}\p{N}'-]+/u).filter(Boolean).length;
  const completionRatio = Math.min(1, wordCount / Math.max(1, item.minWords));
  const score = Math.round(48 + completionRatio * 22);
  return normalizeDiagnosticAiEvaluation({
    score,
    mistakeReasons: [item.skillArea === 'translation' ? '中文干扰' : item.skillArea === 'writing' ? '论证结构松散' : '表达不自然'],
    comments: [`AI 暂不可用，已按字数和任务完成度做兜底初筛：${wordCount}/${item.minWords} 词。`],
    nextActions: ['先补齐题目要求、核心信息和连接结构，再做同类专项复测。'],
    evidence: [`作答长度 ${wordCount} 词，最低要求 ${item.minWords} 词。`],
    confidence: 'low',
  }, item, 'fallback');
}

function normalizeDiagnosticAiEvaluations(value: unknown, items: DiagnosticAiRequestItem[], source: 'ai' | 'fallback') {
  const input = typeof value === 'object' && value ? value as Record<string, unknown> : {};
  const rawEvaluations = Array.isArray(input.evaluations) ? input.evaluations : [];
  const rawById = new Map(rawEvaluations
    .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
    .map((item) => [String(item.itemId), item]));

  return Object.fromEntries(items.map((item) => [
    item.id,
    rawById.has(item.id)
      ? normalizeDiagnosticAiEvaluation(rawById.get(item.id), item, source)
      : buildFallbackDiagnosticAiEvaluation(item),
  ]));
}

function normalizeConfidence(value: unknown, fallback: 'low' | 'medium' | 'high' = 'low'): 'low' | 'medium' | 'high' {
  return ['low', 'medium', 'high'].includes(String(value)) ? value as 'low' | 'medium' | 'high' : fallback;
}

function cleanAiText(value: unknown, fallback: string, maxLength: number) {
  if (typeof value !== 'string') return fallback;
  const normalized = value.trim().replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ');
  return normalized ? normalized.slice(0, maxLength) : fallback;
}

function normalizeLocalPaperAnswerReference(
  value: unknown,
  paper: { id: string; title: string },
): LocalRealPaperAnswerReference {
  const input = typeof value === 'object' && value ? value as Record<string, unknown> : {};
  const rawSections = Array.isArray(input.answerSections) ? input.answerSections : [];
  const answerSections = rawSections
    .filter((section): section is Record<string, unknown> => typeof section === 'object' && section !== null)
    .map((section, sectionIndex) => {
      const rawAnswers = Array.isArray(section.answers) ? section.answers : [];
      return {
        section: cleanAiText(section.section, `Section ${sectionIndex + 1}`, 80),
        answers: rawAnswers
          .filter((answer): answer is Record<string, unknown> => typeof answer === 'object' && answer !== null)
          .slice(0, 80)
          .map((answer, answerIndex) => ({
            questionNumber: cleanAiText(answer.questionNumber, String(answerIndex + 1), 20),
            answer: cleanAiText(answer.answer, '不确定', 20),
            confidence: normalizeConfidence(answer.confidence, 'low'),
            explanation: cleanAiText(answer.explanation, '', 240) || undefined,
          })),
      };
    })
    .filter((section) => section.answers.length > 0);
  const rawListeningPractice = typeof input.listeningPractice === 'object' && input.listeningPractice
    ? input.listeningPractice as Record<string, unknown>
    : {};
  const listeningScript = cleanAiText(rawListeningPractice.script, '', 4000);

  return {
    paperId: paper.id,
    paperTitle: paper.title,
    generatedAt: new Date().toISOString(),
    source: 'ai-reference',
    confidence: normalizeConfidence(input.confidence, 'low'),
    notice: 'AI 参考答案与 AI 听力练习脚本仅供自学核对，不是官方答案或官方音频。',
    writingReference: cleanAiText(input.writingReference, '', 1600) || undefined,
    translationReference: cleanAiText(input.translationReference, '', 1600) || undefined,
    answerSections,
    listeningPractice: listeningScript
      ? {
          mode: 'browser-tts',
          title: cleanAiText(rawListeningPractice.title, 'AI 听力练习脚本', 120),
          script: listeningScript,
          notice: '这是基于试卷题面生成的非官方练习脚本，由浏览器朗读，不等同于真题原音。',
        }
      : undefined,
  };
}

function getLocalPaperReferenceCachePath(paperId: string) {
  const safePaperId = paperId.replace(/[^a-zA-Z0-9_-]/g, '-');
  return path.join(process.cwd(), '.data', 'local-real-paper-references', `${safePaperId}.json`);
}

async function readCachedLocalPaperReference(paperId: string): Promise<LocalRealPaperAnswerReference | null> {
  try {
    const raw = await fs.readFile(getLocalPaperReferenceCachePath(paperId), 'utf8');
    return JSON.parse(raw) as LocalRealPaperAnswerReference;
  } catch {
    return null;
  }
}

async function writeCachedLocalPaperReference(reference: LocalRealPaperAnswerReference) {
  const filePath = getLocalPaperReferenceCachePath(reference.paperId);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(reference, null, 2), 'utf8');
}

function normalizeExtractedPaperText(value: string) {
  return value
    .replace(/https?:\/\/[^\s]+/gi, ' ')
    .replace(/\b(?:[\w-]+\.)?burningvocabulary\.cn\b/gi, ' ')
    .replace(/\bzhenti\.[^\s]+/gi, ' ')
    .replace(/\bwww\.[^\s]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s+(Part\s+[IVX]+)\s+/gi, '\n\n$1 ')
    .replace(/\s+(Section\s+[A-C])\s+/gi, '\n\n$1 ')
    .replace(/\s+(Directions:)\s+/gi, '\n$1 ')
    .replace(/\s+(Questions?\s+\d+(?:\s+(?:and|to)\s+\d+)?\s+are\s+based)/gi, '\n$1')
    .replace(/\s+(\d{1,2}\.)\s+/g, '\n$1 ')
    .replace(/\s+([A-D]\.)\s+/g, '\n$1 ')
    .trim();
}

function findHeadingIndex(text: string, patterns: RegExp[]) {
  return patterns
    .map((pattern) => {
      const match = pattern.exec(text);
      return match?.index ?? -1;
    })
    .filter((index) => index >= 0)
    .sort((left, right) => left - right)[0] ?? -1;
}

function buildLocalPaperContent(params: {
  paperId: string;
  paperTitle: string;
  pageCount: number;
  truncated: boolean;
  pages: Array<{ pageNumber: number; text: string }>;
  text: string;
}): LocalRealPaperContent {
  const normalizedText = normalizeExtractedPaperText(params.text);
  const sectionDefinitions: Array<{
    id: LocalRealPaperContentSection['id'];
    label: string;
    title: string;
    patterns: RegExp[];
  }> = [
    {
      id: 'writing',
      label: '一、写作',
      title: 'Part I Writing',
      patterns: [/Part\s*I\s*Writing/i, /写作/u],
    },
    {
      id: 'listening',
      label: '二、听力',
      title: 'Part II Listening Comprehension',
      patterns: [/Part\s*II\s*Listening\s*Comprehension/i, /听力/u],
    },
    {
      id: 'reading',
      label: '三、阅读理解',
      title: 'Part III Reading Comprehension',
      patterns: [/Part\s*III\s*Reading\s*Comprehension/i, /阅读/u],
    },
    {
      id: 'translation',
      label: '四、翻译',
      title: 'Part IV Translation',
      patterns: [/Part\s*IV\s*Translation/i, /翻译/u],
    },
  ];

  const positions = sectionDefinitions
    .map((definition) => ({
      ...definition,
      index: findHeadingIndex(normalizedText, definition.patterns),
    }))
    .filter((definition) => definition.index >= 0)
    .sort((left, right) => left.index - right.index);

  const sections = positions.map((definition, index) => {
    const nextDefinition = positions[index + 1];
    const text = normalizedText.slice(definition.index, nextDefinition?.index ?? normalizedText.length).trim();
    return {
      id: definition.id,
      label: definition.label,
      title: definition.title,
      text,
    };
  }).filter((section) => section.text.length > 0);

  return {
    paperId: params.paperId,
    paperTitle: params.paperTitle,
    pageCount: params.pageCount,
    truncated: params.truncated,
    generatedAt: new Date().toISOString(),
    sections: sections.length > 0
      ? sections
      : [{ id: 'full-text', label: '全文', title: 'PDF 提取文本', text: normalizedText }],
    pages: params.pages.map((page) => ({
      pageNumber: page.pageNumber,
      text: normalizeExtractedPaperText(page.text),
    })),
  };
}

const GENERATED_LISTENING_AUDIO_VERSION = 'question-focused-v2';

type LocalRealPaperFile = LocalRealExamPaper & {
  absolutePath: string;
  answerKeyPath?: string;
  answerKeyText?: string;
  answerKeySourcePath?: string;
  listeningAudioPath?: string;
  setOrder?: number;
};

function isLocalRealPaperPathInsideRoot(root: string, candidate: string) {
  const relative = path.relative(root, candidate);
  return relative === '' || (Boolean(relative) && !relative.startsWith('..') && !path.isAbsolute(relative));
}

function toBundledLocalRealPaper(paper: LocalRealExamPaper, stat?: { size: number; mtime: Date }): LocalRealExamPaper {
  const supportsBrowserListening = paper.hasListeningContent && paper.listeningSource !== 'missing';

  return {
    ...paper,
    pdfUrl: `/api/local-real-papers/${paper.id}/pdf`,
    sizeBytes: stat?.size ?? paper.sizeBytes,
    lastModifiedAt: stat?.mtime.toISOString() ?? paper.lastModifiedAt,
    hasListeningAudio: false,
    listeningAudioUrl: undefined,
    listeningSource: supportsBrowserListening ? 'browser-tts' : 'missing',
    note: supportsBrowserListening
      ? '内置 PDF 真题；未匹配官方听力原音，页面版听力文本支持浏览器朗读。'
      : paper.note,
  };
}

async function resolveBundledLocalRealPaperFile(paperId: string): Promise<LocalRealPaperFile | null> {
  const bundledPaper = CET4_LOCAL_REAL_PAPERS.find((paper) => paper.id === paperId);
  if (!bundledPaper) return null;

  const relativePdfPath = bundledPaper.pdfUrl.replace(/^\/+/, '').split('/').join(path.sep);
  const candidateRoots = [
    path.resolve(process.cwd(), 'dist'),
    path.resolve(process.cwd(), 'public'),
  ];

  for (const root of candidateRoots) {
    const absolutePath = path.resolve(root, relativePdfPath);
    if (!isLocalRealPaperPathInsideRoot(root, absolutePath)) continue;

    try {
      const stat = await fs.stat(absolutePath);
      if (!stat.isFile()) continue;

      return {
        ...toBundledLocalRealPaper(bundledPaper, { size: stat.size, mtime: stat.mtime }),
        absolutePath,
        fileName: path.basename(absolutePath),
        source: 'bundled',
      };
    } catch {
      // Try the next build root.
    }
  }

  return null;
}

async function listBundledLocalRealPapers() {
  const papers = await Promise.all(
    CET4_LOCAL_REAL_PAPERS.map(async (paper) => resolveBundledLocalRealPaperFile(paper.id)),
  );

  return papers
    .filter((paper): paper is LocalRealPaperFile => Boolean(paper))
    .map((paper) => {
      const { absolutePath: _absolutePath, answerKeyPath: _answerKeyPath, answerKeyText: _answerKeyText, answerKeySourcePath: _answerKeySourcePath, listeningAudioPath: _listeningAudioPath, setOrder: _setOrder, ...publicPaper } = paper;
      return publicPaper;
    });
}

function getLocalRealPaperScanOptions(examId: 'cet4') {
  return {
    root: readEnvironmentValue('LOCAL_REAL_PAPER_ROOT'),
    answerRoot: readEnvironmentValue('LOCAL_REAL_PAPER_ANSWER_ROOT'),
    audioRoot: readEnvironmentValue('LOCAL_REAL_PAPER_AUDIO_ROOT'),
    examId,
  };
}

async function findAnyLocalRealPaperFile(paperId: string): Promise<LocalRealPaperFile | null> {
  const scannedPaper = await findLocalRealPaperFile({
    ...getLocalRealPaperScanOptions('cet4'),
    paperId,
  });

  return scannedPaper ?? resolveBundledLocalRealPaperFile(paperId);
}

function getGeneratedListeningAudioRoot() {
  const configuredRoot = readEnvironmentValue('LOCAL_REAL_PAPER_GENERATED_AUDIO_ROOT');
  if (configuredRoot) return path.resolve(configuredRoot);
  return path.join(process.env.LOCALAPPDATA || os.tmpdir(), 'english-training-cabin', 'local-real-listening-audio');
}

function buildListeningTtsText(content: LocalRealPaperContent) {
  const listeningSection = content.sections.find((section) => section.id === 'listening');
  const listeningText = listeningSection?.text.trim() || content.pages.map((page) => page.text).join('\n').trim();
  const questionFocusedText = listeningText
    .replace(/\s+/g, ' ')
    .replace(/Part\s*II\s*Listening\s*Comprehension\s*\(?\d+\s*minutes?\)?/gi, ' ')
    .replace(/Directions:\s.*?(?=(?:Section\s+[A-C])|(?:Questions?\s+\d)|$)/gi, ' ')
    .replace(/\bSection\s+A\b/gi, '\nSection A. Short news reports.')
    .replace(/\bSection\s+B\b/gi, '\nSection B. Long conversations.')
    .replace(/\bSection\s+C\b/gi, '\nSection C. Listening passages.')
    .replace(/Questions?\s+(\d+)\s+and\s+(\d+)\s+are\s+based/gi, '\nQuestions $1 and $2 are based')
    .replace(/Questions?\s+(\d+)\s+to\s+(\d+)\s+are\s+based/gi, '\nQuestions $1 to $2 are based')
    .replace(/\b([A-D])\.\s+/g, '\nOption $1. ')
    .replace(/\b(\d{1,2})\.\s+/g, '\nQuestion $1. ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const body = questionFocusedText.length > 120
    ? questionFocusedText
    : 'This PDF does not contain a stable listening transcript. Please use the visible listening questions and choices for review.';

  return [
    `Question-focused listening practice audio for ${content.paperTitle}.`,
    'This is not the official CET-4 recording.',
    'Repeated exam directions have been skipped so each paper starts from its own questions and choices.',
    body.slice(0, 18_000),
  ].join('\n\n');
}

class PracticeTtsUnavailableError extends Error {
  constructor(message = '服务器当前未安装可用的英语语音引擎，请稍后重试。') {
    super(message);
    this.name = 'PracticeTtsUnavailableError';
  }
}

function clampPracticeSpeechRate(rate?: number) {
  if (!Number.isFinite(rate)) return 0.9;
  return Math.max(0.6, Math.min(1.4, Number(rate)));
}

function toWindowsSpeechRate(browserRate?: number) {
  return Math.max(-4, Math.min(4, Math.round((clampPracticeSpeechRate(browserRate) - 1) * 5)));
}

function toEspeakWordsPerMinute(browserRate?: number) {
  return Math.max(110, Math.min(260, Math.round(175 * clampPracticeSpeechRate(browserRate))));
}

function toEdgeTtsRate(browserRate?: number) {
  const percent = Math.max(-30, Math.min(30, Math.round((clampPracticeSpeechRate(browserRate) - 1) * 45)));
  return `${percent >= 0 ? '+' : ''}${percent}%`;
}

function isEdgeTtsEnabled() {
  const configured = readEnvironmentValue('PRACTICE_EDGE_TTS_ENABLED')?.toLowerCase();
  return configured !== 'false' && configured !== '0' && configured !== 'no';
}

function getEdgeTtsCommand() {
  return readEnvironmentValue('PRACTICE_EDGE_TTS_COMMAND') ?? DEFAULT_EDGE_TTS_COMMAND;
}

function getEdgeTtsVoice() {
  return readEnvironmentValue('PRACTICE_EDGE_TTS_VOICE') ?? DEFAULT_EDGE_TTS_VOICE;
}

export function buildEdgeTtsArguments(text: string, outputPath: string, options: { browserRate?: number } = {}) {
  return [
    `--voice=${getEdgeTtsVoice()}`,
    `--rate=${toEdgeTtsRate(options.browserRate)}`,
    `--text=${text}`,
    `--write-media=${outputPath}`,
  ];
}

function getConfiguredPracticeTtsCommands() {
  const configuredCommand = readEnvironmentValue('PRACTICE_TTS_COMMAND');
  return configuredCommand ? [configuredCommand] : PRACTICE_TTS_DEFAULT_COMMANDS;
}

function isMissingExecutableError(error: unknown) {
  return Boolean(error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT');
}

async function assertGeneratedWaveFile(outputPath: string) {
  const stat = await fs.stat(outputPath);
  if (!stat.isFile() || stat.size <= 44) {
    throw new Error('本机 TTS 音频生成失败。');
  }
}

async function assertGeneratedAudioFile(outputPath: string, minimumBytes = 128) {
  const stat = await fs.stat(outputPath);
  if (!stat.isFile() || stat.size <= minimumBytes) {
    throw new Error('本机 TTS 音频生成失败。');
  }
}

async function runWindowsSpeechToWave(text: string, outputPath: string, options: { browserRate?: number } = {}) {
  if (process.platform !== 'win32') {
    throw new Error('本机 TTS 音频生成当前仅支持 Windows。');
  }

  const textPath = `${outputPath}.txt`;
  const scriptPath = `${outputPath}.ps1`;
  await fs.writeFile(textPath, text, 'utf8');
  const speechRate = toWindowsSpeechRate(options.browserRate);
  const script = `
param(
  [Parameter(Mandatory = $true)][string]$TextPath,
  [Parameter(Mandatory = $true)][string]$OutputPath
)
Add-Type -AssemblyName System.Speech
$text = Get-Content -LiteralPath $TextPath -Raw -Encoding UTF8
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$englishVoices = $synth.GetInstalledVoices() | Where-Object { $_.VoiceInfo.Culture.Name -like 'en-*' }
$voice = $englishVoices | Where-Object { $_.VoiceInfo.Name -like '*Zira*' -or $_.VoiceInfo.Name -like '*Jenny*' -or $_.VoiceInfo.Name -like '*Aria*' -or $_.VoiceInfo.Name -like '*David*' } | Select-Object -First 1
if (-not $voice) { $voice = $englishVoices | Select-Object -First 1 }
if ($voice) { $synth.SelectVoice($voice.VoiceInfo.Name) }
$rateValue = 0
if ($env:ENGLISH_TRAINING_TTS_RATE) { $rateValue = [int]$env:ENGLISH_TRAINING_TTS_RATE }
$synth.Rate = [Math]::Max(-10, [Math]::Min(10, $rateValue))
$synth.Volume = 100
$synth.SetOutputToWaveFile($OutputPath)
$synth.Speak($text)
$synth.Dispose()
`;
  await fs.writeFile(scriptPath, script, 'utf8');

  try {
    await execFileAsync('powershell.exe', [
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-File',
      scriptPath,
      textPath,
      outputPath,
    ], {
      timeout: 180_000,
      windowsHide: true,
      maxBuffer: 1024 * 1024,
      env: {
        ...process.env,
        ENGLISH_TRAINING_TTS_RATE: String(speechRate),
      },
    });
  } finally {
    await fs.rm(textPath, { force: true });
    await fs.rm(scriptPath, { force: true });
  }

  await assertGeneratedWaveFile(outputPath);
}

async function tryRunEdgeSpeechToMp3(text: string, outputPath: string, options: { browserRate?: number } = {}) {
  if (!isEdgeTtsEnabled()) return false;

  try {
    await execFileAsync(getEdgeTtsCommand(), buildEdgeTtsArguments(text, outputPath, options), {
      timeout: 60_000,
      windowsHide: true,
      maxBuffer: 1024 * 1024,
    });
    await assertGeneratedAudioFile(outputPath, 512);
    return true;
  } catch (error) {
    await fs.rm(outputPath, { force: true });
    if (!isMissingExecutableError(error)) {
      console.warn('Natural practice TTS failed, falling back to system TTS:', error);
    }
    return false;
  }
}

async function runEspeakSpeechToWave(text: string, outputPath: string, options: { browserRate?: number } = {}) {
  const textPath = `${outputPath}.txt`;
  await fs.writeFile(textPath, text, 'utf8');
  const speed = toEspeakWordsPerMinute(options.browserRate);
  const commands = getConfiguredPracticeTtsCommands();
  const voices = ['en-us', 'en'];
  let hadInstalledCommandFailure = false;

  try {
    for (const command of commands) {
      for (const voice of voices) {
        try {
          await execFileAsync(command, [
            '-v',
            voice,
            '-s',
            String(speed),
            '-w',
            outputPath,
            '-f',
            textPath,
          ], {
            timeout: 180_000,
            windowsHide: true,
            maxBuffer: 1024 * 1024,
          });
          await assertGeneratedWaveFile(outputPath);
          return;
        } catch (error) {
          if (isMissingExecutableError(error)) break;
          hadInstalledCommandFailure = true;
        }
      }
    }
  } finally {
    await fs.rm(textPath, { force: true });
  }

  throw new PracticeTtsUnavailableError(
    hadInstalledCommandFailure
      ? '服务器英语语音引擎生成音频失败，请稍后重试。'
      : '服务器当前未安装可用的英语语音引擎，请稍后重试。',
  );
}

async function runSystemSpeechToWave(text: string, outputPath: string, options: { browserRate?: number } = {}) {
  if (process.platform === 'win32') {
    await runWindowsSpeechToWave(text, outputPath, options);
    return;
  }

  await runEspeakSpeechToWave(text, outputPath, options);
}

async function runPracticeSpeechToAudio(text: string, outputRoot: string, options: { browserRate?: number } = {}) {
  const outputStem = path.join(outputRoot, `practice-${Date.now()}-${Math.random().toString(36).slice(2)}`);

  if (process.platform !== 'win32') {
    const naturalAudioPath = `${outputStem}.mp3`;
    if (await tryRunEdgeSpeechToMp3(text, naturalAudioPath, options)) {
      return {
        path: naturalAudioPath,
        contentType: 'audio/mpeg',
        fileName: 'practice-tts.mp3',
      };
    }
  }

  const waveAudioPath = `${outputStem}.wav`;
  try {
    await runSystemSpeechToWave(text, waveAudioPath, options);
    return {
      path: waveAudioPath,
      contentType: 'audio/wav',
      fileName: 'practice-tts.wav',
    };
  } catch (error) {
    await fs.rm(waveAudioPath, { force: true });
    throw error;
  }
}

type PracticeTtsCacheStatus = 'hit' | 'miss' | 'wait';

type CachedPracticeTtsAudio = {
  path: string;
  contentType: string;
  fileName: string;
  cacheStatus: PracticeTtsCacheStatus;
};

const practiceTtsInFlight = new Map<string, Promise<CachedPracticeTtsAudio>>();

export function buildPracticeTtsCacheKey(text: string, browserRate?: number) {
  return createHash('sha256')
    .update(JSON.stringify({
      version: PRACTICE_TTS_CACHE_VERSION,
      text,
      rate: clampPracticeSpeechRate(browserRate),
      platform: process.platform,
      edgeEnabled: isEdgeTtsEnabled(),
      edgeVoice: getEdgeTtsVoice(),
      edgeCommand: getEdgeTtsCommand(),
      systemCommands: getConfiguredPracticeTtsCommands(),
    }))
    .digest('hex')
    .slice(0, 32);
}

function getPracticeTtsCacheRoot() {
  return path.join(getGeneratedListeningAudioRoot(), 'practice-tts-cache');
}

function getPracticeTtsCacheCandidates(cacheRoot: string, cacheKey: string) {
  return [
    {
      path: path.join(cacheRoot, `${cacheKey}.mp3`),
      contentType: 'audio/mpeg',
      fileName: 'practice-tts.mp3',
    },
    {
      path: path.join(cacheRoot, `${cacheKey}.wav`),
      contentType: 'audio/wav',
      fileName: 'practice-tts.wav',
    },
  ];
}

async function findCachedPracticeTtsAudio(cacheRoot: string, cacheKey: string): Promise<CachedPracticeTtsAudio | null> {
  for (const candidate of getPracticeTtsCacheCandidates(cacheRoot, cacheKey)) {
    try {
      const stat = await fs.stat(candidate.path);
      if (stat.isFile() && stat.size > 128) {
        return { ...candidate, cacheStatus: 'hit' };
      }
    } catch {
      // Try the next supported audio format.
    }
  }
  return null;
}

async function prunePracticeTtsCache(cacheRoot: string) {
  try {
    const entries = await fs.readdir(cacheRoot, { withFileTypes: true });
    const audioEntries = await Promise.all(entries
      .filter((entry) => entry.isFile() && /\.(?:mp3|wav)$/i.test(entry.name))
      .map(async (entry) => {
        const absolutePath = path.join(cacheRoot, entry.name);
        const stat = await fs.stat(absolutePath);
        return { path: absolutePath, mtimeMs: stat.mtimeMs };
      }));
    const staleEntries = audioEntries
      .sort((a, b) => b.mtimeMs - a.mtimeMs)
      .slice(PRACTICE_TTS_CACHE_MAX_FILES);
    await Promise.all(staleEntries.map((entry) => fs.rm(entry.path, { force: true })));
  } catch {
    // Cache pruning is best-effort and must not block TTS playback.
  }
}

async function generatePracticeTtsCacheAudio(
  text: string,
  cacheRoot: string,
  cacheKey: string,
  options: { browserRate?: number } = {},
): Promise<CachedPracticeTtsAudio> {
  const tempRoot = path.join(cacheRoot, 'tmp');
  await fs.mkdir(tempRoot, { recursive: true });

  const generatedAudio = await runPracticeSpeechToAudio(text, tempRoot, options);
  const extension = generatedAudio.contentType === 'audio/mpeg' ? 'mp3' : 'wav';
  const cachedPath = path.join(cacheRoot, `${cacheKey}.${extension}`);

  try {
    await fs.rename(generatedAudio.path, cachedPath);
  } catch (error) {
    await fs.rm(generatedAudio.path, { force: true });
    const existingAudio = await findCachedPracticeTtsAudio(cacheRoot, cacheKey);
    if (existingAudio) return { ...existingAudio, cacheStatus: 'wait' };
    throw error;
  }

  void prunePracticeTtsCache(cacheRoot);
  return {
    path: cachedPath,
    contentType: generatedAudio.contentType,
    fileName: generatedAudio.fileName,
    cacheStatus: 'miss',
  };
}

async function getCachedPracticeSpeechAudio(
  text: string,
  options: { browserRate?: number } = {},
): Promise<CachedPracticeTtsAudio> {
  const cacheRoot = getPracticeTtsCacheRoot();
  await fs.mkdir(cacheRoot, { recursive: true });
  const cacheKey = buildPracticeTtsCacheKey(text, options.browserRate);
  const cachedAudio = await findCachedPracticeTtsAudio(cacheRoot, cacheKey);
  if (cachedAudio) return cachedAudio;

  const existingGeneration = practiceTtsInFlight.get(cacheKey);
  if (existingGeneration) {
    const audio = await existingGeneration;
    return { ...audio, cacheStatus: 'wait' };
  }

  const generation = generatePracticeTtsCacheAudio(text, cacheRoot, cacheKey, options);
  practiceTtsInFlight.set(cacheKey, generation);
  try {
    return await generation;
  } finally {
    practiceTtsInFlight.delete(cacheKey);
  }
}

async function ensureGeneratedListeningAudio(paper: LocalRealPaperFile) {
  const audioRoot = getGeneratedListeningAudioRoot();
  await fs.mkdir(audioRoot, { recursive: true });
  const outputPath = path.join(audioRoot, `${paper.id}-${GENERATED_LISTENING_AUDIO_VERSION}.wav`);

  try {
    const stat = await fs.stat(outputPath);
    if (stat.isFile() && stat.size > 44) return outputPath;
  } catch {
    // Generate the cache file below.
  }

  const extracted = await extractPdfText(paper.absolutePath, { maxCharacters: 100_000 });
  const content = buildLocalPaperContent({
    paperId: paper.id,
    paperTitle: paper.title,
    pageCount: extracted.pageCount,
    truncated: extracted.truncated,
    pages: extracted.pages,
    text: extracted.text,
  });
  await runSystemSpeechToWave(buildListeningTtsText(content), outputPath);
  return outputPath;
}

export interface CreateAppOptions {
  saasStore?: SaasStore;
  saasSessionSecret?: string | null;
  billingWebhookSecret?: string;
  feedbackFilePath?: string;
}

type AuthenticatedSaasContext = {
  session: SaasSessionPayload;
  account: SaasAccountRecord;
};

function createDefaultSaasStore(): SaasStore {
  if (process.env.NODE_ENV === 'test') {
    return createInMemorySaasStore();
  }
  const databaseUrl = readEnvironmentValue('DATABASE_URL');
  if (databaseUrl) {
    return createPostgresSaasStore(databaseUrl);
  }
  return createFileSaasStore(getDefaultSaasDataFile());
}

function getBearerToken(req: Request): string {
  const authorization = req.get('authorization') ?? '';
  const [type, token] = authorization.split(/\s+/, 2);
  if (type?.toLowerCase() !== 'bearer' || !token) {
    throw new SaasApiError(401, 'missing_token', '请先登录账号。');
  }
  return token;
}

function requireSaasSessionSecret(secret: string | null): string {
  if (!secret) {
    throw new SaasApiError(503, 'auth_not_configured', '账号服务缺少会话密钥，暂时无法登录。');
  }
  return secret;
}

function getSaasContext(res: Response): AuthenticatedSaasContext {
  return res.locals.saas as AuthenticatedSaasContext;
}

function asyncRoute(handler: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res, next).catch(next);
  };
}

export function createApp(options: CreateAppOptions = {}) {
  const app = express();
  const testLimiter = (_req: Request, _res: Response, next: NextFunction) => next();
  const disableRateLimits = process.env.NODE_ENV === 'test' || readEnvironmentValue('DISABLE_RATE_LIMITS') === 'true';
  const aiLimiter = disableRateLimits ? testLimiter : createRateLimiter(20, 60_000);
  const authRateLimitPerMinute = Math.max(15, Math.min(240, Number(readEnvironmentValue('AUTH_RATE_LIMIT_PER_MINUTE') ?? 60)));
  const authLimiter = disableRateLimits ? testLimiter : createRateLimiter(authRateLimitPerMinute, 60_000);
  const practiceTtsLimiter = disableRateLimits ? testLimiter : createRateLimiter(60, 60_000);
  const feedbackLimiter = disableRateLimits ? testLimiter : createRateLimiter(12, 60_000);
  const saasStore = options.saasStore ?? createDefaultSaasStore();
  const saasSessionSecret = options.saasSessionSecret ?? getSaasSessionSecret();
  const billingWebhookSecret = options.billingWebhookSecret ?? readEnvironmentValue('BILLING_WEBHOOK_SECRET');
  const feedbackFilePath = options.feedbackFilePath ?? getDefaultFeedbackFilePath();

  const issueAccountSession = async (account: SaasAccountRecord, req?: Request) => {
    const secret = requireSaasSessionSecret(saasSessionSecret);
    const session = await saasStore.createSession({
      userId: account.user.id,
      organizationId: account.organization.id,
      expiresAt: getSessionExpiresAt(),
      userAgent: req?.get('user-agent')?.slice(0, 240),
      ipAddress: req?.ip,
    });
    return issueSessionToken(account, secret, Math.floor(Date.now() / 1000), session.id);
  };

  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'same-origin');
    res.setHeader('Permissions-Policy', 'microphone=(self)');
    res.setHeader('Content-Security-Policy', buildContentSecurityPolicy());
    if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
      res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
    }
    next();
  });
  app.use(express.json({ limit: JSON_LIMIT }));
  app.use('/api', (req, res, next) => {
    observability.apiRequestsTotal += 1;
    incrementCounter(observability.requestsByPath, `${req.method} ${req.path}`);

    res.on('finish', () => {
      if (res.statusCode >= 400) {
        observability.apiErrorsTotal += 1;
        incrementCounter(observability.errorsByPath, `${req.method} ${req.path}`);
      }
    });

    next();
  });

  const resolveSaasAuth = async (req: Request): Promise<AuthenticatedSaasContext> => {
    const secret = requireSaasSessionSecret(saasSessionSecret);
    const session = verifySessionToken(getBearerToken(req), secret);
    const now = new Date().toISOString();
    const account = await saasStore.getAccountForUser(session.sub);
    const activeSession = await saasStore.getActiveSession(session.jti, session.sub, now);

    if (!account || !activeSession || account.organization.id !== session.org || account.user.role !== session.role) {
      throw new SaasApiError(401, 'invalid_token', '登录状态无效，请重新登录。');
    }

    await saasStore.touchSession(session.jti, now);
    return { session, account } satisfies AuthenticatedSaasContext;
  };

  const requireSaasAuth = asyncRoute(async (req, res, next) => {
    res.locals.saas = await resolveSaasAuth(req);
    next();
  });

  app.get('/api/health', (_req, res) => {
    const ai = getAiProviderStatus();
    const aiStatus = getPublicAiStatus();
    res.json({
      status: 'ok',
      app: 'english-training-cabin',
      aiConfigured: ai.configured,
      aiProvider: ai.provider,
      aiModel: ai.model,
      aiRuntime: {
        state: aiStatus.state,
        fallbackAvailable: aiStatus.fallbackAvailable,
        statusReason: aiStatus.statusReason,
        lastFallbackReason: aiStatus.lastFallbackReason,
      },
      saas: {
        enabled: true,
        authConfigured: Boolean(saasSessionSecret),
        store: saasStore.kind,
        registrationInviteRequired: true,
        registrationInviteConfigured: isRegistrationInviteConfigured(),
      },
      collaboration: {
        invitationDelivery: 'manual-link',
      },
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/api/ai/status', (_req, res) => {
    res.json(getPublicAiStatus());
  });

  app.post('/api/practice/tts', practiceTtsLimiter, asyncRoute(async (req, res, next) => {
    const rawText = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
    if (!rawText) {
      res.status(400).json({ error: 'tts_text_required', message: '请提供需要朗读的英文文本。' });
      return;
    }
    if (rawText.length > PRACTICE_TTS_MAX_CHARACTERS) {
      res.status(400).json({
        error: 'tts_text_too_long',
        message: `练习朗读文本最多支持 ${PRACTICE_TTS_MAX_CHARACTERS} 个字符。`,
      });
      return;
    }
    const rawRate = Number(req.body?.rate ?? 0.9);
    const browserRate = Number.isFinite(rawRate) ? Math.max(0.6, Math.min(1.4, rawRate)) : 0.9;
    let audio: Awaited<ReturnType<typeof getCachedPracticeSpeechAudio>>;

    try {
      audio = await getCachedPracticeSpeechAudio(rawText, { browserRate });
    } catch (error) {
      if (error instanceof PracticeTtsUnavailableError) {
        res.status(501).json({
          error: 'practice_tts_unavailable',
          message: error.message,
        });
        return;
      }
      throw error;
    }
    res.type(audio.contentType);
    res.setHeader('Cache-Control', 'private, max-age=86400');
    res.setHeader('Content-Disposition', `inline; filename="${audio.fileName}"`);
    res.setHeader('X-Practice-TTS-Cache', audio.cacheStatus);
    res.sendFile(audio.path, (error) => {
      if (error && 'code' in error && error.code === 'ECONNABORTED') return;
      if (error) next(error);
    });
  }));

  app.get('/api/exams', (_req, res) => {
    res.json({
      exams: listPublicExamProfiles(),
      activeExamIds: ['cet4'],
      roadmapExamIds: ['cet6', 'ielts', 'toefl'],
      questionBankCoverage: CET4_QUESTION_BANK_COVERAGE,
      mockExam: {
        id: CET4_MOCK_EXAM.id,
        title: CET4_MOCK_EXAM.title,
        plannedMinutes: CET4_MOCK_EXAM.plannedMinutes,
        sourceNotice: CET4_MOCK_EXAM.sourceNotice,
        totalQuestionCount: CET4_MOCK_EXAM.listening.questions.length + CET4_MOCK_EXAM.reading.questions.length + 2,
        writingTaskCount: 1,
        listeningQuestionCount: CET4_MOCK_EXAM.listening.questions.length,
        readingQuestionCount: CET4_MOCK_EXAM.reading.questions.length,
        translationTaskCount: 1,
      },
      degreeEnglish: {
        outline: {
          id: DEGREE_ENGLISH_OUTLINE_2025.id,
          title: DEGREE_ENGLISH_OUTLINE_2025.title,
          plannedMinutes: DEGREE_ENGLISH_OUTLINE_2025.plannedMinutes,
          totalScore: DEGREE_ENGLISH_OUTLINE_2025.totalScore,
          totalQuestionCount: DEGREE_ENGLISH_OUTLINE_2025.totalQuestionCount,
          hasListening: DEGREE_ENGLISH_OUTLINE_2025.hasListening,
        },
        questionBankCoverage: DEGREE_ENGLISH_QUESTION_BANK_COVERAGE,
        mockExam: {
          id: DEGREE_ENGLISH_MOCK_EXAM.id,
          title: DEGREE_ENGLISH_MOCK_EXAM.title,
          plannedMinutes: DEGREE_ENGLISH_MOCK_EXAM.plannedMinutes,
          totalQuestionCount: DEGREE_ENGLISH_MOCK_EXAM.totalQuestionCount,
          vocabularyStructureQuestionCount: DEGREE_ENGLISH_MOCK_EXAM.vocabularyStructure.length,
          useOfEnglishQuestionCount: DEGREE_ENGLISH_MOCK_EXAM.useOfEnglish.questions.length,
          traditionalReadingQuestionCount: DEGREE_ENGLISH_MOCK_EXAM.reading.traditionalQuestions.length,
          paragraphMatchingQuestionCount: DEGREE_ENGLISH_MOCK_EXAM.reading.matchingQuestions.length,
        },
      },
    });
  });

  app.get('/api/local-real-papers', asyncRoute(async (req, res) => {
    const examId = normalizeLocalRealPaperExamId(req.query.exam);
    if (!examId) {
      res.status(400).json({ error: 'unsupported_exam', message: '目前仅支持扫描大学英语四级本地真题。' });
      return;
    }

    const catalog = await listLocalRealPapers(getLocalRealPaperScanOptions(examId));
    const bundledPapers = catalog.papers.length > 0 ? [] : await listBundledLocalRealPapers();
    const papers = catalog.papers.length > 0 ? catalog.papers : bundledPapers;

    res.json({
      ...catalog,
      papers,
      total: papers.length,
      sourceStatus: catalog.papers.length > 0 ? 'local-scan' : 'bundled',
      answerKeyStatus: papers.some((paper) => paper.hasAnswerKey) ? 'ready' : 'missing',
      listeningAssetStatus: papers.some((paper) => paper.hasListeningAudio)
        ? 'ready'
        : papers.some((paper) => paper.listeningSource === 'browser-tts' || paper.hasListeningContent)
          ? 'browser-tts'
          : 'missing',
    });
  }));

  app.get('/api/local-real-papers/:paperId/pdf', asyncRoute(async (req, res, next) => {
    const paper = await findAnyLocalRealPaperFile(req.params.paperId);

    if (!paper) {
      res.status(404).json({ error: 'local_real_paper_not_found', message: '未找到这套本地真题 PDF。' });
      return;
    }

    const encodedFileName = encodeURIComponent(paper.fileName ?? `${paper.id}.pdf`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${paper.id}.pdf"; filename*=UTF-8''${encodedFileName}`);
    res.sendFile(paper.absolutePath, (error) => {
      if (error && 'code' in error && error.code === 'ECONNABORTED') return;
      if (error) next(error);
    });
  }));

  app.get('/api/local-real-papers/:paperId/content', asyncRoute(async (req, res) => {
    const paper = await findAnyLocalRealPaperFile(req.params.paperId);

    if (!paper) {
      res.status(404).json({ error: 'local_real_paper_not_found', message: '未找到这套本地真题 PDF。' });
      return;
    }

    const extracted = await extractPdfText(paper.absolutePath, { maxCharacters: 100_000 });
    res.json({
      content: buildLocalPaperContent({
        paperId: paper.id,
        paperTitle: paper.title,
        pageCount: extracted.pageCount,
        truncated: extracted.truncated,
        pages: extracted.pages,
        text: extracted.text,
      }),
    });
  }));

  app.get('/api/local-real-papers/:paperId/answer-key', asyncRoute(async (req, res, next) => {
    const paper = await findAnyLocalRealPaperFile(req.params.paperId);

    if (!paper?.answerKeyPath && !paper?.answerKeyText) {
      res.status(404).json({ error: 'answer_key_not_found', message: '这套真题暂未匹配到本地答案文件。' });
      return;
    }

    if (paper.answerKeyText) {
      res.type('text/markdown');
      res.send(paper.answerKeyText);
      return;
    }

    res.sendFile(paper.answerKeyPath, (error) => {
      if (error && 'code' in error && error.code === 'ECONNABORTED') return;
      if (error) next(error);
    });
  }));

  app.get('/api/local-real-papers/:paperId/audio', asyncRoute(async (req, res, next) => {
    const paper = await findAnyLocalRealPaperFile(req.params.paperId);

    if (!paper?.listeningAudioPath) {
      res.status(404).json({ error: 'listening_audio_not_found', message: '这套真题暂未匹配到本地听力音频。' });
      return;
    }

    res.type(path.extname(paper.listeningAudioPath));
    res.sendFile(paper.listeningAudioPath, (error) => {
      if (error && 'code' in error && error.code === 'ECONNABORTED') return;
      if (error) next(error);
    });
  }));

  app.get('/api/local-real-papers/:paperId/generated-listening-audio', asyncRoute(async (req, res, next) => {
    const paper = await findAnyLocalRealPaperFile(req.params.paperId);

    if (!paper) {
      res.status(404).json({ error: 'local_real_paper_not_found', message: '未找到这套本地真题 PDF。' });
      return;
    }

    if (paper.listeningAudioPath) {
      res.redirect(302, `/api/local-real-papers/${paper.id}/audio`);
      return;
    }

    if (!canGenerateLocalRealPaperListeningAudio()) {
      res.status(404).json({
        error: 'generated_listening_audio_unavailable',
        message: '当前运行环境未启用本机 TTS 音频生成，请使用页面版听力文本的浏览器朗读。',
      });
      return;
    }

    const audioPath = await ensureGeneratedListeningAudio(paper);
    res.type('audio/wav');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Disposition', `inline; filename="${paper.id}-listening-practice.wav"`);
    res.sendFile(audioPath, (error) => {
      if (error && 'code' in error && error.code === 'ECONNABORTED') return;
      if (error) next(error);
    });
  }));

  app.get('/api/local-real-papers/:paperId/ai-reference', requireSaasAuth, asyncRoute(async (req, res) => {
    const cached = await readCachedLocalPaperReference(req.params.paperId);
    if (!cached) {
      res.json({ reference: null, status: 'missing' });
      return;
    }

    res.json({ reference: cached, status: 'ready' });
  }));

  app.post('/api/local-real-papers/:paperId/ai-reference', requireSaasAuth, aiLimiter, asyncRoute(async (req, res) => {
    const paper = await findAnyLocalRealPaperFile(req.params.paperId);

    if (!paper) {
      res.status(404).json({ error: 'local_real_paper_not_found', message: '未找到这套本地真题 PDF。' });
      return;
    }

    const aiStartedAt = Date.now();
    try {
      const extracted = await extractPdfText(paper.absolutePath, { maxCharacters: 42_000 });
      if (!extracted.text.trim()) {
        res.status(422).json({ error: 'pdf_text_empty', message: '无法从这份 PDF 提取可用于生成参考答案的文字。' });
        return;
      }

      const prompt = `Generate an unofficial CET-4 self-study answer reference from this user-provided PDF text.
Do not claim these are official answers. If a choice answer cannot be inferred confidently, use "不确定" and confidence "low".
For writing and translation, provide reference sample responses when the prompt is visible.
For listening, do not recreate or claim official audio. If no transcript is present, write an original short practice script related to the visible listening context for browser TTS only.
Keep explanations concise in Chinese.

Paper: ${paper.title}
PDF pages: ${extracted.pageCount}
Text was ${extracted.truncated ? 'truncated' : 'not truncated'} for token safety.

Extracted text:
${extracted.text}

Return JSON only with this shape:
{
  "confidence":"low|medium|high",
  "writingReference":"...",
  "translationReference":"...",
  "answerSections":[
    {"section":"Listening Section A","answers":[{"questionNumber":"1","answer":"A","confidence":"medium","explanation":"..."}]}
  ],
  "listeningPractice":{"title":"...","script":"..."}
}`;

      const data = await generateStructuredJson({
        prompt,
        systemInstruction:
          'You generate cautious, clearly unofficial CET-4 self-study references from user-provided material. Never state or imply official answer provenance. Return valid JSON only.',
        geminiSchema: {
          type: Type.OBJECT,
          properties: {
            confidence: { type: Type.STRING },
            writingReference: { type: Type.STRING },
            translationReference: { type: Type.STRING },
            answerSections: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  section: { type: Type.STRING },
                  answers: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        questionNumber: { type: Type.STRING },
                        answer: { type: Type.STRING },
                        confidence: { type: Type.STRING },
                        explanation: { type: Type.STRING },
                      },
                      required: ['questionNumber', 'answer', 'confidence'],
                    },
                  },
                },
                required: ['section', 'answers'],
              },
            },
            listeningPractice: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                script: { type: Type.STRING },
              },
            },
          },
          required: ['confidence', 'answerSections'],
        },
      });

      const reference = normalizeLocalPaperAnswerReference(data, paper);
      await writeCachedLocalPaperReference(reference);
      observeAiResult(aiStartedAt, false);
      res.json({ reference, extracted: { pageCount: extracted.pageCount, truncated: extracted.truncated } });
    } catch (error) {
      console.error('Local real paper AI reference failed:', error);
      const fallbackReason = classifyAiFallbackReason(error);
      observeAiResult(aiStartedAt, true, fallbackReason);
      const errorMessage = (error as Error).message;
      const isUsageLimited = fallbackReason === 'usage_limited' || /USAGE_LIMIT_EXCEEDED|MONTHLY_LIMIT_EXCEEDED|429/.test(errorMessage);
      res.status(isUsageLimited ? 429 : 502).json({
        error: isUsageLimited ? 'ai_usage_limited' : 'ai_reference_failed',
        message: isUsageLimited
          ? 'AI 月度额度已用完，暂时不能生成 AI 参考答案。你可以先放入本地答案/音频文件，系统会自动匹配。'
          : 'AI 参考答案生成失败，请稍后重试或检查 AI 配置。',
      });
    }
  }));

  app.get('/api/observability/summary', requireSaasAuth, (_req, res) => {
    res.json(getObservabilitySummary());
  });

  app.post('/api/telemetry/event', (req, res) => {
    const eventName = typeof req.body?.eventName === 'string' ? req.body.eventName : '';
    if (!ALLOWED_TELEMETRY_EVENTS.has(eventName)) {
      res.status(400).json({ error: 'invalid_event', message: 'Unsupported telemetry event.' });
      return;
    }

    incrementCounter(observability.eventsByName, eventName);
    res.status(204).end();
  });

  app.post('/api/feedback', feedbackLimiter, asyncRoute(async (req, res) => {
    const feedback = validateUserFeedback(req.body);
    await appendUserFeedback(feedbackFilePath, feedback);
    incrementCounter(observability.eventsByName, 'feedback_submitted');
    res.status(201).json({ status: 'received' });
  }));

  app.post('/api/auth/register', authLimiter, asyncRoute(async (req, res) => {
    const account = await registerSaasAccount(saasStore, req.body);
    const recovery = await issuePasswordRecoveryCode(saasStore, account.user.id);
    const token = await issueAccountSession(account, req);

    res.status(201).json({
      token,
      account: toPublicAccountContext(account),
      ...recovery,
    });
  }));

  app.post('/api/auth/login', authLimiter, asyncRoute(async (req, res) => {
    const account = await loginSaasAccount(saasStore, req.body);
    const token = await issueAccountSession(account, req);

    res.json({
      token,
      account: toPublicAccountContext(account),
    });
  }));

  app.post('/api/auth/password-reset', authLimiter, asyncRoute(async (req, res) => {
    const result = await resetSaasPassword(saasStore, req.body);
    const token = await issueAccountSession(result.account, req);

    res.json({
      token,
      account: toPublicAccountContext(result.account),
      recoveryCode: result.recoveryCode,
      recoveryCodeExpiresAt: result.recoveryCodeExpiresAt,
    });
  }));

  app.get('/api/auth/session', asyncRoute(async (req, res) => {
    try {
      const { account } = await resolveSaasAuth(req);
      res.json({
        authenticated: true,
        account: toPublicAccountContext(account),
      });
    } catch {
      res.json({
        authenticated: false,
        account: null,
      });
    }
  }));

  app.get('/api/auth/me', requireSaasAuth, asyncRoute(async (_req, res) => {
    const { account } = getSaasContext(res);
    res.json({ account: toPublicAccountContext(account) });
  }));

  app.post('/api/auth/refresh', requireSaasAuth, authLimiter, asyncRoute(async (req, res) => {
    const { session, account } = getSaasContext(res);
    await saasStore.revokeSession(session.jti, account.user.id, new Date().toISOString());
    const token = await issueAccountSession(account, req);
    res.json({
      token,
      account: toPublicAccountContext(account),
    });
  }));

  app.post('/api/auth/password', requireSaasAuth, authLimiter, asyncRoute(async (req, res) => {
    const { account } = getSaasContext(res);
    const result = await changeSaasPassword(saasStore, account, req.body);
    const token = await issueAccountSession(result.account, req);
    res.json({
      token,
      account: toPublicAccountContext(result.account),
      recoveryCode: result.recoveryCode,
      recoveryCodeExpiresAt: result.recoveryCodeExpiresAt,
    });
  }));

  app.post('/api/auth/recovery-code', requireSaasAuth, authLimiter, asyncRoute(async (_req, res) => {
    const { account } = getSaasContext(res);
    const recovery = await issuePasswordRecoveryCode(saasStore, account.user.id);
    res.json(recovery);
  }));

  app.post('/api/auth/logout', requireSaasAuth, asyncRoute(async (_req, res) => {
    const { session, account } = getSaasContext(res);
    await saasStore.revokeSession(session.jti, account.user.id, new Date().toISOString());
    res.status(204).end();
  }));

  app.get('/api/auth/sessions', requireSaasAuth, asyncRoute(async (_req, res) => {
    const { session, account } = getSaasContext(res);
    const sessions = await saasStore.listUserSessions(account.user.id);
    res.json({
      sessions: toPublicSessions(sessions, session.jti),
    });
  }));

  app.delete('/api/auth/sessions/:sessionId', requireSaasAuth, asyncRoute(async (req, res) => {
    const { session, account } = getSaasContext(res);
    if (req.params.sessionId === session.jti) {
      throw new SaasApiError(400, 'cannot_revoke_current_session', '不能在设备列表中撤销当前会话，请使用退出登录。');
    }
    const revoked = await saasStore.revokeSession(req.params.sessionId, account.user.id, new Date().toISOString());
    if (!revoked) {
      throw new SaasApiError(404, 'session_not_found', '会话不存在或已撤销。');
    }
    res.status(204).end();
  }));

  app.get('/api/workspace/members', requireSaasAuth, asyncRoute(async (_req, res) => {
    const { account } = getSaasContext(res);
    const [members, invitations] = await Promise.all([
      saasStore.listOrganizationMembers(account.organization.id),
      saasStore.listOrganizationInvitations(account.organization.id),
    ]);

    res.json({
      members: toPublicMembers(members),
      invitations: toPublicInvitations(invitations),
    });
  }));

  app.post('/api/workspace/invitations', requireSaasAuth, authLimiter, asyncRoute(async (req, res) => {
    const { account } = getSaasContext(res);
    const result = await createWorkspaceInvitation(saasStore, account, req.body);

    res.status(201).json({
      invitation: toPublicInvitations([result.invitation])[0],
      delivery: 'manual-link',
      invitationUrl: buildActionUrl('/workspace/accept-invitation', result.token),
    });
  }));

  app.post('/api/workspace/invitations/accept', authLimiter, asyncRoute(async (req, res) => {
    const account = await acceptWorkspaceInvitation(saasStore, req.body);
    const recovery = await issuePasswordRecoveryCode(saasStore, account.user.id);
    const token = await issueAccountSession(account, req);
    res.status(201).json({
      token,
      account: toPublicAccountContext(account),
      ...recovery,
    });
  }));

  app.get('/api/admin/overview', requireSaasAuth, asyncRoute(async (_req, res) => {
    const { account } = getSaasContext(res);
    if (account.user.role !== 'owner') {
      throw new SaasApiError(403, 'forbidden', '只有团队所有者可以查看管理概览。');
    }
    const overview = await saasStore.getOrganizationAdminOverview(account.organization.id);
    res.json({
      organization: {
        id: account.organization.id,
        name: account.organization.name,
      },
      overview,
    });
  }));

  app.get('/api/admin/operational-summary', requireSaasAuth, asyncRoute(async (_req, res) => {
    const { account } = getSaasContext(res);
    if (account.user.role !== 'owner') {
      throw new SaasApiError(403, 'forbidden', '只有团队所有者可以查看运营概览。');
    }
    const overview = await saasStore.getOrganizationAdminOverview(account.organization.id);
    res.json({
      organization: {
        id: account.organization.id,
        name: account.organization.name,
      },
      overview,
      observability: getObservabilitySummary(),
      store: saasStore.kind,
    });
  }));

  app.get('/api/admin/content-assets', requireSaasAuth, asyncRoute(async (_req, res) => {
    const { account } = getSaasContext(res);
    if (account.user.role !== 'owner') {
      throw new SaasApiError(403, 'forbidden', '只有团队所有者可以查看内容治理。');
    }
    const assets = await saasStore.listContentAssets(account.organization.id);
    res.json({ assets: toPublicContentAssets(assets) });
  }));

  app.post('/api/admin/content-assets', requireSaasAuth, asyncRoute(async (req, res) => {
    const { account } = getSaasContext(res);
    if (account.user.role !== 'owner') {
      throw new SaasApiError(403, 'forbidden', '只有团队所有者可以登记内容资产。');
    }
    const asset = await saasStore.createContentAsset({
      organizationId: account.organization.id,
      ownerUserId: account.user.id,
      title: req.body?.title,
      assetType: req.body?.assetType,
      sourceType: req.body?.sourceType,
      licenseStatus: req.body?.licenseStatus ?? 'needs_review',
      notes: req.body?.notes,
    });
    res.status(201).json({ asset: toPublicContentAssets([asset])[0] });
  }));

  app.patch('/api/admin/content-assets/:assetId', requireSaasAuth, asyncRoute(async (req, res) => {
    const { account } = getSaasContext(res);
    if (account.user.role !== 'owner') {
      throw new SaasApiError(403, 'forbidden', '只有团队所有者可以更新内容授权状态。');
    }
    const asset = await saasStore.updateContentAsset({
      organizationId: account.organization.id,
      assetId: req.params.assetId,
      licenseStatus: req.body?.licenseStatus,
      notes: req.body?.notes,
    });
    res.json({ asset: toPublicContentAssets([asset])[0] });
  }));

  app.get('/api/compliance/export', requireSaasAuth, asyncRoute(async (_req, res) => {
    const { account } = getSaasContext(res);
    const [snapshot, entities] = await Promise.all([
      saasStore.getLearningSnapshot(account.organization.id, account.user.id),
      saasStore.listLearningEntities({
        organizationId: account.organization.id,
        userId: account.user.id,
      }),
    ]);
    res.json({
      exportedAt: new Date().toISOString(),
      account: toPublicAccountContext(account),
      learningSnapshot: snapshot?.backup ?? null,
      learningEntities: entities,
    });
  }));

  app.get('/api/compliance/data-requests', requireSaasAuth, asyncRoute(async (_req, res) => {
    const { account } = getSaasContext(res);
    const requests = await saasStore.listDataRequests({
      organizationId: account.organization.id,
      userId: account.user.role === 'owner' ? undefined : account.user.id,
    });
    const members = account.user.role === 'owner'
      ? await saasStore.listOrganizationMembers(account.organization.id)
      : [account.user];
    const membersById = new Map(members.map((member) => [member.id, member]));
    res.json({
      requests: toPublicDataRequests(requests).map((dataRequest) => ({
        ...dataRequest,
        requester: membersById.has(dataRequest.userId) ? {
          name: membersById.get(dataRequest.userId)!.name,
          email: membersById.get(dataRequest.userId)!.email,
        } : undefined,
      })),
    });
  }));

  app.post('/api/compliance/data-requests', requireSaasAuth, asyncRoute(async (req, res) => {
    const { account } = getSaasContext(res);
    const dataRequest = await saasStore.createDataRequest({
      organizationId: account.organization.id,
      userId: account.user.id,
      requestType: req.body?.requestType,
      note: req.body?.note,
    });
    res.status(201).json({ request: toPublicDataRequests([dataRequest])[0] });
  }));

  app.post('/api/compliance/data-requests/:requestId/resolve', requireSaasAuth, asyncRoute(async (req, res) => {
    const { account } = getSaasContext(res);
    if (account.user.role !== 'owner') {
      throw new SaasApiError(403, 'forbidden', '只有团队所有者可以处理数据请求。');
    }
    const dataRequest = await saasStore.resolveDataRequest({
      organizationId: account.organization.id,
      requestId: req.params.requestId,
      status: req.body?.status,
      note: req.body?.note,
    });
    const deletion = dataRequest.status === 'completed' && dataRequest.requestType === 'delete'
      ? await saasStore.deleteLearningData(account.organization.id, dataRequest.userId)
      : undefined;
    res.json({ request: toPublicDataRequests([dataRequest])[0], deletion });
  }));

  app.get('/api/billing/entitlements', requireSaasAuth, asyncRoute(async (_req, res) => {
    const { account } = getSaasContext(res);
    res.json({
      account: toPublicAccountContext(account),
    });
  }));

  app.post('/api/billing/webhook', asyncRoute(async (req, res) => {
    const rawPayload = JSON.stringify(req.body ?? {});
    verifyBillingWebhookSignature(rawPayload, req.get('x-english-billing-signature'), billingWebhookSecret);
    const event = validateBillingEvent(req.body);
    const duplicate = await saasStore.hasBillingEvent(event.provider, event.eventId);
    const subscription = await saasStore.applyBillingEvent(event);
    res.json({
      received: true,
      duplicate,
      subscription,
    });
  }));

  app.get('/api/cloud/learning-data', requireSaasAuth, asyncRoute(async (_req, res) => {
    const { account } = getSaasContext(res);
    const snapshot = await saasStore.getLearningSnapshot(account.organization.id, account.user.id);

    res.json({
      snapshot: snapshot ? {
        ...summarizeLearningSnapshot(snapshot),
        backup: snapshot.backup,
      } : null,
    });
  }));

  app.get('/api/cloud/learning-data/versions', requireSaasAuth, asyncRoute(async (_req, res) => {
    const { account } = getSaasContext(res);
    const [snapshot, versions] = await Promise.all([
      saasStore.getLearningSnapshot(account.organization.id, account.user.id),
      saasStore.listLearningSnapshotVersions(account.organization.id, account.user.id),
    ]);
    res.json({
      current: snapshot ? summarizeLearningSnapshot(snapshot) : null,
      versions: versions.map((version) => ({
        id: version.id,
        createdAt: version.createdAt,
        ...summarizeLearningSnapshot(version),
      })),
    });
  }));

  app.get('/api/cloud/learning-data/versions/:versionId', requireSaasAuth, asyncRoute(async (req, res) => {
    const { account } = getSaasContext(res);
    const versions = await saasStore.listLearningSnapshotVersions(account.organization.id, account.user.id);
    const version = versions.find((item) => item.id === req.params.versionId);
    if (!version) {
      throw new SaasApiError(404, 'learning_snapshot_version_not_found', '未找到这个学习数据恢复点。');
    }
    res.json({
      version: {
        id: version.id,
        createdAt: version.createdAt,
        updatedAt: version.updatedAt,
        backup: version.backup,
      },
    });
  }));

  app.put('/api/cloud/learning-data', requireSaasAuth, asyncRoute(async (req, res) => {
    const { account } = getSaasContext(res);
    const context = toPublicAccountContext(account);
    if (!context.entitlements.cloudSync) {
      throw new SaasApiError(403, 'cloud_sync_disabled', '当前订阅暂未开通云同步。');
    }

    const backup = validateLearningBackup(req.body?.backup ?? req.body);
    const existingSnapshot = await saasStore.getLearningSnapshot(account.organization.id, account.user.id);
    if (shouldBlockEmptyLearningSnapshotOverwrite(existingSnapshot, backup)) {
      throw new SaasApiError(
        409,
        'empty_learning_snapshot_overwrite_blocked',
        '当前浏览器没有练习、答题或复习记录，已停止覆盖云端已有学习数据。请先从云端恢复，再继续同步。',
      );
    }
    if (shouldBlockLearningSnapshotRegression(existingSnapshot, backup)) {
      throw new SaasApiError(
        409,
        'learning_snapshot_regression_blocked',
        '本次同步会减少服务器已有学习记录，已停止覆盖。请先从服务器重建，再合并本地备份。',
      );
    }

    const snapshot = await saasStore.saveLearningSnapshot({
      organizationId: account.organization.id,
      userId: account.user.id,
      backup,
    });

    res.json({
      snapshot: summarizeLearningSnapshot(snapshot),
    });
  }));

  app.get('/api/cloud/learning-entities', requireSaasAuth, asyncRoute(async (req, res) => {
    const { account } = getSaasContext(res);
    const entities = await saasStore.listLearningEntities({
      organizationId: account.organization.id,
      userId: account.user.id,
      since: typeof req.query.since === 'string' ? req.query.since : undefined,
    });
    res.json({ entities });
  }));

  app.put('/api/cloud/learning-entities', requireSaasAuth, asyncRoute(async (req, res) => {
    const { account } = getSaasContext(res);
    const entities = validateLearningEntities(req.body, account.organization.id, account.user.id);
    const saved = await saasStore.upsertLearningEntities({
      organizationId: account.organization.id,
      userId: account.user.id,
      entities,
    });
    res.json({ entities: saved });
  }));

  app.post('/api/study/daily-plan', requireSaasAuth, (req, res) => {
    const goal = validateGoal(req.body?.goal);
    const reviewItems = Array.isArray(req.body?.reviewItems) ? req.body.reviewItems as ReviewItem[] : [];
    const skillProfiles = Array.isArray(req.body?.skillProfiles) ? req.body.skillProfiles as SkillProfile[] : [];
    const energyMode = ['low', 'standard', 'sprint'].includes(req.body?.energyMode) ? req.body.energyMode : 'standard';

    res.json({
      plan: buildDailyPlan({
        goal,
        reviewItems,
        skillProfiles,
        energyMode,
      }),
    });
  });

  app.post('/api/materials/validate-passage', requireSaasAuth, (req, res) => {
    const aiStartedAt = Date.now();
    try {
      const passage = normalizePassage(req.body?.passage ?? req.body, {
        defaultSourceType: req.body?.sourceType === 'ai-generated' ? 'ai-generated' : 'user-imported',
      });
      res.json({ passage });
    } catch (error) {
      res.status(400).json({ error: 'invalid_passage', message: (error as Error).message });
    }
  });

  app.post('/api/practice/choice-report', requireSaasAuth, (req, res) => {
    try {
      const payload = validateChoicePracticePayload(req.body);
      res.json({ report: buildChoicePracticeReport(payload) });
    } catch (error) {
      res.status(400).json({ error: 'invalid_practice_report', message: (error as Error).message });
    }
  });

  app.post('/api/practice/speaking-report', requireSaasAuth, (req, res) => {
    try {
      const payload = validateSpeakingPracticePayload(req.body);
      res.json({ report: buildSpeakingPracticeReport(payload) });
    } catch (error) {
      res.status(400).json({ error: 'invalid_speaking_report', message: (error as Error).message });
    }
  });

  app.post('/api/practice/subjective-report', requireSaasAuth, (req, res) => {
    try {
      const payload = validateSubjectivePracticePayload(req.body);
      res.json({ report: buildSubjectivePracticeReport(payload) });
    } catch (error) {
      res.status(400).json({ error: 'invalid_subjective_report', message: (error as Error).message });
    }
  });

  app.post('/api/practice/mock-exam-report', requireSaasAuth, (req, res) => {
    try {
      const payload = validateMockExamPayload(req.body);
      res.json(buildMockExamReport(payload));
    } catch (error) {
      res.status(400).json({ error: 'invalid_mock_exam_report', message: (error as Error).message });
    }
  });

  const handleGeneratePassage = async (req: Request, res: Response) => {
    let targetTopic: string;
    try {
      targetTopic = sanitizeText(req.body?.topic ?? 'Green Technology and Study Habits', 'topic', 120);
    } catch (error) {
      res.status(400).json({ error: 'invalid_request', message: (error as Error).message });
      return;
    }

    const aiStartedAt = Date.now();
    try {
      const prompt = `Create a CET-4 level English Reading Comprehension simulated passage on the topic of "${targetTopic}".
The passage must be between 250 and 350 words, clean, and professional.
Generate exactly 5 multiple choice questions.
For each question, offer 4 options (A, B, C, D), specify the correct answer, a detailed Chinese explanation, the type of question, and exact correct/distractor sentences.
Return JSON only with this shape: {"title":"...","content":"...","questions":[{"id":1,"question":"...","options":{"A":"...","B":"...","C":"...","D":"..."},"correctAnswer":"A","explanation":"...","type":"...","correctSentence":"...","distractorSentence":"..."}]}`;

      const data = await generateStructuredJson({
        prompt,
        systemInstruction: 'You write original CET-4 style simulated practice material. Never claim the content is from a real exam. Output valid JSON only.',
        geminiSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            content: { type: Type.STRING },
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.INTEGER },
                  question: { type: Type.STRING },
                  options: {
                    type: Type.OBJECT,
                    properties: {
                      A: { type: Type.STRING },
                      B: { type: Type.STRING },
                      C: { type: Type.STRING },
                      D: { type: Type.STRING },
                    },
                    required: ['A', 'B', 'C', 'D'],
                  },
                  correctAnswer: { type: Type.STRING },
                  explanation: { type: Type.STRING },
                  type: { type: Type.STRING },
                  correctSentence: { type: Type.STRING },
                  distractorSentence: { type: Type.STRING },
                },
                required: ['id', 'question', 'options', 'correctAnswer', 'explanation', 'type', 'correctSentence', 'distractorSentence'],
              },
            },
          },
          required: ['title', 'content', 'questions'],
        },
      });

      observeAiResult(aiStartedAt, false);
      res.json(normalizePassage(data, { defaultSourceType: 'ai-generated' }));
    } catch (error) {
      console.error('Passage generation failed, using mock fallback:', error);
      observeAiResult(aiStartedAt, true, classifyAiFallbackReason(error));
      res.status(200).json(normalizePassage(buildMockPassage(targetTopic), { defaultSourceType: 'ai-generated' }));
    }
  };

  const handleAnalyzeSpeech = async (req: Request, res: Response) => {
    let originalSpeech: string;
    try {
      originalSpeech = sanitizeText(req.body?.originalSpeech, 'originalSpeech', 3000);
    } catch (error) {
      res.status(400).json({ error: 'invalid_request', message: (error as Error).message });
      return;
    }

    const aiStartedAt = Date.now();
    try {
      const prompt = `Analyze this spoken paragraph draft for CET-4 Speaking Section:
"${originalSpeech}"

Detect hesitation words and filler text. Rephrase the speech to sound natural and structured with logical connectors. Produce Chinese feedback on Fluency, Logic, and Vocabulary.
Return JSON only with this shape: {"originalTextWithMarkings":"...","improvedTextWithConnectors":"...","fillerCount":0,"fluencyAnalysis":"...","logicAnalysis":"...","vocabularyAnalysis":"...","scoreImprovementFrom":58,"scoreImprovementTo":66}`;

      const data = await generateStructuredJson({
        prompt,
        systemInstruction: 'You are a CET-4 English speaking coach. Provide structured diagnostic evaluation and polished alternatives.',
        geminiSchema: {
          type: Type.OBJECT,
          properties: {
            originalTextWithMarkings: { type: Type.STRING },
            improvedTextWithConnectors: { type: Type.STRING },
            fillerCount: { type: Type.INTEGER },
            fluencyAnalysis: { type: Type.STRING },
            logicAnalysis: { type: Type.STRING },
            vocabularyAnalysis: { type: Type.STRING },
            scoreImprovementFrom: { type: Type.INTEGER },
            scoreImprovementTo: { type: Type.INTEGER },
          },
          required: ['originalTextWithMarkings', 'improvedTextWithConnectors', 'fillerCount', 'fluencyAnalysis', 'logicAnalysis', 'vocabularyAnalysis', 'scoreImprovementFrom', 'scoreImprovementTo'],
        },
      });

      observeAiResult(aiStartedAt, false);
      res.json(data);
    } catch (error) {
      console.error('Speech analysis failed, using mock fallback:', error);
      observeAiResult(aiStartedAt, true, classifyAiFallbackReason(error));
      res.status(200).json(buildMockSpeechAnalysis(originalSpeech));
    }
  };

  const handleEvaluateSubjective = async (req: Request, res: Response) => {
    const moduleId = req.body?.moduleId === 'translation' ? 'translation' : 'writing';
    let promptText: string;
    let answerText: string;
    try {
      promptText = sanitizeText(req.body?.prompt, 'prompt', 2000);
      answerText = sanitizeText(req.body?.answer, 'answer', 5000);
    } catch (error) {
      res.status(400).json({ error: 'invalid_request', message: (error as Error).message });
      return;
    }

    const aiStartedAt = Date.now();
    try {
      const taskName = moduleId === 'translation' ? 'CET-4 Chinese-to-English translation' : 'CET-4 short essay writing';
      const prompt = `Evaluate this ${taskName} answer.
Task prompt:
${promptText}

Student answer:
${answerText}

Return JSON only with this shape: {"score":70,"mistakeReasons":["语法错误"],"comments":["..."],"nextActions":["..."],"sampleAnswer":"...","confidence":"medium"}.
Allowed mistakeReasons: ${VALID_MISTAKE_REASONS.join(', ')}.
Use Chinese for comments and nextActions.`;

      const data = await generateStructuredJson({
        prompt,
        systemInstruction: 'You are a CET-4 writing and translation coach. Return structured, concrete, task-level feedback only.',
        geminiSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.INTEGER },
            mistakeReasons: { type: Type.ARRAY, items: { type: Type.STRING } },
            comments: { type: Type.ARRAY, items: { type: Type.STRING } },
            nextActions: { type: Type.ARRAY, items: { type: Type.STRING } },
            sampleAnswer: { type: Type.STRING },
            confidence: { type: Type.STRING },
          },
          required: ['score', 'mistakeReasons', 'comments', 'nextActions', 'sampleAnswer', 'confidence'],
        },
      });

      observeAiResult(aiStartedAt, false);
      res.json(normalizeSubjectiveAnalysis(data, moduleId));
    } catch (error) {
      console.error('Subjective evaluation failed, using mock fallback:', error);
      observeAiResult(aiStartedAt, true, classifyAiFallbackReason(error));
      res.status(200).json(buildMockSubjectiveAnalysis(moduleId, answerText));
    }
  };

  const handleEvaluateDiagnostic = async (req: Request, res: Response) => {
    let payload: ReturnType<typeof validateDiagnosticAiPayload>;
    try {
      payload = validateDiagnosticAiPayload(req.body);
    } catch (error) {
      res.status(400).json({ error: 'invalid_diagnostic_ai_request', message: (error as Error).message });
      return;
    }

    const aiStartedAt = Date.now();
    try {
      const prompt = `Evaluate these CET-4 onboarding diagnostic subjective answers.
Use the CET-4 rubric, but do not claim the result is an official score.
Return JSON only with this shape:
{"evaluations":[{"itemId":"...","score":70,"mistakeReasons":["语法错误"],"comments":["..."],"nextActions":["..."],"evidence":["quote or concrete observation"],"confidence":"medium"}]}

Allowed mistakeReasons: ${VALID_MISTAKE_REASONS.join(', ')}.
Score range: 0-100. Use Chinese for comments, nextActions, and evidence.
Keep each comment/action concise and evidence-based. If evidence is weak, set confidence to low.

Items:
${JSON.stringify(payload.items.map((item) => ({
  itemId: item.id,
  skillArea: item.skillArea,
  title: item.title,
  context: item.context,
  prompt: item.prompt,
  minWords: item.minWords,
  studentAnswer: item.answer,
})), null, 2)}`;

      const data = await generateStructuredJson({
        prompt,
        systemInstruction:
          'You are a cautious CET-4 diagnostic evaluator. Return structured JSON only. Score subjective answers against the given task, cite concrete evidence, and mark uncertainty honestly.',
        geminiSchema: {
          type: Type.OBJECT,
          properties: {
            evaluations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  itemId: { type: Type.STRING },
                  score: { type: Type.INTEGER },
                  mistakeReasons: { type: Type.ARRAY, items: { type: Type.STRING } },
                  comments: { type: Type.ARRAY, items: { type: Type.STRING } },
                  nextActions: { type: Type.ARRAY, items: { type: Type.STRING } },
                  evidence: { type: Type.ARRAY, items: { type: Type.STRING } },
                  confidence: { type: Type.STRING },
                },
                required: ['itemId', 'score', 'mistakeReasons', 'comments', 'nextActions', 'evidence', 'confidence'],
              },
            },
          },
          required: ['evaluations'],
        },
      });

      observeAiResult(aiStartedAt, false);
      res.json({
        usedFallback: false,
        evaluations: normalizeDiagnosticAiEvaluations(data, payload.items, 'ai'),
      });
    } catch (error) {
      console.error('Diagnostic AI evaluation failed, using rule fallback:', error);
      observeAiResult(aiStartedAt, true, classifyAiFallbackReason(error));
      res.status(200).json({
        usedFallback: true,
        evaluations: Object.fromEntries(payload.items.map((item) => [item.id, buildFallbackDiagnosticAiEvaluation(item)])),
      });
    }
  };

  app.post('/api/ai/generate-passage', aiLimiter, requireSaasAuth, handleGeneratePassage);
  app.post('/api/ai/analyze-speech', aiLimiter, requireSaasAuth, handleAnalyzeSpeech);
  app.post('/api/ai/evaluate-subjective', aiLimiter, requireSaasAuth, handleEvaluateSubjective);
  app.post('/api/ai/evaluate-diagnostic', aiLimiter, requireSaasAuth, handleEvaluateDiagnostic);
  // Backward-compatible aliases for older builds and saved clients.
  app.post('/api/gemini/generate-passage', aiLimiter, requireSaasAuth, handleGeneratePassage);
  app.post('/api/gemini/analyze-speech', aiLimiter, requireSaasAuth, handleAnalyzeSpeech);

  app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
    if ('type' in error && error.type === 'entity.parse.failed') {
      res.status(400).json({ error: 'invalid_json', message: 'Request body must be valid JSON.' });
      return;
    }

    if (error instanceof SaasApiError) {
      res.status(error.statusCode).json({ error: error.code, message: error.message });
      return;
    }

    console.error('Unhandled API error:', error);
    res.status(500).json({ error: 'internal_error', message: 'Unexpected server error.' });
  });

  return app;
}

export async function startServer() {
  const app = createApp();
  const isProductionRuntime = isProductionServerRuntime();

  if (!isProductionRuntime) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

if (process.env.NODE_ENV !== 'test') {
  startServer();
}
