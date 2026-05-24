import { expect, test } from '@playwright/test';

test('mobile viewport can reach the learning cockpit and launch disclosure', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle(/英语训练舱/);
  await expect(page.getByRole('heading', { name: '今日训练' })).toBeVisible();
  await expect(page.getByText('上线声明：本地优先、模拟训练、AI 有兜底')).toBeVisible();

  await page.getByRole('button', { name: '本地数据' }).click();
  await expect(page.getByRole('heading', { name: '隐私与本地数据说明' })).toBeVisible();
  await page.getByRole('button', { name: '我知道了' }).click();

  await page.getByRole('button', { name: '材料导入' }).click();
  await expect(page.getByRole('heading', { name: '材料导入与 AI 模拟卷生成' })).toBeVisible();
});
