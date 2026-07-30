import { expect, test, type Page } from '@playwright/test';
import { CET4_MOCK_EXAM } from '../../src/questionBank';
import { registerAndEnterApp } from './helpers/auth';

const WRITING_DRAFT_KEY = 'english-training-cabin:practice-draft:subjective:writing';
const WRITING_ANSWER =
  'University students can improve their study plans by setting clear goals, reviewing evidence, and adjusting their methods every week.';
const WRITING_FEEDBACK = '结构清楚，论点与学习计划直接相关。';
const MOCK_DRAFT_KEY = 'english-training-cabin:practice-draft:mock-exam';
const MOCK_WRITING_ANSWER =
  'Consistent English practice helps students discover weaknesses and improve steadily. A useful plan should include clear goals, active recall, weekly review, and specific feedback. Students can then adjust their methods based on evidence instead of repeating ineffective routines. For example, a learner can write a short summary after class, compare it with the original material, record recurring errors, and review those errors several days later. This routine connects vocabulary, grammar, reading, and writing instead of treating them as isolated tasks. It also gives teachers concrete evidence for targeted guidance. This process makes progress visible, reduces dependence on last-minute memorization, and prepares learners for the CET-4 examination with greater confidence and control. In the long term, steady practice is more reliable than occasional intensive study because it turns knowledge into usable language ability.';
const MOCK_TRANSLATION_ANSWER =
  'Digital learning tools should help students identify mistakes, recall knowledge actively, review weak points at the right time, and adjust their study plans through clear evidence and regular reflection.';

async function installIndexedDbWriteFailureSwitch(page: Page) {
  await page.addInitScript(() => {
    const originalPut = IDBObjectStore.prototype.put;
    (window as typeof window & { __failPracticeSessionWrites?: boolean }).__failPracticeSessionWrites = false;
    IDBObjectStore.prototype.put = function (...args: Parameters<IDBObjectStore['put']>) {
      const shouldFail = (window as typeof window & { __failPracticeSessionWrites?: boolean })
        .__failPracticeSessionWrites;
      if (shouldFail && this.name === 'practiceSessions') {
        throw new DOMException('Injected practice session write failure', 'AbortError');
      }
      return originalPut.apply(this, args);
    };
  });
}

async function setPracticeSessionWriteFailure(page: Page, shouldFail: boolean) {
  await page.evaluate((nextValue) => {
    (window as typeof window & { __failPracticeSessionWrites?: boolean }).__failPracticeSessionWrites = nextValue;
  }, shouldFail);
}

test('subjective completion failure preserves answer and AI feedback until persistence succeeds', async ({ page }) => {
  await installIndexedDbWriteFailureSwitch(page);
  await page.route('**/api/ai/evaluate-subjective', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        score: 77,
        mistakeReasons: ['例证仍可更具体'],
        comments: [WRITING_FEEDBACK],
        nextActions: ['补充一个可验证的课堂学习例子。'],
        sampleAnswer: WRITING_ANSWER,
        confidence: 'high',
      }),
    });
  });

  await registerAndEnterApp(page, 'subjective-write-failure');
  await page.getByRole('button', { name: '专项练习', exact: true }).click();
  await page.getByRole('button', { name: '开始写作训练' }).click();
  await page.locator('textarea').fill(WRITING_ANSWER);
  await page.getByRole('button', { name: '提交并获取 AI 反馈' }).click();
  await expect(page.getByText(WRITING_FEEDBACK)).toBeVisible();

  await expect.poll(async () => page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const draft = JSON.parse(raw) as { answer?: string; analysis?: { score?: number } };
    return { answer: draft.answer, score: draft.analysis?.score };
  }, WRITING_DRAFT_KEY)).toEqual({ answer: WRITING_ANSWER, score: 77 });
  await expect(page.getByText('学习记录与草稿已保存到服务器')).toBeVisible({ timeout: 10_000 });

  await setPracticeSessionWriteFailure(page, true);
  await page.getByRole('button', { name: '完成训练并写入能力画像' }).click();
  await expect(page.getByRole('heading', { name: '主观题记录保存失败' })).toBeVisible();
  await expect(page.getByText(WRITING_FEEDBACK)).toBeVisible();
  await expect.poll(async () => page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const draft = JSON.parse(raw) as { answer?: string; analysis?: { score?: number } };
    return { answer: draft.answer, score: draft.analysis?.score };
  }, WRITING_DRAFT_KEY)).toEqual({ answer: WRITING_ANSWER, score: 77 });

  await page.getByRole('button', { name: '我知道了' }).click();
  await page.evaluate((key) => localStorage.removeItem(key), WRITING_DRAFT_KEY);
  await page.reload();
  await expect(page.getByRole('heading', { name: '今日训练' })).toBeVisible();
  await page.getByRole('button', { name: '专项练习', exact: true }).click();
  await page.getByRole('button', { name: '开始写作训练' }).click();
  await expect(page.getByText('已恢复上次草稿')).toBeVisible();
  await expect(page.locator('textarea')).toHaveValue(WRITING_ANSWER);
  await expect(page.getByText(WRITING_FEEDBACK)).toBeVisible();

  await page.getByRole('button', { name: '完成训练并写入能力画像' }).click();
  await expect(page.getByRole('heading', { name: '能力地图' })).toBeVisible();
  await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), WRITING_DRAFT_KEY)).toBeNull();
});

test('mock exam persistence failure keeps the completed report and draft available for retry', async ({ page }) => {
  test.setTimeout(90_000);
  await installIndexedDbWriteFailureSwitch(page);
  await registerAndEnterApp(page, 'mock-write-failure');

  await page.getByRole('button', { name: '阶段模考', exact: true }).click();
  await page.getByTestId('mock-writing-answer').fill(MOCK_WRITING_ANSWER);
  await page.getByTestId('mock-section-listening').click();
  for (const question of CET4_MOCK_EXAM.listening.questions) {
    await page.getByTestId(`mock-choice-${question.id}-${question.correctAnswer}`).click();
  }
  await page.getByTestId('mock-section-reading').click();
  for (const question of CET4_MOCK_EXAM.reading.questions) {
    await page.getByTestId(`mock-choice-${question.id}-${question.correctAnswer}`).click();
  }
  await page.getByTestId('mock-section-translation').click();
  await page.getByTestId('mock-translation-answer').fill(MOCK_TRANSLATION_ANSWER);
  await page.getByTestId('mock-section-review').click();
  await page.getByTestId('mock-exam-submit').click();
  await expect(page.getByTestId('mock-exam-result')).toBeVisible();

  await setPracticeSessionWriteFailure(page, true);
  await page.getByTestId('mock-exam-persist').click();
  await expect(page.getByRole('heading', { name: '阶段模考保存失败' })).toBeVisible();
  await expect(page.getByTestId('mock-exam-result')).toBeVisible();
  await expect.poll(async () => page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const draft = JSON.parse(raw) as { writingAnswer?: string; translationAnswer?: string; choices?: Record<string, string> };
    return {
      writingAnswer: draft.writingAnswer,
      translationAnswer: draft.translationAnswer,
      choiceCount: Object.keys(draft.choices ?? {}).length,
    };
  }, MOCK_DRAFT_KEY)).toEqual({
    writingAnswer: MOCK_WRITING_ANSWER,
    translationAnswer: MOCK_TRANSLATION_ANSWER,
    choiceCount: CET4_MOCK_EXAM.listening.questions.length + CET4_MOCK_EXAM.reading.questions.length,
  });

  await page.getByRole('button', { name: '我知道了' }).click();
  await setPracticeSessionWriteFailure(page, false);
  await page.getByTestId('mock-exam-persist').click();
  await expect(page.getByRole('heading', { name: '能力地图' })).toBeVisible();
  await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), MOCK_DRAFT_KEY)).toBeNull();
});
