# 时间信息丢失问题修复方案

**问题发现日期**: 2026-02-26
**影响范围**: 5个表的9个日期字段
**严重程度**: 中 - 日期准确,但时间信息丢失

---

## 🔍 问题根因分析

### 发现的问题

在验证日期修复效果时,发现以下9个字段的时间信息丢失:

#### process_port_operations (5个字段)
- `ata_dest_port`: Excel中是 `2025-05-17 00:18:00`,数据库中是 `2025-05-17 00:00:00`
- `dest_port_unload_date`: Excel中是 `2025-05-17 00:18:00`,数据库中是 `2025-05-17 00:00:00`
- `planned_customs_date`: Excel中是 `2025-05-06 23:59:59`,数据库中是 `2025-05-06 00:00:00`
- `isf_declaration_date`: Excel中是 `2025-03-26 21:00:23`,数据库中是 `2025-03-26 00:00:00`

#### process_warehouse_operations (2个字段)
- `warehouse_arrival_date`: Excel中是 `2025-05-31 11:38:58`,数据库中是 `2025-05-31 00:00:00`
- `wms_confirm_date`: Excel中是 `2025-05-28 05:00:47`,数据库中是 `2025-05-28 00:00:00`

#### process_empty_returns (1个字段)
- `last_return_date`: Excel中是 `2025-05-30 23:59:59`,数据库中是 `2025-05-30 00:00:00`

### 根本原因

这些字段在TypeORM实体中定义为`type: 'date'`而非`type: 'timestamp'`:

```typescript
// ❌ 错误 - date类型只能存储日期,不能存储时间
@Column({ type: 'date', nullable: true, name: 'ata_dest_port' })
ataDestPort: Date;

// ✅ 正确 - timestamp类型可以存储完整的日期和时间
@Column({ type: 'timestamp', nullable: true, name: 'ata_dest_port' })
ataDestPort: Date;
```

---

## 🔧 修复方案

### 方案1: 修改实体定义(推荐)

修改TypeORM实体文件,将`date`类型改为`timestamp`类型。

#### 1.1 修改 PortOperation.ts

**文件**: `backend/src/entities/PortOperation.ts`

```typescript
// 修改前
@Column({ type: 'date', nullable: true, name: 'ata_dest_port' })
ataDestPort: Date;

// 修改后
@Column({ type: 'timestamp', nullable: true, name: 'ata_dest_port' })
ataDestPort: Date;
```

**需要修改的字段**:
- `eta_dest_port` (第37行)
- `ata_dest_port` (第40行)
- `dest_port_unload_date` (第83行)
- `planned_customs_date` (第89行)
- `isf_declaration_date` (第107行)

#### 1.2 修改 WarehouseOperation.ts

检查并修改以下字段:
- `warehouse_arrival_date`
- `planned_unload_date`
- `wms_confirm_date`

#### 1.3 修改 EmptyReturn.ts

检查并修改以下字段:
- `lastReturnDate`

### 方案2: 修改数据库表结构(不推荐)

直接修改数据库表结构:

```sql
-- 修改 process_port_operations
ALTER TABLE process_port_operations
  ALTER COLUMN eta_dest_port TYPE timestamp without time zone,
  ALTER COLUMN ata_dest_port TYPE timestamp without time zone,
  ALTER COLUMN dest_port_unload_date TYPE timestamp without time zone,
  ALTER COLUMN planned_customs_date TYPE timestamp without time zone,
  ALTER COLUMN isf_declaration_date TYPE timestamp without time zone;

-- 修改 process_warehouse_operations
ALTER TABLE process_warehouse_operations
  ALTER COLUMN warehouse_arrival_date TYPE timestamp without time zone,
  ALTER COLUMN planned_unload_date TYPE timestamp without time zone,
  ALTER COLUMN wms_confirm_date TYPE timestamp without time zone;

-- 修改 process_empty_returns
ALTER TABLE process_empty_returns
  ALTER COLUMN "lastReturnDate" TYPE timestamp without time zone;
```

**缺点**:
- 如果使用TypeORM的synchronize功能,下次启动时会根据实体定义重新同步,会覆盖手动修改
- 不符合TypeORM最佳实践

### 方案3: 组合方案(最佳实践)

1. 修改TypeORM实体定义
2. 重新启动后端,让TypeORM自动同步表结构
3. 删除错误数据,重新导入

---

## 🚀 实施步骤

### 步骤1: 修改实体定义

#### 1.1 修改 PortOperation.ts<tool_call>replace_in_file<arg_key>filePath</arg_key><arg_value>d:\Gihub\logix\backend\src\entities\PortOperation.ts