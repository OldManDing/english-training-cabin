import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { CET4_VOCABULARY_BANK, VOCABULARY_SESSION_SIZE } from '../../src/data';
import { CET4_MOCK_EXAM } from '../../src/questionBank';
import { registerAndEnterApp, registerApiAccount } from './helpers/auth';

async function answerOnboardingDiagnostic(page: Page) {
  await page.getByRole('button', { name: /A\. They mainly protect old books/ }).click();
  await page.getByRole('button', { name: /C\. Join the online workshop/ }).click();
  await page.getByLabel('翻译句法转换作答').fill(
    'With the development of online learning, more college students can arrange their study time more flexibly.',
  );
  await page.getByLabel('写作结构与论证作答').fill(
    'In my opinion, students can use AI tools wisely because they can receive quick feedback. For example, when I write an English paragraph, AI can point out grammar problems and suggest better expressions. However, students should revise the answer themselves instead of copying it.',
  );
  await page.getByLabel('口语连贯表达初筛作答').fill(
    'One habit that helps me learn English is reading aloud every morning. It works because I can practice pronunciation and remember useful expressions. For example, I repeat one short paragraph three times, so I become more confident.',
  );
}

async function resetLocalLearningData(page: Page) {
  await page.evaluate(async () => {
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
    if (existingStores.length > 0) {
      const tx = db.transaction(existingStores, 'readwrite');
      const txComplete = new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
      await Promise.all(existingStores.map((store) => requestToPromise(tx.objectStore(store).clear())));
      await txComplete;
    }
    db.close();
  });
}

test('MVP critical reading flow persists local learning evidence', async ({ page }) => {
  await registerAndEnterApp(page, 'mvp-reading');
  await resetLocalLearningData(page);
  await page.reload();

  await expect(page.getByRole('heading', { name: '今日训练' })).toBeVisible();
  await page.getByRole('button', { name: '专项练习' }).click();
  await page.getByRole('button', { name: /开始仔细阅读训练/ }).first().click();

  for (let index = 0; index < 5; index += 1) {
    await page.getByRole('button', { name: /^A / }).click();
    await page.getByText('非常有把握').click();
    await page.getByRole('button', { name: '提交此题并查看错因诊断' }).click();
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
  await expect(page.getByRole('heading', { name: '第 1 步：主动回忆' })).toBeVisible();
  await page.getByTestId('review-recall-answer').fill('I remember the key sentence and the mistake reason.');
  await page.getByRole('button', { name: /完成主动回忆，进入挖空/ }).click();
  await expect(page.getByRole('heading', { name: '第 2 步：挖空补全' })).toBeVisible();
  await page.getByTestId('review-cloze-answer').fill('key phrase');
  await page.getByRole('button', { name: /完成挖空，进入输出/ }).click();
  await expect(page.getByRole('heading', { name: '第 3 步：语境化输出' })).toBeVisible();
  await page.getByTestId('review-production-answer').fill('Active recall improves long-term learning when students use it in context.');
  await page.getByRole('button', { name: /完成复习并安排下次间隔/ }).click();
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
    const tx = db.transaction(['reviewItems', 'skillProfiles', 'practiceSessions', 'attempts'], 'readonly');
    const items = await requestToPromise(tx.objectStore('reviewItems').getAll());
    const reviewProfile = await requestToPromise(tx.objectStore('skillProfiles').get('cet4-reading-review'));
    const reviewSessions = await requestToPromise(tx.objectStore('practiceSessions').getAll());
    const reviewAttempts = await requestToPromise(tx.objectStore('attempts').getAll());
    db.close();
    return {
      reviewed: items.some((item) => Boolean(item.lastReviewedAt) && item.masteryScore > 35),
      reviewProfile,
      reviewSession: reviewSessions.find((session) => session.moduleId === 'review'),
      reviewAttempt: reviewAttempts.find((attempt) => attempt.moduleId === 'review'),
    };
  });

  expect(reviewedEvidence.reviewed).toBeTruthy();
  expect(reviewedEvidence.reviewProfile).toMatchObject({
    skillArea: 'reading',
  });
  expect(reviewedEvidence.reviewSession).toMatchObject({
    moduleId: 'review',
    modeId: 'active-recall-cloze-production',
    status: 'completed',
  });
  expect(reviewedEvidence.reviewAttempt).toMatchObject({
    moduleId: 'review',
    questionTypeId: 'active-recall-cloze-production',
    isCorrect: true,
  });
  expect(reviewedEvidence.reviewAttempt.answer).toMatchObject({
    recallAnswer: 'I remember the key sentence and the mistake reason.',
    clozeAnswer: 'key phrase',
    productionAnswer: 'Active recall improves long-term learning when students use it in context.',
  });
});

test('review gate blocks new practice until the daily spaced-review minimum is completed', async ({ page }) => {
  await registerAndEnterApp(page, 'mvp-review-gate');
  await resetLocalLearningData(page);
  await page.reload();
  await expect(page.getByRole('heading', { name: '今日训练' })).toBeVisible();

  await page.evaluate(async () => {
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
    const tx = db.transaction(['reviewItems'], 'readwrite');
    await requestToPromise(tx.objectStore('reviewItems').put({
      id: 'gate-review-1',
      title: '同义替换错因强制复习',
      category: '错题',
      detail: '先用自己的话回忆同义替换线索，再进入新题训练。',
      daysAgo: 0,
      targetType: 'question',
      targetId: 'gate-question-1',
      examId: 'cet4',
      moduleId: 'reading',
      skillArea: 'reading',
      masteryScore: 35,
      priorityScore: 95,
      reviewIntervalDays: 1,
      nextReviewAt: new Date(Date.now() - 86_400_000).toISOString(),
      createdAt: new Date().toISOString(),
    }));
    db.close();
  });

  await page.reload();
  await expect(page.getByTestId('review-gate-banner')).toBeVisible();

  await page.getByRole('button', { name: '专项练习' }).click();
  await expect(page.getByRole('heading', { name: /先完成到期复习/ })).toBeVisible();
  await page.getByRole('button', { name: '开始强制复习' }).click();
  await expect(page.getByTestId('review-gate-status')).toBeVisible();

  await page.getByRole('button', { name: '开始复习' }).click();
  await page.getByTestId('review-recall-answer').fill('I remember the synonym replacement mistake.');
  await page.getByRole('button', { name: /完成主动回忆，进入挖空/ }).click();
  await page.getByTestId('review-cloze-answer').fill('synonym replacement');
  await page.getByRole('button', { name: /完成挖空，进入输出/ }).click();
  await page.getByTestId('review-production-answer').fill('I will locate synonym replacement before choosing the answer.');
  await page.getByRole('button', { name: /完成复习并安排下次间隔/ }).click();

  await page.getByRole('button', { name: '专项练习' }).click();
  await expect(page.getByRole('heading', { name: /专项练习/ })).toBeVisible();
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

  await registerAndEnterApp(page, 'mvp-speaking');
  await resetLocalLearningData(page);
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
  await registerAndEnterApp(page, 'mvp-diagnostic');
  await resetLocalLearningData(page);
  await page.reload();

  await page.getByRole('button', { name: '入门能力诊断' }).click();
  await page.getByRole('button', { name: '开始诊断' }).click();
  await expect(page.getByRole('heading', { name: '学习目标设置' })).toBeVisible();
  await page.getByRole('button', { name: '上一步' }).click();
  await expect(page.getByRole('heading', { name: /入门诊断/ })).toBeVisible();
  await page.getByRole('button', { name: '开始诊断' }).click();
  await page.getByRole('button', { name: '进入真实诊断' }).click();
  await expect(page.getByRole('heading', { name: '真实小题诊断' })).toBeVisible();
  await page.getByRole('button', { name: '上一步' }).click();
  await expect(page.getByRole('heading', { name: '学习目标设置' })).toBeVisible();
  await page.getByRole('button', { name: '进入真实诊断' }).click();
  await answerOnboardingDiagnostic(page);
  await page.getByRole('button', { name: '提交诊断并生成画像' }).click();

  await expect(page.getByRole('heading', { name: '您的能力画像已生成' })).toBeVisible({ timeout: 7_000 });
  await expect(page.getByTestId('diagnostic-score-reading')).toContainText('42');
  await page.getByRole('button', { name: /开启今日训练/ }).click();
  await expect(page.getByRole('heading', { name: '今日训练' })).toBeVisible();
  await expect(page.getByText('核心词汇听音与语块记忆')).toBeVisible();

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
    const tx = db.transaction(['studyGoals', 'practiceSessions', 'attempts', 'reviewItems', 'skillProfiles'], 'readonly');
    const goal = await requestToPromise(tx.objectStore('studyGoals').get('goal-cet4-primary'));
    const sessions = await requestToPromise(tx.objectStore('practiceSessions').count());
    const attempts = await requestToPromise(tx.objectStore('attempts').count());
    const reviewItems = await requestToPromise(tx.objectStore('reviewItems').count());
    const skillProfiles = await requestToPromise(tx.objectStore('skillProfiles').getAll());
    db.close();
    return { goal, sessions, attempts, reviewItems, skillProfiles };
  });

  expect(result.goal).toMatchObject({
    targetScore: 550,
    dailyMinutes: 45,
  });
  expect(result.sessions).toBe(1);
  expect(result.attempts).toBe(5);
  expect(result.reviewItems).toBeGreaterThanOrEqual(1);
  expect(result.skillProfiles).toHaveLength(5);
  expect(result.skillProfiles.find((profile: { skillArea: string }) => profile.skillArea === 'reading')).toMatchObject({
    score: 42,
    evidenceCount: 1,
  });
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

  await registerAndEnterApp(page, 'mvp-translation');
  await resetLocalLearningData(page);
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

test('vocabulary practice plays audio controls, scores answers, and persists review evidence', async ({ page }) => {
  await page.addInitScript(() => {
    const calls: string[] = [];
    (window as any).__speechSynthesisCalls = calls;
    (window as any).SpeechSynthesisUtterance = function MockSpeechSynthesisUtterance(this: any, text: string) {
      this.text = text;
      this.lang = '';
      this.rate = 1;
      this.onend = null;
      this.onerror = null;
    };
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: {
        cancel() {},
        getVoices() {
          return [];
        },
        speak(utterance: any) {
          calls.push(String(utterance.text ?? ''));
          window.setTimeout(() => utterance.onend?.(new Event('end')), 0);
        },
      },
    });
  });

  await registerAndEnterApp(page, 'mvp-vocabulary');
  await resetLocalLearningData(page);
  await page.reload();

  await page.getByRole('button', { name: '专项练习' }).click();
  await expect(page.getByRole('heading', { name: /专项练习/ })).toBeVisible();
  await expect(page.getByText(`核心词汇 ${CET4_VOCABULARY_BANK.length} 个`)).toBeVisible();
  await page.getByRole('button', { name: '开始单词练习' }).click();

  await expect(page.getByRole('heading', { name: CET4_VOCABULARY_BANK[0].word })).toBeVisible();
  await expect(page.getByTestId('vocabulary-auto-speech-status')).toContainText('自动播报');
  await expect.poll(async () => page.evaluate(() => (window as any).__speechSynthesisCalls?.length ?? 0)).toBeGreaterThanOrEqual(1);
  const firstSpeechText = await page.evaluate(() => (window as any).__speechSynthesisCalls?.[0] ?? '');
  expect(firstSpeechText).toContain(CET4_VOCABULARY_BANK[0].word);
  await page.getByRole('button', { name: '播放例句' }).click();

  const vocabularySessionItems = CET4_VOCABULARY_BANK.slice(0, VOCABULARY_SESSION_SIZE);

  for (const item of vocabularySessionItems) {
    await expect(page.getByRole('heading', { name: item.word })).toBeVisible();
    const answerButton = page.getByRole('button', { name: new RegExp(`^${item.correctAnswer}\\. `) });
    await answerButton.click();
    await page.getByRole('button', { name: '有把握' }).click();
    await page.getByRole('button', { name: '提交词汇答案' }).click();
    await expect(page.getByText(`正确答案：${item.correctAnswer}`)).toBeVisible();
    await page.getByRole('button', { name: item === vocabularySessionItems.at(-1) ? '完成词汇练习' : '进入下一个单词' }).click();
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

    const tx = db.transaction(['practiceSessions', 'attempts', 'skillProfiles'], 'readonly');
    const sessions = await requestToPromise(tx.objectStore('practiceSessions').count());
    const attempts = await requestToPromise(tx.objectStore('attempts').count());
    const skillProfiles = await requestToPromise(tx.objectStore('skillProfiles').getAll());
    db.close();
    return { sessions, attempts, skillProfiles };
  });

  expect(counts.sessions).toBe(1);
  expect(counts.attempts).toBe(vocabularySessionItems.length);
  expect(counts.skillProfiles.find((profile: { skillArea: string }) => profile.skillArea === 'vocabulary')).toMatchObject({
    score: 100,
    evidenceCount: vocabularySessionItems.length,
  });
});

test('staged mock exam covers CET-4 modules and persists score evidence', async ({ page }) => {
  await registerAndEnterApp(page, 'mvp-mock');
  await resetLocalLearningData(page);
  await page.reload();

  await page.getByRole('button', { name: /^阶段模考$/ }).click();
  await expect(page.getByRole('heading', { name: CET4_MOCK_EXAM.title })).toBeVisible();
  await page.getByTestId('mock-writing-answer').fill(
    'Consistent practice is useful because students can receive feedback and improve step by step. For example, I write a short paragraph every day and review grammar mistakes after class.',
  );
  for (const question of [...CET4_MOCK_EXAM.listening.questions, ...CET4_MOCK_EXAM.reading.questions]) {
    await page.getByTestId(`mock-choice-${question.id}-${question.correctAnswer}`).click();
  }
  await page.getByTestId('mock-translation-answer').fill(
    'More and more college students use digital tools to learn English. Effective tools should not only give answers, but also help students find mistakes, actively recall knowledge and review at the right time.',
  );
  await page.getByTestId('mock-exam-submit').click();
  await expect(page.getByTestId('mock-exam-result')).toBeVisible();
  await page.getByTestId('mock-exam-persist').click();
  await expect(page.getByRole('heading', { name: '能力地图' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '阶段提分验证' })).toBeVisible();
  await expect(page.getByText('阶段提分验证待建立')).toBeVisible();

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
    const tx = db.transaction(['practiceSessions', 'attempts', 'skillProfiles'], 'readonly');
    const sessions = await requestToPromise(tx.objectStore('practiceSessions').getAll());
    const attempts = await requestToPromise(tx.objectStore('attempts').count());
    const skillProfiles = await requestToPromise(tx.objectStore('skillProfiles').getAll());
    db.close();
    return { sessions, attempts, skillProfiles };
  });

  expect(result.sessions.some((session: { modeId: string }) => session.modeId === 'cet4-standard-mock')).toBeTruthy();
  expect(result.attempts).toBe(CET4_MOCK_EXAM.listening.questions.length + CET4_MOCK_EXAM.reading.questions.length + 2);
  expect(result.skillProfiles.map((profile: { skillArea: string }) => profile.skillArea).sort()).toEqual([
    'listening',
    'reading',
    'translation',
    'writing',
  ]);
});

test('application shell loads without browser console errors', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text());
    }
  });

  await registerAndEnterApp(page, 'mvp-console');
  await expect(page.getByRole('heading', { name: '今日训练' })).toBeVisible();

  expect(consoleErrors).toEqual([]);
});

test('API health, planning, and AI contracts are reachable from production build', async ({ request }) => {
  const health = await request.get('/api/health');
  expect(health.ok()).toBeTruthy();
  const { token } = await registerApiAccount(request, 'mvp-api');

  const plan = await request.post('/api/study/daily-plan', {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      goal: {
        id: 'goal-cet4-primary',
        examId: 'cet4',
        examDate: '2026-06-13',
        dailyMinutes: 60,
        prioritySkills: ['reading', 'speaking'],
      },
    },
  });
  expect(plan.ok()).toBeTruthy();
  expect((await plan.json()).plan.tasks.length).toBeGreaterThan(0);

  const badAiMaterialRequest = await request.post('/api/ai/generate-passage', {
    headers: { Authorization: `Bearer ${token}` },
    data: { topic: '' },
  });
  expect(badAiMaterialRequest.status()).toBe(400);

  const badAiSpeechRequest = await request.post('/api/ai/analyze-speech', {
    headers: { Authorization: `Bearer ${token}` },
    data: {},
  });
  expect(badAiSpeechRequest.status()).toBe(400);
});

test('JSON material import enters a validated reading practice', async ({ page }) => {
  await registerAndEnterApp(page, 'mvp-material');
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
  await registerAndEnterApp(page, 'mvp-sections');

  await page.getByRole('button', { name: '专项练习' }).click();
  await expect(page.getByRole('heading', { name: /专项练习/ })).toBeVisible();
  await expect(page.getByRole('button', { name: '开始单词练习' })).toBeVisible();
  await expect(page.getByRole('button', { name: /开始仔细阅读训练/ }).first()).toBeVisible();

  await page.getByRole('button', { name: /^阶段模考$/ }).click();
  await expect(page.getByRole('heading', { name: CET4_MOCK_EXAM.title })).toBeVisible();
  await expect(page.getByTestId('mock-exam-submit')).toBeVisible();

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
  await registerAndEnterApp(page, 'mvp-local-data');
  await resetLocalLearningData(page);
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
