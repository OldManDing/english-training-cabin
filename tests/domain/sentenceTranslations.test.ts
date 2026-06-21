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

  it('translates generated phrase vocabulary options without depending on a fixed answer letter', () => {
    const generated = CET4_OUTPUT_PHRASE_BANK.find((item) => item.word === 'accurate strategy');
    expect(generated).toBeTruthy();

    const support = getVocabularyQuestionSupport(generated!);
    const correctOption = support.optionTranslations.find((option) => option.isCorrect);
    const distractorOption = support.optionTranslations.find(
      (option) => option.sourceText === 'a random answer without evidence',
    );

    expect(correctOption?.sourceText).toBe(generated!.options[generated!.correctAnswer]);
    expect(correctOption?.chineseMeaning).toContain(generated!.meaning);
    expect(distractorOption?.sourceText).toBe('a random answer without evidence');
    expect(distractorOption?.isCorrect).toBe(false);
    expect(distractorOption?.chineseMeaning).toBeTruthy();
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
});
