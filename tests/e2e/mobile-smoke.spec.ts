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

async function expectLocatorWithinViewport(page: Page, testId: string) {
  const box = await page.getByTestId(testId).boundingBox();
  const viewport = page.viewportSize();
  const visibleHeight = Math.min(
    box?.height ?? 0,
    Math.max(0, (viewport?.height ?? 0) - (box?.y ?? 0)),
  );

  expect(box).toBeTruthy();
  expect(viewport).toBeTruthy();
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.y).toBeLessThan((viewport?.height ?? 0));
  expect(visibleHeight).toBeGreaterThanOrEqual(120);
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

const universalDiagnosticTextAnswer =
  'With the development of online learning, more college students can arrange their study time flexibly. To reduce exam pressure, students should divide review tasks into several small steps. In my opinion, regular review and AI tools are useful because students can get feedback. For example, I often make grammar mistakes in English practice, so next time I will correct them carefully and explain my answer more naturally.';

async function clickDiagnosticOptions(page: Page, optionNames: RegExp[]) {
  let clicked = 0;
  for (const optionName of optionNames) {
    const options = page.getByRole('button', { name: optionName });
    const count = await options.count();
    for (let index = 0; index < count; index += 1) {
      await options.nth(index).click();
      clicked += 1;
    }
  }

  if (clicked === 0) {
    throw new Error(`Diagnostic option not found: ${optionNames.map(String).join(', ')}`);
  }
}

async function fillDiagnosticTextItems(page: Page) {
  const textareas = page.locator('textarea');
  const count = await textareas.count();
  for (let index = 0; index < count; index += 1) {
    await textareas.nth(index).fill(universalDiagnosticTextAnswer);
  }
}

async function answerMobileDiagnostic(page: Page) {
  await clickDiagnosticOptions(page, [
    /B\. They have become flexible learning hubs/,
    /B\. Closing the book, recalling key ideas, and checking missed points/,
    /C\. Keeping the main idea, one example, and one question/,
  ]);
  await clickDiagnosticOptions(page, [
    /C\. Join the online workshop and submit outlines before Friday/,
    /D\. Check his email and join the workshop online/,
    /B\. Meet at one thirty in the café near the gate/,
  ]);
  await clickDiagnosticOptions(page, [/A\. suitable/, /B\. accessible/, /C\. relevant/]);
  await clickDiagnosticOptions(page, [/C\. to review$/, /B\. reviewing$/, /A\. write$/]);
  await fillDiagnosticTextItems(page);
}

test('mobile viewport can reach the learning cockpit and launch disclosure', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await registerAndEnterApp(page, 'mobile-launch');

  await expect(page).toHaveTitle(/英语训练舱/);
  await expect(page.getByRole('heading', { name: '今日训练' })).toBeVisible();
  await expectMobilePrimaryNavReadable(page);
  await expect(page.getByText('服务器保存 · 原创模拟 · AI 可降级')).toBeVisible();
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
  await page.getByTestId('practice-module-quick-select-listening').click();
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
  await page.getByText('账号、备份与反馈', { exact: true }).click();
  await expect(page.getByRole('heading', { name: '账户' })).toBeVisible();
  await expect(page.getByText('同步与团队')).toBeVisible();
  await expect(page.getByRole('button', { name: '立即服务器对账' })).toBeVisible();
  await expect(page.getByRole('button', { name: '从服务器重建' })).toBeVisible();
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
  await expect(page.getByRole('button', { name: '播放男女声听力材料' }).first()).toBeVisible();
  await answerMobileDiagnostic(page);
  await expectNoHorizontalOverflow(page);

  await page.getByRole('button', { name: '提交诊断并生成基线' }).click();
  await expect(page.getByRole('heading', { name: '您的客观基线已生成' })).toBeVisible({ timeout: 7_000 });
  await expect(page.getByTestId('diagnostic-nonofficial-notice')).toContainText('非官方诊断');
  await expect(page.getByTestId('diagnostic-evidence-reading')).toContainText('证据');
  await expectNoHorizontalOverflow(page);
});

test('narrow phone uses listening feedback and translation workstations', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await registerAndEnterApp(page, 'mobile-listening');

  await page.getByRole('button', { name: '专项练习' }).click();
  await page.getByTestId('practice-module-quick-select-listening').click();
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
  await page.getByTestId('practice-module-quick-select-translation').click();
  await page.getByRole('button', { name: '开始翻译训练' }).click();
  await expect(page.getByRole('heading', { name: '段落翻译训练' })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test('narrow phone keeps vocabulary answer translations inside the viewport after submit', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await registerAndEnterApp(page, 'mobile-vocabulary-translation');

  await page.getByRole('button', { name: '专项练习' }).click();
  await page.getByRole('button', { name: '开始单词练习' }).click();
  await page.locator('article.ui-panel button').filter({ hasText: /^A\.|^B\.|^C\.|^D\./ }).first().click();
  await page.getByRole('button', { name: '有把握' }).click();
  await page.getByRole('button', { name: '提交词汇答案' }).click();
  await expect(page.getByTestId('vocabulary-question-translation')).toBeVisible();
  await expectLocatorWithinViewport(page, 'vocabulary-question-translation');
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
