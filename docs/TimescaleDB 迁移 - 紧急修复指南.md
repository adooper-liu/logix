# TimescaleDB 迁移 - 紧急修复指南

**创建时间**: 2026-03-21  
**问题级别**: 🔴 严重  
**状态**: 执行失败，需要修复

---

## 🚨 **问题总结**

### 执行过程中发现的致命错误

| 问题 | 现象 | 根本原因 | 解决方案 |
|------|------|---------|---------|
| **1. 字段不存在** | `ERROR: column "port_arrival_date" does not exist` | COALESCE 使用了不存在的字段 | ✅ 已修正为使用实际存在的字段 |
| **2. 唯一索引冲突** | `ERROR: cannot create a unique index without the column` | TimescaleDB 不允许不包含分区列的唯一索引 | ✅ 已删除所有唯一索引 |
| **3. NULL 值未填充** | `ERROR: column "ata" contains null values` | COALESCE 逻辑没有成功更新 NULL 值 | ⚠️ 需要手动检查和填充 |
| **4. 压缩策略失败** | `ERROR: unrecognized parameter namespace "timescaledb"` | TimescaleDB 配置参数问题或版本不兼容 | ❌ 待解决 |

---

## 🔧 **立即修复步骤**

### Step 1: 清理当前失败状态

```sql
-- 连接到数据库
docker exec -i logix-timescaledb-prod psql -U logix_user -d logix_db <<'EOF'

-- 1. 检查当前 hypertable 状态
SELECT * FROM timescaledb_information.hypertables;

-- 2. 如果有任何部分创建的 hypertable，删除它们
-- 注意：这可能需要先删除所有相关索引和约束

-- 3. 恢复普通表结构（如果可能）
-- 最安全的方式是从备份恢复
EOF
```

### Step 2: 从备份恢复（推荐）

```bash
# 找到最近的备份
Get-ChildItem D:\backups\timescaledb_migration\backup_full_*.sql | Sort-Object LastWriteTime -Descending | Select-Object -First 1

# 恢复数据库
$BACKUP_FILE = "D:\backups\timescaledb_migration\backup_full_YYYYMMDD_HHMMSS.sql"
Get-Content $BACKUP_FILE | docker exec -i logix-timescaledb-prod psql -U logix_user -d logix_db
```

### Step 3: 修正后的执行脚本

使用修正后的脚本：`migrations/execute-hypertable-migration-fixed.sql`

主要修正：
1. ✅ 删除所有唯一索引（不只是主键）
2. ✅ 使用正确的字段名填充 NULL 值
3. ✅ 转换后添加普通索引而非唯一索引
4. ⚠️ 压缩策略语法待确认

---

## 📋 **详细问题诊断**

### 问题 1: COALESCE 字段不存在

**错误 SQL**:
```sql
UPDATE process_port_operations 
SET ata = COALESCE(ata, eta, etd, port_arrival_date, NOW()) 
WHERE ata IS NULL;
```

**实际表结构**（通过 `\d process_port_operations` 验证）:
```sql
eta                    | timestamp with time zone
ata                    | timestamp with time zone
revised_eta            | timestamp with time zone
dest_port_unload_date  | timestamp without time zone
etd                    | timestamp with time zone
-- 没有 port_arrival_date 字段！
```

**修正**:
```sql
UPDATE process_port_operations 
SET ata = COALESCE(ata, eta, etd, revised_eta, dest_port_unload_date, NOW()) 
WHERE ata IS NULL;
```

---

### 问题 2: 唯一索引与分区列冲突

**TimescaleDB 规则**:
> Hypertable 上的所有唯一索引必须包含时间分区列

**当前索引**（ext_container_status_events）:
```sql
idx_ext_container_status_events_id UNIQUE, btree (id)
-- ❌ 不包含 occurred_at，违反 TimescaleDB 规则
```

**解决方案**:
```sql
-- 1. 删除唯一索引
DROP INDEX IF EXISTS idx_ext_container_status_events_id;

-- 2. 转换为 hypertable（成功后）
SELECT create_hypertable('ext_container_status_events', 'occurred_at');

-- 3. 添加普通索引（非唯一）
CREATE INDEX idx_ext_container_status_events_id 
ON ext_container_status_events(id);
```

---

### 问题 3: NULL 值未正确填充

**检查剩余 NULL 值**:
```sql
SELECT COUNT(*) FROM process_port_operations WHERE ata IS NULL;
-- 结果：5 条记录仍然为 NULL
```

**手动填充这些记录**:
```sql
-- 查看具体是哪些记录
SELECT id, container_number, port_code, eta, etd, ata 
FROM process_port_operations 
WHERE ata IS NULL;

-- 手动填充（根据业务逻辑选择合适的值）
UPDATE process_port_operations 
SET ata = COALESCE(eta, etd, revised_eta, NOW()) 
WHERE ata IS NULL;

-- 再次验证
SELECT COUNT(*) FROM process_port_operations WHERE ata IS NULL;
-- 应该返回 0
```

---

### 问题 4: 压缩策略语法错误

**原脚本**:
```sql
ALTER TABLE ext_container_status_events SET (timescaledb.compress = true);
```

**错误**:
```
ERROR: unrecognized parameter namespace "timescaledb"
```

**可能的原因**:
1. TimescaleDB 版本变更导致语法变化
2. 需要先启用扩展的某些功能
3. 配置参数名称已更改

**待调查**:
```sql
-- 检查 TimescaleDB 配置
SHOW timescaledb.enable_telemetry;

-- 查看可用的配置参数
SELECT * FROM pg_settings WHERE name LIKE '%timescaledb%';

-- 检查压缩功能是否可用
SELECT * FROM timescaledb_information.compression_settings;
```

---

## ⚠️ **回滚方案（最后手段）**

如果无法修复，执行回滚：

```bash
# 1. 停止所有应用
.\stop-logix-dev.ps1

# 2. 从备份恢复
$BACKUP_FILE = "D:\backups\timescaledb_migration\backup_full_$(date +%Y%m%d_%H%M%S).sql"
Get-Content $BACKUP_FILE | docker exec -i logix-timescaledb-prod psql -U logix_user -d logix_db

# 3. 验证恢复成功
docker exec -i logix-timescaledb-prod psql -U logix_user -d logix_db -c "\dt"

# 4. 重启应用
.\start-logix-dev.ps1
```

---

## 🎯 **下一步行动**

### 立即执行（按优先级）

1. **✅ 已完成**: 修正 COALESCE 字段错误
2. **✅ 已完成**: 删除所有唯一索引
3. **⏳ 待执行**: 手动填充剩余的 NULL 值
4. **⏳ 待执行**: 重新执行迁移脚本
5. **❓ 待调查**: 压缩策略语法问题

### 调查任务

- [ ] 确认 TimescaleDB 2.15.1 的压缩策略正确语法
- [ ] 检查是否有其他配置问题
- [ ] 验证所有表的字段名称

---

## 📞 **需要的支持**

如需帮助，请提供以下信息：

1. 完整的错误输出日志
2. 当前数据库状态：
   ```sql
   SELECT * FROM timescaledb_information.hypertables;
   \d ext_container_status_events
   \d process_port_operations
   ```
3. 备份文件位置
4. 已尝试的修复步骤

---

## 📝 **经验教训**

### 下次应该做的改进

1. **更详细的预检查**:
   - 执行前验证所有字段名称
   - 检查所有唯一索引
   - 测试 COALESCE 逻辑

2. **分步执行**:
   - 不要一键执行所有步骤
   - 每个步骤后暂停验证
   - 提供手动确认点

3. **更好的错误处理**:
   - 使用事务包装
   - 遇到错误自动回滚
   - 提供更详细的错误定位

4. **文档更新**:
   - 记录所有假设
   - 标注潜在风险点
   - 提供多个备选方案

---

**维护人**: AI Development Team  
**最后更新**: 2026-03-21  
**状态**: 等待进一步指示
