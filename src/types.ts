export type ActiveTab = 'today' | 'practice' | 'review' | 'speaking' | 'progress' | 'import' | 'settings';

export type SkillArea = 'reading' | 'listening' | 'writing' | 'translation' | 'speaking' | 'vocabulary' | 'grammar';

export type AnswerMode = 'single-choice' | 'multiple-choice' | 'text' | 'audio';

export type MistakeReason =
  | '定位失准'
  | '同义替换未识别'
  | '细节偷换'
  | '关键词漏听'
  | '转折信息漏听'
  | '数字时间混淆'
  | '选项判断失误'
  | '低信心'
  | '盲猜'
  | '表达不自然'
  | '语法错误';

export interface ExamProfile {
  id: string;
  name: string;
  modules: ExamModule[];
  speaking?: SpeakingExamConfig;
  defaultPlanTemplates: StudyPlanTemplate[];
}

export interface ExamModule {
  id: string;
  name: string;
  skillArea: SkillArea;
  durationMinutes?: number;
  scoreWeight?: number;
  questionTypes: QuestionTypeConfig[];
}

export interface QuestionTypeConfig {
  id: string;
  name: string;
  answerMode: AnswerMode;
  defaultTimeLimitSeconds?: number;
  supportedReviewReasons: MistakeReason[];
}

export interface SpeakingExamConfig {
  enabled: boolean;
  rubric: string[];
}

export interface StudyPlanTemplate {
  id: string;
  title: string;
  dailyMinutes: number;
  prioritySkills: SkillArea[];
}

export interface StudyGoal {
  id: string;
  examId: string;
  examDate: string;
  targetScore?: number;
  dailyMinutes: number;
  prioritySkills: SkillArea[];
  status: 'active' | 'paused' | 'completed';
  createdAt: string;
  updatedAt: string;
}

export interface Question {
  id: number | string;
  examId?: string;
  moduleId?: string;
  questionTypeId?: string;
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  explanation: string;
  type: string; // e.g., "细节推断", "主旨大意", "词汇理解"
  tags?: string[];
  difficulty?: 1 | 2 | 3 | 4 | 5;
  sourceType?: 'original' | 'user-imported' | 'licensed' | 'ai-generated';
  highlightTextIndices?: {
    correct: [number, number]; // index range in passage
    distractor?: [number, number];
  };
  correctSentence?: string;
  distractorSentence?: string;
  diagnostic?: {
    uncertaintyDetected?: boolean;
    hesitationDuration?: number; // in seconds
    behaviorDiagnosis?: string[]; // e.g., ["同义替换不确定", "定位不准确"]
  };
}

export interface Passage {
  id: string;
  examId?: string;
  moduleId?: string;
  title: string;
  content: string;
  questions: Question[];
}

export interface PracticeSession {
  id: string;
  goalId?: string;
  examId: string;
  moduleId: string;
  modeId: string;
  startedAt: string;
  finishedAt?: string;
  plannedMinutes: number;
  questionIds: string[];
  status: 'planned' | 'active' | 'completed' | 'abandoned';
}

export interface Attempt {
  id: string;
  sessionId: string;
  questionId: string;
  examId: string;
  moduleId: string;
  questionTypeId: string;
  answer: unknown;
  isCorrect?: boolean;
  elapsedSeconds: number;
  confidence?: 1 | 2 | 3 | 4 | 5;
  mistakeReasons: MistakeReason[];
  aiFeedback?: AiFeedbackSummary;
  createdAt: string;
}

export interface AiFeedbackSummary {
  score?: number;
  mistakeReasons: MistakeReason[];
  comments: string[];
  nextActions: string[];
  confidence: 'low' | 'medium' | 'high';
}

export interface PracticeCompletionReport {
  session: PracticeSession;
  attempts: Attempt[];
  reviewItems: ReviewItem[];
  skillProfiles: SkillProfile[];
}

export interface DailyPlan {
  id: string;
  date: string;
  plannedMinutes: number;
  tasks: DailyTask[];
  rationale: string[];
}

export interface DailyTask {
  id: string;
  type: 'diagnostic' | 'practice' | 'review' | 'speaking' | 'mock';
  title: string;
  skillArea: SkillArea;
  estimatedMinutes: number;
  priority: 'high' | 'medium' | 'low';
  reason: string;
  payload: Record<string, unknown>;
}

export interface SpeakingSession {
  originalText: string;
  improvedText: string;
  originalFillers: { word: string; count: number }[];
  originalFillerCount: number;
  improvedFillerCount: number;
  originalAudioDuration?: number;
  improvedAudioDuration?: number;
  comparisonAnalysis: {
    fluency: string;
    logic: string;
    vocabulary: string;
  };
  scoreChange: {
    from: number;
    to: number;
  };
}

export interface ReviewItem {
  id: string;
  title: string;
  category: '词汇' | '句式' | '错题';
  detail: string;
  daysAgo: number;
  targetType?: 'question' | 'mistake-reason' | 'speaking-pattern' | 'expression';
  targetId?: string;
  examId?: string;
  moduleId?: string;
  skillArea?: SkillArea;
  masteryScore?: number;
  priorityScore?: number;
  reviewIntervalDays?: number;
  nextReviewAt?: string;
  lastReviewedAt?: string;
  sourceAttemptId?: string;
  createdAt?: string;
}

export interface SkillProfile {
  id: string;
  skillArea: SkillArea;
  subSkillId: string;
  score: number;
  confidence: number;
  evidenceCount: number;
  lastUpdatedAt: string;
}

export interface AbilityScore {
  name: string;
  category: 'reading' | 'listening' | 'speaking' | 'writing';
  score: number;
  change: number; // e.g., +6
}

export interface SkillGap {
  id: string;
  title: string;
  impactColor: 'red' | 'orange' | 'blue';
  description: string;
  actionWord: string;
}

export interface TimelineLog {
  id: string;
  time: string;
  title: string;
  description: string;
}
