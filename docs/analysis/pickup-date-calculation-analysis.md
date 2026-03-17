# 计划提柜日计算逻辑完整分析

**日期**: 2026-03-17  
**问题**: 当前 LogiX 实现过于简化，需要综合 Java 算法的完整逻辑

---

## 📋 一、当前 LogiX 实现（过度简化）

### 代码位置

`backend/src/services/intelligentScheduling.service.ts:431-447`

```typescript
private async calculatePlannedPickupDate(
  customsDate: Date,
  lastFreeDate?: Date
): Promise<Date> {
  const pickupDate = new Date(customsDate);
  pickupDate.setDate(pickupDate.getDate() + 1); // 清关后次日提柜

  if (lastFreeDate) {
    const lastFree = new Date(lastFreeDate);
    lastFree.setHours(0, 0, 0, 0);
    if (pickupDate > lastFree) {
      pickupDate.setTime(lastFree.getTime());
    }
  }

  return pickupDate;
}
```

### 当前逻辑（第 277-289 行）

```typescript
// 2. 计算计划清关日、提柜日（若 ATA/ETA 已过，提柜日至少为今天）
const plannedCustomsDate = new Date(clearanceDate);
let plannedPickupDate = await this.calculatePlannedPickupDate(plannedCustomsDate, destPo.lastFreeDate);
const today = new Date();
today.setHours(0, 0, 0, 0);
if (plannedPickupDate < today) {
  plannedPickupDate = new Date(today);
  plannedCustomsDate.setTime(today.getTime());
  plannedCustomsDate.setDate(plannedCustomsDate.getDate() - 1); // 保持 提=清关+1
}

// 4. 确定候选仓库
const warehouses = await this.getCandidateWarehouses(countryCode, portCode);

// 5. 找最早可用的仓库和卸柜日（从提柜日起查）
const { warehouse, plannedUnloadDate } = await this.findEarliestAvailableWarehouse(warehouses, plannedPickupDate);
```

### ❌ 问题分析

1. **单向计算**：先算提柜日 → 再找仓库 → 最后定卸柜日
2. **未考虑**：
   - 仓库卸柜能力是否充足
   - 车队送还能力限制
   - 周末效应（周六日不能作业）
   - 最晚还箱日约束
   - Live load vs Drop off 的选择

---

## 🎯 二、Java 算法的完整逻辑

### 核心公式

```
计划提柜日 = f(多个约束条件的倒推)

必须满足：
1. 提 ≥ 清关日 + 1
2. 提 ≤ last_free_date（避免滞港费）
3. 提 ≥ ETA + 1（货柜到港后才能提）
4. 提 ≥ 今天（不能回到过去）
5. 提 ≠ 周末（周六日不工作）
6. 存在仓库和卸柜日满足：提 ≤ 送 ≤ 卸
7. 卸 ≤ 最晚还箱日 - 1（Drop off 模式）
8. 有车队送还能力（return_day）
```

### Java 代码证据

#### 1. Case D：全部未定时的完整流程

```java
// Java: 1118-1207 行
if (!hasPick && !hasDelivery && !hasUnload) {
    boolean assigned = false;
    int dayOffset = 0;

    while (!assigned) {
        int minUnloadDay = Math.max(container.getEta() + 1, currentDay);
        int unloadDay = minUnloadDay + dayOffset;

        for (String whId : container.getPossibleWarehouses()) {
            // 检查仓库容量
            if (warehouseUsage.get(key) < warehouseCapacity) {
                container.setCurrentWarehouse(whId);

                // 检查车队堆场可用性
                boolean isYardUsable = checkYardUsability(container);

                if (isYardUsable) {
                    // Drop off 模式：可以提前送仓
                    container.setPick(Math.min(
                        container.getEta() + random.nextInt(3) + 1,
                        unloadDay
                    ));

                    // 检查送仓日的车队送还能力限制
                    int minDeliveryDay = Math.min(
                        container.getPick() + random.nextInt(3),
                        unloadDay
                    );
                    Integer actualDeliveryDay = findEarliestAvailableDeliveryDay(
                        whId, container.getPort(), minDeliveryDay, maxT, weekendDays, true
                    );

                    if (actualDeliveryDay != null) {
                        container.setDelivery(actualDeliveryDay);

                        // 如果送仓日被推迟，调整卸柜日期
                        if (actualDeliveryDay > unloadDay) {
                            unloadDay = findEarliestAvailableDay(
                                whId, actualDeliveryDay + 1, warehouseUsage,
                                maxT, weekendDays, warehouseCapacity
                            );
                        }
                    }
                }
                else {
                    // Live unload 模式：提=送=卸
                    container.setPick(unloadDay);
                    container.setDelivery(unloadDay);
                    container.setUnload(unloadDay);
                }

                // 检查并分配车队送还能力
                try {
                    Integer returnDay = findEarliestAvailableFleetReturnDay(
                        whId, container.getPort(), unloadDay + 1, maxT, weekendDays
                    );

                    if (returnDay != null) {
                        List<Map<String, Object>> availableFleets =
                            getAvailableFleetReturnCapacityByPrice(
                                whId, container.getPort(), returnDay
                            );

                        if (!availableFleets.isEmpty()) {
                            String selectedFleet = (String) availableFleets.get(0).get("fleet_name");
                            allocateFleetReturnCapacity(
                                selectedFleet, whId, returnDay, 1
                            );
                            container.setReturnT(returnDay);
                        }
                    }
                } catch (RuntimeException e) {
                    container.setReturnT(unloadDay + 1);
                }

                // 二次校验：验证车队运力分配是否有效
                if (!validateAndReassignContainerCapacity(
                        container, currentDay, maxT, weekendDays, warehouseUsage)) {
                    System.out.println("Warning: Failed to reassign capacity for container " + container.getId());
                }

                warehouseUsage.put(key, warehouseUsage.getOrDefault(key, 0) + 1);
                assigned = true;
                break;
            }
        }

        if (!assigned) {
            dayOffset++;  // 推迟卸柜日，重新尝试
        }

        if (dayOffset > maxT) {
            throw new RuntimeException("Container could not be assigned within " + maxT + " days.");
        }
    }
}
```

#### 2. 关键洞察

从 Java 代码可以看出：

1. **不是先算提柜日**，而是先找**可行的卸柜日**
2. **卸柜方式决定提柜策略**：
   - Live unload：提=送=卸（同一天）
   - Drop unload：提 < 送=卸（提柜可提前）
3. **多重验证**：
   - 仓库容量 ✓
   - 车队送还能力 ✓
   - 周末跳过 ✓
   - 二次校验 ✓

---

## 📊 三、完整的约束条件总结

### 硬约束（必须满足）

| 编号 | 约束                       | 来源       | Java 代码位置 |
| ---- | -------------------------- | ---------- | ------------- |
| C1   | 提 ≥ 清关日 + 1            | 业务流程   | 436 行        |
| C2   | 提 ≤ last_free_date        | 滞港费约束 | 438-443 行    |
| C3   | 提 ≥ ETA + 1               | 物理限制   | 1123 行       |
| C4   | 提 ≥ 今天                  | 时间限制   | 1123 行       |
| C5   | 提 ≠ 周末                  | 工作日限制 | 921-923 行    |
| C6   | 存在仓库容量               | 卸柜能力   | 927 行        |
| C7   | 存在卸柜日 ≥ 提            | 流程顺序   | 1000-1003 行  |
| C8   | 存在送柜日（提 ≤ 送 ≤ 卸） | 流程顺序   | 1058-1070 行  |
| C9   | 存在车队送还能力           | 还箱限制   | 1087-1102 行  |
| C10  | 还 ≤ 最晚还箱日            | 合同约束   | 632-637 行    |

### 软约束（优化目标）

| 编号 | 目标         | 说明                             |
| ---- | ------------ | -------------------------------- |
| S1   | 最小化滞港费 | 提 ≤ last_free_date              |
| S2   | 最小化堆场费 | 选择有堆场的车队，减少 yard_days |
| S3   | 最小化拖车费 | 选择价格最低的车队               |
| S4   | 优先自营仓   | CA-S003 > CA-P003                |

---

## 🔧 四、正确的计算流程（建议实现）

### 阶段 1：收集所有约束条件

```typescript
interface PickupConstraints {
  // 时间窗口
  earliestPossiblePickup: Date; // max(清关日 +1, ETA+1, 今天)
  latestPossiblePickup: Date; // min(last_free_date, 最晚还箱日 - 最小作业周期)

  // 仓库相关
  candidateWarehouses: Warehouse[];
  warehouseCapacities: Map<warehouseCode, Map<date, availableCapacity>>;

  // 车队相关
  fleetYardAvailability: Map<fleetCode, Map<date, availableSlots>>;
  fleetReturnCapacity: Map<fleetCode, Map<date, availableReturns>>;

  // 其他
  weekendDays: Set<string>; // 'YYYY-MM-DD'格式
  unloadModePreference: "Live load" | "Drop off" | "Any";
}
```

### 阶段 2：枚举 + 剪枝搜索

```typescript
async function calculateOptimalPickupDate(constraints: PickupConstraints): Promise<{ pickup: Date; warehouse: string; delivery: Date; unload: Date } | null> {
  const candidates: Array<{
    pickup: Date;
    warehouse: string;
    delivery: Date;
    unload: Date;
    score: number;
  }> = [];

  // 枚举可能的提柜日（在时间窗口内）
  for (let pickup = constraints.earliestPossiblePickup; pickup <= constraints.latestPossiblePickup; pickup = addDay(pickup)) {
    // 跳过周末
    if (constraints.weekendDays.has(formatDate(pickup))) {
      continue;
    }

    // 枚举候选仓库
    for (const warehouse of constraints.candidateWarehouses) {
      // 找最早的可用卸柜日
      const unloadDate = findEarliestAvailableUnload(
        warehouse.code,
        pickup, // 卸柜日 ≥ 提柜日
        constraints.warehouseCapacities
      );

      if (!unloadDate) continue; // 该仓库无容量

      // 确定卸柜方式
      const unloadMode = formatDate(pickup) === formatDate(unloadDate) ? "Live load" : "Drop off";

      // 计算送柜日
      const deliveryDate = calculateDeliveryDate(pickup, unloadMode, unloadDate);

      // 检查送柜日的车队送还能力
      const hasFleetCapacity = await checkFleetReturnCapacity(warehouse.code, deliveryDate, constraints.fleetReturnCapacity);

      if (!hasFleetCapacity) continue; // 无车队能力

      // 计算还箱日
      const returnDate = calculateReturnDate(unloadDate, unloadMode);

      // 检查是否超过最晚还箱日
      if (returnDate > constraints.latestPossiblePickup) {
        continue;
      }

      // 计算得分（成本）
      const score = calculateScore({
        pickupDate: pickup,
        warehouse: warehouse.code,
        deliveryDate: deliveryDate,
        unloadDate: unloadDate,
        returnDate: returnDate,
        unloadMode: unloadMode,
      });

      candidates.push({
        pickup: pickup,
        warehouse: warehouse.code,
        delivery: deliveryDate,
        unload: unloadDate,
        score,
      });
    }
  }

  if (candidates.length === 0) {
    return null; // 无可行解
  }

  // 返回得分最高的方案
  candidates.sort((a, b) => a.score - b.score);
  const best = candidates[0];

  return {
    pickup: best.pickup,
    warehouse: best.warehouse,
    delivery: best.delivery,
    unload: best.unload,
  };
}
```

### 阶段 3：得分计算

```typescript
function calculateScore(plan: { pickupDate: Date; warehouse: string; deliveryDate: Date; unloadDate: Date; returnDate: Date; unloadMode: string }): number {
  let score = 0;

  // 1. 滞港费风险（越接近 last_free_date 分数越低）
  const daysToLastFree = daysBetween(plan.pickupDate, lastFreeDate);
  if (daysToLastFree < 0) {
    score += 1000 * Math.abs(daysToLastFree); // 超期重罚
  }

  // 2. 堆场费（Drop off 模式产生费用）
  if (plan.unloadMode === "Drop off") {
    const yardDays = daysBetween(plan.pickupDate, plan.deliveryDate);
    score += yardDays * 30; // 假设每天 30 元
  }

  // 3. 仓库优先级（自营仓加分）
  const warehouse = getWarehouse(plan.warehouse);
  if (warehouse.propertyType === "自营仓") {
    score -= 50; // 优先
  } else if (warehouse.propertyType === "平台仓") {
    score += 20; // 次选
  } else {
    score += 50; // 第三方仓
  }

  // 4. 时间紧迫性（越早完成越好）
  const totalDays = daysBetween(plan.pickupDate, plan.returnDate);
  score += totalDays * 5; // 鼓励快速周转

  return score;
}
```

---

## ✅ 五、修复建议

### P0: 立即修复（本周）

1. **添加周末跳过逻辑**

```typescript
// intelligentScheduling.service.ts
private isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;  // 周日=0, 周六=6
}

// 在 calculatePlannedPickupDate 中使用
while (this.isWeekend(pickupDate)) {
  pickupDate.setDate(pickupDate.getDate() + 1);
}
```

2. **添加仓库容量预检查**

```typescript
// 在计算提柜日前，先确认有可用的仓库和卸柜日
const warehouseAvailability = await this.checkWarehouseAvailability(warehouses, earliestPickupDate, maxSearchDays);

if (!warehouseAvailability) {
  return {
    success: false,
    message: "未来${maxSearchDays}天内仓库产能不足，无法排产",
  };
}
```

### P1: 中期优化（下周）

3. **重构为多阶段计算**

```typescript
// 阶段 1: 收集约束
const constraints = await this.collectPickupConstraints(container);

// 阶段 2: 枚举搜索
const optimalPlan = await this.findOptimalPickupPlan(constraints);

if (!optimalPlan) {
  // 尝试放宽约束（如推迟卸柜日）
  const relaxedPlan = await this.relaxAndRetry(constraints);
}

// 阶段 3: 应用结果
plannedPickupDate = optimalPlan.pickup;
plannedWarehouse = optimalPlan.warehouse;
plannedUnloadDate = optimalPlan.unload;
```

### P2: 长期改进（下月）

4. **引入局部搜索优化**

```typescript
// 在初始解基础上，尝试微调
const optimizedPlan = await this.localSearch(initialPlan);

// 尝试更换仓库
for (const altWarehouse of alternativeWarehouses) {
  const newCost = await this.calculateTotalCost({ ...initialPlan, warehouse: altWarehouse });
  if (newCost < bestCost) {
    bestPlan = { ...initialPlan, warehouse: altWarehouse };
  }
}

// 尝试调整日期
for (const delta of [-2, -1, +1, +2]) {
  const newPickup = addDays(initialPlan.pickup, delta);
  // ... 检查可行性并计算新成本
}
```

---

## 📝 六、测试用例建议

### 测试场景 1：正常情况

```typescript
输入:
- ETA: 2026-03-20
- 清关日：2026-03-21
- last_free_date: 2026-03-28
- 今天：2026-03-17

期望输出:
- 提柜日：2026-03-22（清关日 +1，且不是周末）
- 卸柜日：2026-03-22（Live load）或 2026-03-23+（Drop off）
```

### 测试场景 2：周末冲突

```typescript
输入:
- 清关日：2026-03-20（周五）
- 清关日 +1 = 2026-03-21（周六）❌

期望输出:
- 提柜日：2026-03-23（周一，跳过周末）
```

### 测试场景 3：产能不足

```typescript
输入:
- 候选仓库 A：未来 3 天已满
- 候选仓库 B：第 4 天有空位

期望输出:
- 提柜日：第 4 天对应的日期
- 仓库：B
```

---

## 🔗 七、参考文档

1. **Java 算法原文**: `D:\Filez\提送卸还\ContainerPlanning - 0913_release.java`

   - Case D 完整流程：1118-1207 行
   - 周末处理：898-911 行
   - 仓库容量查找：915-933 行

2. **LogiX 当前实现**: `backend/src/services/intelligentScheduling.service.ts`

   - calculatePlannedPickupDate: 431-447 行
   - scheduleSingleContainer: 241-424 行

3. **业务规则文档**: `frontend/public/docs/04-五节点调度与可视化方案.md`
   - 2.3.1 卸柜方式选择

---

**总结**: 计划提柜日不是简单的"清关日 +1"，而是一个**多约束条件下的优化问题**。需要综合考虑：

- ✅ 时间窗口（清关、ETA、last_free_date）
- ✅ 仓库容量（卸柜能力）
- ✅ 车队能力（送还能力）
- ✅ 周末效应
- ✅ 卸柜方式（Live/Drop）
- ✅ 成本优化（滞港费、堆场费、拖车费）

建议按 P0→P1→P2 的顺序逐步改进，最终实现与 Java 算法同等智能的排产系统。
