# FANU3376528 数据对比报告 - 修复前 vs 修复后

**对比日期**: 2026-02-26
**集装箱号**: FANU3376528

---

## 📊 海运表 (process_sea_freight) 日期对比

### shipment_date (出运日期)

| 版本 | 值 | 状态 |
|------|----|----|
| Excel原始值 | 2025-03-30 | 参考 |
| 修复前 | 2025-03-29 (早1天) | ❌ 错误 |
| 修复后(待验证) | 2025-03-30 | ✅ 预期 |

### eta (预计到港日期)

| 版本 | 值 | 状态 |
|------|----|----|
| Excel原始值 | 2025-05-09 | 参考 |
| 修复前 | 2025-05-08 (早1天) | ❌ 错误 |
| 修复后(待验证) | 2025-05-09 | ✅ 预期 |

### mother_shipment_date (母船出运日期)

| 版本 | 值 | 状态 |
|------|----|----|
| Excel原始值 | 2025-04-07 | 参考 |
| 修复前 | 2025-04-06 (早1天) | ❌ 错误 |
| 修复后(待验证) | 2025-04-07 | ✅ 预期 |

---

## 📊 港口操作表 (process_port_operations) 日期对比

### eta_dest_port (预计到港日期-目的港)

| 版本 | 值 | 状态 |
|------|----|----|
| Excel原始值 | 2025-05-09 00:00:00 | 参考 |
| 修复前 | 2025-05-08 (早1天) | ❌ 错误 |
| 修复后(待验证) | 2025-05-09 00:00:00 | ✅ 预期 |

### ata_dest_port (实际到港日期-目的港)

| 版本 | 值 | 状态 |
|------|----|----|
| Excel原始值 | 2025-05-17 00:18:00 | 参考 |
| 修复前 | 2025-05-16 (早1天) | ❌ 错误 |
| 修复后(待验证) | 2025-05-17 00:18:00 | ✅ 预期 |

### dest_port_unload_date (目的港卸船/火车日期)

| 版本 | 值 | 状态 |
|------|----|----|
| Excel原始值 | 2025-05-17 00:18:00 | 参考 |
| 修复前 | 2025-05-16 (早1天) | ❌ 错误 |
| 修复后(待验证) | 2025-05-17 00:18:00 | ✅ 预期 |

### planned_customs_date (计划清关日期)

| 版本 | 值 | 状态 |
|------|----|----|
| Excel原始值 | 2025-05-06 23:59:59 | 参考 |
| 修复前 | 2025-05-06 (仅日期,时间丢失) | ⚠️ 不完整 |
| 修复后(待验证) | 2025-05-06 23:59:59 | ✅ 预期 |

### isf_declaration_date (ISF申报日期)

| 版本 | 值 | 状态 |
|------|----|----|
| Excel原始值 | 2025-03-26 21:00:23 | 参考 |
| 修复前 | 2025-03-26 21:00:23 | ✅ 正确(时间已存在) |
| 修复后(待验证) | 2025-03-26 21:00:23 | ✅ 预期 |

---

## 📊 仓库操作表 (process_warehouse_operations) 日期对比

### warehouse_arrival_date (入库日期)

| 版本 | 值 | 状态 |
|------|----|----|
| Excel原始值 | 2025-05-31 11:38:58 | 参考 |
| 修复前 | 2025-05-31 | ⚠️ 时间丢失 |
| 修复后(待验证) | 2025-05-31 11:38:58 | ✅ 预期 |

### planned_unload_date (计划卸柜日期)

| 版本 | 值 | 状态 |
|------|----|----|
| Excel原始值 | 2025-05-28 00:00:00 | 参考 |
| 修复前 | 2025-05-27 (早1天) | ❌ 错误 |
| 修复后(待验证) | 2025-05-28 00:00:00 | ✅ 预期 |

### wms_confirm_date (WMS Confirm Date)

| 版本 | 值 | 状态 |
|------|----|----|
| Excel原始值 | 2025-05-28 05:00:47 | 参考 |
| 修复前 | 2025-05-27 (早1天,时间丢失) | ❌ 错误 |
| 修复后(待验证) | 2025-05-28 05:00:47 | ✅ 预期 |

---

## 📊 还空箱表 (process_empty_returns) 日期对比

### last_return_date (最晚还箱日期)

| 版本 | 值 | 状态 |
|------|----|----|
| Excel原始值 | 2025-05-30 23:59:59 | 参考 |
| 修复前 | 2025-05-30 | ⚠️ 时间丢失 |
| 修复后(待验证) | 2025-05-30 23:59:59 | ✅ 预期 |

### planned_return_date (计划还箱日期)

| 版本 | 值 | 状态 |
|------|----|----|
| Excel原始值 | 2025-05-28 00:00:00 | 参考 |
| 修复前 | 2025-05-27 (早1天) | ❌ 错误 |
| 修复后(待验证) | 2025-05-28 00:00:00 | ✅ 预期 |

### return_time (还箱日期)

| 版本 | 值 | 状态 |
|------|----|----|
| Excel原始值 | 2025-06-29 20:52:47 | 参考 |
| 修复前 | 2025-06-29 20:52:47 | ✅ 正确 |
| 修复后(待验证) | 2025-06-29 20:52:47 | ✅ 预期 |

---

## 📊 汇总对比

### 问题汇总

| 问题类型 | 修复前影响 | 修复后预期 |
|---------|-----------|-----------|
| 时区转换导致早1天 | 10个字段 | 0个字段 |
| 时间信息丢失 | 4个字段 | 0个字段 |
| 完全正确 | 1个字段 | 14个字段 |

### 准确率对比

| 版本 | 总字段 | 准确字段 | 准确率 |
|------|--------|---------|--------|
| 修复前 | 14 | 1 | 7.1% |
| 修复后(预期) | 14 | 14 | 100% |

---

## 🔍 验证SQL查询

请执行以下SQL查询并填写验证结果:

```sql
-- 海运表
SELECT 'shipment_date' as 字段, shipment_date as 数据库值
FROM process_sea_freight WHERE container_number = 'FANU3376528'

UNION ALL

SELECT 'eta', eta
FROM process_sea_freight WHERE container_number = 'FANU3376528'

UNION ALL

SELECT 'mother_shipment_date', mother_shipment_date
FROM process_sea_freight WHERE container_number = 'FANU3376528'

UNION ALL

SELECT 'eta_dest_port', eta_dest_port
FROM process_port_operations
WHERE container_number = 'FANU3376528' AND port_type = 'destination'

UNION ALL

SELECT 'ata_dest_port', ata_dest_port
FROM process_port_operations
WHERE container_number = 'FANU3376528' AND port_type = 'destination'

UNION ALL

SELECT 'dest_port_unload_date', dest_port_unload_date
FROM process_port_operations
WHERE container_number = 'FANU3376528' AND port_type = 'destination'

UNION ALL

SELECT 'planned_customs_date', planned_customs_date
FROM process_port_operations
WHERE container_number = 'FANU3376528' AND port_type = 'destination'

UNION ALL

SELECT 'isf_declaration_date', isf_declaration_date
FROM process_port_operations
WHERE container_number = 'FANU3376528' AND port_type = 'destination'

UNION ALL

SELECT 'warehouse_arrival_date', warehouse_arrival_date
FROM process_warehouse_operations WHERE container_number = 'FANU3376528'

UNION ALL

SELECT 'planned_unload_date', planned_unload_date
FROM process_warehouse_operations WHERE container_number = 'FANU3376528'

UNION ALL

SELECT 'wms_confirm_date', wms_confirm_date
FROM process_warehouse_operations WHERE container_number = 'FANU3376528'

UNION ALL

SELECT 'last_return_date', last_return_date
FROM process_empty_returns WHERE "containerNumber" = 'FANU3376528'

UNION ALL

SELECT 'planned_return_date', planned_return_date
FROM process_empty_returns WHERE "containerNumber" = 'FANU3376528'

UNION ALL

SELECT 'return_time', return_time
FROM process_empty_returns WHERE "containerNumber" = 'FANU3376528'

ORDER BY 字段;
```

---

## ✅ 验证清单

请将SQL查询结果与期望值对比,并勾选:

### 海运表
- [ ] shipment_date = '2025-03-30 00:00:00'
- [ ] eta = '2025-05-09 00:00:00'
- [ ] mother_shipment_date = '2025-04-07 00:00:00'

### 港口操作表
- [ ] eta_dest_port = '2025-05-09 00:00:00'
- [ ] ata_dest_port = '2025-05-17 00:18:00'
- [ ] dest_port_unload_date = '2025-05-17 00:18:00'
- [ ] planned_customs_date = '2025-05-06 23:59:59'
- [ ] isf_declaration_date = '2025-03-26 21:00:23'

### 仓库操作表
- [ ] warehouse_arrival_date = '2025-05-31 11:38:58'
- [ ] planned_unload_date = '2025-05-28 00:00:00'
- [ ] wms_confirm_date = '2025-05-28 05:00:47'

### 还空箱表
- [ ] last_return_date = '2025-05-30 23:59:59'
- [ ] planned_return_date = '2025-05-28 00:00:00'
- [ ] return_time = '2025-06-29 20:52:47'

---

**请执行上述SQL查询,并将实际结果填入验证清单中。**

**预期结果**: 所有14个字段都应该与Excel原始值完全一致,准确率达到100%。
