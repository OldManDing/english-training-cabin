import { describe, expect, it } from 'vitest';
import { buildLearningEvidenceLedger } from '../../src/domain/progress/evidenceLedger';
import { Attempt, PracticeSession, SkillProfile } from '../../src/types';

function session(input: Partial<PracticeSession> & Pick<PracticeSession, 'id' | 'moduleId' | 'modeId'>): PracticeSession {
  return {
    examId: 'cet4',
    startedAt: '2026-05-20T08:00:00.000Z',
    finishedAt: '2026-05-20T08:20:00.000Z',
    plannedMinutes: 20,
    questionIds: [],
    status: 'completed',
    ...input,
  };
}

function attempt(input: Partial<Attempt> & Pick<Attempt, 'id' | 'sessionId' | 'moduleId' | 'questionTypeId'>): Attempt {
  return {
    questionId: `${input.id}-question`,
    examId: 'cet4',
    answer: 'A',
    isCorrect: true,
    elapsedSeconds: 30,
    confidence: 4,
    mistakeReasons: [],
    createdAt: '2026-05-20T08:20:00.000Z',
    ...input,
  };
}

function profile(input: Partial<SkillProfile> & Pick<SkillProfile, 'skillArea' | 'subSkillId' | 'score'>): SkillProfile {
  return {
    id: `cet4-${input.skillArea}-${input.subSkillId}`,
    confidence: 3,
    evidenceCount: 1,
    lastUpdatedAt: '2026-05-20T08:20:00.000Z',
    ...input,
  };
}

describe('buildLearningEvidenceLedger', () => {
  it('reports missing evidence when no learning data has been collected', () => {
    const ledger = buildLearningEvidenceLedger({
      sessions: [],
      attempts: [],
      skillProfiles: [],
    });

    expect(ledger).toMatchObject({
      totalCompletedSessions: 0,
      totalAttempts: 0,
      scoredAttemptCount: 0,
      feedbackAttemptCount: 0,
      mistakeReasonCount: 0,
    });
    expect(ledger.skillCoverage.every((item) => item.status === 'missing')).toBe(true);
    expect(ledger.verificationGaps).toEqual(expect.arrayContaining([
      '还没有完成过训练，能力画像和每日调度缺少真实证据。',
      '阶段提分验证需要同时具备诊断/专项基线和阶段模考记录。',
    ]));
  });

  it('summarizes sessions, attempts, feedback, skill coverage, and recent evidence', () => {
    const diagnosticSession = session({
      id: 'session-diagnostic',
      moduleId: 'onboarding',
      modeId: 'onboarding-diagnostic',
      finishedAt: '2026-05-01T08:20:00.000Z',
    });
    const readingSession = session({
      id: 'session-reading',
      moduleId: 'reading',
      modeId: 'careful-reading',
      finishedAt: '2026-05-12T08:20:00.000Z',
    });
    const mockSession = session({
      id: 'session-mock',
      moduleId: 'mock',
      modeId: 'cet4-standard-mock',
      finishedAt: '2026-05-25T08:20:00.000Z',
    });

    const ledger = buildLearningEvidenceLedger({
      sessions: [diagnosticSession, readingSession, mockSession],
      attempts: [
        attempt({
          id: 'attempt-reading-1',
          sessionId: 'session-reading',
          moduleId: 'reading',
          questionTypeId: 'careful-reading',
          isCorrect: false,
          mistakeReasons: ['定位失准'],
        }),
        attempt({
          id: 'attempt-reading-2',
          sessionId: 'session-reading',
          moduleId: 'reading',
          questionTypeId: 'careful-reading',
          isCorrect: true,
        }),
        attempt({
          id: 'attempt-writing-1',
          sessionId: 'session-mock',
          moduleId: 'writing',
          questionTypeId: 'short-essay',
          aiFeedback: {
            score: 74,
            mistakeReasons: ['论证结构松散'],
            comments: ['需要补充例子。'],
            nextActions: ['重写论证段。'],
            confidence: 'medium',
          },
          mistakeReasons: ['论证结构松散'],
        }),
      ],
      skillProfiles: [
        profile({
          skillArea: 'reading',
          subSkillId: 'diagnostic-reading',
          score: 62,
          evidenceCount: 3,
          lastUpdatedAt: '2026-05-01T08:20:00.000Z',
        }),
        profile({
          skillArea: 'reading',
          subSkillId: 'mock-reading-mixed',
          score: 76,
          evidenceCount: 30,
          lastUpdatedAt: '2026-05-25T08:20:00.000Z',
        }),
        profile({
          skillArea: 'writing',
          subSkillId: 'mock-short-essay',
          score: 74,
          evidenceCount: 1,
          lastUpdatedAt: '2026-05-25T08:20:00.000Z',
        }),
      ],
    });

    expect(ledger).toMatchObject({
      totalCompletedSessions: 3,
      totalAttempts: 3,
      scoredAttemptCount: 3,
      feedbackAttemptCount: 2,
      mistakeReasonCount: 2,
    });
    expect(ledger.skillCoverage.find((item) => item.skillArea === 'reading')).toMatchObject({
      status: 'strong',
      evidenceCount: 33,
      latestScore: 69,
      latestUpdatedAt: '2026-05-25T08:20:00.000Z',
    });
    expect(ledger.skillCoverage.find((item) => item.skillArea === 'writing')).toMatchObject({
      status: 'strong',
      evidenceCount: 1,
      latestScore: 74,
    });
    expect(ledger.recentEvidence[0]).toMatchObject({
      id: 'session-mock',
      label: '阶段模考',
      attemptCount: 1,
      correctRate: 100,
      feedbackCount: 1,
      mistakeReasonCount: 1,
    });
    expect(ledger.verificationGaps).not.toContain('还没有完成过训练，能力画像和每日调度缺少真实证据。');
  });
});
