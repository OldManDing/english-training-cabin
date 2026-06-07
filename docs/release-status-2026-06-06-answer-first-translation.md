# 2026-06-06 Answer-First Translation Release

- Release: `v1-20260606-answer-first-translation`
- Rollback: `v1-20260606-specialty-progress-sync`
- Production path: `/opt/english-training-cabin/releases/v1-20260606-answer-first-translation`
- Image: `english-training-cabin:v1-20260606-answer-first-translation`
- Source bundle: `source-v1-20260606-answer-first-translation.tar.gz` (`495570` bytes)
- Domain: `https://study.xmlga.top`

## Scope

- Reading now keeps Chinese question meaning, option translations, and sentence translation hidden until after submit.
- Listening now keeps Chinese question meaning, option translations, and sentence translation hidden until after submit.
- Vocabulary keeps the existing post-answer translation behavior and now exposes stable post-answer and option-translation test hooks for regression checks.
- Playwright coverage now asserts the intended UX contract directly: no Chinese hint before answering, Chinese support visible after answering.

## Local Gates

- `npm run lint`
- `npm run test`
- `npm run build`
- `SMOKE_BASE_URL=http://127.0.0.1:3338 npm run smoke:production`
- `SMOKE_BASE_URL=http://127.0.0.1:3338 npm run smoke:ga`
- `npx playwright test tests/e2e/mvp-smoke.spec.ts tests/e2e/mobile-smoke.spec.ts tests/e2e/ui-control-audit.spec.ts --workers=1`
- `npx playwright test tests/e2e/mvp-smoke.spec.ts --workers=1 --grep "onboarding diagnostic persists the initial ability portrait before entering daily training"`
- `npx playwright test tests/e2e/mvp-smoke.spec.ts tests/e2e/mobile-smoke.spec.ts --workers=1 --grep "MVP critical reading flow persists local learning evidence|unfinished vocabulary and listening practice resume from saved drafts|vocabulary practice plays audio controls, scores answers, and persists review evidence|narrow phone keeps vocabulary answer translations inside the viewport after submit"`

## Local Result

- `lint`, domain/API tests, and production build all passed.
- Local production smoke passed against `http://127.0.0.1:3338`.
- Local GA smoke passed against `http://127.0.0.1:3338`.
- The full key Playwright gate finished with `26 passed` plus one transient environment failure (`net::ERR_NO_BUFFER_SPACE` before app load on the onboarding diagnostic case); the isolated rerun of that case passed immediately, so there was no reproduced product assertion failure in the suite.
- The focused post-answer translation regression set passed locally: `4 passed`.

## Deployment

- Uploaded `source-v1-20260606-answer-first-translation.tar.gz` to `/opt/english-training-cabin/`.
- Extracted into `/opt/english-training-cabin/releases/v1-20260606-answer-first-translation`.
- Reused the server `.env.production`.
- Rebuilt with `ENGLISH_TRAINING_IMAGE=english-training-cabin:v1-20260606-answer-first-translation docker compose -p english-training-cabin --env-file .env.production -f docker-compose.production.yml up -d --build`.
- Switched `current` to `/opt/english-training-cabin/releases/v1-20260606-answer-first-translation`.

## Production Verification

- `readlink -f /opt/english-training-cabin/current` -> `/opt/english-training-cabin/releases/v1-20260606-answer-first-translation`
- `docker inspect english-training-cabin-app-1` -> image `english-training-cabin:v1-20260606-answer-first-translation`
- `curl http://127.0.0.1:3312/api/health` -> app healthy, `aiProvider=baseui`, `aiModel=gpt-5.4-mini`, `saas.store=postgres`
- `SMOKE_BASE_URL=https://study.xmlga.top SMOKE_REGISTRATION_INVITE_CODE=<live> npm run smoke:production`
- `SMOKE_BASE_URL=https://study.xmlga.top SMOKE_REGISTRATION_INVITE_CODE=<live> npm run smoke:ga`
- `PLAYWRIGHT_BASE_URL=https://study.xmlga.top E2E_REGISTRATION_INVITE_CODE=<live> npx playwright test tests/e2e/mvp-smoke.spec.ts tests/e2e/mobile-smoke.spec.ts --workers=1 --grep "MVP critical reading flow persists local learning evidence|unfinished vocabulary and listening practice resume from saved drafts|vocabulary practice plays audio controls, scores answers, and persists review evidence|narrow phone keeps vocabulary answer translations inside the viewport after submit"`

## Production Result

- Production smoke passed.
- GA smoke command passed.
- Live targeted Playwright regression passed: `4 passed`.
- Current release pointer and running image both match `v1-20260606-answer-first-translation`.

## Operational Note

- At the end of verification, `GET /api/ai/status` returned `state=degraded`, `fallbackAvailable=true`, `statusReason=usage_limited`, and `fallbackRate=1`.
- This release is deployed and verified for the reading/listening/vocabulary translation-timing change, but the production AI provider is currently quota-limited and serving via fallback rather than a clean `ready` state.
