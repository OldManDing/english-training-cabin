import { describe, expect, it } from 'vitest';
import { PRACTICE_METHOD_GUIDES } from '../../src/domain/practice/methodGuides';
import type { PracticeMethodGuideModuleId } from '../../src/domain/practice/methodGuides';

const SPECIALTY_MODULE_IDS: PracticeMethodGuideModuleId[] = [
  'vocabulary',
  'cloze',
  'grammar',
  'reading',
  'listening',
  'writing',
  'translation',
  'mock',
  'speaking',
];

describe('practice method guides', () => {
  it('covers every CET-4 specialty module before practice starts', () => {
    expect(Object.keys(PRACTICE_METHOD_GUIDES).sort()).toEqual([...SPECIALTY_MODULE_IDS].sort());

    for (const moduleId of SPECIALTY_MODULE_IDS) {
      const guide = PRACTICE_METHOD_GUIDES[moduleId];
      expect(guide.moduleId).toBe(moduleId);
      expect(guide.title).toMatch(/\S/);
      expect(guide.intro).toMatch(/\S/);
      expect(guide.steps).toHaveLength(4);
      expect(guide.focus).toHaveLength(3);
      expect(guide.payoff).toMatch(/\S/);
    }
  });

  it('keeps grammar structure methods grouped by concrete question type', () => {
    const grammarGuide = PRACTICE_METHOD_GUIDES.grammar;
    const topicLabels = grammarGuide.topicGuides?.map((topic) => topic.label) ?? [];

    expect(topicLabels).toContain('时态题');
    expect(topicLabels).toContain('语态题');
    expect(topicLabels).toContain('非谓语题');
    expect(topicLabels).toContain('从句与连接词题');
    expect(grammarGuide.topicGuides?.every((topic) => topic.methodSteps.length === 3)).toBe(true);
  });
});
