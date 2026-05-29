import { DailyPlan, ReviewItem, SkillProfile, StudyGoal } from '../../types';
import { buildStageProgressSummary } from '../progress/abilityEvidence';

interface BuildDailyPlanInput {
  goal: Pick<StudyGoal, 'id' | 'examId' | 'examDate' | 'dailyMinutes' | 'prioritySkills'>;
  reviewItems?: ReviewItem[];
  skillProfiles?: SkillProfile[];
  date?: string;
  energyMode?: 'low' | 'standard' | 'sprint';
  strategy?: 'efficient' | 'review';
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysUntilExam(examDate: string, date: string): number {
  const target = new Date(`${examDate}T00:00:00`).getTime();
  const current = new Date(`${date}T00:00:00`).getTime();
  if (!Number.isFinite(target) || !Number.isFinite(current)) return 999;
  return Math.ceil((target - current) / 86400000);
}

function minutesByMode(minutes: number, mode: BuildDailyPlanInput['energyMode']): number {
  if (mode === 'low') return Math.max(20, Math.round(minutes * 0.6));
  if (mode === 'sprint') return Math.round(minutes * 1.25);
  return minutes;
}

type AdaptivePracticeMode = 'cloze-context' | 'grammar-structure' | 'vocabulary-audio-choice';

function practiceModeForProfile(profile?: Pick<SkillProfile, 'skillArea' | 'subSkillId'>): AdaptivePracticeMode | undefined {
  if (!profile) return undefined;
  const subSkill = profile.subSkillId.toLowerCase();

  if (subSkill.includes('cloze')) return 'cloze-context';
  if (profile.skillArea === 'grammar') return 'grammar-structure';
  if (profile.skillArea === 'vocabulary') return 'vocabulary-audio-choice';
  return undefined;
}

function practiceTitleForSkill(skill: string, mode?: AdaptivePracticeMode): string {
  if (mode === 'cloze-context') return '完形/选词填空语境专项';
  if (mode === 'grammar-structure') return '语法结构与固定搭配专项';
  if (skill === 'listening') return '长对话精听与选项定位';
  if (skill === 'writing') return '短文写作结构与论证';
  if (skill === 'translation') return '段落翻译与中文干扰修正';
  if (skill === 'vocabulary') return '核心词汇听音与语块记忆';
  if (skill === 'grammar') return '语法结构与完形填空专项';
  return '仔细阅读同义替换突破';
}

function isPracticeSkill(skill: SkillProfile['skillArea']): skill is 'reading' | 'listening' | 'writing' | 'translation' | 'vocabulary' | 'grammar' {
  return ['reading', 'listening', 'writing', 'translation', 'vocabulary', 'grammar'].includes(skill);
}

function clampMinutes(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function allocateTaskMinutes(params: {
  plannedMinutes: number;
  hasDiagnostic: boolean;
  hasReview: boolean;
  hasSpeaking: boolean;
  reviewStrategy: boolean;
}) {
  const minimumPracticeMinutes = params.plannedMinutes <= 30 ? 8 : 10;
  let remainingMinutes = params.plannedMinutes;

  const diagnosticMinutes = params.hasDiagnostic
    ? Math.min(clampMinutes(Math.round(params.plannedMinutes * 0.28), 8, 15), Math.max(0, remainingMinutes - minimumPracticeMinutes))
    : 0;
  remainingMinutes -= diagnosticMinutes;

  const speakingReserve = params.hasSpeaking && remainingMinutes >= minimumPracticeMinutes + 6 ? 6 : 0;
  const reviewTarget = params.hasReview
    ? clampMinutes(
        Math.round(params.plannedMinutes * (params.reviewStrategy ? 0.35 : 0.25)),
        params.plannedMinutes <= 30 ? 6 : 8,
        params.reviewStrategy ? 20 : 15,
      )
    : 0;
  const reviewMinutes = params.hasReview
    ? Math.min(reviewTarget, Math.max(0, remainingMinutes - minimumPracticeMinutes - speakingReserve))
    : 0;
  remainingMinutes -= reviewMinutes;

  const speakingTarget = params.hasSpeaking
    ? clampMinutes(Math.round(params.plannedMinutes * 0.2), params.plannedMinutes <= 30 ? 6 : 8, 15)
    : 0;
  const speakingMinutes = params.hasSpeaking
    ? Math.min(speakingTarget, Math.max(0, remainingMinutes - minimumPracticeMinutes))
    : 0;
  remainingMinutes -= speakingMinutes;

  return {
    diagnosticMinutes,
    reviewMinutes,
    speakingMinutes,
    practiceMinutes: Math.max(0, remainingMinutes),
  };
}

export function buildDailyPlan(input: BuildDailyPlanInput): DailyPlan {
  const date = input.date ?? todayIsoDate();
  const plannedMinutes = minutesByMode(input.goal.dailyMinutes, input.energyMode ?? 'standard');
  const allReviewItems = input.reviewItems ?? [];
  const reviewStrategy = input.strategy === 'review';
  const dueReviews = allReviewItems
    .filter((item) => !item.nextReviewAt || item.nextReviewAt.slice(0, 10) <= date)
    .sort((a, b) => (b.priorityScore ?? 0) - (a.priorityScore ?? 0));
  const reviewCandidates = (reviewStrategy && allReviewItems.length > 0 ? allReviewItems : dueReviews)
    .sort((a, b) => (b.priorityScore ?? 0) - (a.priorityScore ?? 0));
  const sortedProfiles = [...(input.skillProfiles ?? [])].sort((a, b) => a.score - b.score);
  const hasAbilityEvidence = sortedProfiles.some((profile) => profile.evidenceCount > 0);
  const stageProgress = buildStageProgressSummary(input.skillProfiles ?? []);
  const declinedStageSection = stageProgress.sectionChanges
    .filter((section) => section.delta <= -3 && isPracticeSkill(section.skillArea))
    .sort((left, right) => {
      if (left.delta !== right.delta) return left.delta - right.delta;
      return left.mockScore - right.mockScore;
    })[0];
  const examDaysLeft = daysUntilExam(input.goal.examDate, date);
  const weakestSkill = sortedProfiles[0];
  const weakestPracticeProfile = sortedProfiles.find((profile) => isPracticeSkill(profile.skillArea));
  const weakestPracticeSkill = weakestPracticeProfile?.skillArea;
  const configuredPracticeSkill = input.goal.prioritySkills.find((skill) => skill !== 'speaking');
  const primaryPracticeSkill = declinedStageSection?.skillArea ?? weakestPracticeSkill ?? configuredPracticeSkill ?? 'reading';
  const primaryPracticeProfile = declinedStageSection
    ? sortedProfiles.find((profile) => profile.skillArea === declinedStageSection.skillArea)
    : weakestPracticeProfile;
  const primaryPracticeMode = practiceModeForProfile(primaryPracticeProfile);
  const latestVocabularyProfile = [...(input.skillProfiles ?? [])]
    .filter((profile) => profile.skillArea === 'vocabulary' && profile.evidenceCount > 0)
    .sort((left, right) => right.lastUpdatedAt.localeCompare(left.lastUpdatedAt))[0];
  const needsVocabularyTask = !latestVocabularyProfile || latestVocabularyProfile.score < 72;
  const hasReviewTask = reviewCandidates.length > 0;
  const speakingEnabled = input.goal.prioritySkills.includes('speaking');
  const taskMinutes = allocateTaskMinutes({
    plannedMinutes,
    hasDiagnostic: !hasAbilityEvidence,
    hasReview: hasReviewTask,
    hasSpeaking: speakingEnabled,
    reviewStrategy,
  });
  const shouldScheduleMock = hasAbilityEvidence && plannedMinutes >= 45 && examDaysLeft <= 45;
  const mockMinutes = shouldScheduleMock
    ? Math.min(clampMinutes(Math.round(plannedMinutes * 0.42), 20, 35), Math.max(0, taskMinutes.practiceMinutes - 8))
    : 0;

  const tasks: DailyPlan['tasks'] = [];

  if (!hasAbilityEvidence && taskMinutes.diagnosticMinutes > 0) {
    tasks.push({
      id: `task-diagnostic-${date}`,
      type: 'diagnostic',
      title: '入门诊断：建立初始能力画像',
      skillArea: primaryPracticeSkill,
      estimatedMinutes: taskMinutes.diagnosticMinutes,
      priority: 'high',
      reason: '尚未发现稳定能力证据，先完成轻量诊断，再让今日任务根据真实弱项生成。',
      payload: { examId: input.goal.examId },
    });
  }

  if (reviewCandidates.length > 0 && taskMinutes.reviewMinutes > 0) {
    tasks.push({
      id: `task-review-${date}`,
      type: 'review',
      title: `${reviewStrategy ? '巩固' : '处理'} ${reviewCandidates.length} 个${dueReviews.length > 0 ? '到期' : '高优先级'}复习项`,
      skillArea: reviewCandidates[0].skillArea ?? primaryPracticeSkill,
      estimatedMinutes: taskMinutes.reviewMinutes,
      priority: 'high',
      reason: `优先处理 ${reviewCandidates[0].title}，避免错因在间隔周期后回潮。`,
      payload: { reviewItemIds: reviewCandidates.slice(0, 8).map((item) => item.id) },
    });
  }

  const remainingPracticeMinutes = Math.max(0, taskMinutes.practiceMinutes - mockMinutes);
  const vocabularyMinutes = needsVocabularyTask && primaryPracticeSkill !== 'vocabulary' && remainingPracticeMinutes >= 20
    ? clampMinutes(Math.round(remainingPracticeMinutes * 0.35), 8, 12)
    : 0;
  const primaryPracticeMinutes = primaryPracticeSkill === 'vocabulary'
    ? remainingPracticeMinutes
    : Math.max(8, remainingPracticeMinutes - vocabularyMinutes);
  const severePracticeWeakness = Boolean(primaryPracticeProfile && primaryPracticeProfile.score < 60);
  const practiceBeforeMock = Boolean(declinedStageSection || severePracticeWeakness);

  const primaryPracticeTask: DailyPlan['tasks'][number] = {
    id: `task-practice-${primaryPracticeSkill}-${date}`,
    type: 'practice',
    title: practiceTitleForSkill(primaryPracticeSkill, primaryPracticeMode),
    skillArea: primaryPracticeSkill,
    estimatedMinutes: primaryPracticeMinutes,
    priority: declinedStageSection || (!reviewCandidates.length && hasAbilityEvidence) ? 'high' : 'medium',
    reason: declinedStageSection
      ? `${declinedStageSection.label} 阶段模考从 ${declinedStageSection.baselineScore}% 回落到 ${declinedStageSection.mockScore}%，需要优先用新题和错因复盘修正训练路径。`
      : weakestSkill
      ? `${weakestSkill.subSkillId} 当前掌握度 ${weakestSkill.score}%，需要用新题补证据。`
      : '尚未积累足够练习证据，先用 CET-4 核心题型建立能力基线。',
    payload: {
      examId: input.goal.examId,
      mode: primaryPracticeMode,
      sourceProfileId: primaryPracticeProfile?.id,
      sourceSubSkillId: primaryPracticeProfile?.subSkillId,
    },
  };

  const mockTask: DailyPlan['tasks'][number] | null = mockMinutes > 0
    ? {
        id: `task-mock-${date}`,
        type: 'mock',
        title: '阶段模考：写作/听力/阅读/翻译综合校准',
        skillArea: 'reading',
        estimatedMinutes: mockMinutes,
        priority: 'high',
        reason: `距离考试约 ${examDaysLeft} 天，必须用阶段模考校准分项能力，而不是只做零散专项。`,
        payload: { examId: input.goal.examId, mode: 'cet4-stage-mock' },
      }
    : null;

  if (practiceBeforeMock) tasks.push(primaryPracticeTask);
  if (mockTask) tasks.push(mockTask);
  if (!practiceBeforeMock) tasks.push(primaryPracticeTask);

  if (needsVocabularyTask && primaryPracticeSkill !== 'vocabulary' && vocabularyMinutes > 0) {
    tasks.push({
      id: `task-vocabulary-${date}`,
      type: 'practice',
      title: '核心词汇听音与语块记忆',
      skillArea: 'vocabulary',
      estimatedMinutes: vocabularyMinutes || 8,
      priority: latestVocabularyProfile ? 'medium' : 'high',
      reason: latestVocabularyProfile
        ? `词汇听音掌握度 ${latestVocabularyProfile.score}%，低于稳定线，需要用听音、释义和语块补证据。`
        : '还没有词汇证据，必须补一组听音和语块记忆，避免阅读/听力被核心词阻断。',
      payload: { examId: input.goal.examId, mode: 'vocabulary-audio-choice' },
    });
  }

  if (speakingEnabled && taskMinutes.speakingMinutes > 0) {
    tasks.push({
      id: `task-speaking-${date}`,
      type: 'speaking',
      title: '口语重说一轮：连接词与自然表达',
      skillArea: 'speaking',
      estimatedMinutes: taskMinutes.speakingMinutes,
      priority: weakestSkill?.skillArea === 'speaking' ? 'high' : 'medium',
      reason: weakestSkill?.skillArea === 'speaking'
        ? `口语/${weakestSkill.subSkillId} 当前掌握度 ${weakestSkill.score}%，需要优先完成重说闭环。`
        : '口语提升依赖产出、纠错和重说对比，保持每天短回合更稳定。',
      payload: { mode: 'cet-set4-retell' },
    });
  }

  return {
    id: `plan-${input.goal.id}-${date}`,
    date,
    plannedMinutes,
    tasks,
    rationale: [
      !hasAbilityEvidence ? '首次使用先做入门诊断，避免系统凭空推荐。' : dueReviews.length > 0 ? '到期复习优先级高于新题训练。' : '今天没有到期复习项，优先建立新练习证据。',
      declinedStageSection
        ? `${declinedStageSection.label} 阶段模考较基线下降 ${Math.abs(declinedStageSection.delta)} 个能力点，今日主训练优先修正该回落分项。`
        : weakestSkill
        ? `最低能力点是 ${weakestSkill.skillArea}/${weakestSkill.subSkillId}，因此安排对应专项。`
        : '能力画像证据不足，先从阅读/听力核心模块开始。',
      needsVocabularyTask ? '词汇证据不足或分数偏低，今日任务加入核心词汇听音练习。' : '词汇证据已达到当前稳定线，今天不强制安排词汇。',
      mockMinutes > 0 ? '临近考试且已有能力证据，加入阶段模考来校准写作、听力、阅读和翻译分项。' : '今天以诊断、专项或复习为主，阶段模考可在左侧“阶段模考”中手动启动。',
      reviewStrategy ? '当前使用巩固策略，会优先处理高优先级复习项。' : '当前使用高效策略，优先分配新题训练与到期复习。',
      speakingEnabled ? '保留口语重说短回合，形成表达改进闭环。' : '当前目标未开启口语并行训练。',
    ],
  };
}
