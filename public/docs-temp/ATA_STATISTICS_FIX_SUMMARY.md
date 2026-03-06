# "今日之前到港未提柜"统计修复总结

## 问题描述

用户报告："今日之前到港未提柜 46 统计有误"

## 根本原因

在 `containerStatistics.service.ts` 中，所有涉及 ATA（实际到港时间）统计的查询都使用了以下子查询模式：

```sql
SELECT po1.container_number, MAX(po1.ata_dest_port) as latest_ata
FROM process_port_operations po1
WHERE po1.port_type = 'destination'
AND po1.ata_dest_port IS NOT NULL
GROUP BY po1.container_number
```

**问题**：这种方式使用 `MAX(ata_dest_port)` + `GROUP BY` 获取每个货柜的最新到港记录，但**没有过滤 port_sequence**，导致：
- 当货柜有多条 destination 记录时，可能统计到非主要目的港
- 与已修复的 ETA 查询（使用 port_sequence 过滤）不一致
- 违反了记忆中的规则：**只统计主要目的港（port_sequence 最大的记录）**

## 修复内容

### 修复的方法列表

**按到港维度（3个方法）：**
1. ✅ `getArrivedToday` - 今日到港
2. ✅ `getArrivedBeforeTodayNotPickedUp` - 今日之前到港未提柜（本次重点）
3. ✅ `getArrivedBeforeTodayPickedUp` - 今日之前到港已提柜

**按计划提柜维度（5个方法）：**
4. ✅ `getOverduePlanned` - 逾期未提柜
5. ✅ `getTodayPlanned` - 今日计划提柜
6. ✅ `getPlannedWithin3Days` - 3天内计划提柜
7. ✅ `getPlannedWithin7Days` - 7天内计划提柜
8. ✅ `getPendingArrangement` - 待安排提柜

### 修复后的子查询模式

```sql
SELECT po1.container_number, po1.ata_dest_port as latest_ata
FROM process_port_operations po1
WHERE po1.port_type = 'destination'
AND po1.ata_dest_port IS NOT NULL
AND po1.port_sequence = (
  SELECT MAX(po2.port_sequence)
  FROM process_port_operations po2
  WHERE po2.container_number = po1.container_number
  AND po2.port_type = 'destination'
)
```

**改进说明：**
- 移除了 `MAX(ata_dest_port)` 和 `GROUP BY`
- 添加了 `port_sequence` 过滤，只选择主要目的港记录
- 每个货柜只返回一条主要目的港记录

## 统计规则总结

### 核心规则
1. **只统计目的港**：`port_type = 'destination'`，排除中转港 `port_type = 'transit'`
2. **只统计主要目的港**：对于多港经停的货柜，只统计 `port_sequence` 最大的 destination 记录
3. **一致性原则**：所有统计维度（按到港、按ETA、按计划提柜）都使用相同的过滤逻辑

### 适用范围
- ✅ 按到港维度统计（ATA相关）
- ✅ 按ETA维度统计（预计到港相关）
- ✅ 按计划提柜维度统计（plannedPickupDate相关）
- ✅ 按最晚提柜/还箱维度统计（lastFreeDate/lastReturnDate相关）

## 相关文档

- 记忆 ID: 19560005 - 港口操作统计规则与主要目的港过滤（完整版）
- `STATISTICS_DISCREPANCIES_ANALYSIS.md` - 之前ETA统计问题分析
- `STATISTICS_FIX_SUMMARY.md` - 之前ETA统计修复总结
- `Shipments 页面子维度数据口径总览_最终版.md` - 业务规则文档

## 验证步骤

1. 重启后端服务使修改生效
2. 刷新前端统计页面
3. 检查"今日之前到港未提柜"数值是否与预期一致
4. 验证所有相关统计维度数据是否正常

## 技术说明

### 为什么不用 MAX(ata_dest_port)？

对于有多港经停的货柜，`MAX(ata_dest_port)` 虽然能获取最新的ATA，但：
1. 可能获取到非主要目的港的ATA
2. 如果多条destination记录有相同ATA，结果不确定
3. 与业务逻辑中的"主要目的港"概念不一致

### 为什么使用 port_sequence？

`port_sequence` 字段明确标识了港口访问顺序：
- 序列号越大，越接近最终目的地
- `port_sequence` 最大的 destination 记录就是主要目的港
- 符合业务语义：只统计最终目的港的状态

## 修复完成时间

2026-03-04

## 修改文件

- `backend/src/services/containerStatistics.service.ts` (修复8个方法)
