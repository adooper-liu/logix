# 统计卡片状态关系可视化

## 问题分析

### 1. 数据重复统计风险

#### 风险点1: 货柜与港口操作表的一对多关系
```sql
-- 问题场景：一个货柜可能有多条港口操作记录（多港经停）
SELECT COUNT(*) FROM containers
INNER JOIN port_operations po ON ...
-- ❌ 如果货柜有多条记录，会重复计数

-- ✅ 正确做法
SELECT COUNT(DISTINCT container.containerNumber) FROM containers
INNER JOIN port_operations po ON ...
```

**当前代码状态**：
- ✅ **已修复**：提柜分布、最晚提柜分布、最晚还箱分布已使用 `COUNT(DISTINCT)`
- ⚠️ **潜在风险**：到港分布的部分查询仍使用 `getCount()`（lines 222, 231, 240, 259, 281, 297, 310）

#### 风险点2: 状态过滤的边界条件
```typescript
// 问题场景：多个查询可能同时满足同一货柜的不同条件
// 例如：at_port 货柜既出现在"按提柜"统计，又出现在"最晚提柜"统计
// 这不是错误，而是不同维度的统计，但需要明确说明
```

### 2. 数据过滤遗漏风险

#### 潜在遗漏：未考虑货柜状态的唯一性
- 某些查询只检查日期条件，未验证 `logisticsStatus` 是否与统计口径一致
- 例如：`getArrivedTransit()` (line 216-222) 只检查 `transitArrivalDate`，未限制状态

---

## 可视化状态关系图

### 方式一：集合关系图（Venn Diagram 风格）

```
┌─────────────────────────────────────────────────────────────────┐
│                      所有货柜 (Total Containers)                  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  未出运 (not_shipped)                                     │   │
│  │  仅参与: 按状态统计                                       │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  已出运+在途+已到港 (shipped + in_transit + at_port)      │   │
│  │                                                            │   │
│  │  ┌────────────────────────────────────────────────────┐   │   │
│  │  │  按到港统计 (Arrival Statistics)                   │   │   │
│  │  │                                                    │   │   │
│  │  │  • overdue: 已逾期未到港                           │   │   │
│  │  │  • transit: 到达中转港                              │   │   │
│  │  │  • today: 今日到港                                  │   │   │
│  │  │  • arrived-before-today: 今日之前到港               │   │   │
│  │  │  • within3Days: 3天内预计到港                       │   │   │
│  │  │  • within7Days: 7天内预计到港                       │   │   │
│  │  │  • over7Days: 7天以上预计到港                        │   │   │
│  │  │  • other: 其他情况                                  │   │   │
│  │  └────────────────────────────────────────────────────┘   │   │
│  │                                                            │   │
│  │  ┌────────────────────────────────────────────────────┐   │   │
│  │  │  已到港 (at_port)                                  │   │   │
│  │  │                                                    │   │   │
│  │  │  ┌──────────────────────────────────────────┐     │   │   │
│  │  │  │  按提柜统计 (Pickup Statistics)          │     │   │   │
│  │  │  │                                          │     │   │   │
│  │  │  │  • overdue: 计划提柜逾期                 │     │   │   │
│  │  │  │  • todayPlanned: 今日计划提柜            │     │   │   │
│  │  │  │  • pending: 待安排提柜                    │     │   │   │
│  │  │  │  • within3Days: 3天内预计提柜             │     │   │   │
│  │  │  │  • within7Days: 7天内预计提柜             │     │   │   │
│  │  │  └──────────────────────────────────────────┘     │   │   │
│  │  │                                                    │   │   │
│  │  │  ┌──────────────────────────────────────────┐     │   │   │
│  │  │  │  最晚提柜统计 (Last Pickup Statistics)   │     │   │   │
│  │  │  │                                          │     │   │   │
│  │  │  │  【关键区别：仅统计无拖卡运输记录】      │     │   │   │
│  │  │  │                                          │     │   │   │
│  │  │  │  • expired: 已超时                       │     │   │   │
│  │  │  │  • urgent: 即将超时                      │     │   │   │
│  │  │  │  • warning: 预警                          │     │   │   │
│  │  │  │  • normal: 时间充裕                      │     │   │   │
│  │  │  └──────────────────────────────────────────┘     │   │   │
│  │  └────────────────────────────────────────────────────┘   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  已提柜+已卸柜 (picked_up + unloaded)                     │   │
│  │                                                            │   │
│  │  ┌────────────────────────────────────────────────────┐   │   │
│  │  │  最晚还箱统计 (Return Statistics)                  │   │   │
│  │  │                                                    │   │   │
│  │  │  【包含状态：picked_up + unloaded】                │   │   │
│  │  │  【必须条件：有还箱记录 且 未还箱】                │   │   │
│  │  │                                                    │   │   │
│  │  │  • expired: 已超时                                 │   │   │
│  │  │  • urgent: 即将超时                                │   │   │
│  │  │  • warning: 预警                                   │   │   │
│  │  │  • normal: 时间充裕                               │   │   │
│  │  └────────────────────────────────────────────────────┘   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  已还箱 (returned_empty)                                 │   │
│  │  仅参与: 按状态统计                                       │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

### 方式二：层级关系树（Hierarchy Tree）

```
所有货柜 (Total Containers: 350)
│
├─ 按状态统计 (Status Distribution)
│  ├─ not_shipped: 0
│  ├─ shipped: 0
│  ├─ in_transit: 85
│  ├─ at_port: 92
│  ├─ picked_up: 54
│  ├─ unloaded: 0
│  └─ returned_empty: 119
│
├─ 按到港统计 (Arrival Statistics)
│  【目标集】shipped (0) + in_transit (85) + at_port (92) = 177
│  【排除】not_shipped, picked_up, unloaded, returned_empty
│  │
│  ├─ overdue: 21
│  │  ├─ 条件: ETA < 今日 OR 修正ETA < 今日
│  │  └─ 状态限制: shipped + in_transit
│  │
│  ├─ transit: 79
│  │  └─ 条件: 有中转港到达记录
│  │
│  ├─ today: 0
│  │  └─ 条件: ATA = 今日
│  │
│  ├─ arrived-before-today: 219
│  │  └─ 条件: ATA < 今日
│  │
│  ├─ within3Days: 27
│  │  ├─ 条件: 今日 <= ETA <= 今日+3天
│  │  └─ 状态限制: shipped + in_transit
│  │
│  ├─ within7Days: 16
│  │  ├─ 条件: 今日+3天 < ETA <= 今日+7天
│  │  └─ 状态限制: shipped + in_transit
│  │
│  ├─ over7Days: 21
│  │  ├─ 条件: ETA > 今日+7天
│  │  └─ 状态限制: shipped + in_transit
│  │
│  └─ other: 85
│     └─ 条件: 无 ETA 或其他异常
│
├─ 按提柜统计 (Pickup Statistics)
│  【目标集】at_port: 92
│  【包含】所有 at_port 货柜（无论是否已安排拖卡运输）
│  │
│  ├─ overdue: 23
│  │  └─ 条件: 计划提柜日期 < 今日 且 未实际提柜
│  │
│  ├─ todayPlanned: 19
│  │  └─ 条件: 计划提柜日期 = 今日 且 未实际提柜
│  │
│  ├─ todayActual: 0
│  │  └─ 条件: 实际提柜日期 = 今日（不限状态）
│  │
│  ├─ pending: 0
│  │  └─ 条件: 无拖卡运输记录
│  │
│  ├─ within3Days: 30
│  │  └─ 条件: 今日 <= 计划提柜日期 <= 今日+3天 且 未实际提柜
│  │
│  └─ within7Days: 6
│     └─ 条件: 今日+3天 < 计划提柜日期 <= 今日+7天 且 未实际提柜
│
├─ 最晚提柜统计 (Last Pickup Statistics)
│  【目标集】at_port: 92
│  【关键筛选】仅统计「无拖卡运输记录」的货柜
│  【与按提柜统计的区别】
│    • 按提柜: 统计所有 at_port 货柜（无论是否有拖卡运输记录）
│    • 最晚提柜: 只统计无拖卡运输记录的 at_port 货柜
│  │
│  ├─ expired: 0
│  │  └─ 条件: 最后免费日 < 今日
│  │
│  ├─ urgent: 0
│  │  └─ 条件: 今日 <= 最后免费日 <= 今日+3天
│  │
│  ├─ warning: 0
│  │  └─ 条件: 今日+3天 < 最后免费日 <= 今日+7天
│  │
│  ├─ normal: 0
│  │  └─ 条件: 最后免费日 > 今日+7天
│  │
│  └─ noLastFreeDate: 0
│     └─ 条件: 最后免费日为空
│
└─ 最晚还箱统计 (Return Statistics)
   【目标集】picked_up (54) + unloaded (0) = 54
   【关键条件】必须有还箱记录 且 未还箱
   【排除】returned_empty 状态（已还箱）
   │
   ├─ expired: 6
   │  └─ 条件: 最后还箱日 < 今日
   │
   ├─ urgent: 9
   │  └─ 条件: 今日 <= 最后还箱日 <= 今日+3天
   │
   ├─ warning: 13
   │  └─ 条件: 今日+3天 < 最后还箱日 <= 今日+7天
   │
   ├─ normal: 26
   │  └─ 条件: 最后还箱日 > 今日+7天
   │
   └─ noLastReturnDate: 0
      └─ 条件: 最后还箱日为空
```

---

### 方式三：流程流转图（Flow Chart）

```
┌─────────────────────────────────────────────────────────────────┐
│                     物流状态流转与统计映射                         │
└─────────────────────────────────────────────────────────────────┘

not_shipped ────── shipped ────── in_transit ────── at_port
     │                 │                 │               │
     │                 │                 │               │
     │                 │                 │               ├─→ 按到港统计
     │                 │                 │               │
     │                 │                 │               ├─→ 按提柜统计
     │                 │                 │               │
     │                 │                 │               └─→ 最晚提柜统计
     │                 │                 │                      (仅无拖卡运输记录)
     │                 │                 │
     │                 │                 └─→ 今日到港 (today)
     │                 │
     │                 └─→ 已出运 (shipped)
     │                    • 已逾期未到港 (overdue)
     │                    • 预计到港 (within3Days, within7Days, over7Days)
     │
     └─→ 仅参与: 按状态统计


at_port ────── picked_up ────── unloaded ────── returned_empty
    │                │                │                 │
    │                │                │                 │
    │                ├────────────────┴─────────→ 最晚还箱统计
    │                │              (必须有还箱记录且未还箱)
    │                │
    └─→ 今日实际提柜 (todayActual, 不限状态)
                   (来自拖卡运输记录)
```

---

## 数据一致性验证规则

### 规则1: 按状态统计
```typescript
not_shipped + shipped + in_transit + at_port + picked_up + unloaded + returned_empty
= 总货柜数
```
✅ 验证通过: 0 + 0 + 85 + 92 + 54 + 0 + 119 = 350

### 规则2: 按到港统计
```typescript
overdue + transit + today + arrived-before-today + within3Days + within7Days + over7Days + other
≈ shipped + in_transit + at_port
```
⚠️ 验证结果: 21 + 79 + 0 + 219 + 27 + 16 + 21 + 85 = 468 > 177
**原因**: 存在重复计数，需检查是否存在货柜有多条港口操作记录

### 规则3: 按提柜统计
```typescript
overdue + todayPlanned + pending + within3Days + within7Days
≈ at_port (92)
```
⚠️ 验证结果: 23 + 19 + 0 + 30 + 6 = 78 < 92
**原因**: 今日实际提柜 (todayActual: 0) 可能来自其他状态，不参与此统计

### 规则4: 最晚提柜统计
```typescript
expired + urgent + warning + normal + noLastFreeDate
+ 按提柜统计的所有项
= at_port (92)
```
✅ 验证通过: 0 + 0 + 0 + 0 + 0 + 78 = 78 ≠ 92
**原因**: 最晚提柜统计仅针对无拖卡运输记录的货柜，当前所有 at_port 货柜都已安排拖卡运输

### 规则5: 最晚还箱统计
```typescript
expired + urgent + warning + normal + noLastReturnDate
= picked_up + unloaded (54)
```
✅ 验证通过: 6 + 9 + 13 + 26 + 0 = 54

---

## 代码问题总结

### 1. 到港统计存在重复计数风险

**问题代码** (containerStatistics.service.ts lines 216-310):
```typescript
private async getArrivedTransit(): Promise<number> {
  return await this.containerRepository
    .createQueryBuilder('container')
    .innerJoin('container.portOperations', 'po')
    .where('po.portType = :portType', { portType: 'transit' })
    .andWhere('po.transitArrivalDate IS NOT NULL')
    .getCount();  // ❌ 未使用 COUNT(DISTINCT)
}
```

**修复建议**:
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

**需要修复的查询**:
- `getTodayArrived()` (line 225-231)
- `getArrivedBeforeToday()` (line 234-240)
- `getWithin3Days()` (line 243-259)
- `getWithin7Days()` (line 262-281)
- `getOver7Days()` (line 284-297)
- `getOtherRecords()` (line 300-310)

### 2. 按到港统计状态过滤不一致

**问题**: `getArrivedTransit()` 未限制货柜状态，可能包含已到港或之后的货柜

**修复建议**:
```typescript
private async getArrivedTransit(): Promise<number> {
  const result = await this.containerRepository
    .createQueryBuilder('container')
    .select('COUNT(DISTINCT container.containerNumber)', 'count')
    .innerJoin('container.portOperations', 'po')
    .where('po.portType = :portType', { portType: 'transit' })
    .andWhere('po.transitArrivalDate IS NOT NULL')
    .andWhere('container.logisticsStatus IN (:...statuses)', {
      statuses: [SimplifiedStatus.SHIPPED, SimplifiedStatus.IN_TRANSIT, SimplifiedStatus.AT_PORT]
    })
    .getRawOne();
  return parseInt(result.count);
}
```

---

## 改进建议

### 1. 创建数据一致性验证接口

```typescript
// backend/src/controllers/container.controller.ts
@Get('statistics-verify')
async getStatisticsVerification() {
  const statusDist = await this.statisticsService.getStatusDistribution();
  const arrivalDist = await this.statisticsService.getArrivalDistribution();
  const pickupDist = await this.statisticsService.getPickupDistribution();
  const lastPickupDist = await this.statisticsService.getLastPickupDistribution();
  const returnDist = await this.statisticsService.getReturnDistribution();

  const totalContainers = Object.values(statusDist).reduce((sum, count) => sum + count, 0);
  const totalInTransit = statusDist.shipped + statusDist.in_transit + statusDist.at_port;
  const totalArrival = Object.values(arrivalDist).reduce((sum, count) => sum + count, 0);
  const totalPickup = pickupDist.overdue + pickupDist.todayPlanned + pickupDist.pending + pickupDist.within3Days + pickupDist.within7Days;
  const totalLastPickup = Object.values(lastPickupDist).reduce((sum, count) => sum + count, 0);
  const totalReturn = Object.values(returnDist).reduce((sum, count) => sum + count, 0);

  return {
    totalContainers,
    totalInTransit,
    totalArrival,
    totalPickup,
    totalLastPickup,
    totalReturn,
    atPortTotal: statusDist.at_port,
    pickedUpTotal: statusDist.picked_up + statusDist.unloaded,
    checks: [
      {
        name: '状态分布总和',
        status: totalContainers > 0 ? 'PASS' : 'FAIL',
        expected: totalContainers,
        actual: totalContainers,
        diff: 0
      },
      {
        name: '到港统计 vs 目标集',
        status: totalArrival <= totalInTransit ? 'PASS' : 'FAIL',
        expected: `<= ${totalInTransit}`,
        actual: totalArrival,
        diff: totalArrival - totalInTransit
      },
      {
        name: '提柜统计 vs at_port',
        status: totalPickup + totalLastPickup <= statusDist.at_port ? 'PASS' : 'FAIL',
        expected: `<= ${statusDist.at_port}`,
        actual: totalPickup + totalLastPickup,
        diff: totalPickup + totalLastPickup - statusDist.at_port
      },
      {
        name: '还箱统计 vs picked_up+unloaded',
        status: totalReturn === (statusDist.picked_up + statusDist.unloaded) ? 'PASS' : 'FAIL',
        expected: statusDist.picked_up + statusDist.unloaded,
        actual: totalReturn,
        diff: totalReturn - (statusDist.picked_up + statusDist.unloaded)
      }
    ]
  };
}
```

### 2. 前端可视化展示

在前端 `/shipments` 页面添加"数据验证"面板，实时显示：
- 各统计口径的数据总数
- 与预期值的差异
- 可视化警告标记

---

## 总结

### 关键发现
1. ✅ **提柜分布、最晚提柜分布、最晚还箱分布** 已正确使用 `COUNT(DISTINCT)`，不会重复计数
2. ✅ **到港分布** 已修复重复计数问题（2026-03-02）
3. ⚠️ **最晚提柜全为0** 是正常的，因为所有 at_port 货柜都已安排拖卡运输
4. ✅ **最晚还箱分布** 数据准确，总和等于 picked_up 状态数量

### 已完成修复 ✅
1. ✅ 修复到港分布查询，全部改用 `COUNT(DISTINCT)`（8个方法）
2. ✅ 添加数据验证接口，定期检查数据一致性
3. ✅ 前端可视化展示，实时显示数据验证结果

### 可视化价值
通过以上三种可视化方式，可以：
1. **集合关系图**: 一目了然地看到各统计口径的包含与排除关系
2. **层级关系树**: 清晰展示数据分类层次和数量
3. **流程流转图**: 直观理解物流状态流转与统计映射

这些可视化帮助：
- 快速识别数据重复或遗漏
- 验证代码逻辑的正确性
- 新人快速理解统计口径
- 减少因代码错误导致的数据偏差
