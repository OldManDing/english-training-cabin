# 2026-06-07 Answer History and Option Translation Release

- Release: `v1-20260607-answer-history-option-translation`
- Rollback: `v1-20260606-vocabulary-inline-translations`
- Production path: `/opt/english-training-cabin/releases/v1-20260607-answer-history-option-translation`
- Image: `english-training-cabin:v1-20260607-answer-history-option-translation`
- Source bundle: `source-v1-20260607-answer-history-option-translation.tar.gz` (`2416948` bytes)
- Domain: `https://study.xmlga.top`

## Scope

- Added an `已答题目` review page for answered question history across local practice evidence.
- Added sidebar and dashboard entry points for answered question lookup.
- Fixed vocabulary answer option translations so correct options use the option phrase translation instead of falling back to only the target word gloss.
- Fixed mobile vocabulary submission scrolling so the newly revealed stem and option translations remain in view.

## Local Gates

- `npm run lint`
- `npm run test`
- `npm run build`
- `SMOKE_BASE_URL=http://127.0.0.1:3342 SMOKE_REGISTRATION_INVITE_CODE=<local> npm run smoke:production`
- `SMOKE_BASE_URL=http://127.0.0.1:3342 SMOKE_REGISTRATION_INVITE_CODE=<local> npm run smoke:ga`
- `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3342 E2E_REGISTRATION_INVITE_CODE=<local> npx playwright test tests/e2e/mvp-smoke.spec.ts tests/e2e/mobile-smoke.spec.ts tests/e2e/ui-control-audit.spec.ts --workers=1`

## Local Result

- Typecheck passed.
- Domain/API tests passed: `16` files, `119` tests.
- Production build passed.
- Local production smoke passed with local real papers: `57` papers, answers ready.
- Local GA smoke passed, including live AI generation.
- Full key Playwright gate passed: `27 passed`.

## Deployment

- Uploaded `source-v1-20260607-answer-history-option-translation.tar.gz` to `/opt/english-training-cabin/`.
- Extracted into `/opt/english-training-cabin/releases/v1-20260607-answer-history-option-translation`.
- Reused the server `.env.production`.
- Rebuilt with `ENGLISH_TRAINING_IMAGE=english-training-cabin:v1-20260607-answer-history-option-translation docker compose -p english-training-cabin --env-file .env.production -f docker-compose.production.yml up -d --build`.
- Switched `current` to `/opt/english-training-cabin/releases/v1-20260607-answer-history-option-translation`.

## Production Verification

- `readlink -f /opt/english-training-cabin/current` -> `/opt/english-training-cabin/releases/v1-20260607-answer-history-option-translation`
- `docker inspect english-training-cabin-app-1` -> image `english-training-cabin:v1-20260607-answer-history-option-translation`, health `healthy`
- `GET https://study.xmlga.top/api/health` -> `status=ok`, `store=postgres`, `aiRuntime.state=ready`
- `SMOKE_BASE_URL=https://study.xmlga.top SMOKE_REGISTRATION_INVITE_CODE=<live> npm run smoke:production`
- `SMOKE_BASE_URL=https://study.xmlga.top SMOKE_REGISTRATION_INVITE_CODE=<live> npm run smoke:ga`
- `PLAYWRIGHT_BASE_URL=https://study.xmlga.top E2E_REGISTRATION_INVITE_CODE=<live> npx playwright test tests/e2e/mvp-smoke.spec.ts tests/e2e/mobile-smoke.spec.ts --workers=1 --grep "MVP critical reading flow persists local learning evidence|unfinished vocabulary and listening practice resume from saved drafts|vocabulary practice plays audio controls, scores answers, and persists review evidence|narrow phone keeps vocabulary answer translations inside the viewport after submit"`
- Production answer-history browser check registered a temporary account, inserted one `vocab-accurate` attempt into IndexedDB, opened `已答题目`, and verified `accurate`, answer `C`, and `correct and exact`.

## Production Result

- Production smoke passed.
- GA smoke passed, including live AI generation.
- Targeted live Playwright regression passed: `4 passed`.
- Production answer-history browser check passed.
- Current release pointer and running image both match `v1-20260607-answer-history-option-translation`.
