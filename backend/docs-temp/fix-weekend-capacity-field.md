# 移除周末产能字段修复

## 问题描述

在 Phase 2 实施过程中，错误地添加了 `weekend_unload_capacity` 字段，该字段在实际数据库表结构中并不存在。

**问题根源**：
- 实体类 `Warehouse.ts` 中定义了 `weekend_unload_capacity` 字段
- 但 `dict_warehouses` 表结构中只有 `daily_unload_capacity` 字段
- 这是一个"幽灵字段"，会导致 TypeORM 查询错误

## 业务规则

根据实际业务需求：

1. **仓库只需维护日能力** (`daily_unload_capacity`)
2. **周末默认产能为 0**（不工作）
3. **如果周末实际工作**，按实际日能力处理（不需要特殊配置）

## 修复内容

### 1. 实体类修复

**文件**: `backend/src/entities/Warehouse.ts`

**修改前**：
```typescript
@Column({ type: 'int', default: 10, name: 'daily_unload_capacity' })
dailyUnloadCapacity: number;

// ✅ Phase 2: 周末卸柜产能（可选，不配置时使用工作日产能×倍率）
@Column({ type: 'int', nullable: true, name: 'weekend_unload_capacity' })
weekendUnloadCapacity?: number;

@Column({ type: 'text', nullable: true, name: 'remarks' })
remarks?: string;
```

**修改后**：
```typescript
@Column({ type: 'int', default: 10, name: 'daily_unload_capacity' })
dailyUnloadCapacity: number;

@Column({ type: 'text', nullable: true, name: 'remarks' })
remarks?: string;
```

### 2. 产能计算逻辑修复

**文件**: `backend/src/utils/smartCalendarCapacity.ts`

**修改前**：
```typescript
if (isWeekend) {
  // ✅ Phase 2: 周末差异化产能
  // 优先使用 weekendUnloadCapacity，如果没有则使用 weekdayMultiplier 折算
  let weekendCapacity: number;
  
  if (warehouse.weekendUnloadCapacity !== null && warehouse.weekendUnloadCapacity !== undefined) {
    // 仓库配置了周末产能
    weekendCapacity = warehouse.weekendUnloadCapacity;
    log.debug(
      `[SmartCalendar] ${date} weekend capacity for ${warehouseCode}: ${weekendCapacity} (from weekendUnloadCapacity)`
    );
  } else {
    // 使用倍率折算
    const baseCapacity = warehouse.dailyUnloadCapacity || 10;
    weekendCapacity = Math.floor(baseCapacity * config.weekdayMultiplier);
    log.debug(
      `[SmartCalendar] ${date} weekend capacity for ${warehouseCode}: ${baseCapacity} × ${config.weekdayMultiplier} = ${weekendCapacity}`
    );
  }
  
  return weekendCapacity;
}
```

**修改后**：
```typescript
if (isWeekend) {
  // 周末产能为 0
  log.debug(
    `[SmartCalendar] ${date.toISOString().split('T')[0]} is weekend, capacity=0 for ${warehouseCode}`
  );
  return 0;
}
```

### 3. 注释更新

**文件**: `backend/src/utils/smartCalendarCapacity.ts`

**修改前**：
```typescript
/**
 * 计算仓库在指定日期的能力
 * 
 * 支持：
 * - 工作日：使用 dailyUnloadCapacity
 * - 周末：使用 weekendUnloadCapacity（如果配置）
 * - 节假日：容量为 0
 */
```

**修改后**：
```typescript
/**
 * 计算仓库在指定日期的能力
 * 
 * 支持：
 * - 工作日：使用 dailyUnloadCapacity
 * - 周末：容量为 0
 * - 节假日：容量为 0
 */
```

### 4. 前端文档修复

**文件**: `frontend/public/docs/11-project/16-预览排产优化方案.md`

**修改前**：
```typescript
const isWeekend = date.getDay() === 0 || date.getDay() === 6
if (isWeekend) {
  return warehouse.weekendUnloadCapacity || 0 // 周末可能休息
}
```

**修改后**：
```typescript
const isWeekend = date.getDay() === 0 || date.getDay() === 6
if (isWeekend) {
  return 0 // 周末产能为 0
}
```

### 5. 删除错误的迁移脚本

**已删除文件**: `migrations/scheduling/add_weekend_unload_capacity_to_warehouses.sql`

该迁移脚本试图添加不存在的字段，已删除。

## 验证步骤

### 1. 检查实体类

```bash
# 确认 Warehouse 实体不再包含 weekend_unload_capacity
grep -n "weekend_unload_capacity" backend/src/entities/Warehouse.ts
# 应该无输出
```

### 2. 检查产能计算逻辑

```bash
# 确认 smartCalendarCapacity.ts 中周末返回 0
grep -A 3 "if (isWeekend)" backend/src/utils/smartCalendarCapacity.ts
# 应该看到 return 0
```

### 3. 编译检查

```bash
cd backend
npm run build
# 应该无编译错误
```

### 4. 运行时验证

启动后端服务后，测试排产功能：

```bash
# 启动后端
npm run start:dev

# 测试排产 API
curl -X POST http://localhost:3001/api/v1/scheduling/preview \
  -H "Content-Type: application/json" \
  -d '{"containers": ["CONT001"]}'
```

## 影响范围

### 不受影响（向后兼容）

- 现有仓库数据不受影响
- `daily_unload_capacity` 字段正常工作
- 智能排产逻辑正常工作

### 行为变更

- **周末排产**：周末产能统一为 0，不再尝试读取不存在的字段
- **简化逻辑**：移除了复杂的倍率计算逻辑

## 经验教训

### 开发规范

1. **数据库表结构是唯一基准**
   - 实体类必须严格对应数据库表结构
   - 新增字段必须先修改 SQL 表结构

2. **禁止临时补丁修数据**
   - 发现字段不存在时，应该删除错误数据 → 修映射/逻辑 → 重新导入
   - 禁止用幽灵字段修补

3. **开发顺序**
   - 数据库表设计 (SQL) → TypeORM 实体 (TS) → 后端 API(TS) → 前端对接 (Vue/TS)
   - 本次违反了该顺序，直接在实体中添加了不存在的字段

### 验证清单

在提交代码前，应该检查：

- [ ] 实体类字段是否在数据库表结构中存在
- [ ] TypeORM 装饰器是否正确映射到数据库字段
- [ ] 是否有编译错误
- [ ] 是否有运行时错误
- [ ] 文档是否与代码一致

## 相关文件

- `backend/src/entities/Warehouse.ts`
- `backend/src/utils/smartCalendarCapacity.ts`
- `frontend/public/docs/11-project/16-预览排产优化方案.md`
- `backend/sql/schema/03_create_tables.sql`

## 参考

- [LogiX 开发准则](./DEVELOPMENT_STANDARDS.md) - 数据库表结构是唯一基准
- [开发顺序规范](./DEVELOPMENT_PARADIGM.md) - SQL → Entity → API → Frontend
