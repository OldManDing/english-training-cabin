import crypto from 'node:crypto';
import dotenv from 'dotenv';
import { assertSmokeLearningBackupRoundTrip, createSmokeLearningBackup } from './smoke-learning-backup.mjs';

dotenv.config({ path: ['.env.production', '.env.local', '.env'] });

const baseUrl = (process.env.SMOKE_BASE_URL || process.env.APP_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
const timeoutMs = Number(process.env.SMOKE_TIMEOUT_MS || 60000);
const smokeRunId = crypto.randomUUID();
const smokeAccountDomain = (process.env.SMOKE_ACCOUNT_DOMAIN || 'example.com').trim();
const registrationInviteCode = process.env.SMOKE_REGISTRATION_INVITE_CODE || process.env.REGISTRATION_INVITE_CODE || 'ETC-LOCAL-2026';

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
assert(health.saas?.registrationInviteRequired === true, 'registration invite gate is not required');
assert(health.saas?.registrationInviteConfigured === true, 'registration invite code is not configured');
if (process.env.REQUIRE_AI_CONFIGURED !== 'false') {
  assert(health.aiConfigured === true, 'AI provider is not configured');
}
checks.push(`health ok (${health.aiProvider}/${health.aiModel}, store=${health.saas?.store})`);

const exams = await requestJson('/api/exams');
assert(Array.isArray(exams.exams) && exams.exams.length > 0, 'exam registry is empty');
assert(exams.activeExamIds?.includes('cet4'), 'CET-4 is not marked as the active trainable exam');
assert(exams.roadmapExamIds?.includes('ielts') && exams.roadmapExamIds?.includes('toefl'), 'roadmap exams are not published as metadata');
assert(exams.mockExam?.plannedMinutes === 137, 'standard mock exam metadata is not published');
assert(exams.mockExam?.listeningQuestionCount === 25, 'listening mock count is not standard');
assert(exams.mockExam?.readingQuestionCount === 30, 'reading mock count is not standard');
assert(exams.mockExam?.foundationQuestionCount === 8, 'foundation calibration count is not published');
checks.push('exam registry ok');

const registerEmail = `smoke-${smokeRunId}@${smokeAccountDomain}`;
const register = await requestJson('/api/auth/register', {
  method: 'POST',
  body: JSON.stringify({
    email: registerEmail,
    inviteCode: registrationInviteCode,
    password: `smoke-password-${smokeRunId}`,
    name: '上线冒烟账号',
    organizationName: `英语训练舱冒烟组织-${smokeRunId.slice(0, 8)}`,
  }),
});
assert(register.token && register.account?.user?.email === registerEmail, 'account registration failed');
checks.push('account registration ok');

let provenanceGuardRejected = false;
try {
  await requestJson('/api/materials/validate-passage', {
    method: 'POST',
    headers: { Authorization: `Bearer ${register.token}` },
    body: JSON.stringify({
      passage: {
        title: 'CET-4 official past paper',
        content: 'Students should use original or authorized materials.',
        questions: [
          {
            id: 1,
            question: 'What should students use?',
            options: { A: 'Original materials', B: 'Leaked files', C: 'Unmarked scans', D: 'Forum copies' },
            correctAnswer: 'A',
          },
        ],
      },
    }),
  });
} catch (error) {
  provenanceGuardRejected = String(error).includes('400') && String(error).includes('content provenance');
}
assert(provenanceGuardRejected, 'content provenance guard did not reject official exam claims');
checks.push('content provenance guard ok');

const plan = await requestJson('/api/study/daily-plan', {
  method: 'POST',
  headers: { Authorization: `Bearer ${register.token}` },
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

const cloud = await requestJson('/api/cloud/learning-data', {
  method: 'PUT',
  headers: { Authorization: `Bearer ${register.token}` },
  body: JSON.stringify({
    backup: createSmokeLearningBackup(smokeRunId.slice(0, 8)),
  }),
});
assert(cloud.snapshot?.counts?.studyGoals === 1, 'cloud learning snapshot failed');
assert(cloud.snapshot?.counts?.practiceSessions === 1, 'cloud snapshot did not count review sessions');
assert(cloud.snapshot?.counts?.attempts === 1, 'cloud snapshot did not count review attempts');
assert(cloud.snapshot?.counts?.reviewItems === 1, 'cloud snapshot did not count review items');
assert(cloud.snapshot?.counts?.skillProfiles === 1, 'cloud snapshot did not count skill profiles');

const cloudRoundTrip = await requestJson('/api/cloud/learning-data', {
  headers: { Authorization: `Bearer ${register.token}` },
});
assertSmokeLearningBackupRoundTrip(cloudRoundTrip.snapshot, assert);
checks.push('cloud review evidence snapshot ok');

if (process.env.SMOKE_LIVE_AI === 'true') {
  const passage = await requestJson('/api/ai/generate-passage', {
    method: 'POST',
    headers: { Authorization: `Bearer ${register.token}` },
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
