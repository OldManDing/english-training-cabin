# 2026-06-06 Vocabulary Option Translation Release

- Release: `v1-20260606-vocabulary-option-translation`
- Rollback: `v1-20260606-vocabulary-sentence-coverage`
- Production path: `/opt/english-training-cabin/releases/v1-20260606-vocabulary-option-translation`
- Image: `english-training-cabin:v1-20260606-vocabulary-option-translation`
- Source bundle: `source-v1-20260606-vocabulary-option-translation.tar.gz` (`2403360` bytes)
- Domain: `https://study.xmlga.top`

## Root Cause

- The previous hotfix covered vocabulary example sentence meanings, but submitted answer option translations still had two fallback gaps.
- Correct options that did not match a generated phrase pattern returned only the target word meaning, so `a way of doing something` rendered as `方法`.
- Unknown distractor options used the generic `translateToPhrase()` fallback, which rendered meta copy such as `表示一个名词概念：...这是与...不匹配的干扰释义。`

## Scope

- Added direct Chinese translations for the remaining fixed option phrases that previously hit the generic meta fallback.
- Changed correct-option resolution to prefer fixed phrase translations before falling back to the target word meaning.
- Added a `method` regression so the submitted options render as:
  - `A. a way of doing something` -> `做某事的方法或方式`
  - `B. a person in a class` -> `班级里的一个人`
  - `C. a result of a survey` -> `调查结果`
  - `D. a building near campus` -> `校园附近的建筑`
- Added a full current vocabulary bank guard that fails if option translations contain meta fallback copy.

## Local Gates

- `npx vitest run tests/domain/sentenceTranslations.test.ts`
- Direct helper scan over all `CET4_VOCABULARY_BANK` option translations
- `npm test`
- `npm run lint`
- `npm run build`
- `npx playwright test tests/e2e/mvp-smoke.spec.ts -g "vocabulary practice plays audio controls, scores answers, and persists review evidence" --workers=1`

## Local Result

- Focused sentence/option translation suite passed: `1` file, `8` tests.
- Direct helper check returned `badCount=0` for meta option translation patterns.
- Full domain/API gate passed: `15` files, `113` tests.
- Typecheck passed.
- Production build passed.
- Focused vocabulary Playwright smoke passed: `1` test.

## Deployment

- Uploaded `source-v1-20260606-vocabulary-option-translation.tar.gz` to `/opt/english-training-cabin/`.
- Extracted into `/opt/english-training-cabin/releases/v1-20260606-vocabulary-option-translation`.
- Reused the server `.env.production`.
- Rebuilt with `ENGLISH_TRAINING_IMAGE=english-training-cabin:v1-20260606-vocabulary-option-translation docker compose -p english-training-cabin --env-file .env.production -f docker-compose.production.yml up -d --build`.
- Switched `current` to `/opt/english-training-cabin/releases/v1-20260606-vocabulary-option-translation`.

## Production Verification

- Container health became `healthy`.
- `SMOKE_BASE_URL=https://study.xmlga.top SMOKE_REGISTRATION_INVITE_CODE=<live> npm run smoke:production`
- `SMOKE_BASE_URL=https://study.xmlga.top SMOKE_REGISTRATION_INVITE_CODE=<live> npm run smoke:ga`
- Live browser check registered a temporary account, seeded the normal vocabulary draft to the `method` card, submitted the answer, and verified the rendered option translations:
  - `A. a way of doing something` / `中文：做某事的方法或方式`
  - `B. a person in a class` / `中文：班级里的一个人`
  - `C. a result of a survey` / `中文：调查结果`
  - `D. a building near campus` / `中文：校园附近的建筑`

## Production Result

- Production smoke passed.
- GA smoke passed, including live AI generation.
- The submitted vocabulary option translation UI no longer shows `表示一个名词概念`, `表示一个动作`, or `不匹配的干扰释义` for the reported `method` card.
