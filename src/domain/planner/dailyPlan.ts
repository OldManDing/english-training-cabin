import { DailyPlan, ReviewItem, SkillProfile, StudyGoal } from '../../types';

interface BuildDailyPlanInput {
  goal: Pick<StudyGoal, 'id' | 'examId' | 'examDate' | 'dailyMinutes' | 'prioritySkills'>;
  reviewItems?: ReviewItem[];
  skillProfiles?: SkillProfile[];
  date?: string;
  energyMode?: 'low' | 'standard' | 'sprint';
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function minutesByMode(minutes: number, mode: BuildDailyPlanInput['energyMode']): number {
  if (mode === 'low') return Math.max(20, Math.round(minutes * 0.6));
  if (mode === 'sprint') return Math.round(minutes * 1.25);
  return minutes;
}

export function buildDailyPlan(input: BuildDailyPlanInput): DailyPlan {
  const date = input.date ?? todayIsoDate();
  const plannedMinutes = minutesByMode(input.goal.dailyMinutes, input.energyMode ?? 'standard');
  const dueReviews = (input.reviewItems ?? [])
    .filter((item) => !item.nextReviewAt || item.nextReviewAt.slice(0, 10) <= date)
    .sort((a, b) => (b.priorityScore ?? 0) - (a.priorityScore ?? 0));
  const weakestSkill = (input.skillProfiles ?? []).sort((a, b) => a.score - b.score)[0];
  const primarySkill = weakestSkill?.skillArea ?? input.goal.prioritySkills[0] ?? 'reading';
  const reviewMinutes = dueReviews.length > 0 ? Math.min(15, Math.max(8, Math.round(plannedMinutes * 0.25))) : 0;
  const speakingEnabled = input.goal.prioritySkills.includes('speaking');
  const speakingMinutes = speakingEnabled ? Math.min(15, Math.max(8, Math.round(plannedMinutes * 0.2))) : 0;
  const practiceMinutes = Math.max(10, plannedMinutes - reviewMinutes - speakingMinutes);

  const tasks: DailyPlan['tasks'] = [];

  if (dueReviews.length > 0) {
    tasks.push({
      id: `task-review-${date}`,
      type: 'review',
      title: `处理 ${dueReviews.length} 个到期错因复习项`,
      skillArea: dueReviews[0].skillArea ?? primarySkill,
      estimatedMinutes: reviewMinutes,
      priority: 'high',
      reason: `优先处理 ${dueReviews[0].title}，避免错因在间隔周期后回潮。`,
      payload: { reviewItemIds: dueReviews.slice(0, 8).map((item) => item.id) },
    });
  }

  tasks.push({
    id: `task-practice-${primarySkill}-${date}`,
    type: 'practice',
    title: primarySkill === 'listening' ? '长对话精听与选项定位' : '仔细阅读同义替换突破',
    skillArea: primarySkill,
    estimatedMinutes: practiceMinutes,
    priority: dueReviews.length > 0 ? 'medium' : 'high',
    reason: weakestSkill
      ? `${weakestSkill.subSkillId} 当前掌握度 ${weakestSkill.score}%，需要用新题补证据。`
      : '尚未积累足够练习证据，先用 CET-4 核心题型建立能力基线。',
    payload: { examId: input.goal.examId },
  });

  if (speakingEnabled) {
    tasks.push({
      id: `task-speaking-${date}`,
      type: 'speaking',
      title: '口语重说一轮：连接词与自然表达',
      skillArea: 'speaking',
      estimatedMinutes: speakingMinutes,
      priority: 'medium',
      reason: '口语提升依赖产出、纠错和重说对比，保持每天短回合更稳定。',
      payload: { mode: 'cet-set4-retell' },
    });
  }

  return {
    id: `plan-${input.goal.id}-${date}`,
    date,
    plannedMinutes,
    tasks,
    rationale: [
      dueReviews.length > 0 ? '到期复习优先级高于新题训练。' : '今天没有到期复习项，优先建立新练习证据。',
      weakestSkill
        ? `最低能力点是 ${weakestSkill.skillArea}/${weakestSkill.subSkillId}，因此安排对应专项。`
        : '能力画像证据不足，先从阅读/听力核心模块开始。',
      speakingEnabled ? '保留口语重说短回合，形成表达改进闭环。' : '当前目标未开启口语并行训练。',
    ],
  };
}
