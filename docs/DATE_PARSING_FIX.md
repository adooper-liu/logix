# 日期解析问题修复说明

**修复日期**: 2026-02-26
**影响范围**: Excel导入功能 - 日期字段解析
**严重程度**: 高 - 影响所有日期字段的准确性

---

## 问题描述

### 1. 时区转换问题
所有导入的日期字段比Excel原始数据早1天,涉及以下表:
- `process_sea_freight`: shipment_date, eta, mother_shipment_date
- `process_port_operations`: eta_dest_port, ata_dest_port, dest_port_unload_date
- `process_warehouse_operations`: wms_confirm_date, planned_unload_date
- `process_empty_returns`: planned_return_date

### 2. 根本原因
原`parseDate`函数使用`date.toISOString()`转换日期字符串,这会引入UTC时区转换:

```typescript
// 错误的实现
const date = new Date('2025-03-30')
return date.toISOString()  // 返回 '2025-03-29T16:00:00.000Z' (早1天!)
```

当解析`YYYY-MM-DD`格式的日期字符串时:
1. `new Date('2025-03-30')` 创建本地时区的午夜(00:00:00)
2. `toISOString()` 转换为UTC时间
3. 对于中国时区(UTC+8),会减去8小时,变成前一天的16:00:00

---

## 解决方案

### 1. 重写日期解析逻辑

#### 新增函数

**`parseLocalDate(dateStr: string)`**: 手动解析日期字符串,避免时区转换
```typescript
function parseLocalDate(dateStr: string): Date {
  const parts = dateStr.split(/[\s-:T]/)
  const year = parseInt(parts[0], 10)
  const month = parseInt(parts[1], 10) - 1  // JavaScript月份从0开始
  const day = parseInt(parts[2], 10)
  const hour = parts[3] ? parseInt(parts[3], 10) : 0
  const minute = parts[4] ? parseInt(parts[4], 10) : 0
  const second = parts[5] ? parseInt(parts[5], 10) : 0

  return new Date(year, month, day, hour, minute, second)
}
```

**`formatDateToLocal(date: Date)`**: 格式化为本地时间字符串
```typescript
function formatDateToLocal(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  const second = String(date.getSeconds()).padStart(2, '0')

  return `${year}-${month}-${day} ${hour}:${minute}:${second}`
}
```

#### 重写`parseDate`函数

```typescript
function parseDate(value: any): string | null {
  if (!value) return null

  // Excel日期数字
  if (typeof value === 'number') {
    const date = new Date((value - 25569) * 86400 * 1000)
    return isNaN(date.getTime()) ? null : formatDateToLocal(date)
  }

  // 字符串日期
  const dateStr = String(value).trim()
  const dashDate = dateStr.replace(/\//g, '-')

  let date: Date | null = null

  // 各种格式的解析...
  if (格式匹配) {
    date = parseLocalDate(...)
  }

  if (!date || isNaN(date.getTime())) {
    console.warn(`无法解析日期: ${value} (类型: ${typeof value})`)
    return null
  }

  return formatDateToLocal(date)
}
```

### 2. 还空箱表字段映射补充

新增以下字段映射:
```typescript
{ excelField: '最晚还箱日期', table: 'process_empty_return', field: 'last_return_date', required: false, transform: parseDate },
{ excelField: '计划还箱日期', table: 'process_empty_return', field: 'planned_return_date', required: false, transform: parseDate },
{ excelField: '还箱日期', table: 'process_empty_return', field: 'return_time', required: false, transform: parseDate },
```

---

## 修复验证

### 日期解析测试

| Excel原始值 | 修复前 | 修复后 | 状态 |
|------------|--------|--------|------|
| 2025-03-30 | 2025-03-29T16:00:00.000Z | 2025-03-30 00:00:00 | ✅ |
| 2025-05-09 | 2025-05-08T16:00:00.000Z | 2025-05-09 00:00:00 | ✅ |
| 2025-05-05 05:34:00 | 2025-05-04T21:34:00.000Z | 2025-05-05 05:34:00 | ✅ |
| 2025-05-28 05:00:47 | 2025-05-27T21:00:47.000Z | 2025-05-28 05:00:47 | ✅ |

### 影响的表和字段

#### process_sea_freight
- `shipment_date` - 出运日期
- `eta` - 预计到港日期
- `mother_shipment_date` - 母船出运日期

#### process_port_operations
- `eta_dest_port` - 预计到港日期(目的港)
- `ata_dest_port` - 实际到港日期(目的港)
- `dest_port_unload_date` - 目的港卸船/火车日期
- `planned_customs_date` - 计划清关日期

#### process_warehouse_operations
- `warehouse_arrival_date` - 入库日期
- `planned_unload_date` - 计划卸柜日期
- `wms_confirm_date` - WMS Confirm Date

#### process_empty_returns
- `last_return_date` - 最晚还箱日期
- `planned_return_date` - 计划还箱日期
- `return_time` - 还箱日期

---

## 数据修复流程

对于已导入的错误数据,需要重新导入:

### 1. 清理现有数据
```sql
DELETE FROM process_trucking_transport WHERE container_number = 'FANU3376528';
DELETE FROM process_warehouse_operations WHERE container_number = 'FANU3376528';
DELETE FROM process_port_operations WHERE container_number = 'FANU3376528';
DELETE FROM process_sea_freight WHERE container_number = 'FANU3376528';
DELETE FROM process_empty_returns WHERE "containerNumber" = 'FANU3376528';
DELETE FROM biz_containers WHERE container_number = 'FANU3376528';
DELETE FROM biz_replenishment_orders WHERE order_number = '24DSC4914';
```

### 2. 重新导入Excel
- 刷新前端页面(加载修复后的ExcelImport.vue)
- 上传原始Excel文件
- 点击"解析Excel"
- 点击"导入数据库"

### 3. 验证数据
```sql
-- 检查海运表日期
SELECT shipment_date, eta, mother_shipment_date
FROM process_sea_freight
WHERE container_number = 'FANU3376528';

-- 检查港口操作表日期
SELECT eta_dest_port, ata_dest_port, dest_port_unload_date, planned_customs_date
FROM process_port_operations
WHERE container_number = 'FANU3376528' AND port_type = 'destination';

-- 检查仓库操作表日期
SELECT warehouse_arrival_date, planned_unload_date, wms_confirm_date
FROM process_warehouse_operations
WHERE container_number = 'FANU3376528';

-- 检查还空箱表日期
SELECT last_return_date, planned_return_date, return_time
FROM process_empty_returns
WHERE "containerNumber" = 'FANU3376528';
```

---

## 技术说明

### 为什么本地解析正确?

**错误方式**:
```typescript
const date = new Date('2025-03-30')  // 在中国时区创建: 2025-03-30 00:00:00 CST
date.toISOString()                   // 转为UTC: 2025-03-29T16:00:00.000Z
```

**正确方式**:
```typescript
const year = 2025, month = 2, day = 30  // JavaScript月份从0开始
const date = new Date(year, month, day)  // 直接创建本地时间: 2025-03-30 00:00:00
`${year}-${month+1}-${day}`             // 格式化字符串: "2025-03-30"
```

### 支持的日期格式

修复后的`parseDate`函数支持以下格式:

1. **Excel日期数字**: 44723 (Excel内部日期格式)
2. **ISO格式**: `YYYY-MM-DD HH:mm:ss`, `YYYY-MM-DD HH:mm`
3. **斜杠格式**: `YYYY/MM/DD HH:mm:ss`, `YYYY/MM/DD`
4. **紧凑格式**: `YYYYMMDD`
5. **欧洲格式**: `DD-MM-YYYY`, `DD/MM/YYYY`

所有格式都使用本地时间解析,不进行时区转换。

---

## 相关文件

### 修改的文件
- `frontend/src/views/import/ExcelImport.vue`

### 修改的函数
- `parseDate()` - 重写日期解析逻辑
- `parseLocalDate()` - 新增本地日期解析
- `formatDateToLocal()` - 新增本地日期格式化

### 新增的字段映射
- `最晚还箱日期` → `process_empty_return.last_return_date`
- `计划还箱日期` → `process_empty_return.planned_return_date`
- `还箱日期` → `process_empty_return.return_time`

---

## 注意事项

1. **后端处理**: 后端TypeORM实体使用`timestamp without time zone`类型,需要确保传入的日期字符串不包含时区信息

2. **数据库时区**: PostgreSQL默认使用UTC时区,但`timestamp without time zone`字段按原始值存储,不受时区影响

3. **前端显示**: 前端显示日期时需要确保使用本地时区,避免再次转换

4. **已导入数据**: 必须重新导入所有Excel数据,不能使用SQL临时补丁修复(符合《开发规范》数据完整性原则)

---

## 总结

本次修复从根本上解决了日期解析的时区转换问题,确保Excel中的日期值能够准确导入到数据库中,不再出现日期偏差的问题。
