# 重新导入后日期验证指南

**文档目的**: 验证日期修复后的数据准确性
**集装箱号**: FANU3376528
**修复日期**: 2026-02-26

---

## 📋 快速验证步骤

### 方法1: 使用Docker容器查询(推荐)

```bash
# 1. 进入PostgreSQL容器
docker exec -it logix-timescaledb psql -U logix_user -d logix_db

# 2. 执行验证查询
\copy (SELECT * FROM process_sea_freight WHERE container_number = 'FANU3376528') TO STDOUT WITH CSV

# 3. 退出容器
\q
```

### 方法2: 使用pgAdmin或其他数据库管理工具

1. 打开pgAdmin或DBeaver
2. 连接到 `logix_db` 数据库
3. 执行下面的验证SQL

---

## 🔍 验证SQL查询

### 完整验证SQL

```sql
-- ============================================================
-- 日期修复验证查询 - FANU3376528
-- 执行后将显示所有日期字段的Excel期望值和数据库实际值
-- ============================================================

WITH excel_values AS (
  SELECT
    'shipment_date'::text as 字段名,
    '2025-03-30 00:00:00'::timestamp as Excel期望值
  UNION ALL SELECT 'eta', '2025-05-09 00:00:00'::timestamp
  UNION ALL SELECT 'mother_shipment_date', '2025-04-07 00:00:00'::timestamp
  UNION ALL SELECT 'eta_dest_port', '2025-05-09 00:00:00'::timestamp
  UNION ALL SELECT 'ata_dest_port', '2025-05-17 00:18:00'::timestamp
  UNION ALL SELECT 'dest_port_unload_date', '2025-05-17 00:18:00'::timestamp
  UNION ALL SELECT 'planned_customs_date', '2025-05-06 23:59:59'::timestamp
  UNION ALL SELECT 'isf_declaration_date', '2025-03-26 21:00:23'::timestamp
  UNION ALL SELECT 'warehouse_arrival_date', '2025-05-31 11:38:58'::timestamp
  UNION ALL SELECT 'planned_unload_date', '2025-05-28 00:00:00'::timestamp
  UNION ALL SELECT 'wms_confirm_date', '2025-05-28 05:00:47'::timestamp
  UNION ALL SELECT 'last_return_date', '2025-05-30 23:59:59'::timestamp
  UNION ALL SELECT 'planned_return_date', '2025-05-28 00:00:00'::timestamp
  UNION ALL SELECT 'return_time', '2025-06-29 20:52:47'::timestamp
),
db_values AS (
  SELECT 'shipment_date'::text as 字段名, shipment_date::timestamp as 数据库实际值
  FROM process_sea_freight WHERE container_number = 'FANU3376528'

  UNION ALL

  SELECT 'eta', eta::timestamp
  FROM process_sea_freight WHERE container_number = 'FANU3376528'

  UNION ALL

  SELECT 'mother_shipment_date', mother_shipment_date::timestamp
  FROM process_sea_freight WHERE container_number = 'FANU3376528'

  UNION ALL

  SELECT 'eta_dest_port', eta_dest_port::timestamp
  FROM process_port_operations
  WHERE container_number = 'FANU3376528' AND port_type = 'destination'

  UNION ALL

  SELECT 'ata_dest_port', ata_dest_port::timestamp
  FROM process_port_operations
  WHERE container_number = 'FANU3376528' AND port_type = 'destination'

  UNION ALL

  SELECT 'dest_port_unload_date', dest_port_unload_date::timestamp
  FROM process_port_operations
  WHERE container_number = 'FANU3376528' AND port_type = 'destination'

  UNION ALL

  SELECT 'planned_customs_date', planned_customs_date::timestamp
  FROM process_port_operations
  WHERE container_number = 'FANU3376528' AND port_type = 'destination'

  UNION ALL

  SELECT 'isf_declaration_date', isf_declaration_date::timestamp
  FROM process_port_operations
  WHERE container_number = 'FANU3376528' AND port_type = 'destination'

  UNION ALL

  SELECT 'warehouse_arrival_date', warehouse_arrival_date::timestamp
  FROM process_warehouse_operations WHERE container_number = 'FANU3376528'

  UNION ALL

  SELECT 'planned_unload_date', planned_unload_date::timestamp
  FROM process_warehouse_operations WHERE container_number = 'FANU3376528'

  UNION ALL

  SELECT 'wms_confirm_date', wms_confirm_date::timestamp
  FROM process_warehouse_operations WHERE container_number = 'FANU3376528'

  UNION ALL

  SELECT 'last_return_date', last_return_date::timestamp
  FROM process_empty_returns WHERE "containerNumber" = 'FANU3376528'

  UNION ALL

  SELECT 'planned_return_date', planned_return_date::timestamp
  FROM process_empty_returns WHERE "containerNumber" = 'FANU3376528'

  UNION ALL

  SELECT 'return_time', return_time::timestamp
  FROM process_empty_returns WHERE "containerNumber" = 'FANU3376528'
)
SELECT
  e.字段名,
  e.Excel期望值,
  d.数据库实际值,
  CASE
    WHEN e.Excel期望值 = d.数据库实际值 THEN '✅ 准确'
    WHEN d.数据库实际值 IS NULL THEN '⚠️  数据为空'
    ELSE '❌ 偏差'
  END as 状态
FROM excel_values e
LEFT JOIN db_values d ON e.字段名 = d.字段名
ORDER BY e.字段名;
```

### 预期结果

所有14个字段的**状态**列应该显示 `✅ 准确`。

---

## 📊 快速统计查询

### 准确率统计

```sql
-- 统计准确率
WITH comparison AS (
  -- 上面的完整SQL...
)
SELECT
  COUNT(*) as 总字段数,
  SUM(CASE WHEN 状态 = '✅ 准确' THEN 1 ELSE 0 END) as 准确字段数,
  SUM(CASE WHEN 状态 = '❌ 偏差' THEN 1 ELSE 0 END) as 偏差字段数,
  ROUND(
    SUM(CASE WHEN 状态 = '✅ 准确' THEN 1 ELSE 0 END)::numeric /
    COUNT(*) * 100,
    1
  ) as 准确率百分比
FROM comparison;
```

### 预期输出

| 总字段数 | 准确字段数 | 偏差字段数 | 准确率百分比 |
|---------|-----------|-----------|-------------|
| 14 | 14 | 0 | 100.0% |

---

## 🎯 验证结论

### 成功标准

- [ ] 所有14个日期字段的Excel期望值与数据库实际值完全一致
- [ ] 准确率达到100%
- [ ] 无偏差字段
- [ ] 无数据为空的情况(除非Excel中确实为空)

### 修复效果

| 指标 | 修复前 | 修复后 |
|------|--------|--------|
| 准确字段数 | 1 | 14 |
| 准确率 | 7.1% | 100% |
| 时区偏差字段 | 10 | 0 |
| 时间丢失字段 | 4 | 0 |

---

## ⚠️ 如果发现问题

### 发现偏差字段

如果任何字段显示 `❌ 偏差`:

1. **检查日期格式**: 确认数据库中的时间格式为 `YYYY-MM-DD HH:mm:ss`
2. **检查时区**: 确认没有时区转换,原始日期保持不变
3. **检查解析逻辑**: 查看 `frontend/src/views/import/ExcelImport.vue` 中的 `parseDate` 函数

### 发现数据为空

如果任何字段显示 `⚠️ 数据为空`:

1. **检查Excel**: 确认Excel中该字段是否有值
2. **检查字段映射**: 确认ExcelImport.vue中是否有对应的字段映射
3. **检查列名**: 确认Excel列名与映射配置完全一致

### 重新导入

如果发现问题,需要:

1. 清理现有数据
2. 检查并修复代码
3. 重新导入Excel
4. 再次验证

---

## 📚 相关文档

- `docs/DATE_PARSING_FIX.md` - 日期修复详细说明
- `docs/DATE_FIX_SUMMARY.md` - 修复总结
- `FANU3376528_DATA_COMPARISON.md` - 详细对比表
- `FANU3376528_DATE_FIX_VERIFICATION.md` - 验证报告模板

---

**验证完成后,请将查询结果截图并保存到项目中。**
