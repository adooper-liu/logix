# 还箱节点数据来源修复验证指南

## 问题描述

**现象**：数据库中 `process_empty_return` 表的 `return_time` 字段全部为 `NULL`，但前端物流路径的"还箱"节点显示为"已还空箱"且有日期时间。

**根因**：后端服务在生成物流路径时，使用了以下逻辑：

```typescript
// 修复前（错误）
const returnTs = returnRow?.return_time ?? returnRow?.last_return_date ?? null;
```

这导致当 `return_time` 为 `NULL` 时，系统用 `last_return_date`（最晚还箱日）填充，使前端误显示为"已还空箱"。

## 修复方案

修改 `logistics-path-system/backend/src/services/statusPathFromDb.ts` 第 282 行：

```typescript
// 修复后（正确）
// 还箱节点必须使用实际还箱时间，不能用最晚还箱日填充
const returnTs = returnRow?.return_time ?? null;
```

## 验证步骤

### 1. 检查数据库当前状态

运行 SQL 查询：

```sql
SELECT 
  container_number,
  return_time AS "实际还箱时间",
  last_return_date AS "最晚还箱日",
  CASE 
    WHEN return_time IS NOT NULL THEN '应显示：已还空箱 (return_time)'
    WHEN last_return_date IS NOT NULL THEN '应显示：还箱 缺数据 (return_time 为 NULL)'
    ELSE '应显示：还箱 缺数据 (全无数据)'
  END AS "前端应显示状态"
FROM process_empty_return
ORDER BY container_number
LIMIT 10;
```

### 2. 重启物流路径服务

```bash
# 在物流路径系统目录
cd logistics-path-system
npm restart
```

### 3. 验证前端显示

访问任意货柜的详情页，切换到"物流路径"标签：

**修复前**：
- 还箱节点显示："已还空箱"
- 日期：显示 `last_return_date` 的日期（如 2026/04/03 08:00）
- 状态：COMPLETED（已完成）

**修复后**：
- 还箱节点显示："还箱 缺数据"
- 日期：显示 "—"
- 状态：PENDING（待完成）

### 4. 测试有实际还箱时间的场景

当数据库中存在 `return_time` 时：

```sql
UPDATE process_empty_return 
SET return_time = '2026-04-01 10:30:00'
WHERE container_number = 'CXDU1919549';
```

刷新前端后应显示：
- 还箱节点显示："已还空箱"
- 日期：2026/04/01 10:30:00
- 状态：COMPLETED（已完成）

## 业务影响

### 修复前的问题

1. **数据误导**：用户误以为货柜已实际还箱
2. **状态错误**：物流状态被错误标记为 `RETURNED_EMPTY`
3. **统计偏差**：已还箱统计数据不准确

### 修复后的效果

1. **数据准确**：只有实际还箱时才显示"已还空箱"
2. **状态正确**：未还箱时显示"缺数据"，状态为 PENDING
3. **统计准确**：真实反映货柜还箱情况

## 相关文件

- **后端服务**：`logistics-path-system/backend/src/services/statusPathFromDb.ts`
- **前端组件**：`frontend/src/views/shipments/components/LogisticsPathTab.vue`
- **验证 SQL**：`scripts/verify-return-node-fix.sql`

## 回滚方案

如需回滚（不推荐）：

```typescript
// 恢复为修复前的逻辑
const returnTs = returnRow?.return_time ?? returnRow?.last_return_date ?? null;
```

## 注意事项

1. 此修复仅影响物流路径的显示，不影响关键时间线中的"最晚还箱日"显示
2. 关键时间线仍然正常显示 `last_return_date` 及其倒计时
3. 建议在生产环境验证后，同步更新相关文档

---

**修复时间**：2026-03-31  
**修复人员**：刘志高  
**影响范围**：物流路径 - 还箱节点显示
