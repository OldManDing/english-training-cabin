import { describe, expect, it } from 'vitest';
import {
  buildAbilityEvidenceSummary,
  buildAbilityTimelineBars,
  buildEvidenceKnowledgeTabs,
  buildStageProgressSummary,
} from '../../src/domain/progress/abilityEvidence';
import { SkillProfile } from '../../src/types';

function profile(input: Partial<SkillProfile> & Pick<SkillProfile, 'skillArea' | 'subSkillId' | 'score'>): SkillProfile {
  return {
    id: `cet4-${input.skillArea}-${input.subSkillId}`,
    confidence: 3,
    evidenceCount: 1,
    lastUpdatedAt: '2026-05-27T10:00:00.000Z',
    ...input,
  };
}

describe('ability evidence map', () => {
  it('keeps the ability map empty until real evidence exists', () => {
    const summary = buildAbilityEvidenceSummary([]);
    const tabs = buildEvidenceKnowledgeTabs([]);

    expect(summary).toMatchObject({
      hasEvidence: false,
      forecastScore: null,
      evidenceCount: 0,
      scores: {
        reading: 0,
        listening: 0,
        writing: 0,
        translation: 0,
        speaking: 0,
      },
    });
    expect(tabs.reading).toEqual([
      expect.objectContaining({
        source: 'empty',
        percent: 0,
        evidenceCount: 0,
      }),
    ]);
  });

  it('renders knowledge nodes only from persisted SkillProfile scores', () => {
    const tabs = buildEvidenceKnowledgeTabs([
      profile({
        skillArea: 'reading',
        subSkillId: 'careful-reading',
        score: 64,
        evidenceCount: 4,
        lastUpdatedAt: '2026-05-26T08:00:00.000Z',
      }),
      profile({
        skillArea: 'reading',
        subSkillId: 'careful-reading',
        score: 78,
        evidenceCount: 5,
        lastUpdatedAt: '2026-05-27T08:00:00.000Z',
      }),
      profile({
        skillArea: 'listening',
        subSkillId: 'long-conversation',
        score: 91,
        evidenceCount: 0,
        lastUpdatedAt: '2026-05-27T08:00:00.000Z',
      }),
    ]);

    expect(tabs.reading).toEqual([
      expect.objectContaining({
        source: 'skill-profile',
        percent: 78,
        evidenceCount: 5,
      }),
    ]);
    expect(tabs.listening[0]).toMatchObject({
      source: 'empty',
      percent: 0,
    });
  });

  it('builds weekly timeline bars from dated evidence instead of synthetic trends', () => {
    const bars = buildAbilityTimelineBars([
      profile({
        skillArea: 'reading',
        subSkillId: 'careful-reading',
        score: 80,
        evidenceCount: 3,
        lastUpdatedAt: '2026-05-26T12:00:00.000Z',
      }),
      profile({
        skillArea: 'writing',
        subSkillId: 'diagnostic-writing',
        score: 60,
        evidenceCount: 2,
        lastUpdatedAt: '2026-05-10T12:00:00.000Z',
      }),
    ], new Date('2026-05-27T12:00:00.000Z'));

    expect(bars).toHaveLength(6);
    expect(bars.filter((bar) => bar.value != null)).toEqual([
      expect.objectContaining({ value: 60, evidenceCount: 2 }),
      expect.objectContaining({ value: 80, evidenceCount: 3 }),
    ]);
    expect(bars.filter((bar) => bar.value == null)).toHaveLength(4);
  });

  it('requires both baseline evidence and staged mock evidence before claiming improvement', () => {
    expect(buildStageProgressSummary([])).toMatchObject({
      status: 'not-enough-evidence',
      delta: null,
      verifiedSkillCount: 0,
    });

    expect(buildStageProgressSummary([
      profile({
        skillArea: 'reading',
        subSkillId: 'diagnostic-reading',
        score: 64,
        evidenceCount: 3,
      }),
    ])).toMatchObject({
      status: 'mock-needed',
      delta: null,
      verifiedSkillCount: 0,
    });
  });

  it('verifies staged improvement only from real baseline and mock SkillProfile evidence', () => {
    const summary = buildStageProgressSummary([
      profile({
        skillArea: 'reading',
        subSkillId: 'diagnostic-reading',
        score: 62,
        evidenceCount: 3,
        lastUpdatedAt: '2026-05-01T08:00:00.000Z',
      }),
      profile({
        skillArea: 'reading',
        subSkillId: 'mock-reading-mixed',
        score: 74,
        evidenceCount: 30,
        lastUpdatedAt: '2026-05-25T08:00:00.000Z',
      }),
      profile({
        skillArea: 'listening',
        subSkillId: 'diagnostic-listening',
        score: 58,
        evidenceCount: 3,
        lastUpdatedAt: '2026-05-01T08:00:00.000Z',
      }),
      profile({
        skillArea: 'listening',
        subSkillId: 'mock-listening-mixed',
        score: 66,
        evidenceCount: 25,
        lastUpdatedAt: '2026-05-25T08:00:00.000Z',
      }),
      profile({
        skillArea: 'writing',
        subSkillId: 'mock-short-essay',
        score: 80,
        evidenceCount: 1,
        lastUpdatedAt: '2026-05-25T08:00:00.000Z',
      }),
    ]);

    expect(summary).toMatchObject({
      status: 'verified-improved',
      baselineAverage: 60,
      mockAverage: 70,
      delta: 10,
      verifiedSkillCount: 2,
      improvedSkillCount: 2,
      declinedSkillCount: 0,
      estimatedCetScoreChange: 41,
    });
    expect(summary.sectionChanges).toEqual([
      expect.objectContaining({
        skillArea: 'listening',
        baselineScore: 58,
        mockScore: 66,
        delta: 8,
        mockEvidenceCount: 25,
      }),
      expect.objectContaining({
        skillArea: 'reading',
        baselineScore: 62,
        mockScore: 74,
        delta: 12,
        mockEvidenceCount: 30,
      }),
    ]);
  });
});
