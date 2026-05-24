import { expect, test } from '@playwright/test';

test('SaaS account trial can sync and restore local learning data', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '设置' }).click();

  await expect(page.getByText('SaaS 云端账号')).toBeVisible();

  const email = `saas-${Date.now()}@example.com`;
  await page.getByTestId('saas-name-input').fill('云端学习者');
  await page.getByTestId('saas-organization-input').fill('商业化训练团队');
  await page.getByTestId('saas-email-input').fill(email);
  await page.getByTestId('saas-password-input').fill('secure-password-1');
  await page.getByTestId('saas-auth-submit').click();

  await expect(page.getByText(email)).toBeVisible();
  await expect(page.getByText('云同步 已开通')).toBeVisible();

  await page.getByRole('button', { name: '同步到云端' }).click();
  await expect(page.getByText(/云端同步完成/)).toBeVisible();

  await page.getByRole('button', { name: '从云端恢复' }).click();
  await expect(page.getByText('云端学习数据恢复完成', { exact: true })).toBeVisible();
});
