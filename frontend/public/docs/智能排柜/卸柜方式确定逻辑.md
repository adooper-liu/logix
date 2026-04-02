# 卸柜方式 (Unload Mode) 确定逻辑详解

## 📋 概述

卸柜方式（`unloadMode`）是智能排柜系统的核心决策之一，决定了货柜从提柜到还箱的整个物流流程。系统根据**车队是否有堆场**自动决定卸柜方式。

## 🎯 核心规则

### 决策公式（系统自动）

```typescript
const unloadMode = truckingCompany.hasYard ? 'Drop off' : 'Live load';
```

**位置**: `backend/src/services/intelligentScheduling.service.ts` 第 792 行、2163 行

### 优先级规则（新增）

**优先级**: 用户指定 > 系统自动决策

```typescript
let unloadMode: 'Drop off' | 'Live load';
if (request.unloadMode) {
  // 用户指定了卸柜方式，直接使用
  unloadMode = request.unloadMode;
} else {
  // 系统自动决策：根据车队是否有堆场决定
  unloadMode = truckingCompany.hasYard ? 'Drop off' : 'Live load';
}
```

**说明**: 从 2026-04-01 起，系统支持用户手动指定卸柜方式，优先于系统自动决策。

### 两种模式对比

| 维度 | Drop off（甩挂） | Live load（直提） |
|------|-----------------|------------------|
| **适用场景** | 提柜日 > 最晚提柜日（超期） | 提柜日 ≤ 最晚提柜日 |
| **时间关系** | 提柜 < 送仓 = 卸柜 | 提柜 = 送仓 = 卸柜 |
| **车队要求** | 必须有堆场（hasYard=true） | 有无堆场都可 |
| **费用影响** | 可能产生堆场堆存费 | 无堆场费 |
| **还箱日期** | 卸柜日 + 1 天 | 卸柜日（同日） |
| **前端显示** | 🟢 绿色标签 | ⚪ 灰色标签 |

---

## 🔄 完整决策流程

### 阶段 1: 判断卸柜模式偏好

**位置**: `backend/src/services/intelligentScheduling.service.ts` 第 736-754 行

在车队选择之前，系统会根据免费期情况判断是否需要 Drop off 模式：

```typescript
let preferredUnloadMode: 'Drop off' | 'Live load' | 'any' = 'any';

if (destPo.lastFreeDate) {
  const lastFreeDate = new Date(destPo.lastFreeDate);
  const daysDiff = Math.ceil(
    (lastFreeDate.getTime() - plannedPickupDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  
  if (daysDiff > 1) {
    // 延迟超过 1 天，优先选择有堆场的车队（支持 Drop off）
    preferredUnloadMode = 'Drop off';
  } else if (plannedPickupDate > lastFreeDate) {
    // 已超期，强烈需要 Drop off 模式
    preferredUnloadMode = 'Drop off';
  }
}
```

**判断逻辑**:
- ✅ **延迟 > 1 天**: 需要 Drop off 模式（将货柜先运到堆场存放）
- ✅ **已超期**: 必须 Drop off 模式（避免产生高额滞港费）
- ✅ **正常范围**: 无特殊偏好（`any`），两种模式都可

---

### 阶段 2: 选择最优车队

**位置**: `backend/src/services/TruckingSelectorService.ts` 第 137-189 行

使用 `TruckingSelectorService.selectTruckingCompany()` 选择最优车队，考虑四大评分维度：

#### 评分权重

| 维度 | 权重 | 说明 |
|------|------|------|
| **成本评分** | 30% | 运输成本越低分数越高 |
| **能力评分** | 20% | 剩余档期充足=100 分 |
| **合作关系评分** | 20% | 基于历史合作级别 |
| **卸柜模式兼容度评分** | 30% | ⭐ 关键！与模式偏好的匹配度 |

#### 调用参数

```typescript
const truckingCompany = await this.truckingSelectorService.selectTruckingCompany({
  warehouseCode: warehouse.warehouseCode,
  portCode: destPo.portCode,
  countryCode: warehouse.country,
  plannedDate: plannedPickupDate,
  preferredUnloadMode,      // ← 阶段 1 的偏好
  lastFreeDate: destPo.lastFreeDate ? new Date(destPo.lastFreeDate) : undefined,
  basePickupDate: plannedPickupDate
});
```

---

### 阶段 3: 卸柜模式兼容度评分

**位置**: `backend/src/services/TruckingSelectorService.ts` 第 281-312 行

这是最关键的评分逻辑，决定了车队是否适合当前的卸柜模式需求：

```typescript
const calculateUnloadModeScore = (hasYard: boolean): number => {
  if (!modeOptions?.lastFreeDate || !modeOptions?.basePickupDate) {
    return 50; // 无模式偏好信息，默认 50 分
  }

  const daysDiff = Math.ceil(
    (modeOptions.lastFreeDate.getTime() - modeOptions.basePickupDate.getTime()) /
      (1000 * 60 * 60 * 24)
  );

  const preferredMode = modeOptions.preferredUnloadMode || 'any';

  // 如果延迟>1 天且无堆场，但需要 Drop off → 低分（20 分）
  if (daysDiff > 1 && !hasYard && preferredMode === 'Drop off') {
    return 20;
  }

  // 如果延迟<=1 天，Live load 是最优选择
  if (daysDiff <= 1 && preferredMode === 'Live load') {
    return hasYard ? 80 : 100; // 无堆场更匹配
  }

  // 如果延迟>1 天，Drop off 是最优选择
  if (daysDiff > 1 && preferredMode === 'Drop off') {
    return hasYard ? 100 : 30; // 有堆场更匹配
  }

  return 50; // 无偏好
};
```

#### 评分矩阵

| 延迟天数 | 偏好模式 | 车队类型 | 得分 | 说明 |
|---------|---------|---------|------|------|
| > 1 天 | Drop off | 无堆场 | 20 | ❌ 需要 Drop off 但车队不支持 |
| ≤ 1 天 | Live load | 有堆场 | 80 | ⚠️ 可用但不是最优 |
| ≤ 1 天 | Live load | 无堆场 | 100 | ✅ 完美匹配 |
| > 1 天 | Drop off | 有堆场 | 100 | ✅ 完美匹配 |
| > 1 天 | Drop off | 无堆场 | 30 | ⚠️ 勉强可用 |
| 无偏好 | any | 任意 | 50 | 中立 |

---

### 阶段 4: 最终确定卸柜方式

**位置**: `backend/src/services/intelligentScheduling.service.ts` 第 2139 行

根据选中车队的 `hasYard` 属性自动决定：

```typescript
// 6. 根据车队是否有堆场决定卸柜方式
const unloadMode = truckingCompany.hasYard ? 'Drop off' : 'Live load';
```

---

## 💰 费用计算影响

### Drop off 模式费用构成

**位置**: `backend/src/services/schedulingCostOptimizer.service.ts` 第 500-551 行

```typescript
if (option.strategy === 'Drop off' && option.truckingCompany) {
  const hasYard = option.truckingCompany.hasYard || false;

  if (hasYard) {
    // 判断是否实际使用了堆场：提柜日 < 送仓日
    const pickupDayStr = option.plannedPickupDate.toISOString().split('T')[0];
    const deliveryDayStr = plannedDeliveryDate.toISOString().split('T')[0];

    if (pickupDayStr !== deliveryDayStr) {
      // 预计堆场存放天数
      const yardStorageDays = dateTimeUtils.daysBetween(
        option.plannedPickupDate,
        plannedDeliveryDate
      );

      // 外部堆场堆存费 = 每日费率 × 天数 + 操作费
      breakdown.yardStorageCost =
        (truckingPortMapping.standardRate || 0) * yardStorageDays +
        (truckingPortMapping.yardOperationFee || 0);
    }
  }
}
```

### 费用对比

| 费用类型 | Drop off | Live load |
|---------|----------|-----------|
| **运输费** | ✓ | ✓ |
| **滞港费** | ✓（可能降低） | ✓ |
| **滞箱费** | ✓（可能降低） | ✓ |
| **堆场堆存费** | ✓（如有堆场且提<送） | ✗ |
| **操作费** | ✓（Expedited 模式） | ✗ |

---

## 📅 日期计算影响

### 送仓日期 (plannedDeliveryDate)

**位置**: `backend/src/services/SchedulingDateCalculator.ts` 第 75-81 行

```typescript
calculatePlannedDeliveryDate(pickupDate: Date, unloadMode: string, unloadDate: Date): Date {
  if (unloadMode === 'Live load') {
    return new Date(pickupDate); // 提 = 送（同日）
  }
  // Drop off：送 = 卸（送仓日即卸柜日）
  return new Date(unloadDate);
}
```

### 还箱日期 (plannedReturnDate)

**位置**: `backend/src/services/SchedulingDateCalculator.ts` 第 96-130 行

```typescript
async calculatePlannedReturnDate(
  unloadDate: Date,
  unloadMode: string,
  truckingCompanyId: string,
  lastReturnDate?: Date,
  _plannedPickupDate?: Date
): Promise<ReturnDateResult> {
  if (unloadMode === 'Live load') {
    // Live load 模式：还 = 卸（同日）
    const availableDate = await this.findEarliestAvailableReturnDate(
      truckingCompanyId,
      returnDateOnly,
      lastReturnDate
    );
    // ...
  } else {
    // Drop off 模式：还 = 卸 + 1
    returnDateOnly.setDate(returnDateOnly.getDate() + 1);
    // ...
  }
}
```

---

## 🔍 实际业务场景示例

### 场景 1: 正常排产（未超期）

**条件**:
- 最晚提柜日 (LFD): 2026-04-10
- 计划提柜日：2026-04-05
- `daysDiff = 5 天`（未超期）

**决策过程**:
1. `preferredUnloadMode = 'any'`（无特殊偏好）
2. 车队评分：主要看成本和关系
3. 选中车队：假设是无堆场车队
4. **最终结果**: `unloadMode = 'Live load'`

**排产结果**:
```
提柜日：2026-04-05
送仓日：2026-04-05（提=送）
卸柜日：2026-04-05（送=卸）
还箱日：2026-04-05（还=卸）
```

---

### 场景 2: 超期排产（需要 Drop off）

**条件**:
- 最晚提柜日 (LFD): 2026-04-01
- 计划提柜日：2026-04-07
- `plannedPickupDate > lastFreeDate`（已超期 6 天）

**决策过程**:
1. `preferredUnloadMode = 'Drop off'`（强烈需要）
2. 车队评分：有堆场车队得高分（100 分）
3. 选中车队：有堆场车队
4. **最终结果**: `unloadMode = 'Drop off'`

**排产结果**:
```
提柜日：2026-04-07
送仓日：2026-04-09（提<送，货物在堆场存放 2 天）
卸柜日：2026-04-09（送=卸）
还箱日：2026-04-10（卸+1）
```

**费用影响**:
- 堆场堆存费 = $80/天 × 2 天 + $50 操作费 = $210
- 但避免了高额的超期滞港费

---

### 场景 3: 临界点排产（1 天延迟）

**条件**:
- 最晚提柜日 (LFD): 2026-04-05
- 计划提柜日：2026-04-04
- `daysDiff = 1 天`（临界点）

**决策过程**:
1. `preferredUnloadMode = 'any'`（1 天内可接受）
2. 车队评分：Live load 模式下无堆场车队得分更高（100 vs 80）
3. 选中车队：假设是无堆场车队
4. **最终结果**: `unloadMode = 'Live load'`

**排产结果**:
```
提柜日：2026-04-04
送仓日：2026-04-04
卸柜日：2026-04-04
还箱日：2026-04-04
```

---

## ✅ 资源可用性检查

**位置**: `backend/src/controllers/scheduling.controller.ts` 第 2421-2449 行

在保存排产结果前，会检查 Drop off 模式下的车队还箱档期：

```typescript
// 5. 如果是 Drop off 模式，检查车队还箱档期
if (plannedData.unloadMode === 'Drop off' && plannedData.plannedReturnDate) {
  const truckingCompany = await manager.findOne(TruckingCompany, {
    where: { truckingCompanyId: plannedData.truckingCompanyId }
  });

  // 只有有堆场的车队才需要检查还箱档期
  if (truckingCompany && truckingCompany.hasYard) {
    const returnOccupancy = await manager.findOne(ExtTruckingReturnSlotOccupancy, {
      where: {
        truckingCompanyId: plannedData.truckingCompanyId,
        slotDate: plannedData.plannedReturnDate
      }
    });

    if (returnOccupancy && returnOccupancy.remaining <= 0) {
      logger.warn(`[Scheduling] Trucking ${plannedData.truckingCompanyId} return capacity is full on ${plannedData.plannedReturnDate}`);
      return false; // 车队还箱已满
    }
  }
}
```

---

## 🎨 前端显示

**位置**: `frontend/src/views/scheduling/components/SchedulingPreviewModal.vue` 第 92-98 行

```vue
<el-table-column prop="unloadMode" label="卸柜方式" width="110">
  <template #default="{ row }">
    <el-tag :type="row.unloadMode === 'Drop off' ? 'success' : 'info'" size="small">
      {{ row.unloadMode }}
    </el-tag>
  </template>
</el-table-column>
```

**显示效果**:
- 🟢 **Drop off**: 绿色标签（成功色）
- ⚪ **Live load**: 灰色标签（信息色）

---

## 🎨 前端界面操作（新增）

### 卸柜方式选择框

**位置**: `frontend/src/views/scheduling/SchedulingVisual.vue` 顶部操作栏

**界面元素**:
```
┌─────────────────────────────────────────┐
│ ETA 顺延：[0] 天 │ 卸柜方式：[自动决策 ▼] │ 逻辑 │
└─────────────────────────────────────────┘
```

**选项说明**:
- **自动决策**（默认）：系统根据车队是否有堆场自动决定
- **Drop off (甩挂)**：强制使用甩挂模式（需要有堆场的车队）
- **Live load (直提)**：强制使用直提模式

**使用场景**:
1. **特殊业务需求**：客户指定必须使用某种卸柜方式
2. **成本考虑**：人工评估后认为某种方式更经济
3. **资源限制**：已知某车队无堆场但仍需使用

**注意事项**:
- ⚠️ 如果选择的卸柜方式与车队属性不匹配（如选择 Drop off 但车队无堆场），可能导致排产失败
- ⚠️ 手动指定的卸柜方式可能产生额外费用（如堆场费）
- ✅ 系统会在日志中记录是使用用户指定还是系统自动决策

### 后端日志输出

**用户指定时**:
```
[Scheduling] Container CA-S001-001: Using user-specified unloadMode: Drop off
```

**系统自动决策时**:
```
[Scheduling] Container CA-S001-001: Auto-determined unloadMode: Live load (hasYard=false)
```

---

## 📊 数据流图（更新）

```
┌─────────────────────┐
│ 1. 获取 LFD 和提柜日   │
└──────────┬──────────┘
           │
           v
┌─────────────────────┐
│ 2. 计算延迟天数      │
│ daysDiff = LFD - Pickup│
└──────────┬──────────┘
           │
           v
┌─────────────────────┐
│ 3. 确定模式偏好      │
│ preferredUnloadMode  │
│ - daysDiff > 1 → Drop off│
│ - 超期 → Drop off     │
│ - 否则 → any         │
└──────────┬──────────┘
           │
           v
┌─────────────────────┐
│ 4. 选择车队          │
│ TruckingSelectorService│
│ - 成本 (30%)         │
│ - 能力 (20%)         │
│ - 关系 (20%)         │
│ - 模式兼容 (30%) ⭐   │
└──────────┬──────────┘
           │
           v
┌─────────────────────┐
│ 5. 根据 hasYard 决定  │
│ unloadMode = hasYard │
│   ? 'Drop off'       │
│   : 'Live load'      │
└──────────┬──────────┘
           │
           v
┌─────────────────────┐
│ 6. 计算相关日期      │
│ - 送仓日             │
│ - 卸柜日             │
│ - 还箱日             │
└──────────┬──────────┘
           │
           v
┌─────────────────────┐
│ 7. 计算费用          │
│ - 运输费             │
│ - D&D 费用            │
│ - 堆场费 (如适用)    │
└─────────────────────┘
```

---

## 🚨 常见错误与注意事项

### 错误 1: 误以为可以手动指定卸柜方式

❌ **错误理解**: 用户可以选择卸柜方式  
✅ **正确理解**: 系统根据车队属性自动决定

卸柜方式是**决策结果**，不是**输入条件**。

---

### 错误 2: 忽略堆场费的触发条件

❌ **错误**: 所有 Drop off 都收堆场费  
✅ **正确**: 只有同时满足以下条件才收堆场费：
1. 模式是 Drop off
2. 车队有堆场（hasYard=true）
3. 提柜日 < 送仓日（实际使用了堆场）

---

### 错误 3: 混淆 Live load 和 Direct 策略

❌ **错误**: Live load = Direct 策略  
✅ **正确**: 
- `Live load`: 卸柜方式（提=送=卸）
- `Direct`: 排产策略（直达不中转）

两者是不同维度的概念。

---

## 📝 数据库字段

### process_trucking_transport 表

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `unload_mode_plan` | varchar | 计划的卸柜方式（'Drop off' 或 'Live load'） |
| `unload_mode_actual` | varchar | 实际的卸柜方式（可能与计划不同） |

### ext_warehouse_daily_occupancy 表

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `planned_count` | int | 计划卸柜数量 |
| `remaining` | int | 剩余产能 |

---

## 🔧 配置项

### dict_scheduling_config 表

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `skip_weekends` | boolean | true | 是否跳过周末排产 |
| `default_free_days` | int | 7 | 默认免费天数 |

---

## 📖 相关文档

- [智能排柜系统知识体系整合](./11-project/10-智能排柜与五节点调度最终开发方案.md)
- [智能排产卸柜日期功能与计算规则](./11-project/11-智能排产卸柜日期功能与计算规则.md)
- [排产预览货柜详情字段规范](./11-project/XX-排产预览字段规范.md)
- [外部堆场堆存费实际使用判定逻辑](../memory/development_practice_specification/外部堆场堆存费实际使用判定逻辑.md)

---

## 🎯 总结

卸柜方式的确定是一个**多目标优化决策过程**：

1. **业务驱动**: 基于免费期和超期情况判断需求
2. **智能评分**: 综合考虑成本、能力、关系和模式兼容性
3. **自动决策**: 根据车队属性自动选择最优模式
4. **费用优化**: 在避免超期罚款和堆场费之间寻找平衡

**核心原则**: 系统会自动选择对当前场景最优的卸柜方式，无需人工干预。

---

**版本**: v1.0  
**创建时间**: 2026-04-01  
**最后更新**: 2026-04-01  
**作者**: AI Assistant  
**状态**: 已完成
