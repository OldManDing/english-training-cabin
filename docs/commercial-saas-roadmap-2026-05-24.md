# 英语训练舱商业化 SaaS 转型路线

日期：2026-05-24

## 架构决策

当前 MVP 是本地优先、单用户、IndexedDB 持久化。商业化 SaaS 不能直接依赖浏览器本地数据，必须补齐服务端账号、租户隔离、订阅权益、云端学习档案、运营观测、内容授权和正式数据库。

本次采用渐进式迁移：

```text
本地优先 MVP
-> 服务端账号与租户
-> 云端学习快照
-> 正式数据库与对象存储
-> 订阅计费和内容授权
-> 团队/学校管理后台
-> 商业化上线
```

选择渐进式迁移的原因：

- 不破坏已验证通过的本地学习闭环。
- 账号体系、云同步和订阅权益可以先独立验证。
- 后续可以把当前文件存储适配器替换为 Postgres，而不重写前端业务流程。

## 已落地的 SaaS 基座

- 账号注册与登录：`/api/auth/register`、`/api/auth/login`、`/api/auth/me`、`/api/auth/logout`。
- 安全基础：密码使用 PBKDF2-SHA256 加盐哈希；会话使用 HMAC 签名 token；生产环境要求 `SAAS_SESSION_SECRET`。
- 租户模型：注册时创建 Organization，用户以 owner 身份绑定租户。
- 订阅权益：默认创建 14 天 Pro 试用，返回 cloudSync、AI 月额度、席位等 entitlement。
- 云端学习快照：`/api/cloud/learning-data` 支持上传和恢复当前 IndexedDB 学习数据备份。
- 前端入口：设置页新增“SaaS 云端账号”，支持注册、登录、同步到云端、从云端恢复。
- 测试覆盖：API 覆盖未登录拒绝、注册、登录、权益、云同步、跨租户隔离；E2E 覆盖设置页账号试用和云同步恢复。

## 第二批已落地

- Postgres 数据层：新增 `pg` 适配器，配置 `DATABASE_URL` 后使用 Postgres，未配置时保留文件存储兜底。
- 数据库迁移：新增 `migrations/0001_saas_core.sql`，覆盖账号、租户、订阅、学习快照、增量学习实体、一次性 token 和 webhook 幂等表。
- 账号安全：新增邮箱验证 token 和密码重置 token；服务端只保存 token hash，一次性消费后不可复用。
- 订阅 webhook：新增 `/api/billing/webhook`，使用 `BILLING_WEBHOOK_SECRET` 的 HMAC 签名校验，并记录 webhook event 防止重复处理。
- 增量同步：新增 `/api/cloud/learning-entities`，按 `studyGoal`、`practiceSession`、`attempt`、`reviewItem`、`skillProfile` 增量 upsert 和拉取。
- API 测试：新增邮箱验证、密码重置、订阅签名、订阅幂等、权益变更、增量同步和跨租户隔离用例。

## 仍需完成的商业化能力

| 优先级 | 能力 | 上线意义 | 建议实现 |
| --- | --- | --- | --- |
| P0 | 真实 Postgres 验证 | 本地没有真实数据库实例 | 在部署环境配置 `DATABASE_URL`，执行冷启动 smoke 和备份策略 |
| P0 | 真实邮件服务 | 当前开发环境直接返回 token | 接入 Resend/SendGrid/SMTP，发送验证和重置邮件 |
| P0 | 真实支付供应商 | 当前是标准化 webhook 入口 | Stripe/Creem 等支付集成、provider payload 映射、退款/取消处理 |
| P0 | 会话治理 | 当前是 7 天 Bearer token | refresh token、会话撤销、设备列表、异常登录提醒 |
| P1 | 内容授权后台 | 避免题库版权和内容质量风险 | 题材库、版本、来源、授权状态、下架机制 |
| P1 | 团队/学校管理 | 面向 B 端销售必须可管理席位 | 成员邀请、班级、学习报表、角色权限 |
| P1 | 运营后台 | 商业上线需要服务健康和用户漏斗 | 管理员仪表盘、AI 成本、错误率、活跃度 |
| P1 | 法务与合规 | 用户信任和公开上线必须具备 | 隐私政策、服务条款、数据删除、导出请求 |
| P2 | 多考试商品化 | 从 CET-4 扩展到更多考试 | 考试配置、价格包、内容包和学习路径模板 |

## 发布边界

当前分支完成的是“商业化 SaaS 第一阶段基座”，不是完整商业化上线终态。

可对内验收口径：

- 可以注册账号。
- 可以形成租户。
- 可以看到试用权益。
- 可以把本地学习数据同步到服务端。
- 可以从服务端恢复学习数据。
- 未登录和跨账号不能读取他人学习数据。
- 可以通过签名 webhook 更新订阅权益。
- 可以按增量实体同步学习目标、练习记录、作答、错因复习和能力画像。
- 可以用一次性 token 完成邮箱验证和密码重置。

不可对外宣传口径：

- 不能宣传为完整支付订阅系统。
- 不能宣传为完整云端增量学习档案。
- 不能宣传为学校/团队管理平台。
- 不能宣传为官方或完整授权题库。

## 下一批开发建议

1. 引入 Postgres 数据模型和迁移：users、organizations、memberships、subscriptions、learning_goals、practice_sessions、attempts、review_items、skill_profiles。
2. 把 `/api/cloud/learning-data` 从整包快照升级为分表 upsert，同步冲突按 `updatedAt` 和服务端版本号解决。
3. 接入支付供应商 webhook，订阅状态成为权益判断唯一来源。
4. 新增管理员后台：用户、租户、订阅、AI 成本、内容来源和错误率。
5. 补齐邮箱验证、忘记密码、账号注销和数据删除请求。
