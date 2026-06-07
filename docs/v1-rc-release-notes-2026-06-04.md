# 英语训练舱 v1.0 RC 发布说明

日期：2026-06-04

版本：`1.0.0-rc.1`

状态：本地 RC 门禁通过，真实 AI provider smoke 通过；已上线 `https://study.xmlga.top`，线上 production smoke、GA smoke 和关键 E2E 已通过。

## 发布范围

本次 RC 将英语训练舱从可用 MVP 收敛为可公开发布候选版，重点是稳定闭环、可信诊断、极简界面和发布工程能力。

### 用户可见变化

- 学习闭环完整覆盖：诊断、今日计划、专项练习、复习、阶段模考、真题自练、能力进展和设置。
- 今日训练、登录、专项练习、复习、能力进展、设置等页面完成极简 UI 收敛，减少长解释和重复入口。
- 诊断报告明确展示分数、证据、置信度、下一步建议和非官方成绩声明。
- 真题自练和标准模考分离展示，资源状态明确标注可做、可看、答案、音频和缺失情况。
- 设置页新增反馈入口，反馈会写入 `.data/feedback/feedback.jsonl`。
- 登录页和设置页均可查看隐私协议与服务条款。
- 首页展示 AI 状态、降级原因和规则兜底说明。

### 工程与质量变化

- 非首页工作区使用 `React.lazy` 按需加载，题库、基础学习数据和诊断核心拆为独立 chunks。
- 主入口构建体积约 115.05 kB，当前构建不再出现 Vite 大 chunk 警告。
- 新增或强化 `/api/telemetry/event`、`/api/observability/summary`、`/api/ai/status`，用于观测 API 错误率、AI 兜底率和关键产品事件。
- 生产 smoke 覆盖 health、AI status、考试元数据、反馈入口、账号注册、内容来源拦截、每日计划和云端学习快照回环。
- 全按钮审计覆盖主要页面和状态，本轮点击 217 个按钮。

## 验证结果

本轮验证命令均已执行并通过：

```bash
npm run clean
npm run lint
npm run test
npm run build
npx playwright test
$env:SMOKE_BASE_URL = 'http://127.0.0.1:62159'
$env:REQUIRE_AI_CONFIGURED = 'false'
$env:SMOKE_REGISTRATION_INVITE_CODE = 'ETC-LOCAL-2026'
node scripts/production-smoke.mjs
$env:FULL_BUTTON_AUDIT = 'true'
npx playwright test tests/e2e/full-button-click-audit.spec.ts
$env:SMOKE_BASE_URL = 'http://127.0.0.1:65476'
$env:SMOKE_REGISTRATION_INVITE_CODE = 'ETC-LOCAL-2026'
$env:SMOKE_LIVE_AI = 'true'
node scripts/production-smoke.mjs
```

结果摘要：

| 门禁 | 结果 |
| --- | --- |
| TypeScript | `npm run lint` 通过 |
| Domain/API | `npm run test` 通过，13 个测试文件、91 个测试 |
| 构建 | `npm run build` 通过，无 Vite 大 chunk 警告 |
| E2E | `npx playwright test` 通过，27 passed，1 skipped |
| 生产 smoke | 通过，`Production smoke passed for http://127.0.0.1:62159` |
| 全按钮审计 | 通过，217 个按钮，17 个页面/状态 |
| Live AI smoke | 通过，`live AI generation ok` |

## 线上验证补充

- 线上地址：`https://study.xmlga.top`
- 当前发布目录：`/opt/english-training-cabin/releases/v1-20260604-rc1`
- `current` 已切换到上述发布目录
- `npm run smoke:production` 通过，健康检查、AI 状态、考试元数据、反馈入口、账号注册、内容来源拦截、每日计划和云端学习快照回环均正常
- `npm run smoke:ga` 通过，`live AI generation ok`
- `npx playwright test tests/e2e/mvp-smoke.spec.ts tests/e2e/mobile-smoke.spec.ts tests/e2e/ui-control-audit.spec.ts --workers=1` 通过，25 passed
- 线上 E2E 对本地真题音频控制按 `audio status` 兼容浏览器朗读回退，避免把 Linux 生产环境的无音频文件状态误判为失败
- 线上真题目录已恢复到 57 套 CET-4 本地真题，最新可见卷为 2025 年 12 月第 1 套，未提供本地音频时走浏览器朗读 fallback
- 线上 AI 运行态当前显示 `degraded / usage_limited`，但 fallback 可用，且 smoke 已验证可用路径

## 2026-06-05 复习降难度热修

- 发布目录：`/opt/english-training-cabin/releases/v1-20260605-review-ease`
- 回滚点：`/opt/english-training-cabin/releases/v1-20260604-rc1`
- 改动范围：主动回忆复习增加“简单模式”，不会写时可一键填简单模板、挖空参考答案和输出套句；继续保留原主动回忆、挖空、语境输出三步。
- 测试覆盖：`tests/e2e/mvp-smoke.spec.ts` 的阅读闭环复习流程改为点击简单路径按钮，避免只验证手填答案。
- 本地门禁：`npm run lint` 通过；`npm run test` 通过，13 个测试文件、92 条测试；`npm run build` 通过。
- 本地 E2E：`npx playwright test tests/e2e/mvp-smoke.spec.ts -g "MVP critical reading flow persists local learning evidence" --workers=1` 通过。
- 本地关键门禁：`npx playwright test tests/e2e/mvp-smoke.spec.ts tests/e2e/mobile-smoke.spec.ts tests/e2e/ui-control-audit.spec.ts --workers=1` 通过，25 passed。
- 本地生产 smoke：`SMOKE_BASE_URL=http://127.0.0.1:3337 npm run smoke:production` 通过，`local real papers ok (local-scan, 57 papers, answers=ready)`。
- 发布前服务器处理：根盘从 98% 使用率降至约 54%，仅清理 Docker build cache 和悬空镜像，未清理数据卷。
- 线上 production smoke：在 app 容器内执行 `SMOKE_BASE_URL=https://study.xmlga.top node scripts/production-smoke.mjs` 通过，覆盖 health、AI status、考试元数据、反馈入口、账号注册、内容来源拦截、每日计划和云端复习证据快照。
- 线上 GA smoke：在 app 容器内执行 `SMOKE_BASE_URL=https://study.xmlga.top node scripts/ga-smoke.mjs` 通过，`live AI generation ok`。
- 线上关键 E2E：带生产邀请码执行 `PLAYWRIGHT_BASE_URL=https://study.xmlga.top npx playwright test tests/e2e/mvp-smoke.spec.ts tests/e2e/mobile-smoke.spec.ts tests/e2e/ui-control-audit.spec.ts --workers=1` 通过，25 passed。
- 当前生产状态：`current -> /opt/english-training-cabin/releases/v1-20260605-review-ease`，app 镜像 `english-training-cabin:v1-20260605-review-ease`，容器 healthy。

### 2026-06-05 第 3 步按钮间距补丁

- 发布目录：`/opt/english-training-cabin/releases/v1-20260605-review-step3-actions`
- 回滚点：`/opt/english-training-cabin/releases/v1-20260605-review-ease`
- 改动范围：第 3 步“语境化输出”底部按钮从紧凑连续按钮改为独立行动区；手机端纵向分开，桌面端横向分开，避免按钮挤压或贴边。
- 本地验证：`npm run lint` 通过；`npm run build` 通过；`npx playwright test tests/e2e/mvp-smoke.spec.ts -g "MVP critical reading flow persists local learning evidence" --workers=1` 通过。

### 2026-06-05 复习队列改为错题重做优先

- 发布目录：`/opt/english-training-cabin/releases/v1-20260605-review-redo`
- 回滚点：`/opt/english-training-cabin/releases/v1-20260605-review-step3-actions`
- 改动范围：`ReviewItem` 新增 `redoQuestion` 原题快照，选择题错题保存题干、选项、原答案、正确答案和解析；复习页第 1 步改为“错题重做”，第 2 步为“错因回忆”，第 3 步为“输出巩固”。旧复习项没有原题快照时继续走旧主动回忆兜底，不阻断历史数据。
- 数据来源：阅读、听力、词汇、阶段模考和入门诊断的客观错题都会写入可重做题目；写作、翻译、口语等表达类复习仍保留表达巩固路径，不强行套 A/B/C/D。
- 本地门禁：`npm run lint` 通过；`npx vitest run tests/domain/reports.test.ts tests/domain/mockExam.test.ts tests/domain/onboardingDiagnostic.test.ts tests/domain/reviewCompletion.test.ts` 通过（4 files / 15 tests）；`npm run test` 通过（13 files / 93 tests）；`npm run build` 通过。
- 本地 smoke/E2E：`SMOKE_BASE_URL=http://127.0.0.1:3338 npm run smoke:production` 通过；`npx playwright test tests/e2e/mvp-smoke.spec.ts -g "MVP critical reading flow persists local learning evidence" --workers=1` 通过；`npx playwright test tests/e2e/mvp-smoke.spec.ts tests/e2e/mobile-smoke.spec.ts tests/e2e/ui-control-audit.spec.ts --workers=1` 通过（25 passed）。
- 线上验证：`https://study.xmlga.top/api/health` 正常；`SMOKE_BASE_URL=https://study.xmlga.top npm run smoke:production` 通过，覆盖 health、AI status、考试元数据、本地真题 57 套、反馈、注册、来源拦截、每日计划和云端复习证据快照；`PLAYWRIGHT_BASE_URL=https://study.xmlga.top npx playwright test tests/e2e/mvp-smoke.spec.ts -g "MVP critical reading flow persists local learning evidence" --workers=1` 通过。
- 当前生产状态：`current -> /opt/english-training-cabin/releases/v1-20260605-review-redo`，app 镜像 `english-training-cabin:v1-20260605-review-redo`，容器 `healthy`。

### 2026-06-05 专项练习已练进度接入真实证据

- 发布目录：`/opt/english-training-cabin/releases/v1-20260605-practice-progress`
- 回滚点：`/opt/english-training-cabin/releases/v1-20260605-review-redo`
- 改动范围：专项练习页“已练 x/y”改为从真实 `attempts` 和 `practiceSessions` 计算；阅读、听力、词汇、语法、完形、写作、翻译、模考统一走 `buildPracticeModuleProgress`。阅读总量使用真实阅读 passage 小题数，听力专项总量使用当前长对话训练题数，模考使用真实 mock session 数，不再用不一致的静态展示口径。
- 回归测试：`tests/domain/practicedQuestions.test.ts` 新增真实进度模型测试；`tests/e2e/mvp-smoke.spec.ts` 在阅读闭环后回到专项练习，断言显示 `已练 5/真实阅读总题数` 和真实阅读材料/题量。
- 本地门禁：`npm run lint` 通过；`npx vitest run tests/domain/practicedQuestions.test.ts` 通过（1 file / 5 tests）；`npm run test` 通过（13 files / 94 tests）；`npm run build` 通过。
- 本地 smoke/E2E：`SMOKE_BASE_URL=http://127.0.0.1:3339 npm run smoke:production` 通过；`npx playwright test tests/e2e/mvp-smoke.spec.ts -g "MVP critical reading flow persists local learning evidence" --workers=1` 通过；`npx playwright test tests/e2e/mvp-smoke.spec.ts tests/e2e/mobile-smoke.spec.ts tests/e2e/ui-control-audit.spec.ts --workers=1` 通过（25 passed）。
- 线上验证：`SMOKE_BASE_URL=https://study.xmlga.top npm run smoke:production` 通过，覆盖 health、AI status、考试元数据、本地真题 57 套、反馈、注册、来源拦截、每日计划和云端复习证据快照；`PLAYWRIGHT_BASE_URL=https://study.xmlga.top npx playwright test tests/e2e/mvp-smoke.spec.ts -g "MVP critical reading flow persists local learning evidence" --workers=1` 通过，确认线上专项练习显示真实已练阅读进度。
- 当前生产状态：`current -> /opt/english-training-cabin/releases/v1-20260605-practice-progress`，app 镜像 `english-training-cabin:v1-20260605-practice-progress`，容器 `healthy`。

### 2026-06-06 词汇听音答后补充中文题干和选项翻译

- 发布目录：`/opt/english-training-cabin/releases/v1-20260606-vocabulary-translation`
- 回滚点：`/opt/english-training-cabin/releases/v1-20260605-practice-progress`
- 改动范围：词汇听音练习提交答案后新增“题干与选项翻译”卡片，展示本题任务中文、目标词/语块中文义、A-D 英文释义逐项中文说明和正确项标识；答题前仍只显示单词中文义，不提前泄露正确选项。
- 数据口径：新增 `getVocabularyQuestionSupport`，从真实 `CET4_VOCABULARY_BANK` 词条生成中文辅助；手写核心词和 1500+ 生成词库都走同一领域函数，未命中模板时保留可读兜底说明。
- 本地门禁：`npm run lint` 通过；`npx vitest run tests/domain/sentenceTranslations.test.ts` 通过（1 file / 3 tests）；`npm run test` 通过（14 files / 97 tests）；`npm run build` 通过。
- 本地 E2E：`npx playwright test tests/e2e/mvp-smoke.spec.ts -g "vocabulary practice plays audio controls, scores answers, and persists review evidence" --workers=1` 通过，确认答后能看到题干中文、目标词中文义、正确选项英文释义和例句翻译。
- 本地关键门禁：`npx playwright test tests/e2e/mvp-smoke.spec.ts tests/e2e/mobile-smoke.spec.ts tests/e2e/ui-control-audit.spec.ts --workers=1` 通过（25 passed）；`SMOKE_BASE_URL=http://127.0.0.1:3340 npm run smoke:production` 通过，覆盖 health、AI status、考试元数据、本地真题 57 套、反馈、注册、来源拦截、每日计划和云端复习证据快照。
- 线上验证：`SMOKE_BASE_URL=https://study.xmlga.top npm run smoke:production` 通过，覆盖 health、AI status、考试元数据、本地真题 57 套、反馈、注册、来源拦截、每日计划和云端复习证据快照；`PLAYWRIGHT_BASE_URL=https://study.xmlga.top npx playwright test tests/e2e/mvp-smoke.spec.ts -g "vocabulary practice plays audio controls, scores answers, and persists review evidence" --workers=1` 通过，确认线上词汇听音答后显示题干与选项中文翻译。
- 当前生产状态：`current -> /opt/english-training-cabin/releases/v1-20260606-vocabulary-translation`，app 镜像 `english-training-cabin:v1-20260606-vocabulary-translation`，容器 `healthy`。

### 2026-06-06 播放语音无声修复

- 发布目录：`/opt/english-training-cabin/releases/v1-20260606-speech-audio-fix`
- 回滚点：`/opt/english-training-cabin/releases/v1-20260606-vocabulary-translation`
- 改动范围：`/api/practice/tts` 从仅 Windows SAPI 扩展为跨平台系统 TTS；生产镜像安装 `espeak-ng`，Linux 容器可直接生成 WAV；HTTPS 生产页面手动播放单词、例句、听力材料时优先走同源服务端音频，失败后再退回浏览器朗读并保留明确错误提示。
- 真题音频：本地真题生成 TTS 不再按操作系统硬禁用，生产 compose 默认开启 `LOCAL_REAL_PAPER_GENERATED_AUDIO_ENABLED=true`，仍可通过环境变量显式关闭。
- 本地门禁：`npm run lint` 通过；`npx vitest run tests/api/server.test.ts -t "practice TTS"` 通过；`npm run build` 通过；`npm run test` 通过（14 files / 98 tests）。
- 本地音频验证：生产构建启动到 `http://127.0.0.1:3319` 后，`POST /api/practice/tts` 生成 `test-results/local-practice-tts.wav`，文件大小 `65948` 字节。
- 本地 E2E：`npx playwright test tests/e2e/mvp-smoke.spec.ts -g "vocabulary practice keeps a visible message when browser speech synthesis fails" --workers=1` 通过；`npx playwright test tests/e2e/mvp-smoke.spec.ts -g "vocabulary practice plays audio controls" --workers=1` 通过；`npx playwright test tests/e2e/mvp-smoke.spec.ts tests/e2e/mobile-smoke.spec.ts tests/e2e/ui-control-audit.spec.ts --workers=1` 通过（26 passed）。
- 本地 Docker 构建说明：本机 Docker Desktop 因无法访问 Docker Hub `registry-1.docker.io` 拉取 `node:22-alpine` 元数据而未完成镜像构建；此项将以远端生产服务器实际构建和线上音频探测作为发布前阻断门禁。
- 线上构建：生产服务器 Docker build 通过，镜像内 `espeak-ng 1.52.0` 已安装；`current -> /opt/english-training-cabin/releases/v1-20260606-speech-audio-fix`，app 镜像 `english-training-cabin:v1-20260606-speech-audio-fix`，容器 `healthy`。
- 线上音频验证：`POST https://study.xmlga.top/api/practice/tts` 返回 `200 audio/wav`，`test-results/online-practice-tts-adapt.wav` 文件大小 `47118` 字节；线上 Playwright 点击“播放例句”监听到 `/api/practice/tts` 响应 `200 audio/wav`。
- 线上 smoke/E2E：`SMOKE_BASE_URL=https://study.xmlga.top SMOKE_REGISTRATION_INVITE_CODE=<live> npm run smoke:production` 通过，覆盖 health、AI status、本地真题 57 套、注册、每日计划和云端学习快照；`PLAYWRIGHT_BASE_URL=https://study.xmlga.top E2E_REGISTRATION_INVITE_CODE=<live> npx playwright test tests/e2e/mvp-smoke.spec.ts -g "vocabulary practice plays audio controls" --workers=1` 通过。

### 2026-06-06 语音音质修复

- 发布目录：`/opt/english-training-cabin/releases/v1-20260606-speech-natural-voice`
- 回滚点：`/opt/english-training-cabin/releases/v1-20260606-speech-audio-fix`
- 根因：上一版 Linux 生产环境用 `espeak-ng` 兜底生成 WAV，解决了无声，但音色偏机械，用户感知为“声音不正常”。
- 改动范围：生产镜像预装 `edge-tts==7.2.8` 到 `/opt/edge-tts`；`/api/practice/tts` 在非 Windows 环境优先使用 `en-US-JennyNeural` 神经语音输出 MP3，失败时自动回退到 `espeak-ng` WAV，避免再次无声；Windows 本地仍保留 SAPI 路径。
- 本地门禁：`npm run lint` 通过；`npx vitest run tests/api/server.test.ts -t "practice TTS"` 通过；`npm run build` 通过；`npm run test` 通过（14 files / 98 tests）；`npx playwright test tests/e2e/mvp-smoke.spec.ts -g "vocabulary practice plays audio controls" --workers=1` 通过。
- 本地音频验证：生产构建启动到 `http://127.0.0.1:3321` 后，`POST /api/practice/tts` 返回 `200 audio/wav`，`test-results/local-practice-tts-natural-fallback.wav` 文件大小 `306908` 字节，证明本机缺少 `edge-tts` 时仍能回退发声。
- 线上热修复：首次上线 `v1-20260606-speech-natural-voice` 后，`POST https://study.xmlga.top/api/practice/tts` 仍返回 `200 audio/wav`。容器日志确认 `edge-tts` 存在，但 CLI 收到 `--rate -7%` / `--rate -18%` 时把负数 rate 当作选项解析并报 `argument --rate: expected one argument`，因此服务端自动回退到 `espeak-ng`。
- 修复版本：`/opt/english-training-cabin/releases/v1-20260606-speech-natural-voice-rate-fix`，回滚点为 `/opt/english-training-cabin/releases/v1-20260606-speech-natural-voice`；app 镜像 `english-training-cabin:v1-20260606-speech-natural-voice-rate-fix`，容器 `healthy`。
- 修复内容：`edge-tts` 参数改为 `--rate=-7%` 这种单 token 形式，并新增 `buildEdgeTtsArguments` 回归测试，防止低速语音再次触发 argparse 负数参数解析问题。
- 热修复本地门禁：`npm run lint` 通过；`npx vitest run tests/api/server.test.ts -t "practice TTS|Edge TTS"` 通过（1 file / 2 tests）；`npm run test` 通过（14 files / 99 tests）；`npm run build` 通过；生产构建本地启动到 `http://127.0.0.1:3322` 后 `/api/health` 返回 `200`，`POST /api/practice/tts` 返回 `200 audio/wav`，`test-results/local-natural-rate-fix-tts.wav` 文件大小 `159414` 字节。
- 热修复线上音频验证：服务器内 `POST http://127.0.0.1:3312/api/practice/tts` 返回 `200 audio/mpeg`，文件大小 `42768` 字节；公网 `POST https://study.xmlga.top/api/practice/tts` 返回 `200 audio/mpeg`，`test-results/prod-natural-rate-fix-tts.mp3` 文件大小 `42768` 字节。
- 热修复线上点击验证：Playwright 真实页面从 `https://study.xmlga.top` 注册账号进入专项练习，点击“播放例句”后捕获 `/api/practice/tts` 的真实 POST，请求体 `{"text":"Students need to adapt to online learning when classes move to digital platforms.","rate":0.86}`，响应 `200 audio/mpeg`，`test-results/prod-click-natural-rate-fix-routed-tts.mp3` 文件大小 `33840` 字节，前缀 `ff f3 64 c4`，证明浏览器点击路径命中神经语音 MP3。
- 热修复线上 smoke/E2E：`SMOKE_BASE_URL=https://study.xmlga.top SMOKE_REGISTRATION_INVITE_CODE=<live> npm run smoke:production` 通过，覆盖 health、AI status、本地真题 57 套、反馈、注册、每日计划和云端复习证据快照；`PLAYWRIGHT_BASE_URL=https://study.xmlga.top E2E_REGISTRATION_INVITE_CODE=<live> npx playwright test tests/e2e/mvp-smoke.spec.ts -g "vocabulary practice plays audio controls" --workers=1` 通过（1 passed）。

## 证据文件

- `docs/v1-implementation-plan-2026-06-02.md`
- `test-results/production-smoke-final-62159-output.log`
- `test-results/production-smoke-final-62159-store.json`
- `test-results/production-smoke-final-62159-server.err.log`
- `test-results/full-button-click-audit.json`
- `test-results/production-smoke-live-ai-65476-output.log`
- `test-results/production-smoke-live-ai-65476-store.json`
- `test-results/production-smoke-live-ai-65476-server.err.log`

## 发布前配置

上线环境必须配置：

- `SAAS_SESSION_SECRET`
- `REGISTRATION_INVITE_CODE` 或 `REGISTRATION_INVITE_CODES`
- `APP_URL` 或 smoke 使用的 `SMOKE_BASE_URL`
- AI provider key、base URL、模型和额度监控
- 生产数据存储路径或 `DATABASE_URL`
- 备份策略和上一版构建产物保留路径

## 回滚方案

如果部署后任一关键 smoke 失败，应立即回滚：

1. 停止新版本服务进程或容器。
2. 恢复上一版 `dist`、环境变量快照和服务指针。
3. 重新启动上一版服务。
4. 执行最小恢复验证：`/api/health`、登录、今日训练、阶段模考入口。
5. 如果是数据存储问题，优先应用回滚和只读保护，不直接 drop 真实用户数据表。

## 发布结论

- `1.0.0-rc.1` 已完成线上发布并通过生产验证。
- 当前生产目录为 `/opt/english-training-cabin/releases/v1-20260604-rc1`，回滚点为 `/opt/english-training-cabin/releases/v1-20260602-real-paper-bundled-fallback`。
- 若后续出现回归，优先按本文回滚方案恢复上一版，再重新验证 `/api/health`、登录、今日训练和阶段模考入口。
