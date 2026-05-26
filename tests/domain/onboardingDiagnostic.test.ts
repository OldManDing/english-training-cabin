import { describe, expect, it } from 'vitest';
import {
  buildOnboardingDiagnosticReport,
  ONBOARDING_DIAGNOSTIC_ITEMS,
  scoreDiagnosticAnswers,
} from '../../src/domain/diagnostic/onboardingDiagnostic';

const strongAnswers = {
  'diag-reading-location': 'B',
  'diag-listening-turning-point': 'C',
  'diag-translation-structure':
    'With the development of online learning, more college students can arrange their study time more flexibly.',
  'diag-writing-argument':
    'In my opinion, students can use AI tools wisely because they can receive quick feedback. For example, when I write an English paragraph, AI can point out grammar problems and suggest better expressions. However, students should revise the answer themselves instead of copying it.',
  'diag-speaking-response':
    'One habit that helps me learn English is reading aloud every morning. It works because I can practice pronunciation and remember useful expressions. For example, I repeat one short paragraph three times, so I become more confident.',
};

describe('onboarding diagnostic scoring', () => {
  it('scores real answers and produces a persisted diagnostic evidence report', () => {
    const report = buildOnboardingDiagnosticReport({
      answers: strongAnswers,
      targetScore: 550,
      dailyMinutes: 45,
      startedAt: '2026-05-26T08:00:00.000Z',
      completedAt: '2026-05-26T08:08:00.000Z',
    });

    expect(report.session).toMatchObject({
      examId: 'cet4',
      moduleId: 'onboarding',
      modeId: 'diagnostic',
      status: 'completed',
    });
    expect(report.session.questionIds).toHaveLength(ONBOARDING_DIAGNOSTIC_ITEMS.length);
    expect(report.attempts).toHaveLength(ONBOARDING_DIAGNOSTIC_ITEMS.length);
    expect(report.skillProfiles).toHaveLength(ONBOARDING_DIAGNOSTIC_ITEMS.length);
    expect(report.averageScore).toBeGreaterThanOrEqual(80);
    expect(report.reviewItems.length).toBeLessThanOrEqual(1);
  });

  it('changes weak-skill ordering when answers are incorrect or too thin', () => {
    const details = scoreDiagnosticAnswers({
      'diag-reading-location': 'A',
      'diag-listening-turning-point': 'B',
      'diag-translation-structure': strongAnswers['diag-translation-structure'],
      'diag-writing-argument': strongAnswers['diag-writing-argument'],
      'diag-speaking-response': strongAnswers['diag-speaking-response'],
    });

    expect(details.find((detail) => detail.skillArea === 'reading')?.score).toBe(42);
    expect(details.find((detail) => detail.skillArea === 'listening')?.score).toBe(42);
    expect(details.filter((detail) => detail.score < 70)).toHaveLength(2);

    const report = buildOnboardingDiagnosticReport({
      answers: {
        'diag-reading-location': 'A',
        'diag-listening-turning-point': 'B',
        'diag-translation-structure': strongAnswers['diag-translation-structure'],
        'diag-writing-argument': strongAnswers['diag-writing-argument'],
        'diag-speaking-response': strongAnswers['diag-speaking-response'],
      },
      targetScore: 600,
      dailyMinutes: 60,
      startedAt: '2026-05-26T08:00:00.000Z',
      completedAt: '2026-05-26T08:06:00.000Z',
    });

    expect(report.reviewItems).toHaveLength(2);
    expect(report.weakestSkills).toEqual(['reading', 'listening']);
  });
});
