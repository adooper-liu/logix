# 修复 container_number 列名问题

## 问题描述

由于执行了 `fix_duplicate_container_number_columns.sql` 迁移脚本，`process_empty_returns` 和 `ext_container_status_events` 表的 `container_number` 列被删除，导致数据库中实际列名变成 `containerNumber`（PascalCase），违反了 LogiX 命名规范。

## LogiX 命名规范

- **数据库列名**：snake_case（如 `container_number`）
- **实体字段名**：camelCase（如 `containerNumber`）
- **映射规则**：使用 `SnakeNamingStrategy` 自动映射，**不在实体中显式指定 `name` 属性**

## 临时解决方案（已实施）

由于数据库列名已经是 `containerNumber`，暂时在实体中显式指定：
```typescript
@PrimaryColumn({ type: 'varchar', length: 50, name: 'containerNumber' })
containerNumber: string;
```

## 正确的解决方案（待执行）

执行 SQL 脚本 `backend/migrations/fix-container-number-column.sql`，将数据库列名改回 `container_number`，然后从实体定义中删除 `name: 'containerNumber'` 映射。

## 迁移脚本位置

`backend/migrations/fix-container-number-column.sql`

## 影响的实体

1. `backend/src/entities/EmptyReturn.ts`
2. `backend/src/entities/ContainerStatusEvent.ts`

## 执行步骤

1. 执行 SQL 迁移脚本修复数据库列名
2. 从实体定义中删除 `name: 'containerNumber'` 属性
3. 重启后端服务
4. 验证统计卡片功能正常
