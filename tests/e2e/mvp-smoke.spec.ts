import { expect, test } from '@playwright/test';

test('MVP critical reading flow persists local learning evidence', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => indexedDB.deleteDatabase('english-training-cabin'));
  await page.reload();

  await expect(page.getByRole('heading', { name: '今日训练' })).toBeVisible();
  await page.getByRole('button', { name: /开始训练/ }).click();

  for (let index = 0; index < 5; index += 1) {
    await page.getByRole('button', { name: /^A / }).click();
    await page.getByText('非常有把握').click();
    await page.getByRole('button', { name: '提交此题并进行 AI 诊断' }).click();
    await page.getByRole('button', { name: index === 4 ? /完成训练/ : /进入第/ }).click();
  }

  await expect(page.getByRole('heading', { name: '能力地图' })).toBeVisible();

  const counts = await page.evaluate(async () => {
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

    const tx = db.transaction(['practiceSessions', 'attempts', 'reviewItems', 'skillProfiles'], 'readonly');
    const result = {
      sessions: await requestToPromise(tx.objectStore('practiceSessions').count()),
      attempts: await requestToPromise(tx.objectStore('attempts').count()),
      reviewItems: await requestToPromise(tx.objectStore('reviewItems').count()),
      skillProfiles: await requestToPromise(tx.objectStore('skillProfiles').count()),
    };
    db.close();
    return result;
  });

  expect(counts.sessions).toBe(1);
  expect(counts.attempts).toBe(5);
  expect(counts.reviewItems).toBeGreaterThan(0);
  expect(counts.skillProfiles).toBe(1);
});

test('API health, planning, and AI contracts are reachable from production build', async ({ request }) => {
  const health = await request.get('/api/health');
  expect(health.ok()).toBeTruthy();

  const plan = await request.post('/api/study/daily-plan', {
    data: {
      goal: {
        id: 'goal-cet4-primary',
        examId: 'cet4',
        examDate: '2026-06-15',
        dailyMinutes: 60,
        prioritySkills: ['reading', 'speaking'],
      },
    },
  });
  expect(plan.ok()).toBeTruthy();
  expect((await plan.json()).plan.tasks.length).toBeGreaterThan(0);

  const badAiMaterialRequest = await request.post('/api/ai/generate-passage', {
    data: { topic: '' },
  });
  expect(badAiMaterialRequest.status()).toBe(400);

  const badAiSpeechRequest = await request.post('/api/ai/analyze-speech', {
    data: {},
  });
  expect(badAiSpeechRequest.status()).toBe(400);
});

test('JSON material import enters a validated reading practice', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/英语训练舱/);

  await page.getByRole('button', { name: '材料导入' }).click();
  await page.locator('textarea').fill(JSON.stringify({
    title: 'Urban Green Spaces',
    content:
      'Urban green spaces can help students relax and recover attention. Researchers have found that short exposure to natural environments may reduce stress and improve concentration.',
    questions: [
      {
        id: 1,
        question: 'What is one benefit of green spaces?',
        options: {
          A: 'They replace teachers.',
          B: 'They may reduce stress.',
          C: 'They remove exams.',
          D: 'They guarantee high scores.',
        },
        correctAnswer: 'B',
        explanation: 'The answer is directly supported by the second sentence.',
        type: 'detail',
        correctSentence: 'Researchers have found that short exposure to natural environments may reduce stress and improve concentration.',
      },
    ],
  }));

  await page.getByRole('button', { name: '校验并导入训练' }).click();

  await expect(page.getByRole('heading', { name: /仔细阅读训练舱：Urban Green Spaces/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /B They may reduce stress/ })).toBeVisible();
});

test('all MVP sections render their primary controls', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: '专项练习' }).click();
  await expect(page.getByRole('heading', { name: '仔细阅读专项突破库' })).toBeVisible();
  await expect(page.getByRole('button', { name: /开始仔细阅读训练/ }).first()).toBeVisible();

  await page.getByRole('button', { name: '复习队列' }).click();
  await expect(page.getByRole('heading', { name: '复习队列' })).toBeVisible();
  await expect(page.getByRole('button', { name: '开始复习' })).toBeVisible();

  await page.getByRole('button', { name: '口语重说' }).click();
  await expect(page.getByRole('heading', { name: /口语重说/ })).toBeVisible();
  await expect(page.getByRole('button', { name: '开始录音' })).toBeVisible();

  await page.getByRole('button', { name: '能力进展' }).click();
  await expect(page.getByRole('heading', { name: '能力地图' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '综合能力雷达' })).toBeVisible();

  await page.getByRole('button', { name: '材料导入' }).click();
  await expect(page.getByRole('heading', { name: '材料导入与 AI 模拟卷生成' })).toBeVisible();
  await expect(page.getByRole('button', { name: '校验并导入训练' })).toBeVisible();

  await page.getByRole('button', { name: '设置' }).click();
  await expect(page.getByRole('heading', { name: '目标与计划设置' })).toBeVisible();
  await expect(page.getByRole('button', { name: '保存设置' })).toBeVisible();
});
