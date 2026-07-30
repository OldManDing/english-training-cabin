import { expect, test } from '@playwright/test';
import { registerAndEnterApp, registerApiAccount } from './helpers/auth';

const AUTH_TOKEN_STORAGE_KEY = 'english-training-cabin:saas-token';
const REAL_PAPER_WRITING_ANSWER =
  'A careful study plan should connect daily practice with weekly review and clear evidence of progress.';

test('local real-paper practice serves actual resources and preserves then clears its draft', async ({ page, request }) => {
  test.setTimeout(90_000);
  const indexResponse = await request.get('/api/local-real-papers?exam=cet4');
  expect(indexResponse.ok()).toBeTruthy();
  const indexPayload = await indexResponse.json() as {
    total: number;
    papers: Array<{ id: string; pdfUrl: string; listeningAudioUrl?: string }>;
  };
  expect(indexPayload.total).toBe(57);
  const selectedPaper = indexPayload.papers[0];
  expect(selectedPaper).toBeTruthy();

  const pdfResponse = await request.get(selectedPaper.pdfUrl);
  expect(pdfResponse.status()).toBe(200);
  expect(pdfResponse.headers()['content-type']).toContain('application/pdf');
  expect((await pdfResponse.body()).byteLength).toBeGreaterThan(10_000);

  expect(selectedPaper.listeningAudioUrl).toBeTruthy();
  const audioResponse = await request.get(selectedPaper.listeningAudioUrl!);
  expect(audioResponse.status()).toBe(200);
  expect(audioResponse.headers()['content-type']).toMatch(/^audio\//);
  expect((await audioResponse.body()).byteLength).toBeGreaterThan(1_000);

  await registerAndEnterApp(page, 'real-paper-integrity');
  await page.getByRole('button', { name: '阶段模考', exact: true }).click();
  await page.getByTestId('mock-page-mode-real').click();
  await expect(page.getByTestId('local-real-paper-count')).toContainText('当前 57 套');
  await expect(page.getByTestId('local-real-paper-page-status')).toContainText('页面可做', { timeout: 30_000 });
  await expect(page.getByTestId('local-real-paper-content')).toContainText(/Part I Writing|写作/);

  const pdfHref = await page.getByRole('link', { name: '打开原 PDF' }).getAttribute('href');
  expect(pdfHref).toBe(selectedPaper.pdfUrl);
  const audioHref = await page.getByTestId('local-real-paper-open-audio').getAttribute('href');
  expect(audioHref).toBe(selectedPaper.listeningAudioUrl);

  await page.getByTestId('local-real-paper-writing-answer').fill(REAL_PAPER_WRITING_ANSWER);
  await page.getByRole('button', { name: '二、听力' }).click();
  await page.getByTestId('local-real-paper-choice-listening-1-A').click();
  await expect(page.getByTestId('local-real-paper-answer-progress')).toContainText(/选择题 1\/\d+/);

  await page.reload();
  await expect(page.getByRole('heading', { name: '今日训练' })).toBeVisible();
  await page.getByRole('button', { name: '阶段模考', exact: true }).click();
  await page.getByTestId('mock-page-mode-real').click();
  await expect(page.getByTestId('local-real-paper-page-status')).toContainText('页面可做', { timeout: 30_000 });
  await expect(page.getByTestId('local-real-paper-writing-answer')).toHaveValue(REAL_PAPER_WRITING_ANSWER);
  await page.getByRole('button', { name: '二、听力' }).click();
  await expect(page.getByTestId('local-real-paper-choice-listening-1-A')).toHaveAttribute('aria-pressed', 'true');

  await page.getByTestId('local-real-paper-reset-draft').click();
  await expect(page.getByTestId('local-real-paper-answer-progress')).toContainText(/选择题 0\/\d+/);
  await page.getByRole('button', { name: '一、写作' }).click();
  await expect(page.getByTestId('local-real-paper-writing-answer')).toHaveValue('');
  const draft = await page.evaluate((paperId) => {
    const raw = localStorage.getItem(`english-training-cabin:local-real-paper-draft:v1:${paperId}`);
    return raw ? JSON.parse(raw) : null;
  }, selectedPaper.id);
  expect(draft).toMatchObject({ choices: {}, writingAnswer: '', translationAnswer: '' });
});

test('password recovery UI rotates the code and accepts only the new password', async ({ page, request }) => {
  const account = await registerApiAccount(request, 'password-recovery-ui');
  const newPassword = 'new-secure-password-2';

  await page.goto('/');
  await page.getByRole('button', { name: '忘记密码' }).click();
  await page.getByTestId('saas-email-input').fill(account.email);
  await page.getByTestId('saas-password-input').fill(newPassword);
  await page.getByTestId('saas-recovery-code-input').fill(account.recoveryCode);
  await page.getByTestId('saas-auth-submit').click();

  await expect(page.getByText('密码已重置，请保存新恢复码。')).toBeVisible();
  await expect(page.getByTestId('saas-recovery-code')).toBeVisible();
  const rotatedRecoveryCode = await page.getByTestId('saas-recovery-code').locator('code').textContent();
  expect(rotatedRecoveryCode?.trim()).toMatch(/^etc-/);
  expect(rotatedRecoveryCode?.trim()).not.toBe(account.recoveryCode);
  await page.getByTestId('saas-enter-app').click();
  await expect(page.getByRole('heading', { name: '今日训练' })).toBeVisible();

  await page.getByRole('button', { name: '设置', exact: true }).click();
  await page.getByRole('button', { name: '退出', exact: true }).click();
  await expect(page.getByRole('heading', { name: '登录' })).toBeVisible();
  await page.getByTestId('saas-email-input').fill(account.email);
  await page.getByTestId('saas-password-input').fill(account.password);
  await page.getByTestId('saas-auth-submit').click();
  await expect(page.getByTestId('saas-auth-error')).toHaveText('邮箱或密码不正确。');

  await page.getByTestId('saas-password-input').fill(newPassword);
  await page.getByTestId('saas-auth-submit').click();
  await expect(page.getByRole('heading', { name: '今日训练' })).toBeVisible();
});

test('member account can use personal security tools but cannot see owner controls', async ({ page, request }) => {
  const owner = await registerApiAccount(request, 'member-boundary-owner');
  const memberEmail = `member-boundary-${Date.now()}@example.com`;
  const invitationResponse = await request.post('/api/workspace/invitations', {
    headers: { Authorization: `Bearer ${owner.token}` },
    data: { email: memberEmail, role: 'member' },
  });
  expect(invitationResponse.status()).toBe(201);
  const invitation = await invitationResponse.json() as { invitationUrl: string };
  const invitationToken = new URL(invitation.invitationUrl).searchParams.get('token');
  expect(invitationToken).toBeTruthy();
  const acceptedResponse = await request.post('/api/workspace/invitations/accept', {
    data: { token: invitationToken, name: '成员边界测试', password: 'member-secure-password-2' },
  });
  expect(acceptedResponse.status()).toBe(201);
  const accepted = await acceptedResponse.json() as { token: string };

  const forbiddenOverview = await request.get('/api/admin/overview', {
    headers: { Authorization: `Bearer ${accepted.token}` },
  });
  expect(forbiddenOverview.status()).toBe(403);

  await page.addInitScript(({ key, token }) => localStorage.setItem(key, token), {
    key: AUTH_TOKEN_STORAGE_KEY,
    token: accepted.token,
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '今日训练' })).toBeVisible();
  await page.getByRole('button', { name: '设置', exact: true }).click();
  await page.getByTestId('saas-ops-toggle').click();
  await expect(page.getByText('查看自己的设备会话、成员信息和数据权利请求。')).toBeVisible();
  await expect(page.getByText('登录设备与会话')).toBeVisible();
  await expect(page.getByText('数据权利与合规请求')).toBeVisible();
  await expect(page.getByTestId('saas-invite-email')).toHaveCount(0);
  await expect(page.getByTestId('saas-content-title')).toHaveCount(0);
  await expect(page.getByTestId('data-protection-center')).toHaveCount(0);
  await expect(page.getByTestId('operations-audit-log')).toHaveCount(0);
});
