# TimescaleDB 测试操作指南

**最后更新**: 2026-03-24  
**适用范围**: 开发环境测试验证  

---

## 前置条件

1. Docker 容器正常运行
```powershell
docker ps | Select-String "logix"
```

2. 后端服务已启动
```powershell
curl http://localhost:3001/health
```

3. 数据库有测试数据
```powershell
docker exec -i logix-timescaledb-prod psql -U logix_user -d logix_db -c "SELECT COUNT(*) FROM biz_containers;"
```

---

## 测试步骤

### 1. API 查询测试

**单箱查询**:
```powershell
curl -s "http://localhost:3001/api/v1/containers/ECMU5400183" | ConvertFrom-Json | Select-Object containerNumber, logisticsStatus, lastFreeDate
```

**期望输出**:
```
containerNumber : ECMU5400183
logisticsStatus : returned_empty
lastFreeDate    : 2026-02-17
```

**批量查询**:
```powershell
curl -s "http://localhost:3001/api/v1/containers?limit=10" | ConvertFrom-Json
```

**验证要点**:
- `success` 字段为 `true`
- `items` 数组包含数据
- `pagination.total` 显示正确总数

---

### 2. hypertable 验证

**检查 hypertable 状态**:
```powershell
docker exec -i logix-timescaledb-prod psql -U logix_user -d logix_db -c "
SELECT hypertable_name, num_dimensions 
FROM timescaledb_information.hypertables 
ORDER BY hypertable_name;
"
```

**期望结果**:
```
       hypertable_name       | num_dimensions 
-----------------------------+----------------
 ext_container_status_events |              1
 process_port_operations     |              1
 process_sea_freight         |              1
 sys_data_change_log         |              1
(4 rows)
```

**说明**:
- 4 个表都应该是 hypertable
- `num_dimensions = 1` 表示按时间维度分区

---

### 3. 数据完整性验证

**查询货柜总数**:
```powershell
docker exec -i logix-timescaledb-prod psql -U logix_user -d logix_db -c "SELECT COUNT(*) FROM biz_containers;"
```

**查询状态事件总数**:
```powershell
docker exec -i logix-timescaledb-prod psql -U logix_user -d logix_db -c "SELECT COUNT(*) FROM ext_container_status_events;"
```

**验证标准**:
- `biz_containers`: 至少 5 条记录
- `ext_container_status_events`: 至少 49 条记录
- 数据量与迁移前一致（对比迁移成功报告）

---

### 4. 性能测试

**查询最近 7 天数据**:
```powershell
docker exec -i logix-timescaledb-prod psql -U logix_user -d logix_db -c "
EXPLAIN ANALYZE
SELECT COUNT(*) 
FROM ext_container_status_events
WHERE occurred_at >= NOW() - INTERVAL '7 days';
"
```

**性能指标**:
- Execution Time < 5ms: ✅ 优秀
- Execution Time 5-20ms: 🟡 正常
- Execution Time > 20ms: ⚠️ 需要优化

---

## 常见问题

### 问题 1: API 返回 "Container not found"

**原因**:
1. 箱号输入错误
2. 数据库无此箱号数据

**解决**:
```powershell
# 验证箱号是否存在
docker exec -i logix-timescaledb-prod psql -U logix_user -d logix_db -c "
SELECT container_number FROM biz_containers 
WHERE container_number = 'ECMU5400183';
"
```

---

### 问题 2: 连接超时

**原因**: 后端服务未启动

**解决**:
```powershell
.\start-logix-dev.ps1
```

---

### 问题 3: hypertable 验证失败

**现象**: 查询结果为空

**原因**: 表不是 hypertable

**解决**: 参考 [TimescaleDB 迁移执行清单](./TimescaleDB 迁移执行清单.md) 重新执行迁移

---

## 参考文档

- [TimescaleDB 迁移成功报告](./TimescaleDB 迁移成功报告.md)
- [TimescaleDB 迁移执行清单](./TimescaleDB 迁移执行清单.md)
- [TimescaleDB 测试速查卡](./TimescaleDB 测试速查卡.md)
