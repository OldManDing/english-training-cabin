# 英语训练舱 GA 收敛记录

日期：2026-05-26

## GA 判定口径

公开推广前必须同时满足：

- 本地质量门禁：`npm run verify` 通过。
- 线上基础门禁：`SMOKE_BASE_URL=https://study.xmlga.top npm run smoke:production` 通过。
- 线上 GA 门禁：`SMOKE_BASE_URL=https://study.xmlga.top SMOKE_EMAIL_DOMAIN=<可收件测试域名> npm run smoke:ga` 通过。
- 生产健康检查返回 `aiConfigured=true`、`saas.store=postgres`、`emailDelivery.configured=true`。
- 公开注册、登录、云端同步、AI 生成、邮箱验证、密码重置、团队邀请均可在真实部署环境完成。

## 本轮已修复

- 账号注册不再因为同名团队阻塞：团队展示名允许重复，服务端会生成带随机后缀的唯一 `slug`。
- Postgres 唯一约束错误不再全部误报为 `email_exists`：只有真实邮箱唯一冲突才返回 `email_exists`。
- 生产 smoke 改为使用 `crypto.randomUUID()` 生成邮箱、密码和团队名，避免重复执行时污染结论。
- 新增 `smoke:ga`，强制检查真实 AI 并调用真实邮件交付适配器，避免把“可试用”误判成“可公开推广”。

## 当前商业化状态

| 项目 | 状态 | 说明 |
| --- | --- | --- |
| 学习闭环 | 已具备上线能力 | 入门诊断、练习、评分、错因复习、能力画像和材料导入已有自动化覆盖 |
| SaaS 账号 | 已具备试运行能力 | 注册、登录、会话治理、云同步、团队邀请、合规请求已有 API/E2E 覆盖 |
| 数据库 | 已具备生产能力 | 线上健康检查需保持 `saas.store=postgres` |
| AI | 已具备生产能力 | GA smoke 要求 `SMOKE_LIVE_AI=true` |
| 邮件交付 | GA 阻塞项 | 必须配置 `EMAIL_DELIVERY_WEBHOOK_URL` 并通过 `smoke:ga` |
| 法务文本 | 公开推广前需复核 | 产品内已有隐私/条款入口，但建议上线前替换为正式法务文本 |
| 内容授权 | 公开推广前需运营复核 | 系统已有内容资产治理，公开素材需要保持原创/授权留痕 |

## 发布结论规则

- `smoke:production` 通过但 `smoke:ga` 未通过：只能算线上试运行，不能公开推广。
- `smoke:ga` 通过，且注册/邮箱/AI/云同步均有真实线上证据：可进入 GA。
- 任一生产 smoke 失败：不得对外发布新版本，应先回滚或修复。
