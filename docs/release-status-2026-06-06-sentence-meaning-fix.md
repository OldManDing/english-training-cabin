# 2026-06-06 Sentence Meaning Fix Release

- Release: `v1-20260606-sentence-meaning-fix`
- Rollback: `v1-20260606-stem-translation-fix`
- Production path: `/opt/english-training-cabin/releases/v1-20260606-sentence-meaning-fix`
- Image: `english-training-cabin:v1-20260606-sentence-meaning-fix`
- Source bundle: `source-v1-20260606-sentence-meaning-fix.tar.gz` (`2419014` bytes)
- Domain: `https://study.xmlga.top`

## Root Cause

- The previous hotfix corrected the post-answer question-stem slots in `chineseSupport.ts`.
- The vocabulary example sentence slot is separate and comes from `sentenceTranslations.ts`.
- `getVocabularySentenceSupport()` still called `buildVocabularyFallback()` when an example sentence was missing from the fixed translation table.
- That fallback returned vocabulary analysis text such as `重点理解 a decline in attention...`, which was then rendered under `中文句意`.

## Scope

- Added a real Chinese sentence meaning for `Too many notifications may lead to a decline in attention.` -> `太多通知可能会导致注意力下降。`
- Added real Chinese meanings for the early core vocabulary example sentences that previously fell back to analysis.
- Added deterministic translations for generated productive-phrase example templates.
- Removed the analysis-copy fallback from the vocabulary sentence meaning path.
- Added tests that fail if vocabulary analysis copy appears in the example sentence meaning slot.

## Local Gates

- `npx vitest run tests/domain/sentenceTranslations.test.ts`
- `npm run test`
- `npm run build`

## Local Result

- Focused sentence translation test passed: `5` tests.
- Full domain/API gate passed: `15` files, `110` tests.
- Production build passed.
- Direct helper check returned `太多通知可能会导致注意力下降。` for the `decline` example and found `0` analysis-like sentence meanings containing the old `重点理解` copy.

## Deployment

- Uploaded `source-v1-20260606-sentence-meaning-fix.tar.gz` to `/opt/english-training-cabin/`.
- Extracted into `/opt/english-training-cabin/releases/v1-20260606-sentence-meaning-fix`.
- Reused the server `.env.production`.
- Rebuilt with `ENGLISH_TRAINING_IMAGE=english-training-cabin:v1-20260606-sentence-meaning-fix docker compose -p english-training-cabin --env-file .env.production -f docker-compose.production.yml up -d --build`.
- Switched `current` to `/opt/english-training-cabin/releases/v1-20260606-sentence-meaning-fix`.

## Production Verification

- `readlink -f /opt/english-training-cabin/current` -> `/opt/english-training-cabin/releases/v1-20260606-sentence-meaning-fix`
- `docker ps` -> `english-training-cabin-app-1 english-training-cabin:v1-20260606-sentence-meaning-fix`
- `curl http://127.0.0.1:3312/api/health` -> `status=ok`, `aiRuntime.state=ready`, `store=postgres`
- `SMOKE_BASE_URL=https://study.xmlga.top SMOKE_REGISTRATION_INVITE_CODE=<live> npm run smoke:production`
- `SMOKE_BASE_URL=https://study.xmlga.top SMOKE_REGISTRATION_INVITE_CODE=<live> npm run smoke:ga`

## Production Result

- Container health became `healthy`.
- Production smoke passed.
- GA smoke passed, including live AI generation.
