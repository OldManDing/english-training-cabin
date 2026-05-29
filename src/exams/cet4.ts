import { ExamProfile } from '../types';

export const CET4_EXAM_PROFILE: ExamProfile = {
  id: 'cet4',
  name: '大学英语四级',
  modules: [
    {
      id: 'writing',
      name: '写作',
      skillArea: 'writing',
      durationMinutes: 30,
      scoreWeight: 0.15,
      questionTypes: [
        {
          id: 'short-essay',
          name: '短文写作',
          answerMode: 'text',
          defaultTimeLimitSeconds: 1800,
          supportedReviewReasons: ['表达不自然', '语法错误', '低信心'],
        },
      ],
    },
    {
      id: 'listening',
      name: '听力',
      skillArea: 'listening',
      durationMinutes: 25,
      scoreWeight: 0.35,
      questionTypes: [
        {
          id: 'short-news',
          name: '短篇新闻',
          answerMode: 'single-choice',
          defaultTimeLimitSeconds: 45,
          supportedReviewReasons: ['关键词漏听', '数字时间混淆', '选项判断失误'],
        },
        {
          id: 'long-conversation',
          name: '长对话',
          answerMode: 'single-choice',
          defaultTimeLimitSeconds: 60,
          supportedReviewReasons: ['关键词漏听', '转折信息漏听', '数字时间混淆', '选项判断失误'],
        },
        {
          id: 'listening-passage',
          name: '听力篇章',
          answerMode: 'single-choice',
          defaultTimeLimitSeconds: 60,
          supportedReviewReasons: ['关键词漏听', '转折信息漏听', '数字时间混淆', '选项判断失误'],
        },
      ],
    },
    {
      id: 'reading',
      name: '阅读',
      skillArea: 'reading',
      durationMinutes: 40,
      scoreWeight: 0.35,
      questionTypes: [
        {
          id: 'word-bank',
          name: '选词填空',
          answerMode: 'single-choice',
          defaultTimeLimitSeconds: 60,
          supportedReviewReasons: ['搭配错误', '低信心', '盲猜'],
        },
        {
          id: 'long-matching',
          name: '长篇匹配',
          answerMode: 'single-choice',
          defaultTimeLimitSeconds: 90,
          supportedReviewReasons: ['定位失准', '同义替换未识别', '细节偷换', '低信心', '盲猜'],
        },
        {
          id: 'careful-reading',
          name: '仔细阅读',
          answerMode: 'single-choice',
          defaultTimeLimitSeconds: 210,
          supportedReviewReasons: ['定位失准', '同义替换未识别', '细节偷换', '低信心', '盲猜'],
        },
      ],
    },
    {
      id: 'vocabulary',
      name: '核心词汇',
      skillArea: 'vocabulary',
      durationMinutes: 12,
      scoreWeight: 0,
      questionTypes: [
        {
          id: 'cet4-core-vocabulary',
          name: '词义辨析与听音识别',
          answerMode: 'single-choice',
          defaultTimeLimitSeconds: 45,
          supportedReviewReasons: ['关键词漏听', '低信心', '盲猜'],
        },
      ],
    },
    {
      id: 'grammar',
      name: '语法与完形',
      skillArea: 'grammar',
      durationMinutes: 15,
      scoreWeight: 0,
      questionTypes: [
        {
          id: 'grammar-structure',
          name: '语法结构与固定搭配',
          answerMode: 'single-choice',
          defaultTimeLimitSeconds: 60,
          supportedReviewReasons: ['语法错误', '搭配错误', '时态语态错误', '低信心'],
        },
        {
          id: 'cloze-choice',
          name: '完形/选词填空语境判断',
          answerMode: 'single-choice',
          defaultTimeLimitSeconds: 60,
          supportedReviewReasons: ['搭配错误', '中文干扰', '低信心', '盲猜'],
        },
      ],
    },
    {
      id: 'translation',
      name: '翻译',
      skillArea: 'translation',
      durationMinutes: 30,
      scoreWeight: 0.15,
      questionTypes: [
        {
          id: 'paragraph-translation',
          name: '段落翻译',
          answerMode: 'text',
          defaultTimeLimitSeconds: 1800,
          supportedReviewReasons: ['表达不自然', '语法错误', '低信心'],
        },
      ],
    },
  ],
  speaking: {
    enabled: true,
    rubric: ['fluency', 'pronunciation', 'grammar', 'vocabulary', 'content'],
  },
  defaultPlanTemplates: [
    {
      id: 'cet4-60m-balanced',
      title: 'CET-4 60 分钟均衡备考',
      dailyMinutes: 60,
      prioritySkills: ['reading', 'listening', 'vocabulary', 'speaking'],
    },
  ],
};
