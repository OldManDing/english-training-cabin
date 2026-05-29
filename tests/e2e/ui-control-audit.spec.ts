import { expect, test, type Page } from '@playwright/test';
import { registerAndEnterApp } from './helpers/auth';

async function clearLocalLearningData(page: Page) {
  await page.evaluate(async () => {
    function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
      return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }

    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('english-training-cabin');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const stores = ['studyGoals', 'practiceSessions', 'attempts', 'reviewItems', 'skillProfiles'];
    const existingStores = stores.filter((store) => db.objectStoreNames.contains(store));
    if (existingStores.length > 0) {
      const tx = db.transaction(existingStores, 'readwrite');
      const txComplete = new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
      await Promise.all(existingStores.map((store) => requestToPromise(tx.objectStore(store).clear())));
      await txComplete;
    }
    db.close();
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

async function expectButtonHasVisibleChrome(page: Page, name: string) {
  const button = page.getByRole('button', { name });
  await expect(button).toBeVisible();
  const style = await button.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const computed = window.getComputedStyle(element);
    return {
      width: rect.width,
      height: rect.height,
      background: computed.backgroundColor,
      borderWidth: computed.borderTopWidth,
      borderStyle: computed.borderTopStyle,
      borderColor: computed.borderTopColor,
      radius: computed.borderTopLeftRadius,
    };
  });

  const borderWidth = Number.parseFloat(style.borderWidth);
  const hasVisibleFill = style.background !== 'rgba(0, 0, 0, 0)' && style.background !== 'transparent';
  const hasVisibleBorder =
    borderWidth >= 1 && style.borderStyle !== 'none' && style.borderColor !== 'rgba(0, 0, 0, 0)';

  expect(style.width).toBeGreaterThanOrEqual(44);
  expect(style.height).toBeGreaterThanOrEqual(40);
  expect(style.radius).not.toBe('0px');
  expect(hasVisibleFill || hasVisibleBorder).toBe(true);
}

async function expectComboboxHasVisibleChrome(page: Page, name: string) {
  const combobox = page.getByRole('combobox', { name });
  await expect(combobox).toBeVisible();
  const style = await combobox.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const computed = window.getComputedStyle(element);
    return {
      width: rect.width,
      height: rect.height,
      background: computed.backgroundColor,
      borderWidth: computed.borderTopWidth,
      borderStyle: computed.borderTopStyle,
      borderColor: computed.borderTopColor,
      radius: computed.borderTopLeftRadius,
    };
  });

  expect(style.width).toBeGreaterThanOrEqual(44);
  expect(style.height).toBeGreaterThanOrEqual(44);
  expect(style.background).not.toBe('rgba(0, 0, 0, 0)');
  expect(Number.parseFloat(style.borderWidth)).toBeGreaterThanOrEqual(1);
  expect(style.borderStyle).not.toBe('none');
  expect(style.borderColor).not.toBe('rgba(0, 0, 0, 0)');
  expect(style.radius).not.toBe('0px');
}

async function chooseComboboxOption(page: Page, label: string, optionName: string | RegExp) {
  await expectComboboxHasVisibleChrome(page, label);
  await page.getByRole('combobox', { name: label }).click();
  await expect(page.getByRole('listbox')).toBeVisible();
  await page.getByRole('option', { name: optionName }).click();
}

async function chooseCalendarDay(page: Page, label: string, dayLabel: string, expectedValue: string) {
  await expectComboboxHasVisibleChrome(page, label);
  const calendarButton = page.getByRole('combobox', { name: label });
  await calendarButton.click();
  await expect(page.getByRole('dialog', { name: `${label} 日历` })).toBeVisible();
  await page.getByRole('button', { name: dayLabel, exact: true }).click();
  await expect(calendarButton).toContainText(expectedValue);
}

async function expectVisibleControlsHealthy(page: Page, context: string) {
  const issues = await page.evaluate((auditContext) => {
    const visible = (element: Element) => {
      if (element.matches('.sr-only, [hidden], [aria-hidden="true"]')) return false;
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
    };

    const labelFor = (element: Element) => {
      const id = element.getAttribute('id');
      if (!id) return '';
      return document.querySelector(`label[for="${CSS.escape(id)}"]`)?.textContent?.trim() ?? '';
    };

    const controlIssues: string[] = [];
    const controls = Array.from(document.querySelectorAll('button, input, select, textarea, label')).filter(visible);
    const nativeSelects = Array.from(document.querySelectorAll('select')).filter(visible);
    const nativeDateInputs = Array.from(document.querySelectorAll('input[type="date"]')).filter(visible);

    if (nativeSelects.length > 0) {
      controlIssues.push(`${auditContext}: 仍存在可见原生 select，下拉面板无法统一样式`);
    }
    if (nativeDateInputs.length > 0) {
      controlIssues.push(`${auditContext}: 仍存在可见原生日期输入，系统日历无法统一样式`);
    }

    for (const control of controls) {
      if (control instanceof HTMLInputElement && control.type === 'file') continue;

      const rect = control.getBoundingClientRect();
      const style = window.getComputedStyle(control);
      const tag = control.tagName.toLowerCase();
      if (tag === 'label' && style.cursor !== 'pointer') continue;
      const type = control.getAttribute('type') ?? '';
      const name = [
        control.getAttribute('aria-label'),
        control.getAttribute('placeholder'),
        control.getAttribute('title'),
        labelFor(control),
        control.textContent?.trim(),
      ].find((value) => value && value.replace(/\s+/g, '').length > 0);
      const summary = `${auditContext}: ${tag}${type ? `[${type}]` : ''} "${name ?? 'unnamed'}" ${Math.round(rect.width)}x${Math.round(rect.height)}`;

      if (!name) {
        controlIssues.push(`${summary} 缺少可访问名称`);
      }
      if ((tag === 'button' || tag === 'label') && (rect.width < 44 || rect.height < 44)) {
        controlIssues.push(`${summary} 触控区域小于 44px`);
      }
      if ((tag === 'input' || tag === 'select' || tag === 'textarea') && rect.height < 44) {
        controlIssues.push(`${summary} 输入控件高度小于 44px`);
      }
    }

    const gradientElements = Array.from(document.querySelectorAll('body, main, section, article, aside, div'))
      .filter(visible)
      .filter((element) => /gradient/i.test(window.getComputedStyle(element).backgroundImage))
      .map((element) => {
        const rect = element.getBoundingClientRect();
        const text = element.textContent?.trim().replace(/\s+/g, ' ').slice(0, 40) || element.tagName.toLowerCase();
        return `${auditContext}: ${element.tagName.toLowerCase()} "${text}" ${Math.round(rect.width)}x${Math.round(rect.height)} 使用渐变背景`;
      });

    return [...controlIssues, ...gradientElements];
  }, context);

  expect(issues).toEqual([]);
  await expectNoHorizontalOverflow(page);
}

test('auth inputs and mode buttons validate locally before API submission', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  const consoleErrors: string[] = [];
  const failedAuthResponses: string[] = [];

  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('response', (response) => {
    const request = response.request();
    if (request.method() === 'POST' && /\/api\/auth\//.test(response.url()) && response.status() >= 400) {
      failedAuthResponses.push(`${response.status()} ${response.url()}`);
    }
  });

  await page.goto('/');
  await expectVisibleControlsHealthy(page, 'auth-login');
  await expectButtonHasVisibleChrome(page, '使用邀请码注册');
  await expectButtonHasVisibleChrome(page, '忘记密码');

  await page.getByTestId('saas-auth-submit').click();
  await expect(page.getByTestId('saas-auth-error')).toHaveText('请输入有效邮箱。');

  await page.getByRole('button', { name: '使用邀请码注册' }).click();
  await expectVisibleControlsHealthy(page, 'auth-register');
  await expectButtonHasVisibleChrome(page, '返回登录');
  await expectButtonHasVisibleChrome(page, '忘记密码');
  await page.getByTestId('saas-auth-submit').click();
  await expect(page.getByTestId('saas-auth-error')).toHaveText('请输入有效邀请码。');

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.getByRole('button', { name: '忘记密码' }).click();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await expect(page.getByRole('heading', { name: '重置密码' })).toBeInViewport();
  await expectVisibleControlsHealthy(page, 'auth-reset');
  await expectButtonHasVisibleChrome(page, '返回登录');
  await expectButtonHasVisibleChrome(page, '使用邀请码注册');
  await page.getByTestId('saas-auth-submit').click();
  await expect(page.getByTestId('saas-auth-error')).toHaveText('请输入有效邮箱。');

  expect(failedAuthResponses).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

test('primary workspaces keep controls usable and reset scroll on navigation', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await registerAndEnterApp(page, 'ui-control-audit');
  await clearLocalLearningData(page);
  await page.reload();
  await expect(page.getByRole('heading', { name: '今日训练' })).toBeVisible();
  await expectVisibleControlsHealthy(page, 'today');

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.getByRole('button', { name: '调整今日训练时间' }).click();
  await expect(page.getByRole('heading', { name: '目标与计划设置' })).toBeInViewport();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await expectVisibleControlsHealthy(page, 'settings');

  await chooseCalendarDay(page, '考试日期', '20', '2026-06-20');
  await page.getByLabel('目标分数').fill('560');
  await chooseComboboxOption(page, '每日投入时长', /60 分钟/);
  await page.getByRole('button', { name: '阅读能力 高级' }).click();
  await page.getByRole('button', { name: '听力能力 入门' }).click();
  await page.getByRole('button', { name: '翻译水平 中级' }).click();
  await page.getByRole('button', { name: '写作能力 高级' }).click();
  await page.getByRole('button', { name: '口语表达 中级' }).click();
  await page.getByRole('button', { name: '切换口语录音质量提醒' }).click();
  const speechToggleBox = await page.getByRole('button', { name: '切换口语录音质量提醒' }).boundingBox();
  expect(speechToggleBox?.width).toBeGreaterThanOrEqual(60);
  expect(speechToggleBox?.height).toBeGreaterThanOrEqual(44);
  await page.getByRole('button', { name: '保存设置' }).click();
  await expect(page.getByText(/训练目标已保存到当前浏览器/)).toBeVisible();
  await page.getByTestId('saas-ops-toggle').click();
  await expectVisibleControlsHealthy(page, 'settings-ops');
  await page.getByTestId('saas-invite-email').fill(`ops-${Date.now()}@example.com`);
  await page.getByRole('button', { name: '邀请', exact: true }).click();
  await expect(page.getByText(/^邀请链接：/)).toBeVisible();
  await page.getByTestId('saas-content-title').fill('CET-4 UI 控件审计原创材料');
  await chooseComboboxOption(page, '内容类型', '听力');
  await chooseComboboxOption(page, '内容来源', '原创');
  await chooseComboboxOption(page, '授权状态', '可发布');
  await page.getByRole('button', { name: '登记内容资产' }).click();
  await expect(page.getByText('CET-4 UI 控件审计原创材料')).toBeVisible();

  await page.getByRole('button', { name: '帮助', exact: true }).click();
  await expectVisibleControlsHealthy(page, 'help-modal');
  await page.getByRole('button', { name: '关闭提示' }).click();

  await page.getByRole('button', { name: '专项练习', exact: true }).click();
  await expect(page.getByRole('heading', { name: /专项练习/ })).toBeVisible();
  await expectVisibleControlsHealthy(page, 'practice-hub');

  await page.getByRole('button', { name: '阶段模考', exact: true }).click();
  await expect(page.getByTestId('mock-section-listening')).toBeVisible();
  await page.getByTestId('mock-section-listening').click();
  await page.getByTestId('mock-section-reading').click();
  await page.getByRole('button', { name: /上一/ }).click();
  await page.getByRole('button', { name: /下一/ }).click();
  await page.getByTestId('mock-section-review').click();
  await page.getByTestId('mock-exam-submit').click();
  await expect(page.getByTestId('mock-writing-answer')).toBeVisible();
  await expectVisibleControlsHealthy(page, 'mock-exam');

  await page.getByRole('button', { name: '复习队列', exact: true }).click();
  await expect(page.getByRole('heading', { name: '复习队列' })).toBeVisible();
  await expectVisibleControlsHealthy(page, 'review');

  await page.getByRole('button', { name: '口语重说', exact: true }).click();
  await expect(page.getByRole('heading', { name: /口语重说/ })).toBeVisible();
  await expectVisibleControlsHealthy(page, 'speaking');

  await page.getByRole('button', { name: '能力进展', exact: true }).click();
  await expect(page.getByRole('heading', { name: '能力地图' })).toBeVisible();
  await expectVisibleControlsHealthy(page, 'progress');

  await page.getByRole('button', { name: '材料导入', exact: true }).click();
  await expect(page.getByRole('heading', { name: /材料导入/ })).toBeVisible();
  await page.locator('textarea').fill('{"title":');
  await page.getByRole('button', { name: '校验并导入训练' }).click();
  await expect(page.getByText(/JSON 解析失败|无法解析 JSON/)).toBeVisible();
  await expectVisibleControlsHealthy(page, 'material-importer');
});
