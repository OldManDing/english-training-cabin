# 英语训练舱生产上线验收记录

日期：2026-05-25

## 发布信息

- 域名：`https://study.xmlga.top`
- 服务器：`8.159.136.223`
- 发布提交：`ca5d0ed`
- 部署路径：`/opt/english-training-cabin/releases/ca5d0ed`
- 当前指针：`/opt/english-training-cabin/current -> /opt/english-training-cabin/releases/ca5d0ed`
- 容器入口：Nginx -> `127.0.0.1:3312` -> `english-training-cabin-app-1`
- 数据存储：Postgres 容器，`/api/health` 返回 `store=postgres`

## 本地上线前门禁

| 检查项 | 命令 / 方式 | 结果 |
| --- | --- | --- |
| TypeScript | `npm.cmd run lint` | 通过 |
| 单元/API 测试 | `npm.cmd run test` | 4 个测试文件，37 个用例通过 |
| 生产构建 | `npm.cmd run build` | 通过 |
| 浏览器 E2E | `npm.cmd run verify` | 11 个 Playwright 用例通过 |
| 依赖审计 | `npm.cmd audit --audit-level=moderate` | 0 个漏洞 |
| 本地生产 smoke | `SMOKE_BASE_URL=http://127.0.0.1:3311 SMOKE_LIVE_AI=true npm.cmd run smoke:production` | 通过 |
| 本地 Docker 镜像 | `docker build -t english-training-cabin:local .` | 通过 |
| 本地单容器 smoke | `SMOKE_BASE_URL=http://127.0.0.1:3313 SMOKE_LIVE_AI=true npm.cmd run smoke:production` | 通过 |
| 本地 Compose + Postgres | `docker compose ... up -d --build` + smoke | 通过，`store=postgres` |

## 线上验收

| 检查项 | 证据 | 结果 |
| --- | --- | --- |
| 容器健康 | `curl http://127.0.0.1:3312/api/health` | 通过 |
| HTTPS 证书 | Let's Encrypt `study.xmlga.top`，到期日 `2026-08-23` | 通过 |
| 外部健康检查 | `curl.exe -I https://study.xmlga.top/api/health` | 200 |
| 线上 smoke | `SMOKE_BASE_URL=https://study.xmlga.top SMOKE_LIVE_AI=true npm.cmd run smoke:production` | 通过 |
| 线上 UI 首页 | Playwright 打开 `https://study.xmlga.top`，标题为“英语训练舱 | AI 英语能力训练系统” | 通过 |
| 设置页控制台 | Playwright 进入设置页，Console errors/warnings 为 0 | 通过 |
| 主要导航 | 今日训练、专项练习、复习队列、口语重说、能力进展、材料导入均可达 | 通过 |
| 移动端视口 | 390x844 访问首页并截图 | 通过 |

## 产品验收结论

- 核心学习闭环可上线：入门诊断、今日任务、专项练习、评分反馈、错因复习、能力画像、材料导入和本地/云端学习数据同步均有自动化或 smoke 覆盖。
- 学习方法已落地：主动回忆、语块化、挖空提取、语境化输出和间隔重复已进入复习数据结构与 UI 流程。
- 对外定位已从单一 CET-4 备考工具调整为“英语训练舱 / AI 英语能力训练系统”，当前首发聚焦 CET-4，架构保留多考试扩展。
- 线上 AI 供应商调用通过，`BaseUI` 的 OpenAI-compatible 接口可生成阅读材料。

## 已知上线风险

- 服务器根盘剩余空间偏低：发布过程中曾因 Docker 占满根盘导致构建卡住，清理后剩余约 1.4GB。建议尽快扩容或迁移 Docker 数据目录。
- 邮件交付不纳入当前版本：账号注册、云同步和团队邀请链接可用；邮箱验证、邮件找回密码和邀请邮件不作为上线能力。
