import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { CET4_VOCABULARY_BANK, VOCABULARY_SESSION_SIZE } from '../../src/data';
import {
  CET4_CLOZE_PRACTICE_QUESTIONS,
  CET4_GRAMMAR_PRACTICE_QUESTIONS,
  CET4_LISTENING_PRACTICE_QUESTIONS,
  CET4_MOCK_EXAM,
  CET4_MOCK_EXAM_BANK,
  CET4_READING_BANK,
  CET4_TRANSLATION_PROMPT_BANK,
  CET4_WRITING_PROMPT_BANK,
} from '../../src/questionBank';
import { registerAndEnterApp, registerApiAccount } from './helpers/auth';

const universalDiagnosticTextAnswer =
  'With the development of online learning, more college students can arrange their study time flexibly. To reduce exam pressure, students should divide review tasks into several small steps. In my opinion, regular review and AI tools are useful because students can get feedback. For example, I often make grammar mistakes in English practice, so next time I will correct them carefully and explain my answer more naturally.';

function createSilentWavBuffer() {
  const sampleRate = 8_000;
  const durationSeconds = 0.12;
  const sampleCount = Math.floor(sampleRate * durationSeconds);
  const dataSize = sampleCount * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  return buffer;
}

async function clickDiagnosticOptions(page: Page, optionNames: RegExp[]) {
  let clicked = 0;
  for (const optionName of optionNames) {
    const options = page.getByRole('button', { name: optionName });
    const count = await options.count();
    for (let index = 0; index < count; index += 1) {
      await options.nth(index).click();
      clicked += 1;
    }
  }

  if (clicked === 0) {
    throw new Error(`Diagnostic option not found: ${optionNames.map(String).join(', ')}`);
  }
}

async function fillDiagnosticTextItems(page: Page) {
  const textareas = page.locator('textarea');
  const count = await textareas.count();
  for (let index = 0; index < count; index += 1) {
    await textareas.nth(index).fill(universalDiagnosticTextAnswer);
  }
}

async function answerOnboardingDiagnostic(page: Page) {
  await clickDiagnosticOptions(page, [
    /A\. They mainly protect old books/,
    /A\. Reading notes passively/,
    /A\. Copying the full lecture word for word/,
  ]);
  await clickDiagnosticOptions(page, [
    /C\. Join the online workshop/,
    /D\. Check his email and join the workshop online/,
    /B\. Meet at one thirty in the café near the gate/,
  ]);
  await clickDiagnosticOptions(page, [/A\. suitable/, /B\. accessible/, /C\. relevant/]);
  await clickDiagnosticOptions(page, [/C\. to review$/, /B\. reviewing$/, /A\. write$/]);
  await fillDiagnosticTextItems(page);
}

async function answerGrammarWeakDiagnostic(page: Page) {
  await clickDiagnosticOptions(page, [
    /B\. They have become flexible learning hubs/,
    /B\. Closing the book, recalling key ideas, and checking missed points/,
    /C\. Keeping the main idea, one example, and one question/,
  ]);
  await clickDiagnosticOptions(page, [
    /C\. Join the online workshop and submit outlines before Friday/,
    /D\. Check his email and join the workshop online/,
    /B\. Meet at one thirty in the café near the gate/,
  ]);
  await clickDiagnosticOptions(page, [/A\. suitable/, /B\. accessible/, /C\. relevant/]);
  await clickDiagnosticOptions(page, [/A\. review$/, /B\. writing$/]);
  await fillDiagnosticTextItems(page);
}

async function resetLocalLearningData(page: Page) {
  await page.evaluate(async () => {
    Object.keys(localStorage)
      .filter((key) => key.startsWith('english-training-cabin:practice-draft'))
      .forEach((key) => localStorage.removeItem(key));

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

async function installServerTtsSuccessMock(page: Page) {
  let requestCount = 0;
  await page.route('**/api/practice/tts', async (route) => {
    requestCount += 1;
    await route.fulfill({
      contentType: 'audio/wav',
      body: createSilentWavBuffer(),
    });
  });
  return {
    requestCount: () => requestCount,
  };
}

async function submitVisibleChoiceQuestionByOptionText(page: Page, optionText: string) {
  await page.locator('button').filter({ hasText: optionText }).first().click();
  await expect(page.getByTestId('reading-submit')).toBeEnabled();
  await page.getByTestId('reading-submit').click();
  await expect(page.getByTestId('reading-post-answer-support')).toBeVisible();
}

async function installSpeechSynthesisMock(page: Page) {
  await page.route('**/api/practice/tts', async (route) => {
    await route.abort('failed');
  });

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
    let endTimer: number | undefined;
    let activeUtterance: any = null;
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: {
        speaking: false,
        paused: false,
        cancel() {
          if (endTimer) window.clearTimeout(endTimer);
          endTimer = undefined;
          activeUtterance = null;
          this.speaking = false;
          this.paused = false;
        },
        pause() {
          if (!this.speaking) return;
          this.speaking = false;
          this.paused = true;
        },
        resume() {
          if (!this.paused) return;
          this.speaking = true;
          this.paused = false;
        },
        getVoices() {
          return [];
        },
        addEventListener() {},
        removeEventListener() {},
        speak(utterance: any) {
          calls.push(String(utterance.text ?? ''));
          activeUtterance = utterance;
          this.speaking = true;
          this.paused = false;
          endTimer = window.setTimeout(() => {
            if (this.paused || activeUtterance !== utterance) return;
            this.speaking = false;
            activeUtterance = null;
            utterance.onend?.(new Event('end'));
          }, 5_000);
        },
      },
    });
  });
}

async function seedPracticeReplayEvidence(page: Page) {
  const vocabularyItem = CET4_VOCABULARY_BANK[0];
  const listeningQuestion = CET4_LISTENING_PRACTICE_QUESTIONS.find((question) => question.questionTypeId === 'long-conversation');
  const translationPrompt = CET4_TRANSLATION_PROMPT_BANK[0];
  if (!listeningQuestion) throw new Error('Expected a long-conversation listening question');

  await page.evaluate(
    async ({ vocabulary, listening, translation }) => {
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
      const now = new Date().toISOString();
      const sessions = [
        {
          id: 'seed-vocabulary-session',
          examId: 'cet4',
          moduleId: 'vocabulary',
          modeId: 'vocabulary-audio-choice',
          startedAt: now,
          finishedAt: now,
          plannedMinutes: 12,
          questionIds: [vocabulary.id],
          status: 'completed',
        },
        {
          id: 'seed-listening-session',
          examId: 'cet4',
          moduleId: 'listening',
          modeId: 'listening-focus-practice',
          startedAt: now,
          finishedAt: now,
          plannedMinutes: 10,
          questionIds: ['1'],
          status: 'completed',
        },
        {
          id: 'seed-translation-session',
          examId: 'cet4',
          moduleId: 'translation',
          modeId: 'translation-practice',
          startedAt: now,
          finishedAt: now,
          plannedMinutes: 30,
          questionIds: [translation.id],
          status: 'completed',
        },
      ];
      const attempts = [
        {
          id: 'seed-vocabulary-attempt',
          sessionId: 'seed-vocabulary-session',
          questionId: vocabulary.id,
          examId: 'cet4',
          moduleId: 'vocabulary',
          questionTypeId: 'cet4-core-vocabulary',
          answer: vocabulary.correctAnswer,
          isCorrect: true,
          elapsedSeconds: 36,
          confidence: 5,
          mistakeReasons: [],
          createdAt: now,
        },
        {
          id: 'seed-listening-attempt',
          sessionId: 'seed-listening-session',
          questionId: '1',
          examId: 'cet4',
          moduleId: 'listening',
          questionTypeId: 'long-conversation',
          answer: listening.correctAnswer,
          isCorrect: true,
          elapsedSeconds: 42,
          confidence: 5,
          mistakeReasons: [],
          createdAt: now,
        },
        {
          id: 'seed-translation-attempt',
          sessionId: 'seed-translation-session',
          questionId: translation.id,
          examId: 'cet4',
          moduleId: 'translation',
          questionTypeId: translation.questionTypeId,
          answer: 'In recent years, renewable energy has played an increasingly important role in urban development.',
          isCorrect: false,
          elapsedSeconds: 96,
          confidence: 3,
          mistakeReasons: ['中文干扰'],
          aiFeedback: {
            score: 69,
            mistakeReasons: ['中文干扰'],
            comments: ['历史翻译反馈已回显。'],
            nextActions: ['先确定英文主干，再补充修饰成分。'],
            confidence: 'medium',
          },
          createdAt: now,
        },
      ];

      const tx = db.transaction(['practiceSessions', 'attempts'], 'readwrite');
      const txComplete = new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
      await Promise.all([
        ...sessions.map((session) => requestToPromise(tx.objectStore('practiceSessions').put(session))),
        ...attempts.map((attempt) => requestToPromise(tx.objectStore('attempts').put(attempt))),
      ]);
      await txComplete;
      db.close();
    },
    {
      vocabulary: {
        id: vocabularyItem.id,
        correctAnswer: vocabularyItem.correctAnswer,
      },
      listening: {
        correctAnswer: listeningQuestion.correctAnswer,
      },
      translation: {
        id: translationPrompt.id,
        questionTypeId: translationPrompt.questionTypeId,
      },
    },
  );
}

async function seedLegacyVocabularyDraftStatusGap(page: Page) {
  const persistedVocabularyItems = [
    ...CET4_VOCABULARY_BANK.slice(135, 240),
    ...CET4_VOCABULARY_BANK.slice(255),
  ];
  const draftItems = CET4_VOCABULARY_BANK.slice(120, 130);

  await page.evaluate(
    async ({ persistedItems, draftAnswers }) => {
      function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
        return new Promise((resolve, reject) => {
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
      }

      const now = '2026-06-14T10:00:00.000Z';
      localStorage.setItem('english-training-cabin:practice-draft:vocabulary', JSON.stringify({
        version: 1,
        startedAt: now,
        packIndex: 6,
        currentIdx: 9,
        selectedOpt: draftAnswers.at(-1)?.selected ?? 'A',
        confidence: 'sure',
        isSubmitted: true,
        answers: draftAnswers,
        updatedAt: now,
      }));

      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('english-training-cabin');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      const tx = db.transaction(['attempts'], 'readwrite');
      const txComplete = new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
      await Promise.all(persistedItems.map((item, index) => requestToPromise(tx.objectStore('attempts').put({
        id: `legacy-vocabulary-attempt-${index}`,
        sessionId: 'legacy-vocabulary-session',
        questionId: item.id,
        examId: 'cet4',
        moduleId: 'vocabulary',
        questionTypeId: 'cet4-core-vocabulary',
        answer: item.correctAnswer,
        isCorrect: true,
        elapsedSeconds: 10,
        confidence: 5,
        mistakeReasons: [],
        createdAt: '2026-06-14T09:00:00.000Z',
      }))));
      await txComplete;
      db.close();
    },
    {
      persistedItems: persistedVocabularyItems.map((item) => ({
        id: item.id,
        correctAnswer: item.correctAnswer,
      })),
      draftAnswers: draftItems.map((item) => ({
        selected: item.correctAnswer,
        correct: true,
        confidence: 'sure',
      })),
    },
  );
}

async function seedPersistedLegacyVocabularyWrongStatus(page: Page) {
  const wrongItems = CET4_VOCABULARY_BANK.slice(240, 255);

  await page.evaluate(
    async ({ items }) => {
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
      const tx = db.transaction(['attempts'], 'readwrite');
      const txComplete = new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
      await Promise.all(items.map((item, index) => requestToPromise(tx.objectStore('attempts').put({
        id: `persisted-legacy-vocabulary-wrong-${index}`,
        sessionId: 'persisted-legacy-vocabulary-session',
        questionId: item.id,
        examId: 'cet4',
        moduleId: 'vocabulary',
        questionTypeId: 'cet4-core-vocabulary',
        answer: item.correctAnswer,
        isCorrect: true,
        elapsedSeconds: 10,
        confidence: 5,
        mistakeReasons: [],
        createdAt: '2026-06-14T09:00:00.000Z',
      }))));
      await txComplete;
      db.close();
    },
    {
      items: wrongItems.map((item) => ({
        id: item.id,
        correctAnswer: item.correctAnswer,
      })),
    },
  );
}

async function installFailingSpeechSynthesisMock(page: Page) {
  await page.route('**/api/practice/tts', async (route) => {
    await route.fulfill({
      status: 501,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'practice_tts_unavailable' }),
    });
  });

  await page.addInitScript(() => {
    const calls: string[] = [];
    (window as any).__speechSynthesisCalls = calls;
    (window as any).SpeechSynthesisUtterance = function MockSpeechSynthesisUtterance(this: any, text: string) {
      this.text = text;
      this.lang = '';
      this.rate = 1;
      this.voice = null;
      this.onend = null;
      this.onerror = null;
    };
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: {
        speaking: false,
        paused: false,
        cancel() {
          this.speaking = false;
          this.paused = false;
        },
        pause() {
          return undefined;
        },
        resume() {
          return undefined;
        },
        getVoices() {
          return [];
        },
        addEventListener() {},
        removeEventListener() {},
        speak(utterance: any) {
          calls.push(String(utterance.text ?? ''));
          utterance.onerror?.({ error: 'synthesis-failed' });
        },
      },
    });
  });
}

async function chooseComboboxOption(page: Page, label: string, optionName: string | RegExp) {
  await page.getByRole('combobox', { name: label }).click();
  await expect(page.getByRole('listbox')).toBeVisible();
  await page.getByRole('option', { name: optionName }).click();
}

test('MVP critical reading flow persists local learning evidence', async ({ page }) => {
  await installSpeechSynthesisMock(page);
  await registerAndEnterApp(page, 'mvp-reading');
  await resetLocalLearningData(page);
  await page.reload();

  await expect(page.getByRole('heading', { name: '今日训练' })).toBeVisible();
  await page.getByRole('button', { name: '专项练习' }).click();
  await page.getByRole('button', { name: /开始仔细阅读训练/ }).first().click();

  for (let index = 0; index < 5; index += 1) {
    await expect(page.getByTestId('reading-post-answer-support')).toHaveCount(0);
    await expect(page.getByTestId('reading-question-translation')).toHaveCount(0);
    await expect(page.getByTestId('reading-option-translation-A')).toHaveCount(0);
    await expect(page.getByTestId('reading-sentence-translation')).toHaveCount(0);
    await page.getByRole('button', { name: /^A / }).click();
    await page.getByText('非常有把握').click();
    await page.getByRole('button', { name: '提交此题并查看错因诊断' }).click();
    await expect(page.getByTestId('reading-post-answer-support')).toBeVisible();
    await expect(page.getByTestId('reading-question-translation')).toBeVisible();
    await expect(page.getByTestId('reading-question-translation')).not.toContainText('正确答案和定位译文提交后显示');
    await expect(page.getByTestId('reading-option-translation-A')).toBeVisible();
    await expect(page.getByTestId('reading-sentence-translation')).toBeVisible();
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

  const readingQuestionTotal = CET4_READING_BANK.reduce((sum, passage) => sum + passage.questions.length, 0);
  await page.getByRole('button', { name: '今日训练' }).click();
  await page.getByRole('button', { name: /5\s*(?:今日)?已答/ }).click();
  await expect(page.getByRole('heading', { name: '专项练习' })).toBeVisible();
  await expect(page.getByText(`已练 5/${readingQuestionTotal}`)).toBeVisible();
  await expect(page.getByText(`${CET4_READING_BANK.length} 组材料 / ${readingQuestionTotal} 题`)).toBeVisible();
  await page.getByTestId('practice-module-select-reading').click();
  await expect(page.getByRole('button', { name: '已答题目', exact: true })).toHaveCount(0);
  await expect(page.getByTestId('practice-question-status-reading')).toContainText(`已答 5 / ${readingQuestionTotal}`);
  await expect(page.getByTestId('practice-question-status-reading')).toContainText(`未答 ${readingQuestionTotal - 5}`);
  await expect(page.getByTestId('practice-question-filter-reading-all')).toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('practice-question-filter-reading-answered').click();
  await expect(page.getByTestId('practice-question-filter-reading-answered')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('practice-question-status-reading-1')).toBeVisible();
  await expect(page.getByTestId('practice-question-status-reading-5')).toBeVisible();
  await expect(page.getByTestId('practice-question-status-reading-6')).toHaveCount(0);
  await page.getByTestId('practice-question-status-reading-1').click();
  await expect(page.getByTestId('reading-attempt-replayed')).toBeVisible();
  await expect(page.getByTestId('reading-post-answer-support')).toBeVisible();
  await expect(page.getByTestId('reading-submit')).toHaveCount(0);
  await page.getByTestId('reading-back-to-practice').click();
  await page.getByTestId('practice-module-select-reading').click();
  await page.getByTestId('practice-question-filter-reading-unanswered').click();
  await expect(page.getByTestId('practice-question-status-reading-1')).toHaveCount(0);
  await expect(page.getByTestId('practice-question-status-reading-6')).toBeVisible();
  await page.getByTestId('practice-question-filter-reading-all').click();
  await expect(page.getByTestId('practice-question-status-reading-1')).toHaveAttribute('aria-label', /已答/);
  await expect(page.getByTestId('practice-question-status-reading-6')).toHaveAttribute('aria-label', /未答/);
  const sixthReadingQuestion = CET4_READING_BANK
    .flatMap((passage) => passage.questions)
    .at(5);
  expect(sixthReadingQuestion).toBeTruthy();
  await page.getByTestId('practice-question-status-reading-6').click();
  await expect(page.getByText(sixthReadingQuestion!.question)).toBeVisible();
  await page.getByTestId('reading-back-to-practice').click();

  await page.getByRole('button', { name: '复习队列' }).click();
  await expect(page.getByRole('heading', { name: '复习队列' })).toBeVisible();
  await expect(page.getByTestId('review-direct-card')).toHaveCount(0);
  await expect(page.getByText(/还有 \d+ 条未到期复习项/)).toBeVisible();

  const scheduledReviewEvidence = await page.evaluate(async () => {
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
    const tx = db.transaction(['reviewItems', 'practiceSessions', 'attempts'], 'readonly');
    const items = await requestToPromise(tx.objectStore('reviewItems').getAll());
    const reviewSessions = await requestToPromise(tx.objectStore('practiceSessions').getAll());
    const reviewAttempts = await requestToPromise(tx.objectStore('attempts').getAll());
    db.close();
    return {
      reviewItemCount: items.length,
      scheduledCount: items.filter((item) => Boolean(item.nextReviewAt) && new Date(item.nextReviewAt).getTime() > Date.now()).length,
      reviewedCount: items.filter((item) => Boolean(item.lastReviewedAt)).length,
      reviewSessionCount: reviewSessions.filter((session) => session.moduleId === 'review').length,
      reviewAttemptCount: reviewAttempts.filter((attempt) => attempt.moduleId === 'review').length,
    };
  });

  expect(scheduledReviewEvidence.reviewItemCount).toBeGreaterThan(0);
  expect(scheduledReviewEvidence.scheduledCount).toBeGreaterThan(0);
  expect(scheduledReviewEvidence.reviewedCount).toBe(0);
  expect(scheduledReviewEvidence.reviewSessionCount).toBe(0);
  expect(scheduledReviewEvidence.reviewAttemptCount).toBe(0);
});

test('unfinished reading practice resumes from the saved draft position', async ({ page }) => {
  await registerAndEnterApp(page, 'mvp-reading-draft');
  await resetLocalLearningData(page);
  await page.reload();
  const readingQuestionTotal = CET4_READING_BANK.reduce((sum, passage) => sum + passage.questions.length, 0);

  await page.getByRole('button', { name: '专项练习' }).click();
  await page.getByRole('button', { name: /开始仔细阅读训练/ }).first().click();

  await page.getByRole('button', { name: /^A / }).click();
  await page.getByText('非常有把握').click();
  await page.getByRole('button', { name: /提交此题/ }).click();
  await page.getByRole('button', { name: /进入第/ }).click();
  await page.getByRole('button', { name: /返回专项练习/ }).click();

  await page.getByRole('button', { name: /开始仔细阅读训练/ }).first().click();
  await expect(page.getByText('已恢复第 2 题')).toBeVisible();

  await page.getByTestId('reading-back-to-practice').click();
  await expect(page.getByTestId('practice-module-progress-reading')).toContainText(`1/${readingQuestionTotal}`);

  const draft = await page.evaluate(() => {
    const key = Object.keys(localStorage).find((item) => item.startsWith('english-training-cabin:practice-draft:reading:'));
    return key ? JSON.parse(localStorage.getItem(key) ?? 'null') : null;
  });
  expect(draft).toMatchObject({
    currentIdx: 1,
    isSubmitted: false,
  });
});

test('unfinished vocabulary and listening practice resume from saved drafts', async ({ page }) => {
  await installSpeechSynthesisMock(page);
  await registerAndEnterApp(page, 'mvp-specialty-drafts');
  await resetLocalLearningData(page);
  await page.reload();
  const listeningQuestionTotal = CET4_LISTENING_PRACTICE_QUESTIONS
    .filter((question) => question.questionTypeId === 'long-conversation')
    .length;

  await page.getByRole('button', { name: '专项练习' }).click();
  await page.getByRole('button', { name: '开始单词练习' }).click();
  await expect(page.getByTestId('vocabulary-post-answer-support')).toHaveCount(0);
  await expect(page.getByTestId('vocabulary-question-translation')).toHaveCount(0);
  await expect(page.getByTestId('vocabulary-option-translation-A')).toHaveCount(0);
  await expect(page.getByTestId('vocabulary-sentence-translation')).toHaveCount(0);
    await page.getByRole('button', { name: /^A\. / }).click();
    await page.getByRole('button', { name: '有把握' }).click();
    await page.getByRole('button', { name: '提交词汇答案' }).click();
    await expect(page.getByTestId('vocabulary-post-answer-support')).toBeVisible();
    await expect(page.getByTestId('vocabulary-question-translation')).toBeVisible();
    await expect(page.getByTestId('vocabulary-question-translation')).toContainText('听单词和例句后，选择最准确的英文释义');
    await expect(page.getByTestId('vocabulary-option-translation-A')).toBeVisible();
    await expect(page.getByRole('button', { name: /^A\. / })).toContainText('中文：');
    await expect(page.getByTestId('vocabulary-sentence-translation')).toBeVisible();
    await page.getByRole('button', { name: '进入下一个单词' }).click();
  await page.getByRole('button', { name: '返回专项练习' }).click();

  await page.getByRole('button', { name: '开始单词练习' }).click();
  await expect(page.getByText('已恢复到第 1 组 / 第 2 个')).toBeVisible();
  await page.getByRole('button', { name: '返回专项练习' }).click();

  await page.getByRole('button', { name: '开始听力训练' }).click();
  await expect(page.getByTestId('listening-post-answer-support')).toHaveCount(0);
  await expect(page.getByTestId('listening-question-translation')).toHaveCount(0);
  await expect(page.getByTestId('listening-option-translation-A')).toHaveCount(0);
  await expect(page.getByTestId('listening-sentence-translation')).toHaveCount(0);
  await page.getByRole('button', { name: /^A / }).first().click();
  await page.getByRole('button', { name: '高' }).click();
  await page.getByRole('button', { name: '提交答案' }).click();
  await expect(page.getByTestId('listening-post-answer-support')).toBeVisible();
  await expect(page.getByTestId('listening-question-translation')).toBeVisible();
  await expect(page.getByTestId('listening-question-translation')).not.toContainText('正确答案和听力原句译文提交后显示');
  await expect(page.getByTestId('listening-option-translation-A')).toBeVisible();
  await expect(page.getByTestId('listening-sentence-translation')).toBeVisible();
  await page.getByRole('button', { name: '下一题' }).click();
  await page.getByRole('button', { name: '返回专项练习' }).click();

  await page.getByRole('button', { name: '开始听力训练' }).click();
  await expect(page.getByText('已恢复第 2 题')).toBeVisible();

  await page.getByTestId('listening-back-to-practice').click();
  await expect(page.getByTestId('practice-module-progress-vocabulary')).toContainText(`1/${CET4_VOCABULARY_BANK.length}`);
  await expect(page.getByTestId('practice-module-progress-listening')).toContainText(`1/${listeningQuestionTotal}`);

  const drafts = await page.evaluate(() => {
    const readDraft = (suffix: string) => {
      const key = Object.keys(localStorage).find((item) => item.endsWith(suffix));
      return key ? JSON.parse(localStorage.getItem(key) ?? 'null') : null;
    };
    return {
      vocabulary: readDraft(':vocabulary'),
      listening: readDraft(':listening-long-conversation'),
    };
  });
  expect(drafts.vocabulary).toMatchObject({ packIndex: 0, currentIdx: 1 });
  expect(drafts.listening).toMatchObject({ currentQuestionIndex: 1 });
});

test('practice question status numbers open the selected module question', async ({ page }) => {
  await installSpeechSynthesisMock(page);
  await registerAndEnterApp(page, 'mvp-practice-status-jump');
  await resetLocalLearningData(page);
  await page.reload();

  await page.getByRole('button', { name: '专项练习' }).click();

  await page.getByTestId('practice-module-select-vocabulary').click();
  await page.getByTestId('practice-question-status-vocabulary-2').click();
  await expect(page.getByRole('heading', { name: CET4_VOCABULARY_BANK[1].word })).toBeVisible();
  await page.getByTestId('vocabulary-back-to-practice').click();

  const accompanyIndex = CET4_VOCABULARY_BANK.findIndex((item) => item.word === 'accompany');
  expect(accompanyIndex).toBeGreaterThanOrEqual(0);
  const accompanyItem = CET4_VOCABULARY_BANK[accompanyIndex];
  await page.getByTestId('practice-module-select-vocabulary').click();
  await page.getByRole('button', { name: /展开当前筛选/ }).click();
  await page.getByTestId(`practice-question-status-vocabulary-${accompanyIndex + 1}`).click();
  await expect(page.getByRole('heading', { name: 'accompany' })).toBeVisible();
  await expect(page.getByText(accompanyItem.phonetic, { exact: true })).toBeVisible();
  await expect(page.getByText(/发音提示/)).toHaveCount(0);
  await page.getByTestId('vocabulary-back-to-practice').click();

  await page.getByTestId('practice-module-select-listening').click();
  await page.getByTestId('practice-question-status-listening-2').click();
  await expect(page.getByText('Question 2')).toBeVisible();
  await page.getByTestId('listening-back-to-practice').click();

  await page.getByTestId('practice-module-select-grammar').click();
  await expect(page.getByTestId('practice-question-status-grammar')).toBeInViewport();
  await expect(page.getByTestId('practice-method-guide-topic-grammar-tense')).toContainText('时态题');
  await expect(page.getByTestId('practice-method-guide-topic-grammar-voice')).toContainText('语态题');
  await expect(page.getByTestId('practice-question-status-group-grammar-tense')).toContainText('时态题');
  await expect(page.getByTestId('practice-question-status-group-grammar-voice')).toContainText('语态题');
  await page.getByTestId('practice-question-status-grammar-2').click();
  await expect(page.getByText(CET4_GRAMMAR_PRACTICE_QUESTIONS[1].prompt)).toBeVisible();
  await expect(page.getByText('核心考向：时态|现在完成时')).toBeVisible();
  await expect(page.getByTestId('practice-method-guide-topic-grammar-tense')).toContainText('当前考点');
  await page.getByTestId('reading-back-to-practice').click();

  await page.getByTestId('practice-module-select-writing').click();
  await page.getByTestId('practice-question-status-writing-2').click();
  await expect(page.getByText(CET4_WRITING_PROMPT_BANK[1].title, { exact: true })).toBeVisible();
});

test('grammar and cloze specialty questions submit and mark answered immediately', async ({ page }) => {
  await installSpeechSynthesisMock(page);
  await registerAndEnterApp(page, 'mvp-grammar-cloze-submit');
  await resetLocalLearningData(page);
  await page.reload();

  await page.locator('aside button').nth(1).click();

  await page.getByTestId('practice-module-select-grammar').click();
  await page.getByTestId('practice-question-status-grammar-1').click();
  await expect(page.getByText(CET4_GRAMMAR_PRACTICE_QUESTIONS[0].prompt)).toBeVisible();
  await submitVisibleChoiceQuestionByOptionText(page, CET4_GRAMMAR_PRACTICE_QUESTIONS[0].options.A);
  await page.getByTestId('reading-back-to-practice').click();
  await page.getByTestId('practice-module-select-grammar').click();
  await page.getByTestId('practice-question-filter-grammar-answered').click();
  await expect(page.getByTestId('practice-question-status-grammar-1')).toBeVisible();

  await page.getByTestId('practice-module-select-cloze').click();
  await page.getByTestId('practice-question-status-cloze-1').click();
  await expect(page.getByText(CET4_CLOZE_PRACTICE_QUESTIONS[0].prompt)).toBeVisible();
  await submitVisibleChoiceQuestionByOptionText(page, CET4_CLOZE_PRACTICE_QUESTIONS[0].options.A);
  await page.getByTestId('reading-back-to-practice').click();
  await page.getByTestId('practice-module-select-cloze').click();
  await page.getByTestId('practice-question-filter-cloze-answered').click();
  await expect(page.getByTestId('practice-question-status-cloze-1')).toBeVisible();
});

test('answered question status numbers replay saved answer evidence across modules', async ({ page }) => {
  await installSpeechSynthesisMock(page);
  await registerAndEnterApp(page, 'mvp-practice-replay-evidence');
  await resetLocalLearningData(page);
  await seedPracticeReplayEvidence(page);
  await page.reload();

  await page.getByRole('button', { name: '专项练习' }).click();

  await page.getByTestId('practice-module-select-vocabulary').click();
  await page.getByTestId('practice-question-filter-vocabulary-answered').click();
  await page.getByTestId('practice-question-status-vocabulary-1').click();
  await expect(page.getByTestId('vocabulary-attempt-replayed')).toBeVisible();
  await expect(page.getByTestId('vocabulary-post-answer-support')).toBeVisible();
  await expect(page.getByTestId('vocabulary-submit')).toHaveCount(0);
  await page.getByTestId('vocabulary-back-to-practice').click();

  await page.getByTestId('practice-module-select-listening').click();
  await page.getByTestId('practice-question-filter-listening-answered').click();
  await page.getByTestId('practice-question-status-listening-1').click();
  await expect(page.getByTestId('listening-attempt-replayed')).toBeVisible();
  await expect(page.getByTestId('listening-post-answer-support')).toBeVisible();
  await expect(page.getByText('提交答案')).toHaveCount(0);
  await page.getByTestId('listening-back-to-practice').click();

  await page.getByTestId('practice-module-select-translation').click();
  await page.getByTestId('practice-question-filter-translation-answered').click();
  await page.getByTestId('practice-question-status-translation-1').click();
  await expect(page.getByTestId('subjective-attempt-replayed')).toBeVisible();
  await expect(page.locator('textarea')).toContainText('renewable energy');
  await expect(page.getByText('历史翻译反馈已回显。')).toBeVisible();
});

test('legacy vocabulary draft answers keep 121 to 130 answered and 241 to 255 unanswered', async ({ page }) => {
  await installSpeechSynthesisMock(page);
  await registerAndEnterApp(page, 'mvp-legacy-vocabulary-draft-status');
  await resetLocalLearningData(page);
  await seedLegacyVocabularyDraftStatusGap(page);
  await page.reload();

  await page.locator('aside button').nth(1).click();
  await page.getByTestId('practice-module-select-vocabulary').click();
  await page.getByTestId('practice-question-filter-vocabulary-answered').click();

  await expect(page.getByTestId('practice-question-status-vocabulary-121')).toBeVisible();
  await expect(page.getByTestId('practice-question-status-vocabulary-130')).toBeVisible();
  await expect(page.getByTestId('practice-question-status-vocabulary-241')).toHaveCount(0);
  await expect(page.getByTestId('practice-question-status-vocabulary-255')).toHaveCount(0);

  await page.getByTestId('practice-question-status-vocabulary-121').click();
  await expect(page.getByRole('heading', { name: CET4_VOCABULARY_BANK[120].word })).toBeVisible();
  await expect(page.getByTestId('vocabulary-attempt-replayed')).toBeVisible();
  await expect(page.getByTestId('vocabulary-submit')).toHaveCount(0);
});

test('persisted legacy vocabulary status repairs 121 to 130 answered and 241 to 255 unanswered', async ({ page }) => {
  await installSpeechSynthesisMock(page);
  await registerAndEnterApp(page, 'mvp-persisted-legacy-vocabulary-status');
  await resetLocalLearningData(page);
  await seedPersistedLegacyVocabularyWrongStatus(page);
  await page.reload();

  await page.locator('aside button').nth(1).click();
  await page.getByTestId('practice-module-select-vocabulary').click();
  await page.getByTestId('practice-question-filter-vocabulary-answered').click();

  await expect(page.getByTestId('practice-question-status-vocabulary-121')).toBeVisible();
  await expect(page.getByTestId('practice-question-status-vocabulary-130')).toBeVisible();
  await expect(page.getByTestId('practice-question-status-vocabulary-241')).toHaveCount(0);
  await expect(page.getByTestId('practice-question-status-vocabulary-255')).toHaveCount(0);

  const repairedCounts = await page.evaluate(
    async ({ targetIds, wrongIds }) => {
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
      const tx = db.transaction(['attempts'], 'readonly');
      const attempts = await requestToPromise<any[]>(tx.objectStore('attempts').getAll());
      db.close();
      return {
        targetCount: attempts.filter((attempt) => targetIds.includes(attempt.questionId)).length,
        wrongCount: attempts.filter((attempt) => wrongIds.includes(attempt.questionId)).length,
      };
    },
    {
      targetIds: CET4_VOCABULARY_BANK.slice(120, 130).map((item) => item.id),
      wrongIds: CET4_VOCABULARY_BANK.slice(240, 255).map((item) => item.id),
    },
  );

  expect(repairedCounts).toEqual({ targetCount: 10, wrongCount: 0 });
});

test('submitted draft answers count as today records before finishing the session', async ({ page }) => {
  await installSpeechSynthesisMock(page);
  await registerAndEnterApp(page, 'mvp-draft-answer-record');
  await resetLocalLearningData(page);
  await page.reload();

  await page.locator('aside button').nth(1).click();
  await page.getByTestId('practice-module-action-vocabulary').click();
  for (let index = 0; index < 3; index += 1) {
    await page.locator('article.ui-panel button').filter({ hasText: /^A\.|^B\.|^C\.|^D\./ }).first().click();
    await page.getByTestId('vocabulary-confidence-sure').click();
    await page.getByTestId('vocabulary-submit').click();
    await expect(page.getByTestId('vocabulary-post-answer-support')).toBeVisible();
    await expect(page.getByTestId('vocabulary-record-status')).toContainText('已写入作答记录');
    if (index < 2) {
      await page.getByTestId('vocabulary-next').click();
      await expect(page.getByTestId('vocabulary-post-answer-support')).toHaveCount(0);
    }
  }

  const localCounts = await page.evaluate(async () => {
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
    const tx = db.transaction(['practiceSessions', 'attempts'], 'readonly');
    const sessions = await requestToPromise(tx.objectStore('practiceSessions').getAll());
    const attempts = await requestToPromise(tx.objectStore('attempts').getAll());
    db.close();
    const draft = JSON.parse(localStorage.getItem('english-training-cabin:practice-draft:vocabulary') ?? '{}');
    return {
      sessions: sessions.length,
      attempts: attempts.length,
      sessionStatuses: sessions.map((session: { status: string }) => session.status),
      attemptQuestionIds: attempts.map((attempt: { questionId: string }) => attempt.questionId),
      draftAnswerCount: Array.isArray(draft.answers) ? draft.answers.length : 0,
      draftQuestionIds: Array.isArray(draft.answers)
        ? draft.answers.map((answer: { questionId?: string } | undefined) => answer?.questionId)
        : [],
    };
  });

  expect(localCounts).toEqual({
    sessions: 1,
    attempts: 3,
    sessionStatuses: ['active'],
    attemptQuestionIds: CET4_VOCABULARY_BANK.slice(0, 3).map((item) => item.id),
    draftAnswerCount: 3,
    draftQuestionIds: CET4_VOCABULARY_BANK.slice(0, 3).map((item) => item.id),
  });

  await page.getByTestId('vocabulary-back-to-practice').click();
  await expect(page.getByTestId('practice-question-status-vocabulary')).toContainText('已答 3 /');

  await page.getByTestId('practice-module-action-vocabulary').click();
  await expect(page.getByTestId('vocabulary-draft-restored')).toContainText('第 1 组 / 第 3 个');
  await expect(page.getByRole('heading', { name: CET4_VOCABULARY_BANK[2].word })).toBeVisible();
  await expect(page.getByTestId('vocabulary-post-answer-support')).toBeVisible();
  await page.getByTestId('vocabulary-back-to-practice').click();

  await page.locator('aside button').first().click();
  await expect(page.getByTestId('today-answered-question-count')).toHaveText('3');
  await expect(page.getByTestId('motivation-weekly-attempts')).toHaveText('3');
});

/* test.skip('practice hub reflects in-progress draft counts before a module is fully completed', async ({ page }) => {
  await installSpeechSynthesisMock(page);
  await registerAndEnterApp(page, 'mvp-practice-draft-progress');
  await resetLocalLearningData(page);
  await page.reload();

  const listeningQuestionTotal = CET4_LISTENING_PRACTICE_QUESTIONS
    .filter((question) => question.questionTypeId === 'long-conversation')
    .length;

  await page.getByRole('button', { name: '涓撻項缁冧範' }).click();
  await page.getByTestId('practice-module-action-vocabulary').click();
  await page.locator('article.ui-panel button').filter({ hasText: /^A\.|^B\.|^C\.|^D\./ }).first().click();
  await page.getByRole('button', { name: '鏈夋妸鎻? }).click();
  await page.locator('article.ui-panel').getByRole('button', { name: /鎻愪氦/ }).click();
  await page.locator('article.ui-panel').getByRole('button', { name: /涓嬩竴/ }).click();
  await page.locator('header button').first().click();
  await expect(page.getByTestId('practice-module-progress-vocabulary')).toContainText(`1/${CET4_VOCABULARY_BANK.length}`);

  await page.getByTestId('practice-module-action-listening').click();
  await page.getByRole('button', { name: /^A / }).first().click();
  await page.locator('div.grid.w-full.grid-cols-3 button').last().click();
  await page.getByRole('button', { name: /鎻愪氦/ }).click();
  await expect(page.getByTestId('listening-sentence-translation')).toBeVisible();
  await page.getByRole('button', { name: /涓嬩竴/ }).click();
  await page.locator('header button').first().click();
  await expect(page.getByTestId('practice-module-progress-listening')).toContainText(`1/${listeningQuestionTotal}`);
}); */

test('due review reminder does not block grammar practice', async ({ page }) => {
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
      title: '同义替换错因复习',
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
      redoQuestion: {
        kind: 'single-choice',
        prompt: 'Which option best matches the passage?',
        options: {
          A: 'The correct paraphrase',
          B: 'The previous wrong choice',
        },
        correctAnswer: 'A',
        userAnswer: 'B',
      },
      learningMethod: 'wrong-question-redo-active-recall',
    }));
    db.close();
  });

  await page.reload();
  await expect(page.getByTestId('review-gate-banner')).toBeVisible();
  await expect(page.getByTestId('review-gate-banner')).toContainText('今日还有');

  await page.getByRole('button', { name: '专项练习' }).click();
  await expect(page.getByRole('heading', { name: /专项练习/ })).toBeVisible();
  await page.getByRole('button', { name: '开始语法训练' }).click();
  await expect(page.getByRole('heading', { name: '语法与完形填空训练舱' })).toBeVisible();
});

test('review queue hides future wrong-question reviews until they are due', async ({ page }) => {
  await registerAndEnterApp(page, 'mvp-review-future-only');
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
      id: 'future-review-1',
      title: '未来才到期的错题',
      category: '错题',
      detail: '这条错题用于验证未到期复习项不会提前出现在复习队列。',
      daysAgo: 0,
      targetType: 'question',
      targetId: 'future-question-1',
      examId: 'cet4',
      moduleId: 'reading',
      skillArea: 'reading',
      masteryScore: 35,
      priorityScore: 95,
      reviewIntervalDays: 2,
      nextReviewAt: new Date(Date.now() + 2 * 86_400_000).toISOString(),
      createdAt: new Date().toISOString(),
      redoQuestion: {
        kind: 'single-choice',
        prompt: 'Which option best matches the passage?',
        options: {
          A: 'The correct paraphrase',
          B: 'The previous wrong choice',
        },
        correctAnswer: 'A',
        userAnswer: 'B',
      },
      learningMethod: 'wrong-question-redo-active-recall',
    }));
    db.close();
  });

  await page.reload();
  await expect(page.getByRole('heading', { name: '今日训练' })).toBeVisible();
  await expect(page.getByTestId('review-gate-banner')).toHaveCount(0);

  await page.getByRole('button', { name: '复习队列' }).click();
  await expect(page.getByRole('heading', { name: '复习队列' })).toBeVisible();
  await expect(page.getByTestId('review-direct-card')).toHaveCount(0);
  await expect(page.getByText(/先完成专项训练或模考/)).toBeVisible();
  await expect(page.getByText(/还有 1 条未到期复习项/)).toBeVisible();
  await expect(page.getByText('未来才到期的错题')).toHaveCount(0);
});

test('listening practice starts automatic speech playback', async ({ page }) => {
  await installSpeechSynthesisMock(page);
  await registerAndEnterApp(page, 'mvp-listening-auto-speech');
  await resetLocalLearningData(page);
  await page.reload();

  await page.getByRole('button', { name: '专项练习' }).click();
  await page.getByRole('button', { name: '开始听力训练' }).click();

  await expect(page.getByRole('heading', { name: /听力训练 - 长对话/ })).toBeVisible();
  await expect(page.getByTestId('listening-auto-speech-status')).toContainText('自动播报');
  await expect.poll(async () => page.evaluate(() => (window as any).__speechSynthesisCalls?.length ?? 0)).toBeGreaterThanOrEqual(1);
  const firstSpeechText = await page.evaluate(() => (window as any).__speechSynthesisCalls?.[0] ?? '');
  expect(firstSpeechText).toContain(CET4_MOCK_EXAM.listening.transcript.slice(0, 48));
});

test('listening automatic speech requests server TTS audio first', async ({ page }) => {
  const serverTts = await installServerTtsSuccessMock(page);
  await registerAndEnterApp(page, 'mvp-listening-server-tts');
  await resetLocalLearningData(page);
  await page.reload();

  await page.getByRole('button', { name: '专项练习' }).click();
  await page.getByRole('button', { name: '开始听力训练' }).click();

  await expect(page.getByRole('heading', { name: /听力训练 - 长对话/ })).toBeVisible();
  await expect.poll(serverTts.requestCount).toBeGreaterThanOrEqual(1);
});

test('MVP critical speaking retell flow persists review and ability evidence', async ({ page }) => {
  await installSpeechSynthesisMock(page);
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
  await page.getByRole('button', { name: '朗读改写版本' }).click();
  await expect(page.getByRole('button', { name: '暂停朗读' })).toBeVisible();
  await page.getByRole('button', { name: '暂停朗读' }).click();
  await expect(page.getByRole('button', { name: '继续朗读' })).toBeVisible();
  await page.getByRole('button', { name: '继续朗读' }).click();
  await expect(page.getByRole('button', { name: '暂停朗读' })).toBeVisible();
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
  await installSpeechSynthesisMock(page);
  await registerAndEnterApp(page, 'mvp-diagnostic');
  await resetLocalLearningData(page);
  await page.reload();

  await page.getByRole('button', { name: '入门能力诊断' }).click();
  await expect(page.getByText('当前完整训练闭环先开放 CET-4。')).toBeVisible();
  await expect(page.getByTestId('diagnostic-exam-select')).toContainText('大学英语四级');
  await page.getByRole('button', { name: '开始诊断' }).click();
  await expect(page.getByRole('heading', { name: '学习目标设置' })).toBeVisible();
  await expect(page.getByText('当前题库：大学英语四级')).toBeVisible();
  await page.getByRole('button', { name: '上一步' }).click();
  await expect(page.getByRole('heading', { name: /入门诊断/ })).toBeVisible();
  await page.getByRole('button', { name: '开始诊断' }).click();
  await page.getByRole('button', { name: '进入真实诊断' }).click();
  await expect(page.getByRole('heading', { name: '真实小题诊断' })).toBeVisible();
  await expect(page.getByTestId('diagnostic-speaking-start-recording')).toBeVisible();
  await expect(page.getByText('录音只保存在当前页面')).toBeVisible();
  await expect(page.getByTestId('diagnostic-listening-voice-status').first()).toBeVisible();
  await expect(page.getByTestId('diagnostic-unanswered-warning')).toContainText('还有 11 题未作答');
  await expect(page.getByRole('button', { name: '提交诊断并生成基线' })).toBeEnabled();
  await expect(page.getByText('中文辅助')).toHaveCount(0);
  await expect(page.getByText('中文题意')).toHaveCount(0);
  await page.getByRole('button', { name: '播放男女声听力材料' }).first().click();
  await expect(page.getByRole('button', { name: '暂停男女声听力材料' })).toBeVisible();
  await page.getByRole('button', { name: '暂停男女声听力材料' }).click();
  await expect(page.getByRole('button', { name: '继续男女声听力材料' })).toBeVisible();
  await page.getByRole('button', { name: '继续男女声听力材料' }).click();
  await expect(page.getByRole('button', { name: '暂停男女声听力材料' })).toBeVisible();
  await page.getByRole('button', { name: '上一步' }).click();
  await expect(page.getByRole('heading', { name: '学习目标设置' })).toBeVisible();
  await page.getByRole('button', { name: '进入真实诊断' }).click();
  await answerOnboardingDiagnostic(page);
  await page.getByRole('button', { name: '提交诊断并生成基线' }).click();

  await expect(page.getByRole('heading', { name: '您的客观基线已生成' })).toBeVisible({ timeout: 7_000 });
  await expect(page.getByTestId('diagnostic-nonofficial-notice')).toContainText('非官方诊断');
  await expect(page.getByTestId('diagnostic-nonofficial-notice')).toContainText('有效客观证据');
  await expect(page.getByTestId('diagnostic-post-answer-support')).toContainText('答后中文辅助与解析');
  await expect(page.getByRole('button', { name: '返回修改答案' })).toHaveCount(0);
  await expect(page.getByTestId('diagnostic-score-reading')).toContainText('42');
  await expect(page.getByTestId('diagnostic-evidence-reading')).toContainText('证据 2/2');
  await expect(page.getByTestId('diagnostic-next-action-reading')).toContainText('下一步');
  await page.getByRole('button', { name: /开启今日训练/ }).click();
  await expect(page.getByRole('heading', { name: '今日训练' })).toBeVisible();
  await expect(page.getByText(/阅读|复习|同义替换|入门诊断/).first()).toBeVisible();

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
    examId: 'cet4',
    targetScore: 550,
    dailyMinutes: 45,
  });
  expect(result.sessions).toBe(1);
  expect(result.attempts).toBe(11);
  expect(result.reviewItems).toBeGreaterThanOrEqual(1);
  expect(result.skillProfiles).toHaveLength(4);
  expect(result.skillProfiles.find((profile: { skillArea: string }) => profile.skillArea === 'reading')).toMatchObject({
    score: 42,
    evidenceCount: 2,
  });
});

test('diagnostic weakness updates the daily primary task and routes into the matching practice module', async ({ page }) => {
  await registerAndEnterApp(page, 'mvp-diagnostic-adaptive-ui');
  await resetLocalLearningData(page);
  await page.reload();

  await page.getByRole('button', { name: '入门能力诊断' }).click();
  await page.getByRole('button', { name: '开始诊断' }).click();
  await page.getByRole('button', { name: '进入真实诊断' }).click();
  await answerGrammarWeakDiagnostic(page);
  await page.getByRole('button', { name: '提交诊断并生成基线' }).click();

  await expect(page.getByRole('heading', { name: '您的客观基线已生成' })).toBeVisible({ timeout: 7_000 });
  await expect(page.getByTestId('diagnostic-score-grammar')).toContainText('42');
  await page.getByRole('button', { name: /开启今日训练/ }).click();

  await expect(page.getByRole('heading', { name: '今日训练' })).toBeVisible();
  await expect(page.getByTestId('today-skill-diagnostic-grammar')).toContainText('42%');
  await expect(page.getByTestId('today-primary-task-title')).toContainText('语法结构与固定搭配专项');
  await expect(page.getByTestId('today-task-row-practice-grammar-0')).toContainText('语法结构与固定搭配专项');

  await page.getByTestId('today-primary-task-action').click();
  await expect(page.getByRole('heading', { name: '语法与完形填空训练舱' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '语法结构与固定搭配专项', exact: true })).toBeVisible();
});

test('target exam filters visible question bank and mock exam guides incomplete submissions', async ({ page }) => {
  await installSpeechSynthesisMock(page);
  await registerAndEnterApp(page, 'mvp-ui-logic');
  await resetLocalLearningData(page);
  await page.reload();

  await page.getByRole('button', { name: '专项练习' }).click();
  await expect(page.getByText('大学英语四级 专项训练')).toBeVisible();
  await expect(page.getByText('题库范围')).toBeVisible();
  await expect(page.getByText('大学英语四级 · 原创模拟')).toBeVisible();
  await expect(page.getByText('学位英语结构')).toHaveCount(0);

  await page.getByRole('button', { name: '设置' }).click();
  await expect(page.getByRole('combobox', { name: '目标考试' })).toContainText('大学英语四级');
  await expect(page.getByRole('combobox', { name: '每日投入时长' })).toContainText('60 分钟');

  await page.getByRole('button', { name: '阶段模考', exact: true }).click();
  const paperSelect = page.getByRole('combobox', { name: '选择模拟卷' });
  await expect(paperSelect).toContainText(CET4_MOCK_EXAM_BANK[0].title);
  await chooseComboboxOption(page, '选择模拟卷', new RegExp(CET4_MOCK_EXAM_BANK[1].title));
  await expect(page.getByRole('heading', { name: CET4_MOCK_EXAM_BANK[1].title })).toBeVisible();
  await expect(page.getByTestId('local-real-paper-panel')).toHaveCount(0);
  await expect(page.getByTestId('mock-page-mode-standard')).toHaveAttribute('aria-pressed', 'true');

  await page.getByTestId('mock-page-mode-real').click();
  await expect(page.getByRole('heading', { name: '本地真题自练' })).toBeVisible();
  await expect(page.getByTestId('mock-page-mode-real')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('mock-page-mode-standard')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByTestId('local-real-paper-panel')).toContainText('本地真题 PDF 卷');
  await expect(page.getByTestId('local-real-paper-count')).toContainText(/当前 \d+ 套|正在扫描/);
  await expect(page.getByTestId('local-real-paper-selected-resources')).toContainText('PDF 可看');
  await expect(page.getByTestId('local-real-paper-page-status')).toContainText(/页面可做|页面转换中|仅 PDF 可看/);
  await expect(page.getByTestId('local-real-paper-answer-status')).toContainText(/有答案|AI 参考答案|缺答案/);
  await expect(page.getByTestId('local-real-paper-audio-status')).toContainText(/有原音频|TTS 音频|浏览器朗读|缺音频/);
  if (process.env.E2E_REQUIRE_LOCAL_REAL_PAPERS === 'true') {
    await expect(page.getByTestId('local-real-paper-count')).toContainText('当前 57 套');
    await expect(page.getByTestId('local-real-paper-panel')).toContainText('2025 年 12 月英语四级真题（第 1 套）');
    await expect(page.getByTestId('local-real-paper-answer-status')).toContainText('有答案');
    await expect(page.getByTestId('local-real-paper-audio-status')).toContainText(/TTS 音频|浏览器朗读/);
  } else {
    await expect(page.getByTestId('local-real-paper-panel')).toContainText(
      /2025 年 12 月英语四级真题（第 1 套）|2023 年 6 月英语四级真题（第 1 套）/,
    );
  }
  await expect(page.getByTestId('local-real-paper-content')).toContainText('页面版真题');
  await expect(page.getByTestId('local-real-paper-content')).toContainText(/Part I Writing|写作/, { timeout: 20_000 });
  const localRealPaperAudioStatus = await page.getByTestId('local-real-paper-audio-status').textContent();
  if (/有原音频|TTS 音频/.test(localRealPaperAudioStatus ?? '')) {
    await expect(page.getByTestId('local-real-paper-play-audio')).toBeVisible();
    await expect(page.getByTestId('local-real-paper-audio')).toBeVisible();
    await expect(page.getByTestId('local-real-paper-open-audio')).toBeVisible();
  } else {
    await expect(page.getByTestId('local-real-paper-speak-reference')).toBeVisible();
    await expect(page.getByTestId('local-real-paper-speak-reference')).toBeEnabled();
  }
  await page.getByRole('button', { name: '二、听力' }).click();
  await expect(page.getByTestId('local-real-paper-question-1')).toBeVisible();
  await expect(page.getByTestId('local-real-paper-question-1')).toContainText(/A\./);
  await page.getByTestId('local-real-paper-choice-listening-1-A').click();
  await expect(page.getByTestId('local-real-paper-choice-listening-1-A')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('local-real-paper-answer-progress')).toContainText(/选择题 1\/\d+/);
  await page.getByRole('button', { name: '一、写作' }).click();
  await page.getByTestId('local-real-paper-writing-answer').fill('This is my local real paper practice answer.');
  await expect(page.getByTestId('local-real-paper-writing-answer')).toHaveValue('This is my local real paper practice answer.');

  await page.getByTestId('mock-page-mode-standard').click();
  await expect(page.getByRole('heading', { name: CET4_MOCK_EXAM_BANK[1].title })).toBeVisible();
  await page.getByTestId('mock-section-listening').click();
  await page.getByRole('button', { name: '播放听力材料' }).click();
  await expect(page.getByRole('button', { name: '暂停听力材料' })).toBeVisible();
  await page.getByRole('button', { name: '暂停听力材料' }).click();
  await expect(page.getByRole('button', { name: '继续听力材料' })).toBeVisible();
  await page.getByRole('button', { name: '继续听力材料' }).click();
  await expect(page.getByRole('button', { name: '暂停听力材料' })).toBeVisible();
  await page.getByTestId('mock-section-review').click();
  await expect(page.getByRole('heading', { name: '提交前检查' })).toBeVisible();
  await expect(page.getByTestId('mock-exam-submit')).toBeEnabled();
  await expect(page.getByTestId('mock-exam-submit')).toContainText('定位未完成模块');
  await page.getByTestId('mock-exam-submit').click();
  await expect(page.getByTestId('mock-writing-answer')).toBeVisible();
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
  await installSpeechSynthesisMock(page);
  await registerAndEnterApp(page, 'mvp-vocabulary');
  await resetLocalLearningData(page);
  await page.reload();

  await page.getByRole('button', { name: '专项练习' }).click();
  await expect(page.getByRole('heading', { name: /专项练习/ })).toBeVisible();
  await expect(page.getByText(`核心词汇 ${CET4_VOCABULARY_BANK.length} 个`).first()).toBeVisible();
  await expect(page.getByTestId('practice-method-guide-vocabulary')).toContainText('词汇听音解题方法');
  await expect(page.getByTestId('practice-method-guide-vocabulary')).toContainText('先确认单词的词性和核心词义');
  await page.getByRole('button', { name: '开始单词练习' }).click();

  await expect(page.getByRole('heading', { name: CET4_VOCABULARY_BANK[0].word })).toBeVisible();
  await expect(page.getByTestId('practice-method-guide-vocabulary')).toContainText('词汇听音解题方法');
  await expect(page.getByTestId('vocabulary-auto-speech-status')).toContainText('自动播报');
  await expect.poll(async () => page.evaluate(() => (window as any).__speechSynthesisCalls?.length ?? 0)).toBeGreaterThanOrEqual(1);
  const firstSpeechText = await page.evaluate(() => (window as any).__speechSynthesisCalls?.[0] ?? '');
  expect(firstSpeechText).toContain(CET4_VOCABULARY_BANK[0].word);
  await page.getByRole('button', { name: '播放例句' }).click();
  await expect(page.getByRole('button', { name: '暂停例句' })).toBeVisible();
  await page.getByRole('button', { name: '暂停例句' }).click();
  await expect(page.getByRole('button', { name: '继续例句' })).toBeVisible();

  const vocabularySessionItems = CET4_VOCABULARY_BANK.slice(0, VOCABULARY_SESSION_SIZE);

  for (const item of vocabularySessionItems) {
    await expect(page.getByRole('heading', { name: item.word })).toBeVisible();
    await expect(page.getByTestId('vocabulary-post-answer-support')).toHaveCount(0);
    await expect(page.getByTestId('vocabulary-question-translation')).toHaveCount(0);
    await expect(page.getByTestId(`vocabulary-option-translation-${item.correctAnswer}`)).toHaveCount(0);
    await expect(page.getByTestId('vocabulary-sentence-translation')).toHaveCount(0);
    const answerButton = page.getByRole('button', { name: new RegExp(`^${item.correctAnswer}\\. `) });
    await answerButton.click();
    await page.getByRole('button', { name: '有把握' }).click();
    await page.getByRole('button', { name: '提交词汇答案' }).click();
    await expect(page.getByTestId('vocabulary-post-answer-support')).toBeVisible();
    await expect(page.getByTestId('vocabulary-correct-answer')).toContainText(item.correctAnswer);
    await expect(page.getByTestId('vocabulary-question-translation')).toContainText('题干中文');
    await expect(page.getByTestId('vocabulary-question-translation')).toContainText(item.meaning);
    await expect(page.getByTestId(`vocabulary-option-translation-${item.correctAnswer}`)).toBeVisible();
    await expect(answerButton).toContainText('中文：');
    await expect(page.getByTestId('vocabulary-sentence-translation')).toContainText(item.example);
    await expect(page.getByTestId('vocabulary-sentence-translation')).not.toContainText('中文译文暂缺');
    await expect(page.getByTestId('vocabulary-option-insights')).toHaveCount(0);
    await expect(page.getByTestId('vocabulary-post-answer-support')).not.toContainText('四选项排除解析');
    await expect(page.getByTestId('vocabulary-sentence-translation')).not.toContainText('请以英文原句');
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

  await page.getByRole('button', { name: '专项练习' }).click();
  await page.getByRole('button', { name: '开始单词练习' }).click();
  await expect(page.getByRole('heading', { name: CET4_VOCABULARY_BANK[VOCABULARY_SESSION_SIZE].word })).toBeVisible();
});

test('curated vocabulary choices stay English before submission', async ({ page }) => {
  await installSpeechSynthesisMock(page);
  await registerAndEnterApp(page, 'mvp-vocabulary-generated-choices');
  await resetLocalLearningData(page);
  await page.reload();

  const targetIndex = CET4_VOCABULARY_BANK.findIndex((item) => item.word === 'achieve');
  expect(targetIndex).toBeGreaterThanOrEqual(0);
  const targetItem = CET4_VOCABULARY_BANK[targetIndex];
  const packIndex = Math.floor(targetIndex / VOCABULARY_SESSION_SIZE);
  const currentIdx = targetIndex % VOCABULARY_SESSION_SIZE;

  await page.evaluate(({ packIndex, currentIdx }) => {
    const now = new Date().toISOString();
    localStorage.setItem('english-training-cabin:practice-draft:vocabulary', JSON.stringify({
      version: 1,
      startedAt: now,
      packIndex,
      currentIdx,
      selectedOpt: null,
      confidence: null,
      isSubmitted: false,
      answers: [],
      updatedAt: now,
    }));
  }, { packIndex, currentIdx });

  await page.getByRole('button', { name: '\u4e13\u9879\u7ec3\u4e60' }).click();
  await page.getByTestId('practice-module-action-vocabulary').click();

  await expect(page.getByRole('heading', { name: targetItem.word })).toBeVisible();
  await expect(page.getByText(targetItem.phonetic, { exact: true })).toBeVisible();
  await expect(page.getByTestId('vocabulary-question-translation')).toHaveCount(0);
  await expect(page.getByTestId(`vocabulary-option-translation-${targetItem.correctAnswer}`)).toHaveCount(0);

  const choiceTexts = await Promise.all(
    (['A', 'B', 'C', 'D'] as const).map(async (choice) =>
      page.getByRole('button', { name: new RegExp(`^${choice}\\. `) }).textContent()),
  );
  expect(choiceTexts.join('\n')).not.toMatch(/[\u4e00-\u9fff]/u);
});

test('generated vocabulary example shows sentence-use chunk translations after submission', async ({ page }) => {
  await installSpeechSynthesisMock(page);
  await registerAndEnterApp(page, 'mvp-vocabulary-sentence-chunks');
  await resetLocalLearningData(page);
  await page.reload();

  const targetIndex = CET4_VOCABULARY_BANK.findIndex((item) => item.word === 'afford');
  expect(targetIndex).toBeGreaterThanOrEqual(0);
  const targetItem = CET4_VOCABULARY_BANK[targetIndex];
  const packIndex = Math.floor(targetIndex / VOCABULARY_SESSION_SIZE);
  const currentIdx = targetIndex % VOCABULARY_SESSION_SIZE;

  await page.evaluate(({ packIndex, currentIdx }) => {
    const now = new Date().toISOString();
    localStorage.setItem('english-training-cabin:practice-draft:vocabulary', JSON.stringify({
      version: 1,
      startedAt: now,
      packIndex,
      currentIdx,
      selectedOpt: null,
      confidence: null,
      isSubmitted: false,
      answers: [],
      updatedAt: now,
    }));
  }, { packIndex, currentIdx });

  await page.getByRole('button', { name: '专项练习' }).click();
  await page.getByTestId('practice-module-action-vocabulary').click();

  await expect(page.getByRole('heading', { name: targetItem.word })).toBeVisible();
  await page.getByRole('button', { name: new RegExp(`^${targetItem.correctAnswer}\\. `) }).click();
  await page.getByRole('button', { name: '有把握' }).click();
  await page.getByRole('button', { name: '提交词汇答案' }).click();

  await expect(page.getByTestId('vocabulary-correct-answer')).toContainText(
    `${targetItem.correctAnswer}. ${targetItem.options[targetItem.correctAnswer]}`,
  );
  await expect(page.getByTestId('vocabulary-option-correct-badge-' + targetItem.correctAnswer)).toBeVisible();
  await expect(page.getByTestId('vocabulary-sentence-translation')).toContainText(
    '有了奖学金支持，更多学习者能够负担得起在线课程的费用。',
  );
  await expect(page.getByTestId('vocabulary-sentence-chunks')).toContainText('With a scholarship');
  await expect(page.getByTestId('vocabulary-sentence-chunks')).toContainText('有了奖学金支持');
  await expect(page.getByTestId('vocabulary-sentence-chunks')).toContainText('more learners can afford the cost');
  await expect(page.getByTestId('vocabulary-sentence-chunks')).toContainText('更多学习者能够负担得起费用');
  await expect(page.getByTestId('vocabulary-sentence-chunks')).toContainText('of an online course');
  await expect(page.getByTestId('vocabulary-sentence-chunks')).toContainText('在线课程的');
});

test('vocabulary practice keeps a visible message when browser speech synthesis fails', async ({ page }) => {
  await installFailingSpeechSynthesisMock(page);
  await registerAndEnterApp(page, 'mvp-vocabulary-speech-failure');
  await resetLocalLearningData(page);
  await page.reload();

  await page.getByRole('button', { name: '专项练习' }).click();
  await page.getByRole('button', { name: '开始单词练习' }).click();
  await expect(page.getByRole('heading', { name: CET4_VOCABULARY_BANK[0].word })).toBeVisible();
  await expect(page.getByTestId('vocabulary-auto-speech-status')).toContainText('没有可用英文语音');

  await page.getByRole('button', { name: '播放单词' }).click();
  await expect.poll(async () => page.evaluate(() => (window as any).__speechSynthesisCalls?.length ?? 0)).toBeGreaterThanOrEqual(2);
  await expect(page.getByTestId('vocabulary-auto-speech-status')).toContainText('没有可用英文语音');
  await expect(page.getByRole('button', { name: '播放单词' })).toBeVisible();
});

test('staged mock exam covers CET-4 modules and persists score evidence', async ({ page }) => {
  const mockWritingEssay =
    'Consistent practice matters in English learning because real ability grows only when students use knowledge again and again in meaningful tasks. When learners write, listen, and review on a fixed schedule, they notice mistakes earlier and build stronger memory. For example, I write a short paragraph after class, read it aloud, and then check whether my topic sentence, reasons, and examples are clear. This routine may look simple, but it helps me turn passive vocabulary into active language and stops me from depending on last minute memorization. It also gives teachers enough evidence to offer specific feedback. In my view, the biggest value of consistent practice is that it makes progress visible, keeps confidence stable, and supports long term improvement before the CET-4 exam.';

  await registerAndEnterApp(page, 'mvp-mock');
  await resetLocalLearningData(page);
  await page.reload();

  await page.getByRole('button', { name: /^阶段模考$/ }).click();
  await expect(page.getByRole('heading', { name: CET4_MOCK_EXAM.title })).toBeVisible();
  await page.getByTestId('mock-writing-answer').fill(mockWritingEssay);
  await page.getByTestId('mock-section-listening').click();
  for (const question of CET4_MOCK_EXAM.listening.questions) {
    await page.getByTestId(`mock-choice-${question.id}-${question.correctAnswer}`).click();
  }
  await page.getByTestId('mock-section-reading').click();
  for (const question of CET4_MOCK_EXAM.reading.questions) {
    await page.getByTestId(`mock-choice-${question.id}-${question.correctAnswer}`).click();
  }
  await page.getByTestId('mock-section-translation').click();
  await page.getByTestId('mock-translation-answer').fill(
    'More and more college students use digital tools to learn English. Effective tools should not only give answers, but also help students find mistakes, actively recall knowledge, and return to weak points at the right time through regular review.',
  );
  await page.getByTestId('mock-section-review').click();
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
  expect(result.attempts).toBe(
    CET4_MOCK_EXAM.listening.questions.length
      + CET4_MOCK_EXAM.reading.questions.length
      + 2,
  );
  expect(result.skillProfiles.map((profile: { subSkillId: string }) => profile.subSkillId).sort()).toEqual([
    'mock-careful-reading',
    'mock-listening-mixed',
    'mock-listening-passage',
    'mock-long-conversation',
    'mock-long-matching',
    'mock-paragraph-translation',
    'mock-reading-mixed',
    'mock-short-essay',
    'mock-short-news',
    'mock-word-bank',
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

  const aiStatus = await request.get('/api/ai/status');
  expect(aiStatus.ok()).toBeTruthy();
  const aiStatusBody = await aiStatus.json();
  expect(aiStatusBody.fallbackAvailable).toBe(true);
  expect(['ready', 'degraded', 'offline-fallback']).toContain(aiStatusBody.state);

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
  await expect(page.getByText(/先完成专项训练或模考/)).toBeVisible();

  await page.getByRole('button', { name: '口语重说' }).click();
  await expect(page.getByRole('heading', { name: '口语重说 - 准备开始' })).toBeVisible();
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
