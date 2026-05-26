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

type DiagnosticSkillArea = Extract<SkillArea, 'reading' | 'listening' | 'translation' | 'writing' | 'speaking'>;
type ChoiceAnswer = 'A' | 'B' | 'C' | 'D';

export type DiagnosticAnswerMap = Record<string, string>;

export interface DiagnosticChoiceItem {
  id: string;
  kind: 'single-choice';
  skillArea: DiagnosticSkillArea;
  subSkillId: string;
  title: string;
  contextLabel: string;
  context: string;
  prompt: string;
  options: { id: ChoiceAnswer; label: string }[];
  correctAnswer: ChoiceAnswer;
  mistakeReason: MistakeReason;
  explanation: string;
}

export interface DiagnosticTextItem {
  id: string;
  kind: 'text';
  skillArea: DiagnosticSkillArea;
  subSkillId: string;
  title: string;
  contextLabel: string;
  context: string;
  prompt: string;
  placeholder: string;
  minWords: number;
  keywordGroups: string[][];
  mistakeReason: MistakeReason;
  explanation: string;
}

export type DiagnosticItem = DiagnosticChoiceItem | DiagnosticTextItem;

export interface DiagnosticScoreDetail {
  itemId: string;
  skillArea: DiagnosticSkillArea;
  subSkillId: string;
  title: string;
  score: number;
  isCorrect?: boolean;
  mistakeReasons: MistakeReason[];
  feedback: string;
  nextAction: string;
}

export interface OnboardingDiagnosticReport extends PracticeCompletionReport {
  details: DiagnosticScoreDetail[];
  averageScore: number;
  weakestSkills: DiagnosticSkillArea[];
  strongestSkills: DiagnosticSkillArea[];
}

const lowConfidence = '低信心' as MistakeReason;

export const ONBOARDING_DIAGNOSTIC_ITEMS: DiagnosticItem[] = [
  {
    id: 'diag-reading-location',
    kind: 'single-choice',
    skillArea: 'reading',
    subSkillId: 'diagnostic-reading-location',
    title: '阅读定位与同义替换',
    contextLabel: '阅读短文',
    context:
      'Community libraries are no longer only quiet places for borrowing books. Many now provide digital courses, career workshops, and small meeting rooms, so residents can keep learning even when they cannot attend a formal school.',
    prompt: 'Which statement best describes the new role of community libraries?',
    options: [
      { id: 'A', label: 'They mainly protect old books for local residents.' },
      { id: 'B', label: 'They have become flexible learning hubs for the community.' },
      { id: 'C', label: 'They require every resident to attend formal courses.' },
      { id: 'D', label: 'They are replacing schools in most neighborhoods.' },
    ],
    correctAnswer: 'B',
    mistakeReason: '同义替换未识别' as MistakeReason,
    explanation: '"provide digital courses, career workshops" 对应 "learning hubs"，考查同义替换与主旨定位。',
  },
  {
    id: 'diag-listening-turning-point',
    kind: 'single-choice',
    skillArea: 'listening',
    subSkillId: 'diagnostic-listening-turning-point',
    title: '听力转折信息识别',
    contextLabel: '听力转写',
    context:
      'Man: I thought the writing workshop was canceled because the teacher is sick. Woman: It was almost canceled, but the department moved it online. We still need to submit our outlines before Friday.',
    prompt: 'What will the students probably do?',
    options: [
      { id: 'A', label: 'Wait until the teacher returns next month.' },
      { id: 'B', label: 'Cancel their outlines because the workshop stopped.' },
      { id: 'C', label: 'Join the online workshop and submit outlines before Friday.' },
      { id: 'D', label: 'Ask the department to change the topic.' },
    ],
    correctAnswer: 'C',
    mistakeReason: '转折信息漏听' as MistakeReason,
    explanation: '"but the department moved it online" 是转折后的真实安排，Friday 是提交时限。',
  },
  {
    id: 'diag-translation-structure',
    kind: 'text',
    skillArea: 'translation',
    subSkillId: 'diagnostic-translation-structure',
    title: '翻译句法转换',
    contextLabel: '汉译英',
    context: '随着在线学习的发展，越来越多的大学生能够更灵活地安排自己的学习时间。',
    prompt: '请把上面的句子翻译成自然的英文。',
    placeholder:
      '例如：With the development of online learning, more college students can arrange their study time more flexibly.',
    minWords: 12,
    keywordGroups: [
      ['with the development of', 'as online learning develops', 'with the growth of'],
      ['online learning', 'online education'],
      ['college students', 'university students'],
      ['arrange', 'manage', 'schedule'],
      ['flexibly', 'more flexible'],
    ],
    mistakeReason: '中文干扰' as MistakeReason,
    explanation: '重点看是否能把“随着……”转成英文状语，并保留“大学生、安排时间、灵活”三个核心语义。',
  },
  {
    id: 'diag-writing-argument',
    kind: 'text',
    skillArea: 'writing',
    subSkillId: 'diagnostic-writing-argument',
    title: '写作结构与论证',
    contextLabel: '短段写作',
    context: 'Topic: Should students use AI tools when learning English?',
    prompt: '请用 50-80 个英文词写一个观点段，必须包含观点、理由和一个具体例子。',
    placeholder: 'I think students can use AI tools wisely because ... For example, ...',
    minWords: 45,
    keywordGroups: [
      ['i think', 'in my opinion', 'from my perspective'],
      ['because', 'since'],
      ['for example', 'for instance'],
      ['however', 'but', 'wisely', 'responsibly'],
      ['english', 'learning', 'students'],
    ],
    mistakeReason: '论证结构松散' as MistakeReason,
    explanation: '观点段需要“立场 + 理由 + 例子”，只写口号或只列观点会降低诊断分。',
  },
  {
    id: 'diag-speaking-response',
    kind: 'text',
    skillArea: 'speaking',
    subSkillId: 'diagnostic-speaking-response',
    title: '口语连贯表达初筛',
    contextLabel: '口语任务',
    context: 'Question: Describe one habit that helps you learn English and explain why it works.',
    prompt: '请写下你会如何口头回答，尽量使用自然连接词。后续正式口语训练会使用录音与二次重说。',
    placeholder: 'One habit that helps me is ... It works because ... As a result, ...',
    minWords: 35,
    keywordGroups: [
      ['one habit', 'my habit', 'i usually'],
      ['because', 'the reason is'],
      ['for example', 'such as'],
      ['as a result', 'so', 'therefore'],
      ['english', 'learn', 'practice'],
    ],
    mistakeReason: '表达不自然' as MistakeReason,
    explanation: '入门口语先用文本化回答判断连贯性，正式口语模块再做录音、转写、纠错和重说闭环。',
  },
];

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function clampScore(value: number): number {
  return Math.max(30, Math.min(96, Math.round(value)));
}

function normalizeAnswer(value: string | undefined): string {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

function countEnglishWords(value: string): number {
  return normalizeAnswer(value).split(/[^\p{L}\p{N}'-]+/u).filter(Boolean).length;
}

function scoreTextItem(item: DiagnosticTextItem, answer: string): DiagnosticScoreDetail {
  const normalized = normalizeAnswer(answer).toLowerCase();
  const wordRatio = Math.min(1, countEnglishWords(normalized) / item.minWords);
  const keywordHits = item.keywordGroups.filter((group) => group.some((keyword) => normalized.includes(keyword))).length;
  const keywordRatio = keywordHits / Math.max(1, item.keywordGroups.length);
  const score = clampScore(32 + wordRatio * 24 + keywordRatio * 40);
  const passed = score >= 70;

  return {
    itemId: item.id,
    skillArea: item.skillArea,
    subSkillId: item.subSkillId,
    title: item.title,
    score,
    isCorrect: passed,
    mistakeReasons: passed ? [] : [item.mistakeReason, ...(wordRatio < 0.75 ? [lowConfidence] : [])],
    feedback: passed ? `表达命中 ${keywordHits}/${item.keywordGroups.length} 个关键点，结构可进入专项训练。` : item.explanation,
    nextAction: passed ? '进入限时训练保持输出稳定性。' : '先用“观点/理由/例子”或“主干/修饰/语义完整”模板做主动输出。',
  };
}

function scoreChoiceItem(item: DiagnosticChoiceItem, answer: string): DiagnosticScoreDetail {
  const selected = normalizeAnswer(answer).toUpperCase() as ChoiceAnswer;
  const isCorrect = selected === item.correctAnswer;

  return {
    itemId: item.id,
    skillArea: item.skillArea,
    subSkillId: item.subSkillId,
    title: item.title,
    score: isCorrect ? 92 : 42,
    isCorrect,
    mistakeReasons: isCorrect ? [] : [item.mistakeReason],
    feedback: isCorrect ? '答案正确，说明该能力点已有可用证据。' : item.explanation,
    nextAction: isCorrect ? '用限时题继续验证稳定性。' : '复习时先遮住答案，主动回忆定位线索和转折信号。',
  };
}

export function scoreDiagnosticAnswers(answers: DiagnosticAnswerMap): DiagnosticScoreDetail[] {
  return ONBOARDING_DIAGNOSTIC_ITEMS.map((item) => {
    const answer = answers[item.id] ?? '';
    return item.kind === 'single-choice' ? scoreChoiceItem(item, answer) : scoreTextItem(item, answer);
  });
}

function buildSkillProfiles(details: DiagnosticScoreDetail[], completedAt: string): SkillProfile[] {
  return details.map((detail) => ({
    id: `cet4-${detail.skillArea}-diagnostic`,
    skillArea: detail.skillArea,
    subSkillId: detail.subSkillId,
    score: detail.score,
    confidence: detail.score >= 85 ? 5 : detail.score >= 70 ? 4 : detail.score >= 55 ? 3 : 2,
    evidenceCount: 1,
    lastUpdatedAt: completedAt,
  }));
}

function buildAttempt(params: {
  sessionId: string;
  item: DiagnosticItem;
  detail: DiagnosticScoreDetail;
  answer: string;
  elapsedSeconds: number;
  createdAt: string;
}): Attempt {
  const aiFeedback: AiFeedbackSummary = {
    score: params.detail.score,
    mistakeReasons: params.detail.mistakeReasons,
    comments: [params.detail.feedback],
    nextActions: [params.detail.nextAction],
    confidence: params.detail.score >= 80 ? 'high' : params.detail.score >= 60 ? 'medium' : 'low',
  };

  return {
    id: makeId(`attempt-${params.item.skillArea}`),
    sessionId: params.sessionId,
    questionId: params.item.id,
    examId: 'cet4',
    moduleId: params.item.skillArea,
    questionTypeId: params.item.subSkillId,
    answer: params.answer,
    isCorrect: params.detail.isCorrect,
    elapsedSeconds: params.elapsedSeconds,
    confidence: params.detail.score >= 85 ? 5 : params.detail.score >= 70 ? 4 : params.detail.score >= 55 ? 3 : 2,
    mistakeReasons: params.detail.mistakeReasons,
    aiFeedback,
    createdAt: params.createdAt,
  };
}

function buildReviewItem(params: {
  item: DiagnosticItem;
  attempt: Attempt;
  detail: DiagnosticScoreDetail;
  createdAt: string;
}): ReviewItem | null {
  if (params.detail.score >= 70 && params.detail.mistakeReasons.length === 0) return null;

  const nextReviewAt = new Date(params.createdAt);
  nextReviewAt.setDate(nextReviewAt.getDate() + 1);

  return {
    id: makeId(`review-${params.item.skillArea}`),
    title: `入门诊断弱项：${params.item.title}`,
    category: '错题',
    detail: `${params.item.contextLabel}：${params.item.context}\n作答：${String(params.attempt.answer || '未作答')}\n反馈：${params.detail.feedback}`,
    daysAgo: 0,
    targetType: 'question',
    targetId: params.item.id,
    examId: 'cet4',
    moduleId: params.item.skillArea,
    skillArea: params.item.skillArea,
    masteryScore: Math.max(30, params.detail.score),
    priorityScore: params.detail.score < 55 ? 90 : 70,
    reviewIntervalDays: 1,
    nextReviewAt: nextReviewAt.toISOString(),
    sourceAttemptId: params.attempt.id,
    createdAt: params.createdAt,
    retrievalCount: 0,
  };
}

export function buildOnboardingDiagnosticReport(input: {
  answers: DiagnosticAnswerMap;
  targetScore: number;
  dailyMinutes: number;
  startedAt: string;
  completedAt?: string;
}): OnboardingDiagnosticReport {
  const completedAt = input.completedAt ?? new Date().toISOString();
  const startedAtMs = new Date(input.startedAt).getTime();
  const elapsedSeconds = Number.isFinite(startedAtMs)
    ? Math.max(1, Math.round((new Date(completedAt).getTime() - startedAtMs) / 1000))
    : 1;
  const details = scoreDiagnosticAnswers(input.answers);
  const sessionId = makeId('session-onboarding-diagnostic');
  const elapsedPerItem = Math.max(1, Math.round(elapsedSeconds / Math.max(1, ONBOARDING_DIAGNOSTIC_ITEMS.length)));
  const attempts = ONBOARDING_DIAGNOSTIC_ITEMS.map((item) => {
    const detail = details.find((candidate) => candidate.itemId === item.id)!;
    return buildAttempt({
      sessionId,
      item,
      detail,
      answer: input.answers[item.id] ?? '',
      elapsedSeconds: elapsedPerItem,
      createdAt: completedAt,
    });
  });
  const reviewItems = ONBOARDING_DIAGNOSTIC_ITEMS.map((item) => {
    const detail = details.find((candidate) => candidate.itemId === item.id)!;
    const attempt = attempts.find((candidate) => candidate.questionId === item.id)!;
    return buildReviewItem({ item, attempt, detail, createdAt: completedAt });
  }).filter((item): item is ReviewItem => Boolean(item));
  const skillProfiles = buildSkillProfiles(details, completedAt);
  const averageScore = Math.round(details.reduce((sum, detail) => sum + detail.score, 0) / Math.max(1, details.length));
  const ranked = [...details].sort((left, right) => left.score - right.score);

  const session: PracticeSession = {
    id: sessionId,
    goalId: 'goal-cet4-primary',
    examId: 'cet4',
    moduleId: 'onboarding',
    modeId: 'diagnostic',
    startedAt: input.startedAt,
    finishedAt: completedAt,
    plannedMinutes: Math.max(8, Math.round(input.dailyMinutes * 0.25)),
    questionIds: ONBOARDING_DIAGNOSTIC_ITEMS.map((item) => item.id),
    status: 'completed',
  };

  return {
    session,
    attempts,
    reviewItems,
    skillProfiles,
    details,
    averageScore,
    weakestSkills: ranked.slice(0, 2).map((detail) => detail.skillArea),
    strongestSkills: ranked.slice(-2).reverse().map((detail) => detail.skillArea),
  };
}
