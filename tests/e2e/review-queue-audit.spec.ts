import { expect, test, type Page } from '@playwright/test';
import { registerAndEnterApp } from './helpers/auth';

const REVIEW_ID = 'review-audit-confirmation-1';
const LOCAL_REVIEW_SAVE_FAILURE = '复习记录未能写入本地，本次未计入完成，请检查浏览器存储后重试。';

async function clearReviewEvidence(page: Page) {
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('english-training-cabin');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const stores = ['practiceSessions', 'attempts', 'reviewItems', 'skillProfiles']
      .filter((store) => db.objectStoreNames.contains(store));
    const tx = db.transaction(stores, 'readwrite');
    await Promise.all(stores.map((store) => new Promise<void>((resolve, reject) => {
      const request = tx.objectStore(store).clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    })));
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
    db.close();
  });
}

async function seedDueReviewItem(page: Page, reviewId = REVIEW_ID) {
  await page.evaluate((reviewId) => {
    const item = {
      id: reviewId,
      title: 'Reading mistake: evidence location',
      category: '错题',
      detail: 'Locate the evidence sentence before choosing an answer.',
      daysAgo: 0,
      targetType: 'question',
      targetId: 'review-audit-question-1',
      examId: 'cet4',
      moduleId: 'reading',
      skillArea: 'reading',
      masteryScore: 35,
      priorityScore: 95,
      reviewIntervalDays: 1,
      nextReviewAt: new Date(Date.now() - 86_400_000).toISOString(),
      createdAt: new Date().toISOString(),
      redoQuestion: {
        kind: 'single-choice',
        prompt: 'Which option best matches the evidence?',
        options: {
          A: 'The correct evidence-based answer',
          B: 'A tempting but unsupported answer',
        },
        correctAnswer: 'A',
        userAnswer: 'B',
      },
      memoryTask: {
        version: 1,
        sourceText: 'The evidence sentence supports the first option.',
        recallPrompt: 'Recall the evidence before reviewing the answer.',
        recallAnswer: 'Find the sentence that directly supports the claim.',
        clozePrompt: 'The evidence sentence supports the ____ option.',
        clozeAnswer: 'first',
        chunks: ['evidence sentence'],
        productionPrompt: 'Use the evidence-first strategy in a new question.',
        methodNotes: ['Find evidence first.', 'Compare the wording.', 'Then choose.'],
        spacingPlanDays: [1, 3, 7],
      },
      learningMethod: 'wrong-question-redo-active-recall',
    };

    return new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('english-training-cabin');
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction(['reviewItems'], 'readwrite');
        const put = tx.objectStore('reviewItems').put(item);
        put.onerror = () => reject(put.error);
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      };
    });
  }, reviewId);
}

async function deleteReviewItem(page: Page, reviewId = REVIEW_ID) {
  await page.evaluate((reviewId) => {
    return new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('english-training-cabin');
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction(['reviewItems'], 'readwrite');
        const deletion = tx.objectStore('reviewItems').delete(reviewId);
        deletion.onerror = () => reject(deletion.error);
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      };
    });
  }, reviewId);
}

async function seedMemoryOnlyReviewItem(page: Page, reviewId: string) {
  await page.evaluate((reviewId) => {
    const item = {
      id: reviewId,
      title: '表达复习：证据优先',
      category: '句式',
      detail: 'Use the evidence-first method before committing to an answer.',
      daysAgo: 0,
      targetType: 'expression',
      targetId: reviewId,
      examId: 'cet4',
      moduleId: 'reading',
      skillArea: 'reading',
      masteryScore: 40,
      priorityScore: 75,
      reviewIntervalDays: 1,
      nextReviewAt: new Date(Date.now() - 86_400_000).toISOString(),
      createdAt: new Date().toISOString(),
      memoryTask: {
        version: 1,
        sourceText: 'Evidence comes before commitment.',
        recallPrompt: 'Recall the strategy without looking at the original question.',
        recallAnswer: 'Find the sentence that directly supports the claim.',
        clozePrompt: 'Evidence comes before ____.',
        clozeAnswer: 'commitment',
        chunks: ['evidence first'],
        productionPrompt: 'Use the evidence-first strategy in a new question.',
        methodNotes: ['Recall the method.', 'Fill the key word.', 'Produce a new sentence.'],
        spacingPlanDays: [1, 3, 7],
      },
      learningMethod: 'active-recall-cloze-production',
    };

    return new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('english-training-cabin');
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction(['reviewItems'], 'readwrite');
        const put = tx.objectStore('reviewItems').put(item);
        put.onerror = () => reject(put.error);
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      };
    });
  }, reviewId);
}

async function readReviewEvidence(page: Page, reviewId = REVIEW_ID) {
  return page.evaluate(async (reviewId) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('english-training-cabin');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const readAll = (store: string) => new Promise<unknown[]>((resolve, reject) => {
      const request = db.transaction([store], 'readonly').objectStore(store).getAll();
      request.onsuccess = () => resolve(request.result as unknown[]);
      request.onerror = () => reject(request.error);
    });
    const [items, attempts, sessions] = await Promise.all([
      readAll('reviewItems'),
      readAll('attempts'),
      readAll('practiceSessions'),
    ]);
    db.close();
    const item = items.find((value) => (value as { id?: string }).id === reviewId) as {
      masteryScore?: number;
      retrievalCount?: number;
      nextReviewAt?: string;
    } | undefined;
    return {
      item,
      attempts: attempts.filter((value) => (value as { answer?: { reviewItemId?: string } }).answer?.reviewItemId === reviewId),
      sessions: sessions.filter((value) => (value as { moduleId?: string; questionIds?: string[] }).moduleId === 'review'),
    };
  }, reviewId);
}

test('review completion stays idempotent while cloud confirmation is pending', async ({ page }) => {
  await registerAndEnterApp(page, 'review-confirmation-retry');
  await clearReviewEvidence(page);
  await seedDueReviewItem(page);
  await page.reload();

  await page.getByRole('button', { name: '复习队列' }).click();
  await expect(page.getByTestId('review-direct-card')).toBeVisible();
  await page.getByTestId('review-redo-choice-A').click();

  await page.route('**/api/cloud/learning-entities', async (route) => {
    if (route.request().method() === 'PUT') {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'injected failure' }),
      });
      return;
    }
    await route.continue();
  });

  await page.getByTestId('review-outcome-mastered').click();
  await expect(page.getByTestId('review-direct-card')).toHaveCount(0);
  await expect(page.getByText(LOCAL_REVIEW_SAVE_FAILURE)).toHaveCount(0);
  await expect(page.getByRole('status')).toContainText('服务器未确认，正在自动重试');

  const pendingEvidence = await readReviewEvidence(page);
  expect(pendingEvidence.attempts).toHaveLength(1);
  expect(pendingEvidence.sessions).toHaveLength(1);
  expect(pendingEvidence.item).toMatchObject({ masteryScore: 60, retrievalCount: 1 });

  await page.unroute('**/api/cloud/learning-entities');
  await page.getByRole('button', { name: '立即重试服务器同步' }).click();
  await expect(page.getByRole('status')).toContainText('学习记录与草稿已保存到服务器', { timeout: 10_000 });

  const token = await page.evaluate(() => localStorage.getItem('english-training-cabin:saas-token'));
  const cloudEntity = await page.evaluate(async ({ token, reviewId }) => {
    const response = await fetch('/api/cloud/learning-entities', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await response.json() as { entities?: Array<{ entityId: string; payload: unknown }> };
    return body.entities?.find((entity) => entity.entityId === reviewId)?.payload;
  }, { token, reviewId: REVIEW_ID });
  expect(cloudEntity).toMatchObject({ masteryScore: 60, retrievalCount: 1 });

  await page.reload();
  await page.getByRole('button', { name: '复习队列' }).click();
  await expect(page.getByTestId('review-direct-card')).toHaveCount(0);
  const restoredEvidence = await readReviewEvidence(page);
  expect(restoredEvidence.attempts).toHaveLength(1);
  expect(restoredEvidence.sessions).toHaveLength(1);
});

test('local review save failure keeps the active card and does not claim cloud retry', async ({ page }) => {
  await registerAndEnterApp(page, 'review-local-save-failure');
  await clearReviewEvidence(page);
  await seedDueReviewItem(page);
  await page.reload();

  await page.getByRole('button', { name: '复习队列' }).click();
  await expect(page.getByTestId('review-direct-card')).toBeVisible();
  await page.getByTestId('review-redo-choice-A').click();
  await deleteReviewItem(page);

  await page.getByTestId('review-outcome-mastered').click();
  await expect(page.getByText(LOCAL_REVIEW_SAVE_FAILURE)).toBeVisible();
  await expect(page.getByRole('status')).not.toContainText('服务器未确认，正在自动重试');
  await expect(page.getByTestId('review-direct-card')).toBeVisible();

  const failedEvidence = await readReviewEvidence(page);
  expect(failedEvidence.attempts).toHaveLength(0);
  expect(failedEvidence.sessions).toHaveLength(0);
});

test('rapid repeated completion only records one review attempt', async ({ page }) => {
  const repeatReviewId = 'review-audit-repeat-click-1';
  await registerAndEnterApp(page, 'review-repeat-completion');
  await clearReviewEvidence(page);
  await seedDueReviewItem(page, repeatReviewId);
  await page.reload();

  await page.getByRole('button', { name: '复习队列' }).click();
  await expect(page.getByTestId('review-direct-card')).toBeVisible();
  await page.getByTestId('review-redo-choice-A').click();
  await page.getByTestId('review-outcome-mastered').dblclick();

  await expect(page.getByTestId('review-direct-card')).toHaveCount(0);
  const evidence = await readReviewEvidence(page, repeatReviewId);
  expect(evidence.attempts).toHaveLength(1);
  expect(evidence.sessions).toHaveLength(1);
  expect(evidence.item).toMatchObject({ retrievalCount: 1 });
});

test('memory-only review completes through recall feedback without a redo question', async ({ page }) => {
  const memoryReviewId = 'review-audit-memory-only-1';
  await registerAndEnterApp(page, 'review-memory-only');
  await clearReviewEvidence(page);
  await seedMemoryOnlyReviewItem(page, memoryReviewId);
  await page.reload();

  await page.getByRole('button', { name: '复习队列' }).click();
  await expect(page.getByTestId('review-direct-card')).toBeVisible();
  await expect(page.getByTestId('review-direct-feedback')).toBeVisible();
  await expect(page.getByTestId('review-redo-text-answer')).toHaveCount(0);
  await page.getByTestId('review-note-answer').fill('先找证据，再做判断。');
  await page.getByTestId('review-outcome-unclear').click();

  await expect(page.getByTestId('review-direct-card')).toHaveCount(0);
  const evidence = await readReviewEvidence(page, memoryReviewId);
  expect(evidence.attempts).toHaveLength(1);
  expect(evidence.sessions).toHaveLength(1);
  expect(evidence.item).toMatchObject({ masteryScore: 55, retrievalCount: 1 });
});
