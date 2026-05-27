import { SkillArea, SkillProfile } from '../../types';

export type AbilityEvidenceTab = 'reading' | 'listening' | 'grammar';
export type AbilityNodeType = 'success' | 'warning' | 'error' | 'primary' | 'normal';
export type AbilityNodeIcon = 'check' | 'zap' | 'alert' | 'file' | 'globe';

export interface EvidenceKnowledgeNode {
  id: string;
  name: string;
  percent: number;
  type: AbilityNodeType;
  icon: AbilityNodeIcon;
  evidenceCount: number;
  source: 'skill-profile' | 'empty';
  sourceLabel: string;
}

export interface AbilityEvidenceSummary {
  hasEvidence: boolean;
  scores: Record<'listening' | 'reading' | 'writing' | 'translation' | 'speaking', number>;
  averageScore: number;
  forecastScore: number | null;
  evidenceCount: number;
  trainingStability: number | null;
}

export interface AbilityTimelineBar {
  label: string;
  value: number | null;
  evidenceCount: number;
  dateRange: string;
}

export type StageProgressStatus = 'not-enough-evidence' | 'mock-needed' | 'verified-improved' | 'verified-stable' | 'verified-declined';

export interface StageSkillProgress {
  skillArea: 'listening' | 'reading' | 'writing' | 'translation';
  label: string;
  baselineScore: number;
  mockScore: number;
  delta: number;
  baselineDate: string;
  mockDate: string;
  mockEvidenceCount: number;
}

export interface StageProgressSummary {
  status: StageProgressStatus;
  title: string;
  description: string;
  baselineAverage: number | null;
  mockAverage: number | null;
  delta: number | null;
  estimatedCetScoreChange: number | null;
  verifiedSkillCount: number;
  improvedSkillCount: number;
  declinedSkillCount: number;
  sectionChanges: StageSkillProgress[];
  nextAction: string;
}

const KNOWLEDGE_TAB_SKILLS: Record<AbilityEvidenceTab, SkillArea[]> = {
  reading: ['reading', 'translation', 'vocabulary'],
  listening: ['listening', 'vocabulary'],
  grammar: ['grammar', 'writing', 'translation'],
};

const STAGE_PROGRESS_SKILLS: StageSkillProgress['skillArea'][] = ['listening', 'reading', 'writing', 'translation'];

const EMPTY_TAB_LABEL: Record<AbilityEvidenceTab, string> = {
  reading: '待诊断：阅读/翻译/词汇',
  listening: '待诊断：听力/词汇',
  grammar: '待诊断：语法/写作/翻译',
};

const SKILL_LABELS: Record<SkillArea, string> = {
  reading: '阅读',
  listening: '听力',
  writing: '写作',
  translation: '翻译',
  speaking: '口语',
  vocabulary: '词汇',
  grammar: '语法',
};

const SUB_SKILL_LABELS: Record<string, string> = {
  'careful-reading': '仔细阅读定位',
  'diagnostic-reading': '入门阅读诊断',
  'long-conversation': '长对话定位',
  'diagnostic-listening': '入门听力诊断',
  'cet4-core-vocabulary': 'CET-4 核心词汇',
  'vocabulary-audio-choice': '词汇听音辨义',
  'diagnostic-writing': '入门写作诊断',
  'diagnostic-translation': '入门翻译诊断',
  'diagnostic-speaking': '入门口语诊断',
  'settings-reading': '阅读设置基线',
  'settings-listening': '听力设置基线',
  'settings-writing': '写作设置基线',
  'settings-translation': '翻译设置基线',
  'settings-speaking': '口语设置基线',
};

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function getNodeType(score: number): AbilityNodeType {
  if (score >= 82) return 'success';
  if (score >= 70) return 'primary';
  if (score >= 58) return 'warning';
  return 'error';
}

function getIconForSkill(skillArea: SkillArea): AbilityNodeIcon {
  if (skillArea === 'translation' || skillArea === 'writing' || skillArea === 'grammar') return 'globe';
  if (skillArea === 'vocabulary') return 'file';
  if (skillArea === 'listening') return 'alert';
  if (skillArea === 'reading') return 'check';
  return 'zap';
}

function formatSubSkillId(value: string): string {
  return value
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(' ');
}

function getProfileLabel(profile: SkillProfile): string {
  const subSkillLabel = SUB_SKILL_LABELS[profile.subSkillId] ?? formatSubSkillId(profile.subSkillId);
  return `${SKILL_LABELS[profile.skillArea]} · ${subSkillLabel}`;
}

function latestProfileByKey(profiles: SkillProfile[], getKey: (profile: SkillProfile) => string): SkillProfile[] {
  const latest = new Map<string, SkillProfile>();
  profiles
    .filter((profile) => profile.evidenceCount > 0)
    .forEach((profile) => {
      const key = getKey(profile);
      const current = latest.get(key);
      if (!current || profile.lastUpdatedAt > current.lastUpdatedAt) {
        latest.set(key, profile);
      }
    });

  return [...latest.values()];
}

function isMockProfile(profile: SkillProfile): boolean {
  return profile.subSkillId.startsWith('mock-') || profile.id.includes('-mock-');
}

function byDateAsc(left: SkillProfile, right: SkillProfile): number {
  return left.lastUpdatedAt.localeCompare(right.lastUpdatedAt);
}

function byDateDesc(left: SkillProfile, right: SkillProfile): number {
  return right.lastUpdatedAt.localeCompare(left.lastUpdatedAt);
}

function average(scores: number[]): number | null {
  if (scores.length === 0) return null;
  return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
}

function estimateCetScoreFromAverage(value: number | null): number | null {
  return value == null ? null : Math.max(300, Math.min(710, Math.round(300 + value * 4.1)));
}

function buildStageProgressCopy(delta: number | null, verifiedSkillCount: number): Pick<StageProgressSummary, 'status' | 'title' | 'description' | 'nextAction'> {
  if (verifiedSkillCount < 2 || delta == null) {
    return {
      status: 'not-enough-evidence',
      title: '阶段提分验证待建立',
      description: '至少需要 2 个笔试分项同时具备基线证据和阶段模考证据，才能判断阶段训练效果。',
      nextAction: '先完成入门诊断或专项训练建立基线，再完成一次阶段模考。',
    };
  }
  if (delta >= 3) {
    return {
      status: 'verified-improved',
      title: '阶段训练出现正向提分证据',
      description: `最近阶段模考相对基线平均提升 ${delta} 个能力点，说明当前训练路径正在产生可验证效果。`,
      nextAction: '继续保留当前训练节奏，并优先巩固仍低于 70% 的分项。',
    };
  }
  if (delta <= -3) {
    return {
      status: 'verified-declined',
      title: '阶段模考暴露回落风险',
      description: `最近阶段模考相对基线平均下降 ${Math.abs(delta)} 个能力点，需要调整训练路径。`,
      nextAction: '切换到巩固模式，优先处理到期错因复习和下降最大的分项。',
    };
  }
  return {
    status: 'verified-stable',
    title: '阶段表现基本稳定',
    description: '最近阶段模考与基线接近，当前证据还不足以证明明显提分或回落。',
    nextAction: '继续积累专项训练证据，并在下一次阶段模考后重新校准。',
  };
}

export function buildAbilityEvidenceSummary(
  profiles: SkillProfile[],
  speakingScoreChange?: { from: number; to: number },
): AbilityEvidenceSummary {
  const latestBySkill = latestProfileByKey(profiles, (profile) => profile.skillArea);
  const findScore = (skillArea: SkillArea) => latestBySkill.find((profile) => profile.skillArea === skillArea)?.score;
  const scores = {
    listening: clampScore(findScore('listening') ?? 0),
    reading: clampScore(findScore('reading') ?? 0),
    writing: clampScore(findScore('writing') ?? 0),
    translation: clampScore(findScore('translation') ?? 0),
    speaking: clampScore(speakingScoreChange?.to ?? findScore('speaking') ?? 0),
  };
  const coreScores = [scores.listening, scores.reading, scores.writing, scores.translation].filter((score) => score > 0);
  const evidenceCount = profiles.reduce((sum, profile) => sum + Math.max(0, profile.evidenceCount), 0) + (speakingScoreChange ? 1 : 0);
  const hasEvidence = evidenceCount > 0 || coreScores.length > 0;
  const averageScore = coreScores.length > 0
    ? Math.round(coreScores.reduce((sum, score) => sum + score, 0) / coreScores.length)
    : 0;

  return {
    hasEvidence,
    scores,
    averageScore,
    forecastScore: hasEvidence && averageScore > 0 ? Math.max(300, Math.min(710, Math.round(300 + averageScore * 4.1))) : null,
    evidenceCount,
    trainingStability: hasEvidence ? Math.max(12, Math.min(100, Math.round((evidenceCount / 12) * 100))) : null,
  };
}

export function buildStageProgressSummary(profiles: SkillProfile[]): StageProgressSummary {
  const evidenceProfiles = profiles.filter((profile) => profile.evidenceCount > 0);
  const hasBaselineEvidence = evidenceProfiles.some((profile) => !isMockProfile(profile));
  const hasMockEvidence = evidenceProfiles.some(isMockProfile);

  if (!hasBaselineEvidence) {
    return {
      status: 'not-enough-evidence',
      title: '阶段提分验证待建立',
      description: '当前还没有可作为基线的诊断或专项训练证据。',
      baselineAverage: null,
      mockAverage: null,
      delta: null,
      estimatedCetScoreChange: null,
      verifiedSkillCount: 0,
      improvedSkillCount: 0,
      declinedSkillCount: 0,
      sectionChanges: [],
      nextAction: '先完成入门诊断或至少一组专项训练，建立可比较的能力基线。',
    };
  }

  if (!hasMockEvidence) {
    return {
      status: 'mock-needed',
      title: '等待阶段模考校准',
      description: '已经有训练基线，但还没有阶段模考证据，无法验证阶段性提分效果。',
      baselineAverage: null,
      mockAverage: null,
      delta: null,
      estimatedCetScoreChange: null,
      verifiedSkillCount: 0,
      improvedSkillCount: 0,
      declinedSkillCount: 0,
      sectionChanges: [],
      nextAction: '完成一次 CET-4 标准结构阶段模考，用写作、听力、阅读和翻译分项校准训练效果。',
    };
  }

  const sectionChanges = STAGE_PROGRESS_SKILLS.flatMap<StageSkillProgress>((skillArea) => {
    const skillProfiles = evidenceProfiles.filter((profile) => profile.skillArea === skillArea);
    const latestMock = skillProfiles.filter(isMockProfile).sort(byDateDesc)[0];
    const baseline = skillProfiles
      .filter((profile) => !isMockProfile(profile) && (!latestMock || profile.lastUpdatedAt <= latestMock.lastUpdatedAt))
      .sort(byDateAsc)[0];

    if (!baseline || !latestMock) return [];

    const baselineScore = clampScore(baseline.score);
    const mockScore = clampScore(latestMock.score);
    return [{
      skillArea,
      label: SKILL_LABELS[skillArea],
      baselineScore,
      mockScore,
      delta: mockScore - baselineScore,
      baselineDate: baseline.lastUpdatedAt.slice(0, 10),
      mockDate: latestMock.lastUpdatedAt.slice(0, 10),
      mockEvidenceCount: latestMock.evidenceCount,
    }];
  });

  const baselineAverage = average(sectionChanges.map((item) => item.baselineScore));
  const mockAverage = average(sectionChanges.map((item) => item.mockScore));
  const delta = baselineAverage == null || mockAverage == null ? null : mockAverage - baselineAverage;
  const baselineCetScore = estimateCetScoreFromAverage(baselineAverage);
  const mockCetScore = estimateCetScoreFromAverage(mockAverage);
  const copy = buildStageProgressCopy(delta, sectionChanges.length);

  return {
    ...copy,
    baselineAverage,
    mockAverage,
    delta,
    estimatedCetScoreChange: baselineCetScore == null || mockCetScore == null ? null : mockCetScore - baselineCetScore,
    verifiedSkillCount: sectionChanges.length,
    improvedSkillCount: sectionChanges.filter((item) => item.delta >= 3).length,
    declinedSkillCount: sectionChanges.filter((item) => item.delta <= -3).length,
    sectionChanges,
  };
}

export function buildEvidenceKnowledgeTabs(profiles: SkillProfile[]): Record<AbilityEvidenceTab, EvidenceKnowledgeNode[]> {
  const latestBySubSkill = latestProfileByKey(profiles, (profile) => `${profile.skillArea}:${profile.subSkillId}`);

  return (Object.keys(KNOWLEDGE_TAB_SKILLS) as AbilityEvidenceTab[]).reduce((tabs, tab) => {
    const allowedSkills = KNOWLEDGE_TAB_SKILLS[tab];
    const nodes = latestBySubSkill
      .filter((profile) => allowedSkills.includes(profile.skillArea))
      .sort((left, right) => {
        if (left.score !== right.score) return left.score - right.score;
        return right.lastUpdatedAt.localeCompare(left.lastUpdatedAt);
      })
      .slice(0, 5)
      .map<EvidenceKnowledgeNode>((profile) => ({
        id: `${profile.skillArea}-${profile.subSkillId}`,
        name: getProfileLabel(profile),
        percent: clampScore(profile.score),
        type: getNodeType(profile.score),
        icon: getIconForSkill(profile.skillArea),
        evidenceCount: profile.evidenceCount,
        source: 'skill-profile',
        sourceLabel: `${profile.evidenceCount} 条证据 · ${profile.lastUpdatedAt.slice(0, 10)}`,
      }));

    tabs[tab] = nodes.length > 0
      ? nodes
      : [{
          id: `${tab}-empty`,
          name: EMPTY_TAB_LABEL[tab],
          percent: 0,
          type: 'warning',
          icon: 'alert',
          evidenceCount: 0,
          source: 'empty',
          sourceLabel: '暂无真实作答证据',
        }];
    return tabs;
  }, {} as Record<AbilityEvidenceTab, EvidenceKnowledgeNode[]>);
}

function toLocalDate(value: string): Date | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(date: Date): string {
  return date.toISOString().slice(5, 10);
}

export function buildAbilityTimelineBars(profiles: SkillProfile[], now = new Date()): AbilityTimelineBar[] {
  const weekMs = 7 * 86400000;
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  return Array.from({ length: 6 }, (_, index) => {
    const rangeEnd = new Date(end.getTime() - (5 - index) * weekMs);
    rangeEnd.setHours(23, 59, 59, 999);
    const start = new Date(rangeEnd.getTime() - weekMs + 1);
    start.setHours(0, 0, 0, 0);
    const weekProfiles = profiles.filter((profile) => {
      if (profile.evidenceCount <= 0) return false;
      const date = toLocalDate(profile.lastUpdatedAt);
      return Boolean(date && date >= start && date <= rangeEnd);
    });
    const totalEvidence = weekProfiles.reduce((sum, profile) => sum + profile.evidenceCount, 0);
    const average = weekProfiles.length > 0
      ? Math.round(weekProfiles.reduce((sum, profile) => sum + clampScore(profile.score), 0) / weekProfiles.length)
      : null;

    return {
      label: `W${index + 1}`,
      value: average,
      evidenceCount: totalEvidence,
      dateRange: `${formatDate(start)}-${formatDate(rangeEnd)}`,
    };
  });
}
