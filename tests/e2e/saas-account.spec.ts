import { expect, test } from '@playwright/test';
import { createSmokeLearningBackup } from '../../scripts/smoke-learning-backup.mjs';
import { learningBackupToEntities } from '../../src/lib/storage/authoritativeLearningSync';
import type { LearningDataBackup } from '../../src/lib/storage/db';
import { registerApiAccount } from './helpers/auth';

const REGISTRATION_INVITE_CODE = process.env.E2E_REGISTRATION_INVITE_CODE || 'ETC-LOCAL-2026';

async function countLocalLearningData(page: import('@playwright/test').Page) {
  return page.evaluate(async () => {
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
    if (existingStores.length === 0) {
      db.close();
      return {};
    }
    const tx = db.transaction(existingStores, 'readonly');
    const counts: Record<string, number> = {};
    for (const store of existingStores) {
      counts[store] = await requestToPromise(tx.objectStore(store).count());
    }
    db.close();
    return counts;
  });
}

async function seedLocalProfileOnlyLearningData(page: import('@playwright/test').Page) {
  await page.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      const deleteRequest = indexedDB.deleteDatabase('english-training-cabin');
      deleteRequest.onsuccess = () => resolve();
      deleteRequest.onerror = () => reject(deleteRequest.error);
      deleteRequest.onblocked = () => resolve();
    });

    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('english-training-cabin', 1);
      request.onupgradeneeded = () => {
        const database = request.result;
        const stores = {
          studyGoals: ['examId', 'status', 'updatedAt'],
          practiceSessions: ['examId', 'moduleId', 'status', 'startedAt', 'finishedAt'],
          attempts: ['sessionId', 'questionId', 'examId', 'moduleId', 'questionTypeId', 'createdAt'],
          reviewItems: ['targetType', 'targetId', 'examId', 'moduleId', 'skillArea', 'nextReviewAt', 'priorityScore'],
          skillProfiles: ['skillArea', 'subSkillId', 'lastUpdatedAt'],
        };
        Object.entries(stores).forEach(([storeName, indexes]) => {
          if (database.objectStoreNames.contains(storeName)) return;
          const store = database.createObjectStore(storeName, { keyPath: 'id' });
          indexes.forEach((indexName) => store.createIndex(indexName, indexName));
        });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const now = new Date().toISOString();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(['studyGoals', 'skillProfiles'], 'readwrite');
      tx.objectStore('studyGoals').put({
        id: 'local-default-goal',
        examId: 'cet4',
        examDate: '2026-06-13',
        targetScore: 550,
        dailyMinutes: 60,
        prioritySkills: ['reading', 'listening', 'vocabulary', 'speaking'],
        status: 'active',
        createdAt: now,
        updatedAt: now,
      });
      tx.objectStore('skillProfiles').put({
        id: 'local-profile-only',
        skillArea: 'reading',
        subSkillId: 'diagnostic',
        score: 60,
        confidence: 3,
        evidenceCount: 0,
        lastUpdatedAt: now,
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  });
}

test('SaaS registration shows a visible error for invalid invite codes', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '英语训练舱' })).toBeVisible();

  await page.getByRole('button', { name: '隐私协议' }).click();
  await expect(page.getByRole('heading', { name: '隐私协议' })).toBeVisible();
  await expect(page.getByText('IndexedDB')).toBeVisible();
  await expect(page.getByText('AI 不可用时系统会切换到规则反馈兜底')).toBeVisible();
  await page.getByRole('button', { name: '我知道了' }).click();

  await page.getByRole('button', { name: '服务条款' }).click();
  await expect(page.getByRole('heading', { name: '服务条款' })).toBeVisible();
  await expect(page.getByText('训练参考')).toBeVisible();
  await expect(page.getByText('不构成官方考试成绩')).toBeVisible();
  await page.getByRole('button', { name: '我知道了' }).click();

  await page.getByRole('button', { name: '邀请码注册' }).click();
  await page.getByTestId('saas-name-input').fill('无效邀请码用户');
  await page.getByTestId('saas-organization-input').fill('无效邀请码团队');
  await page.getByTestId('saas-invite-code-input').fill('WRONG-CODE');
  await page.getByTestId('saas-email-input').fill(`bad-invite-${Date.now()}@example.com`);
  await page.getByTestId('saas-password-input').fill('secure-password-1');
  await page.getByTestId('saas-auth-submit').click();

  await expect(page.getByTestId('saas-auth-error')).toBeVisible();
  await expect(page.getByTestId('saas-auth-error')).toHaveText('邀请码无效或已失效。');
  await expect(page.getByText('邀请码无效或已失效。')).toHaveCount(1);
  await expect(page.getByText('登录 / 邀请码注册')).toBeVisible();
});

test('SaaS account trial can sync and restore local learning data', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '英语训练舱' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '登录' })).toBeVisible();

  const email = `saas-${Date.now()}@example.com`;
  await page.getByRole('button', { name: '邀请码注册' }).click();
  await expect(page.getByRole('heading', { name: '邀请码注册' })).toBeVisible();
  await page.getByTestId('saas-name-input').fill('云端学习者');
  await page.getByTestId('saas-organization-input').fill('商业化训练团队');
  await page.getByTestId('saas-invite-code-input').fill(REGISTRATION_INVITE_CODE);
  await page.getByTestId('saas-email-input').fill(email);
  await page.getByTestId('saas-password-input').fill('secure-password-1');
  await page.getByTestId('saas-auth-submit').click();

  await expect(page.getByTestId('saas-recovery-code')).toBeVisible({ timeout: 15_000 });
  await page.getByTestId('saas-enter-app').click();
  await expect(page.getByRole('heading', { name: '今日训练' })).toBeVisible();
  await page.getByRole('button', { name: '设置' }).click();
  await expect(page.getByText(email, { exact: true }).first()).toBeVisible();
  await expect(page.getByText('学习记录已由服务器保存')).toBeVisible();

  await page.getByRole('button', { name: '隐私协议' }).click();
  await expect(page.getByRole('heading', { name: '隐私协议' })).toBeVisible();
  await expect(page.getByText('用户可以在设置页导出本地学习数据、从服务器重建学习数据，并通过反馈入口提交问题。')).toBeVisible();
  await page.getByRole('button', { name: '我知道了' }).click();

  await page.getByRole('button', { name: '立即服务器对账' }).click();
  await expect(page.getByText(/服务器对账完成：已确认/)).toBeVisible();

  await page.getByRole('button', { name: '从服务器重建' }).click();
  await expect(page.getByText('服务器学习数据重建完成', { exact: true })).toBeVisible();
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
  await expect(page.getByTestId('learning-workspace-notice')).toContainText('旧账号的');
  await expect(page.getByTestId('saas-recovery-code')).toBeVisible();

  const isolatedWorkspace = await page.evaluate(async () => {
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
    const tx = db.transaction([...stores, 'learningWorkspaceMeta', 'learningWorkspaceArchives'], 'readonly');
    const counts = await Promise.all(stores.map((store) => requestToPromise(tx.objectStore(store).count())));
    const meta = await requestToPromise(tx.objectStore('learningWorkspaceMeta').get('current'));
    const archives = await requestToPromise(tx.objectStore('learningWorkspaceArchives').count());
    db.close();
    return { counts, meta, archives };
  });
  expect(isolatedWorkspace.counts).toEqual([0, 0, 0, 0, 0]);
  expect(isolatedWorkspace.meta).toMatchObject({ id: 'current' });
  expect(isolatedWorkspace.archives).toBeGreaterThanOrEqual(1);
});

test('SaaS login on a new device automatically restores existing cloud learning data', async ({ page, request }) => {
  const account = await registerApiAccount(request, 'auto-cloud-restore');
  const backup = createSmokeLearningBackup('auto-cloud-restore');

  await request
    .put('/api/cloud/learning-data', {
      headers: { Authorization: `Bearer ${account.token}` },
      data: { backup },
    })
    .then((response) => expect(response.ok()).toBe(true));

  await page.goto('/');
  await page.getByTestId('saas-email-input').fill(account.email);
  await page.getByTestId('saas-password-input').fill(account.password);
  await page.getByTestId('saas-auth-submit').click();

  await expect(page.getByText('已同步云端学习数据', { exact: true })).toBeVisible();

  const counts = await countLocalLearningData(page);
  expect(counts).toMatchObject({
    studyGoals: 1,
    practiceSessions: 1,
    attempts: 1,
    reviewItems: 1,
    skillProfiles: 1,
  });
});

test('SaaS login restores entity-only learning data after browser storage is cleared', async ({ page, request }) => {
  const account = await registerApiAccount(request, 'entity-only-restore');
  const backup = createSmokeLearningBackup('entity-only-restore');
  const response = await request.put('/api/cloud/learning-entities', {
    headers: { Authorization: `Bearer ${account.token}` },
    data: {
      entities: learningBackupToEntities(backup as LearningDataBackup),
    },
  });
  expect(response.ok()).toBe(true);

  await page.goto('/');
  await page.getByTestId('saas-email-input').fill(account.email);
  await page.getByTestId('saas-password-input').fill(account.password);
  await page.getByTestId('saas-auth-submit').click();
  await expect(page.getByText('已同步云端学习数据', { exact: true })).toBeVisible();

  const counts = await countLocalLearningData(page);
  expect(counts).toMatchObject({
    studyGoals: 1,
    practiceSessions: 1,
    attempts: 1,
    reviewItems: 1,
    skillProfiles: 1,
  });
});

test('SaaS login restores cloud learning data when the device only has local profiles', async ({ page, request }) => {
  const account = await registerApiAccount(request, 'profile-only-auto-cloud-restore');
  const backup = createSmokeLearningBackup('profile-only-auto-cloud-restore');

  await request
    .put('/api/cloud/learning-data', {
      headers: { Authorization: `Bearer ${account.token}` },
      data: { backup },
    })
    .then((response) => expect(response.ok()).toBe(true));

  await page.goto('/');
  await seedLocalProfileOnlyLearningData(page);
  await page.reload();
  await page.getByTestId('saas-email-input').fill(account.email);
  await page.getByTestId('saas-password-input').fill(account.password);
  await page.getByTestId('saas-auth-submit').click();

  await expect(page.getByText('已同步云端学习数据', { exact: true })).toBeVisible();

  const counts = await countLocalLearningData(page);
  expect(counts).toMatchObject({
    studyGoals: 2,
    practiceSessions: 1,
    attempts: 1,
    reviewItems: 1,
    skillProfiles: 2,
  });
});
