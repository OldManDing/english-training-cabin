import { expect, test } from '@playwright/test';

const REGISTRATION_INVITE_CODE = process.env.E2E_REGISTRATION_INVITE_CODE || 'ETC-LOCAL-2026';

test('SaaS registration shows a visible error for invalid invite codes', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('账号密码登录')).toBeVisible();

  await page.getByRole('button', { name: '使用邀请码注册' }).click();
  await page.getByTestId('saas-name-input').fill('无效邀请码用户');
  await page.getByTestId('saas-organization-input').fill('无效邀请码团队');
  await page.getByTestId('saas-invite-code-input').fill('WRONG-CODE');
  await page.getByTestId('saas-email-input').fill(`bad-invite-${Date.now()}@example.com`);
  await page.getByTestId('saas-password-input').fill('secure-password-1');
  await page.getByTestId('saas-auth-submit').click();

  await expect(page.getByTestId('saas-auth-error')).toBeVisible();
  await expect(page.getByTestId('saas-auth-error')).toHaveText('邀请码无效或已失效。');
  await expect(page.getByText('邀请码无效或已失效。')).toHaveCount(1);
  await expect(page.getByText('登录后可把当前浏览器的学习记录同步到服务端，形成可恢复的云端学习档案。')).toBeVisible();
});

test('SaaS account trial can sync and restore local learning data', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('账号密码登录')).toBeVisible();
  await expect(page.getByRole('heading', { name: '账号登录' })).toBeVisible();

  const email = `saas-${Date.now()}@example.com`;
  await page.getByRole('button', { name: '使用邀请码注册' }).click();
  await expect(page.getByRole('heading', { name: '邀请码注册' })).toBeVisible();
  await page.getByTestId('saas-name-input').fill('云端学习者');
  await page.getByTestId('saas-organization-input').fill('商业化训练团队');
  await page.getByTestId('saas-invite-code-input').fill(REGISTRATION_INVITE_CODE);
  await page.getByTestId('saas-email-input').fill(email);
  await page.getByTestId('saas-password-input').fill('secure-password-1');
  await page.getByTestId('saas-auth-submit').click();

  await expect(page.getByTestId('saas-recovery-code')).toBeVisible();
  await page.getByTestId('saas-enter-app').click();
  await expect(page.getByRole('heading', { name: '今日训练' })).toBeVisible();
  await page.getByRole('button', { name: '设置' }).click();
  await expect(page.getByText(email, { exact: true }).first()).toBeVisible();
  await expect(page.getByText('云端账号已连接，可同步当前学习数据。')).toBeVisible();
  await expect(page.getByText('云同步 已开通')).toBeVisible();

  await page.getByRole('button', { name: '同步到云端' }).click();
  await expect(page.getByText(/云端同步完成/)).toBeVisible();

  await page.getByRole('button', { name: '从云端恢复' }).click();
  await expect(page.getByText('云端学习数据恢复完成', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '我知道了' }).click();

  await expect(page.getByText('团队与数据管理（高级）')).toBeVisible();
  await page.getByTestId('saas-ops-toggle').click();
  await expect(page.getByText('团队协作与数据安全')).toBeVisible();

  await page.getByTestId('saas-invite-email').fill(`member-${Date.now()}@example.com`);
  await page.getByRole('button', { name: '邀请', exact: true }).click();
  const invitationLinkNotice = page.getByText(/^邀请链接：/);
  await expect(invitationLinkNotice).toBeVisible();
  const invitationLink = (await invitationLinkNotice.textContent())!.split('：')[1].trim();
  const invitationToken = new URL(invitationLink).searchParams.get('token') ?? invitationLink;

  await page.getByTestId('saas-content-title').fill('E2E 原创内容资产');
  await page.getByRole('button', { name: '登记内容资产' }).click();
  await expect(page.getByText('E2E 原创内容资产')).toBeVisible();

  const [cloudArchive] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: '立即下载我的云端档案' }).click(),
  ]);
  expect(cloudArchive.suggestedFilename()).toContain('云端个人档案');

  await page.getByRole('button', { name: '提交导出留痕请求' }).click();
  await expect(page.getByText(/数据导出 · queued/)).toBeVisible();
  await page.getByRole('button', { name: '完成' }).click();
  await expect(page.getByText(/数据导出 · completed/)).toBeVisible();
  await expect(page.getByRole('heading', { name: '运营观测' })).toBeVisible();

  await page.getByRole('button', { name: '退出' }).click();
  await page.goto(`/workspace/accept-invitation?token=${encodeURIComponent(invitationToken)}`);
  await expect(page.getByText('接受团队邀请')).toBeVisible();
  await page.getByTestId('saas-name-input').fill('受邀学习者');
  await page.getByTestId('saas-password-input').fill('member-secure-password-1');
  await page.getByTestId('saas-auth-submit').click();
  await expect(page.getByText('邀请已接受，您已加入团队。')).toBeVisible();
  await expect(page.getByTestId('saas-recovery-code')).toBeVisible();
});
