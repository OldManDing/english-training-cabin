import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { buildContentSecurityPolicy, createApp } from '../../server';
import { createInMemorySaasStore, signBillingWebhookPayload } from '../../src/server/saas';

describe('server API', () => {
  const app = createApp();

  it('returns health status', async () => {
    const response = await request(app).get('/api/health').expect(200);

    expect(response.body).toMatchObject({
      status: 'ok',
      app: 'english-training-cabin',
    });
    expect(response.body).toHaveProperty('aiProvider');
    expect(response.body).not.toHaveProperty('aiApiKey');
    expect(response.body).not.toHaveProperty('emailDelivery');
    expect(response.body.collaboration).toEqual({ invitationDelivery: 'manual-link' });
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['referrer-policy']).toBe('same-origin');
    expect(response.headers['permissions-policy']).toContain('microphone=(self)');
    expect(response.headers['content-security-policy']).toContain("default-src 'self'");
    expect(response.headers['content-security-policy']).toContain("frame-ancestors 'none'");
  });

  it('accepts allowed product telemetry events and exposes observability summary', async () => {
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

    const response = await request(app).get('/api/observability/summary').expect(200);

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

    const registerResponse = await request(saasApp)
      .post('/api/auth/register')
      .send({
        email,
        password: 'secure-password-1',
        name: '商业化学习者',
        organizationName: '英语训练商业化团队',
      })
      .expect(201);

    expect(registerResponse.body.token).toEqual(expect.any(String));
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

    const backup = {
      app: 'english-training-cabin',
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      data: {
        studyGoals: [{ id: 'goal-cet4-primary', status: 'active' }],
        practiceSessions: [{ id: 'session-1' }],
        attempts: [{ id: 'attempt-1' }],
        reviewItems: [{ id: 'review-1' }],
        skillProfiles: [{ id: 'profile-1' }],
      },
    };

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
        password: 'secure-password-1',
        name: '同名团队用户一',
        organizationName,
      })
      .expect(201);

    const second = await request(saasApp)
      .post('/api/auth/register')
      .send({
        email: 'same-org-second@example.com',
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
        password: 'secure-password-1',
        name: '重复邮箱用户',
        organizationName: '另一个团队',
      })
      .expect(409);

    expect(duplicateEmail.body.error).toBe('email_exists');
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
        password: 'secure-password-1',
        name: '第一位学习者',
        organizationName: '第一租户',
      })
      .expect(201);

    const second = await request(saasApp)
      .post('/api/auth/register')
      .send({
        email: 'second-tenant@example.com',
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

  it('does not expose email verification or password reset workflows', async () => {
    const saasApp = createApp({
      saasStore: createInMemorySaasStore(),
      saasSessionSecret: 'auth-hardening-secret',
    });

    const registerResponse = await request(saasApp)
      .post('/api/auth/register')
      .send({
        email: 'verify-reset@example.com',
        password: 'secure-password-1',
        name: '安全学习者',
        organizationName: '认证安全团队',
      })
      .expect(201);

    await request(saasApp)
      .post('/api/auth/login')
      .send({ email: 'verify-reset@example.com', password: 'secure-password-1' })
      .expect(200);

    await request(saasApp)
      .post('/api/auth/email-verification/request')
      .set('Authorization', `Bearer ${registerResponse.body.token}`)
      .expect(404);

    await request(saasApp)
      .post('/api/auth/password-reset/request')
      .send({ email: 'verify-reset@example.com' })
      .expect(404);
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
        password: 'secure-password-1',
        name: '增量学习者一',
        organizationName: '增量租户一',
      })
      .expect(201);

    const second = await request(saasApp)
      .post('/api/auth/register')
      .send({
        email: 'incremental-second@example.com',
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
    });
  });

  it('generates a daily plan from goal and evidence', async () => {
    const response = await request(app)
      .post('/api/study/daily-plan')
      .send({
        goal: {
          id: 'goal-cet4-primary',
          examId: 'cet4',
          examDate: '2026-06-15',
          dailyMinutes: 45,
          prioritySkills: ['reading', 'speaking'],
        },
      })
      .expect(200);

    expect(response.body.plan.tasks.length).toBeGreaterThan(0);
    expect(response.body.plan.plannedMinutes).toBe(45);
  });

  it('validates and normalizes imported passage material', async () => {
    const response = await request(app)
      .post('/api/materials/validate-passage')
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

  it('rejects malformed imported passage material', async () => {
    const response = await request(app)
      .post('/api/materials/validate-passage')
      .send({ passage: { title: 'Broken', content: 'No questions.' } })
      .expect(400);

    expect(response.body.error).toBe('invalid_passage');
  });

  it('builds a practice completion report through API', async () => {
    const response = await request(app)
      .post('/api/practice/choice-report')
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
    const response = await request(app)
      .post('/api/practice/speaking-report')
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
    const response = await request(app)
      .post('/api/practice/speaking-report')
      .send({
        originalSpeech: '',
        analysis: {},
      })
      .expect(400);

    expect(response.body.error).toBe('invalid_speaking_report');
  });

  it('falls back to structured subjective writing and translation evaluation without API key', async () => {
    const response = await request(app)
      .post('/api/ai/evaluate-subjective')
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

  it('builds a subjective completion report through API', async () => {
    const response = await request(app)
      .post('/api/practice/subjective-report')
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

  it('validates passage generation input', async () => {
    await request(app)
      .post('/api/ai/generate-passage')
      .send({ topic: '' })
      .expect(400);
  });

  it('falls back to original simulated passage generation without API key', async () => {
    const response = await request(app)
      .post('/api/ai/generate-passage')
      .send({ topic: 'study habits' })
      .expect(200);

    expect(response.body.questions).toHaveLength(5);
    expect(response.body.title).toContain('模拟阅读');
  });

  it('validates speech analysis input', async () => {
    await request(app)
      .post('/api/ai/analyze-speech')
      .send({})
      .expect(400);
  });

  it('falls back to structured speech analysis without API key', async () => {
    const response = await request(app)
      .post('/api/ai/analyze-speech')
      .send({ originalSpeech: 'um I think technology is good because it helps me study' })
      .expect(200);

    expect(response.body).toHaveProperty('improvedTextWithConnectors');
    expect(response.body.fillerCount).toBeGreaterThanOrEqual(1);
  });

  it('keeps legacy Gemini-named AI routes as compatibility aliases', async () => {
    const response = await request(app)
      .post('/api/gemini/analyze-speech')
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
