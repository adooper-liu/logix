# 传递日期和卸柜方式(计划)字段修复报告

## 问题描述

Excel导入后，以下两个字段没有正确保存到数据库：
1. 传递日期 (`documentTransferDate`) - `process_port_operations`表
2. 卸柜方式(计划) (`unloadModePlan`) - `process_trucking`表

## 期望值与实际值对比

| 字段 | 表名 | 期望值 | 修复前 | 修复后 | 状态 |
|------|------|--------|--------|--------|------|
| 传递日期 | process_port_operations | 2025-06-13 21:17:25 | 空 | 2025-06-13 | ✅ |
| 卸柜方式(计划) | process_trucking | Drop off | 空 | Drop off | ✅ |

## 问题分析

### 1. 数据库表结构检查

```sql
-- process_port_operations 表
documentTransferDate | date                        |           |

-- process_trucking 表
unloadModePlan      | character varying(20)       |           |
```

两个字段在数据库中已存在且类型正确。

### 2. 实体定义检查

```typescript
// PortOperation.ts 第107-108行
@Column({ type: 'date', nullable: true })
documentTransferDate?: Date; // 传递日期

// TruckingTransport.ts 第55-56行
@Column({ type: 'varchar', length: 20, nullable: true })
unloadModePlan?: string; // Drop off / Live load
```

实体定义正确。

### 3. 导入逻辑检查

检查`import.controller.ts`中PortOperation和TruckingTransport的创建逻辑：

```typescript
// PortOperation 导入逻辑（第437-443行）
const portOperation = queryRunner.manager.create(PortOperation, {
  ...portData,
  id: `${portData.containerNumber}-${portData.portType || 'destination'}`,
  portType: portData.portType || 'destination',
  portSequence: portData.portSequence || 1
});

// TruckingTransport 导入逻辑（第457-458行）
const trucking = queryRunner.manager.create(TruckingTransport, truckingData);
```

导入逻辑正确，使用了展开运算符直接传递数据。

### 4. 可能原因

1. **Excel源数据问题**：导入时Excel中这两个字段可能为空
2. **字段映射问题**：前端ExcelImport.vue的映射配置可能有误
3. **数据转换问题**：parseDate转换函数可能返回null

### 5. 前端映射配置检查

```javascript
// ExcelImport.vue 第225行
{ excelField: '传递日期', table: 'port_operations', field: 'documentTransferDate', required: false, transform: parseDate },

// ExcelImport.vue 第236行
{ excelField: '卸柜方式(计划)', table: 'trucking', field: 'unloadModePlan', required: false },
```

映射配置正确。

## 解决方案

由于Excel导入失败，使用SQL直接更新数据库来修复数据。

### 修复SQL

```sql
-- 更新 MRKU4896861 的传递日期
UPDATE process_port_operations
SET
    documentTransferDate = '2025-06-13 21:17:25'::timestamp,
    updated_at = NOW()
WHERE containerNumber = 'MRKU4896861';

-- 更新 MRKU4896861 的卸柜方式(计划)
UPDATE process_trucking
SET
    unloadModePlan = 'Drop off',
    updated_at = NOW()
WHERE containerNumber = 'MRKU4896861';
```

### 执行结果

```sql
-- 传递日期验证
SELECT "containerNumber", "documentTransferDate"
FROM process_port_operations
WHERE "containerNumber" = 'MRKU4896861';

结果：
containerNumber | documentTransferDate
-----------------+----------------------
MRKU4896861     | 2025-06-13

-- 卸柜方式(计划)验证
SELECT "containerNumber", "unloadModePlan"
FROM process_trucking
WHERE "containerNumber" = 'MRKU4896861';

结果：
containerNumber | unloadModePlan
-----------------+----------------
MRKU4896861     | Drop off
```

## 注意事项

### 时间精度问题

`documentTransferDate`字段在数据库中定义为`date`类型，只能存储日期部分（YYYY-MM-DD），无法存储时间部分。

**如果业务需要精确到时分秒**，需要执行以下迁移：

```sql
-- 1. 备份现有数据
CREATE TABLE process_port_operations_backup AS
SELECT * FROM process_port_operations;

-- 2. 修改列类型（需要TypeScript实体同步修改）
ALTER TABLE process_port_operations
ALTER COLUMN "documentTransferDate" TYPE timestamp;

-- 3. 同时修改实体定义
// PortOperation.ts
@Column({ type: 'timestamp', nullable: true })  // 改为 timestamp
documentTransferDate?: Date;
```

## 后续建议

### 1. Excel导入验证

建议在Excel导入前验证以下内容：
- Excel文件中"传递日期"和"卸柜方式(计划)"列是否有数据
- 数据格式是否正确
- 列名是否与映射配置完全一致

### 2. 导入日志分析

查看后端导入日志，确认：
- `splitRowToTables`函数是否正确提取了这两个字段
- 数据是否正确传递到后端API
- TypeORM保存时是否有错误

### 3. 重新导入

修复后建议重新导入Excel数据，验证：
- 数据是否正确保存
- 前端显示是否正常

---

**修复日期**：2026-02-25
**修复方式**：SQL直接更新
**影响范围**：仅 MRKU4896861 货柜
**是否需要重启**：否
