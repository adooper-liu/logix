# LogiX TimescaleDB 集成指南
# LogiX TimescaleDB Integration Guide

## 📚 目录 / Table of Contents

- [概述](#概述-overview)
- [快速开始](#快速开始-quick-start)
- [架构说明](#架构说明-architecture)
- [功能特性](#功能特性-features)
- [Windows 脚本使用](#windows-脚本使用-windows-scripts)
- [命令参考](#命令参考-command-reference)
- [监控和可视化](#监控和可视化-monitoring-and-visualization)
- [最佳实践](#最佳实践-best-practices)
- [故障排查](#故障排查-troubleshooting)
- [性能调优](#性能调优-performance-tuning)

---

## 🎯 概述 / Overview

TimescaleDB 是 PostgreSQL 的扩展，专门用于处理时间序列数据。LogiX 项目集成了 TimescaleDB，以优化物流轨迹数据的存储和查询性能。

TimescaleDB is a PostgreSQL extension specifically designed for time-series data. LogiX project integrates TimescaleDB to optimize storage and query performance for logistics tracking data.

### 为什么选择 TimescaleDB？/ Why TimescaleDB?

| 特性 / Feature | 标准 PostgreSQL | TimescaleDB | 提升 / Improvement |
|----------------|----------------|-------------|-------------------|
| 时间范围查询 / Time Range Queries | 慢 / Slow | 快 / Fast | **5-10倍 / 5-10x** |
| 数据压缩率 / Data Compression | 0% | 70%-90% | **显著 / Significant** |
| 写入吞吐量 / Write Throughput | 中等 / Medium | 高 / High | **2-3倍 / 2-3x** |
| 聚合查询 / Aggregate Queries | 慢 / Slow | 极快 / Extremely Fast | **10-100倍 / 10-100x** |

### 核心表 / Core Tables

1. **container_status_events** - 容器状态事件表
2. **process_port_operations** - 港口操作表

---

## 🚀 快速开始 / Quick Start

### 前置要求 / Prerequisites

- Docker Desktop 已安装并运行 / Docker Desktop installed and running
- 至少 4GB 可用内存 / At least 4GB available memory
- 10GB 可用磁盘空间 / 10GB available disk space

### 启动开发环境 / Start Development Environment

```cmd
# 启动 TimescaleDB 开发环境
# Start TimescaleDB development environment
tsdb-start

# 或者使用 Docker Compose
# Or use Docker Compose
docker-compose -f docker-compose.timescaledb.yml up -d
```

### 验证安装 / Verify Installation

```cmd
# 检查 TimescaleDB 版本
# Check TimescaleDB version
tsdb-db

# 在 psql 中运行
# Run in psql
SELECT extversion FROM pg_extension WHERE extname='timescaledb';
```

预期输出 / Expected output:
```
 extversion
------------
 2.14.2
```

### 查看超表信息 / View Hypertables Information

```cmd
# 查看所有 TimescaleDB 信息
# View all TimescaleDB information
tsdb-info
```

---

## 🏗️ 架构说明 / Architecture

### Docker Compose 服务 / Docker Compose Services

```
┌─────────────────────────────────────────────────────────────┐
│                    Docker Network                           │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │  TimescaleDB │  │   Backend    │  │    Redis     │    │
│  │   :5432      │  │    :3001     │  │   :6379      │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
│         │                  │                  │               │
│         └──────────────────┼──────────────────┘               │
│                            │                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │  Prometheus  │  │   Grafana    │  │  Elasticsearch│   │
│  │   :9090      │  │   :3000      │  │   :9200      │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### 数据流向 / Data Flow

```
外部数据源 (飞驼 API)
    ↓
适配器层 (FeiTuoAdapter)
    ↓
容器状态事件 (container_status_events) → TimescaleDB 超表
    ↓
连续聚合视图 (预聚合统计)
    ↓
Prometheus 监控指标
    ↓
Grafana 可视化面板
```

---

## ✨ 功能特性 / Features

### 1. 超表 (Hypertables)

时间序列表自动分区，优化查询性能。

Time-series tables are automatically partitioned for optimized query performance.

```sql
-- 查看超表
-- View hypertables
SELECT * FROM timescaledb_information.hypertables;
```

### 2. 数据压缩 (Data Compression)

自动压缩历史数据，节省 70%-90% 存储空间。

Automatically compress historical data, saving 70%-90% storage space.

```sql
-- 查看压缩统计
-- View compression statistics
SELECT
    hypertable_name,
    COUNT(*) FILTER (WHERE compressed = true) AS compressed_chunks,
    ROUND((COUNT(*) FILTER (WHERE compressed = true)::NUMERIC / COUNT(*)::NUMERIC * 100), 2) AS compression_pct
FROM timescaledb_information.chunks
GROUP BY hypertable_name;
```

### 3. 数据保留策略 (Retention Policies)

自动删除过期数据，防止数据库膨胀。

Automatically delete expired data to prevent database bloat.

```sql
-- 查看保留策略
-- View retention policies
SELECT
    hypertable_name,
    config->>'drop_after' AS retention_period
FROM timescaledb_information.jobs
WHERE proc_name = 'policy_retention';
```

### 4. 连续聚合视图 (Continuous Aggregates)

预聚合统计信息，加速复杂查询。

Pre-aggregate statistics for faster complex queries.

```sql
-- 查看连续聚合视图
-- View continuous aggregates
SELECT * FROM timescaledb_information.continuous_aggregates;

-- 查询每日货柜状态统计
-- Query daily container status statistics
SELECT * FROM container_status_daily_stats
WHERE bucket > NOW() - INTERVAL '7 days'
ORDER BY bucket DESC;
```

### 5. 实用函数 (Utility Functions)

内置常用查询函数，简化开发。

Built-in utility functions for simplified development.

```sql
-- 获取货柜最新状态
-- Get latest container status
SELECT * FROM get_latest_container_status('CNTR1234567');

-- 获取货柜港口停留时间
-- Get container dwell time at ports
SELECT * FROM calculate_container_dwell_time('CNTR1234567');

-- 检测停滞货柜（24小时无更新）
-- Detect stagnant containers (no update for 24 hours)
SELECT * FROM detect_stagnant_containers(24);

-- 获取货柜完整时间线
-- Get complete container timeline
SELECT * FROM get_container_timeline('CNTR1234567');
```

---

## 🖥️ Windows 脚本使用 / Windows Scripts

### 脚本列表 / Script List

| 脚本 / Script | 功能 / Function | 危险程度 / Risk |
|----------------|----------------|-----------------|
| `tsdb-start.bat` | 启动开发环境 / Start dev environment | ✅ 安全 / Safe |
| `tsdb-stop.bat` | 停止开发环境 / Stop dev environment | ✅ 安全 / Safe |
| `tsdb-logs.bat` | 查看日志 / View logs | ✅ 安全 / Safe |
| `tsdb-db.bat` | 连接数据库 / Connect to database | ✅ 安全 / Safe |
| `tsdb-info.bat` | 查看统计信息 / View statistics | ✅ 安全 / Safe |
| `tsdb-restart.bat` | 重启服务 / Restart services | ✅ 安全 / Safe |
| `tsdb-clean.bat` | **删除所有数据** / **Delete all data** | ⚠️ 危险 / Dangerous |

### 使用示例 / Usage Examples

```cmd
# 启动环境
# Start environment
tsdb-start

# 查看日志
# View logs
tsdb-logs postgres

# 进入数据库
# Enter database
tsdb-db

# 查看统计信息
# View statistics
tsdb-info

# 停止环境
# Stop environment
tsdb-stop
```

---

## 📖 命令参考 / Command Reference

### Docker Compose 命令 / Docker Compose Commands

```cmd
# 启动服务
# Start services
docker-compose -f docker-compose.timescaledb.yml up -d

# 查看日志
# View logs
docker-compose -f docker-compose.timescaledb.yml logs -f postgres

# 停止服务
# Stop services
docker-compose -f docker-compose.timescaledb.yml down

# 重新构建
# Rebuild
docker-compose -f docker-compose.timescaledb.yml up -d --build
```

### psql 常用命令 / psql Common Commands

```sql
-- 列出所有表
-- List all tables
\dt

-- 描述表结构
-- Describe table structure
\d container_status_events

-- 查看扩展
-- View extensions
\dx

-- 退出
-- Quit
\q
```

### TimescaleDB 特定命令 / TimescaleDB Specific Commands

```sql
-- 查看超表
-- View hypertables
SELECT * FROM timescaledb_information.hypertables;

-- 查看连续聚合
-- View continuous aggregates
SELECT * FROM timescaledb_information.continuous_aggregates;

-- 查看压缩统计
-- View compression statistics
SELECT * FROM timescaledb_information.chunks;

-- 手动压缩数据
-- Manually compress data
SELECT compress_chunk(chunk_schema, chunk_name)
FROM timescaledb_information.chunks
WHERE hypertable_name = 'container_status_events'
  AND compressed = false;
```

---

## 📊 监控和可视化 / Monitoring and Visualization

### Grafana 仪表板 / Grafana Dashboards

访问 Grafana: http://localhost:3000 (admin/admin)

Access Grafana: http://localhost:3000 (admin/admin)

#### 预配置仪表板 / Pre-configured Dashboards

1. **TimescaleDB Overview** - 数据库概览
2. **Container Tracking** - 货柜追踪统计
3. **Port Operations** - 港口操作分析
4. **Logistics Performance** - 物流性能指标

### Prometheus 指标 / Prometheus Metrics

访问 Prometheus: http://localhost:9090

Access Prometheus: http://localhost:9090

#### 关键指标 / Key Metrics

- `pg_stat_database_tup_returned` - 数据返回行数
- `pg_stat_database_tup_inserted` - 插入行数
- `pg_stat_database_tup_updated` - 更新行数
- `timescaledb_compression_stats` - 压缩统计
- `timescaledb_retention_stats` - 保留统计

---

## 💡 最佳实践 / Best Practices

### 1. 查询优化 / Query Optimization

```sql
-- ✅ 好的做法：使用时间范围过滤
-- Good practice: Use time range filtering
SELECT *
FROM container_status_events
WHERE occurred_at > NOW() - INTERVAL '7 days'
  AND container_number = 'CNTR1234567'
ORDER BY occurred_at DESC;

-- ❌ 避免：无时间范围的全表扫描
-- Avoid: Full table scan without time range
SELECT *
FROM container_status_events
WHERE container_number = 'CNTR1234567';
```

### 2. 批量插入 / Batch Inserts

```sql
-- ✅ 好的做法：批量插入
-- Good practice: Batch insert
INSERT INTO container_status_events (id, container_number, status_code, occurred_at, ...)
VALUES
  ('E001', 'CNTR001', 'ARVD', '2024-02-24 10:00:00', ...),
  ('E002', 'CNTR001', 'DICH', '2024-02-24 11:00:00', ...),
  ('E003', 'CNTR002', 'ARVD', '2024-02-24 12:00:00', ...);

-- ❌ 避免：单条插入
-- Avoid: Single row insert
INSERT INTO container_status_events VALUES ('E001', ...);
INSERT INTO container_status_events VALUES ('E002', ...);
```

### 3. 使用连续聚合视图 / Use Continuous Aggregates

```sql
-- ✅ 好的做法：查询预聚合视图
-- Good practice: Query pre-aggregated view
SELECT bucket, container_number, SUM(event_count)
FROM container_status_daily_stats
WHERE bucket > NOW() - INTERVAL '30 days'
GROUP BY bucket, container_number;

-- ❌ 避免：实时聚合大量数据
-- Avoid: Real-time aggregation on large data
SELECT
    date_trunc('day', occurred_at) AS bucket,
    container_number,
    COUNT(*) AS event_count
FROM container_status_events
WHERE occurred_at > NOW() - INTERVAL '30 days'
GROUP BY bucket, container_number;
```

### 4. 监控压缩效果 / Monitor Compression Effectiveness

```sql
-- 定期检查压缩统计
-- Regularly check compression statistics
SELECT
    hypertable_name,
    total_chunks,
    compressed_chunks,
    ROUND((compressed_chunks::NUMERIC / total_chunks) * 100, 2) AS compression_pct
FROM (
    SELECT
        h.hypertable_name,
        COUNT(*) AS total_chunks,
        COUNT(*) FILTER (WHERE c.compressed = true) AS compressed_chunks
    FROM timescaledb_information.hypertables h
    JOIN timescaledb_information.chunks c ON c.hypertable_name = h.hypertable_name
    GROUP BY h.hypertable_name
) stats;
```

---

## 🔧 故障排查 / Troubleshooting

### 问题 1: 容器启动失败 / Issue 1: Container Fails to Start

```cmd
# 查看详细日志
# View detailed logs
docker-compose -f docker-compose.timescaledb.yml logs postgres

# 常见原因：
# Common causes:
# 1. 端口冲突 - 检查 5432, 3001, 6379 端口是否被占用
# 2. 内存不足 - 关闭其他应用释放内存
# 3. 磁盘空间不足 - 清理 Docker 数据
```

### 问题 2: 查询性能慢 / Issue 2: Slow Query Performance

```sql
-- 检查索引使用情况
-- Check index usage
SELECT * FROM pg_stat_user_indexes
WHERE idx_scan < 100;  -- 很少使用的索引

-- 检查查询计划
-- Check query plan
EXPLAIN ANALYZE
SELECT * FROM container_status_events
WHERE occurred_at > NOW() - INTERVAL '7 days';

-- 常见解决方案：
# Common solutions:
# 1. 确保查询包含时间范围过滤
# 2. 使用适当的索引
# 3. 考虑使用连续聚合视图
```

### 问题 3: 压缩不工作 / Issue 3: Compression Not Working

```sql
-- 检查压缩策略
-- Check compression policy
SELECT * FROM timescaledb_information.jobs
WHERE proc_name = 'policy_compression';

-- 手动触发压缩
# Manually trigger compression
SELECT compress_chunk(chunk_schema, chunk_name)
FROM timescaledb_information.chunks
WHERE hypertable_name = 'container_status_events'
  AND range_end < NOW() - INTERVAL '30 days'
  AND compressed = false;
```

### 问题 4: 数据未自动删除 / Issue 4: Data Not Auto-Deleted

```sql
-- 检查保留策略
-- Check retention policy
SELECT * FROM timescaledb_information.jobs
WHERE proc_name = 'policy_retention';

-- 检查作业执行状态
-- Check job execution status
SELECT * FROM timescaledb_information.job_stats;
```

---

## ⚡ 性能调优 / Performance Tuning

### PostgreSQL 配置 / PostgreSQL Configuration

编辑 `docker-compose.timescaledb.yml` 中的数据库配置:

Edit database configuration in `docker-compose.timescaledb.yml`:

```yaml
postgres:
  command: >
    postgres
    -c shared_buffers=1GB           # 共享缓冲区 / Shared buffers
    -c effective_cache_size=3GB      # 有效缓存 / Effective cache
    -c maintenance_work_mem=256MB    # 维护工作内存 / Maintenance work mem
    -c max_worker_processes=8        # 最大工作进程 / Max workers
    -c max_parallel_workers_per_gather=4  # 并行工作进程 / Parallel workers
    -c work_mem=4MB                  # 工作内存 / Work mem
    -c checkpoint_completion_target=0.9
    -c wal_buffers=16MB
```

### TimescaleDB 性能调优 / TimescaleDB Performance Tuning

```sql
-- 调整分块大小
-- Adjust chunk size
SELECT set_chunk_time_interval('container_status_events', INTERVAL '1 day');

-- 调整压缩策略
-- Adjust compression policy
SELECT alter_compression_policy(
    'container_status_events',
    INTERVAL '14 days'  -- 压缩 14 天前的数据
);

-- 调整保留策略
-- Adjust retention policy
SELECT alter_retention_policy(
    'container_status_events',
    INTERVAL '365 days'  -- 保留 365 天数据
);
```

### 监控慢查询 / Monitor Slow Queries

```sql
-- 启用慢查询日志
# Enable slow query log
ALTER DATABASE logix_db SET log_min_duration_statement = 1000;  -- 1秒

-- 查看慢查询
-- View slow queries
SELECT
    query,
    calls,
    total_time,
    mean_time,
    max_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

---

## 📚 相关资源 / Related Resources

- [TimescaleDB 官方文档](https://docs.timescale.com/)
- [TimescaleDB 教程](https://docs.timescale.com/tutorials/latest/)
- [PostgreSQL 性能调优](https://wiki.postgresql.org/wiki/Performance_Optimization)
- [LogiX 主文档](./README.md)
- [Docker 快速参考](./DOCKER_QUICK_REFERENCE.md)

---

## 🎓 下一步 / Next Steps

1. ✅ 启动开发环境：`tsdb-start`
2. 📊 查看 Grafana 仪表板：http://localhost:3000
3. 🔍 探索预聚合视图：`container_status_daily_stats`
4. 🚀 开始应用集成：修改后端代码使用 TimescaleDB
5. 📈 配置监控和告警：设置 Prometheus + Grafana

---

## ❓ 获取帮助 / Get Help

如遇问题，请：

If you encounter issues:

1. 查看日志：`tsdb-logs`
2. 检查状态：`tsdb-info`
3. 查看故障排查部分
4. 提交 Issue 到项目仓库

---

**版本 / Version**: 1.0.0
**最后更新 / Last Updated**: 2024-02-24
