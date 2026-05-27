import { describe, expect, it } from 'vitest';
import {
  getExamRegistryEntry,
  listPublicExamProfiles,
  normalizeExamId,
} from '../../src/exams/registry';

describe('exam registry', () => {
  it('publishes CET-4 as the only currently trainable exam', () => {
    const exams = listPublicExamProfiles();
    const cet4 = exams.find((exam) => exam.id === 'cet4');

    expect(exams.map((exam) => exam.id)).toEqual(expect.arrayContaining(['cet4', 'cet6', 'ielts', 'toefl']));
    expect(cet4).toMatchObject({
      trainingStatus: 'active',
      routeAvailability: 'trainable',
      contentBoundary: {
        builtInContent: 'original-simulated',
        officialQuestionBank: false,
        userImportSupported: true,
      },
      featureCoverage: {
        diagnostic: true,
        dailyPlan: true,
        practice: true,
        review: true,
        mockExam: true,
      },
    });
  });

  it('keeps roadmap exams metadata-only instead of pretending they have content packs', () => {
    const roadmapExams = listPublicExamProfiles().filter((exam) => exam.routeAvailability === 'metadata-only');

    expect(roadmapExams.map((exam) => exam.id)).toEqual(['cet6', 'ielts', 'toefl']);
    expect(roadmapExams).toEqual(roadmapExams.map((exam) => expect.objectContaining({
      trainingStatus: 'roadmap',
      contentBoundary: expect.objectContaining({
        builtInContent: 'metadata-only',
        officialQuestionBank: false,
        userImportSupported: false,
      }),
      featureCoverage: expect.objectContaining({
        diagnostic: false,
        dailyPlan: false,
        practice: false,
        review: false,
        mockExam: false,
      }),
    })));
  });

  it('normalizes external exam labels without falling back to CET-4 for unknown values', () => {
    expect(normalizeExamId('CET-6')).toBe('cet6');
    expect(getExamRegistryEntry('CET-6')?.profile.id).toBe('cet6');
    expect(getExamRegistryEntry('unknown-exam')).toBeUndefined();
  });
});
