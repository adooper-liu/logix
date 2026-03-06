## 统计数据差异修复总结

### 修复日期
2026-03-04

### 问题描述

用户报告的统计数据差异：

1. **3天内预计到港**：显示46，实际只有22条
2. **7天内预计到港**：显示15，实际只有3条
3. **已逾期未到港**：显示34，实际有42条
4. **今日之前到港已提柜**：应该有173，结果显示空

### 根本原因

**核心问题**：ETA分组查询缺少 `port_sequence` 过滤

在 `containerStatistics.service.ts` 中，以下4个查询方法只筛选了 `port_type = 'destination'`，但没有筛选每个货柜的**主要目的港**（即 `port_sequence` 最大的那条记录）。

影响的方法：
1. `getWithin3Days()` - 3日内预计到港
2. `getWithin7Days()` - 7日内预计到港
3. `getOver7Days()` - 7日后预计到港
4. `getOtherRecords()` - 其他记录（无ETA）

### 问题场景示例

假设货柜 C001 有以下港口操作记录：

| container_number | port_type   | port_sequence | eta_dest_port |
|-----------------|-------------|--------------|---------------|
| C001            | destination | 1            | 2026-03-05    |
| C001            | destination | 2            | 2026-03-10    |

- **主要目的港**：port_sequence=2，ETA=2026-03-10
- 如果今天是 2026-03-01，那么 C001 应该归类到"7日内预计到港"
- 但旧查询会同时统计两条记录，导致计数错误：
  - port_sequence=1 的记录会被归类到"3日内预计到港"（错误）
  - port_sequence=2 的记录会被归类到"7日内预计到港"（正确）
  - 结果：该货柜被重复计数或错误归类

### 修复方案

在所有ETA分组的子查询中添加 `port_sequence` 过滤，确保只统计主要目的港：

```sql
AND po1.port_sequence = (
  SELECT MAX(po2.port_sequence)
  FROM process_port_operations po2
  WHERE po2.container_number = po1.container_number
  AND po2.port_type = 'destination'
)
```

### 修复的代码位置

**文件**：`d:/Gihub/logix/backend/src/services/containerStatistics.service.ts`

1. **getWithin3Days()** (第552-565行)
   - 修改子查询，添加 port_sequence 过滤

2. **getWithin7Days()** (第606-619行)
   - 修改子查询，添加 port_sequence 过滤

3. **getOver7Days()** (第656-669行)
   - 修改子查询，添加 port_sequence 过滤

4. **getOtherRecords()** (第702-715行)
   - 修改子查询，添加 port_sequence 过滤

### 验证方法

修复后，可以通过以下方式验证：

1. **前端统计数据**：刷新统计页面，查看各维度数据是否与实际查询结果一致

2. **SQL验证**：
   ```sql
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

3. **数据一致性检查**：
   - 3天内预计到港 + 7天内预计到港 + 7日后预计到港 + 已逾期未到港 + 其他记录 = 总ETA分组数
   - ETA分组数 ≤ 在途货柜总数 (shipped + in_transit + at_port)

### 预期结果

修复后，所有ETA分组统计应该：
- 只统计主要目的港（port_sequence最大的destination记录）
- 避免一个货柜有多条destination记录时的重复计数
- 与实际查询结果完全一致

### 相关记忆更新

已更新记忆（ID: 19560005）：
- 港口操作统计规则：只统计目的港类型(port_type='destination')的记录，必须排除中转港(port_type='transit')的记录
- 对于有多港经停的货柜，只统计主要目的港（port_type='destination'中port_sequence最大的记录）
- 此规则已在containerStatistics.service.ts中的所有ETA分组查询中实现

### 注意事项

1. **port_sequence 的定义**：
   - 同一货柜在多个港口的访问顺序
   - 主要目的港 = port_type='destination' 且 port_sequence 最大的记录
   - 此规则确保多港经停场景下只统计最终目的港

2. **状态筛选**：
   - ETA分组只包含 shipped/in_transit/at_port 状态
   - 这是业务规则，与 ATA 分组不同

3. **ATA分组不受影响**：
   - ATA分组查询已经使用了 `MAX(po1.ata_dest_port)` 聚合
   - 不会受到多港经停的影响

### 其他问题说明

**问题4：今日之前到港已提柜显示为空**

此问题可能是：
1. 前端显示问题（需要检查前端代码）
2. 后端返回的数据格式问题
3. 数据确实为空（需要检查具体数据）

此问题未在此次修复中处理，需要进一步调查。

建议的检查方法：
- 查看"今日之前到港已提柜"的子查询是否正确执行
- 检查前端 `StatisticsVisualization.vue` 中是否正确显示该字段
- 对比后端返回的原始数据和前端显示的数据

### 文件修改清单

- [x] `backend/src/services/containerStatistics.service.ts` - 修复ETA分组查询
- [x] `public/docs-temp/STATISTICS_DISCREPANCIES_ANALYSIS.md` - 问题分析文档
- [x] `public/docs-temp/STATISTICS_FIX_SUMMARY.md` - 修复总结（本文档）
- [x] Memory update (ID: 19560005) - 更新港口统计规则记忆

### 后续行动

1. 重启后端服务使修改生效
2. 刷新前端统计页面验证修复结果
3. 如有差异，使用提供的SQL进行进一步诊断
4. 调查"今日之前到港已提柜"显示为空的问题
