# 英语训练舱

英语能力训练舱是一个本地优先的英语能力训练系统，首发场景聚焦 CET-4，但底层按多考试、多目标、可扩展训练闭环设计。MVP 覆盖今日训练、专项阅读/听力、错因复习、口语重说、能力进展、材料导入，以及 Express API。

## 学习方法闭环

当前复习链路已经按学习科学核心方法落地，不再只是“看解析”：

- `主动回忆`：复习项要求用户先写出意思、错因、原句线索或使用场景，再看参考答案。
- `语块化`：练习报告会从正确句、AI 改写句或参考译文中提取可迁移短语/句式。
- `挖空补全`：每个复习项生成 cloze 缺口，强制提取关键词或核心语块。
- `语境化输出`：复习完成前必须造句、复述或翻译，验证能否主动使用。
- `间隔重复`：掌握度提升后按 1/3/7/14/30 天逐步拉开复习间隔。

## 本地运行

```bash
npm install
npm run dev
```

默认服务地址是 `http://localhost:3000`。如需指定端口：

```bash
set PORT=3300&& npm run dev
```

## 生产构建

```bash
npm run build
npm run start
```

生产包默认监听 `3000` 端口，可通过 `PORT` 覆盖：

```bash
set PORT=3300&& npm run start
```

## Docker 部署

```bash
docker build -t english-training-cabin .
docker run --rm -p 3000:3000 --env-file .env.local english-training-cabin
```

部署平台只需要提供 Node 22 或 Docker 运行环境，并配置下方 AI 环境变量。静态前端和 Express API 会由同一个服务提供。

生产服务器推荐使用仓库内的 Compose 编排，包含应用和 Postgres；服务器入口由现有 Nginx 代理到 `127.0.0.1:3312`：

```bash
cp deploy/.env.production.example .env.production
docker compose -p english-training-cabin --env-file .env.production -f docker-compose.production.yml up -d --build
SMOKE_BASE_URL=https://study.xmlga.top npm run smoke:production
SMOKE_BASE_URL=https://study.xmlga.top npm run smoke:ga
```

`smoke:production` 验证线上健康、账号注册、云同步和 AI；`smoke:ga` 会强制检查真实 AI 能力。公开生产环境必须提供 `SAAS_SESSION_SECRET`、`POSTGRES_PASSWORD` 和 `AI_API_KEY`。
Nginx 配置模板见 `deploy/nginx-study.xmlga.top.conf`，证书建议用 certbot 签发到 `/etc/letsencrypt/live/study.xmlga.top/`。

## 质量门禁

```bash
npm run lint
npm run test
npm run test:e2e
npm run verify
SMOKE_BASE_URL=https://study.xmlga.top npm run smoke:ga
```

第一次运行 E2E 前需要安装浏览器：

```bash
npx playwright install chromium
```

CI 已配置在 `.github/workflows/ci.yml`，会在 `main` 推送和 PR 时运行 `npm run verify` 与 `npm audit --audit-level=moderate`。

## 本地数据备份

学习目标、练习记录、错因复习队列和能力画像默认保存在当前浏览器 IndexedDB。设置页提供“本地数据保险箱”：

- `导出学习数据`：下载版本化 JSON 备份，适合更换设备、清浏览器前留档。
- `恢复学习数据`：导入由英语训练舱导出的 JSON，恢复会覆盖当前浏览器内已有学习记录。

口语录音文件不上传；启用 AI 口语分析时，会发送必要口语文本到服务端和已配置 AI 供应商。

## 上线观测

服务端提供一个只含聚合数据、不含用户原文和密钥的观测端点：

```bash
curl http://localhost:3000/api/observability/summary
```

当前观测内容包括 API 请求量/错误率、反馈兜底率/平均耗时，以及前端匿名产品事件计数。事件上报白名单包含页面访问、训练完成、材料导入、口语分析和客户端错误。

## 环境变量

复制 `.env.example` 为 `.env.local`，按需配置：

```env
AI_PROVIDER=baseui
AI_BASE_URL=https://api.example.com/v1
AI_API_KEY=...
AI_MODEL=gpt-5.4-mini
SAAS_SESSION_SECRET=change-me-to-a-long-random-secret
SAAS_DATA_FILE=.data/saas-store.json
DATABASE_URL=
BILLING_WEBHOOK_SECRET=change-me-to-a-long-random-billing-webhook-secret
POSTGRES_DB=english_training
POSTGRES_USER=english_training
POSTGRES_PASSWORD=change-me-to-a-long-random-postgres-password
APP_URL=http://localhost:3000
```

推荐环境变量值不加引号，以便直接用于 Docker `--env-file`；服务端也兼容已有的带引号配置。AI 接口按 OpenAI-compatible `/v1/chat/completions` 调用。应用侧 API 使用 `/api/ai/generate-passage` 和 `/api/ai/analyze-speech`；旧版 `/api/gemini/*` 路径仅作为兼容别名保留。没有可用供应商配置时，AI 阅读生成和口语分析接口会返回离线模拟结果，保证核心训练闭环可用。

`SAAS_SESSION_SECRET` 用于签发登录会话，生产环境必须设置为高强度随机字符串；`DATABASE_URL` 存在时服务端会使用 Postgres SaaS 存储并自动执行 `0001_saas_core`、`0002_workspace_sessions` 和 `0003_commercial_ops` 扩展迁移，否则使用 `SAAS_DATA_FILE` 文件存储作为本地兜底。`BILLING_WEBHOOK_SECRET` 用于校验订阅 webhook 的 HMAC 签名。当前产品不启用邮件交付、邮箱验证或邮件找回密码，团队邀请通过可复制邀请链接完成。

## 云端账号与团队协作 API

当前已提供非付费的云端账号、团队协作、内容治理和合规基础接口：

- `POST /api/auth/register`：注册账号并创建默认团队空间和云端学习档案能力。
- `POST /api/auth/login`：登录并返回 Bearer token。
- `GET /api/auth/session`：静默检查当前登录状态；无效 token 返回匿名状态，不制造浏览器控制台 401 噪声。
- `POST /api/auth/refresh`：轮换当前登录会话，旧 token 立即失效。
- `POST /api/auth/logout`：撤销当前服务端会话。
- `GET /api/auth/sessions`：查看当前账号的登录设备与服务端会话。
- `DELETE /api/auth/sessions/:sessionId`：撤销指定非当前设备会话。
- `GET /api/auth/me`：读取当前账号、租户和订阅权益。
- `GET /api/workspace/members`：读取当前团队成员和邀请记录。
- `POST /api/workspace/invitations`：团队 owner 邀请成员。
- `POST /api/workspace/invitations/accept`：成员接受邀请并创建账号。
- `GET /api/admin/overview`：团队 owner 查看聚合管理概览。
- `GET /api/admin/operational-summary`：团队 owner 查看聚合运营概览、API/AI 观测和存储模式。
- `GET/POST/PATCH /api/admin/content-assets`：登记内容资产、维护授权状态和阻断风险内容。
- `GET /api/compliance/export`：立即导出当前用户自己的云端学习档案。
- `GET/POST /api/compliance/data-requests`：提交和查看数据导出/删除请求。
- `POST /api/compliance/data-requests/:requestId/resolve`：团队 owner 处理数据权利请求；删除请求完成时清除目标用户云端学习快照与增量实体。
- `GET /api/billing/entitlements`：读取当前云端能力开通状态。
- `POST /api/billing/webhook`：保留为后续权益变更集成入口；当前公开版本不需要接入付费流程。
- `PUT /api/cloud/learning-data`：把当前浏览器学习数据备份同步到服务端。
- `GET /api/cloud/learning-data`：从服务端读取当前用户自己的学习数据快照。
- `PUT /api/cloud/learning-entities`：按实体增量同步目标、练习、作答、复习和能力画像。
- `GET /api/cloud/learning-entities`：按用户和租户读取增量学习实体。

当前已具备 Postgres schema、整包快照、增量实体同步、服务端会话撤销、团队邀请链接、owner-only 管理概览、团队管理 UI、内容授权治理、数据权利请求和运营观测。付费功能和邮件功能不是当前重点；后续可继续强化学校/班级报表、真实内容授权流程和生产告警。
