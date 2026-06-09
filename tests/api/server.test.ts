import request from 'supertest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { buildContentSecurityPolicy, buildEdgeTtsArguments, buildPracticeTtsCacheKey, createApp } from '../../server';
import { assertSmokeLearningBackupRoundTrip, createSmokeLearningBackup, getSmokeReviewEvidenceIds } from '../../scripts/smoke-learning-backup.mjs';
import { CET4_MOCK_EXAM } from '../../src/questionBank';
import {
  createFileSaasStore,
  createInMemorySaasStore,
  LOCAL_REGISTRATION_INVITE_CODE,
  signBillingWebhookPayload,
} from '../../src/server/saas';

const MOCK_WRITING_ESSAY =
  'Consistent practice matters in English learning because real ability grows only when students use knowledge again and again in meaningful tasks. When learners write, listen, and review on a fixed schedule, they notice mistakes earlier and build stronger memory. For example, I write a short paragraph after class, read it aloud, and then check whether my topic sentence, reasons, and examples are clear. This routine may look simple, but it helps me turn passive vocabulary into active language and stops me from depending on last minute memorization. It also gives teachers enough evidence to offer specific feedback. In my view, the biggest value of consistent practice is that it makes progress visible, keeps confidence stable, and supports long term improvement before the CET-4 exam.';

const MINIMAL_CET4_REAL_PAPER_PDF = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>
endobj
4 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
5 0 obj
<< /Length 206 >>
stream
BT
/F1 12 Tf
72 720 Td
(Part I Writing Directions test writing prompt) Tj
0 -20 Td
(Part II Listening Comprehension Section A 1. A question) Tj
0 -20 Td
(Part III Reading Comprehension Section A passage text) Tj
0 -20 Td
(Part IV Translation Directions translate this paragraph) Tj
ET
endstream
endobj
xref
0 6
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000241 00000 n
0000000311 00000 n
trailer
<< /Size 6 /Root 1 0 R >>
startxref
568
%%EOF`;

describe('server API', () => {
  const app = createApp();
  const registerApiUser = async (targetApp: ReturnType<typeof createApp>, label: string) => {
    const email = `${label}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
    const response = await request(targetApp)
      .post('/api/auth/register')
      .send({
        email,
        inviteCode: LOCAL_REGISTRATION_INVITE_CODE,
        password: 'secure-password-1',
        name: '接口测试学习者',
        organizationName: '接口测试团队',
      })
      .expect(201);

    return {
      email,
      token: response.body.token as string,
      recoveryCode: response.body.recoveryCode as string,
    };
  };

  it('returns health status', async () => {
    const response = await request(app).get('/api/health').expect(200);

    expect(response.body).toMatchObject({
      status: 'ok',
      app: 'english-training-cabin',
    });
    expect(response.body).toHaveProperty('aiProvider');
    expect(response.body.aiRuntime).toMatchObject({
      state: 'offline-fallback',
      fallbackAvailable: true,
      statusReason: 'not_configured',
    });
    expect(response.body.saas).toMatchObject({
      registrationInviteRequired: true,
      registrationInviteConfigured: true,
    });
    expect(response.body).not.toHaveProperty('aiApiKey');
    expect(response.body).not.toHaveProperty('emailDelivery');
    expect(response.body.collaboration).toEqual({ invitationDelivery: 'manual-link' });
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['referrer-policy']).toBe('same-origin');
    expect(response.headers['permissions-policy']).toContain('microphone=(self)');
    expect(response.headers['content-security-policy']).toContain("default-src 'self'");
    expect(response.headers['content-security-policy']).toContain("frame-ancestors 'none'");
  });

  it('exposes public AI availability without leaking provider secrets', async () => {
    const response = await request(app).get('/api/ai/status').expect(200);

    expect(response.body).toMatchObject({
      configured: false,
      provider: 'mock',
      model: 'offline-fallback',
      state: 'offline-fallback',
      fallbackAvailable: true,
      shouldNotifyUser: true,
      statusReason: 'not_configured',
    });
    expect(response.body).toHaveProperty('requestsTotal');
    expect(response.body).toHaveProperty('fallbackRate');
    expect(response.body).toHaveProperty('averageLatencyMs');
    expect(response.body).toHaveProperty('fallbacksByReason');
    expect(response.body).not.toHaveProperty('apiKey');
    expect(response.body).not.toHaveProperty('baseUrl');
  });

  it('returns a clear response for server practice TTS availability', async () => {
    const response = await request(app)
      .post('/api/practice/tts')
      .send({ text: 'adapt', rate: 0.8 });

    if (response.status === 200) {
      expect(response.headers['content-type']).toMatch(/audio\/(?:mpeg|wav)/);
      expect(response.headers['x-practice-tts-cache']).toMatch(/^(?:hit|miss|wait)$/);
      expect(response.body.length).toBeGreaterThan(128);

      const cachedResponse = await request(app)
        .post('/api/practice/tts')
        .send({ text: 'adapt', rate: 0.8 })
        .expect(200);
      expect(cachedResponse.headers['x-practice-tts-cache']).toBe('hit');
      expect(cachedResponse.body.length).toBe(response.body.length);
      return;
    }

    expect(response.status).toBe(501);
    expect(response.body).toMatchObject({ error: 'practice_tts_unavailable' });
  });

  it('passes negative Edge TTS rates as a single option argument', () => {
    const args = buildEdgeTtsArguments('adapt quickly', '/tmp/practice-tts.mp3', { browserRate: 0.85 });

    expect(args).toContain('--rate=-7%');
    expect(args).not.toContain('-7%');
  });

  it('keeps practice TTS cache keys scoped to text, rate, and voice config', () => {
    const originalVoice = process.env.PRACTICE_EDGE_TTS_VOICE;
    try {
      process.env.PRACTICE_EDGE_TTS_VOICE = 'en-US-JennyNeural';
      const baseKey = buildPracticeTtsCacheKey('adapt quickly', 0.9);
      expect(buildPracticeTtsCacheKey('adapt quickly', 1.1)).not.toBe(baseKey);
      expect(buildPracticeTtsCacheKey('adapt slowly', 0.9)).not.toBe(baseKey);

      process.env.PRACTICE_EDGE_TTS_VOICE = 'en-US-GuyNeural';
      expect(buildPracticeTtsCacheKey('adapt quickly', 0.9)).not.toBe(baseKey);
    } finally {
      if (originalVoice === undefined) {
        delete process.env.PRACTICE_EDGE_TTS_VOICE;
      } else {
        process.env.PRACTICE_EDGE_TTS_VOICE = originalVoice;
      }
    }
  });

  it('accepts allowed product telemetry events and exposes observability summary', async () => {
    const { token } = await registerApiUser(app, 'observability');

    await request(app)
      .post('/api/telemetry/event')
      .send({
        eventName: 'practice_completed',
        payload: {
          mode: 'api-test',
          score: 80,
        },
      })
      .expect(204);

    const response = await request(app)
      .get('/api/observability/summary')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.api.requestsTotal).toBeGreaterThan(0);
    expect(response.body.productEvents.practice_completed).toBeGreaterThanOrEqual(1);
    expect(response.body.ai).toHaveProperty('fallbackRate');
  });

  it('rejects unsupported telemetry events', async () => {
    await request(app)
      .post('/api/telemetry/event')
      .send({ eventName: 'raw_prompt_dump' })
      .expect(400);
  });

  it('accepts user feedback and writes a local evidence record', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'etc-feedback-'));
    const feedbackFilePath = path.join(tempDir, 'feedback.jsonl');
    const feedbackApp = createApp({ feedbackFilePath });

    await request(feedbackApp)
      .post('/api/feedback')
      .send({ message: '专项练习页面的暂停按钮需要更明显。', category: 'ui', page: '/settings' })
      .expect(201)
      .expect((response) => {
        expect(response.body).toEqual({ status: 'received' });
      });

    const storedLines = (await fs.readFile(feedbackFilePath, 'utf8')).trim().split('\n');
    expect(storedLines).toHaveLength(1);
    expect(JSON.parse(storedLines[0])).toMatchObject({
      category: 'ui',
      message: '专项练习页面的暂停按钮需要更明显。',
      page: '/settings',
    });

    await request(feedbackApp)
      .post('/api/feedback')
      .send({ message: '太短', category: 'bug' })
      .expect(400);
  });

  it('supports SaaS account registration, login, entitlements, and cloud learning snapshots', async () => {
    const saasApp = createApp({
      saasStore: createInMemorySaasStore(),
      saasSessionSecret: 'test-saas-secret',
    });
    const email = `learner-${Date.now()}@example.com`;

    await request(saasApp)
      .get('/api/cloud/learning-data')
      .expect(401);

    const anonymousSession = await request(saasApp)
      .get('/api/auth/session')
      .set('Authorization', 'Bearer stale-token')
      .expect(200);
    expect(anonymousSession.body).toMatchObject({
      authenticated: false,
      account: null,
    });

    await request(saasApp)
      .post('/api/auth/register')
      .send({
        email: `missing-invite-${Date.now()}@example.com`,
        password: 'secure-password-1',
        name: '缺少邀请码用户',
        organizationName: '缺少邀请码团队',
      })
      .expect(400);

    await request(saasApp)
      .post('/api/auth/register')
      .send({
        email: `bad-invite-${Date.now()}@example.com`,
        inviteCode: 'WRONG-CODE',
        password: 'secure-password-1',
        name: '错误邀请码用户',
        organizationName: '错误邀请码团队',
      })
      .expect(403);

    const registerResponse = await request(saasApp)
      .post('/api/auth/register')
      .send({
        email,
        inviteCode: LOCAL_REGISTRATION_INVITE_CODE,
        password: 'secure-password-1',
        name: '商业化学习者',
        organizationName: '英语训练商业化团队',
      })
      .expect(201);

    expect(registerResponse.body.token).toEqual(expect.any(String));
    expect(registerResponse.body.recoveryCode).toEqual(expect.stringMatching(/^etc-/));
    expect(registerResponse.body.account).toMatchObject({
      user: {
        email,
        role: 'owner',
      },
      organization: {
        name: '英语训练商业化团队',
      },
      subscription: {
        tier: 'pro',
        status: 'trialing',
      },
      entitlements: {
        cloudSync: true,
      },
    });

    const token = registerResponse.body.token as string;
    const sessionResponse = await request(saasApp)
      .get('/api/auth/session')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(sessionResponse.body).toMatchObject({
      authenticated: true,
      account: {
        user: {
          email,
        },
      },
    });

    const meResponse = await request(saasApp)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(meResponse.body.account.user.email).toBe(email);

    const loginResponse = await request(saasApp)
      .post('/api/auth/login')
      .send({ email, password: 'secure-password-1' })
      .expect(200);

    expect(loginResponse.body.account.entitlements.aiMonthlyCredits).toBeGreaterThan(0);

    const backup = createSmokeLearningBackup('api');

    const syncResponse = await request(saasApp)
      .put('/api/cloud/learning-data')
      .set('Authorization', `Bearer ${token}`)
      .send({ backup })
      .expect(200);

    expect(syncResponse.body.snapshot.counts).toMatchObject({
      studyGoals: 1,
      practiceSessions: 1,
      attempts: 1,
      reviewItems: 1,
      skillProfiles: 1,
    });

    const cloudResponse = await request(saasApp)
      .get('/api/cloud/learning-data')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(cloudResponse.body.snapshot.backup.data.practiceSessions).toHaveLength(1);
    assertSmokeLearningBackupRoundTrip(cloudResponse.body.snapshot);
    const ids = getSmokeReviewEvidenceIds();
    expect(cloudResponse.body.snapshot.backup.data.attempts[0]).toMatchObject({
      id: ids.reviewAttemptId,
      sessionId: ids.reviewSessionId,
      moduleId: 'review',
      questionTypeId: 'active-recall-cloze-production',
      answer: {
        reviewItemId: ids.reviewItemId,
        clozeAnswer: 'quiet study spaces',
        completedStepCount: 3,
      },
    });
  });

  it('blocks empty local learning snapshots from overwriting cloud evidence', async () => {
    const saasApp = createApp({
      saasStore: createInMemorySaasStore(),
      saasSessionSecret: 'cloud-overwrite-guard-secret',
    });
    const registerResponse = await request(saasApp)
      .post('/api/auth/register')
      .send({
        email: `cloud-overwrite-${Date.now()}@example.com`,
        inviteCode: LOCAL_REGISTRATION_INVITE_CODE,
        password: 'secure-password-1',
        name: 'Cloud Guard Learner',
        organizationName: 'Cloud Guard Team',
      })
      .expect(201);
    const token = registerResponse.body.token as string;
    const backup = createSmokeLearningBackup('overwrite-guard');

    await request(saasApp)
      .put('/api/cloud/learning-data')
      .set('Authorization', `Bearer ${token}`)
      .send({ backup })
      .expect(200);

    const emptyLocalBackup = {
      app: 'english-training-cabin',
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      data: {
        studyGoals: [{ id: 'local-default-goal' }],
        practiceSessions: [],
        attempts: [],
        reviewItems: [],
        skillProfiles: [
          { id: 'local-reading-profile', skillArea: 'reading', subSkillId: 'diagnostic', score: 60, confidence: 3, evidenceCount: 0, lastUpdatedAt: new Date().toISOString() },
        ],
      },
    };

    const blocked = await request(saasApp)
      .put('/api/cloud/learning-data')
      .set('Authorization', `Bearer ${token}`)
      .send({ backup: emptyLocalBackup })
      .expect(409);

    expect(blocked.body.error).toBe('empty_learning_snapshot_overwrite_blocked');

    const cloudResponse = await request(saasApp)
      .get('/api/cloud/learning-data')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(cloudResponse.body.snapshot.counts).toMatchObject({
      practiceSessions: 1,
      attempts: 1,
      reviewItems: 1,
    });
    assertSmokeLearningBackupRoundTrip(cloudResponse.body.snapshot);
  });

  it('allows repeated organization names without blocking public self-service signup', async () => {
    const saasApp = createApp({
      saasStore: createInMemorySaasStore(),
      saasSessionSecret: 'duplicate-organization-secret',
    });
    const organizationName = '同名公开训练团队';

    const first = await request(saasApp)
      .post('/api/auth/register')
      .send({
        email: 'same-org-first@example.com',
        inviteCode: LOCAL_REGISTRATION_INVITE_CODE,
        password: 'secure-password-1',
        name: '同名团队用户一',
        organizationName,
      })
      .expect(201);

    const second = await request(saasApp)
      .post('/api/auth/register')
      .send({
        email: 'same-org-second@example.com',
        inviteCode: LOCAL_REGISTRATION_INVITE_CODE,
        password: 'secure-password-1',
        name: '同名团队用户二',
        organizationName,
      })
      .expect(201);

    expect(first.body.account.organization.name).toBe(organizationName);
    expect(second.body.account.organization.name).toBe(organizationName);
    expect(first.body.account.organization.slug).not.toBe(second.body.account.organization.slug);

    const duplicateEmail = await request(saasApp)
      .post('/api/auth/register')
      .send({
        email: 'same-org-first@example.com',
        inviteCode: LOCAL_REGISTRATION_INVITE_CODE,
        password: 'secure-password-1',
        name: '重复邮箱用户',
        organizationName: '另一个团队',
      })
      .expect(409);

    expect(duplicateEmail.body.error).toBe('email_exists');
  });

  it('keeps file-backed SaaS sessions valid under concurrent registration load', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'english-training-saas-store-'));
    const filePath = path.join(tempDir, 'saas-store.json');
    const saasApp = createApp({
      saasStore: createFileSaasStore(filePath),
      saasSessionSecret: 'file-store-concurrency-secret',
    });

    try {
      const registrations = await Promise.all(Array.from({ length: 8 }, (_, index) => {
        const email = `file-store-${index}-${Date.now()}@example.com`;
        return request(saasApp)
          .post('/api/auth/register')
          .send({
            email,
            inviteCode: LOCAL_REGISTRATION_INVITE_CODE,
            password: 'secure-password-1',
            name: `文件存储用户${index}`,
            organizationName: `文件存储团队${index}`,
          })
          .expect(201)
          .then((response) => ({ email, token: response.body.token as string }));
      }));

      await Promise.all(registrations.map(({ email, token }) =>
        request(saasApp)
          .get('/api/auth/session')
          .set('Authorization', `Bearer ${token}`)
          .expect(200)
          .then((response) => {
            expect(response.body).toMatchObject({
              authenticated: true,
              account: {
                user: { email },
              },
            });
          }),
      ));

      const persisted = JSON.parse(await fs.readFile(filePath, 'utf8'));
      expect(persisted.users).toHaveLength(registrations.length);
      expect(persisted.sessions).toHaveLength(registrations.length);
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });

  it('isolates SaaS cloud snapshots by authenticated user and tenant', async () => {
    const saasApp = createApp({
      saasStore: createInMemorySaasStore(),
      saasSessionSecret: 'tenant-isolation-secret',
    });

    const first = await request(saasApp)
      .post('/api/auth/register')
      .send({
        email: 'first-tenant@example.com',
        inviteCode: LOCAL_REGISTRATION_INVITE_CODE,
        password: 'secure-password-1',
        name: '第一位学习者',
        organizationName: '第一租户',
      })
      .expect(201);

    const second = await request(saasApp)
      .post('/api/auth/register')
      .send({
        email: 'second-tenant@example.com',
        inviteCode: LOCAL_REGISTRATION_INVITE_CODE,
        password: 'secure-password-1',
        name: '第二位学习者',
        organizationName: '第二租户',
      })
      .expect(201);

    await request(saasApp)
      .put('/api/cloud/learning-data')
      .set('Authorization', `Bearer ${first.body.token}`)
      .send({
        backup: {
          app: 'english-training-cabin',
          schemaVersion: 1,
          exportedAt: new Date().toISOString(),
          data: {
            studyGoals: [{ id: 'first-goal' }],
            practiceSessions: [],
            attempts: [],
            reviewItems: [],
            skillProfiles: [],
          },
        },
      })
      .expect(200);

    const secondCloud = await request(saasApp)
      .get('/api/cloud/learning-data')
      .set('Authorization', `Bearer ${second.body.token}`)
      .expect(200);

    expect(secondCloud.body.snapshot).toBeNull();
  });

  it('supports non-email password recovery with one-time recovery codes', async () => {
    const saasApp = createApp({
      saasStore: createInMemorySaasStore(),
      saasSessionSecret: 'auth-hardening-secret',
    });

    const registerResponse = await request(saasApp)
      .post('/api/auth/register')
      .send({
        email: 'verify-reset@example.com',
        inviteCode: LOCAL_REGISTRATION_INVITE_CODE,
        password: 'secure-password-1',
        name: '安全学习者',
        organizationName: '认证安全团队',
      })
      .expect(201);

    expect(registerResponse.body.recoveryCode).toEqual(expect.stringMatching(/^etc-/));

    await request(saasApp)
      .post('/api/auth/login')
      .send({ email: 'verify-reset@example.com', password: 'secure-password-1' })
      .expect(200);

    await request(saasApp)
      .post('/api/auth/password-reset')
      .send({
        email: 'verify-reset@example.com',
        recoveryCode: 'etc-wrong-recovery-code-for-test',
        password: 'new-secure-password-1',
      })
      .expect(400);

    const resetResponse = await request(saasApp)
      .post('/api/auth/password-reset')
      .send({
        email: 'verify-reset@example.com',
        recoveryCode: registerResponse.body.recoveryCode,
        password: 'new-secure-password-1',
      })
      .expect(200);

    expect(resetResponse.body.token).toEqual(expect.any(String));
    expect(resetResponse.body.recoveryCode).toEqual(expect.stringMatching(/^etc-/));
    expect(resetResponse.body.recoveryCode).not.toBe(registerResponse.body.recoveryCode);

    await request(saasApp)
      .post('/api/auth/login')
      .send({ email: 'verify-reset@example.com', password: 'secure-password-1' })
      .expect(401);

    await request(saasApp)
      .post('/api/auth/login')
      .send({ email: 'verify-reset@example.com', password: 'new-secure-password-1' })
      .expect(200);

    await request(saasApp)
      .post('/api/auth/password-reset')
      .send({
        email: 'verify-reset@example.com',
        recoveryCode: registerResponse.body.recoveryCode,
        password: 'another-secure-password-1',
      })
      .expect(400);

    const regenerated = await request(saasApp)
      .post('/api/auth/recovery-code')
      .set('Authorization', `Bearer ${resetResponse.body.token}`)
      .expect(200);

    expect(regenerated.body.recoveryCode).toEqual(expect.stringMatching(/^etc-/));
  });

  it('applies signed billing webhooks and rejects unsigned subscription changes', async () => {
    const saasApp = createApp({
      saasStore: createInMemorySaasStore(),
      saasSessionSecret: 'billing-auth-secret',
      billingWebhookSecret: 'billing-webhook-secret',
    });

    const registerResponse = await request(saasApp)
      .post('/api/auth/register')
      .send({
        email: 'billing@example.com',
        inviteCode: LOCAL_REGISTRATION_INVITE_CODE,
        password: 'secure-password-1',
        name: '付费学习者',
        organizationName: '付费租户',
      })
      .expect(201);

    const organizationId = registerResponse.body.account.organization.id as string;
    const event = {
      eventId: 'evt_subscription_001',
      provider: 'manual-test',
      type: 'subscription.updated',
      organizationId,
      tier: 'team',
      status: 'active',
      seats: 8,
      aiMonthlyCredits: 12000,
      providerCustomerId: 'cus_test_001',
      providerSubscriptionId: 'sub_test_001',
      currentPeriodEndsAt: new Date(Date.now() + 30 * 86400000).toISOString(),
    };

    await request(saasApp)
      .post('/api/billing/webhook')
      .send(event)
      .expect(401);

    const signedResponse = await request(saasApp)
      .post('/api/billing/webhook')
      .set('x-english-billing-signature', signBillingWebhookPayload(JSON.stringify(event), 'billing-webhook-secret'))
      .send(event)
      .expect(200);

    expect(signedResponse.body.subscription).toMatchObject({
      tier: 'team',
      status: 'active',
      seats: 8,
      aiMonthlyCredits: 12000,
    });

    const entitlements = await request(saasApp)
      .get('/api/billing/entitlements')
      .set('Authorization', `Bearer ${registerResponse.body.token}`)
      .expect(200);

    expect(entitlements.body.account.entitlements).toMatchObject({
      cloudSync: true,
      teamSeats: 8,
      licensedContent: true,
      adminConsole: true,
    });

    const duplicateResponse = await request(saasApp)
      .post('/api/billing/webhook')
      .set('x-english-billing-signature', signBillingWebhookPayload(JSON.stringify(event), 'billing-webhook-secret'))
      .send(event)
      .expect(200);

    expect(duplicateResponse.body.duplicate).toBe(true);
  });

  it('syncs incremental learning entities and only returns the authenticated tenant data', async () => {
    const saasApp = createApp({
      saasStore: createInMemorySaasStore(),
      saasSessionSecret: 'incremental-sync-secret',
    });

    const first = await request(saasApp)
      .post('/api/auth/register')
      .send({
        email: 'incremental-first@example.com',
        inviteCode: LOCAL_REGISTRATION_INVITE_CODE,
        password: 'secure-password-1',
        name: '增量学习者一',
        organizationName: '增量租户一',
      })
      .expect(201);

    const second = await request(saasApp)
      .post('/api/auth/register')
      .send({
        email: 'incremental-second@example.com',
        inviteCode: LOCAL_REGISTRATION_INVITE_CODE,
        password: 'secure-password-1',
        name: '增量学习者二',
        organizationName: '增量租户二',
      })
      .expect(201);

    const updatedAt = new Date().toISOString();
    await request(saasApp)
      .put('/api/cloud/learning-entities')
      .set('Authorization', `Bearer ${first.body.token}`)
      .send({
        entities: [
          {
            entityType: 'studyGoal',
            entityId: 'goal-cet4-primary',
            updatedAt,
            payload: {
              id: 'goal-cet4-primary',
              targetScore: 580,
            },
          },
          {
            entityType: 'skillProfile',
            entityId: 'cet4-reading-core',
            updatedAt,
            payload: {
              id: 'cet4-reading-core',
              score: 76,
            },
          },
        ],
      })
      .expect(200);

    const firstEntities = await request(saasApp)
      .get('/api/cloud/learning-entities')
      .set('Authorization', `Bearer ${first.body.token}`)
      .expect(200);

    expect(firstEntities.body.entities).toHaveLength(2);
    expect(firstEntities.body.entities[0]).not.toHaveProperty('passwordHash');

    const secondEntities = await request(saasApp)
      .get('/api/cloud/learning-entities')
      .set('Authorization', `Bearer ${second.body.token}`)
      .expect(200);

    expect(secondEntities.body.entities).toHaveLength(0);
  });

  it('revokes server-side sessions on logout and rotates them on refresh', async () => {
    const saasApp = createApp({
      saasStore: createInMemorySaasStore(),
      saasSessionSecret: 'session-rotation-secret',
    });

    const registerResponse = await request(saasApp)
      .post('/api/auth/register')
      .send({
        email: 'session-owner@example.com',
        inviteCode: LOCAL_REGISTRATION_INVITE_CODE,
        password: 'secure-password-1',
        name: '会话学习者',
        organizationName: '会话团队',
      })
      .expect(201);

    const firstToken = registerResponse.body.token as string;
    const refreshResponse = await request(saasApp)
      .post('/api/auth/refresh')
      .set('Authorization', `Bearer ${firstToken}`)
      .expect(200);

    const secondToken = refreshResponse.body.token as string;
    expect(secondToken).not.toBe(firstToken);

    await request(saasApp)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${firstToken}`)
      .expect(401);

    await request(saasApp)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${secondToken}`)
      .expect(200);

    await request(saasApp)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${secondToken}`)
      .expect(204);

    await request(saasApp)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${secondToken}`)
      .expect(401);
  });

  it('supports workspace invitations, member onboarding, and owner-only admin overview', async () => {
    const saasApp = createApp({
      saasStore: createInMemorySaasStore(),
      saasSessionSecret: 'workspace-secret',
    });

    const owner = await request(saasApp)
      .post('/api/auth/register')
      .send({
        email: 'workspace-owner@example.com',
        inviteCode: LOCAL_REGISTRATION_INVITE_CODE,
        password: 'secure-password-1',
        name: '团队所有者',
        organizationName: '免费协作团队',
      })
      .expect(201);

    const invitationResponse = await request(saasApp)
      .post('/api/workspace/invitations')
      .set('Authorization', `Bearer ${owner.body.token}`)
      .send({
        email: 'workspace-member@example.com',
        role: 'member',
      })
      .expect(201);

    expect(invitationResponse.body.invitation).toMatchObject({
      email: 'workspace-member@example.com',
      role: 'member',
    });
    expect(invitationResponse.body.invitation).not.toHaveProperty('tokenHash');
    expect(invitationResponse.body.delivery).toBe('manual-link');
    expect(invitationResponse.body.invitationUrl).toEqual(expect.any(String));
    const invitationToken = new URL(invitationResponse.body.invitationUrl).searchParams.get('token');
    expect(invitationToken).toEqual(expect.any(String));

    const accepted = await request(saasApp)
      .post('/api/workspace/invitations/accept')
      .send({
        token: invitationToken,
        name: '团队成员',
        password: 'secure-password-2',
      })
      .expect(201);

    expect(accepted.body.account.user).toMatchObject({
      email: 'workspace-member@example.com',
      role: 'member',
    });

    await request(saasApp)
      .post('/api/workspace/invitations/accept')
      .send({
        token: invitationToken,
        name: '重复成员',
        password: 'secure-password-3',
      })
      .expect(400);

    const membersResponse = await request(saasApp)
      .get('/api/workspace/members')
      .set('Authorization', `Bearer ${owner.body.token}`)
      .expect(200);

    expect(membersResponse.body.members.map((member: { email: string }) => member.email)).toEqual([
      'workspace-owner@example.com',
      'workspace-member@example.com',
    ]);
    expect(membersResponse.body.members[0]).not.toHaveProperty('passwordHash');
    expect(membersResponse.body.invitations[0]).toHaveProperty('acceptedAt');

    const adminOverview = await request(saasApp)
      .get('/api/admin/overview')
      .set('Authorization', `Bearer ${owner.body.token}`)
      .expect(200);

    expect(adminOverview.body.overview).toMatchObject({
      members: 2,
      pendingInvitations: 0,
    });

    await request(saasApp)
      .get('/api/admin/overview')
      .set('Authorization', `Bearer ${accepted.body.token}`)
      .expect(403);

    await request(saasApp)
      .post('/api/workspace/invitations')
      .set('Authorization', `Bearer ${accepted.body.token}`)
      .send({
        email: 'another-member@example.com',
        role: 'member',
      })
      .expect(403);
  });

  it('returns exam registry', async () => {
    const response = await request(app).get('/api/exams').expect(200);

    expect(response.body.exams[0]).toMatchObject({
      id: 'cet4',
      name: '大学英语四级',
      trainingStatus: 'active',
      routeAvailability: 'trainable',
      contentBoundary: {
        builtInContent: 'original-simulated',
        officialQuestionBank: false,
      },
    });
    expect(response.body.exams.map((exam: { id: string }) => exam.id)).toEqual(expect.arrayContaining(['cet6', 'ielts', 'toefl']));
    expect(response.body.exams.find((exam: { id: string }) => exam.id === 'ielts')).toMatchObject({
      trainingStatus: 'roadmap',
      routeAvailability: 'metadata-only',
      contentBoundary: {
        builtInContent: 'metadata-only',
        officialQuestionBank: false,
      },
    });
    expect(response.body.activeExamIds).toEqual(['cet4']);
    expect(response.body.roadmapExamIds).toEqual(['cet6', 'ielts', 'toefl']);
    expect(response.body.questionBankCoverage.length).toBeGreaterThanOrEqual(8);
    expect(response.body.mockExam).toMatchObject({
      id: 'cet4-standard-mock-001',
      plannedMinutes: 125,
      totalQuestionCount: 57,
      writingTaskCount: 1,
      translationTaskCount: 1,
    });
    expect(response.body.mockExam.listeningQuestionCount).toBe(25);
    expect(response.body.mockExam.readingQuestionCount).toBe(30);
    expect(response.body.degreeEnglish.outline).toMatchObject({
      id: 'nanjing-tech-degree-english-2025-09',
      plannedMinutes: 120,
      totalQuestionCount: 67,
      hasListening: false,
    });
    expect(response.body.degreeEnglish.questionBankCoverage.map((item: { questionTypeId: string }) => item.questionTypeId))
      .toEqual(expect.arrayContaining(['vocabulary-structure', 'cloze-choice', 'paragraph-matching', 'not-tested']));
    expect(response.body.degreeEnglish.mockExam).toMatchObject({
      id: 'degree-english-2025-outline-mock-001',
      totalQuestionCount: 67,
      vocabularyStructureQuestionCount: 25,
      useOfEnglishQuestionCount: 20,
      traditionalReadingQuestionCount: 15,
      paragraphMatchingQuestionCount: 5,
    });
  });

  it('lists and serves local CET-4 real paper PDFs from a configured root', async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'etc-local-papers-'));
    const cet4Directory = path.join(tempRoot, '大学英语四级');
    const listeningDirectory = path.join(tempRoot, '听力');
    const answerRoot = path.join(tempRoot, 'answers');
    await fs.mkdir(cet4Directory, { recursive: true });
    await fs.mkdir(listeningDirectory, { recursive: true });
    await fs.mkdir(answerRoot, { recursive: true });
    await fs.writeFile(path.join(cet4Directory, '2025年12月英语四级真题(第2套).pdf'), MINIMAL_CET4_REAL_PAPER_PDF);
    await fs.writeFile(path.join(cet4Directory, '2025年12月英语四级真题(第2套)答案.txt'), '1. A\n2. B\n');
    await fs.writeFile(path.join(listeningDirectory, '2025年12月英语四级真题(第2套)听力.mp3'), 'fake-audio');
    await fs.writeFile(path.join(cet4Directory, '2020年7月英语四级真题(组合卷).pdf'), '%PDF-1.4\n% combo pdf\n');
    await fs.writeFile(path.join(cet4Directory, '英语六级真题.pdf'), '%PDF-1.4\n% ignored pdf\n');
    await fs.writeFile(
      path.join(answerRoot, '大学英语四级-纯答案.md'),
      '# 大学英语四级纯答案\n\n### 2020年7月英语四级真题(组合卷)\n\n1.C 2.A 3.B 4.D\n',
    );

    const previousRoot = process.env.LOCAL_REAL_PAPER_ROOT;
    const previousAnswerRoot = process.env.LOCAL_REAL_PAPER_ANSWER_ROOT;
    const previousAudioRoot = process.env.LOCAL_REAL_PAPER_AUDIO_ROOT;
    process.env.LOCAL_REAL_PAPER_ROOT = tempRoot;
    process.env.LOCAL_REAL_PAPER_ANSWER_ROOT = answerRoot;
    process.env.LOCAL_REAL_PAPER_AUDIO_ROOT = listeningDirectory;

    try {
      const localApp = createApp({
        saasStore: createInMemorySaasStore(),
        saasSessionSecret: 'test-local-real-papers-secret',
      });
      const response = await request(localApp)
        .get('/api/local-real-papers?exam=cet4')
        .expect(200);

      expect(response.body).toMatchObject({
        examId: 'cet4',
        total: 2,
        answerKeyStatus: 'ready',
        listeningAssetStatus: 'ready',
      });
      expect(response.body.papers.map((paper: { id: string }) => paper.id)).toEqual([
        'cet4-2025-12-set2',
        'cet4-2020-07-combo',
      ]);
      expect(response.body.papers[0]).toMatchObject({
        title: '2025 年 12 月英语四级真题（第 2 套）',
        examDate: '2025-12',
        setLabel: '第 2 套',
        hasAnswerKey: true,
        hasListeningAudio: true,
        answerKeyUrl: '/api/local-real-papers/cet4-2025-12-set2/answer-key',
        listeningAudioUrl: '/api/local-real-papers/cet4-2025-12-set2/audio',
        pdfUrl: '/api/local-real-papers/cet4-2025-12-set2/pdf',
      });
      expect(response.body.papers[1]).toMatchObject({
        id: 'cet4-2020-07-combo',
        hasAnswerKey: true,
        answerKeyUrl: '/api/local-real-papers/cet4-2020-07-combo/answer-key',
      });

      await request(localApp)
        .get('/api/local-real-papers/cet4-2025-12-set2/pdf')
        .expect(200)
        .expect('Content-Type', /application\/pdf/);

      await request(localApp)
        .get('/api/local-real-papers/cet4-2025-12-set2/content')
        .expect(200)
        .expect((contentResponse) => {
          expect(contentResponse.body.content).toMatchObject({
            paperId: 'cet4-2025-12-set2',
            pageCount: 1,
            truncated: false,
          });
          expect(contentResponse.body.content.sections.map((section: { id: string }) => section.id)).toEqual([
            'writing',
            'listening',
            'reading',
            'translation',
          ]);
          expect(contentResponse.body.content.pages[0].text).toContain('Part I Writing');
          const serializedContent = JSON.stringify(contentResponse.body.content);
          expect(serializedContent).not.toContain('http');
          expect(serializedContent).not.toContain('burningvocabulary.cn');
        });

      await request(localApp)
        .get('/api/local-real-papers/cet4-2025-12-set2/answer-key')
        .expect(200)
        .expect((answerResponse) => {
          expect(answerResponse.text).toContain('1. A');
        });
      await request(localApp)
        .get('/api/local-real-papers/cet4-2020-07-combo/answer-key')
        .expect(200)
        .expect((answerResponse) => {
          expect(answerResponse.text).toContain('# 2020年7月英语四级真题(组合卷) 答案');
          expect(answerResponse.text).toContain('1.C');
        });

      await request(localApp)
        .get('/api/local-real-papers/cet4-2025-12-set2/audio')
        .expect(200)
        .expect('Content-Type', /audio\/mpeg/);

      const { token } = await registerApiUser(localApp, 'local-paper-reference');
      await request(localApp)
        .get('/api/local-real-papers/cet4-2025-12-set2/ai-reference')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect((referenceResponse) => {
          expect(referenceResponse.body).toMatchObject({
            reference: null,
            status: 'missing',
          });
        });

      await request(localApp)
        .get('/api/local-real-papers/missing-paper/pdf')
        .expect(404);

      await request(localApp)
        .get('/api/local-real-papers?exam=ielts')
        .expect(400);
    } finally {
      if (previousRoot === undefined) {
        delete process.env.LOCAL_REAL_PAPER_ROOT;
      } else {
        process.env.LOCAL_REAL_PAPER_ROOT = previousRoot;
      }
      if (previousAnswerRoot === undefined) {
        delete process.env.LOCAL_REAL_PAPER_ANSWER_ROOT;
      } else {
        process.env.LOCAL_REAL_PAPER_ANSWER_ROOT = previousAnswerRoot;
      }
      if (previousAudioRoot === undefined) {
        delete process.env.LOCAL_REAL_PAPER_AUDIO_ROOT;
      } else {
        process.env.LOCAL_REAL_PAPER_AUDIO_ROOT = previousAudioRoot;
      }
      await fs.rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('uses browser speech fallback when generated listening audio is disabled', async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'etc-local-papers-browser-speech-'));
    const cet4Directory = path.join(tempRoot, '大学英语四级');
    const answerRoot = path.join(tempRoot, 'answers');
    await fs.mkdir(cet4Directory, { recursive: true });
    await fs.mkdir(answerRoot, { recursive: true });
    await fs.writeFile(path.join(cet4Directory, '2025年12月英语四级真题(第1套).pdf'), MINIMAL_CET4_REAL_PAPER_PDF);
    await fs.writeFile(
      path.join(answerRoot, '大学英语四级-纯答案.md'),
      '# 大学英语四级纯答案\n\n### 2025年12月英语四级真题(第1套)\n\n1.C 2.A 3.C 4.B\n',
    );

    const previousRoot = process.env.LOCAL_REAL_PAPER_ROOT;
    const previousAnswerRoot = process.env.LOCAL_REAL_PAPER_ANSWER_ROOT;
    const previousAudioRoot = process.env.LOCAL_REAL_PAPER_AUDIO_ROOT;
    const previousGeneratedAudioEnabled = process.env.LOCAL_REAL_PAPER_GENERATED_AUDIO_ENABLED;
    process.env.LOCAL_REAL_PAPER_ROOT = tempRoot;
    process.env.LOCAL_REAL_PAPER_ANSWER_ROOT = answerRoot;
    delete process.env.LOCAL_REAL_PAPER_AUDIO_ROOT;
    process.env.LOCAL_REAL_PAPER_GENERATED_AUDIO_ENABLED = 'false';

    try {
      const localApp = createApp({
        saasStore: createInMemorySaasStore(),
        saasSessionSecret: 'test-local-real-papers-browser-speech-secret',
      });
      const response = await request(localApp)
        .get('/api/local-real-papers?exam=cet4')
        .expect(200);

      expect(response.body).toMatchObject({
        examId: 'cet4',
        total: 1,
        sourceStatus: 'local-scan',
        answerKeyStatus: 'ready',
        listeningAssetStatus: 'browser-tts',
      });
      expect(response.body.papers[0]).toMatchObject({
        id: 'cet4-2025-12-set1',
        hasAnswerKey: true,
        hasListeningAudio: false,
        answerKeyUrl: '/api/local-real-papers/cet4-2025-12-set1/answer-key',
        answerSource: 'local-file',
        listeningSource: 'browser-tts',
      });
      expect(response.body.papers[0].listeningAudioUrl).toBeUndefined();

      await request(localApp)
        .get('/api/local-real-papers/cet4-2025-12-set1/generated-listening-audio')
        .expect(404)
        .expect((audioResponse) => {
          expect(audioResponse.body.error).toBe('generated_listening_audio_unavailable');
        });
    } finally {
      if (previousRoot === undefined) {
        delete process.env.LOCAL_REAL_PAPER_ROOT;
      } else {
        process.env.LOCAL_REAL_PAPER_ROOT = previousRoot;
      }
      if (previousAnswerRoot === undefined) {
        delete process.env.LOCAL_REAL_PAPER_ANSWER_ROOT;
      } else {
        process.env.LOCAL_REAL_PAPER_ANSWER_ROOT = previousAnswerRoot;
      }
      if (previousAudioRoot === undefined) {
        delete process.env.LOCAL_REAL_PAPER_AUDIO_ROOT;
      } else {
        process.env.LOCAL_REAL_PAPER_AUDIO_ROOT = previousAudioRoot;
      }
      if (previousGeneratedAudioEnabled === undefined) {
        delete process.env.LOCAL_REAL_PAPER_GENERATED_AUDIO_ENABLED;
      } else {
        process.env.LOCAL_REAL_PAPER_GENERATED_AUDIO_ENABLED = previousGeneratedAudioEnabled;
      }
      await fs.rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('falls back to bundled CET-4 real paper PDFs when the scan root is unavailable', async () => {
    const previousRoot = process.env.LOCAL_REAL_PAPER_ROOT;
    const previousAnswerRoot = process.env.LOCAL_REAL_PAPER_ANSWER_ROOT;
    const previousAudioRoot = process.env.LOCAL_REAL_PAPER_AUDIO_ROOT;
    process.env.LOCAL_REAL_PAPER_ROOT = path.join(os.tmpdir(), `etc-missing-local-papers-${Date.now()}`);
    delete process.env.LOCAL_REAL_PAPER_ANSWER_ROOT;
    delete process.env.LOCAL_REAL_PAPER_AUDIO_ROOT;

    try {
      const localApp = createApp({
        saasStore: createInMemorySaasStore(),
        saasSessionSecret: 'test-bundled-real-papers-secret',
      });
      const response = await request(localApp)
        .get('/api/local-real-papers?exam=cet4')
        .expect(200);

      expect(response.body).toMatchObject({
        examId: 'cet4',
        total: 3,
        sourceStatus: 'bundled',
      });
      expect(response.body.papers.map((paper: { id: string }) => paper.id)).toContain('cet4-2023-06-set1');
      expect(response.body.papers[0]).toMatchObject({
        pdfUrl: '/api/local-real-papers/cet4-2023-06-set1/pdf',
        source: 'bundled',
      });

      await request(localApp)
        .get('/api/local-real-papers/cet4-2023-06-set1/pdf')
        .expect(200)
        .expect('Content-Type', /application\/pdf/);

      await request(localApp)
        .get('/api/local-real-papers/cet4-2023-06-set1/content')
        .expect(200)
        .expect((contentResponse) => {
          expect(contentResponse.body.content).toMatchObject({
            paperId: 'cet4-2023-06-set1',
            truncated: false,
          });
          expect(JSON.stringify(contentResponse.body.content)).toMatch(/Part I Writing|写作/);
        });

      await request(localApp)
        .get('/api/local-real-papers/cet4-2023-06-set1/answer-key')
        .expect(404);
    } finally {
      if (previousRoot === undefined) {
        delete process.env.LOCAL_REAL_PAPER_ROOT;
      } else {
        process.env.LOCAL_REAL_PAPER_ROOT = previousRoot;
      }
      if (previousAnswerRoot === undefined) {
        delete process.env.LOCAL_REAL_PAPER_ANSWER_ROOT;
      } else {
        process.env.LOCAL_REAL_PAPER_ANSWER_ROOT = previousAnswerRoot;
      }
      if (previousAudioRoot === undefined) {
        delete process.env.LOCAL_REAL_PAPER_AUDIO_ROOT;
      } else {
        process.env.LOCAL_REAL_PAPER_AUDIO_ROOT = previousAudioRoot;
      }
    }
  });

  it('denies unauthenticated access to learning business APIs', async () => {
    await request(app)
      .post('/api/study/daily-plan')
      .send({ goal: { examId: 'cet4', dailyMinutes: 45 } })
      .expect(401);

    await request(app)
      .post('/api/practice/mock-exam-report')
      .send({ answers: { choices: {} } })
      .expect(401);
  });

  it('generates a daily plan from goal and evidence', async () => {
    const { token } = await registerApiUser(app, 'daily-plan');

    const response = await request(app)
      .post('/api/study/daily-plan')
      .set('Authorization', `Bearer ${token}`)
      .send({
        goal: {
          id: 'goal-cet4-primary',
          examId: 'cet4',
          examDate: '2026-06-13',
          dailyMinutes: 45,
          prioritySkills: ['reading', 'speaking'],
        },
      })
      .expect(200);

    expect(response.body.plan.tasks.length).toBeGreaterThan(0);
    expect(response.body.plan.plannedMinutes).toBe(45);
  });

  it('rejects unknown or roadmap-only exams before building a daily plan', async () => {
    const { token } = await registerApiUser(app, 'daily-plan-exam-guard');

    await request(app)
      .post('/api/study/daily-plan')
      .set('Authorization', `Bearer ${token}`)
      .send({ goal: { examId: 'unknown-exam', dailyMinutes: 45 } })
      .expect(400)
      .expect((response) => {
        expect(response.body.error).toBe('unsupported_exam');
      });

    await request(app)
      .post('/api/study/daily-plan')
      .set('Authorization', `Bearer ${token}`)
      .send({ goal: { examId: 'IELTS', dailyMinutes: 45 } })
      .expect(409)
      .expect((response) => {
        expect(response.body.error).toBe('exam_not_trainable');
      });
  });

  it('validates and normalizes imported passage material', async () => {
    const { token } = await registerApiUser(app, 'material-valid');

    const response = await request(app)
      .post('/api/materials/validate-passage')
      .set('Authorization', `Bearer ${token}`)
      .send({
        passage: {
          title: 'Urban Green Spaces',
          content:
            'Urban green spaces can help students relax. Researchers found that natural environments may reduce stress.',
          questions: [
            {
              id: 1,
              question: 'What may natural environments reduce?',
              options: { A: 'Stress', B: 'Transport', C: 'Planning', D: 'Homework' },
              correctAnswer: 'A',
              explanation: 'The passage states that natural environments may reduce stress.',
              correctSentence: 'Researchers found that natural environments may reduce stress.',
            },
          ],
        },
      })
      .expect(200);

    expect(response.body.passage.questions[0]).toMatchObject({
      examId: 'cet4',
      moduleId: 'reading',
      questionTypeId: 'careful-reading',
      sourceType: 'user-imported',
    });
  });

  it('rejects imported passage material with official exam provenance claims', async () => {
    const { token } = await registerApiUser(app, 'material-provenance');

    const response = await request(app)
      .post('/api/materials/validate-passage')
      .set('Authorization', `Bearer ${token}`)
      .send({
        passage: {
          title: 'CET-4 official past paper',
          content: 'Students should practice with original or authorized materials.',
          questions: [
            {
              id: 1,
              question: 'What should students use?',
              options: { A: 'Original materials', B: 'Random scans', C: 'Unmarked sources', D: 'Forum leaks' },
              correctAnswer: 'A',
              explanation: 'The passage mentions original or authorized materials.',
            },
          ],
        },
      })
      .expect(400);

    expect(response.body).toMatchObject({
      error: 'invalid_passage',
    });
    expect(response.body.message).toContain('content provenance cannot claim official');
  });

  it('rejects malformed imported passage material', async () => {
    const { token } = await registerApiUser(app, 'material-invalid');

    const response = await request(app)
      .post('/api/materials/validate-passage')
      .set('Authorization', `Bearer ${token}`)
      .send({ passage: { title: 'Broken', content: 'No questions.' } })
      .expect(400);

    expect(response.body.error).toBe('invalid_passage');
  });

  it('builds a practice completion report through API', async () => {
    const { token } = await registerApiUser(app, 'choice-report');

    const response = await request(app)
      .post('/api/practice/choice-report')
      .set('Authorization', `Bearer ${token}`)
      .send({
        examId: 'cet4',
        moduleId: 'reading',
        questionTypeId: 'careful-reading',
        modeId: 'api-test',
        skillArea: 'reading',
        plannedMinutes: 18,
        startedAt: new Date(Date.now() - 60_000).toISOString(),
        questions: [
          {
            id: 1,
            question: 'What is the main idea?',
            correctAnswer: 'B',
            type: 'synonym',
            correctSentence: 'Researchers found that active recall improves long-term learning.',
            explanation: 'The answer paraphrases active recall improves long-term learning.',
          },
        ],
        answers: [
          {
            selected: 'A',
            correct: false,
            confidence: 'sure',
          },
        ],
      })
      .expect(200);

    expect(response.body.report.attempts).toHaveLength(1);
    expect(response.body.report.reviewItems).toHaveLength(1);
    expect(response.body.report.reviewItems[0].memoryTask).toMatchObject({
      sourceText: 'Researchers found that active recall improves long-term learning.',
      spacingPlanDays: [1, 3, 7, 14, 30],
    });
    expect(response.body.report.reviewItems[0].memoryTask.clozePrompt).toContain('____');
    expect(response.body.report.skillProfiles[0]).toMatchObject({
      skillArea: 'reading',
      score: 0,
    });
  });

  it('builds a speaking completion report through API', async () => {
    const { token } = await registerApiUser(app, 'speaking-report');

    const response = await request(app)
      .post('/api/practice/speaking-report')
      .set('Authorization', `Bearer ${token}`)
      .send({
        examId: 'cet4',
        modeId: 'cet-set4-retell',
        startedAt: new Date(Date.now() - 45_000).toISOString(),
        originalSpeech: 'um I can see wind turbines and solar panels',
        analysisMode: 'live',
        analysis: {
          originalTextWithMarkings: '[filler um] I can see wind turbines and solar panels',
          improvedTextWithConnectors: 'The picture shows renewable energy facilities, which can reduce pollution and support sustainable development.',
          fillerCount: 1,
          fluencyAnalysis: '减少填充词，先完整输出主题句。',
          logicAnalysis: '补充观点、原因和限制。',
          vocabularyAnalysis: '用 renewable energy 替换 good energy。',
          scoreImprovementFrom: 58,
          scoreImprovementTo: 72,
        },
      })
      .expect(200);

    expect(response.body.report.session.moduleId).toBe('speaking');
    expect(response.body.report.reviewItems[0]).toMatchObject({
      targetType: 'speaking-pattern',
      skillArea: 'speaking',
    });
    expect(response.body.report.skillProfiles[0]).toMatchObject({
      skillArea: 'speaking',
      score: 72,
    });
  });

  it('rejects malformed speaking completion report payloads', async () => {
    const { token } = await registerApiUser(app, 'speaking-invalid');

    const response = await request(app)
      .post('/api/practice/speaking-report')
      .set('Authorization', `Bearer ${token}`)
      .send({
        originalSpeech: '',
        analysis: {},
      })
      .expect(400);

    expect(response.body.error).toBe('invalid_speaking_report');
  });

  it('falls back to structured subjective writing and translation evaluation without API key', async () => {
    const { token } = await registerApiUser(app, 'subjective-ai');
    const response = await request(app)
      .post('/api/ai/evaluate-subjective')
      .set('Authorization', `Bearer ${token}`)
      .send({
        moduleId: 'translation',
        prompt: 'Translate a paragraph about renewable energy.',
        answer: 'Renewable energy plays more important role in city development.',
      })
      .expect(200);

    expect(response.body.score).toBeGreaterThan(0);
    expect(response.body.mistakeReasons).toContain('中文干扰');
    expect(response.body).toHaveProperty('sampleAnswer');
  });

  it('falls back safely for diagnostic AI subjective evaluation without API key', async () => {
    const { token } = await registerApiUser(app, 'diagnostic-ai');
    const response = await request(app)
      .post('/api/ai/evaluate-diagnostic')
      .set('Authorization', `Bearer ${token}`)
      .send({
        examId: 'cet4',
        items: [
          {
            id: 'diag-writing-argument',
            skillArea: 'writing',
            title: '写作结构与论证',
            context: 'Topic: Should students use AI tools when learning English?',
            prompt: 'Write a short CET-4 argument paragraph.',
            answer: MOCK_WRITING_ESSAY,
            minWords: 45,
          },
        ],
      })
      .expect(200);

    expect(response.body.usedFallback).toBe(true);
    expect(response.body.evaluations['diag-writing-argument']).toMatchObject({
      itemId: 'diag-writing-argument',
      source: 'fallback',
      confidence: 'low',
    });
    expect(response.body.evaluations['diag-writing-argument'].score).toBeGreaterThan(0);
    expect(response.body.evaluations['diag-writing-argument'].comments[0]).toContain('AI');
  });

  it('builds a subjective completion report through API', async () => {
    const { token } = await registerApiUser(app, 'subjective-report');

    const response = await request(app)
      .post('/api/practice/subjective-report')
      .set('Authorization', `Bearer ${token}`)
      .send({
        examId: 'cet4',
        moduleId: 'writing',
        questionTypeId: 'short-essay',
        modeId: 'writing-practice',
        plannedMinutes: 30,
        startedAt: new Date(Date.now() - 90_000).toISOString(),
        prompt: 'Write about active practice.',
        answer: 'Active practice is important because students can find mistakes.',
        analysis: {
          score: 70,
          mistakeReasons: ['论证结构松散', '语法错误'],
          comments: ['结构需要更清楚。'],
          nextActions: ['增加主题句和例子。'],
          sampleAnswer: 'Active practice helps learners discover mistakes and review weak points.',
          confidence: 'medium',
        },
      })
      .expect(200);

    expect(response.body.report.session.moduleId).toBe('writing');
    expect(response.body.report.reviewItems[0]).toMatchObject({
      targetType: 'expression',
      skillArea: 'writing',
    });
    expect(response.body.report.skillProfiles[0]).toMatchObject({
      skillArea: 'writing',
      score: 70,
    });
  });

  it('builds a standard-structure mock exam report through API', async () => {
    const { token } = await registerApiUser(app, 'mock-report');

    const response = await request(app)
      .post('/api/practice/mock-exam-report')
      .set('Authorization', `Bearer ${token}`)
      .send({
        startedAt: new Date(Date.now() - 120_000).toISOString(),
        answers: {
          choices: Object.fromEntries(
            [
              ...CET4_MOCK_EXAM.listening.questions,
              ...CET4_MOCK_EXAM.reading.questions,
            ].map((question) => [
              question.id,
              question.correctAnswer,
            ]),
          ),
          writingAnswer: MOCK_WRITING_ESSAY,
          translationAnswer:
            'More and more college students use digital tools to learn English. Effective tools should not only give answers, but also help students find mistakes, actively recall knowledge, and return to weak points at the right time through regular review.',
        },
      })
      .expect(200);

    expect(response.body.report.session).toMatchObject({
      moduleId: 'mock',
      modeId: 'cet4-standard-mock',
    });
    expect(response.body.report.attempts).toHaveLength(57);
    expect(response.body.sectionScores).toHaveLength(4);
    expect(response.body.report.skillProfiles.map((profile: { subSkillId: string }) => profile.subSkillId)).toEqual([
      'mock-short-essay',
      'mock-listening-mixed',
      'mock-short-news',
      'mock-long-conversation',
      'mock-listening-passage',
      'mock-reading-mixed',
      'mock-word-bank',
      'mock-long-matching',
      'mock-careful-reading',
      'mock-paragraph-translation',
    ]);
  });

  it('requires authentication before using AI endpoints', async () => {
    await request(app)
      .post('/api/ai/generate-passage')
      .send({ topic: 'study habits' })
      .expect(401);
  });

  it('validates passage generation input', async () => {
    const { token } = await registerApiUser(app, 'passage-validation');
    await request(app)
      .post('/api/ai/generate-passage')
      .set('Authorization', `Bearer ${token}`)
      .send({ topic: '' })
      .expect(400);
  });

  it('falls back to original simulated passage generation without API key', async () => {
    const { token } = await registerApiUser(app, 'passage-fallback');
    const response = await request(app)
      .post('/api/ai/generate-passage')
      .set('Authorization', `Bearer ${token}`)
      .send({ topic: 'study habits' })
      .expect(200);

    expect(response.body.questions).toHaveLength(5);
    expect(response.body.title).toContain('模拟阅读');
  });

  it('surfaces AI usage-limit fallback status without exposing provider error details', async () => {
    const previous = {
      allowLive: process.env.ALLOW_LIVE_AI_IN_TESTS,
      provider: process.env.AI_PROVIDER,
      baseUrl: process.env.AI_BASE_URL,
      apiKey: process.env.AI_API_KEY,
      model: process.env.AI_MODEL,
    };
    const originalFetch = global.fetch;

    process.env.ALLOW_LIVE_AI_IN_TESTS = 'true';
    process.env.AI_PROVIDER = 'openai-compatible';
    process.env.AI_BASE_URL = 'https://api.example.test/v1';
    process.env.AI_API_KEY = 'test-secret';
    process.env.AI_MODEL = 'gpt-test';

    vi.stubGlobal('fetch', vi.fn(async () => new Response(
      JSON.stringify({
        error: {
          code: 'MONTHLY_LIMIT_EXCEEDED',
          message: 'test-secret should never reach public status payload',
        },
      }),
      { status: 429, headers: { 'Content-Type': 'application/json' } },
    )));

    try {
      const limitedApp = createApp({
        saasStore: createInMemorySaasStore(),
        saasSessionSecret: 'ai-usage-limit-secret',
      });
      const { token } = await registerApiUser(limitedApp, 'ai-usage-limited');

      await request(limitedApp)
        .post('/api/ai/generate-passage')
        .set('Authorization', `Bearer ${token}`)
        .send({ topic: 'study habits' })
        .expect(200);

      const aiStatus = await request(limitedApp).get('/api/ai/status').expect(200);
      expect(aiStatus.body).toMatchObject({
        configured: true,
        provider: 'openai-compatible',
        model: 'gpt-test',
        state: 'degraded',
        fallbackAvailable: true,
        shouldNotifyUser: true,
        lastFallbackReason: 'usage_limited',
        statusReason: 'usage_limited',
      });
      expect(aiStatus.body.fallbacksByReason).toMatchObject({ usage_limited: 1 });
      expect(JSON.stringify(aiStatus.body)).not.toContain('MONTHLY_LIMIT_EXCEEDED');
      expect(JSON.stringify(aiStatus.body)).not.toContain('test-secret');

      const health = await request(limitedApp).get('/api/health').expect(200);
      expect(health.body.aiRuntime).toMatchObject({
        state: 'degraded',
        fallbackAvailable: true,
        statusReason: 'usage_limited',
        lastFallbackReason: 'usage_limited',
      });
    } finally {
      vi.unstubAllGlobals();
      global.fetch = originalFetch;
      Object.entries(previous).forEach(([key, value]) => {
        const environmentKey = {
          allowLive: 'ALLOW_LIVE_AI_IN_TESTS',
          provider: 'AI_PROVIDER',
          baseUrl: 'AI_BASE_URL',
          apiKey: 'AI_API_KEY',
          model: 'AI_MODEL',
        }[key]!;
        if (value === undefined) delete process.env[environmentKey];
        else process.env[environmentKey] = value;
      });
    }
  });

  it('validates speech analysis input', async () => {
    const { token } = await registerApiUser(app, 'speech-validation');
    await request(app)
      .post('/api/ai/analyze-speech')
      .set('Authorization', `Bearer ${token}`)
      .send({})
      .expect(400);
  });

  it('falls back to structured speech analysis without API key', async () => {
    const { token } = await registerApiUser(app, 'speech-fallback');
    const response = await request(app)
      .post('/api/ai/analyze-speech')
      .set('Authorization', `Bearer ${token}`)
      .send({ originalSpeech: 'um I think technology is good because it helps me study' })
      .expect(200);

    expect(response.body).toHaveProperty('improvedTextWithConnectors');
    expect(response.body.fillerCount).toBeGreaterThanOrEqual(1);
  });

  it('keeps legacy Gemini-named AI routes as compatibility aliases', async () => {
    const { token } = await registerApiUser(app, 'gemini-alias');
    const response = await request(app)
      .post('/api/gemini/analyze-speech')
      .set('Authorization', `Bearer ${token}`)
      .send({ originalSpeech: 'well I want to improve my spoken English' })
      .expect(200);

    expect(response.body).toHaveProperty('improvedTextWithConnectors');
  });

  it('supports non-payment SaaS commercial operations from API to governance queues', async () => {
    const saasApp = createApp({
      saasStore: createInMemorySaasStore(),
      saasSessionSecret: 'commercial-ops-secret',
    });

    const owner = await request(saasApp)
      .post('/api/auth/register')
      .set('User-Agent', 'Playwright Chrome Owner')
      .send({
        email: 'commercial-owner@example.com',
        inviteCode: LOCAL_REGISTRATION_INVITE_CODE,
        password: 'secure-password-1',
        name: '商业化所有者',
        organizationName: '商业化运营团队',
      })
      .expect(201);

    const ownerLogin = await request(saasApp)
      .post('/api/auth/login')
      .set('User-Agent', 'Playwright Chrome Owner Second Device')
      .send({ email: 'commercial-owner@example.com', password: 'secure-password-1' })
      .expect(200);
    const ownerToken = ownerLogin.body.token as string;

    const sessions = await request(saasApp)
      .get('/api/auth/sessions')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    expect(sessions.body.sessions.length).toBeGreaterThanOrEqual(2);
    expect(sessions.body.sessions.some((session: { current: boolean }) => session.current)).toBe(true);

    const staleSession = sessions.body.sessions.find((session: { current: boolean; active: boolean }) => !session.current && session.active);
    if (staleSession) {
      await request(saasApp)
        .delete(`/api/auth/sessions/${staleSession.id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(204);
    }

    const invitation = await request(saasApp)
      .post('/api/workspace/invitations')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ email: 'commercial-member@example.com', role: 'member' })
      .expect(201);

    const invitationToken = new URL(invitation.body.invitationUrl).searchParams.get('token');
    expect(invitationToken).toEqual(expect.any(String));

    const member = await request(saasApp)
      .post('/api/workspace/invitations/accept')
      .send({
        token: invitationToken,
        name: '商业化成员',
        password: 'member-secure-password-1',
      })
      .expect(201);

    await request(saasApp)
      .get('/api/admin/overview')
      .set('Authorization', `Bearer ${member.body.token}`)
      .expect(403);

    const workspace = await request(saasApp)
      .get('/api/workspace/members')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    expect(workspace.body.members).toHaveLength(2);
    expect(workspace.body.invitations[0].acceptedAt).toEqual(expect.any(String));

    const content = await request(saasApp)
      .post('/api/admin/content-assets')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title: 'CET-4 原创阅读模拟题 A',
        assetType: 'reading',
        sourceType: 'original',
        licenseStatus: 'needs_review',
        notes: '原创模拟题，等待上线前复核。',
      })
      .expect(201);

    expect(content.body.asset.licenseStatus).toBe('needs_review');

    await request(saasApp)
      .patch(`/api/admin/content-assets/${content.body.asset.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ licenseStatus: 'cleared', notes: '已确认原创，可用于公开训练。' })
      .expect(200);

    await request(saasApp)
      .put('/api/cloud/learning-data')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        backup: {
          app: 'english-training-cabin',
          schemaVersion: 1,
          exportedAt: new Date().toISOString(),
          data: {
            studyGoals: [{ id: 'compliance-goal' }],
            practiceSessions: [],
            attempts: [],
            reviewItems: [],
            skillProfiles: [],
          },
        },
      })
      .expect(200);

    const archive = await request(saasApp)
      .get('/api/compliance/export')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    expect(archive.body.learningSnapshot.data.studyGoals).toHaveLength(1);

    const exportRequest = await request(saasApp)
      .post('/api/compliance/data-requests')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ requestType: 'export', note: '用户请求导出学习档案。' })
      .expect(201);

    expect(exportRequest.body.request.status).toBe('queued');

    const queuedRequests = await request(saasApp)
      .get('/api/compliance/data-requests')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    expect(queuedRequests.body.requests[0].requester.email).toBe('commercial-owner@example.com');

    await request(saasApp)
      .post(`/api/compliance/data-requests/${exportRequest.body.request.id}/resolve`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ status: 'completed', note: '已导出学习档案。' })
      .expect(200);

    const deleteRequest = await request(saasApp)
      .post('/api/compliance/data-requests')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ requestType: 'delete', note: '用户请求删除学习档案。' })
      .expect(201);

    const deleted = await request(saasApp)
      .post(`/api/compliance/data-requests/${deleteRequest.body.request.id}/resolve`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ status: 'completed', note: '已删除学习档案。' })
      .expect(200);

    expect(deleted.body.deletion.snapshotsDeleted).toBe(1);

    const afterDeletion = await request(saasApp)
      .get('/api/cloud/learning-data')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    expect(afterDeletion.body.snapshot).toBeNull();

    const operations = await request(saasApp)
      .get('/api/admin/operational-summary')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    expect(operations.body.overview).toMatchObject({
      members: 2,
      contentAssets: 1,
      openDataRequests: 0,
    });
    expect(operations.body.observability.api.requestsTotal).toBeGreaterThan(0);
  });

  it('keeps strict CSP in test and production-like runtime', () => {
    const policy = buildContentSecurityPolicy();

    expect(policy).toContain("script-src 'self'");
    expect(policy).toContain("connect-src 'self'");
    expect(policy).not.toContain("script-src 'self' 'unsafe-inline'");
    expect(policy).not.toContain('ws://127.0.0.1');
  });

  it('accepts quoted AI environment values passed through Docker env files', async () => {
    const previous = {
      allowLive: process.env.ALLOW_LIVE_AI_IN_TESTS,
      provider: process.env.AI_PROVIDER,
      baseUrl: process.env.AI_BASE_URL,
      apiKey: process.env.AI_API_KEY,
      model: process.env.AI_MODEL,
    };

    process.env.ALLOW_LIVE_AI_IN_TESTS = 'true';
    process.env.AI_PROVIDER = '"baseui"';
    process.env.AI_BASE_URL = '"https://api.example.test/v1"';
    process.env.AI_API_KEY = '"test-secret"';
    process.env.AI_MODEL = '"gpt-test"';

    try {
      const response = await request(createApp()).get('/api/health').expect(200);
      expect(response.body).toMatchObject({
        aiConfigured: true,
        aiProvider: 'baseui',
        aiModel: 'gpt-test',
      });

      const aiStatus = await request(createApp()).get('/api/ai/status').expect(200);
      expect(aiStatus.body).toMatchObject({
        configured: true,
        provider: 'baseui',
        model: 'gpt-test',
        fallbackAvailable: true,
      });
      expect(aiStatus.body).not.toHaveProperty('apiKey');
    } finally {
      Object.entries(previous).forEach(([key, value]) => {
        const environmentKey = {
          allowLive: 'ALLOW_LIVE_AI_IN_TESTS',
          provider: 'AI_PROVIDER',
          baseUrl: 'AI_BASE_URL',
          apiKey: 'AI_API_KEY',
          model: 'AI_MODEL',
        }[key]!;
        if (value === undefined) delete process.env[environmentKey];
        else process.env[environmentKey] = value;
      });
    }
  });
});
