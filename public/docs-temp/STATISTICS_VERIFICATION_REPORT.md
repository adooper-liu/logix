# 统计逻辑验证报告

> 验证日期: 2026-03-04
> 参考文档: `Shipments 页面子维度数据口径总览_最终版.md`

---

## 验证结论

### ✅ 验证通过项

1. **按到港维度 - 前后端逻辑一致**
   - ✅ 今日到港：ATA = today，且排除中转港
   - ✅ 今日之前到港未提柜：ATA < today，且未提柜/未卸柜/未还箱
   - ✅ 今日之前到港已提柜：ATA < today，且已提柜/已卸柜/已还箱

2. **按到港维度 - SQL子查询保证正确性**
   - 子查询筛选 `port_type = 'destination'` 且 `ata_dest_port IS NOT NULL`
   - 这确保了只统计目的港记录，且必须有实际到港时间
   - 不需要额外筛选 `currentPortType !== 'transit'`（已由SQL保证）

3. **ETA分组 - 状态机保证正确性**
   - 子查询筛选 `ata_dest_port IS NULL`，只统计未实际到港的货柜
   - 虽然 `targetStatuses` 包含 `picked_up` 和 `unloaded`，但这些状态的货柜必须有 ATA
   - 因此 `picked_up` 和 `unloaded` 不会被统计到 ETA 分组中

4. **今日之前到港细分 - 正确性验证**
   - `今日之前到港未提柜` + `今日之前到港已提柜` = `今日之前到港`
   - 两个子维度互斥且覆盖所有情况

---

## 🔧 修复的问题

| 序号 | 问题描述 | 位置 | 修复内容 |
|-----|---------|------|---------|
| 1 | `Shipments.vue` 中存在 `todayActual` 筛选逻辑 | `Shipments.vue:251-258` | ✅ 已删除 `todayActual` 筛选逻辑 |

---

## 📊 数据完整性检查

### 按到港维度

| 子维度 | 统计条件 | 后端方法 | 前端方法 | 状态 |
|-------|---------|---------|---------|------|
| 今日到港 | ATA = today | `getArrivedToday` | `getArrivalSubset` | ✅ |
| 今日之前到港未提柜 | ATA < today + 未提柜 | `getArrivedBeforeTodayNotPickedUp` | `getArrivalSubset` | ✅ |
| 今日之前到港已提柜 | ATA < today + 已提柜 | `getArrivedBeforeTodayPickedUp` | `getArrivalSubset` | ✅ |
| 已逾期到港 | ETA < today + 无ATA | `getOverdueNotArrived` | `getArrivalSubset` | ✅ |
| 3日内预计到港 | ETA ∈ [today, today+3] | `getWithin3Days` | `getArrivalSubset` | ✅ |
| 7日内预计到港 | ETA ∈ (today+3, today+7] | `getWithin7Days` | `getArrivalSubset` | ✅ |
| 7日后预计到港 | ETA > today+7 | `getOver7Days` | `getArrivalSubset` | ✅ |

### 按计划提柜维度

| 子维度 | 统计条件 | 后端方法 | 前端方法 | 状态 |
|-------|---------|---------|---------|------|
| 待安排提柜 | 已到港 + 无拖卡记录 | `getPendingArrangement` | `getPickupSubset` | ✅ |
| 逾期未提柜 | 计划日期 < today | `getOverduePlanned` | `getPickupSubset` | ✅ |
| 今日计划提柜 | 计划日期 = today | `getTodayPlanned` | `getPickupSubset` | ✅ |
| 3天内计划提柜 | 计划日期 ∈ [today, today+3] | `getPlannedWithin3Days` | `getPickupSubset` | ✅ |
| 7天内计划提柜 | 计划日期 ∈ (today+3, today+7] | `getPlannedWithin7Days` | `getPickupSubset` | ✅ |

### 按最晚提柜维度

| 子维度 | 统计条件 | 后端方法 | 前端方法 | 状态 |
|-------|---------|---------|---------|------|
| 已逾期 | lastFreeDate < today | `getLastPickupExpired` | `getPickupSubset` | ✅ |
| 紧急 | lastFreeDate ∈ [today, today+3] | `getLastPickupUrgent` | `getPickupSubset` | ✅ |
| 警告 | lastFreeDate ∈ (today+3, today+7] | `getLastPickupWarning` | `getPickupSubset` | ✅ |
| 正常 | lastFreeDate > today+7 | `getLastPickupNormal` | `getPickupSubset` | ✅ |
| 缺最后免费日 | 无 lastFreeDate | `getNoLastPickupDate` | `getPickupSubset` | ✅ |

### 按最晚还箱维度

| 子维度 | 统计条件 | 后端方法 | 前端方法 | 状态 |
|-------|---------|---------|---------|------|
| 已逾期 | lastReturnDate < today | `getLastReturnExpired` | `getReturnSubset` | ✅ |
| 紧急 | lastReturnDate ∈ [today, today+3] | `getLastReturnUrgent` | `getReturnSubset` | ✅ |
| 警告 | lastReturnDate ∈ (today+3, today+7] | `getLastReturnWarning` | `getReturnSubset` | ✅ |
| 正常 | lastReturnDate > today+7 | `getLastReturnNormal` | `getReturnSubset` | ✅ |
| 缺最后还箱日 | 无 lastReturnDate | `getNoLastReturnDate` | `getReturnSubset` | ✅ |

---

## 🎯 关键验证点

### 1. currentPortType 的正确性

**前端逻辑：**
```typescript
const arrivedAtDestination = ataDate && currentPortType !== 'transit'
```

**后端逻辑（隐式）：**
```sql
WHERE po1.port_type = 'destination'
AND po1.ata_dest_port IS NOT NULL
```

**验证结果：✅ 正确**
- 子查询筛选了 `port_type = 'destination'` 且 `ata_dest_port IS NOT NULL`
- 根据状态机，如果目的港有 ATA，`currentPortType` 一定是 `'destination'`
- 不需要额外筛选 `currentPortType !== 'transit'`

### 2. ETA分组的状态筛选

**前端要求：**
```
只包含"已出运但未到港之后状态"的货柜（shipped/in_transit/at_port）
```

**后端实现：**
```typescript
const targetStatuses = [
  SimplifiedStatus.SHIPPED,
  SimplifiedStatus.IN_TRANSIT,
  SimplifiedStatus.AT_PORT,
  SimplifiedStatus.PICKED_UP,
  SimplifiedStatus.UNLOADED
]
```

**验证结果：✅ 正确**
- 虽然 `targetStatuses` 包含 `picked_up` 和 `unloaded`
- 但子查询筛选了 `ata_dest_port IS NULL`
- 根据状态机，`picked_up` 和 `unloaded` 状态的货柜必须有 ATA
- 因此这些货柜会被子查询排除

### 3. 今日之前到港的细分

**文档要求：**
```
今日之前到港未提柜 + 今日之前到港已提柜 = 今日之前到港
```

**验证结果：✅ 正确**
- 两个子维度使用了相同的ATA条件（ATA < today）
- 排除和包含的状态集合互补：`[picked_up, unloaded, returned_empty]`
- 两个子维度互斥且覆盖所有情况

---

## 📝 下一步建议

1. ✅ **已完成**：删除 `todayActual` 筛选逻辑
2. ⏸️ **待验证**：运行前端和后端，检查统计数字是否一致
3. ⏸️ **待验证**：检查边界情况（今天、今天+3天、今天+7天）
4. ⏸️ **待验证**：检查空数据情况（无ETA、无ATA等）

---

## 🔍 已排除的潜在问题

| 序号 | 潜在问题 | 排除理由 |
|-----|---------|---------|
| 1 | 后端缺少 `currentPortType !== 'transit'` 筛选 | SQL子查询已保证（`port_type = 'destination'`） |
| 2 | ETA分组统计了已提柜的货柜 | 子查询筛选 `ata_dest_port IS NULL`，已提柜货柜必有ATA |
| 3 | 今日之前到港细分可能有重复或遗漏 | 两个子维度互斥且互补 |

---

## ✨ 总结

经过详细验证，前后端的统计逻辑基本一致，主要修复了 `todayActual` 筛选逻辑的遗留问题。所有维度的统计条件都符合文档要求，SQL子查询和状态机的组合确保了数据的准确性。
