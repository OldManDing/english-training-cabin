import { ExamProfile } from '../types';
import { CET4_EXAM_PROFILE } from './cet4';

export type ExamRouteAvailability = 'trainable' | 'metadata-only';
export type ExamTrainingStatus = 'active' | 'roadmap';

export interface ExamRegistryEntry {
  profile: ExamProfile;
  trainingStatus: ExamTrainingStatus;
  routeAvailability: ExamRouteAvailability;
  launchPhase: string;
  contentBoundary: {
    builtInContent: 'original-simulated' | 'metadata-only';
    officialQuestionBank: false;
    userImportSupported: boolean;
    publicClaim: string;
  };
  featureCoverage: {
    goalSetting: boolean;
    diagnostic: boolean;
    dailyPlan: boolean;
    practice: boolean;
    review: boolean;
    mockExam: boolean;
    cloudSync: boolean;
  };
  defaultExamDate?: string;
}

export type PublicExamProfile = ExamProfile & Omit<ExamRegistryEntry, 'profile'>;

const CET6_EXAM_PROFILE: ExamProfile = {
  id: 'cet6',
  name: '大学英语六级',
  modules: [
    {
      id: 'writing',
      name: '写作',
      skillArea: 'writing',
      durationMinutes: 30,
      scoreWeight: 0.15,
      questionTypes: [{ id: 'cet6-essay', name: '六级短文写作', answerMode: 'text', supportedReviewReasons: ['表达不自然', '语法错误', '低信心'] }],
    },
    {
      id: 'listening',
      name: '听力',
      skillArea: 'listening',
      durationMinutes: 30,
      scoreWeight: 0.35,
      questionTypes: [{ id: 'cet6-listening', name: '六级听力理解', answerMode: 'single-choice', supportedReviewReasons: ['关键词漏听', '转折信息漏听', '选项判断失误'] }],
    },
    {
      id: 'reading',
      name: '阅读',
      skillArea: 'reading',
      durationMinutes: 40,
      scoreWeight: 0.35,
      questionTypes: [{ id: 'cet6-reading', name: '六级阅读理解', answerMode: 'single-choice', supportedReviewReasons: ['定位失准', '同义替换未识别', '细节偷换'] }],
    },
    {
      id: 'translation',
      name: '翻译',
      skillArea: 'translation',
      durationMinutes: 30,
      scoreWeight: 0.15,
      questionTypes: [{ id: 'cet6-translation', name: '六级段落翻译', answerMode: 'text', supportedReviewReasons: ['表达不自然', '语法错误', '中文干扰'] }],
    },
  ],
  speaking: {
    enabled: true,
    rubric: ['fluency', 'pronunciation', 'grammar', 'vocabulary', 'content'],
  },
  defaultPlanTemplates: [
    {
      id: 'cet6-75m-balanced',
      title: 'CET-6 75 分钟能力升级训练',
      dailyMinutes: 75,
      prioritySkills: ['reading', 'listening', 'vocabulary', 'writing'],
    },
  ],
};

const IELTS_EXAM_PROFILE: ExamProfile = {
  id: 'ielts',
  name: 'IELTS 雅思',
  modules: [
    {
      id: 'listening',
      name: 'Listening',
      skillArea: 'listening',
      durationMinutes: 30,
      scoreWeight: 0.25,
      questionTypes: [{ id: 'ielts-listening', name: '雅思听力题组', answerMode: 'single-choice', supportedReviewReasons: ['关键词漏听', '数字时间混淆', '低信心'] }],
    },
    {
      id: 'reading',
      name: 'Reading',
      skillArea: 'reading',
      durationMinutes: 60,
      scoreWeight: 0.25,
      questionTypes: [{ id: 'ielts-reading', name: '雅思阅读题组', answerMode: 'single-choice', supportedReviewReasons: ['定位失准', '同义替换未识别', '细节偷换'] }],
    },
    {
      id: 'writing',
      name: 'Writing',
      skillArea: 'writing',
      durationMinutes: 60,
      scoreWeight: 0.25,
      questionTypes: [{ id: 'ielts-writing', name: 'Task 1 / Task 2 写作', answerMode: 'text', supportedReviewReasons: ['论证结构松散', '语法错误', '表达不自然'] }],
    },
    {
      id: 'speaking',
      name: 'Speaking',
      skillArea: 'speaking',
      durationMinutes: 15,
      scoreWeight: 0.25,
      questionTypes: [{ id: 'ielts-speaking', name: '口语 Part 1-3', answerMode: 'audio', supportedReviewReasons: ['表达不自然', '语法错误', '低信心'] }],
    },
  ],
  speaking: {
    enabled: true,
    rubric: ['fluency', 'lexical-resource', 'grammar', 'pronunciation'],
  },
  defaultPlanTemplates: [
    {
      id: 'ielts-90m-balanced',
      title: 'IELTS 90 分钟四项均衡训练',
      dailyMinutes: 90,
      prioritySkills: ['listening', 'reading', 'writing', 'speaking'],
    },
  ],
};

const TOEFL_EXAM_PROFILE: ExamProfile = {
  id: 'toefl',
  name: 'TOEFL 托福',
  modules: [
    {
      id: 'reading',
      name: 'Reading',
      skillArea: 'reading',
      durationMinutes: 35,
      scoreWeight: 0.25,
      questionTypes: [{ id: 'toefl-reading', name: '托福阅读题组', answerMode: 'single-choice', supportedReviewReasons: ['定位失准', '同义替换未识别', '细节偷换'] }],
    },
    {
      id: 'listening',
      name: 'Listening',
      skillArea: 'listening',
      durationMinutes: 36,
      scoreWeight: 0.25,
      questionTypes: [{ id: 'toefl-listening', name: '托福听力题组', answerMode: 'single-choice', supportedReviewReasons: ['关键词漏听', '转折信息漏听', '选项判断失误'] }],
    },
    {
      id: 'speaking',
      name: 'Speaking',
      skillArea: 'speaking',
      durationMinutes: 16,
      scoreWeight: 0.25,
      questionTypes: [{ id: 'toefl-speaking', name: '独立/综合口语', answerMode: 'audio', supportedReviewReasons: ['表达不自然', '语法错误', '低信心'] }],
    },
    {
      id: 'writing',
      name: 'Writing',
      skillArea: 'writing',
      durationMinutes: 29,
      scoreWeight: 0.25,
      questionTypes: [{ id: 'toefl-writing', name: '学术讨论写作', answerMode: 'text', supportedReviewReasons: ['论证结构松散', '语法错误', '表达不自然'] }],
    },
  ],
  speaking: {
    enabled: true,
    rubric: ['delivery', 'language-use', 'topic-development'],
  },
  defaultPlanTemplates: [
    {
      id: 'toefl-90m-balanced',
      title: 'TOEFL 90 分钟综合能力训练',
      dailyMinutes: 90,
      prioritySkills: ['reading', 'listening', 'speaking', 'writing'],
    },
  ],
};

export const EXAM_REGISTRY: Record<string, ExamRegistryEntry> = {
  [CET4_EXAM_PROFILE.id]: {
    profile: CET4_EXAM_PROFILE,
    trainingStatus: 'active',
    routeAvailability: 'trainable',
    launchPhase: '首发完整训练闭环',
    contentBoundary: {
      builtInContent: 'original-simulated',
      officialQuestionBank: false,
      userImportSupported: true,
      publicClaim: '首发聚焦 CET-4；内置原创模拟材料和核心词表，不提供官方真题库。',
    },
    featureCoverage: {
      goalSetting: true,
      diagnostic: true,
      dailyPlan: true,
      practice: true,
      review: true,
      mockExam: true,
      cloudSync: true,
    },
    defaultExamDate: '2026-06-13',
  },
  [CET6_EXAM_PROFILE.id]: {
    profile: CET6_EXAM_PROFILE,
    trainingStatus: 'roadmap',
    routeAvailability: 'metadata-only',
    launchPhase: '考试模型与训练路径预留',
    contentBoundary: {
      builtInContent: 'metadata-only',
      officialQuestionBank: false,
      userImportSupported: false,
      publicClaim: 'CET-6 仅开放考试结构元数据，尚未开放完整训练闭环或内置内容包。',
    },
    featureCoverage: {
      goalSetting: false,
      diagnostic: false,
      dailyPlan: false,
      practice: false,
      review: false,
      mockExam: false,
      cloudSync: false,
    },
  },
  [IELTS_EXAM_PROFILE.id]: {
    profile: IELTS_EXAM_PROFILE,
    trainingStatus: 'roadmap',
    routeAvailability: 'metadata-only',
    launchPhase: '考试模型与训练路径预留',
    contentBoundary: {
      builtInContent: 'metadata-only',
      officialQuestionBank: false,
      userImportSupported: false,
      publicClaim: 'IELTS 仅开放考试结构元数据，尚未开放完整训练闭环或内置内容包。',
    },
    featureCoverage: {
      goalSetting: false,
      diagnostic: false,
      dailyPlan: false,
      practice: false,
      review: false,
      mockExam: false,
      cloudSync: false,
    },
  },
  [TOEFL_EXAM_PROFILE.id]: {
    profile: TOEFL_EXAM_PROFILE,
    trainingStatus: 'roadmap',
    routeAvailability: 'metadata-only',
    launchPhase: '考试模型与训练路径预留',
    contentBoundary: {
      builtInContent: 'metadata-only',
      officialQuestionBank: false,
      userImportSupported: false,
      publicClaim: 'TOEFL 仅开放考试结构元数据，尚未开放完整训练闭环或内置内容包。',
    },
    featureCoverage: {
      goalSetting: false,
      diagnostic: false,
      dailyPlan: false,
      practice: false,
      review: false,
      mockExam: false,
      cloudSync: false,
    },
  },
};

const EXAM_ID_ALIASES: Record<string, string> = {
  'cet-4': 'cet4',
  'cet_4': 'cet4',
  'CET-4': 'cet4',
  'cet-6': 'cet6',
  'cet_6': 'cet6',
  'CET-6': 'cet6',
  IELTS: 'ielts',
  TOEFL: 'toefl',
};

export function normalizeExamId(value: string): string {
  const trimmed = value.trim();
  return EXAM_ID_ALIASES[trimmed] ?? EXAM_ID_ALIASES[trimmed.toUpperCase()] ?? trimmed.toLowerCase();
}

export function getExamRegistryEntry(examId: string): ExamRegistryEntry | undefined {
  return EXAM_REGISTRY[normalizeExamId(examId)];
}

export function getExamProfile(examId: string): ExamProfile | undefined {
  return getExamRegistryEntry(examId)?.profile;
}

export function listExamRegistryEntries(): ExamRegistryEntry[] {
  return Object.values(EXAM_REGISTRY);
}

export function listPublicExamProfiles(): PublicExamProfile[] {
  return listExamRegistryEntries().map((entry) => ({
    ...entry.profile,
    trainingStatus: entry.trainingStatus,
    routeAvailability: entry.routeAvailability,
    launchPhase: entry.launchPhase,
    contentBoundary: entry.contentBoundary,
    featureCoverage: entry.featureCoverage,
    defaultExamDate: entry.defaultExamDate,
  }));
}
