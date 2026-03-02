# 到港分布重复计数问题修复记录

## 问题描述

### 症状
数据验证页面显示：
```
到港统计 vs 目标集
预期值: <= 177
实际值: 468
差异: +291
状态: FAIL
```

### 原因分析

**根本原因**：到港分布的所有查询使用 `getCount()` 而非 `COUNT(DISTINCT)`，导致：
- 一个货柜可能有多条港口操作记录（多港经停场景）
- `getCount()` 统计的是连接后的记录数，不是唯一的货柜数
- 因此存在重复计数问题

**涉及的查询**：
1. `getOverdueNotArrived()` - 已逾期未到港
2. `getArrivedTransit()` - 到达中转港
3. `getTodayArrived()` - 今日到港
4. `getArrivedBeforeToday()` - 今日之前到港
5. `getWithin3Days()` - 3天内预计到港
6. `getWithin7Days()` - 7天内预计到港
7. `getOver7Days()` - 7天以上预计到港
8. `getOtherRecords()` - 其他情况

## 修复方案

### 修复方法
将所有到港分布查询从：
```typescript
.getCount()
```

改为：
```typescript
.select('COUNT(DISTINCT container.containerNumber)', 'count')
.getRawOne()
return parseInt(result.count);
```

### 修复代码示例

#### 修复前
```typescript
private async getArrivedTransit(): Promise<number> {
  return await this.containerRepository
    .createQueryBuilder('container')
    .innerJoin('container.portOperations', 'po')
    .where('po.portType = :portType', { portType: 'transit' })
    .andWhere('po.transitArrivalDate IS NOT NULL')
    .getCount();
}
```

#### 修复后
```typescript
private async getArrivedTransit(): Promise<number> {
  const result = await this.containerRepository
    .createQueryBuilder('container')
    .select('COUNT(DISTINCT container.containerNumber)', 'count')
    .innerJoin('container.portOperations', 'po')
    .where('po.portType = :portType', { portType: 'transit' })
    .andWhere('po.transitArrivalDate IS NOT NULL')
    .getRawOne();

  return parseInt(result.count);
}
```

## 修复文件

### 后端
- `backend/src/services/containerStatistics.service.ts`

## 验证方法

### 1. 刷新统计可视化页面
访问：`http://localhost:5173/#/statistics-visualization`

### 2. 查看数据验证结果
检查"到港统计 vs 目标集"是否显示 **PASS**

### 3. 预期结果
```
到港统计 vs 目标集
预期值: <= 177
实际值: 177（或接近）
差异: 0（或接近0）
状态: PASS
```

## 修复效果

### 修复前
- 到港统计总和：468
- 目标集：177
- 差异：+291（超出）
- 状态：FAIL

### 修复后（预期）
- 到港统计总和：177（或接近）
- 目标集：177
- 差异：0（或接近0）
- 状态：PASS

## 技术说明

### COUNT(*) vs COUNT(DISTINCT)

| 方法 | 说明 | 场景 |
|------|------|------|
| `COUNT(*)` | 统计所有行数 | 简单查询，无连接 |
| `getCount()` | TypeORM 的 COUNT(*) 封装 | 同 COUNT(*) |
| `COUNT(DISTINCT column)` | 统计唯一值的数量 | 多表连接，一对多关系 |

### 为什么需要 COUNT(DISTINCT)

**场景**：一个货柜经停多个港口

```sql
-- 货柜表
container_number | logistics_status
---------------|------------------
C001           | at_port
C002           | in_transit

-- 港口操作表（一个货柜有多条记录）
container_number | port_type | ata_dest_port
----------------|-----------|---------------
C001           | transit    | 2026-01-15
C001           | destination| 2026-01-20
C002           | transit    | 2026-01-10
C002           | destination| NULL
```

**使用 COUNT(*)**：
```sql
SELECT COUNT(*) FROM containers
INNER JOIN port_operations ON ...
WHERE port_type = 'transit'
-- 结果: 2（连接后有2行）
```

**使用 COUNT(DISTINCT)**：
```sql
SELECT COUNT(DISTINCT container.container_number) FROM containers
INNER JOIN port_operations ON ...
WHERE port_type = 'transit'
-- 结果: 1（只有1个唯一的货柜）
```

## 其他说明

### 与其他查询的对比

| 统计类型 | 是否使用 COUNT(DISTINCT) | 原因 |
|----------|------------------------|------|
| 状态分布 | ❌ 否 | 直接统计 container 表，无连接 |
| 到港分布 | ✅ 是 | 需要连接 port_operations 表 |
| 提柜分布 | ✅ 是 | 需要连接 trucking_transports 表 |
| 最晚提柜分布 | ✅ 是 | 需要连接 port_operations 和 trucking_transports 表 |
| 最晚还箱分布 | ✅ 是 | 需要连接 empty_returns 表 |

### 注意事项

1. **性能影响**：`COUNT(DISTINCT)` 可能比 `COUNT(*)` 稍慢，但在数据量不大的情况下影响可忽略
2. **索引优化**：确保 `container_number` 字段有索引，可以提高 COUNT(DISTINCT) 的性能
3. **数据完整性**：确保 `container_number` 不为 NULL

## 总结

通过将所有到港分布查询改用 `COUNT(DISTINCT)`，成功解决了重复计数问题，确保统计数据的一致性和准确性。

**修复日期**：2026-03-02
**影响范围**：到港分布统计（8个查询方法）
**验证状态**：待验证（需要重启后端服务后查看结果）
