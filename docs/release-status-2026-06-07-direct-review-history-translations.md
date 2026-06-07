# 2026-06-07 Direct Review and Answer History Translations Release

- Release: `v1-20260607-direct-review-history-translations`
- Rollback: `v1-20260607-review-quick-history-pagination`
- Production path: `/opt/english-training-cabin/releases/v1-20260607-direct-review-history-translations`
- Image: `english-training-cabin:v1-20260607-direct-review-history-translations`
- Source bundle: `source-v1-20260607-direct-review-history-translations.tar.gz` (`2419306` bytes)
- Domain: `https://study.xmlga.top`

## Scope

- Changed the review queue into a direct, single-item review workspace with immediate actions.
- Kept review outcomes explicit through redo, recall, and self-rating feedback.
- Added answered-question history translations for prompt text, selected options, and correct answers.
- Preserved the answered-history pagination and shared dropdown styling from the previous release.

## Local Gates

- `npm run lint`
- `npx vitest run tests/domain/reviewCompletion.test.ts tests/domain/answerHistory.test.ts`
- `npm run build`
- `npm run test`
- `SMOKE_BASE_URL=http://127.0.0.1:3345 SMOKE_REGISTRATION_INVITE_CODE=<local> SMOKE_REQUIRE_LOCAL_REAL_PAPERS=true SMOKE_REQUIRE_LOCAL_REAL_ANSWERS=true npm run smoke:production`
- `SMOKE_BASE_URL=http://127.0.0.1:3345 SMOKE_REGISTRATION_INVITE_CODE=<local> SMOKE_REQUIRE_LOCAL_REAL_PAPERS=true SMOKE_REQUIRE_LOCAL_REAL_ANSWERS=true npm run smoke:ga`
- `npx playwright test tests/e2e/mvp-smoke.spec.ts -g "MVP critical reading flow persists local learning evidence" --workers=1`
- `npx playwright test tests/e2e/mobile-smoke.spec.ts -g "narrow phone reaches every primary workspace without horizontal clipping" --workers=1`
- `npx playwright test tests/e2e/ui-control-audit.spec.ts -g "primary workspaces keep controls usable and reset scroll on navigation" --workers=1`

## Local Result

- Lint passed.
- Targeted domain tests passed: `2` files, `9` tests.
- Full tests passed: `16` files, `121` tests.
- Production build passed.
- Local production smoke passed with local real papers: `57` papers, answers ready.
- Local GA smoke passed, including live AI generation.
- Targeted local Playwright checks passed.

## Deployment

- Uploaded `source-v1-20260607-direct-review-history-translations.tar.gz` to `/opt/english-training-cabin/`.
- Extracted into `/opt/english-training-cabin/releases/v1-20260607-direct-review-history-translations`.
- Reused the server `.env.production`.
- Rebuilt with `ENGLISH_TRAINING_IMAGE=english-training-cabin:v1-20260607-direct-review-history-translations docker compose -p english-training-cabin --env-file .env.production -f docker-compose.production.yml up -d --build`.
- Switched `current` to `/opt/english-training-cabin/releases/v1-20260607-direct-review-history-translations`.

## Production Verification

- `readlink -f /opt/english-training-cabin/current` -> `/opt/english-training-cabin/releases/v1-20260607-direct-review-history-translations`
- `docker inspect english-training-cabin-app-1` -> image `english-training-cabin:v1-20260607-direct-review-history-translations`, status `running`, health `healthy`
- Final `GET http://127.0.0.1:3312/api/health` -> `status=ok`, `store=postgres`, `aiRuntime.state=degraded`, `statusReason=usage_limited`, `fallbackAvailable=true`
- `SMOKE_BASE_URL=https://study.xmlga.top SMOKE_REGISTRATION_INVITE_CODE=<live> npm run smoke:production`
- `SMOKE_BASE_URL=https://study.xmlga.top SMOKE_REGISTRATION_INVITE_CODE=<live> npm run smoke:ga`
- `PLAYWRIGHT_BASE_URL=https://study.xmlga.top E2E_REGISTRATION_INVITE_CODE=<live> npx playwright test tests/e2e/mvp-smoke.spec.ts tests/e2e/mobile-smoke.spec.ts --workers=1 --grep "MVP critical reading flow persists local learning evidence|narrow phone reaches every primary workspace without horizontal clipping"`
- Production answered-history browser check registered a temporary account, inserted a vocabulary attempt into IndexedDB, opened answered history, and verified prompt, option, and correct-answer translations.
- Screenshot: `test-results/live-answer-history-translations-release.png`

## Production Result

- Production smoke passed.
- GA smoke passed, including live AI generation.
- Targeted live Playwright regression passed: `2 passed`.
- Production answered-history translation check passed with visible prompt, option, and correct-answer translations.
- Current release pointer and running image both match `v1-20260607-direct-review-history-translations`.
- Final container health is `healthy`; final API health is `ok`; AI runtime is degraded because of usage limiting, with fallback available.
