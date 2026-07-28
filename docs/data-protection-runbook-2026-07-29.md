# 数据保护与恢复运行手册

## 目标

- 账号学习记录持续写入 PostgreSQL，浏览器存储仅作为本地缓存。
- 每天生成 PostgreSQL 与应用数据卷备份。
- 每次备份必须恢复到临时数据库并比较关键表计数，验证通过后才标记为可恢复。
- 所有者控制台读取 `/data/data-protection-status.json`，显示备份新鲜度和恢复演练结果。

## 运行方式

生产机首次安装定时任务：

```bash
bash /opt/english-training-cabin/current/scripts/install-production-backup-timer.sh
```

立即执行一次备份与恢复演练：

```bash
systemctl start english-training-cabin-backup.service
systemctl status english-training-cabin-backup.service --no-pager
```

查看下次执行时间：

```bash
systemctl list-timers english-training-cabin-backup.timer --no-pager
```

## 产物

- 备份目录：`/opt/english-training-cabin/backups/scheduled/scheduled-<UTC timestamp>`
- 数据库备份：`postgres.sql.gz`
- 应用数据：`app-data.tgz`
- 原库计数：`source-counts.txt`
- 恢复库计数：`restored-counts.txt`
- 文件校验：`SHA256SUMS`
- 可恢复标记：`.verified-backup`

只有恢复成功、关键计数一致且 SHA-256 校验通过的目录才会生成 `.verified-backup`。

## 恢复步骤

1. 停止应用容器，保留 PostgreSQL 容器。
2. 对当前数据库和应用卷再做一次只读前置备份。
3. 创建新的空数据库，不直接覆盖原数据库。
4. 解压 `postgres.sql.gz` 并导入新数据库。
5. 对比 `source-counts.txt`、关键账号和学习实体数量。
6. 将应用连接切换到恢复数据库并执行健康检查与登录恢复验证。
7. 验证通过后再决定是否替换旧数据库；旧数据库保留到观察期结束。

## 告警判定

- `healthy`：最近 36 小时内存在恢复演练通过的备份。
- `stale`：最近一次有效备份超过 36 小时。
- `failed`：备份、SHA-256、数据库导入或计数对比任一失败。
- `not_configured`：应用未配置状态文件路径。

## 当前边界

- 定时备份位于同一生产主机，尚未实现异地对象存储复制。
- 备份目录不自动删除，清理前必须确认 `.verified-backup`、保留周期、磁盘容量和异地副本。
- 基础设施恢复目标为 RPO 24 小时内、RTO 60 分钟内；账号级云同步频率高于基础设施备份频率。
