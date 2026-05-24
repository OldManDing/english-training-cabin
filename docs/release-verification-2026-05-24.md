# 英语训练舱 MVP 上线验证记录

日期：2026-05-24

## 本次落地范围

- 产品化基础：页面标题、HTML 语言、README、metadata、Windows 可用 clean 脚本。
- API 补齐：新增材料结构校验接口 `/api/materials/validate-passage`。
- API 补齐：新增练习报告生成接口 `/api/practice/choice-report`。
- API 精修：AI 阅读生成和口语分析统一使用 `/api/ai/*` 路径，旧 `/api/gemini/*` 保留兼容。
- AI 供应商：支持 OpenAI-compatible `/v1/chat/completions`，可通过 `AI_PROVIDER`、`AI_BASE_URL`、`AI_API_KEY`、`AI_MODEL` 配置 BaseUI 类网关。
- 材料导入：从单一 AI 生成扩展为 AI 生成、JSON 文本导入、JSON 文件导入。
- 上线说明：产品内新增本地数据、版权来源、AI 兜底声明入口。
- 观测能力：新增 `/api/telemetry/event` 和 `/api/observability/summary`，统计 API 错误率、AI 兜底率、耗时和关键产品事件。
- 测试补齐：新增材料规范化领域测试、材料/API 契约测试、JSON 导入 E2E。
- 测试补齐：新增移动端 Chromium smoke，覆盖首屏、上线声明和材料导入入口。
- 构建精修：拆分 Vite vendor chunk，消除 500KB chunk 体积告警。
- 生产部署：新增 Dockerfile、.dockerignore 和 GitHub Actions CI，用于构建、测试、E2E 与依赖审计。
- 数据安全：新增设置页“本地数据保险箱”，支持 IndexedDB 学习数据 JSON 导出与恢复。
- 产品精修：补充 favicon，消除浏览器控制台 404 噪声。
- 产品精修：复习队列空状态不再展示虚假待复习数量，改为明确提示“完成训练后生成真实错因”。
- 产品精修：对外名称统一为“英语训练舱 / AI 英语能力训练系统”，减少单一 CET-4 AI 教练表述。
- 产品精修：清理用户界面中不适合上线的口语化、不可证或过强营销文案。
- 产品精修：今日页能力弱项只显示真实 `SkillProfile` 分数，未诊断模块显示“待诊断”。
- 产品精修：复习页无真实错因时不再提供示例复习流程，改为生产空状态。
- 产品精修：口语重说新增第二次重说转写确认，完成后才生成对比报告并写入能力证据。
- 产品精修：入门诊断结果页改为基于用户自评动态生成强项、弱项和推荐依据，去除平台排名、固定词汇量、固定权重等未验证表述。
- 数据精修：练习完成写入能力画像时按证据数合并同一能力点，避免重复训练覆盖历史证据。
- SaaS 基座：新增账号注册、登录、组织租户、Pro 试用权益、Bearer 会话和服务端云端学习快照。
- SaaS 前端：设置页新增“SaaS 云端账号”，支持注册试用、登录、同步到云端和从云端恢复。
- SaaS 安全：密码使用 PBKDF2-SHA256 加盐哈希，生产环境要求 `SAAS_SESSION_SECRET`，云端学习快照按当前用户和租户隔离。
- SaaS 配置：新增 `SAAS_SESSION_SECRET` 与 `SAAS_DATA_FILE`，当前文件存储为第一阶段基座，商业化终态建议迁移 Postgres。
- SaaS 第二批：新增 Postgres 适配器、`0001_saas_core` 迁移、邮箱验证、密码重置、订阅 webhook 和增量学习实体同步。
- 本机环境：已安装 Playwright Chromium，E2E 可在当前机器直接运行。
- 供应商验证：BaseUI `/models` 可访问，本机 `.env.local` 使用 `gpt-5.4-mini`。
- 供应商验证：生产包在 `PORT=3200` 下调用 `/api/ai/analyze-speech` 与 `/api/ai/generate-passage` 成功，2 次 AI 请求、0 次兜底，平均耗时约 7.2 秒。
- 供应商复验：开发地址 `PORT=3300` 下 `/api/ai/analyze-speech` 与 `/api/ai/generate-passage` 均返回真实 BaseUI 结构化结果。
- 容器验证：`docker build -t english-training-cabin:local .` 通过；容器健康检查返回 `aiConfigured=true`、`aiProvider=baseui`。

## 质量门禁

| 门禁 | 命令 | 结果 |
| --- | --- | --- |
| TypeScript 类型检查 | `npm run lint` | 通过 |
| 单元/API 测试 | `npm run test` | 4 个测试文件，34 个用例通过 |
| 生产构建 | `npm run build` | 通过，无 chunk 体积告警 |
| 浏览器 E2E | `playwright test` | 10 个桌面 Chromium 用例 + 1 个移动 Chromium 用例通过 |
| 串行总验证 | `npm run verify` | 通过 |
| 依赖安全审计 | `npm audit --audit-level=moderate` | 0 个已知漏洞 |
| 本地开发运行 | `PORT=3300 npm run dev` + 浏览器控制台 | Vite websocket 正常连接，0 个 console error |

## 已覆盖的关键路径

| 功能路径 | 覆盖方式 | 证据 |
| --- | --- | --- |
| 阅读训练闭环 | E2E | 完成 5 题阅读训练，IndexedDB 写入 session、attempt、reviewItem、skillProfile |
| 主动复习闭环 | E2E | 真实错因按三步复盘，完成后更新 mastery、nextReviewAt 和 review skillProfile |
| 入门诊断闭环 | E2E | 诊断写入目标分、每日时间、五项能力画像，再回到今日训练 |
| 口语重说闭环 | E2E | 首次转写、AI/模拟反馈、第二次重说转写确认、报告持久化 |
| 翻译训练闭环 | E2E | AI 评阅后生成 attempt、reviewItem 和 translation skillProfile |
| API 健康与今日计划 | E2E + API 测试 | `/api/health`、`/api/study/daily-plan` 返回成功，健康检查返回 AI provider/model 状态但不泄露 key |
| AI 阅读生成兜底 | API 测试 | 无 API Key 时返回离线模拟材料 |
| 口语分析兜底 | API 测试 | 无 API Key 时返回结构化模拟反馈 |
| JSON 材料导入 | E2E + API 测试 | 校验通过后直接进入阅读训练 |
| 本地数据备份恢复 | E2E | 设置页导出 JSON 备份，恢复后 IndexedDB 写回目标和错题复习数据 |
| 控制台健康 | E2E + 手工浏览器 | 生产构建与本地开发地址均无浏览器 console error |
| 练习报告 API | API 测试 | 错题生成 attempt、reviewItem、skillProfile |
| 全功能页可达 | E2E | 专项练习、复习队列、口语重说、能力进展、材料导入、设置页首屏控件可见 |
| 产品声明可见 | 移动端 E2E | 本地数据、版权来源、AI 兜底入口在首屏可见且可打开 |
| 观测接口 | API 测试 | 遥测事件白名单、非法事件拒绝、汇总接口返回聚合指标且不泄露 key |
| 安全响应头 | API 测试 | 健康检查返回 CSP、nosniff、Referrer-Policy 和麦克风权限策略 |
| SaaS 账号与租户 | API + E2E | 注册、登录、权益读取、未登录拒绝、跨租户云快照隔离、设置页云同步恢复均通过 |
| SaaS 第二批商业化能力 | API 测试 | 邮箱验证、密码重置、订阅 webhook 签名、订阅幂等、增量实体同步和跨租户隔离通过 |

## 测试验收结论

- 通过：类型检查、领域/API 测试、生产构建、桌面与移动端 E2E、生产构建控制台错误断言、本地开发地址手工浏览器验证。
- 通过：健康检查、今日计划、材料校验、练习报告、AI 阅读生成、AI 口语分析、观测汇总均可访问。
- 通过：AI 供应商 BaseUI 已按 OpenAI-compatible `/v1/chat/completions` 调用成功；供应商异常时仍有离线兜底。
- 通过：前端关键闭环覆盖到阅读训练写入 IndexedDB、复习项生成、主动复习、入门诊断持久化、口语二次重说、翻译评阅、能力画像更新、材料导入、数据导出与恢复。
- 通过：SaaS 第一阶段基座覆盖账号注册登录、组织租户、订阅权益、云端学习快照同步和租户隔离。
- 通过：SaaS 第二阶段服务端能力覆盖 Postgres schema、账号恢复、订阅权益变更和增量云同步 API。

## 产品验收结论

- 可以作为本地优先英语训练产品上线试用：首屏目标清晰，今日训练、专项练习、复习队列、口语重说、能力进展、材料导入、设置与备份恢复形成闭环。
- 对外定位已从单点 “CET-4 AI 备考训练舱” 修正为“英语训练舱 / AI 英语能力训练系统”，首发仍聚焦 CET-4，底层保留多考试扩展。
- 版权、隐私、本地数据、AI 兜底与供应商失败风险已在产品内显式提示，避免用户误以为是官方真题或云端账号产品。
- 当前上线边界：适合单用户、本地优先、浏览器数据持久化场景；跨设备账号、云同步、完整授权题库和支付系统不在本次上线范围。
- SaaS 转型边界：账号、租户、试用权益和云端快照已经可用；支付、正式数据库、增量同步、团队管理和内容授权后台仍需作为下一阶段商业化能力继续开发。

## 发布前注意

- 当前 AI 能力在无 `AI_API_KEY` 或供应商失败时会走离线模拟结果，适合演示和 MVP 闭环验证；正式上线若要真实 AI 反馈，需要配置有效 Key，并确认供应商模型名可用。
- 当前 MVP 仍是本地优先数据模型，练习证据保存在浏览器 IndexedDB；跨设备账号、云同步和权限体系不在本次范围内。
- 题材版权策略仍应坚持只内置原创/模拟题，用户导入内容仅用于个人学习。
