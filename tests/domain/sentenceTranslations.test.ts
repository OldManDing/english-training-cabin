import { describe, expect, it } from 'vitest';
import { CET4_OUTPUT_PHRASE_BANK, CET4_VOCABULARY_BANK } from '../../src/data';
import { getVocabularyQuestionSupport, getVocabularySentenceSupport } from '../../src/domain/practice/sentenceTranslations';

describe('practice sentence and vocabulary Chinese support', () => {
  it('keeps raw vocabulary choices English-only before submission', () => {
    const leakedChoices = CET4_VOCABULARY_BANK.flatMap((item) =>
      Object.entries(item.options).map(([key, text]) => ({
        word: item.word,
        key,
        text,
      })),
    ).filter(({ text }) => /[\u4e00-\u9fff]/u.test(text));

    expect(leakedChoices).toEqual([]);
  });

  it('builds submitted vocabulary prompt and option translations from real item data', () => {
    const adapt = CET4_VOCABULARY_BANK.find((item) => item.word === 'adapt');
    expect(adapt).toBeTruthy();

    const support = getVocabularyQuestionSupport(adapt!);
    const correctOption = support.optionTranslations.find((option) => option.key === adapt!.correctAnswer);

    expect(support.prompt.sourceText).toContain('Choose the most accurate English definition');
    expect(support.prompt.chineseMeaning).toContain('adapt');
    expect(support.prompt.chineseMeaning).toContain(adapt!.meaning);
    expect(support.optionTranslations).toHaveLength(4);
    expect(correctOption).toMatchObject({
      sourceText: adapt!.options[adapt!.correctAnswer],
      chineseMeaning: '适应新的条件',
      isCorrect: true,
    });
    expect(correctOption?.chineseMeaning).not.toBe(adapt!.meaning);
  });

  it('translates output phrase vocabulary options without depending on a fixed answer letter', () => {
    const generated = CET4_OUTPUT_PHRASE_BANK.find((item) => item.word === 'accurate information');
    expect(generated).toBeTruthy();

    const support = getVocabularyQuestionSupport(generated!);
    const correctOption = support.optionTranslations.find((option) => option.isCorrect);
    const distractorTranslations = support.optionTranslations.filter((option) => !option.isCorrect);

    expect(correctOption?.sourceText).toBe(generated!.options[generated!.correctAnswer]);
    expect(correctOption?.chineseMeaning).toBe('正确且精确');
    expect(distractorTranslations).toHaveLength(3);
    expect(distractorTranslations.every((option) => /[\u4e00-\u9fff]/u.test(option.chineseMeaning))).toBe(true);
  });

  it('translates method definition options as direct Chinese phrases', () => {
    const method = CET4_VOCABULARY_BANK.find((item) => item.word === 'method');
    expect(method).toBeTruthy();

    const support = getVocabularyQuestionSupport(method!);

    expect(support.optionTranslations).toHaveLength(4);
    expect(support.optionTranslations.find((option) => option.sourceText === 'a way of doing something'))
      .toMatchObject({
        chineseMeaning: '做某事的方法或方式',
        isCorrect: true,
      });
    expect(support.optionTranslations.find((option) => option.sourceText === 'a person in a class'))
      .toMatchObject({
        chineseMeaning: '班级里的一个人',
        isCorrect: false,
      });
    expect(support.optionTranslations.find((option) => option.sourceText === 'a result of a survey'))
      .toMatchObject({
        chineseMeaning: '调查结果',
        isCorrect: false,
      });
    expect(support.optionTranslations.find((option) => option.sourceText === 'a building near campus'))
      .toMatchObject({
        chineseMeaning: '校园附近的建筑',
        isCorrect: false,
      });
  });

  it('translates core definition answer options instead of falling back to word glosses', () => {
    const sampleWords = ['article', 'tense', 'voice'] as const;
    const translations = new Map(
      sampleWords.map((word) => {
        const item = CET4_VOCABULARY_BANK.find((entry) => entry.word === word);
        expect(item).toBeTruthy();
        const support = getVocabularyQuestionSupport(item!);
        const correctOption = support.optionTranslations.find((option) => option.isCorrect);
        return [word, { item, correctOption }] as const;
      }),
    );

    expect(translations.get('article')?.correctOption?.chineseMeaning).toBe(
      '一篇文字作品，或 a、an、the 这类语法词',
    );
    expect(translations.get('article')?.correctOption?.chineseMeaning).not.toBe(
      translations.get('article')?.item?.meaning,
    );
    expect(translations.get('tense')?.correctOption?.chineseMeaning).toBe('表示时间的动词形式');
    expect(translations.get('tense')?.correctOption?.chineseMeaning).not.toBe(
      translations.get('tense')?.item?.meaning,
    );
    expect(translations.get('voice')?.correctOption?.chineseMeaning).toBe(
      '说话发出的声音；主动或被动的动词形式',
    );
    expect(translations.get('voice')?.correctOption?.chineseMeaning).not.toBe(
      translations.get('voice')?.item?.meaning,
    );
  });

  it('translates generated vocabulary distractors as direct Chinese meanings', () => {
    const generated = CET4_VOCABULARY_BANK.find((item) => item.word === 'afford');
    expect(generated).toBeTruthy();

    const support = getVocabularyQuestionSupport(generated!);
    const distractorTranslations = support.optionTranslations.filter((option) => !option.isCorrect);

    expect(distractorTranslations.length).toBe(3);
    expect(distractorTranslations.every((option) => /[\u4e00-\u9fff]/u.test(option.chineseMeaning))).toBe(true);
    expect(distractorTranslations.some((option) => /干扰项|释义：|noun|verb|adjective/u.test(option.chineseMeaning))).toBe(false);
  });

  it('keeps every current vocabulary option translation direct and non-meta', () => {
    const forbiddenOptionPatterns = [
      /表示一个名词概念/u,
      /表示一个动作/u,
      /大意为/u,
      /不匹配的干扰释义/u,
    ];
    const invalidOptions = CET4_VOCABULARY_BANK.flatMap((item) =>
      getVocabularyQuestionSupport(item).optionTranslations.map((option) => ({
        word: item.word,
        option,
      })),
    ).filter(({ option }) => (
      !/[\u4e00-\u9fff]/u.test(option.chineseMeaning)
      || forbiddenOptionPatterns.some((pattern) => pattern.test(option.chineseMeaning))
    ));

    expect(invalidOptions).toEqual([]);
  });

  it('keeps example sentence support available after vocabulary submission', () => {
    const item = CET4_VOCABULARY_BANK[0];
    const support = getVocabularySentenceSupport(item);

    expect(support.sourceText).toBe(item.example);
    expect(support.chineseMeaning).toBeTruthy();
    expect(support.chunks.length).toBeGreaterThanOrEqual(1);
    expect(support.chunks.every((chunk) => chunk.sourceText && chunk.chineseMeaning)).toBe(true);
  });

  it('uses core collocations inside natural example sentences with aligned chunks', () => {
    const afford = CET4_VOCABULARY_BANK.find((item) => item.word === 'afford');
    expect(afford).toBeTruthy();

    const support = getVocabularySentenceSupport(afford!);

    expect(support.sourceText).toBe(
      'With a scholarship, more learners can afford the cost of an online course.',
    );
    expect(support.chineseMeaning).toBe(
      '有了奖学金支持，更多学习者能够负担得起在线课程的费用。',
    );
    expect(support.sourceText).not.toContain('"afford the cost"');
    expect(support.chunks).toEqual([
      {
        sourceText: 'With a scholarship',
        chineseMeaning: '有了奖学金支持',
      },
      {
        sourceText: 'more learners can afford the cost',
        chineseMeaning: '更多学习者能够负担得起费用',
      },
      {
        sourceText: 'of an online course',
        chineseMeaning: '在线课程的',
      },
    ]);
  });

  it('keeps current vocabulary examples from quoting collocations as meta text', () => {
    const metaExamplePatterns = [
      /"[^"]+"/u,
      /where .+ appears in the sentence/u,
      /^The expression /u,
      /ask students to explain/u,
      /asks students to use .+ in a natural example/u,
      /when the Chinese sentence implies/u,
    ];

    const invalidExamples = CET4_VOCABULARY_BANK
      .map((item) => ({ word: item.word, example: item.example }))
      .filter(({ example }) => metaExamplePatterns.some((pattern) => pattern.test(example)));

    expect(invalidExamples).toEqual([]);
  });

  it('uses collocations as sentence content instead of generic word meanings', () => {
    const cases = [
      {
        word: 'annual',
        badExample: /helps learners annual report/i,
        expectedChinese: /年度报告/u,
      },
      {
        word: 'convenient',
        badExample: /can convenient service/i,
        expectedChinese: /便捷服务/u,
      },
      {
        word: 'ordinary',
        badExample: /helps learners ordinary people/i,
        expectedChinese: /普通人/u,
      },
    ];

    for (const testCase of cases) {
      const item = CET4_VOCABULARY_BANK.find((entry) => entry.word === testCase.word);
      expect(item).toBeTruthy();
      expect(item!.example).not.toMatch(testCase.badExample);
      expect(getVocabularySentenceSupport(item!).chineseMeaning).toMatch(testCase.expectedChinese);
    }

    const resolve = CET4_VOCABULARY_BANK.find((entry) => entry.word === 'resolve');
    expect(resolve).toBeTruthy();
    expect(getVocabularySentenceSupport(resolve!)).toMatchObject({
      sourceText: 'A realistic task lets learners resolve a conflict instead of guessing.',
      chineseMeaning: '真实任务能让学习者实际解决冲突，而不是靠猜。',
    });
  });

  it('shows the real Chinese meaning for the decline example sentence', () => {
    const decline = CET4_VOCABULARY_BANK.find((item) => item.word === 'decline');
    expect(decline).toBeTruthy();

    const support = getVocabularySentenceSupport(decline!);

    expect(support).toMatchObject({
      sourceText: 'Too many notifications may lead to a decline in attention.',
      chineseMeaning: '太多通知可能会导致注意力下降。',
    });
  });

  it('shows the real Chinese meaning for the economic development example sentence', () => {
    const economic = CET4_VOCABULARY_BANK.find((item) => item.word === 'economic');
    expect(economic).toBeTruthy();

    const support = getVocabularySentenceSupport(economic!);

    expect(support).toMatchObject({
      sourceText: 'Better public transport can support economic development in a region.',
      chineseMeaning: '更好的公共交通可以支持一个地区的经济发展。',
    });
  });

  it('keeps every current vocabulary example sentence meaning real and non-placeholder', () => {
    const forbiddenMeaningPatterns = [
      /暂缺/u,
      /请以英文原句/u,
      /重点理解/u,
      /这句话在语境中使用/u,
      /写作中比/u,
    ];
    const invalidItems = CET4_VOCABULARY_BANK.map((item) => ({
      word: item.word,
      example: item.example,
      support: getVocabularySentenceSupport(item),
    })).filter(({ support }) => (
      !/[\u4e00-\u9fff]/u.test(support.chineseMeaning)
      || forbiddenMeaningPatterns.some((pattern) => pattern.test(support.chineseMeaning))
    ));

    expect(invalidItems).toEqual([]);
  });

  it('keeps generated vocabulary examples varied and grounded in concrete situations', () => {
    const generatedItems = CET4_VOCABULARY_BANK.slice(100);
    const normalizedFrames = generatedItems.map((item) =>
      item.example
        .replace(/\b(?:a|an|the)\s+[a-z]+(?:\s+[a-z]+){0,3}\b/giu, '[phrase]')
        .replace(/\b(?:to|would|could|must)\s+[a-z]+(?:\s+[a-z]+){0,4}\b/giu, '[action]')
        .replace(/\s+/g, ' ')
        .trim(),
    );
    const frameCounts = normalizedFrames.reduce<Map<string, number>>((counts, frame) => {
      counts.set(frame, (counts.get(frame) ?? 0) + 1);
      return counts;
    }, new Map());
    const repeatedFrames = [...frameCounts.entries()].filter(([, count]) => count > 60);
    const weakExamples = generatedItems.filter((item) => [
      /learners can choose a better answer/i,
      /where .+ appears in the sentence/i,
      /gives learners a concrete way/i,
      /asks students to use/i,
      /The reading passage mentioned/i,
      /The example sentence placed/i,
      /In the practice task/i,
      /A teacher used a short example/i,
      /Students used the paragraph/i,
      /The report explains how people can/i,
      /The notice showed when people should/i,
      /The activity gave students a chance/i,
      /with a clear purpose/i,
      /in a realistic school situation/i,
      /in a realistic setting/i,
      /used .+ as supporting evidence/i,
      /needed to .* without delaying other work/i,
      /quickly and still check the result/i,
      /\b(?:a|an) (?:predict|publish|purchase|accelerate|address|calculate|circle|copy|repair|reserve|strengthen|suppose)\b/i,
    ].some((pattern) => pattern.test(item.example)));
    const invalidTranslations = generatedItems.filter((item) => {
      const chineseMeaning = getVocabularySentenceSupport(item).chineseMeaning;
      const allowed = chineseMeaning.replace(/\bAI\b/g, '');
      return /暂缺|请以英文原句/u.test(chineseMeaning) || /[A-Za-z]{2,}/u.test(allowed);
    });

    expect(repeatedFrames).toEqual([]);
    expect(weakExamples).toEqual([]);
    expect(invalidTranslations).toEqual([]);
  });

  it('keeps representative generated vocabulary examples natural and accurately translated', () => {
    const expectedExamples = [
      ['hesitate', 'Students should not hesitate to ask when they need help.', '学生需要帮助时不应犹豫提问。'],
      ['predict', 'Survey data can help researchers predict a trend.', '调查数据可以帮助研究者预测趋势。'],
      ['plant', 'Volunteers plant trees near the school every spring.', '志愿者每年春天在学校附近植树。'],
      ['strengthen', 'Spaced review can strengthen memory over several weeks.', '间隔复习可以在几周内强化记忆。'],
      ['perfect', 'A perfect score is possible only with careful preparation.', '只有认真准备，才可能取得满分。'],
      ['central', 'The teacher connected a central idea with a problem students had seen before.', '老师把中心思想和学生以前见过的问题联系起来。'],
    ] as const;

    for (const [word, example, chineseMeaning] of expectedExamples) {
      const item = CET4_VOCABULARY_BANK.find((entry) => entry.word === word);
      expect(item).toBeTruthy();
      expect(item!.example).toBe(example);
      expect(getVocabularySentenceSupport(item!).chineseMeaning).toBe(chineseMeaning);
    }
  });

  it('keeps output phrases natural, translated, and free of artificial templates', () => {
    const vocabularyCollocations = new Set(CET4_VOCABULARY_BANK.map((item) => item.collocation));
    const forbiddenExamples = [
      /^A clear .+ strategy helps learners choose the next task instead of reviewing blindly\.$/u,
      /^The platform records .+ evidence after each exercise so progress can be verified\.$/u,
      /^Students remember .+ context better when they meet the expression in a sentence\.$/u,
      /^A common .+ challenge is knowing the expression but failing to use it under time pressure\.$/u,
      /^.+ output turns recognition into writing, speaking, or translation ability\.$/u,
      /\baccurate accuracy\b/u,
    ];
    const invalidItems = CET4_OUTPUT_PHRASE_BANK.map((item) => ({
      word: item.word,
      example: item.example,
      support: getVocabularySentenceSupport(item),
    })).filter(({ word, example, support }) => (
      !vocabularyCollocations.has(word)
      || forbiddenExamples.some((pattern) => pattern.test(word) || pattern.test(example))
      || /暂缺|请以英文原句/u.test(support.chineseMeaning)
    ));

    expect(invalidItems).toEqual([]);
  });
});
