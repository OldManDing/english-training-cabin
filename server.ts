import express, { NextFunction, Request, Response } from 'express';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import { CET4_EXAM_PROFILE } from './src/exams/cet4';
import { buildDailyPlan } from './src/domain/planner/dailyPlan';
import { normalizePassage } from './src/domain/materials/passage';
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
  confirmEmailVerification,
  confirmPasswordReset,
  createFileSaasStore,
  createInMemorySaasStore,
  createWorkspaceInvitation,
  getDefaultSaasDataFile,
  getSaasSessionSecret,
  getSessionExpiresAt,
  issueSessionToken,
  loginSaasAccount,
  registerSaasAccount,
  requestEmailVerification,
  requestPasswordReset,
  SaasAccountRecord,
  SaasApiError,
  SaasSessionPayload,
  SaasStore,
  summarizeLearningSnapshot,
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

function isProductionServerRuntime() {
  return process.env.NODE_ENV === 'production' || path.basename(process.argv[1] ?? '') === 'server.cjs';
}

type TransactionalEmailPayload = {
  to: string;
  subject: string;
  text: string;
  actionUrl: string;
  template: 'email_verification' | 'password_reset' | 'workspace_invitation';
};

function getPublicAppUrl() {
  return readEnvironmentValue('APP_URL') ?? `http://localhost:${PORT}`;
}

function buildActionUrl(pathname: string, token: string) {
  const url = new URL(pathname, getPublicAppUrl());
  url.searchParams.set('token', token);
  return url.toString();
}

function usesDevelopmentEmailTokens() {
  return !isProductionServerRuntime() || readEnvironmentValue('ALLOW_DEVELOPMENT_EMAIL_TOKENS') === 'true';
}

async function deliverTransactionalEmail(payload: TransactionalEmailPayload) {
  if (usesDevelopmentEmailTokens()) {
    return { delivery: 'development-token' as const };
  }

  const webhookUrl = readEnvironmentValue('EMAIL_DELIVERY_WEBHOOK_URL');
  if (!webhookUrl) {
    throw new SaasApiError(503, 'email_delivery_not_configured', '生产环境尚未配置邮件交付服务。');
  }

  const body = JSON.stringify(payload);
  const secret = readEnvironmentValue('EMAIL_DELIVERY_WEBHOOK_SECRET');
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(secret ? {
        'x-english-email-signature': crypto.createHmac('sha256', secret).update(body).digest('hex'),
      } : {}),
    },
    body,
  });

  if (!response.ok) {
    throw new SaasApiError(502, 'email_delivery_failed', '邮件服务暂时不可用，请稍后重试。');
  }

  return { delivery: 'email' as const };
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
  'client_error',
]);

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

function incrementCounter(counter: Map<string, number>, key: string) {
  counter.set(key, (counter.get(key) ?? 0) + 1);
}

function toPlainCounter(counter: Map<string, number>) {
  return Object.fromEntries([...counter.entries()].sort(([left], [right]) => left.localeCompare(right)));
}

function observeAiResult(startedAt: number, usedFallback: boolean) {
  observability.aiRequestsTotal += 1;
  observability.aiLatencySamples += 1;
  observability.aiLatencyMsTotal += Date.now() - startedAt;
  if (usedFallback) observability.aiFallbacksTotal += 1;
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

function validateGoal(value: unknown): Pick<StudyGoal, 'id' | 'examId' | 'examDate' | 'dailyMinutes' | 'prioritySkills'> {
  const input = typeof value === 'object' && value ? value as Partial<StudyGoal> : {};
  const dailyMinutes = Number(input.dailyMinutes ?? 60);
  const validSkills: SkillArea[] = ['reading', 'listening', 'writing', 'translation', 'speaking', 'vocabulary', 'grammar'];
  const prioritySkills = Array.isArray(input.prioritySkills)
    ? input.prioritySkills.filter((skill): skill is SkillArea => typeof skill === 'string' && validSkills.includes(skill as SkillArea))
    : [];

  return {
    id: typeof input.id === 'string' ? input.id : 'goal-cet4-primary',
    examId: typeof input.examId === 'string' ? input.examId : 'cet4',
    examDate: typeof input.examDate === 'string' ? input.examDate : '2026-06-15',
    dailyMinutes: Number.isFinite(dailyMinutes) ? Math.min(180, Math.max(20, dailyMinutes)) : 60,
    prioritySkills: prioritySkills.length > 0 ? prioritySkills : ['reading', 'listening', 'speaking'],
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

export interface CreateAppOptions {
  saasStore?: SaasStore;
  saasSessionSecret?: string | null;
  billingWebhookSecret?: string;
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
  const aiLimiter = createRateLimiter(20, 60_000);
  const authLimiter = createRateLimiter(15, 60_000);
  const saasStore = options.saasStore ?? createDefaultSaasStore();
  const saasSessionSecret = options.saasSessionSecret ?? getSaasSessionSecret();
  const billingWebhookSecret = options.billingWebhookSecret ?? readEnvironmentValue('BILLING_WEBHOOK_SECRET');

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

  const requireVerifiedEmail = asyncRoute(async (_req, res, next) => {
    const { account } = getSaasContext(res);
    if (!account.user.emailVerifiedAt) {
      throw new SaasApiError(403, 'email_verification_required', '请先完成邮箱验证后再执行此操作。');
    }
    next();
  });

  app.get('/api/health', (_req, res) => {
    const ai = getAiProviderStatus();
    res.json({
      status: 'ok',
      app: 'english-training-cabin',
      aiConfigured: ai.configured,
      aiProvider: ai.provider,
      aiModel: ai.model,
      saas: {
        enabled: true,
        authConfigured: Boolean(saasSessionSecret),
        store: saasStore.kind,
      },
      emailDelivery: {
        configured: usesDevelopmentEmailTokens() || Boolean(readEnvironmentValue('EMAIL_DELIVERY_WEBHOOK_URL')),
        mode: usesDevelopmentEmailTokens() ? 'development-token' : 'webhook',
      },
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/api/exams', (_req, res) => {
    res.json({ exams: [CET4_EXAM_PROFILE] });
  });

  app.get('/api/observability/summary', (_req, res) => {
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

  app.post('/api/auth/register', authLimiter, asyncRoute(async (req, res) => {
    const account = await registerSaasAccount(saasStore, req.body);
    const token = await issueAccountSession(account, req);

    res.status(201).json({
      token,
      account: toPublicAccountContext(account),
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

  app.post('/api/auth/email-verification/request', requireSaasAuth, authLimiter, asyncRoute(async (_req, res) => {
    const { account } = getSaasContext(res);
    const result = await requestEmailVerification(saasStore, account.user.id);
    const actionUrl = buildActionUrl('/auth/verify-email', result.token);
    const delivery = await deliverTransactionalEmail({
      to: account.user.email,
      subject: '验证您的英语训练舱账号邮箱',
      text: `请打开以下链接完成邮箱验证：${actionUrl}`,
      actionUrl,
      template: 'email_verification',
    });
    res.json({
      delivery: delivery.delivery,
      expiresAt: result.expiresAt,
      token: delivery.delivery === 'development-token' ? result.token : undefined,
    });
  }));

  app.post('/api/auth/email-verification/confirm', authLimiter, asyncRoute(async (req, res) => {
    const account = await confirmEmailVerification(saasStore, req.body?.token);
    const token = await issueAccountSession(account, req);
    res.json({
      token,
      account: toPublicAccountContext(account),
    });
  }));

  app.post('/api/auth/password-reset/request', authLimiter, asyncRoute(async (req, res) => {
    const result = await requestPasswordReset(saasStore, req.body);
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    if (result.token) {
      const actionUrl = buildActionUrl('/auth/reset-password', result.token);
      await deliverTransactionalEmail({
        to: email,
        subject: '重置您的英语训练舱账号密码',
        text: `请打开以下链接重置密码：${actionUrl}`,
        actionUrl,
        template: 'password_reset',
      });
    }
    res.json({
      delivery: usesDevelopmentEmailTokens() ? 'development-token' : 'email',
      expiresAt: result.expiresAt,
      token: usesDevelopmentEmailTokens() ? result.token : undefined,
    });
  }));

  app.post('/api/auth/password-reset/confirm', authLimiter, asyncRoute(async (req, res) => {
    const account = await confirmPasswordReset(saasStore, req.body);
    const token = await issueAccountSession(account, req);
    res.json({
      token,
      account: toPublicAccountContext(account),
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

  app.post('/api/workspace/invitations', requireSaasAuth, requireVerifiedEmail, authLimiter, asyncRoute(async (req, res) => {
    const { account } = getSaasContext(res);
    const result = await createWorkspaceInvitation(saasStore, account, req.body);
    const invitationUrl = buildActionUrl('/workspace/accept-invitation', result.token);
    const delivery = await deliverTransactionalEmail({
      to: result.invitation.email,
      subject: `加入 ${account.organization.name} 的英语训练舱团队`,
      text: `请打开以下链接接受团队邀请：${invitationUrl}`,
      actionUrl: invitationUrl,
      template: 'workspace_invitation',
    });

    res.status(201).json({
      invitation: toPublicInvitations([result.invitation])[0],
      delivery: delivery.delivery,
      token: delivery.delivery === 'development-token' ? result.token : undefined,
    });
  }));

  app.post('/api/workspace/invitations/accept', authLimiter, asyncRoute(async (req, res) => {
    const account = await acceptWorkspaceInvitation(saasStore, req.body);
    const token = await issueAccountSession(account, req);
    res.status(201).json({
      token,
      account: toPublicAccountContext(account),
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

  app.put('/api/cloud/learning-data', requireSaasAuth, asyncRoute(async (req, res) => {
    const { account } = getSaasContext(res);
    const context = toPublicAccountContext(account);
    if (!context.entitlements.cloudSync) {
      throw new SaasApiError(403, 'cloud_sync_disabled', '当前订阅暂未开通云同步。');
    }

    const backup = validateLearningBackup(req.body?.backup ?? req.body);
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
    const context = toPublicAccountContext(account);
    if (!context.entitlements.cloudSync) {
      throw new SaasApiError(403, 'cloud_sync_disabled', '当前订阅暂未开通云同步。');
    }

    const entities = validateLearningEntities(req.body, account.organization.id, account.user.id);
    const saved = await saasStore.upsertLearningEntities({
      organizationId: account.organization.id,
      userId: account.user.id,
      entities,
    });
    res.json({ entities: saved });
  }));

  app.post('/api/study/daily-plan', (req, res) => {
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

  app.post('/api/materials/validate-passage', (req, res) => {
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

  app.post('/api/practice/choice-report', (req, res) => {
    try {
      const payload = validateChoicePracticePayload(req.body);
      res.json({ report: buildChoicePracticeReport(payload) });
    } catch (error) {
      res.status(400).json({ error: 'invalid_practice_report', message: (error as Error).message });
    }
  });

  app.post('/api/practice/speaking-report', (req, res) => {
    try {
      const payload = validateSpeakingPracticePayload(req.body);
      res.json({ report: buildSpeakingPracticeReport(payload) });
    } catch (error) {
      res.status(400).json({ error: 'invalid_speaking_report', message: (error as Error).message });
    }
  });

  app.post('/api/practice/subjective-report', (req, res) => {
    try {
      const payload = validateSubjectivePracticePayload(req.body);
      res.json({ report: buildSubjectivePracticeReport(payload) });
    } catch (error) {
      res.status(400).json({ error: 'invalid_subjective_report', message: (error as Error).message });
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
      observeAiResult(aiStartedAt, true);
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
      observeAiResult(aiStartedAt, true);
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
      observeAiResult(aiStartedAt, true);
      res.status(200).json(buildMockSubjectiveAnalysis(moduleId, answerText));
    }
  };

  app.post('/api/ai/generate-passage', aiLimiter, handleGeneratePassage);
  app.post('/api/ai/analyze-speech', aiLimiter, handleAnalyzeSpeech);
  app.post('/api/ai/evaluate-subjective', aiLimiter, handleEvaluateSubjective);
  // Backward-compatible aliases for older builds and saved clients.
  app.post('/api/gemini/generate-passage', aiLimiter, handleGeneratePassage);
  app.post('/api/gemini/analyze-speech', aiLimiter, handleAnalyzeSpeech);

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
