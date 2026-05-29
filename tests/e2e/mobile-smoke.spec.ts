import { expect, test, type Page } from '@playwright/test';
import { registerAndEnterApp } from './helpers/auth';

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => ({
    body: document.body.scrollWidth - document.body.clientWidth,
    document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }));

  expect(overflow.body).toBeLessThanOrEqual(1);
  expect(overflow.document).toBeLessThanOrEqual(1);
}

async function expectMobilePrimaryNavReadable(page: Page) {
  const metrics = await page.locator('nav').first().evaluate((nav) => {
    const buttonWidths = Array.from(nav.querySelectorAll('button')).map((button) => button.getBoundingClientRect().width);
    return {
      clientWidth: nav.clientWidth,
      scrollWidth: nav.scrollWidth,
      minButtonWidth: Math.min(...buttonWidths),
    };
  });

  expect(metrics.minButtonWidth).toBeGreaterThanOrEqual(108);
  expect(metrics.scrollWidth).toBeGreaterThan(metrics.clientWidth);
}

async function answerMobileDiagnostic(page: Page) {
  await page.getByRole('button', { name: /B\. They have become flexible learning hubs/ }).click();
  await page.getByRole('button', { name: /C\. Join the online workshop/ }).click();
  await page.getByRole('button', { name: /A\. suitable/ }).click();
  await page.getByRole('button', { name: /C\. to review/ }).click();
  await page.getByLabel('翻译句法转换作答').fill(
    'With the development of online learning, more college students can arrange their study time more flexibly.',
  );
  await page.getByLabel('写作结构与论证作答').fill(
    'In my opinion, students can use AI tools wisely because they can receive quick feedback. For example, AI can point out grammar problems. However, students should revise the answer themselves.',
  );
  await page.getByLabel('口语连贯表达初筛作答').fill(
    'One habit that helps me learn English is reading aloud every morning. It works because I can practice pronunciation. For example, I repeat useful sentences, so I become more confident.',
  );
}

test('mobile viewport can reach the learning cockpit and launch disclosure', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await registerAndEnterApp(page, 'mobile-launch');

  await expect(page).toHaveTitle(/英语训练舱/);
  await expect(page.getByRole('heading', { name: '今日训练' })).toBeVisible();
  await expectMobilePrimaryNavReadable(page);
  await expect(page.getByText('本地保存 · 原创模拟 · AI 可降级')).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.getByRole('button', { name: '本地' }).click();
  await expect(page.getByRole('heading', { name: '隐私与本地数据说明' })).toBeVisible();
  await page.getByRole('button', { name: '我知道了' }).click();

  await page.getByRole('button', { name: '材料导入' }).click();
  await expect(page.getByRole('heading', { name: '材料导入与 AI 模拟卷生成' })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test('narrow phone reaches every primary workspace without horizontal clipping', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await registerAndEnterApp(page, 'mobile-workspaces');

  await page.getByRole('button', { name: '专项练习' }).click();
  await expect(page.getByRole('heading', { name: /专项练习/ })).toBeVisible();
  await expect(page.getByRole('button', { name: '开始单词练习' })).toBeVisible();
  await expect(page.getByRole('button', { name: '开始听力训练' })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.goto('/');
  await page.getByRole('button', { name: '复习队列' }).click();
  await expect(page.getByRole('heading', { name: '复习队列' })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.getByRole('button', { name: '口语重说' }).click();
  await expect(page.getByRole('heading', { name: /口语重说 - 准备开始/ })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.goto('/');
  await page.getByRole('button', { name: '能力进展' }).click();
  await expect(page.getByRole('heading', { name: '能力地图' })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.getByRole('button', { name: '设置' }).click();
  await expect(page.getByRole('heading', { name: '目标与计划设置' })).toBeVisible();
  await expect(page.getByText('云端账号与团队协作')).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test('narrow phone completes the responsive diagnostic layouts', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await registerAndEnterApp(page, 'mobile-diagnostic');

  await page.getByRole('button', { name: '入门能力诊断' }).click();
  await expect(page.getByRole('heading', { name: /入门诊断/ })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.getByRole('button', { name: '开始诊断' }).click();
  await expect(page.getByRole('heading', { name: '学习目标设置' })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.getByRole('button', { name: '进入真实诊断' }).click();
  await expect(page.getByRole('heading', { name: '真实小题诊断' })).toBeVisible();
  await expect(page.getByRole('button', { name: '播放听力材料' })).toBeVisible();
  await answerMobileDiagnostic(page);
  await expectNoHorizontalOverflow(page);

  await page.getByRole('button', { name: '提交诊断并生成画像' }).click();
  await expect(page.getByRole('heading', { name: '您的能力画像已生成' })).toBeVisible({ timeout: 7_000 });
  await expectNoHorizontalOverflow(page);
});

test('narrow phone uses listening feedback and translation workstations', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await registerAndEnterApp(page, 'mobile-listening');

  await page.getByRole('button', { name: '专项练习' }).click();
  await page.getByRole('button', { name: '开始听力训练' }).click();
  await expect(page.getByRole('heading', { name: /听力训练/ })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await page.getByRole('button', { name: /^A / }).click();
  await page.getByRole('button', { name: '低' }).click();
  await page.getByRole('button', { name: '提交答案' }).click();
  await expect(page.getByText(/正确答案|错误 -/).first()).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.goto('/');
  await page.getByRole('button', { name: '专项练习' }).click();
  await page.getByRole('button', { name: '开始翻译训练' }).click();
  await expect(page.getByRole('heading', { name: '段落翻译训练' })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test('narrow phone keeps the full speaking feedback flow usable', async ({ page }) => {
  await page.route('**/api/ai/analyze-speech', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        originalTextWithMarkings: 'In the picture, I can see renewable energy facilities.',
        improvedTextWithConnectors:
          'The picture shows renewable energy facilities, which can reduce pollution and support sustainable development.',
        fillerCount: 1,
        fluencyAnalysis: '减少填充词，先输出完整主题句。',
        logicAnalysis: '使用画面、观点和原因组织表达。',
        vocabularyAnalysis: '用 renewable energy 替换基础词。',
        scoreImprovementFrom: 58,
        scoreImprovementTo: 74,
      }),
    });
  });

  await page.setViewportSize({ width: 320, height: 740 });
  await registerAndEnterApp(page, 'mobile-speaking');
  await page.getByRole('button', { name: '口语重说' }).click();
  await expectNoHorizontalOverflow(page);
  await page.getByRole('button', { name: '开始录音' }).click();
  await expect(page.locator('textarea')).toBeVisible({ timeout: 7_000 });
  await page.locator('textarea').fill('In the picture, I can see renewable energy facilities and clean energy.');
  await page.getByRole('button', { name: '完成录音' }).click();
  await expect(page.getByRole('heading', { name: /AI 反馈与改写/ })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.getByRole('button', { name: '开始第二次重说' }).click();
  await page.locator('textarea').fill('The picture shows renewable energy facilities, which can reduce pollution.');
  await page.getByRole('button', { name: '完成第二次重说并生成对比报告' }).click();
  await expect(page.getByRole('heading', { name: /训练对比报告/ })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test('tablet layout keeps dashboard, settings, and reading training within viewport', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await registerAndEnterApp(page, 'tablet-layout');
  await expect(page.getByRole('heading', { name: '今日训练' })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.getByRole('button', { name: '设置' }).click();
  await expect(page.getByRole('heading', { name: '目标与计划设置' })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.getByRole('button', { name: '专项练习' }).click();
  await page.getByRole('button', { name: /开始仔细阅读训练/ }).first().click();
  await expect(page.getByText(/仔细阅读训练舱/)).toBeVisible();
  await expectNoHorizontalOverflow(page);
});
