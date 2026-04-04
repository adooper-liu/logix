# 智能排柜决策过程文档

## 1. 概述

本文档描述智能排柜系统的完整决策过程，特别是当**提柜日约束（lastFreeDate）**与**仓库产能约束**发生冲突时的处理逻辑。

## 2. 核心概念

### 2.1 关键日期定义

| 日期 | 定义 | 约束来源 |
|------|------|---------|
| **清关日** (plannedCustomsDate) | 货柜完成清关的日期 | ETA/ATA |
| **提柜日** (plannedPickupDate) | 从港口提走货柜的日期 | 清关日+1天，受lastFreeDate约束 |
| **卸柜日** (plannedUnloadDate) | 货柜在仓库卸货的日期 | 仓库日产能 |
| **还箱日** (plannedReturnDate) | 空箱归还港口的日期 |卸柜日+在仓天数 |

### 2.2 关键约束

| 约束 | 说明 |
|------|------|
| **lastFreeDate** | 最后免费提柜日 = 起算日 + 免费天数。提柜日必须 ≤ lastFreeDate 否则产生滞港费 |
| **仓库日产能** | 仓库每日可卸货柜数量，超出则需等待 |
| **车队堆场(hasYard)** | 车队是否有自有堆场，影响卸柜模式选择 |

## 3. 决策流程图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           智能排柜完整决策流程                                │
└─────────────────────────────────────────────────────────────────────────────┘

                                    开始
                                      │
                                      ▼
                    ┌─────────────────────────────────┐
                    │      步骤1: 确定清关日           │
                    │  ETA/ATA → plannedCustomsDate    │
                    └─────────────────────────────────┘
                                      │
                                      ▼
                    ┌─────────────────────────────────┐
                    │      步骤2: 计算提柜日           │
                    │  customsDate + 1天               │
                    │         ↓                        │
                    │  if (pickupDate > lastFreeDate)  │
                    │         ↓                        │
                    │  pickupDate = lastFreeDate  ← 强制约束
                    └─────────────────────────────────┘
                                      │
                                      ▼
                    ┌─────────────────────────────────┐
                    │      步骤3: 选择仓库             │
                    │  根据国家+港口选择候选仓库列表    │
                    └─────────────────────────────────┘
                                      │
                                      ▼
                    ┌─────────────────────────────────┐
                    │      步骤4: 查找卸柜日           │
                    │  findEarliestAvailableDay()      │
                    │  从提柜日起向后查找有产能的日期    │
                    │  最多回溯30天                     │
                    └─────────────────────────────────┘
                                      │
                          ┌───────────┴───────────┐
                          │                       │
                          ▼                       ▼
            ┌─────────────────────┐   ┌─────────────────────┐
            │   找到可用日期        │   │   30天内无产能       │
            │   继续               │   │   返回错误            │
            └─────────────────────┘   │   "仓库产能不足"      │
                                      └─────────────────────┘
                                      │
                                      ▼
                    ┌─────────────────────────────────┐
                    │      步骤5: 选择车队             │
                    │  根据仓库+港口选择候选车队        │
                    └─────────────────────────────────┘
                                      │
                                      ▼
                    ┌─────────────────────────────────┐
                    │      步骤6: 确定卸柜模式         │
                    │  hasYard=true → Drop off         │
                    │  hasYard=false → Live load       │
                    └─────────────────────────────────┘
                                      │
                                      ▼
                    ┌─────────────────────────────────┐
                    │      步骤7: 成本优化评估         │
                    │  多方案比较，选择最优             │
                    └─────────────────────────────────┘
                                      │
                                      ▼
                                    结束
```

## 4. 卸柜模式决策

### 4.1 两种模式对比

| 模式 | 英文 | 车队要求 | 提柜日 vs 卸柜日 | 货柜去向 | 额外费用 |
|------|------|----------|-----------------|---------|---------|
| **直接卸柜** | Live load | 无堆场 | 提柜日 = 卸柜日 | 提柜当天直接送仓库 | 无 |
| **先放后卸** | Drop off | 有堆场 | 提柜日 < 卸柜日 | 先放堆场，等待仓库产能 | yardStorageCost |

### 4.2 模式选择代码

```typescript
// intelligentScheduling.service.ts 第749-752行
const unloadMode = truckingCompany.hasYard ? 'Drop off' : 'Live load';
```

## 5. 冲突场景详解

### 5.1 场景描述

```
场景：货柜A
- 清关日：4月6日（周四）
- lastFreeDate：4月8日（周六）
- 仓库A在4月8-10日已满，4月11日有产能
- 车队：有堆场（hasYard=true）
```

### 5.2 决策过程

```
步骤1: 计算理论提柜日
  4月6日 + 1天 = 4月7日（周五）

步骤2: 检查lastFreeDate约束
  4月7日 ≤ 4月8日 ✓ 通过
  → plannedPickupDate = 4月7日

步骤3: 查找可用卸柜日
  findEarliestAvailableDay(仓库A, 4月7日)
  ├── 4月7日: 有产能 ✓ → 返回 4月7日
  └── 结论: 卸柜日 = 4月7日

步骤4: 确定卸柜模式
  hasYard=true → Drop off
  提柜日(4月7日) < 卸柜日(4月7日) = 同日，Drop off可同日完成

最终结果:
  提柜日: 4月7日
  卸柜日: 4月7日
  滞港费: 0（4月7日 < 4月8日）
  堆场费: 0（同日完成）
```

### 5.3 冲突场景：提柜日 > lastFreeDate

```
场景：货柜B
- 清关日：4月10日（周一）
- lastFreeDate：4月8日（周六）
- 仓库A在4月8-10日已满，4月11日有产能
- 车队：有堆场（hasYard=true）
```

**决策过程：**

```
步骤1: 计算理论提柜日
  4月10日 + 1天 = 4月11日（周二）

步骤2: 检查lastFreeDate约束
  4月11日 > 4月8日 ✗ 超限！
  → 强制: plannedPickupDate = 4月8日（lastFreeDate）

步骤3: 查找可用卸柜日
  findEarliestAvailableDay(仓库A, 4月8日)
  ├── 4月8日: 产能已满 → 跳过
  ├── 4月9日: 产能已满 → 跳过
  ├── 4月10日: 产能已满 → 跳过
  └── 4月11日: 有产能 ✓ → 返回 4月11日

步骤4: 确定卸柜模式
  hasYard=true → Drop off
  提柜日(4月8日) < 卸柜日(4月11日)

最终结果:
  提柜日: 4月8日 ← 强制为lastFreeDate
  卸柜日: 4月11日 ← 有产能的第一天
  滞港费: 0（提柜日4月8日 ≤ lastFreeDate4月8日）
  堆场费: 有（堆场存放3天）
  存放位置: 车队堆场
```

### 5.4 冲突场景：车队无堆场

```
场景：货柜C
- 清关日：4月10日（周一）
- lastFreeDate：4月8日（周六）
- 仓库A在4月8-10日已满，4月11日有产能
- 车队：无堆场（hasYard=false）
```

**决策过程：**

```
步骤1: 计算理论提柜日
  4月10日 + 1天 = 4月11日（周二）

步骤2: 检查lastFreeDate约束
  4月11日 > 4月8日 ✗ 超限！
  → 强制: plannedPickupDate = 4月8日（lastFreeDate）

步骤3: 查找可用卸柜日
  findEarliestAvailableDay(仓库A, 4月8日)
  ├── 4月8日: 产能已满 → 跳过
  ├── 4月9日: 产能已满 → 跳过
  ├── 4月10日: 产能已满 → 跳过
  └── 4月11日: 有产能 ✓ → 返回 4月11日

步骤4: 确定卸柜模式
  hasYard=false → Live load
  ⚠️ Live load要求: 提柜日 = 卸柜日

步骤5: Live load冲突处理
  提柜日(4月8日) ≠ 卸柜日(4月11日) ✗ 冲突！
  
  处理逻辑（代码第800-829行）:
  → 放弃lastFreeDate约束
  → 提柜日调整为 4月11日（与卸柜日同步）

最终结果:
  提柜日: 4月11日 ← 调整为有产能日
  卸柜日: 4月11日 ← Live load要求同日
  滞港费: 有（4月11日提柜 > 4月8日lastFreeDate）
  堆场费: 0（Live load模式无堆场）
  说明: 虽然免费期内，但无堆场时Live load要求提=卸，可能产生滞港费

### 5.5 Fast Path 示例：Happy Path

```
场景：货柜D
- 清关日：4月6日（周四）
- lastFreeDate：4月10日（周一）
- 仓库4月6-7日有产能
- 车队：有堆场（hasYard=true）
```

**决策过程（Fast Path）**：

```
步骤1: pickupDate = 4月6日 + 1天 = 4月7日（周五）
步骤2: 4月7日 ≤ 4月10日 ✓ → plannedPickupDate = 4月7日
步骤3: findEarliestAvailableDay(仓库, 4月7日) → 4月7日有产能
步骤4: hasYard=true → Drop off
步骤5: checkIfOptimizationNeeded:
  - 条件1: 4月7日 ≤ 4月10日 ✓ 通过
  - 条件2: daysDiff(0) ≤ 1 ✓ 通过
  → needsOptimization = false
  → Fast Path: 跳过成本优化

最终结果:
  提柜日: 4月7日
  卸柜日: 4月7日
  滞港费: 0
  堆场费: 0（Drop off同日完成）
  说明: Happy Path，无需调用成本优化算法
```

### 5.6 完整场景矩阵：有/无堆场组合

下表展示不同场景下的决策路径和结果：

| 场景 | hasYard | pickupDate vs lastFree | daysDiff | 条件1 | 条件2 | needsOptimization | 优化结果 |
|------|---------|------------------------|----------|-------|-------|-------------------|----------|
| A | ✅ 有 | ≤ (免费期内) | 0 | ❌ | ❌ | **false** | Fast Path |
| B | ✅ 有 | ≤ (免费期内) | 3 | ❌ | ✅ | **true** | 评估堆场费 |
| C | ✅ 有 | > (已超期) | 0 | ✅ | ❌ | **true** | 评估滞港费 |
| D | ✅ 有 | > (已超期) | 3 | ✅ | ✅ | **true** | 评估两种费用 |
| E | ❌ 无 | ≤ (免费期内) | 0 | ❌ | N/A | **false** | Fast Path |
| F | ❌ 无 | > (已超期) | 0 | ✅ | N/A | **true** | 评估滞港费 |

**关键说明**：
- 条件2 仅在 `hasYard=true` 时评估（Live load 模式不产生堆场费）
- `daysDiff = 0` 表示提柜日 = 卸柜日（同日完成）
- 条件2 修复前：`daysDiff > 1 && !hasYard`（错误：Live load 被判断为需要优化）
- 条件2 修复后：`daysDiff > 1 && hasYard`（正确：只评估 Drop off 的堆场费）

---

### 5.7 详细场景实例

#### 场景B：有堆场 + 延迟卸柜（需要优化）

```
场景配置：
- 清关日：4月6日（周四）
- lastFreeDate：4月10日（周一）
- 仓库：4月6日有产能，4月7-10日满，4月11日有产能
- 车队：hasYard=true（有堆场）
```

**决策过程：**

```
步骤1: pickupDate = 4月6日 + 1天 = 4月7日
步骤2: 4月7日 ≤ 4月10日 ✓ → plannedPickupDate = 4月7日
步骤3: findEarliestAvailableDay(仓库, 4月7日) → 4月11日才有产能
步骤4: hasYard=true → Drop off
步骤5: checkIfOptimizationNeeded:
  - 条件1: 4月7日 ≤ 4月10日 ✓ 通过
  - 条件2: daysDiff=4 > 1 && hasYard ✓ 通过
  → needsOptimization = true

步骤6: 调用成本优化
  方案A (Drop off):
    提柜日: 4月7日, 卸柜日: 4月11日
    滞港费: $0, 堆场费: $200 (4天×$50)
    总成本: $200

  方案B (改为Live load):
    提柜日: 4月11日, 卸柜日: 4月11日
    滞港费: $100 (超1天), 堆场费: $0
    总成本: $100 ← 更优

步骤7: Live load冲突处理
  4月11日已是Live load，无需调整

最终结果:
  提柜日: 4月11日 ← 优化器建议
  卸柜日: 4月11日
  滞港费: $100
  堆场费: $0
  总成本: $100 ✓ 比Drop off节省$100
```

#### 场景E：无堆场 + 免费期内（Fast Path）

```
场景配置：
- 清关日：4月6日（周四）
- lastFreeDate：4月10日（周一）
- 仓库：4月7日有产能
- 车队：hasYard=false（无堆场）
```

**决策过程：**

```
步骤1: pickupDate = 4月6日 + 1天 = 4月7日
步骤2: 4月7日 ≤ 4月10日 ✓ → plannedPickupDate = 4月7日
步骤3: findEarliestAvailableDay(仓库, 4月7日) → 4月7日有产能
步骤4: hasYard=false → Live load
步骤5: checkIfOptimizationNeeded:
  - 条件1: 4月7日 ≤ 4月10日 ✓ 通过
  - 条件2: N/A (Live load不评估堆场费) ✓ 通过
  → needsOptimization = false

最终结果:
  提柜日: 4月7日
  卸柜日: 4月7日 ← Live load要求提=卸
  滞港费: $0
  堆场费: $0 (无堆场)
  说明: Fast Path，无需优化
```

#### 场景F：无堆场 + 已超期

```
场景配置：
- 清关日：4月12日（周三）
- lastFreeDate：4月10日（周一）
- 仓库：4月11日有产能
- 车队：hasYard=false（无堆场）
```

**决策过程：**

```
步骤1: pickupDate = 4月12日 + 1天 = 4月13日
步骤2: 4月13日 > 4月10日 ✗ → plannedPickupDate = 4月10日（强制）
步骤3: findEarliestAvailableDay(仓库, 4月10日) → 4月11日有产能
步骤4: hasYard=false → Live load
步骤5: checkIfOptimizationNeeded:
  - 条件1: 4月10日 > 4月10日? → 4月10日 ≤ 4月10日 ✓ 不超期！
    (因为比较时使用 <=)
    ⚠️ 但这里有个细节：清关日+1天=4月13日 > lastFreeDate
    → 重新计算: pickupDate = lastFreeDate = 4月10日
  - 条件2: N/A (Live load)
  → needsOptimization = false（已超期但无堆场费可优化）

步骤6: Live load冲突处理
  4月10日仓库无产能，需要调整
  → 调整 pickupDate = 4月11日
  → 卸柜日 = 4月11日

最终结果:
  提柜日: 4月11日 ← 因仓库产能调整
  卸柜日: 4月11日
  滞港费: 有（4月11日 > lastFreeDate 4月10日）
  堆场费: $0 (无堆场)
  说明: 无堆场无法优化，只能接受滞港费
```

---

### 5.8 决策核心逻辑图（简化版）

```
                    ┌─────────────────────────┐
                    │   计算提柜日 = 清关日+1   │
                    └───────────┬─────────────┘
                                │
                    ┌───────────▼─────────────┐
                    │  提柜日 > lastFreeDate?  │
                    └───────────┬─────────────┘
                           ┌────┴────┐
                          是         否
                           │         │
                           ▼         ▼
                   ┌───────────┐ ┌─────────────────────────┐
                   │ 强制=lastFreeDate │     选择车队         │
                   └───────┬─────┘ └───────────┬─────────────┘
                           │                   │
                           ▼                   ▼
                   ┌───────────────┐   ┌───────────────┐
                   │  hasYard=true? │   │  查找可用卸柜日 │
                   └───────┬───────┘   └───────┬───────┘
                      ┌────┴────┐                │
                     是         否               │
                      │         │                ▼
                      ▼         ▼        ┌───────────────┐
              ┌───────────┐  ┌───────────────────┐
              │  Drop off │  │    Live load      │
              │ daysDiff>1?│  │  pickup=unload    │
              └─────┬─────┘  └───────────────────┘
               ┌────┴────┐
              是         否
               │         │
               ▼         ▼
       ┌───────────┐ ┌───────────┐
       │ 需优化    │ │ Fast Path │
       │(评估费用) │ │(跳过优化) │
       └───────────┘ └───────────┘
```

**📌 关键点**：
1. **无堆场（Live load）**：提柜日=卸柜日，daysDiff永远为0，无需评估堆场费
2. **有堆场（Drop off）**：提柜日可以<卸柜日，需要评估堆场费
3. **条件2 仅评估 Drop off 模式**：因为 Live load 不产生堆场费

## 6. 成本优化集成

### 6.1 快速路径（Fast Path）优化

**设计原则**: Lazy Evaluation（惰性计算）

如果在默认方案已经是最优的情况下，就不需要调用复杂的成本优化算法。

**快速路径条件**：

| 条件 | 说明 | 判断结果 |
|------|------|---------|
| 提柜日在免费期内 | `plannedPickupDate ≤ lastFreeDate` | 否则需要优化 |
| 卸柜延迟 ≤ 1天 | 或 `hasYard=true`（有堆场） | 否则需要优化 |

**快速路径判断代码**：

```typescript
// intelligentScheduling.service.ts checkIfOptimizationNeeded() 方法
private checkIfOptimizationNeeded(
  plannedPickupDate: Date,
  lastFreeDate: Date | undefined,
  plannedUnloadDate: Date | null,
  hasYard: boolean
): boolean {
  // 条件1: 提柜日是否在免费期内
  if (lastFreeDate && plannedPickupDate > lastFreeDate) {
    return true; // 已超期，需要优化
  }

  // 条件2: 卸柜延迟天数
  if (plannedUnloadDate) {
    const daysDiff = Math.ceil(
      (plannedUnloadDate.getTime() - plannedPickupDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysDiff > 1 && !hasYard) {
      return true; // 延迟超过1天且无堆场，需要优化
    }
  }

  return false; // Fast Path: 跳过成本优化
}
```

### 6.2 优化调用逻辑

```typescript
// intelligentScheduling.service.ts 第754-784行

// ✅ Fast Path: 检查是否需要进行成本优化
const needsOptimization = this.checkIfOptimizationNeeded(
  plannedPickupDate,
  destPo.lastFreeDate,
  plannedUnloadDate,
  truckingCompany.hasYard
);

if (needsOptimization) {
  // 需要优化：调用成本优化服务
  const optimization = await this.costOptimizerService.suggestOptimalUnloadDate(...);
  // ... 处理优化结果
} else {
  // Fast Path: 当前方案已是最优，跳过成本优化
  logger.debug(`Fast path for ${containerNumber}: Current plan is optimal`);
}
```

### 6.3 性能收益

```
当前（无条件优化）：
每次排柜都调用成本优化服务
  ↓
  成本优化需要：
  - 调用 DemurrageService 计算滞港费
  - 生成多个候选方案
  - 比较各方案成本
  - 最多回溯7天日期

优化后（有条件优化）：
无冲突时跳过优化
  ↓
  Happy Path（无冲突）：直接返回，跳过优化
  假设100个货柜中90个无冲突 → 只需10次优化调用
  ↓
  节省：DB查询 × 80 + 滞港费计算 × 80 + 方案生成 × 80
```

### 6.4 优化策略配置

```typescript
// schedulingCostOptimizer.service.ts 第1261-1279行
const OPTIMIZATION_STRATEGIES = {
  // 已超期：尽量往前排（减少损失）
  OVERDUE: {
    searchDirection: 'forward',
    searchStartOffset: 0,
    searchEndOffset: 7,
    prioritizeZeroCost: false,
    allowSkipIfNoCapacity: false
  },

  // 免费期内：尽量靠近免费截止日（保持成本为0）
  WITHIN_FREE_PERIOD: {
    searchDirection: 'backward',
    searchStartOffset: 0,
    searchEndOffset: -7,
    prioritizeZeroCost: true,
    allowSkipIfNoCapacity: true
  }
};
```

### 6.5 成本比较逻辑

```
┌─────────────────────────────────────────────────────────────────┐
│                     方案A (Drop off)                            │
│  提柜日: 4月8日 (lastFreeDate)                                   │
│  卸柜日: 4月11日                                                 │
│  滞港费: $0                                                      │
│  堆场费: $150 (3天 × $50/天)                                     │
│  总成本: $150                                                    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     方案B (改为Live load)                        │
│  提柜日: 4月11日                                                 │
│  卸柜日: 4月11日                                                 │
│  滞港费: $300 (超期3天)                                          │
│  堆场费: $0                                                      │
│  总成本: $300                                                    │
└─────────────────────────────────────────────────────────────────┘

结论: 选择方案A (Drop off)，节省$150
```

**说明**：成本优化算法会比较Drop off和Live load两种方案，选择总成本（滞港费+堆场费+运输费）最低的方案。

## 7. 完整决策树

**⚠️ 重要说明**：

1. **执行顺序**：以下决策树展示了执行顺序，而非逻辑分支
2. **Fast Path 在前**：步骤5（checkIfOptimizationNeeded）在步骤7（Live load冲突处理）**之前**执行
3. **优化后调整**：如果步骤5调用优化算法并调整了pickupDate，可能会触发步骤7的冲突处理
4. **Happy Path**：即使无需优化（Fast Path），仍然执行步骤6-10的验证和计算

```
输入: 清关日(customsDate), lastFreeDate, 仓库列表, 车队列表
                                          │
                                          ▼
                    ┌─────────────────────────────────────────┐
                    │  1. pickupDate = customsDate + 1天       │
                    │     (受lastFreeDate约束)                  │
                    └─────────────────────────────────────────┘
                                          │
                                          ▼
                    ┌─────────────────────────────────────────┐
                    │  2. 从pickupDate起找卸柜日               │
                    │     findEarliestAvailableDay()           │
                    │     (最多回溯30天)                        │
                    └─────────────────────────────────────────┘
                                          │
                          ┌───────────────┴───────────────┐
                          │                               │
                          ▼                               ▼
              ┌─────────────────────┐       ┌─────────────────────┐
              │  找到可用卸柜日       │       │  30天内无产能         │
              │  unloadDate          │       │  返回错误             │
              └─────────────────────┘       └─────────────────────┘
                          │
                          ▼
              ┌─────────────────────────────────────────┐
              │  3. 选择车队                            │
              │  根据仓库+港口+日期选择                  │
              └─────────────────────────────────────────┘
                          │
                          ▼
              ┌─────────────────────────────────────────┐
              │  4. 确定卸柜模式                        │
              │  hasYard=true → Drop off                │
              │  hasYard=false → Live load              │
              └─────────────────────────────────────────┘
                          │
                          ▼
              ┌─────────────────────────────────────────┐
              │  5. Fast Path: checkIfOptimizationNeeded │
              │     - needsOptimization=true → 调用优化算法 │
              │     - 优化可能调整 plannedPickupDate     │
              │     ⚠️ 注意：此步骤在Live load调整之前    │
              └─────────────────────────────────────────┘
                          │
                          ▼
              ┌─────────────────────────────────────────┐
              │  条件1: pickupDate ≤ lastFreeDate?       │
              └─────────────────────────────────────────┘
                          │
              ┌───────────┴───────────┐
              │                       │
              ▼                       ▼
      ┌───────────────┐       ┌───────────────────────────┐
      │  否（超期）     │       │  是                       │
      │  → needsOptimization=true│  → 继续条件2              │
      └───────┬───────┘       └───────────┬───────────────┘
              │                           │
              ▼                           ▼
      ┌───────────────┐       ┌───────────────────────────┐
      │  调用优化算法   │       │  条件2: daysDiff ≤ 1?     │
      └───────┬───────┘       └───────────┬───────────────┘
              │                           │
              │                   ┌───────┴───────┐
              │                   │               │
              │                   ▼               ▼
              │           ┌───────────────┐ ┌───────────────┐
              │           │  否            │ │  是           │
              │           │  → daysDiff>1  │ │  → Fast Path │
              │           │  → 需要优化    │ │  → needsOptimization=false│
              │           └───────┬───────┘ └───────┬───────┘
              │                   │                 │
              │                   ▼                 │
              │           ┌───────────────┐         │
              │           │  调用优化算法   │         │
              │           └───────┬───────┘         │
              │                   │                 │
              └──────────┬────────┴─────────────────┘
                         │
                         ▼
              ┌─────────────────────────────────────────────────────┐
              │  6. 卸柜日验证                                        │
              │  - 检查 plannedUnloadDate 有效性                      │
              └─────────────────────────────────────────────────────┘
                         │
                         ▼
              ┌─────────────────────────────────────────────────────┐
              │  7. Live load 冲突处理 ⚠️ (在Fast Path判断之后执行)     │
              │  if (!hasYard && pickupDate ≠ unloadDate)            │
              │     → 调整 pickupDate = unloadDate (放弃lastFreeDate)│
              └─────────────────────────────────────────────────────┘
                         │
                         ▼
              ┌─────────────────────────────────────────────────────┐
              │  8. 计算还箱日                                        │
              │  - Drop off: 卸+1，受还箱能力约束                     │
              │  - Live load: 卸同日，可能因还箱能力调整卸柜日          │
              └─────────────────────────────────────────────────────┘
                         │
                         ▼
              ┌─────────────────────────────────────────────────────┐
              │  9. 选择清关公司                                       │
              │  - 匹配国家+港口，返回brokerCode                       │
              └─────────────────────────────────────────────────────┘
                         │
                         ▼
              ┌─────────────────────────────────────────────────────┐
              │  10. 计算预估费用（dryRun模式）                        │
              │  - Demurrage/Detention/Storage/Transportation        │
              └─────────────────────────────────────────────────────┘
                         │
                         ▼
                       输出

## 8. 关键代码位置

| 功能 | 文件 | 行号 | 说明 |
|------|------|------|------|
| 提柜日计算（含lastFreeDate约束） | `SchedulingDateCalculator.ts` | 38-62 | 清关日+1天，受lastFreeDate约束 |
| 送仓日计算 | `SchedulingDateCalculator.ts` | 75-81 | Live load=提柜日，Drop off=卸柜日 |
| 还箱日计算 | `SchedulingDateCalculator.ts` | 96-184 | 含车队还箱能力约束 |
| 查找可用卸柜日 | `intelligentScheduling.service.ts` | 1127-1165 | findEarliestAvailableDay方法 |
| 查找可用仓库 | `intelligentScheduling.service.ts` | 1107-1122 | findEarliestAvailableWarehouse方法 |
| 卸柜模式选择 | `intelligentScheduling.service.ts` | 749-752 | hasYard=true→Drop off |
| **Fast Path判断** | `intelligentScheduling.service.ts` | 1180-1227 | checkIfOptimizationNeeded方法 |
| 成本优化评估 | `intelligentScheduling.service.ts` | 763-786 | 调用costOptimizerService |
| Live load冲突处理 | `intelligentScheduling.service.ts` | 799-844 | 调整pickupDate |
| 单柜排产主方法 | `intelligentScheduling.service.ts` | 495-1077 | scheduleSingleContainer |
| 批量排产主方法 | `intelligentScheduling.service.ts` | 184-420 | batchSchedule |
| 成本优化核心 | `schedulingCostOptimizer.service.ts` | 836-920 | suggestOptimalUnloadDate |
| 优化策略配置 | `schedulingCostOptimizer.service.ts` | 1261-1279 | OPTIMIZATION_STRATEGIES |

**决策树执行顺序提醒**：
1. `checkIfOptimizationNeeded()` (L1180-1227) 在 `Live load冲突处理` (L799-844) **之前**执行
2. 如果 `needsOptimization=true`，会先调用成本优化，再执行 Live load 冲突处理
3. Happy Path（无需优化）会跳过成本优化，但仍然执行后续所有步骤

**⚠️ 条件2修复说明（2026-04-01）**：
- **修复前**：`daysDiff > 1 && !hasYard`（错误：Live load被判断为需要优化）
- **修复后**：`daysDiff > 1 && truckingCompany?.hasYard`（正确：仅评估Drop off的堆场费）
- **原因**：Live load模式（hasYard=false）提=卸=送，daysDiff永远为0，不产生堆场费，无需评估

## 9. 常见问题

### Q1: 为什么Drop off模式会产生堆场费？

**A**: Drop off模式下，货柜提走后不能立即卸柜（仓库满），需要暂时存放在车队堆场。堆场按天收取堆存费。

### Q2: 什么时候应该选择Drop off而不是Live load？

**A**: 当：
1. 车队有堆场（hasYard=true）
2. 保持lastFreeDate提柜的成本 < 违反lastFreeDate的成本

即：堆场费 < 滞港费 时选择Drop off。

### Q3: 为什么Live load模式下会放弃lastFreeDate约束？

**A**: Live load要求提柜日和卸柜日相同。如果坚持在lastFreeDate提柜但当天仓库满，无法存放（无堆场），只能：
1. 放弃lastFreeDate约束
2. 调整提柜日 = 有产能的第一天
3. 接受可能的滞港费

### Q4: 30天内都找不到可用产能怎么办？

**A**: 返回错误 `"仓库产能不足，无法排产"`，需要人工干预或等待仓库扩容。

### Q5: 为什么条件2只评估有堆场的车队？

**A**: 这是2026-04-01修复的逻辑问题。

- **Drop off模式**（hasYard=true）：提柜日可以<卸柜日，货柜暂存堆场 → 可能产生堆场费 → 需要评估
- **Live load模式**（hasYard=false）：提柜日=卸柜日=送仓日，不产生堆场 → 无需评估

**修复前的问题**：
```typescript
// ❌ 错误：Live load 被判断为需要优化
if (daysDiff > 1 && !hasYard) return true;
```

**修复后的逻辑**：
```typescript
// ✅ 正确：仅评估 Drop off 模式的堆场费
if (plannedUnloadDate && truckingCompany?.hasYard) {
  if (daysDiff > 1) return true;
}
```

### Q6: Live load模式下唯一路径是什么？

**A**: Live load模式下，如果仓库当天满载，**只能延迟提柜**。

```
场景：hasYard=false, lastFreeDate=4月8日, 仓库4月8日满、4月11日有产能

选项：
  A. 4月8日提 → 4月11日卸 → ❌ 违反Live load（提≠卸）
  B. 4月11日提 → 4月11日卸 → ✅ 唯一可行方案

结论：只能接受滞港费（4月11日 > lastFreeDate 4月8日）
```

这是Live load的固有约束，无法优化。成本优化只在有堆场（Drop off）时才有可能找到更优方案。

## 10. 总结

智能排柜的决策核心是**成本最小化**：

1. **优先约束**：lastFreeDate > 仓库产能
   - 保持lastFreeDate提柜，避免滞港费
   - 接受卸柜日顺延，产生堆场费

2. **模式选择**：Drop off > Live load
   - 有堆场车队可缓冲
   - 无堆场车队必须同日完成

3. **最终目标**：总成本（滞港费+堆场费+运输费）最小

4. **快速路径（Fast Path）优化**
   - **设计原则**：Lazy Evaluation（惰性计算）
   - **触发条件**：
     - 提柜日在免费期内（≤ lastFreeDate）
     - 卸柜延迟 ≤ 1天 或 hasYard=true
   - **性能收益**：避免不必要的成本优化计算，提升批量排柜性能
   - **核心思路**：如果默认方案已经是最优的，就不需要调用复杂的成本优化算法

---

## 11. 修复影响分析（2026-04-01）

### 11.1 条件2修复对比

| 场景 | hasYard | 修复前 | 修复后 | 正确性 |
|------|---------|--------|--------|--------|
| Live load + daysDiff=3 | ❌ 无 | ❌ 判断需要优化 | ✅ Fast Path | ✅ |
| Drop off + daysDiff=3 | ✅ 有 | ❌ 跳过优化 | ✅ 需要优化 | ✅ |
| Live load + daysDiff=0 | ❌ 无 | ✅ Fast Path | ✅ Fast Path | ✅ |
| Drop off + daysDiff=0 | ✅ 有 | ✅ Fast Path | ✅ Fast Path | ✅ |

**修复说明**：
- 修复前：`daysDiff > 1 && !hasYard`（错误：Live load被判断为需要优化）
- 修复后：`daysDiff > 1 && hasYard`（正确：仅评估Drop off的堆场费）

### 11.2 核心结论

| 模式 | hasYard | 堆场费 | 滞港费 | 优化空间 |
|------|---------|--------|--------|----------|
| Drop off | ✅ 有 | 可能产生 | 可避免 | **有**（比较堆场费vs滞港费） |
| Live load | ❌ 无 | 不产生 | 不可避免 | **无**（只能延迟提柜） |

**业务意义**：
- **有堆场车队**：可以通过Drop off模式缓冲，避免滞港费，付出堆场费
- **无堆场车队**：必须Live load当日完成，无法优化成本，只能接受滞港费

### 11.3 执行顺序分析

当前执行顺序：`checkIfOptimizationNeeded` → `成本优化` → `Live load冲突处理`

**修复后的逻辑自洽性**：

| 模式 | 条件1 | 条件2 | needsOptimization | 成本优化 | Live load冲突处理 |
|------|-------|-------|-------------------|----------|-------------------|
| Drop off | 超期? | daysDiff>1? | true/false | 可能执行 | 不执行 |
| Live load | 超期? | N/A | false(除非超期) | 跳过 | 执行 |

**结论**：修复后执行顺序是逻辑自洽的：
1. **Drop off模式**：由条件1和条件2共同决定是否优化，Live load冲突处理不涉及
2. **Live load模式**：条件2不评估（无堆场费），跳过优化，Live load冲突处理确保提=卸
3. **无需调整执行顺序**：修复条件2后，执行顺序不再导致逻辑矛盾

---

## 12. 2026-04-01 系统优化

### 12.1 卸柜模式提前考虑

**改进前问题**：
- 卸柜模式在选择仓库和车队之后才确定
- 选择车队时无法考虑模式兼容性
- 可能选择到不支持所需模式的车队

**改进方案**：
在选择车队前，提前判断需要的卸柜模式，并将偏好传递给车队选择器：

```typescript
// 提前判断卸柜模式偏好
let preferredUnloadMode: 'Drop off' | 'Live load' | 'any' = 'any';
if (destPo.lastFreeDate) {
  const lastFreeDate = new Date(destPo.lastFreeDate);
  const daysDiff = Math.ceil(
    (lastFreeDate.getTime() - plannedPickupDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (daysDiff > 1) {
    preferredUnloadMode = 'Drop off'; // 延迟超过1天，优先选择有堆场的车队
  } else if (plannedPickupDate > lastFreeDate) {
    preferredUnloadMode = 'Drop off'; // 已超期，强烈需要 Drop off 模式
  }
}

// 传递模式偏好给车队选择器
const truckingCompany = await this.truckingSelectorService.selectTruckingCompany({
  warehouseCode: warehouse.warehouseCode,
  portCode: destPo.portCode,
  countryCode: warehouse.country,
  plannedDate: plannedPickupDate,
  preferredUnloadMode, // 新增参数
  lastFreeDate: destPo.lastFreeDate ? new Date(destPo.lastFreeDate) : undefined,
  basePickupDate: plannedPickupDate
});
```

**车队评分新增维度**：

| 评分维度 | 权重 | 说明 |
|---------|------|------|
| 成本评分 | 30% | 成本越低分数越高 |
| 能力评分 | 20% | 有剩余能力=100分 |
| 关系评分 | 20% | 基于合作关系级别 |
| **卸柜模式兼容度** | **30%** | **2026-04-01新增** |

**模式兼容度评分规则**：

| 场景 | hasYard | 偏好模式 | 兼容度得分 |
|------|---------|----------|-----------|
| daysDiff > 1 | 有堆场 | Drop off | 100 |
| daysDiff > 1 | 无堆场 | Drop off | 20 |
| daysDiff ≤ 1 | 无堆场 | Live load | 100 |
| daysDiff ≤ 1 | 有堆场 | Live load | 80 |
| 无偏好信息 | 任意 | any | 50 |

### 12.2 缓存机制优化

**新增缓存策略**：

| 缓存项 | TTL | 说明 |
|--------|-----|------|
| 港口-车队映射 | 6小时 | dict_trucking_port_mapping |
| 仓库-车队映射 | 6小时 | dict_warehouse_trucking_mapping |
| 滞港费标准全量 | 24小时 | ext_demurrage_standards |
| 滞港费匹配结果 | 1小时 | 按货柜号缓存 |

**缓存文件**：`backend/src/constants/SchedulingCacheStrategy.ts`

```typescript
export enum SchedulingCacheKeys {
  PORT_TRUCKING_MAPPING = 'scheduling:port_trucking:',
  WAREHOUSE_TRUCKING_MAPPING = 'scheduling:warehouse_trucking:',
  DEMURRAGE_STANDARDS = 'demurrage:standards:',
  DEMURRAGE_ALL_STANDARDS = 'demurrage:all_standards',
}

export const SchedulingCacheTTL = {
  MAPPING: 6 * 60 * 60,           // 6小时
  DEMURRAGE_STANDARD: 24 * 60 * 60, // 24小时
  DEMURRAGE_MATCH: 60 * 60,      // 1小时
};
```

### 12.3 改进影响分析

| 改进项 | 改进前 | 改进后 | 收益 |
|--------|--------|--------|------|
| 卸柜模式提前考虑 | 事后判断模式 | 事前评估兼容性 | 提高模式匹配率 |
| 映射关系缓存 | 每次查询数据库 | Redis缓存6小时 | 减少数据库查询 |
| 滞港费标准缓存 | 每次全表查询 | Redis缓存24小时 | 提升查询性能 |

### 12.4 改进优先级说明

| 优先级 | 改进项 | 状态 |
|--------|--------|------|
| P0 | 缓存机制 | ✅ 已完成 |
| P1 | 卸柜模式提前考虑 | ✅ 已完成 |
| P2 | 仓库/车队组合优化 | ⏳ 待实施 |

**P2优先级说明**：
- 仓库/车队组合优化需要大幅重构（O(n+m) → O(n*m)）
- 当前优化已能解决大部分场景
- 建议在有明确业务需求时再实施
