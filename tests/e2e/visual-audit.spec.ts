import { expect, test } from '@playwright/test';
import { registerAndEnterApp } from './helpers/auth';

async function expectNoHorizontalOverflow(page: import('@playwright/test').Page) {
  const metrics = await page.evaluate(() => ({
    viewport: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(metrics.scrollWidth, `horizontal overflow: ${metrics.scrollWidth} > ${metrics.viewport}`).toBeLessThanOrEqual(metrics.viewport + 1);
}

test('captures desktop and mobile visual evidence for primary workspaces', async ({ page }) => {
  await registerAndEnterApp(page, 'visual-audit');

  await page.setViewportSize({ width: 1440, height: 900 });
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: 'output/playwright/english-training-cabin-desktop-today.png', fullPage: true });

  await page.getByRole('button', { name: '设置', exact: true }).click();
  await expect(page.getByRole('heading', { name: '目标与计划设置' })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: 'output/playwright/english-training-cabin-desktop-settings.png', fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: '专项练习', exact: true }).click();
  await expect(page.getByRole('heading', { name: /专项练习/ })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: 'output/playwright/english-training-cabin-mobile-practice.png', fullPage: true });
});
