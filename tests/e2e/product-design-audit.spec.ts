import { expect, test } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { registerAndEnterApp } from './helpers/auth';

const outputDir = 'output/product-design-audit';

const workspaces = [
  ['today', '今日训练', '今日训练'],
  ['practice', '专项练习', '专项练习'],
  ['mock', '阶段模考', /CET-4 标准结构模拟卷/],
  ['review', '复习队列', '复习队列'],
  ['speaking', '口语重说', /口语重说/],
  ['progress', '能力进展', '能力地图'],
  ['import', '材料导入', /材料导入/],
  ['settings', '设置', '目标与计划设置'],
] as const;

test('captures first-viewport product design evidence across primary workspaces', async ({ page }) => {
  mkdirSync(outputDir, { recursive: true });
  await registerAndEnterApp(page, 'product-design-audit');
  const audit: Record<string, unknown> = {};

  await page.setViewportSize({ width: 1440, height: 900 });
  for (const [id, navigationLabel, heading] of workspaces) {
    await page.getByRole('button', { name: navigationLabel, exact: true }).click();
    await expect(page.getByRole('heading', { name: heading }).first()).toBeVisible();
    await page.screenshot({ path: `${outputDir}/desktop-${id}.png` });
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: '今日训练', exact: true }).click();
  const navMetrics = await page.locator('nav').first().evaluate((nav) => ({
    clientWidth: nav.clientWidth,
    scrollWidth: nav.scrollWidth,
    scrollLeft: nav.scrollLeft,
    items: Array.from(nav.querySelectorAll('button')).map((button) => {
      const rect = button.getBoundingClientRect();
      return {
        label: button.textContent?.trim(),
        left: Math.round(rect.left),
        right: Math.round(rect.right),
        visible: rect.right > 0 && rect.left < window.innerWidth,
      };
    }),
  }));
  audit.mobilePrimaryNavigation = navMetrics;
  await page.screenshot({ path: `${outputDir}/mobile-today.png` });

  await page.getByRole('button', { name: '专项练习', exact: true }).click();
  await expect(page.getByRole('heading', { name: '专项练习' }).first()).toBeVisible();
  audit.mobilePractice = await page.evaluate(() => ({
    viewportHeight: window.innerHeight,
    documentHeight: document.documentElement.scrollHeight,
    primaryButtonLabels: Array.from(document.querySelectorAll('button'))
      .map((button) => button.textContent?.trim())
      .filter((label) => label?.includes('开始')),
  }));
  await page.screenshot({ path: `${outputDir}/mobile-practice.png`, fullPage: true });

  writeFileSync(`${outputDir}/metrics.json`, JSON.stringify(audit, null, 2));
});
