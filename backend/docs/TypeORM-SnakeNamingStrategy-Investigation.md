# TypeORM SnakeNamingStrategy 深度调查报告

## 问题概述

TypeORM 生成的 SQL 查询使用了 camelCase 列名，但数据库中的列名是 snake_case，导致查询失败。

### 错误信息

```sql
SELECT "Container"."containerNumber" AS "Container_containerNumber", ...
FROM "biz_containers" "Container" LIMIT 1000
```

错误：`column Container.containerNumber does not exist`

### 预期行为

```sql
SELECT "Container"."container_number" AS "Container_container_number", ...
FROM "biz_containers" "Container" LIMIT 1000
```

## 调查结果

### 1. TypeORM 版本

- **版本**：0.3.20
- **驱动**：pg 8.11.3

### 2. SnakeNamingStrategy 配置

- **配置位置**：`backend/src/database/index.ts`
- **配置方式**：`naming: new SnakeNamingStrategy()`
- **实现方式**：继承 `DefaultNamingStrategy` 并实现 `NamingStrategyInterface`

### 3. snakeCase 导入路径

```typescript
import { snakeCase } from 'typeorm/util/StringUtils';
```

**验证**：✅ 导入路径正确（TypeORM 0.3.x 标准路径）

### 4. 命名策略验证

```typescript
const testColumnName = namingStrategy.columnName('orderNumber', '', []);
// 结果：'order_number'
```

**验证**：✅ `columnName` 方法在初始化时被正确调用

### 5. 数据库配置

- **同步模式**：`synchronize: true`
- **日志模式**：`logging: true`
- **连接池**：`poolMax: 10, poolMin: 2`

### 6. 实体定义

```typescript
@Entity('biz_containers')
export class Container {
  @PrimaryColumn({ type: 'varchar', length: 50, name: 'container_number' })
  containerNumber!: string;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'order_number' })
  orderNumber!: string;

  // ... 其他列
}
```

**注意**：目前为所有列显式指定了 `name` 属性（违反规范）

### 7. 数据库表结构

```sql
CREATE TABLE IF NOT EXISTS biz_containers (
    container_number VARCHAR(50) PRIMARY KEY,
    order_number VARCHAR(50) NOT NULL,
    container_type_code VARCHAR(10) NOT NULL,
    -- ... 其他列
);
```

**验证**：✅ 数据库列名是 snake_case

### 8. 查询方式

#### 问题查询（失败）

```typescript
const containers = await this.containerRepository.find({
  take: limit
});
```

生成的 SQL：
```sql
SELECT "Container"."containerNumber" AS "Container_containerNumber", ...
FROM "biz_containers" "Container" LIMIT 1000
```

#### QueryBuilder 查询（也失败）

```typescript
const containers = await this.containerRepository
  .createQueryBuilder('container')
  .limit(limit)
  .getMany();
```

生成的 SQL：
```sql
SELECT "container"."containerNumber" AS "container_containerNumber", ...
FROM "biz_containers" "container" LIMIT 1000
```

## 根本原因分析

### 可能原因 1：TypeORM 元数据缓存问题

**假设**：TypeORM 的元数据缓存了错误的列名映射。

**调查**：
- 没有配置 `metadataCache`
- 重启后端服务，问题仍然存在
- 清理 `dist` 目录，问题仍然存在

**结论**：❌ 不是元数据缓存问题

### 可能原因 2：SnakeNamingStrategy 没有正确应用

**假设**：SnakeNamingStrategy 在查询时没有被调用。

**调查**：
- 命名策略验证成功（`orderNumber` → `order_number`）
- 但生成的 SQL 仍然使用 camelCase 列名

**结论**：❌ 不是命名策略配置问题

### 可能原因 3：TypeORM 0.3.x 版本的 bug

**假设**：TypeORM 0.3.20 存在一个 bug，导致 SnakeNamingStrategy 在某些情况下不生效。

**调查**：
- 搜索 GitHub Issues，没有找到完全相同的问题
- 搜索 Stack Overflow，没有找到相关解决方案

**结论**：❓ 可能是 TypeORM 的 bug，但需要进一步验证

### 可能原因 4：实体定义与数据库表结构不匹配

**假设**：TypeORM 的 `synchronize` 模式尝试修改表结构，但表结构是通过 SQL 脚本创建的。

**调查**：
- `DB_SYNCHRONIZE=true`，但数据库表是通过 SQL 脚本创建的
- 这可能导致 TypeORM 的元数据与实际表结构不一致

**结论**：❓ 可能是问题的根源

### 可能原因 5：TypeORM QueryBuilder 的实现问题

**假设**：TypeORM QueryBuilder 在生成 SQL 时，使用了实体属性名而不是数据库列名。

**调查**：
- 查询生成的 SQL 使用了 camelCase 列名（`containerNumber`）
- 这与数据库列名（`container_number`）不匹配

**结论**：❓ 可能是问题的根源

## 临时解决方案

### 方案 1：显式指定列名（已实施）

为所有 `@Column` 显式指定 snake_case 的列名：

```typescript
@Column({ type: 'varchar', length: 50, name: 'container_number' })
containerNumber!: string;
```

**优点**：
- 能够解决当前问题
- 不会影响其他功能

**缺点**：
- 违反开发规范
- 需要为所有实体手动指定列名
- 维护成本高

### 方案 2：禁用同步模式

```typescript
synchronize: false
```

**优点**：
- 避免表结构冲突
- 完全依赖 SQL 脚本管理表结构

**缺点**：
- 需要手动管理表结构变更
- 失去 TypeORM 的自动同步功能

### 方案 3：降级 TypeORM 版本

尝试降级到 TypeORM 0.3.19 或更早版本。

**优点**：
- 可能修复 bug

**缺点**：
- 可能引入其他问题
- 需要测试兼容性

## 长期解决方案

### 方案 1：报告 TypeORM Bug

如果确认是 TypeORM 的 bug，应该在 GitHub 上报告：

https://github.com/typeorm/typeorm/issues

### 方案 2：使用第三方命名策略库

使用 `typeorm-naming-strategies` 库：

```bash
npm install typeorm-naming-strategies
```

```typescript
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

naming: new SnakeNamingStrategy()
```

**优点**：
- 更成熟的实现
- 社区广泛使用

**缺点**：
- 增加依赖
- 需要测试兼容性

### 方案 3：重命名数据库表结构

将数据库表结构改为 camelCase，以匹配 TypeORM 的默认行为。

**优点**：
- 不需要修改代码
- 符合 JavaScript/TypeScript 命名习惯

**缺点**：
- 违反数据库命名规范
- 需要迁移现有数据
- 影响其他依赖表结构的系统

## 下一步行动

1. **短期**：继续使用显式指定列名的方案
2. **中期**：尝试使用 `typeorm-naming-strategies` 库
3. **长期**：
   - 调查 TypeORM 0.3.20 的具体问题
   - 考虑报告 TypeORM Bug
   - 评估升级或降级 TypeORM 版本

## 相关文件

- `backend/src/database/index.ts` - 数据库配置
- `backend/src/config/SnakeNamingStrategy.ts` - 命名策略实现
- `backend/src/entities/Container.ts` - Container 实体
- `backend/.env` - 环境变量配置

## 记录日期

2026-03-06
