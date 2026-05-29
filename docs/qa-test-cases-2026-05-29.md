# 英语训练舱正式测试用例

日期：2026-05-29

## 1. 测试范围

本轮测试按“真实用户旅程 + 数据证据 + UI 控制可用性”验收，不以页面能打开或接口返回 200 作为完成标准。首发完整场景仍限定为 CET-4，CET-6、雅思、托福只验证为扩展占位，不作为可交付完整题库。

阶段模考仍按 CET-4 写作、听力、阅读、翻译四部分计算标准分，但新增“语法/完形基础校准”补充段，用于实际抽取语法结构题和完形语境题并写入能力证据。

## 2. 准入与退出标准

准入标准：

- 本地依赖已安装，`.env.local` 可启动开发服务。
- 注册邀请码使用测试环境变量或本地默认值，不使用生产真实账号数据。
- 测试前清空 IndexedDB 学习数据，避免历史记录污染诊断和计划结果。

退出标准：

- `npm.cmd run lint` 通过。
- `npm.cmd run test` 通过。
- `npm.cmd run build` 通过。
- `npx.cmd playwright test tests/e2e/mvp-smoke.spec.ts tests/e2e/mobile-smoke.spec.ts tests/e2e/ui-control-audit.spec.ts --workers=1` 通过。
- 所有 P0/P1 用例结果为通过，未通过项必须有缺陷记录和回归结论。

## 3. 用例清单

| 用例编号 | 风险级别 | 测试类型 | 覆盖功能 | 前置条件 | 测试步骤 | 预期结果 | 自动化覆盖 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| TC-AUTH-001 | P0 | E2E | 登录、注册、找回密码本地校验 | 未登录状态 | 依次点击登录提交、切换邀请码注册、切换忘记密码并提交空表单 | 每个模式只在按钮下方显示明确红色错误提示，不向接口发送无效请求，底部说明区不被错误文案覆盖 | `tests/e2e/ui-control-audit.spec.ts` |
| TC-ONB-001 | P0 | E2E | 入门诊断完整闭环 | 新注册账号，清空学习数据 | 进入入门诊断，选择目标考试，返回上一步，再进入真实小题诊断并提交 | 诊断可返回修改，提交后生成 `studyGoals`、`practiceSessions`、`attempts`、`reviewItems`、`skillProfiles` | `tests/e2e/mvp-smoke.spec.ts` |
| TC-ONB-002 | P0 | Unit + E2E | 诊断弱项驱动今日 UI | 语法诊断答错，其余能力答对 | 提交诊断后进入今日训练，查看主任务和右侧弱项条，再点击主任务 | 今日主任务显示“语法结构与固定搭配专项”，弱项条显示 42%，点击后进入语法/完形训练舱 | `tests/domain/dailyPlan.test.ts`、`tests/e2e/mvp-smoke.spec.ts` |
| TC-PLAN-001 | P0 | Unit | 到期复习优先级 | 存在到期复习项 | 构建每日计划 | 到期复习排在新题训练前，避免只刷新题不处理错因 | `tests/domain/dailyPlan.test.ts` |
| TC-PLAN-002 | P0 | Unit | 临考阶段模考与严重弱项排序 | 距离考试 45 天内，存在低于 60 分的诊断弱项 | 构建每日计划 | 严重弱项专项排在阶段模考前，模考仍保留在队列中 | `tests/domain/dailyPlan.test.ts` |
| TC-PRA-001 | P0 | E2E | 阅读训练证据落库 | 已登录并清空学习数据 | 进入专项练习，完成一组阅读题并查看能力地图 | 生成 1 条 session、5 条 attempts、至少 1 条 review item、1 条 reading skill profile | `tests/e2e/mvp-smoke.spec.ts` |
| TC-PRA-002 | P0 | E2E | 听力自动播报 | 浏览器支持或 mock `speechSynthesis` | 进入听力专项 | 页面进入后自动触发听力播报状态和至少一次语音调用 | `tests/e2e/mvp-smoke.spec.ts` |
| TC-PRA-003 | P0 | E2E | 词汇听音与复习证据 | 已登录并清空学习数据 | 进入词汇专项，播放单词和例句，完成答题 | 可听音、可作答、可评分，低信心或错误项进入复习证据 | `tests/e2e/mvp-smoke.spec.ts` |
| TC-PRA-004 | P1 | Unit + E2E | 语法训练和完形填空入口 | CET-4 题库可用 | 从诊断或专项入口进入语法/完形训练 | 题目来自 CET-4 内置原创模拟题，训练完成后写入 grammar 或 vocabulary/cloze 证据 | `tests/domain/dailyPlan.test.ts`、`tests/e2e/mvp-smoke.spec.ts` |
| TC-MOCK-001 | P0 | E2E | 阶段模考交互 | 已登录 | 进入阶段模考，切换听力/阅读/语法完形/检查页，未完成时点击提交 | 未完成提交不会直接出分，会定位到未完成模块；完整作答后生成分项证据，并包含语法结构与完形语境能力画像 | `tests/e2e/mvp-smoke.spec.ts` |
| TC-REVIEW-001 | P0 | E2E | 主动复习闭环 | 存在到期复习项 | 完成主动回忆、挖空补全、语境输出三步 | 复习项更新掌握度、下次复习时间，并写入 review session 和 attempt | `tests/e2e/mvp-smoke.spec.ts` |
| TC-UI-001 | P0 | E2E | 移动端控制可点 | 320px 视口 | 逐页进入今日训练、设置、专项、模考、复习、口语、能力进展、材料导入 | 可见按钮、输入框、下拉框高度不低于 44px，页面主体无横向溢出 | `tests/e2e/mobile-smoke.spec.ts`、`tests/e2e/ui-control-audit.spec.ts` |
| TC-UI-002 | P1 | E2E | 页面背景和控件样式 | 320px 和桌面视口 | 扫描主要页面可见元素背景和控件名称 | 不出现渐变背景；可见控件有可访问名称；导航后滚动位置复位 | `tests/e2e/ui-control-audit.spec.ts` |
| TC-DATA-001 | P0 | E2E | 学习数据导出与恢复 | 已产生学习数据 | 在设置页导出本地数据，再导入恢复 | 本地学习数据可恢复，用户能理解清空浏览器数据的影响 | `tests/e2e/mvp-smoke.spec.ts` |
| TC-MAT-001 | P1 | E2E | 材料导入校验 | 已登录 | 输入非法 JSON，再输入合法阅读材料 | 非法 JSON 有错误提示；合法材料通过校验后进入阅读训练 | `tests/e2e/mvp-smoke.spec.ts`、`tests/e2e/ui-control-audit.spec.ts` |

## 4. 发布回归命令

```powershell
npm.cmd run lint
npm.cmd run test
npm.cmd run build
npx.cmd playwright test tests/e2e/mvp-smoke.spec.ts tests/e2e/mobile-smoke.spec.ts tests/e2e/ui-control-audit.spec.ts --workers=1
```

线上发布后必须追加：

```powershell
$env:SMOKE_BASE_URL='https://study.xmlga.top'; npm.cmd run smoke:production
$env:SMOKE_BASE_URL='https://study.xmlga.top'; npm.cmd run smoke:ga
$env:PLAYWRIGHT_BASE_URL='https://study.xmlga.top'; npx.cmd playwright test tests/e2e/mvp-smoke.spec.ts tests/e2e/mobile-smoke.spec.ts tests/e2e/ui-control-audit.spec.ts --workers=1
```
