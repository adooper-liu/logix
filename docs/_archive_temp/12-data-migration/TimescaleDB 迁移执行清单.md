# TimescaleDB 迁移执行清单

**版本**: v2.0  
**执行日期**: ******\_\_\_******  
**执行人**: ******\_\_\_******  
**监督人**: ******\_\_\_******

---

## 📋 **阶段 1: 准备工作（执行前 1 天）**

### 1.1 团队确认

- [ ] 已阅读并理解 `docs/TimescaleDB 迁移最终方案.md`
- [ ] 已确认所有决策点：
  - ✅ 删除主键，改用唯一索引（方案 A）
  - ✅ 使用 COALESCE 填充 NULL 值（方案 A）
  - ✅ 删除外键，改用逻辑外键（方案 A）
  - ✅ 业务低峰期执行
- [ ] 已指定执行人员和监督人员
- [ ] 已通知相关团队和干系人

### 1.2 环境检查

- [ ] 数据库运行正常

  ```bash
  docker ps | grep logix-timescaledb-prod
  ```

- [ ] 检查磁盘空间

  ```bash
  docker exec logix-timescaledb-prod df -h
  ```

- [ ] 检查当前表数量
  ```bash
  docker exec -i logix-timescaledb-prod psql -U logix_user -d logix_db -c "SELECT COUNT(*) FROM ext_container_status_events;"
  docker exec -i logix-timescaledb-prod psql -U logix_user -d logix_db -c "SELECT COUNT(*) FROM process_port_operations;"
  docker exec -i logix-timescaledb-prod psql -U logix_user -d logix_db -c "SELECT COUNT(*) FROM process_sea_freight;"
  docker exec -i logix-timescaledb-prod psql -U logix_user -d logix_db -c "SELECT COUNT(*) FROM sys_data_change_log;"
  ```

### 1.3 备份策略

- [ ] 准备备份存储位置（确保有足够空间）

  ```bash
  mkdir D:\backups\timescaledb_migration
  cd D:\backups\timescaledb_migration
  ```

- [ ] 测试备份命令

  ```bash
  docker exec logix-timescaledb-prod pg_dump -U logix_user logix_db > test_backup.sql
  ```

- [ ] 验证备份文件
  ```bash
  ls -lh test_backup.sql
  ```

---

## ⏰ **阶段 2: 执行日准备（执行前 2 小时）**

### 2.1 最终确认

- [ ] 确认所有应用已停止

  ```bash
  # 检查后端进程
  Get-Process -Name node -ErrorAction SilentlyContinue

  # 检查 Docker 容器
  docker ps --filter "name=logix-backend"
  ```

- [ ] 确认没有活跃连接

  ```bash
  docker exec -i logix-timescaledb-prod psql -U logix_user -d logix_db -c "
  SELECT count(*) as active_connections
  FROM pg_stat_activity
  WHERE datname = 'logix_db' AND pid <> pg_backend_pid();
  "
  ```

- [ ] 通知团队即将开始迁移

### 2.2 完整备份

- [ ] 执行完整备份

  ```bash
  $TIMESTAMP = Get-Date -Format "yyyyMMdd_HHmmss"
  $BACKUP_FILE = "D:\backups\timescaledb_migration\backup_full_$TIMESTAMP.sql"
  docker exec logix-timescaledb-prod pg_dump -U logix_user logix_db > $BACKUP_FILE
  ```

- [ ] 备份 schema

  ```bash
  $SCHEMA_FILE = "D:\backups\timescaledb_migration\backup_schema_$TIMESTAMP.sql"
  docker exec logix-timescaledb-prod pg_dump -U logix_user logix_db --schema-only > $SCHEMA_FILE
  ```

- [ ] 导出外键定义

  ```bash
  $FK_FILE = "D:\backups\timescaledb_migration\backup_fk_$TIMESTAMP.txt"
  docker exec -i logix-timescaledb-prod psql -U logix_user -d logix_db -c "
  SELECT conname, pg_get_constraintdef(oid)
  FROM pg_constraint
  WHERE contype = 'f';
  " > $FK_FILE
  ```

- [ ] 验证备份文件完整性

  ```bash
  Get-ChildItem D:\backups\timescaledb_migration\backup_*_$TIMESTAMP.* | Format-Table Name, Length, LastWriteTime
  ```

- [ ] 复制备份到安全位置（建议异地备份）

---

## 🚀 **阶段 3: 执行迁移（预计 30-60 分钟）**

### 3.1 执行主迁移脚本

- [ ] 方式 1: 使用 PowerShell 管道（推荐）

  ```powershell
  Get-Content migrations\execute-hypertable-migration.sql | docker exec -i logix-timescaledb-prod psql -U logix_user -d logix_db
  ```

- [ ] 方式 2: 复制到容器执行

  ```powershell
  docker cp migrations\execute-hypertable-migration.sql logix-timescaledb-prod:/tmp/migrate.sql
  docker exec -i logix-timescaledb-prod psql -U logix_user -d logix_db -f /tmp/migrate.sql
  ```

- [ ] 记录执行开始时间：****\_\_\_****
- [ ] 记录执行完成时间：****\_\_\_****
- [ ] 记录任何错误或警告

### 3.2 验证执行结果

- [ ] 检查 hypertables 列表

  ```bash
  docker exec -i logix-timescaledb-prod psql -U logix_user -d logix_db -c "
  SELECT hypertable_name, num_dimensions
  FROM timescaledb_information.hypertables
  ORDER BY hypertable_name;
  "
  ```

- [ ] 预期输出：4 个 hypertable
  - ext_container_status_events
  - process_port_operations
  - process_sea_freight
  - sys_data_change_log

- [ ] 检查数据量（应该与迁移前一致）

  ```bash
  docker exec -i logix-timescaledb-prod psql -U logix_user -d logix_db -c "
  SELECT 'ext_container_status_events' AS t, COUNT(*) FROM ext_container_status_events
  UNION ALL SELECT 'process_port_operations', COUNT(*) FROM process_port_operations
  UNION ALL SELECT 'process_sea_freight', COUNT(*) FROM process_sea_freight
  UNION ALL SELECT 'sys_data_change_log', COUNT(*) FROM sys_data_change_log;
  "
  ```

- [ ] 检查压缩策略
  ```bash
  docker exec -i logix-timescaledb-prod psql -U logix_user -d logix_db -c "\x"
  docker exec -i logix-timescaledb-prod psql -U logix_user -d logix_db -c "SELECT * FROM timescaledb_information.compression_settings;"
  ```

---

## 🧪 **阶段 4: 应用层测试**

### 4.1 基本功能测试

- [ ] 启动后端服务

  ```powershell
  .\start-logix-dev.ps1
  ```

- [ ] 测试 API 端点

  ```bash
  # 测试货柜查询
  curl http://localhost:3001/api/containers

  # 测试状态事件查询
  curl http://localhost:3001/api/container-status-events

  # 测试港口操作查询
  curl http://localhost:3001/api/port-operations
  ```

- [ ] 检查日志无错误
  ```bash
  Get-Content backend\logs\*.log -Tail 50
  ```

### 4.2 数据库操作测试

- [ ] INSERT 操作测试

  ```sql
  -- 测试插入新记录
  INSERT INTO ext_container_status_events (container_number, status_code, occurred_at)
  VALUES ('TEST123', 'TEST', NOW())
  RETURNING id;
  ```

- [ ] UPDATE 操作测试

  ```sql
  UPDATE ext_container_status_events
  SET status_code = 'UPDATED'
  WHERE container_number = 'TEST123';
  ```

- [ ] DELETE 操作测试

  ```sql
  DELETE FROM ext_container_status_events
  WHERE container_number = 'TEST123';
  ```

- [ ] 复杂查询测试

  ```sql
  -- 测试时间范围查询
  SELECT COUNT(*)
  FROM ext_container_status_events
  WHERE occurred_at >= NOW() - INTERVAL '7 days';

  -- 测试聚合查询
  SELECT
      date_trunc('day', occurred_at) AS day,
      COUNT(*) AS event_count
  FROM ext_container_status_events
  GROUP BY 1
  ORDER BY 1 DESC
  LIMIT 10;
  ```

### 4.3 ON CONFLICT 语法测试

- [ ] 测试 UPSERT 操作
  ```sql
  INSERT INTO ext_container_status_events (id, container_number, status_code, occurred_at)
  VALUES (99999, 'TEST456', 'TEST', NOW())
  ON CONFLICT ON CONSTRAINT idx_ext_container_status_events_id
  DO UPDATE SET status_code = EXCLUDED.status_code;
  ```

---

## 📊 **阶段 5: 性能验证**

### 5.1 查询性能对比

- [ ] 执行性能测试查询

  ```sql
  -- 测试 1: 时间范围查询（应该有显著提升）
  EXPLAIN ANALYZE
  SELECT * FROM ext_container_status_events
  WHERE occurred_at >= NOW() - INTERVAL '30 days'
  ORDER BY occurred_at DESC
  LIMIT 100;

  -- 记录执行时间：_______ ms

  -- 测试 2: 聚合查询（应该有显著提升）
  EXPLAIN ANALYZE
  SELECT
      date_trunc('hour', occurred_at) AS hour,
      COUNT(*) AS cnt
  FROM ext_container_status_events
  WHERE occurred_at >= NOW() - INTERVAL '7 days'
  GROUP BY 1
  ORDER BY 1;

  -- 记录执行时间：_______ ms
  ```

- [ ] 对比迁移前的性能数据（如果有）

### 5.2 存储空间检查

- [ ] 检查表大小
  ```sql
  SELECT
      relname AS table_name,
      pg_size_pretty(pg_total_relation_size(relid)) AS total_size
  FROM pg_catalog.pg_statio_user_tables
  WHERE relname IN (
      'ext_container_status_events',
      'process_port_operations',
      'process_sea_freight',
      'sys_data_change_log'
  )
  ORDER BY pg_total_relation_size(relid) DESC;
  ```

---

## ✅ **阶段 6: 验收和监控**

### 6.1 最终验收

- [ ] 所有 4 个表已成功转换为 hypertable
- [ ] 主键问题已解决（使用唯一索引）
- [ ] 压缩策略已配置（30 天）
- [ ] 保留策略已配置（1 年）
- [ ] 所有测试通过
- [ ] 性能有提升或至少持平
- [ ] 应用运行正常

### 6.2 设置监控

- [ ] 添加 Grafana 监控面板
  - hypertable 大小趋势
  - 压缩任务执行情况
  - retention policy 执行情况
  - 查询性能指标

- [ ] 设置告警规则
  - 压缩失败告警
  - 存储空间不足告警
  - 查询性能下降告警

### 6.3 文档更新

- [ ] 更新数据库架构图
- [ ] 记录实际执行时间
- [ ] 记录遇到的问题和解决方案
- [ ] 更新性能基准数据

---

## 🎯 **成功标准**

迁移被认为成功，当且仅当满足以下所有条件：

- ✅ 所有 4 个 hypertable 创建成功
- ✅ 数据零丢失（行数一致）
- ✅ 应用功能正常（所有测试通过）
- ✅ 查询性能有提升（平均提升 20%+）
- ✅ 存储空间有优化（压缩率 80%+）
- ✅ 团队接受新的数据模型（无主键，逻辑外键）

---

## 📞 **紧急联系人**

| 角色       | 姓名       | 联系方式   |
| ---------- | ---------- | ---------- |
| 执行负责人 | **\_\_\_** | **\_\_\_** |
| 技术负责人 | **\_\_\_** | **\_\_\_** |
| DBA 支持   | **\_\_\_** | **\_\_\_** |
| 业务负责人 | **\_\_\_** | **\_\_\_** |

---

## 🔄 **回滚计划（仅在严重问题时执行）**

如果迁移后出现严重问题：

1. **立即停止所有应用**

   ```powershell
   .\stop-logix-dev.ps1
   ```

2. **评估问题严重程度**
   - 轻微问题 → 尝试修复
   - 严重问题 → 执行回滚

3. **执行回滚（最后手段）**

   ```bash
   # 最安全的回滚方式：从备份恢复
   $BACKUP_FILE = "D:\backups\timescaledb_migration\backup_full_YYYYMMDD_HHMMSS.sql"
   docker exec -i logix-timescaledb-prod psql -U logix_user -d logix_db < $BACKUP_FILE
   ```

4. **通知团队回滚完成**

---

## 📝 **执行总结**

### 执行情况

- 执行开始时间：******\_\_\_******
- 执行完成时间：******\_\_\_******
- 总耗时：******\_\_\_******
- 参与人员：******\_\_\_******

### 遇到的问题

1. ***
   - 解决方案：******\_\_\_******

2. ***
   - 解决方案：******\_\_\_******

### 性能提升

| 查询类型     | 迁移前 (ms) | 迁移后 (ms) | 提升    |
| ------------ | ----------- | ----------- | ------- |
| 时间范围查询 | **\_**      | **\_**      | \_\_\_% |
| 聚合统计     | **\_**      | **\_**      | \_\_\_% |
| 最新 N 条    | **\_**      | **\_**      | \_\_\_% |

### 存储优化

| 表                          | 迁移前 | 迁移后 | 压缩率  |
| --------------------------- | ------ | ------ | ------- |
| ext_container_status_events | **\_** | **\_** | \_\_\_% |
| process_port_operations     | **\_** | **\_** | \_\_\_% |
| process_sea_freight         | **\_** | **\_** | \_\_\_% |
| sys_data_change_log         | **\_** | **\_** | \_\_\_% |

### 经验教训

- 做得好的地方：******\_\_\_******
- 需要改进的地方：******\_\_\_******
- 下次建议：******\_\_\_******

---

**执行人签名**: ******\_\_\_******  
**日期**: ******\_\_\_******  
**监督人签名**: ******\_\_\_******

---

**文档版本**: v2.0  
**模板维护**: AI Development Team
