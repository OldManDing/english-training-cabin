import express, { NextFunction, Request, Response } from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import { CET4_EXAM_PROFILE } from './src/exams/cet4';
import { buildDailyPlan } from './src/domain/planner/dailyPlan';
import { normalizePassage } from './src/domain/materials/passage';
import { buildChoicePracticeReport, ChoicePracticeAnswer, ChoicePracticeQuestion } from './src/domain/practice/reports';
import { ReviewItem, SkillArea, SkillProfile, StudyGoal } from './src/types';

if (process.env.NODE_ENV !== 'test') {
  dotenv.config({ path: ['.env.local', '.env'] });
} else {
  dotenv.config({ path: '.env.test' });
}

const PORT = Number(process.env.PORT ?? 3000);
const JSON_LIMIT = '64kb';
const AI_TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS ?? 20_000);

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
  'material_generated',
  'material_generation_failed',
  'material_imported',
  'material_import_failed',
  'client_error',
]);

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
  const prioritySkills = Array.isArray(input.prioritySkills) && input.prioritySkills.length > 0
    ? input.prioritySkills
    : ['reading', 'listening', 'speaking'];

  return {
    id: typeof input.id === 'string' ? input.id : 'goal-cet4-primary',
    examId: typeof input.examId === 'string' ? input.examId : 'cet4',
    examDate: typeof input.examDate === 'string' ? input.examDate : '2026-06-15',
    dailyMinutes: Number.isFinite(dailyMinutes) ? Math.min(180, Math.max(20, dailyMinutes)) : 60,
    prioritySkills: prioritySkills as StudyGoal['prioritySkills'],
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

  const explicitProvider = process.env.AI_PROVIDER?.trim().toLowerCase();
  const openAiBaseUrl = process.env.AI_BASE_URL?.trim();
  const openAiApiKey = process.env.AI_API_KEY?.trim();

  if ((explicitProvider === 'openai-compatible' || explicitProvider === 'baseui' || !explicitProvider) && openAiBaseUrl && openAiApiKey) {
    return {
      type: 'openai-compatible',
      providerName: explicitProvider === 'baseui' ? 'baseui' : 'openai-compatible',
      baseUrl: openAiBaseUrl.replace(/\/+$/, ''),
      apiKey: openAiApiKey,
      model: process.env.AI_MODEL?.trim() || 'gpt-4o-mini',
    };
  }

  const geminiApiKey = process.env.GEMINI_API_KEY?.trim();
  if ((explicitProvider === 'gemini' || !explicitProvider) && geminiApiKey) {
    return {
      type: 'gemini',
      providerName: 'gemini',
      apiKey: geminiApiKey,
      model: process.env.GEMINI_MODEL?.trim() || 'gemini-3.5-flash',
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

export function createApp() {
  const app = express();
  const aiLimiter = createRateLimiter(20, 60_000);

  app.disable('x-powered-by');
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'same-origin');
    res.setHeader('Permissions-Policy', 'microphone=(self)');
    res.setHeader(
      'Content-Security-Policy',
      [
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data:",
        "font-src 'self' data:",
        "connect-src 'self'",
        "media-src 'self' blob:",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
      ].join('; '),
    );
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

  app.get('/api/health', (_req, res) => {
    const ai = getAiProviderStatus();
    res.json({
      status: 'ok',
      app: 'english-training-cabin',
      aiConfigured: ai.configured,
      aiProvider: ai.provider,
      aiModel: ai.model,
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

  app.post('/api/ai/generate-passage', aiLimiter, handleGeneratePassage);
  app.post('/api/ai/analyze-speech', aiLimiter, handleAnalyzeSpeech);
  // Backward-compatible aliases for older builds and saved clients.
  app.post('/api/gemini/generate-passage', aiLimiter, handleGeneratePassage);
  app.post('/api/gemini/analyze-speech', aiLimiter, handleAnalyzeSpeech);

  app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
    if ('type' in error && error.type === 'entity.parse.failed') {
      res.status(400).json({ error: 'invalid_json', message: 'Request body must be valid JSON.' });
      return;
    }

    console.error('Unhandled API error:', error);
    res.status(500).json({ error: 'internal_error', message: 'Unexpected server error.' });
  });

  return app;
}

export async function startServer() {
  const app = createApp();
  const isProductionRuntime =
    process.env.NODE_ENV === 'production' || path.basename(process.argv[1] ?? '') === 'server.cjs';

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
