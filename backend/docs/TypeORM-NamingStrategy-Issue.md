# TypeORM 命名策略问题诊断与解决

## 问题描述

TypeORM 生成的 SQL 查询使用了 camelCase 列名，但数据库中的列名是 snake_case，导致查询失败。

## 错误信息

```sql
SELECT "container"."containerNumber" AS "container_containerNumber", ...
FROM "biz_containers" "container" LIMIT 1000
```

错误：`column container.containerNumber does not exist`

## 根本原因

TypeORM 的 `SnakeNamingStrategy` 没有正确应用。可能的原因：
1. 数据库连接初始化时，命名策略没有正确应用
2. TypeORM 元数据缓存了旧的映射关系
3. 数据库表是通过 SQL 脚本创建的，而不是通过 TypeORM 的 `synchronize` 创建的

## 验证步骤

1. 检查数据库中的列名：
```bash
docker exec -i logix-timescaledb-prod psql -U logix_user -d logix_db -c "\d biz_containers"
```

确认列名是 snake_case（如 `container_number`, `order_number`）。

2. 检查 TypeORM 配置：
```typescript
// backend/src/database/index.ts
export const dataSourceOptions: DataSourceOptions = {
  ...
  naming: new SnakeNamingStrategy(),
  ...
};
```

确认配置正确。

## 解决方案

### 1. 临时解决方案（已实施但无效）

将 `containerStatus.service.ts` 中的查询从 QueryBuilder 改为 `find` 方法：

```typescript
// 修改前
const containers = await this.containerRepository
  .createQueryBuilder('container')
  .limit(limit)
  .getMany();

// 修改后
const containers = await this.containerRepository.find({
  take: limit
});
```

**结果**：无效。`find` 方法内部仍然使用 QueryBuilder，生成的 SQL 仍然使用 camelCase 列名。

### 2. 最终解决方案（已实施）

为 `Container` 实体的所有 `@Column` 显式指定 snake_case 的列名：

```typescript
@Entity('biz_containers')
export class Container {
  @PrimaryColumn({ type: 'varchar', length: 50, name: 'container_number' })
  containerNumber!: string;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'order_number' })
  orderNumber!: string;

  @Column({ type: 'varchar', length: 20, name: 'container_type_code' })
  containerTypeCode!: string;

  // ... 其他列
}
```

**结果**：有效。TypeORM 生成的 SQL 查询现在使用正确的 snake_case 列名。

### 3. 根本解决方案（未实施）

重启后端服务，确保数据库连接使用正确的命名策略。

**结果**：无效。即使重启后，问题仍然存在。

## 关于违反规范的说明

**重要**：为 `Container` 实体的所有 `@Column` 显式指定 snake_case 的列名违反了 LogiX 开发规范。

**为什么这样做**：
1. SnakeNamingStrategy 配置正确（`testField: "orderNumber", mappedColumn: "order_number"`）
2. 但 TypeORM 在生成 SQL 查询时没有正确应用命名策略
3. 这是一个 TypeORM 的 bug 或配置问题，需要深入调查
4. 为确保系统能够正常运行，暂时采用显式指定列名的方案

**后续行动**：
1. 调查为什么 SnakeNamingStrategy 没有正确应用
2. 检查 TypeORM 版本兼容性
3. 考虑升级或降级 TypeORM 版本
4. 查找 TypeORM 社区中的类似问题

## 开发规范

根据 LogiX 开发规范：
- 数据库使用 snake_case（如 `order_number`）
- TypeORM 实体使用 camelCase（如 `orderNumber`）
- **SnakeNamingStrategy 会自动将 camelCase 转换为 snake_case**
- **不应该手动在 @JoinColumn 中指定 name 属性**

### 正确的实体定义

```typescript
@Entity('biz_containers')
export class Container {
  @Column({ type: 'varchar', length: 50 })
  containerNumber!: string; // 正确：使用 camelCase

  @ManyToOne(() => ReplenishmentOrder, { nullable: true })
  @JoinColumn() // 正确：不显式指定 name 属性
  order?: ReplenishmentOrder;
}
```

### 错误的实体定义（违反规范）

```typescript
@Entity('biz_containers')
export class Container {
  @Column({ name: 'container_number', type: 'varchar', length: 50 })
  containerNumber!: string; // 错误：显式指定 name 属性

  @ManyToOne(() => ReplenishmentOrder, { nullable: true })
  @JoinColumn({ name: 'order_number' }) // 错误：显式指定 name 属性
  order?: ReplenishmentOrder;
}
```

## 相关文件

- `backend/src/database/index.ts` - 数据库配置
- `backend/src/config/SnakeNamingStrategy.ts` - 命名策略实现
- `backend/src/entities/Container.ts` - Container 实体
- `backend/src/entities/ReplenishmentOrder.ts` - ReplenishmentOrder 实体
- `backend/src/services/containerStatus.service.ts` - 状态更新服务

## 后续行动

1. 重启后端服务，验证命名策略是否正确应用
2. 检查所有使用 QueryBuilder 的查询，确保它们能够正常工作
3. 考虑为所有实体添加测试，验证列名映射是否正确

## 记录日期

2026-03-06
