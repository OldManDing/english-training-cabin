# 2026-06-07 Review Quick Mode and History Pagination Release

- Release: `v1-20260607-review-quick-history-pagination`
- Rollback: `v1-20260607-answer-history-option-translation`
- Production path: `/opt/english-training-cabin/releases/v1-20260607-review-quick-history-pagination`
- Image: `english-training-cabin:v1-20260607-review-quick-history-pagination`
- Source bundle: `source-v1-20260607-review-quick-history-pagination.tar.gz` (`560159` bytes)
- Domain: `https://study.xmlga.top`

## Scope

- Changed review from a forced three-step writing flow to a two-step quick review flow: redo or recall, then feedback plus self-rating.
- Added review self-rating evidence: `mastered`, `unclear`, and `again`.
- Updated review scheduling so self-rating affects mastery, pass/fail evidence, and next interval.
- Added answered-history pagination with 10 items per page.
- Unified answered-history filter dropdowns with the shared `SelectField` component.

## Local Gates

- `npm run lint`
- `npm run test`
- `npm run build`
- `SMOKE_BASE_URL=http://127.0.0.1:3344 SMOKE_REGISTRATION_INVITE_CODE=<local> SMOKE_REQUIRE_LOCAL_REAL_PAPERS=true SMOKE_REQUIRE_LOCAL_REAL_ANSWERS=true npm run smoke:production`
- `SMOKE_BASE_URL=http://127.0.0.1:3344 SMOKE_REGISTRATION_INVITE_CODE=<local> SMOKE_REQUIRE_LOCAL_REAL_PAPERS=true SMOKE_REQUIRE_LOCAL_REAL_ANSWERS=true npm run smoke:ga`
- `npx playwright test tests/e2e/mvp-smoke.spec.ts tests/e2e/mobile-smoke.spec.ts --workers=1 --grep "MVP critical reading flow persists local learning evidence|vocabulary practice plays audio controls, scores answers, and persists review evidence|narrow phone keeps vocabulary answer translations inside the viewport after submit"`
- `npx playwright test tests/e2e/mvp-smoke.spec.ts --workers=1 --grep "due review reminder does not block grammar practice"`

## Local Result

- Typecheck passed.
- Domain/API tests passed: `16` files, `121` tests.
- Production build passed.
- Local production smoke passed with local real papers: `57` papers, answers ready.
- Local GA smoke passed, including live AI generation.
- Targeted local Playwright regression passed: `4` checks total.

## Deployment

- Uploaded `source-v1-20260607-review-quick-history-pagination.tar.gz` to `/opt/english-training-cabin/`.
- Extracted into `/opt/english-training-cabin/releases/v1-20260607-review-quick-history-pagination`.
- Reused the server `.env.production`.
- Rebuilt with `ENGLISH_TRAINING_IMAGE=english-training-cabin:v1-20260607-review-quick-history-pagination docker compose -p english-training-cabin --env-file .env.production -f docker-compose.production.yml up -d --build`.
- Switched `current` to `/opt/english-training-cabin/releases/v1-20260607-review-quick-history-pagination`.
- Initial post-switch curl ran before the service finished startup; follow-up container and API health checks passed.

## Production Verification

- `readlink -f /opt/english-training-cabin/current` -> `/opt/english-training-cabin/releases/v1-20260607-review-quick-history-pagination`
- `docker inspect english-training-cabin-app-1` -> image `english-training-cabin:v1-20260607-review-quick-history-pagination`, health `healthy`
- Initial `GET http://127.0.0.1:3312/api/health` after startup -> `status=ok`, `store=postgres`, `aiRuntime.state=ready`
- Final AI status check after smoke/E2E -> `provider=baseui`, `model=gpt-5.4-mini`, `state=degraded`, `fallbackAvailable=true`
- `SMOKE_BASE_URL=https://study.xmlga.top SMOKE_REGISTRATION_INVITE_CODE=<live> npm run smoke:production`
- `SMOKE_BASE_URL=https://study.xmlga.top SMOKE_REGISTRATION_INVITE_CODE=<live> npm run smoke:ga`
- `PLAYWRIGHT_BASE_URL=https://study.xmlga.top E2E_REGISTRATION_INVITE_CODE=<live> npx playwright test tests/e2e/mvp-smoke.spec.ts tests/e2e/mobile-smoke.spec.ts --workers=1 --grep "MVP critical reading flow persists local learning evidence|due review reminder does not block grammar practice|vocabulary practice plays audio controls, scores answers, and persists review evidence|narrow phone keeps vocabulary answer translations inside the viewport after submit"`
- Production answered-history browser check registered a temporary account, inserted 12 vocabulary attempts into IndexedDB, opened `已答题目`, verified unified dropdown classes, page `1-10 / 12`, and next page `11-12 / 12`.

## Production Result

- Production smoke passed.
- GA smoke passed, including live AI generation.
- Targeted live Playwright regression passed: `4 passed`.
- Production answered-history pagination and dropdown check passed.
- Current release pointer and running image both match `v1-20260607-review-quick-history-pagination`.
- Final container health is `healthy`; final API health is `ok`; final AI runtime is degraded with fallback available.
