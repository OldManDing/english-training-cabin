# 2026-06-06 Stem Translation Fix Release

- Release: `v1-20260606-stem-translation-fix`
- Rollback: `v1-20260606-answer-first-translation`
- Production path: `/opt/english-training-cabin/releases/v1-20260606-stem-translation-fix`
- Image: `english-training-cabin:v1-20260606-stem-translation-fix`
- Source bundle: `source-v1-20260606-stem-translation-fix.tar.gz` (`2415961` bytes)
- Domain: `https://study.xmlga.top`

## Root Cause

- The UI containers were already separate, but `src/domain/practice/chineseSupport.ts` still returned fallback hint copy for many reading and listening items.
- Reading fell back to `本题考向...正确答案和定位解析提交后公布。`
- Listening fell back to `根据听力材料选择最佳答案；正确答案和错因解析提交后公布。`
- Previous Playwright checks only proved the block became visible after submit, not that it contained the real stem translation.

## Scope

- Reading now translates non-hardcoded题干 into real Chinese question stems before any fallback hint is considered.
- Listening now translates both fixed prompts and generated topic-template prompts into real Chinese stems.
- Added domain coverage that fails if the current reading/listening banks fall back to the generic post-answer hint copy.
- Tightened the affected MVP smoke assertions so the UI must not render the fallback hint strings in the post-answer stem slot.

## Local Gates

- `npm run test`
- `npm run build`
- `npx playwright test tests/e2e/mvp-smoke.spec.ts --grep "MVP critical reading flow persists local learning evidence|unfinished vocabulary and listening practice resume from saved drafts" --workers=1`

## Local Result

- `vitest` passed: `15` files, `108` tests.
- Production build passed.
- The targeted reading/vocabulary/listening Playwright regression passed locally: `2 passed`.

## Deployment

- Uploaded `source-v1-20260606-stem-translation-fix.tar.gz` to `/opt/english-training-cabin/`.
- Extracted into `/opt/english-training-cabin/releases/v1-20260606-stem-translation-fix`.
- Reused the server `.env.production`.
- Rebuilt with `ENGLISH_TRAINING_IMAGE=english-training-cabin:v1-20260606-stem-translation-fix docker compose -p english-training-cabin --env-file .env.production -f docker-compose.production.yml up -d --build`.
- Switched `current` to `/opt/english-training-cabin/releases/v1-20260606-stem-translation-fix`.

## Production Verification

- `readlink -f /opt/english-training-cabin/current` -> `/opt/english-training-cabin/releases/v1-20260606-stem-translation-fix`
- `docker ps` -> `english-training-cabin-app-1 english-training-cabin:v1-20260606-stem-translation-fix`
- `curl http://127.0.0.1:3312/api/health` -> `status=ok`, `aiProvider=baseui`, `aiModel=gpt-5.4-mini`, `store=postgres`
- `SMOKE_BASE_URL=https://study.xmlga.top SMOKE_REGISTRATION_INVITE_CODE=<live> npm run smoke:production`
- `SMOKE_BASE_URL=https://study.xmlga.top SMOKE_REGISTRATION_INVITE_CODE=<live> npm run smoke:ga`
- `PLAYWRIGHT_BASE_URL=https://study.xmlga.top E2E_REGISTRATION_INVITE_CODE=<live> npx playwright test tests/e2e/mvp-smoke.spec.ts --grep "MVP critical reading flow persists local learning evidence|unfinished vocabulary and listening practice resume from saved drafts" --workers=1`

## Production Result

- Production smoke passed.
- GA smoke passed.
- Live targeted Playwright regression passed: `2 passed`.
- `GET /api/health` reported `aiRuntime.state=ready`, `fallbackAvailable=true`.
