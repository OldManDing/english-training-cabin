# SaaS 数据库迁移说明

日期：2026-05-25

> 2026-05-26 产品边界调整：数据库保留历史邮箱验证/一次性 token 字段以兼容已迁移数据，但当前公开 API 和 UI 不提供邮件交付、邮箱验证或邮件找回密码流程。

## 迁移范围

迁移文件：`migrations/0001_saas_core.sql`、`migrations/0002_workspace_sessions.sql`、`migrations/0003_commercial_ops.sql`

本次是扩展式迁移，只新增表、索引和约束，不删除本地 IndexedDB 数据，也不破坏文件存储兜底。

新增持久化对象：

- `organizations`：组织租户。
- `users`：账号、密码哈希、邮箱验证状态、角色。
- `subscriptions`：订阅套餐、状态、席位、AI 月额度、支付供应商标识。
- `learning_snapshots`：整包学习数据云快照。
- `learning_entities`：目标、练习、作答、复习、能力画像的增量同步实体。
- `one_time_tokens`：邮箱验证和密码重置的一次性 token 哈希。
- `billing_webhook_events`：支付 webhook 幂等记录。
- `sessions`：服务端登录会话，用于 token 撤销、刷新和最后使用时间记录。
- `organization_invitations`：团队成员邀请，一次性 token 只保存哈希。
- `content_assets`：内容资产、来源类型、授权状态和阻断标记。
- `data_requests`：用户数据导出/删除请求及处理状态。
- `saas_migrations`：迁移执行记录。

## 应用切换规则

- 配置 `DATABASE_URL` 时，服务端使用 Postgres SaaS Store，并在首次访问账号/云同步/API 管理能力时执行三批 additive migration。
- 未配置 `DATABASE_URL` 时，继续使用 `SAAS_DATA_FILE` 文件存储，适合本地开发和演示。
- 生产环境必须配置 `SAAS_SESSION_SECRET`。
- 使用订阅 webhook 时必须配置 `BILLING_WEBHOOK_SECRET`。
- 当前产品不启用邮件交付、邮箱验证或邮件找回密码；邮箱只作为账号标识，团队邀请通过可复制链接完成。

## 回滚策略

本次迁移是 additive schema，应用层可通过移除 `DATABASE_URL` 回到文件存储兜底，不影响浏览器 IndexedDB 本地数据。

数据库层回滚建议：

1. 先停用新版本应用或移除 `DATABASE_URL`。
2. 如需删除本次 schema，先导出 `users`、`organizations`、`subscriptions` 和学习数据表。
3. 按依赖顺序删除 `billing_webhook_events`、`one_time_tokens`、`learning_entities`、`learning_snapshots`、`subscriptions`、`users`、`organizations`。

不建议在已有真实用户数据后直接 drop 表。商业化上线后，回滚应优先走应用回滚和只读保护。

## 验证结果

- `npm.cmd run lint`：通过。
- `npm.cmd run test`：4 个测试文件，34 个用例通过。
- API 测试覆盖：账号注册登录、订阅 webhook 签名、订阅幂等、增量学习实体同步、跨租户隔离、会话刷新撤销、团队邀请、成员列表、owner-only 管理概览、设备会话、内容授权治理、数据权利请求和运营概览；历史邮箱验证/密码重置能力不纳入当前发布口径。

## 下一步

- 在真实 Postgres 实例上执行一次冷启动 smoke。
- 在真实部署环境验证团队邀请链接、Postgres 冷启动和数据备份策略。
- 接入真实支付供应商 webhook，并将 provider event payload 映射到当前标准事件。
- 将设置页轻量操作台升级为独立 admin 路由，并补班级报表、内容版本和运营告警。
