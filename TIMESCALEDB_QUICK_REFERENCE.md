# TimescaleDB 快速参考 / TimescaleDB Quick Reference

## 🚀 快速命令 / Quick Commands

### 启动和停止 / Start and Stop
```cmd
tsdb-start      # 启动开发环境 / Start dev environment
tsdb-stop       # 停止开发环境 / Stop dev environment
tsdb-restart    # 重启服务 / Restart services
```

### 日志和监控 / Logs and Monitoring
```cmd
tsdb-logs       # 查看所有日志 / View all logs
tsdb-logs postgres  # 查看 PostgreSQL 日志
tsdb-info       # 查看统计信息 / View statistics
```

### 数据库操作 / Database Operations
```cmd
tsdb-db         # 进入数据库 / Enter database
```

### 清理 / Cleanup
```cmd
tsdb-clean      # 删除所有数据 / Delete all data (危险 / DANGEROUS!)
```

---

## 📊 常用 SQL 查询 / Common SQL Queries

### 查询货柜状态 / Query Container Status
```sql
-- 获取货柜最新状态
SELECT * FROM get_latest_container_status('CNTR1234567');

-- 获取货柜完整时间线
SELECT * FROM get_container_timeline('CNTR1234567');

-- 查询指定时间段的状态事件
SELECT * FROM container_status_events
WHERE container_number = 'CNTR1234567'
  AND occurred_at > NOW() - INTERVAL '7 days'
ORDER BY occurred_at DESC;
```

### 查询港口操作 / Query Port Operations
```sql
-- 获取货柜港口停留时间
SELECT * FROM calculate_container_dwell_time('CNTR1234567');

-- 查询最近到港的货柜
SELECT po.container_number, po.port_name, po.ata_dest_port
FROM process_port_operations po
WHERE po.ata_dest_port > NOW() - INTERVAL '3 days'
  AND po.port_type = 'destination'
ORDER BY po.ata_dest_port DESC;
```

### 查询统计信息 / Query Statistics
```sql
-- 每日状态事件统计
SELECT * FROM container_status_daily_stats
WHERE bucket > NOW() - INTERVAL '7 days'
ORDER BY bucket DESC;

-- 每日港口操作统计
SELECT * FROM port_operations_daily_stats
WHERE bucket > NOW() - INTERVAL '30 days'
ORDER BY bucket DESC;
```

---

## 🛠️ 维护命令 / Maintenance Commands

### 查看压缩统计 / View Compression Statistics
```sql
SELECT
    hypertable_name,
    COUNT(*) AS total_chunks,
    COUNT(*) FILTER (WHERE compressed = true) AS compressed,
    ROUND((COUNT(*) FILTER (WHERE compressed = true)::NUMERIC / COUNT(*)::NUMERIC * 100), 2) AS compression_pct
FROM timescaledb_information.chunks
GROUP BY hypertable_name;
```

### 手动压缩数据 / Manually Compress Data
```sql
SELECT compress_chunk(chunk_schema, chunk_name)
FROM timescaledb_information.chunks
WHERE hypertable_name = 'container_status_events'
  AND range_end < NOW() - INTERVAL '30 days'
  AND compressed = false;
```

### 调整压缩策略 / Adjust Compression Policy
```sql
SELECT alter_compression_policy(
    'container_status_events',
    INTERVAL '14 days'
);
```

### 调整保留策略 / Adjust Retention Policy
```sql
SELECT alter_retention_policy(
    'container_status_events',
    INTERVAL '365 days'
);
```

---

## 📈 监控和告警 / Monitoring and Alerting

### 访问监控面板 / Access Monitoring Dashboards

- **Grafana**: http://localhost:3000 (admin/admin)
- **Prometheus**: http://localhost:9090

### 关键指标 / Key Metrics

1. **数据库连接数**: `pg_stat_database.numbackends`
2. **慢查询**: `pg_stat_statements.mean_time`
3. **压缩率**: TimescaleDB compression statistics
4. **数据保留**: Retention policy execution

---

## 🔧 故障排查 / Troubleshooting

### 查看日志 / View Logs
```cmd
# 查看所有日志
tsdb-logs

# 查看特定服务日志
tsdb-logs postgres
tsdb-logs backend
tsdb-logs grafana
```

### 检查服务状态 / Check Service Status
```cmd
docker-compose -f docker-compose.timescaledb.yml ps
```

### 查看资源使用 / View Resource Usage
```cmd
# 查看容器资源使用
docker stats --filter "name=logix-"

# 查看磁盘使用
docker system df -v
```

---

## 📚 文档链接 / Documentation Links

- [完整指南](./TIMESCALEDB_GUIDE.md)
- [TimescaleDB 官方文档](https://docs.timescale.com/)
- [Docker 快速参考](./DOCKER_QUICK_REFERENCE.md)
