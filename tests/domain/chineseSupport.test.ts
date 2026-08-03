import { describe, expect, it } from 'vitest';
import { CET4_LISTENING_PRACTICE_QUESTIONS, CET4_READING_BANK } from '../../src/questionBank';
import { getListeningChineseSupport, getReadingChineseSupport } from '../../src/domain/practice/chineseSupport';

describe('practice question Chinese support', () => {
  it('translates non-hardcoded reading stems into actual Chinese questions', () => {
    const passage = CET4_READING_BANK.find((item) => item.id === 'cet-green-tech');
    const question = passage?.questions.find(
      (item) => item.question === 'What benefit of green technology is mentioned in the first paragraph?',
    );

    expect(question).toBeTruthy();
    expect(getReadingChineseSupport(passage!.id, question!)).toMatchObject({
      question: '第一段提到了绿色技术的什么好处？',
    });
  });

  it('translates generated reading-topic stems instead of falling back to analysis copy', () => {
    const target = CET4_READING_BANK.flatMap((passage) =>
      passage.questions.map((question) => ({ passageId: passage.id, question })),
    ).find(
      (item) =>
        item.passageId === 'cet-scale-campus-library-practice'
        && item.question.question === 'What positive effect is mentioned in the first paragraph?',
    );

    expect(target).toBeTruthy();
    expect(getReadingChineseSupport(target!.passageId, target!.question)).toMatchObject({
      question: '第一段提到了什么积极作用？',
    });
  });

  it('translates listening stems into actual Chinese questions', () => {
    const question = CET4_LISTENING_PRACTICE_QUESTIONS.find(
      (item) => item.prompt === 'What service does the new campus learning center provide?',
    );

    expect(question).toBeTruthy();
    expect(
      getListeningChineseSupport({
        prompt: question!.prompt,
        options: question!.options,
      }),
    ).toMatchObject({
      question: '新校园学习中心提供什么服务？',
    });
  });

  it('translates generated listening-topic stems instead of showing generic post-answer hints', () => {
    const question = CET4_LISTENING_PRACTICE_QUESTIONS.find(
      (item) => item.prompt === 'What benefit of environmental awareness is mentioned?',
    );

    expect(question).toBeTruthy();
    expect(
      getListeningChineseSupport({
        prompt: question!.prompt,
        options: question!.options,
      }),
    ).toMatchObject({
      question: '文中提到了“环保意识”的什么好处？',
    });
  });

  it('keeps current reading bank stems out of fallback analysis copy', () => {
    const fallbackQuestions = CET4_READING_BANK.flatMap((passage) =>
      passage.questions
        .map((question) => ({
          passageId: passage.id,
          question: question.question,
          support: getReadingChineseSupport(passage.id, question)?.question ?? '',
        }))
        .filter(({ support }) => support.includes('正确答案和定位解析提交后显示')),
    );

    expect(fallbackQuestions).toEqual([]);
  });

  it('keeps current listening bank stems out of generic answer-hint copy', () => {
    const fallbackQuestions = CET4_LISTENING_PRACTICE_QUESTIONS.map((question) => ({
      prompt: question.prompt,
      support:
        getListeningChineseSupport({
          prompt: question.prompt,
          options: question.options,
        })?.question ?? '',
    })).filter(({ support }) => support.includes('正确答案和听力原句译文提交后显示'));

    expect(fallbackQuestions).toEqual([]);
  });
});
