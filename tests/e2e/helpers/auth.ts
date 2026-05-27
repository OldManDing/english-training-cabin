import { expect, type APIRequestContext, type Page } from '@playwright/test';

const REGISTRATION_INVITE_CODE = process.env.E2E_REGISTRATION_INVITE_CODE || 'ETC-LOCAL-2026';

export async function registerAndEnterApp(page: Page, label = 'e2e') {
  await page.goto('/');
  await expect(page.getByText('账号密码登录')).toBeVisible();

  const email = `${label}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  await page.getByRole('button', { name: '使用邀请码注册' }).click();
  await page.getByTestId('saas-name-input').fill('E2E 学习者');
  await page.getByTestId('saas-organization-input').fill('E2E 训练团队');
  await page.getByTestId('saas-invite-code-input').fill(REGISTRATION_INVITE_CODE);
  await page.getByTestId('saas-email-input').fill(email);
  await page.getByTestId('saas-password-input').fill('secure-password-1');
  await page.getByTestId('saas-auth-submit').click();
  await expect(page.getByTestId('saas-recovery-code')).toBeVisible();
  await page.getByTestId('saas-enter-app').click();
  await expect(page.getByRole('heading', { name: '今日训练' })).toBeVisible();

  return { email, password: 'secure-password-1' };
}

export async function registerApiAccount(request: APIRequestContext, label = 'api') {
  const email = `${label}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const response = await request.post('/api/auth/register', {
    data: {
      email,
      inviteCode: REGISTRATION_INVITE_CODE,
      password: 'secure-password-1',
      name: 'API 学习者',
      organizationName: 'API 训练团队',
    },
  });
  expect(response.status()).toBe(201);
  const body = await response.json();
  return {
    email,
    password: 'secure-password-1',
    token: body.token as string,
    recoveryCode: body.recoveryCode as string,
  };
}
