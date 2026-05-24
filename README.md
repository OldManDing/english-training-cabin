# 英语训练舱

面向 CET-4 的 AI 备考训练产品。MVP 覆盖今日训练、专项阅读/听力、错因复习、口语重说、能力进展、材料导入，以及 Express API。

## 本地运行

```bash
npm install
npm run dev
```

默认服务地址是 `http://localhost:3000`。如需指定端口：

```bash
set PORT=3100&& npm run dev
```

## 生产构建

```bash
npm run build
npm run start
```

## 质量门禁

```bash
npm run lint
npm run test
npm run test:e2e
```

第一次运行 E2E 前需要安装浏览器：

```bash
npx playwright install chromium
```

## 上线观测

服务端提供一个只含聚合数据、不含用户原文和密钥的观测端点：

```bash
curl http://localhost:3000/api/observability/summary
```

当前观测内容包括 API 请求量/错误率、AI 兜底率/平均耗时，以及前端匿名产品事件计数。事件上报白名单包含页面访问、训练完成、材料导入、口语分析和客户端错误。

## 环境变量

复制 `.env.example` 为 `.env.local`，按需配置：

```env
AI_PROVIDER="baseui"
AI_BASE_URL="https://api.example.com/v1"
AI_API_KEY="..."
AI_MODEL="gpt-5.4-mini"
APP_URL="http://localhost:3000"
```

AI 接口按 OpenAI-compatible `/v1/chat/completions` 调用。应用侧 API 使用 `/api/ai/generate-passage` 和 `/api/ai/analyze-speech`；旧版 `/api/gemini/*` 路径仅作为兼容别名保留。没有可用供应商配置时，AI 阅读生成和口语分析接口会返回离线模拟结果，保证核心训练闭环可用。
