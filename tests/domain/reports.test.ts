import { describe, expect, it } from 'vitest';
import { buildChoicePracticeReport, buildSpeakingPracticeReport, buildSubjectivePracticeReport } from '../../src/domain/practice/reports';

describe('buildChoicePracticeReport', () => {
  it('creates attempts, review items, and skill evidence from wrong answers', () => {
    const report = buildChoicePracticeReport({
      examId: 'cet4',
      moduleId: 'reading',
      questionTypeId: 'careful-reading',
      modeId: 'unit-test',
      skillArea: 'reading',
      plannedMinutes: 18,
      startedAt: new Date(Date.now() - 60_000).toISOString(),
      questions: [
        {
          id: 1,
          question: 'What is the main idea?',
          correctAnswer: 'B',
          correctSentence: 'Natural environments may reduce stress and improve concentration.',
          explanation: 'The correct option paraphrases reduce stress and improve concentration.',
          type: '同义替换',
        },
      ],
      answers: [
        {
          selected: 'A',
          correct: false,
          confidence: 'sure',
        },
      ],
    });

    expect(report.session.status).toBe('completed');
    expect(report.attempts).toHaveLength(1);
    expect(report.attempts[0].mistakeReasons).toContain('同义替换未识别');
    expect(report.reviewItems).toHaveLength(1);
    expect(report.reviewItems[0].learningMethod).toBe('active-recall-cloze-production');
    expect(report.reviewItems[0].memoryTask).toMatchObject({
      sourceText: 'Natural environments may reduce stress and improve concentration.',
      spacingPlanDays: [1, 3, 7, 14, 30],
    });
    expect(report.reviewItems[0].memoryTask?.clozePrompt).toContain('____');
    expect(report.reviewItems[0].memoryTask?.productionPrompt).toContain('用语块');
    expect(report.skillProfiles[0]).toMatchObject({
      skillArea: 'reading',
      subSkillId: 'careful-reading',
      score: 0,
    });
  });

  it('does not create review work for confident correct answers', () => {
    const report = buildChoicePracticeReport({
      moduleId: 'listening',
      questionTypeId: 'long-conversation',
      modeId: 'unit-test',
      skillArea: 'listening',
      plannedMinutes: 10,
      startedAt: new Date(Date.now() - 30_000).toISOString(),
      questions: [
        {
          id: 1,
          question: 'What does the woman mean?',
          correctAnswer: 'C',
          trapType: '转折信息漏听',
        },
      ],
      answers: [
        {
          selected: 'C',
          correct: true,
          confidence: 'High',
        },
      ],
    });

    expect(report.attempts[0].mistakeReasons).toEqual([]);
    expect(report.reviewItems).toEqual([]);
    expect(report.skillProfiles[0].score).toBe(100);
  });

  it('creates vocabulary-specific review work for wrong or low-confidence words', () => {
    const report = buildChoicePracticeReport({
      examId: 'cet4',
      moduleId: 'vocabulary',
      questionTypeId: 'cet4-core-vocabulary',
      modeId: 'vocabulary-audio-choice',
      skillArea: 'vocabulary',
      plannedMinutes: 12,
      startedAt: new Date(Date.now() - 30_000).toISOString(),
      questions: [
        {
          id: 'vocab-adapt',
          question: 'adapt /əˈdæpt/: Students need to adapt to online learning.',
          correctAnswer: 'B',
          type: '词义辨析与听音识别',
          trapType: '关键词漏听',
          correctSentence: 'adapt to online learning. Students need to adapt to online learning.',
          explanation: 'adapt to 表示适应。',
        },
      ],
      answers: [
        {
          selected: 'A',
          correct: false,
          confidence: 'not_sure',
        },
      ],
    });

    expect(report.reviewItems[0]).toMatchObject({
      title: '词汇错因：低信心',
      category: '词汇',
      skillArea: 'vocabulary',
    });
    expect(report.reviewItems[0].memoryTask?.recallPrompt).toContain('词汇语块');
  });

  it('creates speaking attempts, review work, and skill evidence from a retell round', () => {
    const report = buildSpeakingPracticeReport({
      examId: 'cet4',
      modeId: 'cet-set4-retell',
      startedAt: new Date(Date.now() - 45_000).toISOString(),
      originalSpeech: 'um I can see wind power and it is good for environment',
      analysisMode: 'live',
      analysis: {
        originalTextWithMarkings: '[filler um] I can see wind power and it is good for environment',
        improvedTextWithConnectors: 'The picture shows renewable energy facilities, which can reduce pollution and support sustainable development.',
        fillerCount: 1,
        fluencyAnalysis: '减少填充词，先完整输出主题句。',
        logicAnalysis: '补充观点、原因和限制。',
        vocabularyAnalysis: '用 renewable energy 替换 good energy。',
        scoreImprovementFrom: 58,
        scoreImprovementTo: 72,
      },
    });

    expect(report.session).toMatchObject({
      moduleId: 'speaking',
      modeId: 'cet-set4-retell',
      status: 'completed',
    });
    expect(report.attempts[0].aiFeedback?.nextActions[0]).toContain('renewable energy');
    expect(report.reviewItems[0]).toMatchObject({
      targetType: 'speaking-pattern',
      skillArea: 'speaking',
    });
    expect(report.reviewItems[0].memoryTask?.sourceText).toContain('renewable energy');
    expect(report.reviewItems[0].memoryTask?.productionPrompt).toContain('用语块');
    expect(report.skillProfiles[0]).toMatchObject({
      skillArea: 'speaking',
      score: 72,
    });
  });

  it('creates subjective writing or translation evidence from AI feedback', () => {
    const report = buildSubjectivePracticeReport({
      examId: 'cet4',
      moduleId: 'translation',
      questionTypeId: 'paragraph-translation',
      modeId: 'translation-practice',
      plannedMinutes: 30,
      startedAt: new Date(Date.now() - 90_000).toISOString(),
      prompt: 'Translate a paragraph about renewable energy.',
      answer: 'Renewable energy plays more important role in city development.',
      analysis: {
        score: 68,
        mistakeReasons: ['中文干扰', '搭配错误'],
        comments: ['句序受中文影响。'],
        nextActions: ['先确定主干，再处理修饰。'],
        sampleAnswer: 'Renewable energy is playing an increasingly important role in urban development.',
        confidence: 'medium',
      },
    });

    expect(report.session).toMatchObject({
      moduleId: 'translation',
      modeId: 'translation-practice',
      status: 'completed',
    });
    expect(report.attempts[0].mistakeReasons).toContain('中文干扰');
    expect(report.reviewItems[0]).toMatchObject({
      targetType: 'expression',
      skillArea: 'translation',
    });
    expect(report.reviewItems[0].memoryTask?.sourceText).toContain('increasingly important role');
    expect(report.skillProfiles[0]).toMatchObject({
      skillArea: 'translation',
      score: 68,
    });
  });
});
