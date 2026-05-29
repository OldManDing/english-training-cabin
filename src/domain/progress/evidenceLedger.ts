import { Attempt, PracticeSession, SkillArea, SkillProfile } from '../../types';

export type EvidenceCoverageStatus = 'strong' | 'thin' | 'missing';

export interface SkillEvidenceCoverage {
  skillArea: SkillArea;
  label: string;
  status: EvidenceCoverageStatus;
  evidenceCount: number;
  latestScore: number | null;
  latestUpdatedAt: string | null;
}

export interface RecentLearningEvidence {
  id: string;
  label: string;
  moduleId: string;
  modeId: string;
  finishedAt: string;
  attemptCount: number;
  correctRate: number | null;
  feedbackCount: number;
  mistakeReasonCount: number;
}

export interface LearningEvidenceLedger {
  totalCompletedSessions: number;
  totalAttempts: number;
  scoredAttemptCount: number;
  feedbackAttemptCount: number;
  mistakeReasonCount: number;
  skillCoverage: SkillEvidenceCoverage[];
  recentEvidence: RecentLearningEvidence[];
  verificationGaps: string[];
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

const CORE_SKILLS: SkillArea[] = ['reading', 'listening', 'writing', 'translation', 'speaking', 'vocabulary'];

function sessionLabel(session: PracticeSession): string {
  if (session.moduleId === 'mock') return '阶段模考';
  if (session.moduleId === 'review') return '间隔复习';
  if (session.moduleId === 'speaking') return '口语重说';
  if (session.moduleId === 'listening') return '听力专项';
  if (session.moduleId === 'reading') return '阅读专项';
  if (session.moduleId === 'writing') return '写作专项';
  if (session.moduleId === 'translation') return '翻译专项';
  if (session.moduleId === 'vocabulary') return '词汇专项';
  if (session.moduleId === 'onboarding') return '入门诊断';
  return session.moduleId;
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function averageScore(profiles: SkillProfile[]): number | null {
  if (profiles.length === 0) return null;
  return clampPercent(profiles.reduce((sum, profile) => sum + profile.score, 0) / profiles.length);
}

function latestDate(values: string[]): string | null {
  const sorted = values.filter(Boolean).sort((left, right) => right.localeCompare(left));
  return sorted[0] ?? null;
}

function isMockEvidence(sessionOrProfile: PracticeSession | SkillProfile): boolean {
  if ('modeId' in sessionOrProfile) return sessionOrProfile.moduleId === 'mock' || sessionOrProfile.modeId.includes('mock');
  return sessionOrProfile.subSkillId.startsWith('mock-') || sessionOrProfile.id.includes('-mock-');
}

export function buildLearningEvidenceLedger(params: {
  sessions: PracticeSession[];
  attempts: Attempt[];
  skillProfiles: SkillProfile[];
}): LearningEvidenceLedger {
  const completedSessions = params.sessions
    .filter((session) => session.status === 'completed')
    .sort((left, right) => (right.finishedAt ?? right.startedAt).localeCompare(left.finishedAt ?? left.startedAt));
  const attemptsBySession = new Map<string, Attempt[]>();

  for (const attempt of params.attempts) {
    const existing = attemptsBySession.get(attempt.sessionId) ?? [];
    existing.push(attempt);
    attemptsBySession.set(attempt.sessionId, existing);
  }

  const scoredAttempts = params.attempts.filter((attempt) => typeof attempt.isCorrect === 'boolean');
  const feedbackAttempts = params.attempts.filter((attempt) => Boolean(attempt.aiFeedback) || attempt.mistakeReasons.length > 0);
  const mistakeReasonCount = params.attempts.reduce((sum, attempt) => sum + attempt.mistakeReasons.length, 0);

  const skillCoverage = CORE_SKILLS.map<SkillEvidenceCoverage>((skillArea) => {
    const profiles = params.skillProfiles.filter((profile) => profile.skillArea === skillArea && profile.evidenceCount > 0);
    const evidenceCount = profiles.reduce((sum, profile) => sum + profile.evidenceCount, 0);
    const latestScore = averageScore(profiles);
    const latestUpdatedAt = latestDate(profiles.map((profile) => profile.lastUpdatedAt));
    const hasMock = profiles.some(isMockEvidence);

    return {
      skillArea,
      label: SKILL_LABELS[skillArea],
      evidenceCount,
      latestScore,
      latestUpdatedAt,
      status: evidenceCount >= 8 || hasMock ? 'strong' : evidenceCount > 0 ? 'thin' : 'missing',
    };
  });

  const recentEvidence = completedSessions.slice(0, 6).map<RecentLearningEvidence>((session) => {
    const sessionAttempts = attemptsBySession.get(session.id) ?? [];
    const objectiveAttempts = sessionAttempts.filter((attempt) => typeof attempt.isCorrect === 'boolean');
    const correctCount = objectiveAttempts.filter((attempt) => attempt.isCorrect).length;

    return {
      id: session.id,
      label: sessionLabel(session),
      moduleId: session.moduleId,
      modeId: session.modeId,
      finishedAt: session.finishedAt ?? session.startedAt,
      attemptCount: sessionAttempts.length,
      correctRate: objectiveAttempts.length > 0 ? clampPercent((correctCount / objectiveAttempts.length) * 100) : null,
      feedbackCount: sessionAttempts.filter((attempt) => Boolean(attempt.aiFeedback)).length,
      mistakeReasonCount: sessionAttempts.reduce((sum, attempt) => sum + attempt.mistakeReasons.length, 0),
    };
  });

  const verificationGaps: string[] = [];
  const missingCore = skillCoverage.filter((item) => item.status === 'missing').map((item) => item.label);
  const thinCore = skillCoverage.filter((item) => item.status === 'thin').map((item) => item.label);
  const hasBaseline = params.skillProfiles.some((profile) => profile.evidenceCount > 0 && !isMockEvidence(profile));
  const hasMock = completedSessions.some(isMockEvidence) || params.skillProfiles.some(isMockEvidence);

  if (completedSessions.length === 0) {
    verificationGaps.push('还没有完成过训练，能力画像和每日调度缺少真实证据。');
  }
  if (missingCore.length > 0) {
    verificationGaps.push(`以下能力还没有证据：${missingCore.join('、')}。`);
  }
  if (thinCore.length > 0) {
    verificationGaps.push(`以下能力证据偏薄，需要继续训练校准：${thinCore.join('、')}。`);
  }
  if (!hasBaseline || !hasMock) {
    verificationGaps.push('阶段提分验证需要同时具备诊断/专项基线和阶段模考记录。');
  }
  if (feedbackAttempts.length === 0 && params.attempts.length > 0) {
    verificationGaps.push('已有作答记录，但缺少错因或 AI 反馈，后续调度解释会偏弱。');
  }

  return {
    totalCompletedSessions: completedSessions.length,
    totalAttempts: params.attempts.length,
    scoredAttemptCount: scoredAttempts.length,
    feedbackAttemptCount: feedbackAttempts.length,
    mistakeReasonCount,
    skillCoverage,
    recentEvidence,
    verificationGaps,
  };
}
