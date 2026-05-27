# GA 加固记录 2026-05-27

## 本轮目标

针对账号安全、题库代表性和模拟考试缺口做上线前加固，避免产品继续停留在演示状态。

## 已完成

- 账号门禁：前端通过 `AuthGate` 强制登录后进入学习舱。
- 服务端权限：学习计划、材料校验、选择题报告、口语报告、主观题报告、标准模考报告和观测摘要均要求 Bearer 登录会话。
- 密码安全：账号密码使用 PBKDF2-SHA256 加盐哈希；忘记密码使用一次性恢复码，不启用邮件找回。
- 标准模考：内置原创 CET-4 标准结构模拟卷，覆盖写作 1 题、听力 25 题、阅读 30 题、翻译 1 题，时长 125 分钟。
- 题库基础量：内置阅读专项材料、标准模考题、核心词汇与语块练习；内容均标注为原创模拟，不冒充官方真题。
- 默认日期：新用户默认 CET-4 笔试日期统一为 `2026-06-13`。
- 复习证据云同步：主动回忆、挖空补全和语境输出会形成 `review` 练习 session、attempt、复习项状态和能力画像，并纳入云端快照 round-trip 验证。
- 阶段提分验证：能力地图新增基线证据与最近阶段模考的分项对比；证据不足时只提示下一步，不制造提分结论。

## 验收结果

- `npm.cmd run lint`：通过。
- `npm.cmd run test`：10 个测试文件、67 个用例通过。
- `npm.cmd run build`：通过，存在 Vite 单 chunk 大小提示，不阻塞发布。
- `npx.cmd playwright test`：19 条桌面/移动端 E2E 通过。
- 本地生产 smoke：`http://localhost:3000` 通过健康检查、标准模考元数据、账号注册、内容来源防冒用、受保护日计划和复习证据云快照；GA smoke 通过真实 AI 生成。
- 线上发布：`/opt/english-training-cabin/current -> /opt/english-training-cabin/releases/v1-20260527-cet4-v1-r2`，应用容器与 Postgres 容器均为 healthy。
- 线上 smoke：`SMOKE_BASE_URL=https://study.xmlga.top` 的 production smoke 和 GA smoke 均通过，覆盖账号注册、内容合规、每日计划、云端复习证据快照和真实 AI 生成。
- 线上回归：`PLAYWRIGHT_BASE_URL=https://study.xmlga.top npx.cmd playwright test` 19 条桌面/移动端 E2E 通过。

## 上线口径

- 可以宣传为“英语训练舱 / 英语能力训练系统”，首发聚焦 CET-4。
- 可以说明内置原创模拟题、核心词表、标准结构模考和错因复习闭环。
- 不能宣传为官方真题库、完整授权题库或付费 SaaS。
