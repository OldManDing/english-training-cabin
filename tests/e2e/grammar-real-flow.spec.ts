import { expect, test, type Page } from '@playwright/test';
import { CET4_GRAMMAR_PRACTICE_QUESTIONS, type Cet4MockChoiceQuestion } from '../../src/questionBank';
import { practiceDraftKeys } from '../../src/domain/practice/draftProgress';
import {
  getGrammarStructureTopicByFocus,
  orderGrammarStructureQuestions,
} from '../../src/domain/practice/grammarStructureGuides';
import { registerAndEnterApp } from './helpers/auth';

const grammarRealFlowNumbers = [1, 2, 21, 22, 23, 250];
const grammarTotal = CET4_GRAMMAR_PRACTICE_QUESTIONS.length;
const tenseGrammarQuestions = orderGrammarStructureQuestions(CET4_GRAMMAR_PRACTICE_QUESTIONS)
  .filter((question) => getGrammarStructureTopicByFocus(question.trapType).id === 'tense');

async function openGrammarQuestion(page: Page, questionNumber: number, filter: 'all' | 'answered' = 'all') {
  await page.getByTestId('practice-module-select-grammar').click();
  await page.getByTestId(`practice-question-filter-grammar-${filter}`).click();

  const statusButton = page.getByTestId(`practice-question-status-grammar-${questionNumber}`);
  if (questionNumber <= 120 && (await statusButton.count()) > 0) {
    await statusButton.click();
    return;
  }

  await page.getByTestId('practice-question-jump-input-grammar').fill(String(questionNumber));
  await page.getByTestId('practice-question-jump-submit-grammar').click();
}

async function expectGrammarQuestion(page: Page, questionNumber: number) {
  const question = CET4_GRAMMAR_PRACTICE_QUESTIONS[questionNumber - 1];
  await expect(page.getByText(question.prompt)).toBeVisible();
  await expect(page.getByText(`第 ${questionNumber} 题 / 共 ${grammarTotal} 题`)).toBeVisible();
}

async function submitCurrentGrammarQuestion(page: Page, questionNumber: number) {
  const question = CET4_GRAMMAR_PRACTICE_QUESTIONS[questionNumber - 1];
  await submitGrammarQuestion(page, question);
}

async function submitGrammarQuestion(page: Page, question: Cet4MockChoiceQuestion) {
  await page.getByRole('button', { name: new RegExp(`^${question.correctAnswer} `) }).click();
  await page.getByText('非常有把握').click();
  await expect(page.getByTestId('reading-submit')).toBeEnabled();
  await page.getByTestId('reading-submit').click();
  await expect(page.getByTestId('reading-post-answer-support')).toBeVisible();
  await expect(page.getByTestId('reading-next')).toBeVisible();
}

test('real grammar number flow answers several questions and reopens saved attempts', async ({ page }) => {
  test.setTimeout(180_000);

  await registerAndEnterApp(page, 'real-grammar-number-flow');
  await page.locator('aside button').nth(1).click();

  for (let index = 0; index < grammarRealFlowNumbers.length; index += 1) {
    const questionNumber = grammarRealFlowNumbers[index];

    await openGrammarQuestion(page, questionNumber);
    await expectGrammarQuestion(page, questionNumber);
    await submitCurrentGrammarQuestion(page, questionNumber);

    if (questionNumber === 21) {
      await page.getByTestId('reading-next').click();
      await expectGrammarQuestion(page, 22);
      await page.getByTestId('reading-back-to-practice').click();
    } else {
      await page.getByTestId('reading-back-to-practice').click();
    }

    await page.getByTestId('practice-module-select-grammar').click();
    await expect(page.getByTestId('practice-question-status-grammar')).toContainText(
      `已答 ${index + 1} / ${grammarTotal}`,
    );

    await openGrammarQuestion(page, questionNumber, 'answered');
    await expectGrammarQuestion(page, questionNumber);
    await expect(page.getByTestId('reading-attempt-replayed')).toBeVisible();
    await expect(page.getByTestId('reading-post-answer-support')).toBeVisible();
    await expect(page.getByTestId('reading-submit')).toHaveCount(0);
    await page.getByTestId('reading-back-to-practice').click();
  }
});

test('normal grammar practice shows batch numbering instead of source-bank numbering', async ({ page }) => {
  await registerAndEnterApp(page, 'real-grammar-normal-numbering');
  await page.locator('aside button').nth(1).click();

  await page.getByTestId('practice-module-action-grammar').click();
  await expect(page.getByText('第 1 题 / 共 40 题')).toBeVisible();
  await expect(page.getByTestId('reading-submit')).toBeVisible();
  await expect(page.getByTestId('reading-submit')).toBeDisabled();
});

test('grammar topic group practice stays inside the selected topic', async ({ page }) => {
  const [firstTenseQuestion, secondTenseQuestion] = tenseGrammarQuestions;
  expect(firstTenseQuestion).toBeTruthy();
  expect(secondTenseQuestion).toBeTruthy();

  await registerAndEnterApp(page, 'real-grammar-topic-group');
  await page.locator('aside button').nth(1).click();
  await page.getByTestId('practice-module-select-grammar').click();

  await expect(page.getByTestId('grammar-topic-practice')).toBeVisible();
  await expect(page.getByTestId('grammar-topic-card-tense')).toContainText(`${tenseGrammarQuestions.length} 题`);

  await page.getByTestId('grammar-topic-start-tense').click();
  await expect(page.getByText(firstTenseQuestion.prompt)).toBeVisible();
  await expect(page.getByText(`第 1 题 / 共 ${tenseGrammarQuestions.length} 题`)).toBeVisible();

  await submitGrammarQuestion(page, firstTenseQuestion);
  await page.getByTestId('reading-next').click();

  await expect(page.getByText(secondTenseQuestion.prompt)).toBeVisible();
  await expect(page.getByText(`第 2 题 / 共 ${tenseGrammarQuestions.length} 题`)).toBeVisible();
  await expect(page.getByTestId('reading-submit')).toBeVisible();
  await expect(page.getByTestId('reading-submit')).toBeDisabled();
});

test('grammar number jump keeps compact top progress and next question unanswered', async ({ page }) => {
  await registerAndEnterApp(page, 'real-grammar-next-unanswered');

  await page.evaluate(
    ({ draftKey, staleQuestionId }) => {
      const now = new Date().toISOString();
      const answers = Array.from({ length: 22 }, () => null);
      answers[21] = {
        selected: 'A',
        correct: true,
        confidence: 'sure',
        questionId: staleQuestionId,
        moduleId: 'grammar',
        questionTypeId: 'grammar-structure',
      };
      localStorage.setItem(draftKey, JSON.stringify({
        version: 1,
        passageId: 'cet4-grammar-structure-practice',
        startedAt: now,
        currentIdx: 21,
        selectedOpt: 'A',
        confidence: 'sure',
        isSubmitted: true,
        answers,
        updatedAt: now,
      }));
    },
    {
      draftKey: practiceDraftKeys.reading('cet4-grammar-structure-practice'),
      staleQuestionId: CET4_GRAMMAR_PRACTICE_QUESTIONS[0].id,
    },
  );

  await page.locator('aside button').nth(1).click();
  await openGrammarQuestion(page, 21);
  await expectGrammarQuestion(page, 21);
  await expect(page.getByTestId('reading-progress-summary')).toContainText(`21/${grammarTotal}`);
  expect(await page.getByTestId('reading-progress-marker').count()).toBeLessThanOrEqual(15);

  await submitCurrentGrammarQuestion(page, 21);
  await page.getByTestId('reading-next').click();

  await expectGrammarQuestion(page, 22);
  await expect(page.getByTestId('reading-submit')).toBeVisible();
  await expect(page.getByTestId('reading-submit')).toBeDisabled();
  await expect(page.getByTestId('reading-post-answer-support')).toHaveCount(0);
  await expect(page.getByTestId('reading-attempt-replayed')).toHaveCount(0);
});

test('grammar restored header keeps title, badge, and progress on one clean row', async ({ page }) => {
  await registerAndEnterApp(page, 'real-grammar-restored-header');

  const subsetQuestions = orderGrammarStructureQuestions(CET4_GRAMMAR_PRACTICE_QUESTIONS)
    .filter((question) => getGrammarStructureTopicByFocus(question.trapType).id === 'tense');
  const restoredQuestion = subsetQuestions[11];
  expect(restoredQuestion).toBeTruthy();

  await page.evaluate(
    ({ draftKey, questionId, total }) => {
      const now = new Date().toISOString();
      const answers = Array.from({ length: total }, () => null);
      localStorage.setItem(draftKey, JSON.stringify({
        version: 1,
        passageId: 'cet4-grammar-structure-practice-tense',
        startedAt: now,
        currentIdx: 11,
        selectedOpt: null,
        confidence: null,
        isSubmitted: false,
        answers,
        updatedAt: now,
        questionId,
      }));
    },
    {
      draftKey: practiceDraftKeys.reading('cet4-grammar-structure-practice-tense'),
      questionId: restoredQuestion.id,
      total: subsetQuestions.length,
    },
  );

  await page.locator('aside button').nth(1).click();
  await page.getByTestId('practice-module-select-grammar').click();
  await page.getByTestId('grammar-topic-start-tense').click();

  const title = page.getByText('语法结构').first();
  const restored = page.getByTestId('reading-draft-restored');
  const summary = page.getByTestId('reading-progress-summary');

  await expect(restored).toHaveText('已恢复第 12 题');
  await expect(summary).toContainText(`12/${subsetQuestions.length}`);
  expect(await page.getByTestId('reading-progress-marker').count()).toBeLessThanOrEqual(9);

  const titleBox = await title.boundingBox();
  const restoredBox = await restored.boundingBox();
  const summaryBox = await summary.boundingBox();

  expect(titleBox?.height ?? 999).toBeLessThanOrEqual(24);
  expect(restoredBox?.height ?? 999).toBeLessThanOrEqual(32);
  expect(summaryBox?.height ?? 999).toBeLessThanOrEqual(32);
  expect((restoredBox?.x ?? 0) + (restoredBox?.width ?? 0)).toBeLessThan(summaryBox?.x ?? 0);
});

test('grammar practice uses a compact task-first layout on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await registerAndEnterApp(page, 'real-grammar-mobile-layout');
  await page.locator('aside button').nth(1).click();

  await page.getByTestId('practice-module-action-grammar').click();

  await expect(page.getByText('考点：时态 / 现在完成时')).toBeVisible();
  await expect(page.getByTestId('reading-question-text')).toContainText(
    'Her listening ability ___ a lot since she started daily practice.',
  );
  await expect(page.getByTestId('reading-submit')).toBeVisible();
  await expect(page.getByTestId('reading-submit')).toHaveText('提交');

  const questionBox = await page.getByTestId('reading-question-text').boundingBox();
  const submitBox = await page.getByTestId('reading-submit').boundingBox();
  expect(questionBox?.y ?? 9999).toBeLessThan(360);
  expect(submitBox?.y ?? 9999).toBeLessThan(844);
});

test('grammar answer feedback is rule based and hides internal trap slugs', async ({ page }) => {
  await registerAndEnterApp(page, 'real-grammar-rule-feedback');
  await page.locator('aside button').nth(1).click();
  await openGrammarQuestion(page, 250);

  await expect(page.getByText('考点：状语从句 / although 引导')).toBeVisible();
  await expect(page.getByText(/although-clause/)).toHaveCount(0);
  await expect(page.getByText(/scholarship support/)).toHaveCount(0);

  await page.getByRole('button', { name: /^D / }).click();
  await page.getByTestId('reading-submit').click();

  const support = page.getByTestId('reading-post-answer-support');
  const analysisCard = page.getByTestId('reading-grammar-analysis-card');
  await expect(analysisCard.getByText('规则解析')).toBeVisible();
  await expect(analysisCard.getByText('正确句')).toBeVisible();
  await expect(page.getByText(/Although the scholarship briefing was short/)).toBeVisible();
  await expect(page.getByText(/定位失准|反向同义替换|段落/)).toHaveCount(0);
  await expect(page.getByText(/scholarship support/)).toHaveCount(0);
  await expect(page.getByTestId('reading-next')).toBeVisible();
});

test('grammar feedback actions stay in document flow without covering analysis', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await registerAndEnterApp(page, 'real-grammar-no-floating-cover');
  await page.locator('aside button').nth(1).click();

  await page.getByTestId('practice-module-action-grammar').click();
  await page.getByRole('button', { name: /^A / }).click();
  await page.getByTestId('reading-submit').click();

  const support = page.getByTestId('reading-post-answer-support');
  const next = page.getByTestId('reading-next');
  await expect(support).toBeVisible();
  await expect(next).toBeVisible();

  const fixedElements = await page.locator('body *').evaluateAll((elements) =>
    elements.filter((element) => getComputedStyle(element).position === 'fixed').length,
  );
  expect(fixedElements).toBe(0);

  const supportBox = await page.getByTestId('reading-grammar-analysis-card').boundingBox();
  const nextBox = await next.boundingBox();
  expect((nextBox?.y ?? 0) - ((supportBox?.y ?? 0) + (supportBox?.height ?? 0))).toBeGreaterThanOrEqual(8);
});
