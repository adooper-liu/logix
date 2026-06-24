---
name: database-query
description: TypeORM 数据库查询最佳实践 - 性能优化、N+1问题解决、批量操作
version: 1.0.0
updated: 2026-06-23
trigger: manual
tags: [typeorm, database, query, performance]
---

# TypeORM 数据库查询最佳实践

## 核心原则

**所有数据库查询必须考虑性能影响，禁止 N+1 查询，优先使用批量操作。**

---

## 1. 避免 N+1 查询问题

### ❌ 错误：循环中执行查询

```typescript
// 每次循环都执行一次 SELECT
for (const container of containers) {
  const events = await this.eventRepo.find({
    where: { containerNumber: container.containerNumber }
  });
  container.events = events;
}
// 结果：1 + N 次查询（N=containers.length）
```

### ✅ 正确：使用 IN 查询批量加载

```typescript
// 方案1：单次 IN 查询
const containerNumbers = containers.map(c => c.containerNumber);
const allEvents = await this.eventRepo.find({
  where: { containerNumber: In(containerNumbers) }
});

// 按 containerNumber 分组
const eventsByContainer = groupBy(allEvents, 'containerNumber');

// 关联数据
containers.forEach(container => {
  container.events = eventsByContainer[container.containerNumber] || [];
});
// 结果：仅 2 次查询
```

### ✅ 正确：使用 JOIN 预加载

```typescript
// 方案2：LEFT JOIN 一次性加载
const containers = await this.containerRepo
  .createQueryBuilder('container')
  .leftJoinAndSelect('container.events', 'events')
  .where('container.id IN (:...ids)', { ids })
  .getMany();
// 结果：仅 1 次查询（带 JOIN）
```

---

## 2. QueryBuilder 最佳实践

### 选择字段（避免 SELECT *）

```typescript
// ❌ 错误：加载所有字段
const containers = await this.containerRepo.find({
  where: { status: 'active' }
});

// ✅ 正确：只选择需要的字段
const containers = await this.containerRepo
  .createQueryBuilder('container')
  .select([
    'container.id',
    'container.containerNumber',
    'container.status',
    'container.eta_dest_port'
  ])
  .where('container.status = :status', { status: 'active' })
  .getMany();
```

### 条件查询构建

```typescript
// ✅ 动态条件查询
const query = this.containerRepo
  .createQueryBuilder('container')
  .select(['container.id', 'container.containerNumber']);

// 可选条件1：日期范围
if (startDate && endDate) {
  query.andWhere('container.actual_ship_date BETWEEN :start AND :end', {
    start: startDate,
    end: endDate
  });
}

// 可选条件2：状态筛选
if (status) {
  query.andWhere('container.logistics_status = :status', { status });
}

// 可选条件3：关键词搜索
if (keyword) {
  query.andWhere(
    '(container.container_number LIKE :kw OR container.bill_of_lading_number LIKE :kw)',
    { kw: `%${keyword}%` }
  );
}

// 分页
query.skip((page - 1) * pageSize).take(pageSize);

const [containers, total] = await query.getManyAndCount();
```

### 聚合查询

```typescript
// ✅ 统计查询
const stats = await this.containerRepo
  .createQueryBuilder('container')
  .select('COUNT(*)', 'total')
  .addSelect('SUM(CASE WHEN container.logistics_status = :urgent THEN 1 ELSE 0 END)', 'urgent_count')
  .addSelect('SUM(CASE WHEN container.logistics_status = :warning THEN 1 ELSE 0 END)', 'warning_count')
  .setParameter('urgent', 'urgent')
  .setParameter('warning', 'warning')
  .where('container.actual_ship_date BETWEEN :start AND :end', {
    start: startDate,
    end: endDate
  })
  .getRawOne();

// 返回：{ total: 100, urgent_count: 10, warning_count: 25 }
```

---

## 3. 批量操作优化

### 批量插入

```typescript
// ❌ 错误：逐条插入
for (const container of containers) {
  await this.containerRepo.save(container);
}
// 结果：N 次 INSERT

// ✅ 正确：批量插入
await this.containerRepo.save(containers);
// 结果：1 次批量 INSERT（TypeORM 自动优化）

// ✅ 更优：使用 insert() 跳过实体生命周期钩子
await this.containerRepo.insert(containers);
// 结果：1 次原生 INSERT（更快，但不触发 @BeforeInsert 等钩子）
```

### 批量更新

```typescript
// ❌ 错误：逐条更新
for (const container of containers) {
  await this.containerRepo.update(container.id, { status: 'processed' });
}

// ✅ 正确：单次 UPDATE ... WHERE IN
await this.containerRepo
  .createQueryBuilder()
  .update(Container)
  .set({ status: 'processed' })
  .where('id IN (:...ids)', { ids: containerIds })
  .execute();
```

### 事务处理

```typescript
// ✅ 批量操作必须在事务中
await this.dataSource.transaction(async (manager) => {
  // 1. 删除旧数据
  await manager.delete(ContainerEvent, { containerNumber });
  
  // 2. 插入新数据
  await manager.save(ContainerEvent, newEvents);
  
  // 3. 更新容器状态
  await manager.update(Container, 
    { containerNumber }, 
    { logistics_status: 'updated' }
  );
});
// 任何一步失败都会回滚
```

---

## 4. 性能监控与调试

### 启用查询日志（开发环境）

```typescript
// backend/src/config/database.ts
{
  type: 'postgres',
  logging: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
  maxQueryExecutionTime: 1000, // 慢查询阈值（毫秒）
}
```

### 检查生成的 SQL

```typescript
// 查看实际执行的 SQL
const sql = this.containerRepo
  .createQueryBuilder('container')
  .where('container.status = :status', { status: 'active' })
  .getSql();

console.log(sql);
// SELECT "container"."id" AS "container_id", ... FROM "biz_containers" "container" WHERE "container"."status" = $1
```

### 性能检查清单

生成查询代码后自检：

- [ ] 是否避免了 N+1 查询？（循环中无数据库操作）
- [ ] 是否使用了 SELECT 限制字段？（避免 SELECT *）
- [ ] 批量操作是否在事务中？
- [ ] 是否有适当的索引支持 WHERE/JOIN 条件？
- [ ] 分页查询是否使用了 skip/take？
- [ ] 大数据量是否考虑了流式处理（QueryBuilder.stream()）？

---

## 5. 常见陷阱

### 陷阱1：懒加载导致 N+1

```typescript
// ❌ Entity 定义
@Entity('biz_containers')
export class Container {
  @OneToMany(() => ContainerEvent, event => event.container)
  events: ContainerEvent[]; // 懒加载
}

// ❌ 访问时触发 N+1
const containers = await this.containerRepo.find();
containers.forEach(c => {
  console.log(c.events); // 每次访问都执行 SELECT
});

// ✅ 解决方案1：eager 加载
@OneToMany(() => ContainerEvent, event => event.container, { eager: true })
events: ContainerEvent[];

// ✅ 解决方案2：显式 JOIN
const containers = await this.containerRepo
  .createQueryBuilder('container')
  .leftJoinAndSelect('container.events', 'events')
  .getMany();
```

### 陷阱2：忘记添加索引

```sql
-- ❌ 高频查询字段未加索引
SELECT * FROM biz_containers WHERE container_number = 'ABC123';

-- ✅ 添加索引
CREATE INDEX idx_containers_number ON biz_containers(container_number);
CREATE INDEX idx_containers_status ON biz_containers(logistics_status);
CREATE INDEX idx_containers_ship_date ON biz_containers(actual_ship_date);
```

### 陷阱3：大事务锁表

```typescript
// ❌ 长时间持有事务锁
await this.dataSource.transaction(async (manager) => {
  const containers = await manager.find(Container); // 锁定全表
  
  // 耗时操作（外部 API 调用）
  for (const container of containers) {
    await fetchExternalData(container); // 慢！阻塞其他事务
  }
});

// ✅ 缩短事务时间
const containers = await this.containerRepo.find(); // 非事务查询

const results = await Promise.all(
  containers.map(c => fetchExternalData(c)) // 并行外部调用
);

// 仅在必要时使用短事务
await this.dataSource.transaction(async (manager) => {
  await manager.save(Container, updatedContainers); // 快速写入
});
```

---

## 6. 参考资源

- TypeORM 官方文档：https://typeorm.io/select-query-builder
- 项目现有查询示例：`backend/src/services/*.service.ts`
- 性能分析工具：`backend/scripts/performance-analyzer.ts`

---

**适用场景**：
- 编写新的数据库查询逻辑
- 优化现有查询性能
- 解决 N+1 查询问题
- 批量数据处理

**相关 Skills**：
- `logix-code-quality-check` - 代码质量检查
- `logix-business-knowledge` - 业务知识与表结构
