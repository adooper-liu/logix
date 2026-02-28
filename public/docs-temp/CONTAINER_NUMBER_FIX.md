# 外键列命名不一致问题修复说明

## 问题描述

在多个关联表中存在重复的集装箱号列：
- `containerNumber` - 业务数据列（有实际数据）
- `container_number` - 外键列（最初为空）

这种设计导致：
1. 数据冗余（同一字段存储两次）
2. 数据同步问题（需要手动维护两列数据一致性）
3. 外键约束失效（`container_number` 为空时关联查询失败）

## 影响范围

| 表名 | 问题 |
|------|------|
| `process_sea_freight` | 存在 `container_number` 冗余列 |
| `process_port_operations` | 存在 `container_number` 冗余列 |
| `process_trucking` | 可能存在（已检查，无冗余） |
| `process_warehouse_operations` | 可能存在（已检查，无冗余） |
| `process_empty_returns` | 可能存在（已检查，无冗余） |

## 解决方案

### 统一使用 `containerNumber` 作为外键列

**优点：**
- 与主表 `biz_containers` 主键命名一致
- 数据结构清晰，避免混淆
- 减少数据冗余

**实施步骤：**

1. **删除冗余的 `container_number` 列**
2. **重新创建外键约束**（指向 `containerNumber` 列）
3. **更新实体配置**（修改 `@JoinColumn`）

## 修复详情

### 数据库修改

#### process_port_operations

```sql
-- 删除旧外键
ALTER TABLE process_port_operations
  DROP CONSTRAINT "FK_8bd3a649de90bb7fb22408c81a1";

-- 删除冗余列
ALTER TABLE process_port_operations
  DROP COLUMN "container_number";

-- 创建新外键
ALTER TABLE process_port_operations
  ADD CONSTRAINT "FK_09f54400dbf31d3b848c870fdd9"
  FOREIGN KEY ("containerNumber")
  REFERENCES biz_containers("containerNumber")
  ON DELETE CASCADE;
```

#### process_sea_freight

```sql
-- 删除冗余列（containerNumber 是主键，无需修改外键）
ALTER TABLE process_sea_freight
  DROP COLUMN "container_number";
```

### 实体配置修改

#### SeaFreight.ts

```typescript
// 修改前
@JoinColumn({
  name: 'container_number',
  referencedColumnName: 'containerNumber'
})

// 修改后
@JoinColumn({
  name: 'containerNumber',
  referencedColumnName: 'containerNumber'
})
```

#### PortOperation.ts

```typescript
// 修改前
@JoinColumn({
  name: 'container_number',
  referencedColumnName: 'containerNumber'
})

// 修改后
@JoinColumn({
  name: 'containerNumber',
  referencedColumnName: 'containerNumber'
})
```

#### TruckingTransport.ts

```typescript
// 修改前
@JoinColumn({
  name: 'container_number',
  referencedColumnName: 'containerNumber'
})

// 修改后
@JoinColumn({
  name: 'containerNumber',
  referencedColumnName: 'containerNumber'
})
```

#### WarehouseOperation.ts

```typescript
// 修改前
@JoinColumn({
  name: 'container_number',
  referencedColumnName: 'containerNumber'
})

// 修改后
@JoinColumn({
  name: 'containerNumber',
  referencedColumnName: 'containerNumber'
})
```

#### EmptyReturn.ts

```typescript
// 修改前
@JoinColumn({
  name: 'container_number',
  referencedColumnName: 'containerNumber'
})

// 修改后
@JoinColumn({
  name: 'containerNumber',
  referencedColumnName: 'containerNumber'
})
```

## 验证结果

### 数据库层面

✅ 所有冗余的 `container_number` 列已删除
✅ 外键约束正确指向 `containerNumber` 列
✅ 数据完整性验证通过

### 代码层面

✅ 所有实体配置已更新
✅ 无 linter 错误

### 功能层面

✅ 关联查询正常工作
✅ 清关信息页签正常显示

## 经验教训

### 问题根源

1. **命名规范不统一**：外键列名与主键列名不一致
2. **TypeORM 配置错误**：使用 `@JoinColumn({ name: 'container_number' })` 导致创建额外的列

### 最佳实践

1. **外键列命名**：应该与被引用的主键列名保持一致
2. **实体配置**：谨慎使用 `@JoinColumn` 的 `name` 参数
3. **数据冗余**：避免在同一表中创建语义相同的多个列

## 相关文件

- 数据库迁移脚本：`backend/migrations/fix_duplicate_container_number_columns.sql`
- 实体文件：
  - `backend/src/entities/SeaFreight.ts`
  - `backend/src/entities/PortOperation.ts`
  - `backend/src/entities/TruckingTransport.ts`
  - `backend/src/entities/WarehouseOperation.ts`
  - `backend/src/entities/EmptyReturn.ts`

## 执行日期

2026-02-25

## 执行人

AI Assistant
