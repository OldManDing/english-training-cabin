import crypto from 'node:crypto';

const baseUrl = (process.env.SMOKE_BASE_URL || process.env.APP_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
const timeoutMs = Number(process.env.SMOKE_TIMEOUT_MS || 60000);
const smokeRunId = crypto.randomUUID();
const smokeEmailDomain = (process.env.SMOKE_EMAIL_DOMAIN || 'example.com').trim();

function withTimeout(promise, label) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
  return promise(controller.signal).finally(() => clearTimeout(timeout));
}

async function requestJson(path, init = {}) {
  return withTimeout(async (signal) => {
    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      signal,
      headers: {
        'Content-Type': 'application/json',
        ...init.headers,
      },
    });
    const text = await response.text();
    const body = text ? JSON.parse(text) : null;
    if (!response.ok) {
      throw new Error(`${init.method || 'GET'} ${path} failed with ${response.status}: ${text}`);
    }
    return body;
  }, path);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const checks = [];

const health = await requestJson('/api/health');
assert(health.status === 'ok', 'health status is not ok');
assert(health.saas?.authConfigured === true, 'SaaS auth is not configured');
if (process.env.REQUIRE_AI_CONFIGURED !== 'false') {
  assert(health.aiConfigured === true, 'AI provider is not configured');
}
if (process.env.REQUIRE_EMAIL_DELIVERY === 'true') {
  assert(health.emailDelivery?.configured === true, 'email delivery is not configured');
  assert(health.emailDelivery?.mode !== 'development-token', 'development email tokens are enabled');
}
checks.push(`health ok (${health.aiProvider}/${health.aiModel}, store=${health.saas?.store})`);

const exams = await requestJson('/api/exams');
assert(Array.isArray(exams.exams) && exams.exams.length > 0, 'exam registry is empty');
checks.push('exam registry ok');

const plan = await requestJson('/api/study/daily-plan', {
  method: 'POST',
  body: JSON.stringify({
    goal: {
      examId: 'cet4',
      targetScore: 550,
      examDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
      dailyMinutes: 45,
      prioritySkills: ['reading', 'listening', 'translation'],
    },
    reviewItems: [],
    skillProfiles: [],
  }),
});
assert(Array.isArray(plan.plan?.tasks) && plan.plan.tasks.length > 0, 'daily plan returned no tasks');
checks.push('daily plan ok');

const registerEmail = `smoke-${smokeRunId}@${smokeEmailDomain}`;
const register = await requestJson('/api/auth/register', {
  method: 'POST',
  body: JSON.stringify({
    email: registerEmail,
    password: `smoke-password-${smokeRunId}`,
    name: '上线冒烟账号',
    organizationName: `英语训练舱冒烟组织-${smokeRunId.slice(0, 8)}`,
  }),
});
assert(register.token && register.account?.user?.email === registerEmail, 'account registration failed');
checks.push('account registration ok');

if (process.env.REQUIRE_EMAIL_DELIVERY === 'true') {
  const verification = await requestJson('/api/auth/email-verification/request', {
    method: 'POST',
    headers: { Authorization: `Bearer ${register.token}` },
  });
  assert(verification.delivery === 'email', 'email verification was not delivered through the production adapter');
  checks.push(`email verification dispatch ok (${registerEmail})`);
}

const cloud = await requestJson('/api/cloud/learning-data', {
  method: 'PUT',
  headers: { Authorization: `Bearer ${register.token}` },
  body: JSON.stringify({
    backup: {
      app: 'english-training-cabin',
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      data: {
        studyGoals: [{ id: 'smoke-goal' }],
        practiceSessions: [],
        attempts: [],
        reviewItems: [],
        skillProfiles: [],
      },
    },
  }),
});
assert(cloud.snapshot?.counts?.studyGoals === 1, 'cloud learning snapshot failed');
checks.push('cloud snapshot ok');

if (process.env.SMOKE_LIVE_AI === 'true') {
  const passage = await requestJson('/api/ai/generate-passage', {
    method: 'POST',
    body: JSON.stringify({
      topic: 'campus study planning',
      difficulty: 'medium',
    }),
  });
  assert(passage.title && Array.isArray(passage.questions) && passage.questions.length === 5, 'AI passage generation failed');
  checks.push('live AI generation ok');
}

console.log(`Production smoke passed for ${baseUrl}`);
for (const check of checks) console.log(`- ${check}`);
