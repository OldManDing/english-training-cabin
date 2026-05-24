import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../server';

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
    expect(response.body.report.skillProfiles[0]).toMatchObject({
      skillArea: 'reading',
      score: 0,
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
});
