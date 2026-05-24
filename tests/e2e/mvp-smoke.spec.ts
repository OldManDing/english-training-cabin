import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test('MVP critical reading flow persists local learning evidence', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => indexedDB.deleteDatabase('english-training-cabin'));
  await page.reload();

  await expect(page.getByRole('heading', { name: '今日训练' })).toBeVisible();
  await page.getByRole('button', { name: '专项练习' }).click();
  await page.getByRole('button', { name: /开始仔细阅读训练/ }).first().click();

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

  await page.getByRole('button', { name: '复习队列' }).click();
  await page.getByRole('button', { name: '开始复习' }).click();
  await page.getByRole('button', { name: /说清楚本题错因/ }).click();
  await expect(page.getByText('第 2 步：主动回忆')).toBeVisible();
  await page.getByRole('button', { name: /先遮住解析/ }).click();
  await expect(page.getByText('第 3 步：安排下次复习')).toBeVisible();
  await page.getByRole('button', { name: /更新掌握度和下次复习时间/ }).click();
  await expect(page.getByRole('heading', { name: '复习队列' })).toBeVisible();

  const reviewedEvidence = await page.evaluate(async () => {
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
    const tx = db.transaction(['reviewItems', 'skillProfiles'], 'readonly');
    const items = await requestToPromise(tx.objectStore('reviewItems').getAll());
    const reviewProfile = await requestToPromise(tx.objectStore('skillProfiles').get('cet4-reading-review'));
    db.close();
    return {
      reviewed: items.some((item) => Boolean(item.lastReviewedAt) && item.masteryScore > 35),
      reviewProfile,
    };
  });

  expect(reviewedEvidence.reviewed).toBeTruthy();
  expect(reviewedEvidence.reviewProfile).toMatchObject({
    skillArea: 'reading',
  });
});

test('MVP critical speaking retell flow persists review and ability evidence', async ({ page }) => {
  await page.route('**/api/ai/analyze-speech', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        originalTextWithMarkings: '[filler um] In the picture, I can see wind turbines and solar panels.',
        improvedTextWithConnectors:
          'The picture shows renewable energy facilities, which can reduce pollution and support sustainable development. However, cost and local conditions should also be considered.',
        fillerCount: 1,
        fluencyAnalysis: '减少填充词，先完整输出主题句。',
        logicAnalysis: '补充画面描述、观点、原因和限制。',
        vocabularyAnalysis: '用 renewable energy、sustainable development 替换 good for environment。',
        scoreImprovementFrom: 58,
        scoreImprovementTo: 74,
      }),
    });
  });

  await page.goto('/');
  await page.evaluate(() => indexedDB.deleteDatabase('english-training-cabin'));
  await page.reload();

  await page.getByRole('button', { name: '口语重说' }).click();
  await page.getByRole('button', { name: '开始录音' }).click();
  await expect(page.locator('textarea')).toBeVisible({ timeout: 7_000 });
  await page.locator('textarea').fill('um In the picture, I can see wind turbines and solar panels. They are good for environment.');
  await page.getByRole('button', { name: '完成录音' }).click();

  await expect(page.getByRole('heading', { name: /口语重说 - AI 反馈与改写/ })).toBeVisible();
  await expect(page.getByText('renewable energy facilities')).toBeVisible();
  await page.getByRole('button', { name: '开始第二次重说' }).click();
  await expect(page.getByText('第二次重说转写')).toBeVisible();
  await page.locator('textarea').fill('The picture shows renewable energy facilities, which can reduce pollution and support sustainable development.');
  await page.getByRole('button', { name: '完成第二次重说并生成对比报告' }).click();

  await expect(page.getByRole('heading', { name: /口语重说 - 训练对比报告/ })).toBeVisible();
  await expect(page.getByText('本轮口语证据已写入本地能力画像')).toBeVisible();

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
  expect(counts.attempts).toBe(1);
  expect(counts.reviewItems).toBe(1);
  expect(counts.skillProfiles).toBe(1);
});

test('onboarding diagnostic persists the initial ability portrait before entering daily training', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => indexedDB.deleteDatabase('english-training-cabin'));
  await page.reload();

  await page.getByRole('button', { name: '入门能力诊断' }).click();
  await page.getByRole('button', { name: '开始诊断' }).click();
  await page.getByRole('button', { name: '确认并生成计划' }).click();

  await expect(page.getByRole('heading', { name: '诊断完成！您的能力画像已生成' })).toBeVisible({ timeout: 7_000 });
  await page.getByRole('button', { name: /开启今日训练/ }).click();
  await expect(page.getByRole('heading', { name: '今日训练' })).toBeVisible();

  const result = await page.evaluate(async () => {
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
    const tx = db.transaction(['studyGoals', 'skillProfiles'], 'readonly');
    const goal = await requestToPromise(tx.objectStore('studyGoals').get('goal-cet4-primary'));
    const skillProfiles = await requestToPromise(tx.objectStore('skillProfiles').count());
    db.close();
    return { goal, skillProfiles };
  });

  expect(result.goal).toMatchObject({
    targetScore: 550,
    dailyMinutes: 45,
  });
  expect(result.skillProfiles).toBe(5);
});

test('MVP critical translation flow evaluates feedback and persists learning evidence', async ({ page }) => {
  await page.route('**/api/ai/evaluate-subjective', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        score: 69,
        mistakeReasons: ['中文干扰', '搭配错误'],
        comments: ['译文基本完整，但句序受中文影响。'],
        nextActions: ['先确定英文主干，再补充修饰成分。'],
        sampleAnswer:
          'In recent years, renewable energy has played an increasingly important role in urban development.',
        confidence: 'medium',
      }),
    });
  });

  await page.goto('/');
  await page.evaluate(() => indexedDB.deleteDatabase('english-training-cabin'));
  await page.reload();

  await page.getByRole('button', { name: '专项练习' }).click();
  await page.getByRole('button', { name: '开始翻译训练' }).click();
  await page.locator('textarea').fill('In recent years, renewable energy plays more and more important role in city development.');
  await page.getByRole('button', { name: '提交并获取 AI 反馈' }).click();

  await expect(page.getByText('译文基本完整，但句序受中文影响。')).toBeVisible();
  await page.getByRole('button', { name: '完成训练并写入能力画像' }).click();
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
      translationProfile: await requestToPromise(tx.objectStore('skillProfiles').get('cet4-translation-paragraph-translation')),
    };
    db.close();
    return result;
  });

  expect(counts.sessions).toBe(1);
  expect(counts.attempts).toBe(1);
  expect(counts.reviewItems).toBe(1);
  expect(counts.translationProfile).toMatchObject({
    skillArea: 'translation',
    score: 69,
  });
});

test('application shell loads without browser console errors', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text());
    }
  });

  await page.goto('/');
  await expect(page.getByRole('heading', { name: '今日训练' })).toBeVisible();

  expect(consoleErrors).toEqual([]);
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
  await expect(page.getByRole('button', { name: /开始复习|先完成训练生成错因/ })).toBeVisible();

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

test('local learning data can be exported and restored from settings', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => indexedDB.deleteDatabase('english-training-cabin'));
  await page.reload();

  await page.getByRole('button', { name: '设置' }).click();
  await expect(page.getByRole('heading', { name: '本地数据保险箱' })).toBeVisible();

  const download = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: '导出学习数据' }).click(),
  ]).then(([downloadEvent]) => downloadEvent);
  const downloadPath = await download.path();
  expect(downloadPath).toBeTruthy();
  const exported = JSON.parse(await readFile(downloadPath!, 'utf-8'));

  expect(exported).toMatchObject({
    app: 'english-training-cabin',
    schemaVersion: 1,
  });
  expect(exported.data.studyGoals.length).toBeGreaterThan(0);

  const backup = {
    app: 'english-training-cabin',
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    data: {
      studyGoals: [
        {
          id: 'goal-restored',
          examId: 'cet4',
          examDate: '2026-12-12',
          targetScore: 605,
          dailyMinutes: 45,
          prioritySkills: ['reading', 'speaking'],
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      practiceSessions: [],
      attempts: [],
      reviewItems: [
        {
          id: 'review-restored',
          title: '恢复测试错因',
          category: '错题',
          detail: '用于验证本地备份恢复链路。',
          daysAgo: 0,
          targetType: 'question',
          targetId: 'q-restored',
          examId: 'cet4',
          moduleId: 'reading',
          skillArea: 'reading',
          masteryScore: 35,
          priorityScore: 90,
          reviewIntervalDays: 1,
          nextReviewAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
      ],
      skillProfiles: [],
    },
  };

  await page.getByTestId('restore-learning-data-input').setInputFiles({
    name: 'learning-backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(backup)),
  });

  await expect(page.getByRole('heading', { name: '学习数据恢复完成' })).toBeVisible();

  const restored = await page.evaluate(async () => {
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
    const tx = db.transaction(['studyGoals', 'reviewItems'], 'readonly');
    const goal = await requestToPromise(tx.objectStore('studyGoals').get('goal-restored'));
    const reviewCount = await requestToPromise(tx.objectStore('reviewItems').count());
    db.close();
    return { goal, reviewCount };
  });

  expect(restored.goal).toMatchObject({
    id: 'goal-restored',
    targetScore: 605,
    dailyMinutes: 45,
  });
  expect(restored.reviewCount).toBe(1);
});
