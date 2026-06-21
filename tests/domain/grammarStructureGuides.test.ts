import { describe, expect, it } from 'vitest';
import { CET4_GRAMMAR_PRACTICE_QUESTIONS } from '../../src/questionBank';
import {
  getGrammarStructureTopicByFocus,
  GRAMMAR_STRUCTURE_TOPIC_GUIDES,
} from '../../src/domain/practice/grammarStructureGuides';

describe('grammar structure topic guides', () => {
  it('classifies common grammar structure focuses into concrete solving groups', () => {
    expect(getGrammarStructureTopicByFocus('时态|现在完成时').id).toBe('tense');
    expect(getGrammarStructureTopicByFocus('被动语态|一般过去时').id).toBe('voice');
    expect(getGrammarStructureTopicByFocus('情态动词被动语态|数据安全').id).toBe('voice');
    expect(getGrammarStructureTopicByFocus('非谓语|be encouraged to do').id).toBe('nonfinite');
    expect(getGrammarStructureTopicByFocus('定语从句|关系代词').id).toBe('clauses');
  });

  it('keeps every published CET-4 grammar structure question in a specific method group', () => {
    const topicCounts = CET4_GRAMMAR_PRACTICE_QUESTIONS.reduce((counts, question) => {
      const topic = getGrammarStructureTopicByFocus(question.trapType);
      counts.set(topic.id, (counts.get(topic.id) ?? 0) + 1);
      return counts;
    }, new Map<string, number>());

    expect(topicCounts.get('other') ?? 0).toBe(0);
    expect(topicCounts.get('tense')).toBeGreaterThan(0);
    expect(topicCounts.get('voice')).toBeGreaterThan(0);
    expect(topicCounts.get('nonfinite')).toBeGreaterThan(0);
    expect(topicCounts.get('clauses')).toBeGreaterThan(0);
    expect(topicCounts.size).toBeGreaterThanOrEqual(7);
  });

  it('gives each grammar structure group a cue, method steps, and a checkpoint', () => {
    const visibleGuides = GRAMMAR_STRUCTURE_TOPIC_GUIDES.filter((topic) => topic.id !== 'other');

    for (const guide of visibleGuides) {
      expect(guide.label).toMatch(/\S/);
      expect(guide.cue).toMatch(/\S/);
      expect(guide.methodSteps).toHaveLength(3);
      expect(guide.checkpoint).toMatch(/\S/);
    }
  });
});
