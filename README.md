# 英语训练舱

英语能力训练舱是一个本地优先的 AI 学习训练系统，首发场景聚焦 CET-4，但底层按多考试、多目标、可扩展训练闭环设计。MVP 覆盖今日训练、专项阅读/听力、错因复习、口语重说、能力进展、材料导入，以及 Express API。

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

## 质量门禁

```bash
npm run lint
npm run test
npm run test:e2e
npm run verify
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

当前观测内容包括 API 请求量/错误率、AI 兜底率/平均耗时，以及前端匿名产品事件计数。事件上报白名单包含页面访问、训练完成、材料导入、口语分析和客户端错误。

## 环境变量

复制 `.env.example` 为 `.env.local`，按需配置：

```env
AI_PROVIDER=baseui
AI_BASE_URL=https://api.example.com/v1
AI_API_KEY=...
AI_MODEL=gpt-5.4-mini
APP_URL=http://localhost:3000
```

推荐环境变量值不加引号，以便直接用于 Docker `--env-file`；服务端也兼容已有的带引号配置。AI 接口按 OpenAI-compatible `/v1/chat/completions` 调用。应用侧 API 使用 `/api/ai/generate-passage` 和 `/api/ai/analyze-speech`；旧版 `/api/gemini/*` 路径仅作为兼容别名保留。没有可用供应商配置时，AI 阅读生成和口语分析接口会返回离线模拟结果，保证核心训练闭环可用。
