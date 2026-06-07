import { expect, test, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { registerAndEnterApp } from './helpers/auth';

type ButtonDescriptor = {
  auditIndex: number;
  name: string;
  disabled: boolean;
};

type ClickRecord = {
  screen: string;
  button: string;
};

type BrowserIssue = {
  source: string;
  message: string;
};

const REPORT_PATH = 'test-results/full-button-click-audit.json';

const longTextAnswer =
  'With the development of online learning, more college students can arrange their study time flexibly. To reduce exam pressure, students should divide review tasks into several small steps. In my opinion, regular review and AI tools are useful because students can get feedback. For example, I often make grammar mistakes in English practice, so next time I will correct them carefully and explain my answer more naturally.';

function createSilentWavBuffer() {
  const sampleRate = 8_000;
  const durationSeconds = 0.12;
  const sampleCount = Math.floor(sampleRate * durationSeconds);
  const dataSize = sampleCount * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  return buffer;
}

const sampleImportJson = JSON.stringify(
  {
    title: 'Urban Green Spaces',
    content:
      'Many cities are creating small parks near schools and offices. Researchers have found that short exposure to natural environments may reduce stress and improve concentration. These spaces also give residents a place to communicate and exercise.',
    questions: [
      {
        id: 1,
        question: 'What benefit is mentioned in the passage?',
        options: {
          A: 'They remove exams.',
          B: 'They may reduce stress.',
          C: 'They replace schools.',
          D: 'They guarantee high scores.',
        },
        correctAnswer: 'B',
        explanation: 'The passage says green spaces may reduce stress.',
        type: 'detail',
        correctSentence: 'Researchers have found that short exposure to natural environments may reduce stress and improve concentration.',
      },
    ],
  },
  null,
  2,
);

async function installBrowserMocks(page: Page) {
  await page.route('**/api/practice/tts', async (route) => {
    await route.fulfill({
      contentType: 'audio/wav',
      body: createSilentWavBuffer(),
    });
  });

  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async () => undefined,
      },
    });

    const calls: string[] = [];
    (window as any).__speechSynthesisCalls = calls;
    (window as any).SpeechSynthesisUtterance = function MockSpeechSynthesisUtterance(this: any, text: string) {
      this.text = text;
      this.lang = '';
      this.rate = 1;
      this.onend = null;
      this.onerror = null;
    };
    let endTimer: number | undefined;
    let activeUtterance: any = null;
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: {
        speaking: false,
        paused: false,
        cancel() {
          if (endTimer) window.clearTimeout(endTimer);
          endTimer = undefined;
          activeUtterance = null;
          this.speaking = false;
          this.paused = false;
        },
        pause() {
          if (!this.speaking) return;
          this.speaking = false;
          this.paused = true;
        },
        resume() {
          if (!this.paused) return;
          this.speaking = true;
          this.paused = false;
        },
        getVoices() {
          return [];
        },
        speak(utterance: any) {
          calls.push(String(utterance.text ?? ''));
          activeUtterance = utterance;
          this.speaking = true;
          this.paused = false;
          endTimer = window.setTimeout(() => {
            if (this.paused || activeUtterance !== utterance) return;
            this.speaking = false;
            activeUtterance = null;
            utterance.onend?.(new Event('end'));
          }, 5_000);
        },
      },
    });
  });

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

  await page.route('**/api/ai/evaluate-subjective', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        score: 82,
        mistakeReasons: ['结构完整', '表达可优化'],
        comments: ['观点明确，例子可以更具体。', '注意连接词和句式变化。'],
        nextActions: ['复述一遍参考表达。', '把核心句加入复习队列。'],
        sampleAnswer:
          'Online learning can help students review more flexibly. However, students should set clear goals and check their progress regularly.',
      }),
    });
  });

  await page.route('**/api/ai/generate-passage', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: sampleImportJson,
    });
  });
}

function installIssueCollectors(page: Page, issues: BrowserIssue[]) {
  page.on('console', (message) => {
    if (message.type() === 'error') {
      issues.push({ source: 'console', message: message.text() });
    }
  });
  page.on('pageerror', (error) => {
    issues.push({ source: 'pageerror', message: error.message });
  });
  page.on('response', (response) => {
    if (response.status() >= 500) {
      issues.push({ source: 'response', message: `${response.status()} ${response.url()}` });
    }
  });
}

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => ({
    body: document.body.scrollWidth - document.body.clientWidth,
    document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }));

  expect(overflow.body).toBeLessThanOrEqual(1);
  expect(overflow.document).toBeLessThanOrEqual(1);
}

async function assertBrowserHealthy(page: Page, issues: BrowserIssue[]) {
  await expect(page.locator('body')).toBeVisible();
  await expectNoHorizontalOverflow(page);
  expect(issues).toEqual([]);
}

async function tagVisibleButtons(page: Page, scopeSelector = 'main'): Promise<ButtonDescriptor[]> {
  return page.evaluate((selector) => {
    const scope = document.querySelector(selector) ?? document.body;
    const isVisible = (element: HTMLElement) => {
      if (element.hidden || element.getAttribute('aria-hidden') === 'true') return false;
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
    };

    return Array.from(scope.querySelectorAll('button'))
      .filter((button): button is HTMLButtonElement => isVisible(button))
      .map((button, index) => {
        button.dataset.auditButtonIndex = String(index);
        const name =
          button.getAttribute('aria-label')?.trim() ||
          button.textContent?.replace(/\s+/g, ' ').trim() ||
          `button-${index}`;
        return {
          auditIndex: index,
          name,
          disabled: button.disabled || button.getAttribute('aria-disabled') === 'true',
        };
      });
  }, scopeSelector);
}

async function closeTransientUi(page: Page) {
  const closeButtons = [
    page.getByRole('button', { name: '关闭提示' }),
    page.getByRole('button', { name: '我知道了' }),
    page.getByRole('button', { name: '回到今日计划' }),
  ];

  for (const button of closeButtons) {
    if ((await button.count()) > 0 && (await button.first().isVisible().catch(() => false))) {
      await button.first().click();
      await page.waitForTimeout(100);
    }
  }
}

async function clickTaggedButton(page: Page, descriptor: ButtonDescriptor, scopeSelector = 'main') {
  const clickByAuditIndex = async (auditIndex: number) => {
    const target = page.locator(`[data-audit-button-index="${auditIndex}"]`).first();
    if (!(await target.isVisible({ timeout: 2_000 }).catch(() => false))) {
      return false;
    }

    await target.click({ timeout: 5_000 });
    await page.waitForTimeout(150);
    return true;
  };

  try {
    return await clickByAuditIndex(descriptor.auditIndex);
  } catch (error) {
    const message = String(error);
    if (!/detached|Timeout/i.test(message)) throw error;
  }

  // React state updates can replace a just-tagged button before Playwright clicks it.
  // Re-tag the current DOM and retry by accessible name so the crawl keeps auditing behavior.
  await page.waitForTimeout(300);
  const refreshedButtons = await tagVisibleButtons(page, scopeSelector);
  const replacement =
    refreshedButtons.find((button) => button.name === descriptor.name && !button.disabled)
    ?? refreshedButtons[descriptor.auditIndex];
  if (!replacement || replacement.disabled) return false;
  return clickByAuditIndex(replacement.auditIndex);
}

async function auditVisibleButtonsForState(
  page: Page,
  screen: string,
  setup: () => Promise<void>,
  records: ClickRecord[],
  issues: BrowserIssue[],
  options: {
    scope?: string;
    skip?: RegExp;
  } = {},
) {
  await setup();
  const initialButtons = await tagVisibleButtons(page, options.scope ?? 'main');
  const candidates = initialButtons.filter((button) => !button.disabled && !options.skip?.test(button.name));

  for (const candidate of candidates) {
    await setup();
    const currentButtons = await tagVisibleButtons(page, options.scope ?? 'main');
    const descriptor = currentButtons[candidate.auditIndex];
    if (!descriptor || descriptor.disabled || options.skip?.test(descriptor.name)) continue;

    const clicked = await clickTaggedButton(page, descriptor, options.scope ?? 'main');
    if (!clicked) continue;

    records.push({ screen, button: descriptor.name });
    await closeTransientUi(page);
    await assertBrowserHealthy(page, issues);
  }
}

async function goHome(page: Page) {
  await page.goto('/');
  const loginHeading = page.getByRole('heading', { name: '登录' });
  if (await loginHeading.isVisible({ timeout: 1_000 }).catch(() => false)) {
    await registerAndEnterApp(page, `full-button-audit-reentry-${Date.now()}`);
  }
  await expect(page.getByRole('heading', { name: '今日训练' })).toBeVisible();
}

async function goTab(page: Page, buttonName: string, heading: string | RegExp) {
  await goHome(page);
  await page.getByRole('button', { name: buttonName, exact: true }).click();
  await expect(page.getByRole('heading', { name: heading })).toBeVisible();
}

async function selectFirstObjectiveAnswer(page: Page) {
  const option = page.getByRole('button', { name: /^A / }).first();
  if ((await option.count()) > 0 && await option.isEnabled().catch(() => false)) {
    await option.click();
  }
  const confidence = page.getByText('非常有把握').first();
  if ((await confidence.count()) > 0 && await confidence.isVisible().catch(() => false)) {
    await confidence.click();
    return;
  }

  const fallbackConfidence = page.getByRole('button', { name: /高|低/ }).first();
  if ((await fallbackConfidence.count()) > 0 && await fallbackConfidence.isEnabled().catch(() => false)) {
    await fallbackConfidence.click();
  }
}

async function answerDiagnostic(page: Page) {
  const groups = [
    /B\. They have become flexible learning hubs/,
    /B\. Closing the book, recalling key ideas, and checking missed points/,
    /C\. Keeping the main idea, one example, and one question/,
    /C\. Join the online workshop and submit outlines before Friday/,
    /D\. Check his email and join the workshop online/,
    /B\. Meet at one thirty in the café near the gate/,
    /A\. suitable/,
    /B\. accessible/,
    /C\. relevant/,
    /C\. to review$/,
    /B\. reviewing$/,
    /A\. write$/,
  ];

  for (const pattern of groups) {
    const matches = page.getByRole('button', { name: pattern });
    const count = await matches.count();
    for (let index = 0; index < count; index += 1) {
      await matches.nth(index).click();
    }
  }

  const textareas = page.locator('textarea');
  const textareaCount = await textareas.count();
  for (let index = 0; index < textareaCount; index += 1) {
    await textareas.nth(index).fill(longTextAnswer);
  }
}

test('real browser clicks visible buttons across primary states', async ({ page }) => {
  test.skip(
    process.env.FULL_BUTTON_AUDIT !== 'true',
    'Run with FULL_BUTTON_AUDIT=true for the exhaustive real-browser button crawl.',
  );
  test.setTimeout(720_000);
  const records: ClickRecord[] = [];
  const issues: BrowserIssue[] = [];
  installIssueCollectors(page, issues);
  await installBrowserMocks(page);

  await page.goto('/');
  await auditVisibleButtonsForState(
    page,
    'auth-login',
    async () => {
      await page.goto('/');
      await expect(page.getByRole('heading', { name: '登录' })).toBeVisible();
    },
    records,
    issues,
    { scope: 'body', skip: /登录$/ },
  );

  await registerAndEnterApp(page, 'full-button-audit');

  await auditVisibleButtonsForState(
    page,
    'primary-navigation',
    async () => {
      await goHome(page);
    },
    records,
    issues,
    { scope: 'aside', skip: /退出/ },
  );

  await auditVisibleButtonsForState(
    page,
    'today-dashboard',
    async () => {
      await goHome(page);
    },
    records,
    issues,
    { skip: /进入$|开始|入门能力诊断/ },
  );

  await auditVisibleButtonsForState(
    page,
    'settings',
    async () => {
      await goTab(page, '设置', '目标与计划设置');
    },
    records,
    issues,
    { skip: /退出|恢复学习数据/ },
  );

  await auditVisibleButtonsForState(
    page,
    'settings-operations-expanded',
    async () => {
      await goTab(page, '设置', '目标与计划设置');
      await page.getByTestId('saas-ops-toggle').click();
      await page.getByTestId('saas-invite-email').fill(`audit-${Date.now()}@example.com`);
      await page.getByTestId('saas-content-title').fill(`按钮审计内容 ${Date.now()}`);
    },
    records,
    issues,
    { skip: /退出|撤销/ },
  );

  await auditVisibleButtonsForState(
    page,
    'practice-hub',
    async () => {
      await goTab(page, '专项练习', /专项练习/);
    },
    records,
    issues,
    { skip: /入门诊断|进入|开始/ },
  );

  await auditVisibleButtonsForState(
    page,
    'reading-training-question',
    async () => {
      await goTab(page, '专项练习', /专项练习/);
      await page.getByRole('button', { name: /开始仔细阅读训练/ }).first().click();
      await expect(page.getByRole('button', { name: '返回专项练习' })).toBeVisible();
    },
    records,
    issues,
  );

  await auditVisibleButtonsForState(
    page,
    'reading-training-feedback',
    async () => {
      await goTab(page, '专项练习', /专项练习/);
      await page.getByRole('button', { name: /开始仔细阅读训练/ }).first().click();
      await selectFirstObjectiveAnswer(page);
      const submitButton = page.getByRole('button', { name: /提交/ }).first();
      if ((await submitButton.count()) > 0 && await submitButton.isEnabled().catch(() => false)) {
        await submitButton.click();
      }
    },
    records,
    issues,
  );

  await auditVisibleButtonsForState(
    page,
    'listening-training',
    async () => {
      await goTab(page, '专项练习', /专项练习/);
      await page.getByRole('button', { name: /开始听力训练/ }).click();
      await expect(page.getByRole('button', { name: '返回专项练习' })).toBeVisible();
    },
    records,
    issues,
  );

  await auditVisibleButtonsForState(
    page,
    'vocabulary-training',
    async () => {
      await goTab(page, '专项练习', /专项练习/);
      await page.getByRole('button', { name: /开始单词练习/ }).click();
      await expect(page.getByRole('button', { name: '返回专项练习' })).toBeVisible();
    },
    records,
    issues,
  );

  await auditVisibleButtonsForState(
    page,
    'writing-training-ready',
    async () => {
      await goTab(page, '专项练习', /专项练习/);
      await page.getByRole('button', { name: /开始写作训练/ }).click();
      await page.locator('textarea').fill(longTextAnswer);
    },
    records,
    issues,
  );

  await auditVisibleButtonsForState(
    page,
    'translation-training-ready',
    async () => {
      await goTab(page, '专项练习', /专项练习/);
      await page.getByRole('button', { name: /开始翻译训练/ }).click();
      await page.locator('textarea').fill(longTextAnswer);
    },
    records,
    issues,
  );

  await auditVisibleButtonsForState(
    page,
    'speaking-training-ready',
    async () => {
      await goTab(page, '口语重说', /口语重说/);
    },
    records,
    issues,
  );

  await auditVisibleButtonsForState(
    page,
    'mock-exam',
    async () => {
      await goTab(page, '阶段模考', /CET-4/);
    },
    records,
    issues,
    { skip: /返回练习中心/ },
  );

  await auditVisibleButtonsForState(
    page,
    'material-importer-ready',
    async () => {
      await goTab(page, '材料导入', /材料导入/);
      await page.getByPlaceholder(/Space exploration|plastic pollution/).fill('urban green spaces');
      await page.locator('textarea').fill(sampleImportJson);
    },
    records,
    issues,
  );

  await auditVisibleButtonsForState(
    page,
    'progress-section',
    async () => {
      await goTab(page, '能力进展', '能力地图');
    },
    records,
    issues,
  );

  await auditVisibleButtonsForState(
    page,
    'onboarding-diagnostic-goals',
    async () => {
      await goHome(page);
      await page.getByRole('button', { name: '入门能力诊断' }).click();
      await expect(page.getByRole('heading', { name: /入门诊断/ })).toBeVisible();
      await page.getByRole('button', { name: '开始诊断' }).click();
      await expect(page.getByRole('heading', { name: '学习目标设置' })).toBeVisible();
    },
    records,
    issues,
  );

  await auditVisibleButtonsForState(
    page,
    'onboarding-diagnostic-questions',
    async () => {
      await goHome(page);
      await page.getByRole('button', { name: '入门能力诊断' }).click();
      await page.getByRole('button', { name: '开始诊断' }).click();
      await page.getByRole('button', { name: '进入真实诊断' }).click();
      await expect(page.getByRole('heading', { name: '真实小题诊断' })).toBeVisible();
      await answerDiagnostic(page);
    },
    records,
    issues,
  );

  await mkdir('test-results', { recursive: true });
  await writeFile(
    REPORT_PATH,
    JSON.stringify(
      {
        clickedButtons: records.length,
        screens: Array.from(new Set(records.map((record) => record.screen))),
        records,
        issues,
      },
      null,
      2,
    ),
    'utf-8',
  );

  expect(records.length).toBeGreaterThan(80);
  expect(issues).toEqual([]);
});
