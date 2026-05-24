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
          id: 'long-conversation',
          name: '长对话',
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
          id: 'careful-reading',
          name: '仔细阅读',
          answerMode: 'single-choice',
          defaultTimeLimitSeconds: 210,
          supportedReviewReasons: ['定位失准', '同义替换未识别', '细节偷换', '低信心', '盲猜'],
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
      prioritySkills: ['reading', 'listening', 'speaking'],
    },
  ],
};
