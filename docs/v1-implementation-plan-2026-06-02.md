# 英语训练舱 v1.0 实施计划

日期：2026-06-02

关联文档：`docs/v1-maturity-minimal-ui-plan-2026-06-02.md`

## 1. 执行目标

本实施计划用于把 v1.0 成熟产品与极简 UI 计划落到工程任务。目标不是继续增加功能，而是让已有功能达到可公开发布的稳定度、可信度和一致性。

最终交付标准：

- 用户能完成“诊断 -> 今日计划 -> 自主专项 -> 复习 -> 阶段模考 -> 能力进展”闭环。
- 所有主要页面是极简、统一、可理解的学习工具界面。
- 诊断结果有分数、证据、置信度和下一步建议，并明确非官方成绩。
- 专项练习记录学习历史，下次进入优先未练题。
- 真题和模拟考试清晰分离，资源状态准确标注。
- 发布前通过完整工程测试、真实浏览器点击测试、移动端检查和生产 smoke。

## 2. 执行原则

| 原则 | 执行方式 |
| --- | --- |
| 先止血，再美化 | 先修隐藏错误、误导文案、资源状态，再做页面重排 |
| 小步提交 | 每个阶段只改一类问题，避免大面积回归 |
| 真实点击验证 | UI 改动必须用 Playwright 或真实浏览器路径验证 |
| 不伪造可信度 | 没有证据不展示分数，没有官方资源不说已补齐 |
| 不阻塞自主学习 | 复习可以推荐，但不能强制阻止语法、专项或模考 |
| 统一组件 | 优先复用 `ui-button`、`ui-panel`、`ui-chip` 等既有组件 |

## 3. 当前基线

截至 2026-06-02，已完成的基线项：

| 项目 | 状态 |
| --- | --- |
| 真题 AI 参考答案缺失状态 | 已从隐藏 404 改为 `200 + status: missing` |
| 真题资源卡片 | 已区分本地答案、AI 参考、官方原音缺失、浏览器朗读、TTS 辅助 |
| 专项练习学习历史 | 已接入 `persistedAttempts`，显示已练进度和未练优先状态 |
| 类型检查 | 已通过 `npm run lint` |
| API 测试 | 已通过 `npx vitest run tests/api/server.test.ts` |
| 领域测试 | 已通过诊断与专项过滤相关测试 |
| 生产构建 | 已通过 `npm run build` |
| 关键浏览器 smoke | 已通过真题/模考、词汇持久化、console error 检查 |

## 4. 阶段排期

| 阶段 | 目标 | 建议耗时 | 产出 |
| --- | --- | --- | --- |
| Phase 0 | 发布风险止血 | 0.5 天 | 资源状态、隐藏 404、历史记录状态修复 |
| Phase 1 | 极简 UI 收敛 | 1.5 天 | 登录、今日训练、专项、模考、设置的统一页面结构 |
| Phase 2 | 诊断可信度升级 | 1 天 | 诊断报告证据、置信度、非官方说明、低置信度降级 |
| Phase 3 | 内容与训练闭环 | 1.5 天 | 真题自练、标准模考、专项记录、草稿恢复完善 |
| Phase 4 | 发布工程与 QA | 1 天 | 全按钮 E2E、移动端、视觉截图、隐私条款、反馈入口、回滚方案 |

建议总周期：5 个工作日完成 v1.0 候选版。

## 5. Phase 0：发布风险止血

目标：先消除误导用户和线上报错的问题。

| 编号 | 任务 | 主要文件 | 验收 |
| --- | --- | --- | --- |
| P0-01 | 缺 AI 参考答案不产生隐藏 404 | `server.ts`、`MockExam.tsx`、`tests/api/server.test.ts` | GET 返回 `status: missing`，浏览器无资源 404 |
| P0-02 | 真题资源状态准确标注 | `MockExam.tsx`、`localRealPapers.ts` | 答案、音频、浏览器朗读、TTS、缺失资源都可区分 |
| P0-03 | 专项页显示学习记录规则 | `App.tsx`、`PracticeHub.tsx` | 页面显示已练进度、未练优先、题库回流 |
| P0-04 | 保留自主学习入口 | `TodayDashboard.tsx`、`PracticeHub.tsx` | 复习提醒不阻止语法、专项、模考入口 |

当前状态：P0-01、P0-02、P0-03 已完成；P0-04 已有基础实现，后续在 Phase 1 继续视觉收敛。

验证命令：

```bash
npm run lint
npx vitest run tests/api/server.test.ts
npx vitest run tests/domain/onboardingDiagnostic.test.ts tests/domain/practicedQuestions.test.ts
npx playwright test tests/e2e/mvp-smoke.spec.ts -g "application shell loads without browser console errors"
```

## 6. Phase 1：极简 UI 收敛

目标：让所有页面看起来像同一个产品，而不是多个页面拼在一起。

### 6.1 设计系统整理

| 编号 | 任务 | 主要文件 | 验收 |
| --- | --- | --- | --- |
| P1-01 | 梳理 `ui-*` 组件使用规则 | `src/index.css` | 按钮、卡片、标签、空状态、错误状态统一 |
| P1-02 | 减少页面局部 Tailwind 拼装 | 全部页面组件 | 同类按钮同样式，同类卡片同结构 |
| P1-03 | 建立视觉截图清单 | `tests/e2e` 或 `manual-test-results` | 输出登录、今日、专项、诊断结果、模考、真题、设置截图 |

### 6.2 登录页极简化

| 编号 | 任务 | 主要文件 | 验收 |
| --- | --- | --- | --- |
| P1-04 | 登录页只保留必要内容 | `AuthGate.tsx`、`SaasAccountPanel.tsx` | 产品名、账号、密码、邀请码、按钮、错误提示 |
| P1-05 | 删除登录页长解释 | `AuthGate.tsx`、`SaasAccountPanel.tsx` | 不出现功能说明型大段文案 |

### 6.3 今日训练页极简化

| 编号 | 任务 | 主要文件 | 验收 |
| --- | --- | --- | --- |
| P1-06 | 今日页只突出首要任务 | `TodayDashboard.tsx` | 首屏回答“做什么、为什么、点哪里” |
| P1-07 | 次要状态折叠或弱化 | `TodayDashboard.tsx` | 弱项诊断、进展、复习状态不抢主 CTA |
| P1-08 | 保留测试选择器 | `TodayDashboard.tsx`、`mvp-smoke.spec.ts` | 现有 E2E 不因文案重排失效 |

### 6.4 专项练习页统一

| 编号 | 任务 | 主要文件 | 验收 |
| --- | --- | --- | --- |
| P1-09 | 模块网格统一卡片 | `PracticeHub.tsx` | 每卡只保留模块名、状态、进度、主按钮 |
| P1-10 | 题库范围默认折叠 | `PracticeHub.tsx` | 详细题库说明不占主视觉 |
| P1-11 | 移动端卡片可点击 | `PracticeHub.tsx`、`mobile-smoke.spec.ts` | 320px 无横向滚动 |

### 6.5 阶段模考页分离入口

| 编号 | 任务 | 主要文件 | 验收 |
| --- | --- | --- | --- |
| P1-12 | 标准模考和真题自练视觉分离 | `MockExam.tsx` | 两个入口行为清晰，不混在一个概念里 |
| P1-13 | 真题卡片显示题号和资源状态 | `MockExam.tsx` | 卡片可判断可做、可看、有答案、有音频、缺资源 |

## 7. Phase 2：诊断可信度升级

目标：诊断结果可信、可解释、不过度承诺。

| 编号 | 任务 | 主要文件 | 验收 |
| --- | --- | --- | --- |
| P2-01 | 诊断题随机且避免重复 | `onboardingDiagnostic.ts`、`OnboardingDiagnostic.tsx` | 重进诊断不直接复用上一套题 |
| P2-02 | 答前不显示中文辅助 | `OnboardingDiagnostic.tsx`、`chineseSupport.ts` | 答前无中文解释、译文、解析 |
| P2-03 | 漏答可提交但降置信度 | `OnboardingDiagnostic.tsx`、`onboardingDiagnostic.ts` | 提交前提示，报告显示低置信度 |
| P2-04 | 规则评分和 AI 评分分层 | `server.ts`、`onboardingDiagnostic.ts` | 报告区分规则证据和 AI 辅助 |
| P2-05 | 每个分数显示证据和建议 | `OnboardingDiagnostic.tsx` | 分数、证据、置信度、建议同屏可见 |
| P2-06 | 非官方成绩声明 | `OnboardingDiagnostic.tsx` | 报告明确“仅用于学习规划” |

测试要求：

```bash
npx vitest run tests/domain/onboardingDiagnostic.test.ts
npx playwright test tests/e2e/mvp-smoke.spec.ts -g "onboarding diagnostic"
```

## 8. Phase 3：内容与训练闭环

目标：每个训练模块都能保存、恢复、推荐，不出现空数据。

### 8.1 专项学习历史

| 编号 | 任务 | 主要文件 | 验收 |
| --- | --- | --- | --- |
| P3-01 | 补全所有模块作答记录 | `VocabularyTraining.tsx`、`ReadingTraining.tsx`、`ListeningTraining.tsx`、`SubjectiveTraining.tsx` | 每个模块完成后写入 `Attempt` |
| P3-02 | 低信心题进入复习 | `lib/storage/db`、训练组件 | 低信心或错题生成 `ReviewItem` |
| P3-03 | 未练优先覆盖听力/阅读/词汇/语法 | `practicedQuestions.ts`、`App.tsx` | 题库未耗尽时不优先旧题 |
| P3-04 | 草稿恢复稳定 | `draftProgress.ts`、训练组件 | 中断后重新进入恢复位置 |

### 8.2 标准模拟考试

| 编号 | 任务 | 主要文件 | 验收 |
| --- | --- | --- | --- |
| P3-05 | 标准模考题型与 CET-4 一致 | `mockExam.ts`、`cet4.ts`、`questionBank.ts` | 写作、听力、阅读、翻译结构一致 |
| P3-06 | 模考提交前检查可理解 | `MockExam.tsx` | 未完成项定位明确，可提交或定位 |
| P3-07 | 模考成绩写入能力证据 | `MockExam.tsx`、`mockExam.ts` | 完成后写入 `SkillProfile` 和 `Attempt` |

### 8.3 真题自练

| 编号 | 任务 | 主要文件 | 验收 |
| --- | --- | --- | --- |
| P3-08 | 真题列表不为空 | `localRealPapers.ts`、`server.ts` | 无本地扫描时有明确内置/空状态 |
| P3-09 | 页面版解析失败显式提示 | `pdfText.ts`、`MockExam.tsx` | 解析失败不展示空白页面 |
| P3-10 | 答案状态准确 | `localRealPapers.ts`、`MockExam.tsx` | 本地答案、AI 参考、缺答案三类清楚 |
| P3-11 | 音频状态准确 | `localRealPapers.ts`、`MockExam.tsx` | 本地音频、TTS、浏览器朗读、缺音频清楚 |
| P3-12 | 真题自练草稿保存 | `MockExam.tsx`、`draftProgress.ts` | 页面版写作、翻译、选择题可恢复 |

测试要求：

```bash
npx vitest run tests/domain/practicedQuestions.test.ts tests/domain/mockExam.test.ts tests/domain/questionBankCoverage.test.ts
npx playwright test tests/e2e/mvp-smoke.spec.ts -g "target exam filters visible question bank"
npx playwright test tests/e2e/mvp-smoke.spec.ts -g "vocabulary practice plays audio controls"
```

## 9. Phase 4：发布工程与 QA

目标：达到公开发布前的最低工程安全线。

### 9.1 合规与用户信任

| 编号 | 任务 | 主要文件 | 验收 |
| --- | --- | --- | --- |
| P4-01 | 隐私协议 | `docs`、设置页 | 说明本地数据、账号数据、AI 数据边界 |
| P4-02 | 服务条款 | `docs`、设置页 | 说明非官方评分、非官方真题资源边界 |
| P4-03 | 用户反馈入口 | `SettingsSection.tsx` 或独立组件 | 用户能反馈 bug 和内容问题 |
| P4-04 | 内容来源说明 | `MockExam.tsx`、设置页 | 不暗示拥有官方真题授权 |

### 9.2 测试与监控

| 编号 | 任务 | 主要文件 | 验收 |
| --- | --- | --- | --- |
| P4-05 | 全按钮点击审计 | `tests/e2e/full-button-click-audit.spec.ts` | 登录、诊断、专项、复习、模考、真题、设置、导出、账号全通过 |
| P4-06 | UI 控件审计 | `tests/e2e/ui-control-audit.spec.ts` | 按钮禁用、错误、加载、空状态无异常 |
| P4-07 | 移动端 smoke | `tests/e2e/mobile-smoke.spec.ts` | 320px 无横向滚动，主按钮可点 |
| P4-08 | 生产 smoke | `scripts/production-smoke.mjs` | 线上 API、首页、关键路径可用 |
| P4-09 | 错误监控 | 服务端和前端错误上报 | 线上 console/API 错误可被发现 |
| P4-10 | 回滚方案 | `docs` 或 release 文档 | 有版本、命令、验证和回滚完成信号 |

完整验证命令：

```bash
npm run lint
npm run test
npm run build
npx playwright test
npm run smoke:production
```

## 10. 执行顺序

推荐执行顺序：

| 顺序 | 工作 | 原因 |
| --- | --- | --- |
| 1 | 锁定当前测试基线 | 防止后续 UI 重排无法判断回归来源 |
| 2 | 极简 UI 收敛 | 用户最直观看到的成熟度问题 |
| 3 | 诊断可信度增强 | 影响产品可信度和学习路径 |
| 4 | 专项历史与真题资源闭环 | 影响长期学习可用性 |
| 5 | 全按钮、移动端、视觉回归 | 发布前最后拦截 |
| 6 | 隐私条款、反馈、监控、回滚 | 上架必需能力 |

## 11. 每日执行检查

每天结束前必须确认：

| 检查项 | 标准 |
| --- | --- |
| 是否有隐藏 404 或 console error | 没有新增线上不可理解错误 |
| 是否破坏自主入口 | 语法、专项、模考仍可直接进入 |
| 是否误导资源状态 | 缺答案、缺音频、AI 参考都准确标注 |
| 是否影响学习记录 | 练习完成后仍写入记录，下次不优先旧题 |
| 是否通过基础测试 | 至少通过 `npm run lint` 和相关目标测试 |

## 12. 发布候选版出口条件

全部满足后才能进入 v1.0 release candidate：

- `npm run lint` 通过。
- `npm run test` 通过。
- `npm run build` 通过。
- `npx playwright test` 通过。
- `npm run smoke:production` 通过。
- 主要页面无 console error。
- 320px 移动端无横向滚动。
- 全按钮点击审计通过。
- 真题资源审计无空数据和误导状态。
- 诊断报告包含分数、证据、置信度、下一步建议和非官方声明。
- 隐私协议、服务条款、反馈入口、回滚方案已可访问。

## 13. 第一批建议开始任务

如果从下一轮开始执行代码改造，建议先做这 5 项：

| 顺序 | 任务 | 理由 |
| --- | --- | --- |
| 1 | 今日训练页极简化 | 当前信息密度最大，最影响第一印象 |
| 2 | 阶段模考入口重排 | 真题自练和模拟考试仍需更清晰区分 |
| 3 | 诊断结果非官方和证据展示强化 | 直接影响可信度 |
| 4 | 真题资源状态统一标签组件 | 防止后续再次出现“已补上”误导 |
| 5 | 全按钮点击审计补强 | 保证 UI 改完后主路径真实可用 |

## 14. 执行记录

### 2026-06-02：Phase 1 今日训练页极简化

已完成：

- 今日训练页从多卡片仪表盘压缩为“今日学习路径、主任务、目标状态、今日队列、能力证据、训练策略、复习队列”。
- 保留 `today-primary-task-title`、`today-primary-task-action`、`today-task-row-*`、`today-skill-diagnostic-*` 等关键测试选择器。
- 保留“调整今日训练时间”按钮和滚动恢复路径。
- 复习仍是推荐入口，不阻止语法、专项或模考。
- 已保存视觉检查截图：`C:\Users\MrDing\Documents\英语训练舱\today-dashboard-minimal-2026-06-02.png`。

已验证：

```bash
npm run lint
npx playwright test tests/e2e/mvp-smoke.spec.ts -g "diagnostic weakness updates the daily primary task and routes into the matching practice module"
npx playwright test tests/e2e/ui-control-audit.spec.ts -g "primary workspaces keep controls usable and reset scroll on navigation"
npx playwright test tests/e2e/mobile-smoke.spec.ts -g "mobile viewport can reach the learning cockpit and launch disclosure|tablet layout keeps dashboard"
npx playwright test tests/e2e/mvp-smoke.spec.ts -g "application shell loads without browser console errors"
npm run build
```

下一步：

- 继续执行 P1-04/P1-05 登录页极简复查。
- 执行 P1-12/P1-13 阶段模考入口分离和真题资源标签组件化。
- 进入 Phase 2，强化诊断报告的非官方声明、证据和置信度展示。

### 2026-06-02：Phase 1 登录页极简复查

已完成：

- 登录页收敛为单卡布局，只保留产品名、登录/邀请码入口、邮箱、密码、邀请码、提交按钮和必要错误提示。
- 保留 `登录`、`邀请码注册`、`忘记密码`、`返回登录`、`saas-auth-submit`、`saas-auth-error` 等既有测试依赖。
- 压缩账号面板的状态和高级入口说明，避免登录页出现长解释。
- 已保存视觉检查截图：`C:\Users\MrDing\Documents\英语训练舱\auth-minimal-2026-06-02.png`。

已验证：

```bash
npm run lint
npx playwright test tests/e2e/saas-account.spec.ts -g "SaaS registration shows a visible error for invalid invite codes"
npx playwright test tests/e2e/ui-control-audit.spec.ts -g "auth inputs and mode buttons validate locally before API submission"
npm run build
```

补充手动验证：

- 真实浏览器打开 `http://127.0.0.1:3000/`，登录页无 console error。
- 320px 宽度下 `scrollWidth = clientWidth = 320`，无横向滚动。

下一步：

- 执行 P1-12/P1-13：阶段模考入口分离和真题资源标签组件化。
- 进入 Phase 2：诊断报告证据、置信度和非官方声明强化。

### 2026-06-02：Phase 1 阶段模考入口分离与真题资源标签

已完成：

- 阶段模考页保留两个明确入口：`标准模拟考试` 和 `真题自练`，并用 `aria-pressed` 标记当前模式。
- 真题模式顶部统计改为真题维度：真题套数、答案状态、听力状态，不再显示标准模考分钟、模块完成和模考分。
- 真题资源统一显示为徽标：`页面可做 / 页面转换中 / 仅 PDF 可看`、`PDF 可看`、`有答案 / AI 参考答案 / 缺答案`、`有原音频 / TTS 音频 / 浏览器朗读 / 缺音频`、`不计入模考分`。
- 修复真题缺音频时仍可能显示 `TTS 练习音频` 的误导状态。
- 真题卡片增加卷序号和资源状态；只有当前选中卷显示详细说明，降低列表噪音。
- 已保存视觉检查截图：`C:\Users\MrDing\Documents\英语训练舱\mock-real-paper-resources-2026-06-02.png`。

已验证：

```bash
npm run lint
npm run build
npx playwright test tests/e2e/mvp-smoke.spec.ts -g "target exam filters visible question bank and mock exam guides incomplete submissions"
npx playwright test tests/e2e/ui-control-audit.spec.ts -g "primary workspaces keep controls usable and reset scroll on navigation"
```

补充手动验证：

- 真实浏览器打开 `http://127.0.0.1:3310/`，注册测试账号后进入阶段模考页。
- 桌面宽度下，标准模拟考试和真题自练入口分离，真题模式显示 `页面可做 / PDF 可看 / 有答案 / TTS 音频 / 不计入模考分`。
- 320px 宽度下 `scrollWidth = clientWidth = 305`，无横向滚动，真题入口和资源状态区可见。

下一步：

- 进入 Phase 2：诊断报告证据、置信度和非官方声明强化。
- 或继续 Phase 1 剩余 UI 收敛：把 `MockExam` 的真题面板拆出为独立子组件，降低后续维护成本。

### 2026-06-02：Phase 2 诊断报告证据与可信度强化

已完成：

- 诊断报告数据层新增 `validEvidenceCount` 和 `evidenceSummary`，区分“题目数量”和“实际有效证据”。
- 结果页顶部新增非官方声明：诊断不是 CET-4 官方成绩，只用于安排训练路径。
- 结果页新增证据拆解：有效客观证据、写入画像能力、主观采样证据、仅作训练方向。
- 每个能力卡片显示评分方法、可信度、证据数、证据摘要和下一步建议。
- 空答提交不会伪造分数或画像；会显示 0 有效证据和低可信状态。
- 已保存视觉检查截图：`C:\Users\MrDing\Documents\英语训练舱\diagnostic-reliability-report-2026-06-02.png`。

已验证：

```bash
npm run lint
npm run test -- tests/domain/onboardingDiagnostic.test.ts
npm run build
npx playwright test tests/e2e/mvp-smoke.spec.ts -g "onboarding diagnostic persists the initial ability portrait before entering daily training"
npx playwright test tests/e2e/mobile-smoke.spec.ts -g "narrow phone completes the responsive diagnostic layouts"
```

补充手动验证：

- 真实浏览器打开 `http://127.0.0.1:3310/`，注册临时账号后空答提交诊断。
- 结果页显示 `非官方诊断，不是 CET-4 官方成绩`、`0 有效客观证据`、`证据 0/2` 和下一步建议。
- 页面无横向溢出，console error 为 0。
- AI 复核接口当前因额度限制返回 429，应用已按预期回退到本地规则评分，不阻断诊断报告。

下一步：

- 继续 Phase 2：把诊断报告中的“规则评分”和“AI 复核”拆成更清楚的折叠解释。
- 或进入 Phase 1 收尾：拆分 `MockExam`、`OnboardingDiagnostic` 大组件，降低后续 UI 维护成本。

### 2026-06-02：Phase 2 诊断结果页组件拆分与评分说明

已完成：

- 新增 `DiagnosticResultPanel`，把诊断结果页从 `OnboardingDiagnostic` 主流程组件中拆出。
- 父组件仅保留诊断流程、答题、录音、提交和状态管理，结果页展示由子组件负责。
- 结果页新增“评分说明”，明确区分 `规则评分`、`AI 复核` 和 `写入画像`。
- 评分说明强调：客观题按标准答案核验；同一能力点至少 2 道有效题才写入画像；AI 只作为主观题 Rubric 参考，不作为官方定级。
- 保留既有测试标识：`diagnostic-nonofficial-notice`、`diagnostic-score-*`、`diagnostic-evidence-*`、`diagnostic-next-action-*`、`diagnostic-post-answer-support`。
- 已保存视觉检查截图：`C:\Users\MrDing\Documents\英语训练舱\diagnostic-result-panel-split-2026-06-02.png`。

已验证：

```bash
npm run lint
npm run test -- tests/domain/onboardingDiagnostic.test.ts
npm run build
npx playwright test tests/e2e/mvp-smoke.spec.ts -g "onboarding diagnostic persists the initial ability portrait before entering daily training"
npx playwright test tests/e2e/mobile-smoke.spec.ts -g "narrow phone completes the responsive diagnostic layouts"
```

补充手动验证：

- 真实浏览器打开 `http://127.0.0.1:3310/`，注册临时账号后空答提交诊断。
- 结果页显示 `非官方诊断，不是 CET-4 官方成绩`、`评分说明`、`规则评分`、`AI 复核`、`写入画像`。
- 桌面宽度下 `clientWidth = scrollWidth = 1077`，无横向溢出，console error 为 0。
- 320px 宽度下 `clientWidth = scrollWidth = 305`，无横向溢出，console error 为 0。
- AI 复核接口当前因额度限制返回 429，应用继续按预期回退到本地规则评分。

下一步：

- 拆分 `MockExam` 真题自练面板，降低阶段模考页维护成本。
- 或继续压缩诊断首页/目标设置页文案，把说明收进帮助与折叠区域。

### 2026-06-02：Phase 1 收尾 MockExam 真题自练面板拆分

已完成：

- 新增 `RealPaperPracticePanel`，把真题自练的筛选、资源状态、页面版作答、AI 参考答案、听力播放、本地草稿持久化集中到独立组件。
- `MockExam` 主组件从约 1977 行降到约 908 行，只保留入口切换、标准模考流程、结果报告和标准模考题组渲染。
- 真题自练继续保留原有测试标识：`local-real-paper-panel`、`local-real-paper-selected-resources`、`local-real-paper-content`、`local-real-paper-choice-*`、`local-real-paper-answer-progress`、`local-real-paper-play-audio`。
- 真题入口卡片仍复用统一资源徽标，显示页面、PDF、答案、音频和不计分状态。
- 已保存视觉检查截图：`C:\Users\MrDing\Documents\英语训练舱\mock-real-paper-panel-split-2026-06-02.png`。

已验证：

```bash
npm run lint
npx playwright test tests/e2e/mvp-smoke.spec.ts -g "target exam filters visible question bank and mock exam guides incomplete submissions"
npx playwright test tests/e2e/ui-control-audit.spec.ts -g "primary workspaces keep controls usable and reset scroll on navigation"
npm run build
```

补充手动验证：

- 真实浏览器打开 `http://127.0.0.1:3310/`，注册临时账号后进入 `阶段模考 -> 真题自练`。
- 页面显示 `本地真题 PDF 卷`、`页面版真题`、`PDF 可看`、答案状态和音频状态。
- 听力第 1 题选择 `A` 后，`aria-pressed = true`，进度显示 `选择题 1/35`。
- 桌面宽度下 `clientWidth = scrollWidth = 1092`，无横向溢出，console error 为 0。
- 320px 宽度下 `clientWidth = scrollWidth = 305`，无横向溢出，console error 为 0。

下一步：

- 继续压缩诊断首页/目标设置页文案，把说明收进帮助与折叠区域。
- 或拆分标准模考答题区，把写作、听力、阅读、翻译、提交检查拆成子组件。

### 2026-06-02：Phase 1 诊断入口与目标设置极简化

已完成：

- 诊断第 1 步改为单卡入口，只保留标题、一句话、目标考试、主按钮。
- 移除默认可见的 `诊断范围` 解释面板，诊断规则改为 `查看诊断规则` 折叠区。
- 诊断第 2 步保留目标分、考试日期、每日时间三个必要输入。
- 侧栏从 `今日预算预览` 改为 `准备开始`，默认只显示当前题库和 `进入真实诊断` 主按钮。
- 今日时间分配移入 `查看今日时间分配` 折叠区，减少默认解释文本。
- 已保存视觉检查截图：`C:\Users\MrDing\Documents\英语训练舱\diagnostic-entry-minimal-2026-06-02.png`。

已验证：

```bash
npm run lint
npm run build
npx playwright test tests/e2e/mvp-smoke.spec.ts -g "onboarding diagnostic persists the initial ability portrait before entering daily training"
npx playwright test tests/e2e/mobile-smoke.spec.ts -g "narrow phone completes the responsive diagnostic layouts"
```

补充手动验证：

- 真实浏览器打开 `http://127.0.0.1:3310/`，注册临时账号后进入入门诊断。
- 诊断首页显示 `入门诊断`、一句基线说明、目标考试、`查看诊断规则` 和 `开始诊断`；默认不再显示 `诊断范围`。
- 目标设置页显示 `学习目标设置`、`准备开始`、当前题库、`进入真实诊断` 和 `查看今日时间分配`；默认不再显示 `今日预算预览`。
- 桌面宽度下 `clientWidth = scrollWidth = 1092`，无横向溢出，console error 为 0。
- 320px 宽度下 `clientWidth = scrollWidth = 305`，无横向溢出，console error 为 0。

下一步：

- 拆分标准模考答题区，把写作、听力、阅读、翻译、提交检查拆成子组件。
- 或进入全页面 UI 一致性审计，统一剩余模块的卡片、按钮和空状态。
### 2026-06-02：Phase 1 标准模考答题区组件拆分

已完成：

- 新增 `StandardMockSectionPanel`，把标准模考的写作、听力、阅读、翻译、提交检查五个答题区从 `MockExam` 主组件中拆出。
- `MockExam` 继续负责卷面选择、模块导航、作答状态、提交流程、真题入口和结果报告；标准模考题面渲染由子组件负责。
- 保留原有测试标识和用户交互：`mock-writing-answer`、`mock-translation-answer`、`mock-choice-*`、听力 `播放/暂停/继续听力材料`、提交前检查卡片。
- 标准模考听力改为优先本机 TTS 音频播放，浏览器朗读作为兜底，保证真实浏览器中按钮能稳定进入 `暂停/继续` 状态。
- `MockExam` 主组件从约 908 行降到约 608 行，降低后续全页面极简 UI 统一和按钮审计的维护成本。

已验证：

```bash
npm run lint
npx playwright test tests/e2e/mvp-smoke.spec.ts -g "staged mock exam covers CET-4 modules and persists score evidence"
npx playwright test tests/e2e/mvp-smoke.spec.ts -g "target exam filters visible question bank and mock exam guides incomplete submissions"
npx playwright test tests/e2e/ui-control-audit.spec.ts -g "primary workspaces keep controls usable and reset scroll on navigation"
npm run build
```

下一步：

- 真实浏览器点击验证已完成：写作、听力、播放/暂停/继续、阅读、翻译、提交检查、未完成定位均可用；桌面 `clientWidth = scrollWidth = 1093`，320px 下 `clientWidth = scrollWidth = 305`；当前验证阶段 console error 为 0。
- 已保存验证截图：`C:\Users\MrDing\Documents\英语训练舱\mock-standard-sections-split-2026-06-02.png`。
- 本地生产服务若未配置 `SAAS_SESSION_SECRET` 和 `REGISTRATION_INVITE_CODE`，注册接口会返回 503；本次真实验证使用临时环境变量启动服务，未修改 `.env.local`。
- 继续进入全页面 UI 一致性审计，统一剩余模块的按钮、卡片、空状态和移动端布局。

### 2026-06-02：Phase 1 专项练习页极简统一

已完成：

- 专项练习页顶部收敛为标题、一句话和 3 个状态标签：已记录、未练优先、耗尽回流。
- 8 个专项模块统一为同一张卡片结构：状态标签、标题、进度、主按钮、学习记录。
- 删除重复的“当前选择”说明区，避免页面出现两套入口和两套解释。
- 阅读材料库改为默认可折叠区域，保留可访问入口但不抢占首屏。
- 今日训练页复习提示文案改为“可复习但不阻止自主训练”，修复用户感觉被强制复习的问题。
- 修复今日训练页底部“复习队列”卡片和侧栏“复习队列”导航在 E2E 中的可访问名称冲突，保持可见文案不变。

已验证：

```bash
npm run lint
npm run build
npx playwright test tests/e2e/mvp-smoke.spec.ts -g "due review reminder does not block grammar practice"
npx playwright test tests/e2e/mvp-smoke.spec.ts -g "unfinished vocabulary and listening practice resume from saved drafts"
npx playwright test tests/e2e/mobile-smoke.spec.ts -g "narrow phone reaches every primary workspace without horizontal clipping"
```

补充手动验证：

- 真实浏览器打开 `http://127.0.0.1:3310/`，进入 `专项练习` 页面。
- 桌面宽度显示 8 张模块卡，按钮分别为 `开始单词练习`、`开始仔细阅读训练`、`开始完形填空训练`、`开始语法训练`、`开始听力训练`、`开始写作训练`、`开始翻译训练`、`开始阶段模考`。
- 桌面宽度下 `clientWidth = scrollWidth = 1093`，无横向溢出。
- 320px 宽度下 `clientWidth = scrollWidth = 305`，模块卡单列显示，主按钮仍可见可点。
- 当前验证阶段 console error 为 0。
- 已保存验证截图：`C:\Users\MrDing\Documents\英语训练舱\practice-hub-minimal-2026-06-02.png`。

下一步：

- 继续统一复习页的 dashboard、空状态和按钮层级，让“复习”变成可进入的学习路径，而不是强制阻断。

### 2026-06-02：Phase 1 复习页极简统一与触控修复

已完成：

- 复习页标题区压缩为标题、一句话和 `学习法说明`，默认不再展开长规则解释。
- 复习门槛提示文案改为“可先复习，也可直接进入专项训练”，避免用户误以为必须复习后才能学习语法。
- 当前复习项卡片统一为共享按钮、标签和空状态样式。
- `今日复习规则` 改为折叠区，首屏只保留必要入口。
- 新增共享 `.ui-empty-state`，统一空状态边框、背景和文字层级。
- 修复 `.ui-panel > summary` 触控高度，移动端折叠标题从 20px 提升到 44px，满足按钮级触控目标。

已验证：

```bash
npm run lint
npm run build
npx playwright test tests/e2e/mvp-smoke.spec.ts -g "MVP critical reading flow persists local learning evidence"
npx playwright test tests/e2e/mvp-smoke.spec.ts -g "due review reminder does not block grammar practice"
npx playwright test tests/e2e/ui-control-audit.spec.ts -g "primary workspaces keep controls usable and reset scroll on navigation"
npx playwright test tests/e2e/mobile-smoke.spec.ts -g "narrow phone reaches every primary workspace without horizontal clipping"
```

补充手动验证：

- 真实浏览器打开 `http://127.0.0.1:3310/`，进入 `复习队列` 页面。
- 桌面宽度下显示标题 `复习队列`、一句话 `优先处理到期错因；不阻止你进入专项练习。`、`学习法说明` 和主操作按钮。
- `今日复习规则` 默认折叠；点击后可展开。
- 桌面宽度下 `clientWidth = scrollWidth = 1093`，无横向溢出。
- 320px 宽度下 `clientWidth = scrollWidth = 305`，无横向溢出。
- 320px 宽度下主要控件高度：`学习法说明` 48px，主按钮 48px，`今日复习规则` summary 44px。
- 当前验证阶段 console error 为 0。
- 已保存验证截图：`C:\Users\MrDing\Documents\英语训练舱\review-section-minimal-2026-06-02.png`。
- 已保存移动端截图：`C:\Users\MrDing\Documents\英语训练舱\review-section-minimal-mobile-2026-06-02.png`。

下一步：

- 继续统一能力进展页和设置页的卡片/按钮/空状态，并补充发布级 smoke 文档。

### 2026-06-02：Phase 1 能力进展页极简统一

已完成：

- 能力地图页说明压缩为 `基于本地学习证据生成，非官方成绩。`，明确不是官方分数。
- 雷达图下方指标卡统一为 `.ui-metric`。
- 无能力证据、无阶段验证、无学习会话等状态统一为 `.ui-empty-state`。
- 学习证据账本和能力证据时间线统一为 `.ui-panel`。
- 账本说明压缩为一句 `能力结论依赖这些本地证据。`。
- 时间线选中标记从英文 `Active` 改为中文 `当前`。

已验证：

```bash
npm run lint
npm run build
npx playwright test tests/e2e/mvp-smoke.spec.ts -g "all MVP sections render their primary controls"
npx playwright test tests/e2e/ui-control-audit.spec.ts -g "primary workspaces keep controls usable and reset scroll on navigation"
npx playwright test tests/e2e/mobile-smoke.spec.ts -g "narrow phone reaches every primary workspace without horizontal clipping"
```

补充手动验证：

- 真实浏览器打开 `http://127.0.0.1:3310/`，进入 `能力进展` 页面。
- 桌面宽度显示 `能力地图`、`综合能力雷达`、`证据知识点图谱`、`阶段提分验证`、`学习证据账本`、`能力证据时间线`。
- 桌面宽度下 `clientWidth = scrollWidth = 1093`，无横向溢出。
- 320px 宽度下 `clientWidth = scrollWidth = 305`，无横向溢出。
- 320px 宽度下页面内按钮最小高度为 44px。
- 当前验证阶段 console error 为 0。
- 已保存验证截图：`C:\Users\MrDing\Documents\英语训练舱\progress-section-minimal-2026-06-02.png`。
- 已保存移动端截图：`C:\Users\MrDing\Documents\英语训练舱\progress-section-minimal-mobile-2026-06-02.png`。

下一步：

- 继续处理设置页的信息密度和发布前检查文档。

### 2026-06-02：Phase 1 设置页极简统一

已完成：

- 设置页标题说明压缩为 `调整目标、时间和本地数据。`。
- Toast 移除 `animate-bounce`，避免保存反馈显得跳动和干扰。
- 高强度进度条移除 `animate-pulse`，保持极简静态反馈。
- `是否同时准备 CET-4 口语考试` 收敛为共享按钮样式，文案改为 `准备 CET-4 口语`。
- 口语录音质量提醒说明压缩为一句。
- 计划预期说明改为 `基于当前设置估算`。
- 计划预期三项指标改为 `.ui-metric`。
- 主操作从 `生成专属学习计划` 改为 `更新今日计划`，减少营销感。
- 页脚移除普通学习用户不需要的 `开发者中心`，保留 `隐私协议` 和 `服务条款`。

已验证：

```bash
npm run lint
npm run build
npx playwright test tests/e2e/mvp-smoke.spec.ts -g "all MVP sections render their primary controls"
npx playwright test tests/e2e/ui-control-audit.spec.ts -g "primary workspaces keep controls usable and reset scroll on navigation"
npx playwright test tests/e2e/mobile-smoke.spec.ts -g "narrow phone reaches every primary workspace without horizontal clipping"
```

补充手动验证：

- 真实浏览器打开 `http://127.0.0.1:3310/`，进入 `设置` 页面。
- 桌面宽度显示 `目标与计划设置`、`调整目标、时间和本地数据。`、`保存设置`、`准备 CET-4 口语`、`更新今日计划`。
- 桌面宽度下 `clientWidth = scrollWidth = 1093`，无横向溢出。
- 320px 宽度下 `clientWidth = scrollWidth = 305`，无横向溢出。
- 320px 宽度下主要控件最小高度为 44px。
- 页脚只保留 `隐私协议` 和 `服务条款`，`开发者中心` 数量为 0。
- 当前验证阶段 console error 为 0。
- 已保存验证截图：`C:\Users\MrDing\Documents\英语训练舱\settings-section-minimal-2026-06-02.png`。
- 已保存移动端截图：`C:\Users\MrDing\Documents\英语训练舱\settings-section-minimal-mobile-2026-06-02.png`。

下一步：

- 进入发布级检查文档和剩余 smoke 汇总：生产 smoke、全按钮审计、内容资产状态和回滚方案。

### 2026-06-02：Release Gate 自动化与按钮审计

已完成：

- 修复诊断语音 voiceschanged 监听兼容性：`speechSynthesis.addEventListener` 不存在时回退到 `onvoiceschanged`，避免测试环境和部分浏览器崩溃。
- 加固全按钮审计测试：React 重新渲染导致按钮 DOM detached 时，重新标记当前 DOM 并按按钮名重试。
- 加固全按钮审计测试：已提交阅读题里的禁用选项/信心按钮不再被强行点击。
- 全按钮审计 TTS mock 从 `abort` 改为返回静音 WAV，避免测试自身制造 `net::ERR_FAILED` console error。
- 全按钮审计超时提升到 12 分钟，适配真实全页面按钮爬取。

已验证：

```bash
npm run test
npm run lint
npm run build
$env:SMOKE_BASE_URL = 'http://127.0.0.1:3310'
$env:REQUIRE_AI_CONFIGURED = 'false'
$env:SMOKE_REGISTRATION_INVITE_CODE = 'ETC-LOCAL-2026'
npm run smoke:production
$env:FULL_BUTTON_AUDIT = 'true'
npx playwright test tests/e2e/full-button-click-audit.spec.ts
npx vitest run tests/domain/materials.test.ts tests/domain/questionBankCoverage.test.ts tests/domain/mockExam.test.ts tests/domain/examRegistry.test.ts
```

验证结果：

- API/domain：13 个测试文件、88 个测试通过。
- 内容资产/题型覆盖：4 个测试文件、13 个测试通过。
- 生产 smoke 通过：health、考试元数据、账号注册、内容来源拦截、每日计划、云端学习数据回环均通过。
- 全按钮审计通过：真实点击 212 个按钮，覆盖 18 个页面/状态。
- 全按钮审计报告：`D:\桌面文件\english\英语训练舱\test-results\full-button-click-audit.json`。

保留风险：

- 构建仍提示主应用 chunk 超过 500 kB，后续需要做路由级或模块级 code splitting。
- 当前环境 AI provider 返回过 `429 MONTHLY_LIMIT_EXCEEDED`，诊断接口已走规则兜底；正式发布前需要配置可用额度、限流提示和监控告警。
- 生产 smoke 本次设置 `REQUIRE_AI_CONFIGURED=false`，因此只能证明 AI 失败兜底链路可用，不能证明线上 AI 供应商额度充足。

下一步：

- 补齐发布 runbook：上线步骤、smoke 顺序、失败回滚、内容资产状态检查和用户反馈入口。

### 2026-06-02：Release Runbook 草案

上线前检查顺序：

1. 本地静态检查：`npm run lint`。
2. API/domain：`npm run test`。
3. 生产构建：`npm run build`。
4. 生产 smoke：启动 `dist/server.cjs` 后执行 `npm run smoke:production`。
5. 关键 E2E：`mvp-smoke`、`mobile-smoke`、`ui-control-audit`。
6. 全按钮审计：`FULL_BUTTON_AUDIT=true npx playwright test tests/e2e/full-button-click-audit.spec.ts`。
7. 真实浏览器抽查：登录、今日训练、专项练习、复习、阶段模考、能力进展、设置。

必须配置：

- `SAAS_SESSION_SECRET`：生产会话签名。
- `REGISTRATION_INVITE_CODE`：邀请码注册门槛。
- `APP_URL` 或 `SMOKE_BASE_URL`：生产 smoke 目标地址。
- AI provider key、模型和额度监控；如果额度不足，必须确认规则兜底提示可见。
- 数据文件或数据库持久化路径；发布前确认备份策略。

内容资产检查：

- 真题区只展示可打开的卷。
- 每套显示资源状态：可做/可看/有答案/有音频/浏览器朗读/缺失资源。
- 无来源或授权无法确认的真题不进入公开默认内容，只作为用户自带资料处理。
- 页面不得出现外站原始链接作为用户入口。

回滚方案：

- 每次发布前保留上一版构建产物和环境变量快照。
- 新版本 smoke 任一关键项失败，立即恢复上一版 `dist` 和服务进程。
- 回滚后重新执行 `/api/health`、登录、今日训练、阶段模考入口三个最小检查。

发布阻断项：

- 前端主要页面出现 console error。
- 320px 主要页面出现横向滚动。
- 注册/登录不可用。
- 诊断报告缺少分数、证据、置信度或非官方说明。
- 真题区出现空列表、死链接或未标注缺失答案/音频。
- AI 额度耗尽但没有规则兜底或用户可理解提示。
### 2026-06-03：Release Gate 用户反馈入口

已完成：

- 设置页新增折叠式 `反馈入口`，默认收起，不增加主页面解释负担。
- 新增 `/api/feedback`，支持匿名反馈提交，限制类型、内容长度、联系方式、页面上下文和 userAgent。
- 反馈写入 `.data/feedback/feedback.jsonl`，便于发布后查看用户问题证据。
- `production-smoke` 增加 `feedback intake ok`，避免上线后反馈接口静默不可用。
- API 测试覆盖反馈成功写入和短内容拒绝。
- 设置页反馈传入 `pageContext="settings"`，落盘记录可直接定位来源页面。

已验证：

```bash
npx vitest run tests/api/server.test.ts
npm run lint
npm run build
$env:SMOKE_BASE_URL = 'http://127.0.0.1:3310'
$env:REQUIRE_AI_CONFIGURED = 'false'
$env:SMOKE_REGISTRATION_INVITE_CODE = 'ETC-LOCAL-2026'
npm run smoke:production
```

真实浏览器验证：

- 本地生产服务 `http://127.0.0.1:3310/`，注册/登录后进入设置页。
- 展开 `反馈入口`，填写联系方式和反馈内容，点击 `提交反馈`。
- 页面显示 `已收到反馈，会优先处理影响学习闭环的问题。`
- 最新反馈记录写入 `.data/feedback/feedback.jsonl`，包含 `page: "settings"`。
- 桌面宽度：`clientWidth = scrollWidth = 1094`，无横向溢出。
- 320px 宽度：`clientWidth = scrollWidth = 305`，反馈控件最小高度 44px。
- 当前验证阶段 console error 为 0。

保留风险：

- 主应用 chunk 仍超过 500 kB，需要继续做页面级 code splitting。
- AI provider 当前仍可能出现额度 429，发布前需要配额监控和用户可见降级提示。

### 2026-06-03：Release Gate 前端代码拆分

已完成：

- `App.tsx` 将诊断、专项练习、阅读、听力、词汇、主观题、口语、复习、能力进展、材料导入、设置、阶段模考改为 `React.lazy` 按需加载。
- 保留 `TodayDashboard` 和 `Sidebar` 同步加载，避免首页首屏出现不必要的模块等待。
- 新增统一极简加载占位 `WorkspaceLoadingFallback`，懒加载时显示明确状态，不出现白屏。
- `vite.config.ts` 将 React、图标库、Dexie、题库、基础学习数据、诊断核心拆为独立 chunks。

构建结果：

- 拆分前主应用入口约 `858.88 kB`，且触发 Vite `Some chunks are larger than 500 kB` 警告。
- 第一次页面懒加载后主入口降到约 `530.45 kB`，仍超过 500 kB。
- 继续拆出 `question-bank`、`learning-data`、`diagnostic-core` 后，主入口降到约 `107.72 kB`。
- 当前构建不再出现 Vite 大 chunk 警告。

已验证：

```bash
npm run lint
npm run build
$env:SMOKE_BASE_URL = 'http://127.0.0.1:3310'
$env:REQUIRE_AI_CONFIGURED = 'false'
$env:SMOKE_REGISTRATION_INVITE_CODE = 'ETC-LOCAL-2026'
npm run smoke:production
$env:PLAYWRIGHT_BASE_URL = 'http://127.0.0.1:3310'
npx playwright test tests/e2e/mvp-smoke.spec.ts -g "all MVP sections render their primary controls"
npx playwright test tests/e2e/mobile-smoke.spec.ts -g "narrow phone reaches every primary workspace without horizontal clipping" --project=mobile-chromium
```

真实浏览器验证：

- 在本地生产服务 `http://127.0.0.1:3310/` 中依次点击侧边栏：专项练习、阶段模考、复习队列、能力进展、设置、今日训练。
- 每个懒加载页面均显示对应标题和主要控件，没有白屏。
- 桌面宽度：各页面 `clientWidth = scrollWidth = 1094`，无横向溢出。
- 当前验证阶段 console error 为 0。

保留风险：

- 代码拆分只解决发布体积和首屏下载问题，不等于完成性能优化；后续还需要 Lighthouse/LCP/CLS 实测。
- `question-bank` 和 `react` 仍是较大的独立 chunk，但已经不再阻塞主入口体积警告。

### 2026-06-03：Release Gate 隐私协议与服务条款入口

已完成：

- 新增共享协议文案 `src/content/legal.ts`，集中维护隐私协议和服务条款内容。
- 新增 `LegalLinks` 组件，登录/注册前、设置页底部均复用同一份协议入口。
- 登录页注册前可直接查看隐私协议和服务条款，不再要求用户先进入应用。
- 设置页移除旧的内联协议文案，避免登录前和设置页两处内容不一致。
- 隐私协议明确本地 IndexedDB、云同步、反馈入口、AI 文本转交与规则兜底边界。
- 服务条款明确训练结果为学习参考，不构成官方考试成绩或专业承诺。

已验证：

```bash
npm run lint
npm run build
npx playwright test tests/e2e/saas-account.spec.ts
```

真实浏览器验证：

- 登录页可打开 `隐私协议` 和 `服务条款`。
- 协议按钮高度为 44px，满足移动端触控底线。
- 协议弹窗可关闭，隐私协议包含 IndexedDB、AI 规则兜底和反馈入口说明。
- 服务条款包含训练参考、非官方考试成绩和反馈入口说明。
- 设置页已通过 E2E 验证，可再次打开同一份隐私协议。
- 当前验证阶段 console error 为 0。

### 2026-06-04：v1.0 RC 发布门禁闭环

已完成：

- 修复完整 Playwright 暴露的两个 UI 审计阻断：
  - 登录页 `邀请码注册`、`忘记密码`、`返回登录` 模式按钮触控高度提升到 44px。
  - 设置页反馈入口的原生 `select` 替换为统一 `SelectField`，消除可见原生下拉。
- 使用干净 `dist` 重新构建并完成第 12 节发布候选版出口条件验证。
- 确认生产 smoke 反馈入口、账号注册、内容来源拦截、每日计划和云端学习快照回环均可用。
- 确认全按钮审计独立通过，报告写入 `test-results/full-button-click-audit.json`。
- 确认错误监控和 AI 降级链路具备代码与测试证据：`/api/telemetry/event`、`/api/observability/summary`、`/api/ai/status` 均已有 API 测试覆盖，首页会展示 AI 状态、降级原因和兜底说明。

已验证：

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
```

验证结果：

- `npm run lint` 通过。
- `npm run test` 通过：13 个测试文件、91 个测试通过。
- `npm run build` 通过：主入口 `index-Dc5ShsEi.js` 约 115.05 kB，未出现 Vite 大 chunk 警告。
- `npx playwright test` 通过：27 passed，1 skipped；跳过项是按设计需要 `FULL_BUTTON_AUDIT=true` 单独执行的全按钮审计。
- `node scripts/production-smoke.mjs` 通过：`Production smoke passed for http://127.0.0.1:62159`，覆盖 health、AI status、exam registry、feedback intake、account registration、content provenance guard、daily plan、cloud review evidence snapshot。
- `FULL_BUTTON_AUDIT=true npx playwright test tests/e2e/full-button-click-audit.spec.ts` 通过：点击 217 个按钮，覆盖 17 个页面/状态。

本轮证据文件：

- 生产 smoke 输出：`test-results/production-smoke-final-62159-output.log`。
- 生产 smoke 独立数据：`test-results/production-smoke-final-62159-store.json`。
- 生产 smoke 服务错误日志：`test-results/production-smoke-final-62159-server.err.log`，长度 0。
- 全按钮审计报告：`test-results/full-button-click-audit.json`。

RC 结论：

- 第 12 节列出的本地发布候选版出口条件已完成并有本轮命令证据。
- AI 供应商真实额度仍属于生产环境运营配置项；本轮浏览器测试期间曾出现 `MONTHLY_LIMIT_EXCEEDED` 并按预期走规则兜底。代码侧已提供用户可见降级提示、状态接口和观测摘要；若发布要求证明实时 AI 生成能力，需在有可用额度的生产 key 下追加运行 `SMOKE_LIVE_AI=true node scripts/production-smoke.mjs`。

### 2026-06-04：Live AI smoke 补充验收

已完成：

- 使用当前 `.env.production` / `.env.local` / `.env` 中的真实 AI provider 配置，追加执行 `SMOKE_LIVE_AI=true` 生产 smoke。
- 确认基础发布 smoke 继续通过：health、AI status、exam registry、feedback intake、account registration、content provenance guard、daily plan、cloud review evidence snapshot。
- 确认真实 AI 生成链路通过：`live AI generation ok`。
- 本轮服务错误日志为空，未出现 `MONTHLY_LIMIT_EXCEEDED`。

已验证：

```bash
$env:SMOKE_BASE_URL = 'http://127.0.0.1:65476'
$env:SMOKE_REGISTRATION_INVITE_CODE = 'ETC-LOCAL-2026'
$env:SMOKE_LIVE_AI = 'true'
node scripts/production-smoke.mjs
```

验证结果：

- `Production smoke passed for http://127.0.0.1:65476`。
- `ai status ok (ready)`。
- `live AI generation ok`。
- 生产 smoke 输出：`test-results/production-smoke-live-ai-65476-output.log`。
- 生产 smoke 独立数据：`test-results/production-smoke-live-ai-65476-store.json`。
- 生产 smoke 服务错误日志：`test-results/production-smoke-live-ai-65476-server.err.log`，长度 0。

最终结论：

- 本地 RC 门禁和真实 AI provider smoke 均已通过。
- `MONTHLY_LIMIT_EXCEEDED` 不再是当前配置下的发布阻断项；后续上线只需保持生产 key、额度监控和 `/api/ai/status` 可见性。
- 发布说明与回滚入口已整理到 `docs/v1-rc-release-notes-2026-06-04.md`。
