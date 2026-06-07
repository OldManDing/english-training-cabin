# 2026-06-06 Vocabulary Sentence Coverage Release

- Release: `v1-20260606-vocabulary-sentence-coverage`
- Rollback: `v1-20260606-sentence-meaning-fix`
- Production path: `/opt/english-training-cabin/releases/v1-20260606-vocabulary-sentence-coverage`
- Image: `english-training-cabin:v1-20260606-vocabulary-sentence-coverage`
- Source bundle: `source-v1-20260606-vocabulary-sentence-coverage.tar.gz` (`2398814` bytes)
- Domain: `https://study.xmlga.top`

## Root Cause

- The prior sentence-meaning hotfix fixed the `decline` example but left 116 seed vocabulary examples missing from `KNOWN_SENTENCE_TRANSLATIONS`.
- Those missing examples still fell through to `buildVocabularyFallback()`, which rendered `该例句的中文译文暂缺，请以英文原句理解句意。` under `中文句意`.
- The user-visible example was `Better public transport can support economic development in a region.`

## Scope

- Added explicit Chinese sentence meanings for all remaining seed vocabulary examples.
- Added the exact `economic development` regression:
  - English: `Better public transport can support economic development in a region.`
  - Chinese: `更好的公共交通可以支持一个地区的经济发展。`
- Strengthened domain tests so every current vocabulary example fails if `中文句意` contains placeholder or analysis-style copy.
- Strengthened the vocabulary Playwright smoke so the rendered sentence-translation block rejects the missing-translation placeholder.

## Local Gates

- `npx vitest run tests/domain/sentenceTranslations.test.ts`
- Direct helper scan over `CET4_VOCABULARY_BANK`
- `npm test`
- `npm run lint`
- `npm run build`
- `npx playwright test tests/e2e/mvp-smoke.spec.ts -g "vocabulary practice plays audio controls, scores answers, and persists review evidence" --workers=1`

## Local Result

- Focused sentence translation suite passed: `1` file, `6` tests.
- Direct helper check returned `更好的公共交通可以支持一个地区的经济发展。` for the `economic` example and found `0` placeholder sentence meanings.
- Full domain/API gate passed: `15` files, `111` tests.
- Typecheck passed.
- Production build passed.
- Focused vocabulary Playwright smoke passed: `1` test.

## Deployment

- Uploaded `source-v1-20260606-vocabulary-sentence-coverage.tar.gz` to `/opt/english-training-cabin/`.
- Extracted into `/opt/english-training-cabin/releases/v1-20260606-vocabulary-sentence-coverage`.
- Reused the server `.env.production`.
- Rebuilt with `ENGLISH_TRAINING_IMAGE=english-training-cabin:v1-20260606-vocabulary-sentence-coverage docker compose -p english-training-cabin --env-file .env.production -f docker-compose.production.yml up -d --build`.
- Switched `current` to `/opt/english-training-cabin/releases/v1-20260606-vocabulary-sentence-coverage`.

## Production Verification

- `readlink -f /opt/english-training-cabin/current` -> `/opt/english-training-cabin/releases/v1-20260606-vocabulary-sentence-coverage`
- `docker ps` -> `english-training-cabin-app-1 english-training-cabin:v1-20260606-vocabulary-sentence-coverage`
- `curl http://127.0.0.1:3312/api/health` -> `status=ok`, `aiRuntime.state=ready`, `store=postgres`
- `SMOKE_BASE_URL=https://study.xmlga.top SMOKE_REGISTRATION_INVITE_CODE=<live> npm run smoke:production`
- `SMOKE_BASE_URL=https://study.xmlga.top SMOKE_REGISTRATION_INVITE_CODE=<live> npm run smoke:ga`
- Live browser check seeded the normal vocabulary draft to the `economic` card, submitted it, and verified the rendered block:
  - `英文原句：Better public transport can support economic development in a region.`
  - `中文句意：更好的公共交通可以支持一个地区的经济发展。`

## Production Result

- Container health became `healthy`.
- Production smoke passed.
- GA smoke passed, including live AI generation.
- The exact production UI no longer shows `中文译文暂缺` or `请以英文原句` for the reported sentence.
