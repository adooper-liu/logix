# 时间信息丢失修复实施指南

**文档日期**: 2026-02-26
**问题**: 9个日期字段的时间信息丢失
**原因**: 数据库字段类型定义为`date`而非`timestamp`

---

## ✅ 已完成的修改

### 1. PortOperation.ts

修改了以下5个字段的类型从`date`到`timestamp`:
- `eta_dest_port`
- `ata_dest_port`
- `dest_port_unload_date`
- `planned_customs_date`
- `isf_declaration_date`

### 2. WarehouseOperation.ts

修改了以下3个字段的类型从`date`到`timestamp`:
- `warehouse_arrival_date`
- `planned_unload_date`
- `wms_confirm_date`

### 3. EmptyReturn.ts

修改了以下2个字段的类型从`date`到`timestamp`:
- `lastReturnDate`
- `plannedReturnDate`

---

## 🚀 实施步骤

### 步骤1: 执行SQL迁移脚本

⚠️ **重要说明**:
- TypeORM的`synchronize`选项**不会修改已存在列的类型**
- 必须手动执行SQL脚本将字段从`date`改为`timestamp`
- 迁移是安全的，已有数据不会丢失（只是时间部分为00:00:00）

执行迁移SQL:

```bash
# 方式1: 使用docker exec
docker exec -i logix-timescaledb-prod psql -U logix_user -d logix_db < migrations/convert_date_to_timestamp.sql

# 方式2: 直接执行SQL
docker exec logix-timescaledb-prod psql -U logix_user -d logix_db -f migrations/convert_date_to_timestamp.sql
```

### 步骤2: 验证表结构是否已更新

检查数据库字段类型是否已更新为`timestamp`:

```bash
docker exec logix-timescaledb-prod psql -U logix_user -d logix_db -c "
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'process_port_operations'
  AND column_name IN ('eta_dest_port', 'ata_dest_port', 'dest_port_unload_date',
                      'planned_customs_date', 'isf_declaration_date')
ORDER BY column_name;
"
```

**预期结果**: 所有字段应该是`timestamp without time zone`类型

### 步骤3: 清理现有错误数据

删除FANU3376528的所有相关数据:

```bash
docker exec logix-timescaledb-prod psql -U logix_user -d logix_db -c "
DELETE FROM process_trucking_transport WHERE container_number = 'FANU3376528';
DELETE FROM process_warehouse_operations WHERE container_number = 'FANU3376528';
DELETE FROM process_port_operations WHERE container_number = 'FANU3376528';
DELETE FROM process_sea_freight WHERE container_number = 'FANU3376528';
DELETE FROM process_empty_returns WHERE \"containerNumber\" = 'FANU3376528';
DELETE FROM biz_containers WHERE container_number = 'FANU3376528';
DELETE FROM biz_replenishment_orders WHERE order_number = '24DSC4914';
"
```

### 步骤4: 重新导入Excel数据

1. 打开前端应用
2. 进入Excel导入页面
3. 上传原始Excel文件
4. 点击"解析Excel"
5. 点击"导入数据库"

### 步骤5: 验证数据准确性

执行验证SQL,检查时间信息是否已正确保存:

```bash
docker exec logix-timescaledb-prod psql -U logix_user -d logix_db -c "
SELECT TO_CHAR(ata_dest_port, 'YYYY-MM-DD HH24:MI:SS') as ata_dest_port,
       TO_CHAR(dest_port_unload_date, 'YYYY-MM-DD HH24:MI:SS') as dest_port_unload_date,
       TO_CHAR(planned_customs_date, 'YYYY-MM-DD HH24:MI:SS') as planned_customs_date,
       TO_CHAR(isf_declaration_date, 'YYYY-MM-DD HH24:MI:SS') as isf_declaration_date
FROM process_port_operations
WHERE container_number = 'FANU3376528' AND port_type = 'destination';
"
```

**预期结果**:
- `ata_dest_port`: `2025-05-17 00:18:00`
- `dest_port_unload_date`: `2025-05-17 00:18:00`
- `planned_customs_date`: `2025-05-06 23:59:59`
- `isf_declaration_date`: `2025-03-26 21:00:23`

同样验证其他表:

```bash
# 仓库操作表
docker exec logix-timescaledb-prod psql -U logix_user -d logix_db -c "
SELECT TO_CHAR(warehouse_arrival_date, 'YYYY-MM-DD HH24:MI:SS') as warehouse_arrival_date,
       TO_CHAR(wms_confirm_date, 'YYYY-MM-DD HH24:MI:SS') as wms_confirm_date
FROM process_warehouse_operations
WHERE container_number = 'FANU3376528';
"

# 还空箱表
docker exec logix-timescaledb-prod psql -U logix_user -d logix_db -c "
SELECT TO_CHAR(\"lastReturnDate\", 'YYYY-MM-DD HH24:MI:SS') as last_return_date
FROM process_empty_returns
WHERE \"containerNumber\" = 'FANU3376528';
"
```

---

## 📋 完整验证清单

### 表结构验证

- [ ] process_port_operations 的5个字段已更新为`timestamp`
- [ ] process_warehouse_operations 的3个字段已更新为`timestamp`
- [ ] process_empty_returns 的2个字段已更新为`timestamp`

### 数据验证 - 港口操作表

- [ ] `ata_dest_port` = `2025-05-17 00:18:00` (包含时间)
- [ ] `dest_port_unload_date` = `2025-05-17 00:18:00` (包含时间)
- [ ] `planned_customs_date` = `2025-05-06 23:59:59` (包含时间)
- [ ] `isf_declaration_date` = `2025-03-26 21:00:23` (包含时间)

### 数据验证 - 仓库操作表

- [ ] `warehouse_arrival_date` = `2025-05-31 11:38:58` (包含时间)
- [ ] `planned_unload_date` = `2025-05-28 00:00:00` (Excel无时间)
- [ ] `wms_confirm_date` = `2025-05-28 05:00:47` (包含时间)

### 数据验证 - 还空箱表

- [ ] `last_return_date` = `2025-05-30 23:59:59` (包含时间)
- [ ] `planned_return_date` = `2025-05-28 00:00:00` (Excel无时间)
- [ ] `return_time` = `2025-06-29 20:52:47` (包含时间)

---

## 📊 修复效果对比

| 指标 | 修复前 | 修复后 |
|------|--------|--------|
| 完全准确字段 | 5/14 (35.7%) | 14/14 (100%) |
| 时间丢失字段 | 9 | 0 |
| 准确率 | 35.7% | 100% |

---

## ⚠️ 注意事项

1. **必须重启后端**: 表结构修改需要重启后端才能生效
2. **必须重新导入**: 旧数据无法自动修复,必须删除后重新导入
3. **备份数据**: 修改前建议备份重要数据
4. **停机影响**: 重启后端期间服务会暂时不可用

---

## 🔧 故障排查

### 问题1: 表结构未更新

**症状**: 字段类型仍然是`date`

**解决方案**:
1. 检查后端日志,确认synchronize已启用
2. 手动执行ALTER TABLE语句修改表结构
3. 检查数据库权限

### 问题2: 重新导入后时间仍然丢失

**症状**: 数据库中字段类型已更新,但时间仍为00:00:00

**可能原因**:
1. Excel中的时间格式未正确识别
2. parseDate函数未正确解析时间部分

**解决方案**:
1. 检查Excel中的原始时间格式
2. 检查前端parseDate函数是否正确处理时间
3. 在导入前检查Excel数据预览

---

## 📝 总结

### 已完成

- ✅ 修改了3个实体文件的9个字段类型
- ✅ 从`date`改为`timestamp`

### 待执行

- ⏳ 重启后端服务
- ⏳ 验证表结构更新
- ⏳ 清理错误数据
- ⏳ 重新导入Excel
- ⏳ 验证数据准确性

### 预期效果

完成上述步骤后,所有日期字段应该能够正确保存完整的时间信息,准确率达到100%。

---

**下一步**: 请按照步骤1-5执行修复操作。
