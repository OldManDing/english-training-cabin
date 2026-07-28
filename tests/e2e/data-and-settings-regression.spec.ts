import { expect, test } from '@playwright/test';
import { registerAndEnterApp } from './helpers/auth';

test('restores an in-progress standard mock in a clean browser context', async ({ page, browser }) => {
  const credentials = await registerAndEnterApp(page, 'cloud-mock-draft');
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: '阶段模考', exact: true }).click();

  const essay = 'This mock answer must survive a completely clean browser context.';
  await page.getByTestId('mock-writing-answer').fill(essay);
  await page.getByTestId('mock-section-listening').click();
  await page.locator('[data-testid^="mock-choice-"]').first().click();
  await page.waitForTimeout(1_000);

  const origin = new URL(page.url()).origin;
  const cleanContext = await browser.newContext({ baseURL: origin });
  const cleanPage = await cleanContext.newPage();
  try {
    await cleanPage.goto('/');
    await cleanPage.getByTestId('saas-email-input').fill(credentials.email);
    await cleanPage.getByTestId('saas-password-input').fill(credentials.password);
    await cleanPage.getByTestId('saas-auth-submit').click();
    await expect(cleanPage.getByRole('heading', { name: '今日训练' })).toBeVisible({ timeout: 20_000 });
    await cleanPage.waitForLoadState('networkidle');

    await cleanPage.getByRole('button', { name: '阶段模考', exact: true }).click();
    await expect(cleanPage.getByTestId('mock-draft-restored')).toBeVisible();
    await cleanPage.getByTestId('mock-section-writing').click();
    await expect(cleanPage.getByTestId('mock-writing-answer')).toHaveValue(essay);
  } finally {
    await cleanContext.close();
  }
});

test('reopens settings with the saved baseline and recording preference', async ({ page }) => {
  await registerAndEnterApp(page, 'settings-persistence');
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: '设置', exact: true }).click();

  await page.getByRole('button', { name: '阅读能力 高级' }).click();
  const speakingPreparation = page.getByRole('button', { name: '准备 CET-4 口语' });
  if (await speakingPreparation.getAttribute('aria-pressed') === 'true') await speakingPreparation.click();
  const recordingReminder = page.getByRole('button', { name: '切换口语录音质量提醒' });
  if (await recordingReminder.getAttribute('aria-pressed') === 'true') await recordingReminder.click();
  await page.getByRole('button', { name: '保存设置' }).click();
  await expect(page.getByText('训练目标已保存，今日计划会随目标更新。')).toBeVisible();

  await page.getByRole('button', { name: '今日训练', exact: true }).click();
  await page.getByRole('button', { name: '设置', exact: true }).click();
  await expect(page.getByRole('button', { name: '阅读能力 高级' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: '准备 CET-4 口语' })).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByRole('button', { name: '切换口语录音质量提醒' })).toHaveAttribute('aria-pressed', 'false');
});
