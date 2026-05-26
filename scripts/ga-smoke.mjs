process.env.REQUIRE_AI_CONFIGURED ??= 'true';
process.env.SMOKE_LIVE_AI ??= 'true';

await import('./production-smoke.mjs');
