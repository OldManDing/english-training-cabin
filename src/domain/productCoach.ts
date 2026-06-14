import {
  Attempt,
  ChoiceOption,
  DailyPlan,
  PracticeSession,
  ReviewItem,
  SkillArea,
  SkillProfile,
} from '../types';

export type CoachModuleId =
  | 'vocabulary'
  | 'cloze'
  | 'grammar'
  | 'reading'
  | 'listening'
  | 'writing'
  | 'translation'
  | 'mock';

export interface TodayCoachInsight {
  headline: string;
  reason: string;
  expectedGain: string;
  proof: string;
  risk: string;
}

export interface TrainingCamp {
  id: string;
  title: string;
  focus: string;
  target: string;
  method: string;
  successMetric: string;
}

export interface ChoiceOptionInsight {
  option: ChoiceOption;
  label: string;
  tone: 'correct' | 'selected-wrong' | 'distractor';
  reason: string;
}

export interface ReviewVariantRecommendation {
  id: string;
  title: string;
  moduleId: CoachModuleId;
  reason: string;
  actionLabel: string;
}

export interface ProgressTrustBrief {
  weeklyChange: string;
  weakReason: string;
  nextAction: string;
  evidenceQuality: string;
}

export interface MotivationSnapshot {
  streakDays: number;
  repairedMistakes: number;
  weeklyAttempts: number;
  message: string;
}

export interface MockRepairPlanItem {
  id: string;
  title: string;
  moduleId: CoachModuleId;
  priority: 'high' | 'medium' | 'low';
  reason: string;
  action: string;
}

const SKILL_LABELS: Record<SkillArea, string> = {
  reading: '阅读',
  listening: '听力',
  writing: '写作',
  translation: '翻译',
  speaking: '口语',
  vocabulary: '词汇',
  grammar: '语法',
};

const MODULE_LABELS: Record<CoachModuleId, string> = {
  vocabulary: '词汇听音',
  cloze: '完形/选词填空',
  grammar: '语法结构',
  reading: '仔细阅读',
  listening: '长对话精听',
  writing: '短文写作',
  translation: '段落翻译',
  mock: '阶段模考',
};

const TRAINING_CAMPS: Record<CoachModuleId, TrainingCamp[]> = {
  vocabulary: [
    {
      id: 'vocabulary-core-meaning',
      title: '核心词义辨析营',
      focus: '近义词、熟词僻义和选项干扰',
      target: '先把高频核心词的中文义和英文释义连起来',
      method: '听单词和例句后再选义，低信心答案进入复习队列',
      successMetric: '连续 2 组正确率达到 80%',
    },
    {
      id: 'vocabulary-collocation',
      title: '语块搭配营',
      focus: '固定搭配、动宾搭配和例句迁移',
      target: '把单词从孤立记忆变成可复述语块',
      method: '答后看例句与搭配，复习时用搭配造句',
      successMetric: '错因里“搭配错误”明显减少',
    },
  ],
  cloze: [
    {
      id: 'cloze-context',
      title: '上下文线索营',
      focus: '前后句逻辑、指代和语境限制',
      target: '先读语境再选词，减少只看空格猜词',
      method: '按段落语义、词性和搭配三步判断',
      successMetric: '未答题优先完成 30 题',
    },
    {
      id: 'cloze-collocation',
      title: '固定搭配修复营',
      focus: '介词、动词短语和连接词',
      target: '把常见搭配错因集中消化',
      method: '错题重做后再做同类未练题',
      successMetric: '同类题二次正确率超过 75%',
    },
  ],
  grammar: [
    {
      id: 'grammar-nonfinite',
      title: '非谓语结构营',
      focus: 'to do、doing、done 和固定结构',
      target: '先看谓语和逻辑主语，再判断非谓语形式',
      method: '每题答后复述规则，错题进入间隔复习',
      successMetric: '非谓语相关错因连续 10 题少于 2 次',
    },
    {
      id: 'grammar-tense-voice',
      title: '时态语态营',
      focus: '完成时、过去时、被动语态和情态被动',
      target: '用时间标志和主被动关系快速排除选项',
      method: '先圈时间线索，再看主语与动作关系',
      successMetric: '时态语态题正确率达到 80%',
    },
    {
      id: 'grammar-clauses-linkers',
      title: '从句连接营',
      focus: '定语从句、让步、目的、因果和并列结构',
      target: '识别连接词承担的逻辑关系',
      method: '答后把句子翻成中文，再说出连接关系',
      successMetric: '连接词类错因下降到每组 1 次以内',
    },
  ],
  reading: [
    {
      id: 'reading-location',
      title: '定位线索营',
      focus: '题干关键词、同义替换和原文证据',
      target: '减少凭印象作答',
      method: '先定位原句，再选答案，错题回看证据句',
      successMetric: '定位失准错因低于 20%',
    },
    {
      id: 'reading-inference',
      title: '推断边界营',
      focus: '细节偷换、过度推断和主旨干扰',
      target: '只选原文能支撑的结论',
      method: '每题写出选项成立或不成立的证据',
      successMetric: '同义替换未识别错因下降',
    },
  ],
  listening: [
    {
      id: 'listening-keyword',
      title: '关键词捕捉营',
      focus: '转折、数字、时间和人物态度',
      target: '减少听到信息但没抓住答案点',
      method: '先听完整段，再按题目回放定位',
      successMetric: '关键词漏听错因连续两组下降',
    },
    {
      id: 'listening-turning',
      title: '转折信息营',
      focus: 'but、however、actually 等答案反转点',
      target: '听出说话人真正态度',
      method: '答后复听转折句，并口头复述',
      successMetric: '转折信息漏听减少到每组 1 次以内',
    },
  ],
  writing: [
    {
      id: 'writing-structure',
      title: '结构论证营',
      focus: '观点、理由、例子和结论',
      target: '先搭框架再写句子',
      method: '提交后按结构反馈重写一版',
      successMetric: '论证结构松散错因下降',
    },
    {
      id: 'writing-sentence',
      title: '句式升级营',
      focus: '连接词、从句和表达自然度',
      target: '把简单句升级成自然表达',
      method: '复习队列里主动造句和复述',
      successMetric: '语法错误和表达不自然减少',
    },
  ],
  translation: [
    {
      id: 'translation-main-structure',
      title: '主干转换营',
      focus: '中文长句拆主干、补修饰',
      target: '避免逐字硬译',
      method: '先写英文主干，再加时间、地点、原因等成分',
      successMetric: '中文干扰错因下降',
    },
    {
      id: 'translation-collocation',
      title: '表达搭配营',
      focus: '动词搭配、名词化表达和固定句式',
      target: '让译文更像英文表达',
      method: '答后把参考表达加入复习输出',
      successMetric: '搭配错误错因减少',
    },
  ],
  mock: [
    {
      id: 'mock-calibration',
      title: '阶段校准营',
      focus: '写作、听力、阅读、翻译整卷校准',
      target: '用完整结构发现真正短板',
      method: '提交后按最低分项生成专项修复计划',
      successMetric: '下一次模考弱项提升 3 个能力点',
    },
  ],
};

function latestProfileForSkill(profiles: SkillProfile[], skillArea: SkillArea): SkillProfile | undefined {
  return [...profiles]
    .filter((profile) => profile.skillArea === skillArea && profile.evidenceCount > 0)
    .sort((left, right) => right.lastUpdatedAt.localeCompare(left.lastUpdatedAt))[0];
}

function weakestProfile(profiles: SkillProfile[]): SkillProfile | undefined {
  return [...profiles]
    .filter((profile) => profile.evidenceCount > 0)
    .sort((left, right) => {
      if (left.score !== right.score) return left.score - right.score;
      return right.lastUpdatedAt.localeCompare(left.lastUpdatedAt);
    })[0];
}

function uniqueIsoDates(sessions: PracticeSession[]): string[] {
  return Array.from(new Set(
    sessions
      .map((session) => session.finishedAt?.slice(0, 10))
      .filter((date): date is string => Boolean(date)),
  )).sort((left, right) => right.localeCompare(left));
}

function countStreakDays(sessions: PracticeSession[], today = new Date()): number {
  const dates = new Set(uniqueIsoDates(sessions));
  let cursor = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  let streak = 0;

  for (let index = 0; index < 60; index += 1) {
    const key = cursor.toISOString().slice(0, 10);
    if (!dates.has(key)) {
      if (streak === 0 && index === 0) {
        cursor.setUTCDate(cursor.getUTCDate() - 1);
        continue;
      }
      break;
    }
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  return streak;
}

function moduleIdForSkill(skillArea?: SkillArea, subSkillId = ''): CoachModuleId {
  const normalized = subSkillId.toLowerCase();
  if (normalized.includes('cloze') || normalized.includes('word-bank')) return 'cloze';
  if (skillArea === 'grammar') return 'grammar';
  if (skillArea === 'vocabulary') return 'vocabulary';
  if (skillArea === 'listening') return 'listening';
  if (skillArea === 'writing') return 'writing';
  if (skillArea === 'translation') return 'translation';
  return 'reading';
}

export function buildTodayCoachInsight(params: {
  dailyPlan?: DailyPlan | null;
  skillProfiles?: SkillProfile[];
  reviewItemCount?: number;
  answeredQuestionCount?: number;
  abilityEvidenceCount?: number;
  estimatedScore?: number;
  targetScore?: number;
}): TodayCoachInsight {
  const task = params.dailyPlan?.tasks[0];
  const profiles = params.skillProfiles ?? [];
  const weak = weakestProfile(profiles);
  const targetGap = params.estimatedScore && params.targetScore
    ? Math.max(0, params.targetScore - params.estimatedScore)
    : null;

  if (!task) {
    return {
      headline: '3 分钟启动：先做入门诊断',
      reason: '还没有足够证据判断弱项，先用小诊断生成第一版学习画像。',
      expectedGain: '完成后今日训练会变成具体专项，不再靠猜。',
      proof: `当前证据 ${params.abilityEvidenceCount ?? 0} 条，已答 ${params.answeredQuestionCount ?? 0} 题。`,
      risk: '如果跳过诊断，系统只能按默认阅读路径推荐。',
    };
  }

  return {
    headline: `今天只先完成：${task.title}`,
    reason: task.reason,
    expectedGain: task.type === 'review'
      ? '做完会降低错因回潮风险，并刷新下一次复习间隔。'
      : task.type === 'mock'
      ? '做完会生成四个分项的修复计划。'
      : `做完会补强 ${SKILL_LABELS[task.skillArea]} 证据，让推荐更准。`,
    proof: weak
      ? `当前最低证据：${SKILL_LABELS[weak.skillArea]} / ${weak.subSkillId} ${weak.score}%。`
      : `当前证据 ${params.abilityEvidenceCount ?? 0} 条，已答 ${params.answeredQuestionCount ?? 0} 题。`,
    risk: targetGap == null
      ? `待复习 ${params.reviewItemCount ?? 0} 项，先把今天的最小闭环做完。`
      : targetGap > 0
      ? `距离目标还差约 ${targetGap} 分，优先修复最低能力点。`
      : '当前预测已达到目标线，重点保持稳定和错因回收。',
  };
}

export function buildTrainingCamps(moduleId: CoachModuleId, profiles: SkillProfile[] = []): TrainingCamp[] {
  const base = TRAINING_CAMPS[moduleId] ?? [];
  const relatedProfile = profiles.find((profile) => moduleIdForSkill(profile.skillArea, profile.subSkillId) === moduleId);

  if (!relatedProfile) return base;

  return base.map((camp, index) => ({
    ...camp,
    successMetric: index === 0 && relatedProfile.score < 75
      ? `${relatedProfile.subSkillId} 从 ${relatedProfile.score}% 提升到 75%`
      : camp.successMetric,
  }));
}

export function buildChoiceOptionInsights(params: {
  options: Partial<Record<ChoiceOption, string>>;
  correctAnswer: ChoiceOption;
  selectedAnswer?: ChoiceOption | null;
  explanation?: string;
  trapType?: string;
}): ChoiceOptionInsight[] {
  return (['A', 'B', 'C', 'D'] as ChoiceOption[])
    .filter((option) => Boolean(params.options[option]))
    .map((option) => {
      const isCorrect = option === params.correctAnswer;
      const isSelectedWrong = option === params.selectedAnswer && !isCorrect;
      const optionText = params.options[option] ?? '';

      return {
        option,
        label: isCorrect ? '正确项' : isSelectedWrong ? '你的误选' : '干扰项',
        tone: isCorrect ? 'correct' : isSelectedWrong ? 'selected-wrong' : 'distractor',
        reason: isCorrect
          ? `保留：${params.explanation || '它和题干、语境或规则一致。'}`
          : isSelectedWrong
          ? `误选原因：${params.trapType || '这个选项看似相关，但没有完全符合题干条件。'}`
          : `排除：${optionText ? `“${optionText}”` : '该选项'}不满足关键线索或语法关系。`,
      };
    });
}

export function buildReviewVariantRecommendations(item?: ReviewItem): ReviewVariantRecommendation[] {
  const moduleId = moduleIdForSkill(item?.skillArea, item?.redoQuestion?.sourceLabel ?? item?.moduleId ?? '');
  const reason = item?.title ? `围绕「${item.title}」再做同类新题，避免只记住原题答案。` : '先完成一组同类专项，把错因迁移到新题里验证。';

  const recommendations: ReviewVariantRecommendation[] = [
    {
      id: `${moduleId}-variant-1`,
      title: `${MODULE_LABELS[moduleId]}同类变式`,
      moduleId,
      reason,
      actionLabel: `去做${MODULE_LABELS[moduleId]}`,
    },
    {
      id: 'grammar-variant-support',
      title: moduleId === 'grammar' ? '语法规则再验证' : '语法结构补强',
      moduleId: 'grammar',
      reason: '大多数客观题错因最终会落到结构、搭配或连接关系，语法能反向支撑阅读和翻译。',
      actionLabel: '去做语法结构',
    },
    {
      id: 'mock-variant-check',
      title: '下次用模考校准',
      moduleId: 'mock',
      reason: '同类专项修复后，用阶段模考确认弱项是否真的改善。',
      actionLabel: '去阶段模考',
    },
  ];

  return recommendations.filter((recommendation, index, all) =>
    all.findIndex((item) => item.moduleId === recommendation.moduleId) === index,
  );
}

export function buildProgressTrustBrief(params: {
  profiles?: SkillProfile[];
  sessions?: PracticeSession[];
  attempts?: Attempt[];
}): ProgressTrustBrief {
  const profiles = params.profiles ?? [];
  const sessions = params.sessions ?? [];
  const attempts = params.attempts ?? [];
  const weak = weakestProfile(profiles);
  const evidenceCount = profiles.reduce((sum, profile) => sum + profile.evidenceCount, 0);
  const recentAttempts = attempts.filter((attempt) => {
    const createdAt = new Date(attempt.createdAt).getTime();
    return Number.isFinite(createdAt) && Date.now() - createdAt <= 7 * 86400000;
  });
  const recentCorrectRate = recentAttempts.length
    ? Math.round((recentAttempts.filter((attempt) => attempt.isCorrect).length / recentAttempts.length) * 100)
    : null;

  return {
    weeklyChange: recentCorrectRate == null
      ? '本周还缺少新作答，暂时不能判断趋势。'
      : `本周 ${recentAttempts.length} 次作答，正确率 ${recentCorrectRate}%。`,
    weakReason: weak
      ? `最薄弱证据来自 ${SKILL_LABELS[weak.skillArea]} / ${weak.subSkillId}，当前 ${weak.score}%，证据 ${weak.evidenceCount} 条。`
      : '还没有稳定薄弱项，先完成诊断或任一专项。',
    nextAction: weak
      ? `下一步优先进入「${MODULE_LABELS[moduleIdForSkill(weak.skillArea, weak.subSkillId)]}」。`
      : '下一步先完成 3 分钟启动诊断。',
    evidenceQuality: evidenceCount >= 12
      ? '证据量较充足，趋势判断可信。'
      : sessions.length > 0
      ? `已有 ${evidenceCount} 条能力证据，建议继续补到 12 条以上。`
      : '缺少训练会话，当前地图只能显示空状态。',
  };
}

export function buildMotivationSnapshot(params: {
  sessions?: PracticeSession[];
  attempts?: Attempt[];
  reviewItems?: ReviewItem[];
}): MotivationSnapshot {
  const sessions = params.sessions ?? [];
  const attempts = params.attempts ?? [];
  const reviewItems = params.reviewItems ?? [];
  const streakDays = countStreakDays(sessions);
  const repairedMistakes = reviewItems.filter((item) => (item.masteryScore ?? 0) >= 70 || item.lastReviewedAt).length;
  const weeklyAttempts = attempts.filter((attempt) => {
    const createdAt = new Date(attempt.createdAt).getTime();
    return Number.isFinite(createdAt) && Date.now() - createdAt <= 7 * 86400000;
  }).length;

  return {
    streakDays,
    repairedMistakes,
    weeklyAttempts,
    message: streakDays > 0
      ? `已连续 ${streakDays} 天完成训练，继续把错因修复成稳定分。`
      : weeklyAttempts > 0
      ? `本周已经完成 ${weeklyAttempts} 次作答，今天补一个最小闭环即可。`
      : '今天先完成一个 3 分钟启动任务，产品才有证据继续推荐。',
  };
}

export function buildMockRepairPlan(sectionScores: Array<{
  moduleId: 'writing' | 'listening' | 'reading' | 'translation';
  label: string;
  score: number;
}>): MockRepairPlanItem[] {
  return [...sectionScores]
    .sort((left, right) => left.score - right.score)
    .map((section, index) => {
      const moduleId = moduleIdForSkill(section.moduleId);
      const priority = index === 0 || section.score < 70 ? 'high' : section.score < 82 ? 'medium' : 'low';

      return {
        id: `mock-repair-${section.moduleId}`,
        title: `${section.label}修复`,
        moduleId,
        priority,
        reason: `${section.label}本次 ${section.score}%，${priority === 'high' ? '需要优先进入专项修复' : '继续用专项保持稳定'}。`,
        action: `去做${MODULE_LABELS[moduleId]}`,
      };
    });
}
