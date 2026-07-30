import { expect, test } from '@playwright/test';
import { registerAndEnterApp, registerApiAccount } from './helpers/auth';

const AUTH_TOKEN_STORAGE_KEY = 'english-training-cabin:saas-token';

test('transient session verification failure preserves the token and can retry', async ({ page, request }) => {
  const account = await registerApiAccount(request, 'auth-resilience');
  await page.addInitScript(({ key, token }) => localStorage.setItem(key, token), {
    key: AUTH_TOKEN_STORAGE_KEY,
    token: account.token,
  });

  let shouldFail = true;
  await page.route('**/api/auth/session', async (route) => {
    if (shouldFail) {
      shouldFail = false;
      await route.abort('failed');
      return;
    }
    await route.continue();
  });

  await page.goto('/');
  await expect(page.getByRole('heading', { name: '暂时无法连接服务器' })).toBeVisible();
  await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), AUTH_TOKEN_STORAGE_KEY)).toBe(account.token);

  await page.getByRole('button', { name: '重试连接' }).click();
  await expect(page.getByRole('heading', { name: '今日训练' })).toBeVisible();
});

test('an explicitly rejected session clears the invalid token', async ({ page }) => {
  await page.addInitScript((key) => localStorage.setItem(key, 'invalid-session-token'), AUTH_TOKEN_STORAGE_KEY);
  await page.goto('/');

  await expect(page.getByRole('heading', { name: '登录' })).toBeVisible();
  await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), AUTH_TOKEN_STORAGE_KEY)).toBeNull();
});

test('settings session check preserves the signed-in account during a transient outage', async ({ page }) => {
  const { email } = await registerAndEnterApp(page, 'settings-auth-resilience');
  const token = await page.evaluate((key) => localStorage.getItem(key), AUTH_TOKEN_STORAGE_KEY);
  expect(token).toBeTruthy();

  let shouldFail = true;
  await page.route('**/api/auth/session', async (route) => {
    if (shouldFail) {
      shouldFail = false;
      await route.abort('failed');
      return;
    }
    await route.continue();
  });

  await page.getByRole('button', { name: '设置', exact: true }).click();
  await expect(page.getByTestId('saas-session-unavailable')).toContainText('暂时无法连接服务器');
  await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), AUTH_TOKEN_STORAGE_KEY)).toBe(token);

  await page.getByRole('button', { name: '重试', exact: true }).click();
  await expect(page.getByText(email, { exact: true }).first()).toBeVisible();
  await expect(page.getByTestId('saas-session-unavailable')).toHaveCount(0);
});

test('non-JSON gateway errors produce a stable user-facing message', async ({ page }) => {
  await page.route('**/api/auth/login', async (route) => {
    await route.fulfill({
      status: 502,
      contentType: 'text/html',
      body: '<html><body>Bad Gateway</body></html>',
    });
  });

  await page.goto('/');
  await page.getByTestId('saas-email-input').fill('gateway-error@example.com');
  await page.getByTestId('saas-password-input').fill('secure-password-1');
  await page.getByTestId('saas-auth-submit').click();
  await expect(page.getByTestId('saas-auth-error')).toHaveText('服务器请求失败（502），请稍后重试。');
});
