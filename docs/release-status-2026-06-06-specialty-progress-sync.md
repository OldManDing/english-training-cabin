# 2026-06-06 Specialty Progress Sync Release

- Release: `v1-20260606-specialty-progress-sync`
- Rollback: `v1-20260606-speech-natural-voice-rate-fix`
- Production path: `/opt/english-training-cabin/releases/v1-20260606-specialty-progress-sync`
- Image: `english-training-cabin:v1-20260606-specialty-progress-sync`
- Domain: `https://study.xmlga.top`

## Scope

- Specialty practice homepage progress now merges persisted attempts with submitted draft answers.
- Reading, vocabulary, and listening can return to the specialty homepage and immediately reflect updated `已练 x/y`.
- Draft restore regressions were stabilized with dedicated `data-testid` hooks in reading, vocabulary, and listening flows.

## Local Gates

- `npm run lint`
- `npm run test`
- `npm run build`
- `SMOKE_BASE_URL=http://127.0.0.1:3338 npm run smoke:production`
- `SMOKE_BASE_URL=http://127.0.0.1:3338 npm run smoke:ga`
- `npx playwright test tests/e2e/mvp-smoke.spec.ts --grep "unfinished reading practice resumes from the saved draft position|unfinished vocabulary and listening practice resume from saved drafts"`

## Production Verification

- `readlink -f /opt/english-training-cabin/current` -> `/opt/english-training-cabin/releases/v1-20260606-specialty-progress-sync`
- `docker inspect english-training-cabin-app-1` -> image `english-training-cabin:v1-20260606-specialty-progress-sync`, health `healthy`
- `curl http://127.0.0.1:3312/api/health` -> `aiProvider=baseui`, `aiModel=gpt-5.4-mini`, `saas.store=postgres`
- `SMOKE_BASE_URL=https://study.xmlga.top SMOKE_REGISTRATION_INVITE_CODE=<live> npm run smoke:production`
- `SMOKE_BASE_URL=https://study.xmlga.top SMOKE_REGISTRATION_INVITE_CODE=<live> npm run smoke:ga`
- `PLAYWRIGHT_BASE_URL=https://study.xmlga.top E2E_REGISTRATION_INVITE_CODE=<live> npx playwright test tests/e2e/mvp-smoke.spec.ts --grep "unfinished reading practice resumes from the saved draft position|unfinished vocabulary and listening practice resume from saved drafts" --workers=1`

## Result

- Production smoke passed.
- GA smoke passed with `live AI generation ok`.
- Live Playwright regression passed: `2 passed`.
