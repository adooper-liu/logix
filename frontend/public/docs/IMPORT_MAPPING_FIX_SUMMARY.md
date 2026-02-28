# Excel 导入字段映射修复总结

## 📌 问题描述

### 现象

通过检查集装箱 `FANU3376528` (备货单 `24DSC4914`) 的导入数据,发现:

1. **拖卡运输表** (process_trucking_transport) - 完全未导入
   - 数据库查询结果: 0行记录
   - Excel原始数据包含: 目的港卡车、提柜日期、送仓日期、卸柜方式等14个字段

2. **仓库操作表** (process_warehouse_operations) - 部分导入
   - 数据库查询结果: 1行空记录,所有关键字段为NULL
   - Excel原始数据包含: 入库仓库组、仓库(实际)、入库日期、WMS状态等14个字段

### 影响

- 数据完整度仅约71% (5/7张表完整导入)
- 拖卡运输和仓库操作数据完全丢失
- 违反了"数据库表结构是唯一基准"原则

## 🔍 根本原因

### 1. 前端字段映射严重不足

**拖卡运输表映射** (原始代码):
```typescript
// frontend/src/views/import/ExcelImport.vue - 行129-131
{ excelField: '目的港卡车', table: 'process_trucking_transport', field: 'delivery_location', required: false },
{ excelField: '卸柜方式(计划)', table: 'process_trucking_transport', field: 'unload_mode_plan', required: false },
```

**问题**:
- 只映射了2个字段
- 字段映射错误 (`目的港卡车` 应该是 `carrier_company` 而不是 `delivery_location`)
- 缺少14个关键字段映射

**仓库操作表映射** (原始代码):
```typescript
// frontend/src/views/import/ExcelImport.vue - 行134-135
{ excelField: '卸柜方式(实际)', table: 'process_warehouse_operations', field: 'unload_mode_actual', required: false },
{ excelField: '卸柜方式（实际）', table: 'process_warehouse_operations', field: 'unload_mode_actual', required: false },
```

**问题**:
- 只映射了2个字段(且重复)
- 缺少14个关键字段映射

### 2. 参考文档与实际代码不同步

`docs/CORRECT_FIELD_MAPPINGS.ts` 包含完整的字段映射,但前端 `ExcelImport.vue` 未同步。

### 3. 缺少字段映射维护机制

没有明确的字段映射维护流程和验证机制,导致字段添加时映射遗漏。

## ✅ 修复方案

### 修复内容

#### 1. 更新前端字段映射 (ExcelImport.vue)

**拖卡运输表** - 添加14个字段映射:
```typescript
{ excelField: '是否预提', table: 'process_trucking_transport', field: 'is_pre_pickup', required: false, transform: transformBoolean },
{ excelField: '目的港卡车', table: 'process_trucking_transport', field: 'carrier_company', required: false },
{ excelField: '提柜通知', table: 'process_trucking_transport', field: 'pickup_notification', required: false },
{ excelField: '货柜承运商', table: 'process_trucking_transport', field: 'carrier_company', required: false },
{ excelField: '司机姓名', table: 'process_trucking_transport', field: 'driver_name', required: false },
{ excelField: '司机电话', table: 'process_trucking_transport', field: 'driver_phone', required: false },
{ excelField: '车牌号', table: 'process_trucking_transport', field: 'truck_plate', required: false },
{ excelField: '最晚提柜日期', table: 'process_trucking_transport', field: 'last_pickup_date', required: false, transform: parseDate },
{ excelField: '计划提柜日期', table: 'process_trucking_transport', field: 'planned_pickup_date', required: false, transform: parseDate },
{ excelField: '提柜日期', table: 'process_trucking_transport', field: 'pickup_date', required: false, transform: parseDate },
{ excelField: '最晚送仓日期', table: 'process_trucking_transport', field: 'last_delivery_date', required: false, transform: parseDate },
{ excelField: '计划送仓日期', table: 'process_trucking_transport', field: 'planned_delivery_date', required: false, transform: parseDate },
{ excelField: '送仓日期', table: 'process_trucking_transport', field: 'delivery_date', required: false, transform: parseDate },
{ excelField: '提柜地点', table: 'process_trucking_transport', field: 'pickup_location', required: false },
{ excelField: '卸柜方式(计划)', table: 'process_trucking_transport', field: 'unload_mode_plan', required: false },
```

**仓库操作表** - 添加14个字段映射:
```typescript
{ excelField: '入库仓库组', table: 'process_warehouse_operations', field: 'warehouse_group', required: false },
{ excelField: '仓库(计划)', table: 'process_warehouse_operations', field: 'planned_warehouse', required: false },
{ excelField: '仓库(实际)', table: 'process_warehouse_operations', field: 'actual_warehouse', required: false },
{ excelField: '计划卸柜日期', table: 'process_warehouse_operations', field: 'planned_unload_date', required: false, transform: parseDate },
{ excelField: '最晚卸柜日期', table: 'process_warehouse_operations', field: 'last_unload_date', required: false, transform: parseDate },
{ excelField: '卸空日期', table: 'process_warehouse_operations', field: 'unload_date', required: false, transform: parseDate },
{ excelField: '入库日期', table: 'process_warehouse_operations', field: 'warehouse_arrival_date', required: false, transform: parseDate },
{ excelField: '卸柜方式(实际)', table: 'process_warehouse_operations', field: 'unload_mode_actual', required: false },
{ excelField: '卸柜方式（实际）', table: 'process_warehouse_operations', field: 'unload_mode_actual', required: false },
{ excelField: 'WMS入库状态', table: 'process_warehouse_operations', field: 'wms_status', required: false },
{ excelField: 'EBS入库状态', table: 'process_warehouse_operations', field: 'ebs_status', required: false },
{ excelField: 'WMS Confirm Date', table: 'process_warehouse_operations', field: 'wms_confirm_date', required: false, transform: parseDate },
{ excelField: '卸柜门', table: 'process_warehouse_operations', field: 'unload_gate', required: false },
{ excelField: '卸柜公司', table: 'process_warehouse_operations', field: 'unload_company', required: false },
{ excelField: '备注(仓库信息表)', table: 'process_warehouse_operations', field: 'warehouse_remarks', required: false },
```

#### 2. 更新参考文档 (CORRECT_FIELD_MAPPINGS.ts)

修正了字段映射错误:
- `目的港卡车` 从 `delivery_location` 改为 `carrier_company`
- 移除了重复的 `送达地点` 字段映射

#### 3. 更新开发规范 (DEVELOPMENT_STANDARDS.md)

添加了以下内容:
- **数据完整性原则**: 明确禁止临时补丁修复,必须从源头修复并重新导入
- **案例3**: 拖卡运输和仓库操作字段映射缺失的失败案例
- **字段映射维护规范**: 完整的字段映射维护流程和检查清单

#### 4. 创建数据清理脚本

`scripts/cleanup-invalid-imports.sql` - 用于删除错误的导入数据

#### 5. 创建重新导入指南

`docs/REIMPORT_DATA_GUIDE.md` - 完整的重新导入流程指导

## 📋 后续步骤

### 1. 删除错误导入的数据

```sql
-- 删除拖卡运输数据
DELETE FROM process_trucking_transport WHERE container_number = 'FANU3376528';

-- 删除仓库操作数据
DELETE FROM process_warehouse_operations WHERE container_number = 'FANU3376528';
```

### 2. 重新导入Excel数据

按照 `docs/REIMPORT_DATA_GUIDE.md` 中的步骤重新导入

### 3. 验证导入结果

```sql
-- 验证拖卡运输数据
SELECT
    container_number,
    carrier_company as 目的港卡车,
    pickup_date as 提柜日期,
    delivery_date as 送仓日期,
    unload_mode_plan as 卸柜方式计划
FROM process_trucking_transport
WHERE container_number = 'FANU3376528';

-- 验证仓库操作数据
SELECT
    container_number,
    warehouse_group as 入库仓库组,
    actual_warehouse as 实际仓库,
    warehouse_arrival_date as 入库日期,
    wms_status as WMS入库状态
FROM process_warehouse_operations
WHERE container_number = 'FANU3376528';
```

### 4. 全面验证所有导入数据

对其他已导入的集装箱数据进行全面验证,确保不存在相同问题。

## 📚 相关文档

- [开发规范](../DEVELOPMENT_STANDARDS.md) - 核心原则和失败案例
- [重新导入指南](./REIMPORT_DATA_GUIDE.md) - 完整的重新导入流程
- [字段映射参考](./CORRECT_FIELD_MAPPINGS.ts) - 完整的字段映射配置
- [数据清理脚本](../scripts/cleanup-invalid-imports.sql) - 清理错误数据

## 🎓 经验教训

1. **禁止临时补丁修复** - 必须从源头修复问题,不要用SQL补丁临时修复
2. **字段映射必须完整** - 所有数据库字段都应该有对应的映射配置
3. **参考文档与代码必须同步** - 修改映射时同时更新参考文档和实际代码
4. **建立验证机制** - 每次修改字段映射后,必须验证导入数据的完整性
5. **数据库表结构是唯一基准** - 所有字段映射必须参考数据库表结构

## 📊 修复效果预估

完成重新导入后,预期数据完整度将从 71% 提升到 100%

| 数据类别 | 修复前 | 修复后 |
|----------|--------|--------|
| 备货单信息 | 100% | 100% |
| 货柜基本信息 | 100% | 100% |
| 海运信息 | 100% | 100% |
| 港口操作信息 | 100% | 100% |
| 拖卡运输信息 | 0% | 100% ✅ |
| 仓库操作信息 | 0% | 100% ✅ |
| 还空箱信息 | 100% | 100% |
| **总体完整度** | **71%** | **100%** ✅ |
