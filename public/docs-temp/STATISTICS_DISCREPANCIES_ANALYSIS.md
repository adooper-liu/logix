## 统计数据差异问题分析与修复方案

### 问题描述

用户报告以下统计差异：

1. **3天内预计到港**：显示46，实际只有22条
2. **7天内预计到港**：显示15，实际只有3条
3. **已逾期未到港**：显示34，实际有42条
4. **今日之前到港已提柜**：应该有173，结果显示空

### 问题分析

#### 问题1-3：ETA分组统计差异的根本原因

**核心问题**：ETA分组查询缺少 `port_sequence` 过滤

在 `containerStatistics.service.ts` 中，以下查询方法都存在此问题：

1. `getWithin3Days()` - 3日内预计到港
2. `getWithin7Days()` - 7日内预计到港
3. `getOver7Days()` - 7日后预计到港
4. `getOtherRecords()` - 其他记录（无ETA）

这些方法只筛选了 `port_type = 'destination'`，但没有筛选每个货柜的**主要目的港**（即 `port_sequence` 最大的那条记录）。

**示例问题场景**：

假设货柜 C001 有以下港口操作记录：

| container_number | port_type | port_sequence | eta_dest_port |
|-----------------|-----------|---------------|---------------|
| C001            | destination | 1           | 2026-03-05    |
| C001            | destination | 2           | 2026-03-10    |

- 主要目的港：port_sequence=2，ETA=2026-03-10
- 如果今天是 2026-03-01，那么 C001 应该归类到"7日内预计到港"
- 但现有查询会同时统计两条记录，导致计数错误

**修复方案**：

在所有ETA分组的子查询中添加 `port_sequence` 过滤：

```sql
SELECT DISTINCT po1.container_number
FROM process_port_operations po1
WHERE po1.port_type = 'destination'
AND po1.ata_dest_port IS NULL
AND po1.eta_dest_port IS NOT NULL
AND po1.eta_dest_port >= '${todayStr}'
AND po1.eta_dest_port <= '${threeDaysStr}'
AND po1.port_sequence = (
  SELECT MAX(po2.port_sequence)
  FROM process_port_operations po2
  WHERE po2.container_number = po1.container_number
  AND po2.port_type = 'destination'
)
```

#### 问题4：今日之前到港已提柜显示为空

**可能原因**：

1. 前端显示问题
2. 后端返回的数据格式问题
3. 数据确实为空（at_port状态的货柜没有在"今日之前到港"中）

**分析**：

根据用户报告：
- 已到目的港状态（at_port）有92条
- 今日之前到港未提柜只有46条
- 差异：92 - 46 = 46条

这46条货柜可能是：
1. 今日到港的货柜
2. 没有ATA记录但状态为at_port的货柜
3. ATA在今天的货柜

### 修复代码

需要修改以下4个方法：

#### 1. getWithin3Days()

```typescript
// 在第552-563行，修改子查询
.innerJoin(
  `(
    SELECT DISTINCT po1.container_number
    FROM process_port_operations po1
    WHERE po1.port_type = 'destination'
    AND po1.ata_dest_port IS NULL
    AND po1.eta_dest_port IS NOT NULL
    AND po1.eta_dest_port >= '${todayStr}'
    AND po1.eta_dest_port <= '${threeDaysStr}'
    AND po1.port_sequence = (
      SELECT MAX(po2.port_sequence)
      FROM process_port_operations po2
      WHERE po2.container_number = po1.container_number
      AND po2.port_type = 'destination'
    )
  )`,
  'dest_po',
  'dest_po.container_number = container.containerNumber'
)
```

#### 2. getWithin7Days()

```typescript
// 在第599-611行，修改子查询
.innerJoin(
  `(
    SELECT DISTINCT po1.container_number
    FROM process_port_operations po1
    WHERE po1.port_type = 'destination'
    AND po1.ata_dest_port IS NULL
    AND po1.eta_dest_port IS NOT NULL
    AND po1.eta_dest_port > '${threeDaysStr}'
    AND po1.eta_dest_port <= '${sevenDaysStr}'
    AND po1.port_sequence = (
      SELECT MAX(po2.port_sequence)
      FROM process_port_operations po2
      WHERE po2.container_number = po1.container_number
      AND po2.port_type = 'destination'
    )
  )`,
  'dest_po',
  'dest_po.container_number = container.containerNumber'
)
```

#### 3. getOver7Days()

```typescript
// 在第642-655行，修改子查询
.innerJoin(
  `(
    SELECT DISTINCT po1.container_number
    FROM process_port_operations po1
    WHERE po1.port_type = 'destination'
    AND po1.ata_dest_port IS NULL
    AND po1.eta_dest_port IS NOT NULL
    AND po1.eta_dest_port > '${sevenDaysStr}'
    AND po1.port_sequence = (
      SELECT MAX(po2.port_sequence)
      FROM process_port_operations po2
      WHERE po2.container_number = po1.container_number
      AND po2.port_type = 'destination'
    )
  )`,
  'dest_po',
  'dest_po.container_number = container.containerNumber'
)
```

#### 4. getOtherRecords()

```typescript
// 在第683-693行，修改子查询
.innerJoin(
  `(
    SELECT po1.container_number
    FROM process_port_operations po1
    WHERE po1.port_type = 'destination'
    AND po1.ata_dest_port IS NULL
    AND po1.eta_dest_port IS NULL
    AND po1.port_sequence = (
      SELECT MAX(po2.port_sequence)
      FROM process_port_operations po2
      WHERE po2.container_number = po1.container_number
      AND po2.port_type = 'destination'
    )
  )`,
  'dest_po',
  'dest_po.container_number = container.containerNumber'
)
```

### 验证SQL

在应用修复后，运行以下SQL验证结果：

```sql
-- 验证ETA分组是否正确统计主要目的港
SELECT 
    'ETA分组统计验证' as test_name,
    COUNT(*) as count
FROM (
    SELECT DISTINCT po1.container_number
    FROM process_port_operations po1
    WHERE po1.port_type = 'destination'
    AND po1.ata_dest_port IS NULL
    AND po1.eta_dest_port IS NOT NULL
    AND po1.port_sequence = (
        SELECT MAX(po2.port_sequence)
        FROM process_port_operations po2
        WHERE po2.container_number = po1.container_number
        AND po2.port_type = 'destination'
    )
) sub;

-- 查看有多个destination港口记录的货柜
SELECT 
    container_number,
    COUNT(*) as dest_port_count,
    STRING_AGG(port_sequence::text, ',' ORDER BY port_sequence) as sequences,
    STRING_AGG(eta_dest_port::text, ',' ORDER BY port_sequence) as etas
FROM process_port_operations
WHERE port_type = 'destination'
AND ata_dest_port IS NULL
AND eta_dest_port IS NOT NULL
GROUP BY container_number
HAVING COUNT(*) > 1
LIMIT 10;
```

### 预期结果

应用修复后：
- 3天内预计到港：应该与实际查询结果一致
- 7天内预计到港：应该与实际查询结果一致
- 已逾期未到港：应该与实际查询结果一致
- 今日之前到港已提柜：需要检查前端显示逻辑

### 相关记忆更新

根据记忆规则，需要更新以下记忆：

1. **港口操作统计规则**：已确认只统计目的港类型，排除中转港
2. **主要目的港定义**：port_type='destination' 中 port_sequence 最大的记录

需要更新记忆，确保所有ETA分组查询都包含 port_sequence 过滤。
