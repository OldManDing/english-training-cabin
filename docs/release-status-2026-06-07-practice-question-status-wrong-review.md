# 2026-06-07 Practice Question Status and Wrong Review Release

- Release: `v1-20260607-practice-question-status-wrong-review`
- Rollback: `v1-20260607-direct-review-history-translations`
- Production path: `/opt/english-training-cabin/releases/v1-20260607-practice-question-status-wrong-review`
- Image: `english-training-cabin:v1-20260607-practice-question-status-wrong-review`
- Source bundle: `source-v1-20260607-practice-question-status-wrong-review.tar.gz` (`535005` bytes)
- Domain: `https://study.xmlga.top`

## Scope

- Changed review queue eligibility so the queue only includes wrong-question redo items.
- Added per-module question status lists inside the specialty practice workspace.
- Marked practiced and unpracticed questions separately in each practice module.
- Saved new writing and translation attempts against the exact prompt id, so prompt-level status can be shown going forward.

## Local Gates

- `npm run lint`
- `npm run test`
- `npm run build`
- `npx playwright test tests/e2e/mvp-smoke.spec.ts -g "MVP critical reading flow persists local learning evidence|all MVP sections render their primary controls" --workers=1`
- `SMOKE_BASE_URL=http://127.0.0.1:3346 SMOKE_REGISTRATION_INVITE_CODE=<local> SMOKE_REQUIRE_LOCAL_REAL_PAPERS=true SMOKE_REQUIRE_LOCAL_REAL_ANSWERS=true npm run smoke:production`
- `SMOKE_BASE_URL=http://127.0.0.1:3346 SMOKE_REGISTRATION_INVITE_CODE=<local> SMOKE_REQUIRE_LOCAL_REAL_PAPERS=true SMOKE_REQUIRE_LOCAL_REAL_ANSWERS=true npm run smoke:ga`

## Local Result

- Lint passed.
- Domain/API tests passed: `16` files, `126` tests.
- Production build passed.
- Targeted local Playwright passed: `2 passed`.
- Local production smoke passed with local real papers: `57` papers, answers ready.
- Local GA smoke passed, including live AI generation.

## Deployment

- Uploaded `source-v1-20260607-practice-question-status-wrong-review.tar.gz` to `/opt/english-training-cabin/`.
- Extracted into `/opt/english-training-cabin/releases/v1-20260607-practice-question-status-wrong-review`.
- Reused the server `.env.production`.
- Rebuilt with `ENGLISH_TRAINING_IMAGE=english-training-cabin:v1-20260607-practice-question-status-wrong-review docker compose -p english-training-cabin --env-file .env.production -f docker-compose.production.yml up -d --build`.
- Switched `current` to `/opt/english-training-cabin/releases/v1-20260607-practice-question-status-wrong-review`.
- The first remote script's final inline `curl` command failed with a shell URL parsing issue after the container was already healthy; a standalone health check immediately passed.

## Production Verification

- `readlink -f /opt/english-training-cabin/current` -> `/opt/english-training-cabin/releases/v1-20260607-practice-question-status-wrong-review`
- `docker inspect english-training-cabin-app-1` -> image `english-training-cabin:v1-20260607-practice-question-status-wrong-review`, status `running`, health `healthy`
- Initial `GET http://127.0.0.1:3312/api/health` after deployment -> `status=ok`, `store=postgres`, `aiRuntime.state=ready`
- Final `GET http://127.0.0.1:3312/api/health` after smoke/E2E -> `status=ok`, `store=postgres`, `aiRuntime.state=degraded`, `statusReason=usage_limited`, `fallbackAvailable=true`
- `SMOKE_BASE_URL=https://study.xmlga.top SMOKE_REGISTRATION_INVITE_CODE=<live> npm run smoke:production`
- `SMOKE_BASE_URL=https://study.xmlga.top SMOKE_REGISTRATION_INVITE_CODE=<live> npm run smoke:ga`
- `PLAYWRIGHT_BASE_URL=https://study.xmlga.top E2E_REGISTRATION_INVITE_CODE=<live> npx playwright test tests/e2e/mvp-smoke.spec.ts --workers=1 --grep "MVP critical reading flow persists local learning evidence|all MVP sections render their primary controls"`

## Production Result

- Production smoke passed.
- GA smoke passed, including live AI generation.
- Targeted live Playwright regression passed: `2 passed`.
- Current release pointer and running image both match `v1-20260607-practice-question-status-wrong-review`.
- Final container health is `healthy`; final API health is `ok`; final AI runtime is degraded because of usage limiting, with fallback available. Production GA smoke still passed live AI generation during verification.
