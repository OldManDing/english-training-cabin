# 2026-06-06 Vocabulary Inline Translations Release

- Release: `v1-20260606-vocabulary-inline-translations`
- Rollback: `v1-20260606-vocabulary-option-translation`
- Production path: `/opt/english-training-cabin/releases/v1-20260606-vocabulary-inline-translations`
- Image: `english-training-cabin:v1-20260606-vocabulary-inline-translations`
- Source bundle: `source-v1-20260606-vocabulary-inline-translations.tar.gz` (`2404456` bytes)
- Domain: `https://study.xmlga.top`
- Observed production bundle: `/assets/index-CxCgr1x4.js`

## User-Facing Scope

- Vocabulary practice now renders the submitted stem support directly under the stem area.
- Vocabulary option translations now render inside the corresponding option button after submit.
- The separate bottom answer-support area keeps the correct answer, example sentence translation, and explanation instead of duplicating stem/option translations.
- The UI keeps real Chinese translations and continues to reject placeholder or meta fallback text such as `中文译文暂缺`, `请以英文原句理解句意`, `表示一个名词概念`, and `不匹配的干扰释义`.

## Local Gates

- Targeted domain translation tests passed.
- Full domain/API test suite passed.
- Typecheck passed.
- Production build passed.
- Focused vocabulary Playwright smoke passed after rebuilding `dist`.

## Deployment

- Uploaded `source-v1-20260606-vocabulary-inline-translations.tar.gz` to `/opt/english-training-cabin/`.
- Extracted into `/opt/english-training-cabin/releases/v1-20260606-vocabulary-inline-translations`.
- Reused the server `.env.production`.
- Rebuilt and restarted the Docker deployment with image `english-training-cabin:v1-20260606-vocabulary-inline-translations`.
- Switched `current` to `/opt/english-training-cabin/releases/v1-20260606-vocabulary-inline-translations`.

## Production Verification

- Deployment-run status reported the app container as `healthy`.
- Deployment-run production smoke passed with `SMOKE_BASE_URL=https://study.xmlga.top SMOKE_REGISTRATION_INVITE_CODE=<live> npm run smoke:production`.
- Deployment-run GA smoke passed with `SMOKE_BASE_URL=https://study.xmlga.top SMOKE_REGISTRATION_INVITE_CODE=<live> npm run smoke:ga`.
- Current follow-up health check returned `status=ok`, `store=postgres`, `registrationInviteConfigured=true`, and AI runtime `degraded` with `statusReason=usage_limited`.
- Current live-asset Chromium check loaded `https://study.xmlga.top`, mocked only `/api/auth/session` because production invite/SSH access was unavailable in this shell, and verified the deployed frontend layout on the `method` card:
  - `题干中文：听单词和例句后，选择最准确的英文释义。目标词/语块：“method”；中文义：方法。`
  - `A. a way of doing something` contains `中文：做某事的方法或方式` inside the option button.
  - The post-answer support appears below the option translations.
  - The old centralized `题干与选项翻译` card is absent.
  - Placeholder and meta fallback text is absent.
- Current live-asset Chromium check also verified the previously reported `economic` card:
  - `C. related to the economy or money systems` contains `中文：与经济或货币体系有关` inside the option button.
  - `Better public transport can support economic development in a region.` renders `中文句意：更好的公共交通可以支持一个地区的经济发展。`
  - Placeholder and meta fallback text is absent.

## Evidence Files

- `manual-test-results/prod-vocabulary-inline-translations-method.json`
- `manual-test-results/prod-vocabulary-inline-translations-method.png`
- `manual-test-results/prod-vocabulary-inline-translations-economic.json`
- `manual-test-results/prod-vocabulary-inline-translations-economic.png`

## Residual Limitation

- Full live-auth browser registration was not rerun in this follow-up shell because SSH access to `study.xmlga.top` failed and no live registration invite value was available locally.
- The browser evidence still used real production assets from `https://study.xmlga.top`; only the auth-session response was mocked to reach the protected app UI.
