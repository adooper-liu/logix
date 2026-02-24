# 从标准 PostgreSQL 迁移到 TimescaleDB
# Migrating from Standard PostgreSQL to TimescaleDB

## 📋 概述 / Overview

本指南帮助你从标准 PostgreSQL 版本迁移到 TimescaleDB 版本。

This guide helps you migrate from standard PostgreSQL to TimescaleDB.

---

## ✅ 迁移检查清单 / Migration Checklist

### 迁移前检查 / Pre-Migration Checks

- [ ] 备份现有数据库数据
- [ ] 记录当前数据库连接信息
- [ ] 停止所有运行的服务
- [ ] 确认有足够的磁盘空间（至少 10GB）
- [ ] 确认有足够的内存（至少 4GB）

### 迁移步骤 / Migration Steps

- [ ] 删除旧的配置文件和脚本
- [ ] 启动 TimescaleDB 环境
- [ ] 验证 TimescaleDB 安装
- [ ] 运行数据迁移脚本（如果需要）
- [ ] 测试应用连接
- [ ] 验证数据完整性
- [ ] 配置监控和告警

### 迁移后验证 / Post-Migration Verification

- [ ] 检查所有数据表是否正常
- [ ] 验证应用功能正常
- [ ] 测试查询性能
- [ ] 检查压缩策略是否生效
- [ ] 验证监控面板显示正确

---

## 🗑️ 清理旧文件 / Clean Up Old Files

以下文件已在新版本中删除：

The following files have been removed in the new version:

### 脚本文件 / Script Files
```cmd
✅ 删除 / Deleted:
- dev-start.bat
- dev-stop.bat
- dev-logs.bat
- dev-db.bat
- dev-restart.bat
- dev-build.bat
- dev-clean.bat

✅ 替换为 / Replaced with:
- tsdb-start.bat
- tsdb-stop.bat
- tsdb-logs.bat
- tsdb-db.bat
- tsdb-info.bat
- tsdb-restart.bat
- tsdb-clean.bat
```

### Docker Compose 文件 / Docker Compose Files
```cmd
✅ 删除 / Deleted:
- docker-compose.yml
- docker-compose.dev.yml
- docker-compose.prod.yml

✅ 替换为 / Replaced with:
- docker-compose.timescaledb.yml
- docker-compose.timescaledb.prod.yml
```

### 文档文件 / Documentation Files
```cmd
✅ 删除 / Deleted:
- DOCKER_GUIDE.md
- DOCKER_QUICK_REFERENCE.md

✅ 替换为 / Replaced with:
- TIMESCALEDB_GUIDE.md
- TIMESCALEDB_QUICK_REFERENCE.md
- WINDOWS_DOCKER_GUIDE.md (已更新 / Updated)
```

### 环境变量文件 / Environment Variable Files
```cmd
✅ 重命名 / Renamed:
- .env.docker.example → .env.example

✅ 新增 / Added:
- .env.timescaledb.example (详细的 TimescaleDB 配置)
```

---

## 🚀 迁移步骤 / Migration Steps

### 步骤 1: 备份现有数据 / Step 1: Backup Existing Data

如果你有现有数据，请先备份：

If you have existing data, backup first:

```cmd
# 导出数据库
docker exec logix-postgres-prod pg_dump -U postgres logix_db > backup_$(date +%Y%m%d_%H%M%S).sql

# 或者使用 Docker Compose
docker-compose -f docker-compose.prod.yml exec postgres pg_dump -U postgres logix_db > backup.sql
```

### 步骤 2: 停止旧服务 / Step 2: Stop Old Services

```cmd
# 停止所有旧服务
docker-compose down

# 清理旧容器（可选）
docker-compose rm -f

# 清理旧数据（谨慎操作！）
# docker volume prune
```

### 步骤 3: 启动 TimescaleDB 环境 / Step 3: Start TimescaleDB Environment

#### 开发环境 / Development

```cmd
# 启动 TimescaleDB 开发环境
tsdb-start

# 等待服务启动（约 30 秒）
# Wait for services to start (about 30 seconds)

# 查看服务状态
docker-compose -f docker-compose.timescaledb.yml ps
```

#### 生产环境 / Production

```cmd
# 1. 复制环境变量配置
copy .env.timescaledb.example .env

# 2. 编辑 .env 文件，填入真实配置
# (重要：修改所有默认密码)

# 3. 启动生产环境
docker-compose -f docker-compose.timescaledb.prod.yml --env-file .env up -d --build
```

### 步骤 4: 验证 TimescaleDB 安装 / Step 4: Verify TimescaleDB Installation

```cmd
# 进入数据库
tsdb-db

# 在 psql 中运行以下命令
# Run the following commands in psql

-- 1. 检查 TimescaleDB 版本
SELECT extversion FROM pg_extension WHERE extname='timescaledb';

-- 2. 查看超表
SELECT * FROM timescaledb_information.hypertables;

-- 3. 查看连续聚合
SELECT * FROM timescaledb_information.continuous_aggregates;

-- 4. 查看压缩策略
SELECT * FROM timescaledb_information.jobs WHERE proc_name = 'policy_compression';

-- 5. 查看保留策略
SELECT * FROM timescaledb_information.jobs WHERE proc_name = 'policy_retention';
```

预期输出 / Expected output:
```
 extversion
------------
 2.14.2

 hypertable_schema | hypertable_name |     table_name
-------------------+-----------------+--------------------
 public            | container_status_events | container_status_events
 public            | process_port_operations | process_port_operations
```

### 步骤 5: 导入现有数据（如果有）/ Step 5: Import Existing Data (If Any)

```cmd
# 恢复数据库备份
docker exec -i logix-timescaledb-prod psql -U postgres -d logix_db < backup.sql

# 或者使用 docker cp
docker cp backup.sql logix-timescaledb-prod:/tmp/backup.sql
docker exec logix-timescaledb-prod psql -U postgres -d logix_db -f /tmp/backup.sql
```

### 步骤 6: 测试应用连接 / Step 6: Test Application Connection

```cmd
# 查看后端日志
tsdb-logs backend

# 或者
docker-compose -f docker-compose.timescaledb.yml logs backend

# 检查是否有数据库连接错误
# Look for database connection errors
```

### 步骤 7: 访问监控面板 / Step 7: Access Monitoring Dashboards

```cmd
# Grafana: http://localhost:3000 (admin/admin)
# Prometheus: http://localhost:9090
```

### 步骤 8: 验证数据压缩 / Step 8: Verify Data Compression

等待至少 30 天，或者手动压缩：

Wait at least 30 days, or manually compress:

```sql
-- 查看压缩统计
SELECT
    hypertable_name,
    COUNT(*) AS total_chunks,
    COUNT(*) FILTER (WHERE compressed = true) AS compressed,
    ROUND((COUNT(*) FILTER (WHERE compressed = true)::NUMERIC / COUNT(*)::NUMERIC * 100), 2) AS compression_pct
FROM timescaledb_information.chunks
GROUP BY hypertable_name;
```

---

## 🔄 新旧命令对照表 / Old vs New Command Comparison

| 旧命令 / Old Command | 新命令 / New Command | 说明 / Description |
|---------------------|---------------------|-------------------|
| `dev-start.bat` | `tsdb-start.bat` | 启动开发环境 |
| `dev-stop.bat` | `tsdb-stop.bat` | 停止开发环境 |
| `dev-logs.bat` | `tsdb-logs.bat` | 查看日志 |
| `dev-db.bat` | `tsdb-db.bat` | 连接数据库 |
| `dev-restart.bat` | `tsdb-restart.bat` | 重启服务 |
| `dev-build.bat` | - | 不再需要 / No longer needed |
| `dev-clean.bat` | `tsdb-clean.bat` | 清理资源 |
| - | `tsdb-info.bat` | 查看统计信息（新增） |

---

## 📊 性能对比 / Performance Comparison

### 查询性能 / Query Performance

```sql
-- 测试查询：获取最近 7 天的货柜状态事件
-- Test query: Get container status events for the last 7 days

-- 标准 PostgreSQL: ~100-500ms
-- Standard PostgreSQL: ~100-500ms

-- TimescaleDB: ~10-50ms
-- TimescaleDB: ~10-50ms

-- 性能提升: 5-10 倍
-- Performance improvement: 5-10x
```

### 存储空间 / Storage Space

```
标准 PostgreSQL: 100 GB
Standard PostgreSQL: 100 GB

TimescaleDB (压缩后): 10-30 GB
TimescaleDB (after compression): 10-30 GB

节省空间: 70-90%
Space saved: 70-90%
```

---

## 🆘 故障排查 / Troubleshooting

### 问题 1: 连接失败 / Issue 1: Connection Failed

```cmd
# 检查 TimescaleDB 是否运行
docker-compose -f docker-compose.timescaledb.yml ps

# 查看日志
tsdb-logs postgres

# 检查端口是否被占用
netstat -ano | findstr "5432"
```

### 问题 2: 数据未迁移 / Issue 2: Data Not Migrated

```sql
-- 检查表是否存在
\dt

-- 检查数据行数
SELECT COUNT(*) FROM container_status_events;
SELECT COUNT(*) FROM process_port_operations;
```

### 问题 3: 超表未创建 / Issue 3: Hypertables Not Created

```sql
-- 检查超表
SELECT * FROM timescaledb_information.hypertables;

-- 如果超表不存在，手动创建
SELECT create_hypertable('container_status_events', 'occurred_at');
SELECT create_hypertable('process_port_operations', 'gate_in_time');
```

### 问题 4: 压缩不工作 / Issue 4: Compression Not Working

```sql
-- 检查压缩策略
SELECT * FROM timescaledb_information.jobs
WHERE proc_name = 'policy_compression';

-- 手动触发压缩
SELECT compress_chunk(chunk_schema, chunk_name)
FROM timescaledb_information.chunks
WHERE hypertable_name = 'container_status_events'
  AND range_end < NOW() - INTERVAL '30 days'
  AND compressed = false;
```

---

## 📚 参考文档 / Reference Documents

- [TIMESCALEDB_GUIDE.md](./TIMESCALEDB_GUIDE.md) - 完整 TimescaleDB 指南
- [TIMESCALEDB_QUICK_REFERENCE.md](./TIMESCALEDB_QUICK_REFERENCE.md) - 快速参考
- [WINDOWS_DOCKER_GUIDE.md](./WINDOWS_DOCKER_GUIDE.md) - Windows 快速指南
- [TimescaleDB 官方文档](https://docs.timescale.com/)

---

## ✅ 迁移完成检查 / Migration Completion Checklist

- [ ] 所有旧服务已停止
- [ ] TimescaleDB 环境成功启动
- [ ] TimescaleDB 扩展已安装并验证
- [ ] 超表已创建
- [ ] 数据已成功迁移（如果有）
- [ ] 应用可以连接到数据库
- [ ] 查询性能得到提升
- [ ] 监控面板正常显示
- [ ] 压缩策略已配置
- [ ] 保留策略已配置
- [ ] 所有功能测试通过

---

## 🎉 迁移完成！/ Migration Complete!

恭喜你成功迁移到 TimescaleDB！

Congratulations on successfully migrating to TimescaleDB!

### 下一步 / Next Steps

1. 查看 [TIMESCALEDB_GUIDE.md](./TIMESCALEDB_GUIDE.md) 了解详细功能
2. 访问 Grafana 监控面板: http://localhost:3000
3. 探索连续聚合视图和实用函数
4. 配置告警规则
5. 定期检查压缩效果

---

**版本 / Version**: 1.0.0
**最后更新 / Last Updated**: 2024-02-24
