# 时间预测 TAB 逻辑梳理

## 概述

时间预测 TAB 位于货柜详情页，用于展示货柜在各个关键节点的预计时间和实际时间，帮助操作人员提前了解货柜流转进度。

## 数据流

```
前端 TimePredictionTab
  ↓ GET /api/v1/time/predict/:containerNumber
后端 TimeService.getContainerTimePrediction()
  ↓ 查询数据库
    - Container (基础信息 + seaFreight + portOperations)
    - TruckingTransport (拖卡运输)
    - WarehouseOperation (仓库操作)
    - EmptyReturn (还空箱)
  ↓ 计算预测
  ↑ 返回预测数据
前端展示
```

## 核心字段定义

### 1. 当前状态 (currentStatus)

**状态判断逻辑**（优先级从高到低）：

| 状态   | 判断条件                                                    |
| ------ | ----------------------------------------------------------- |
| 已还箱 | `emptyReturn.returnTime` 存在                               |
| 已卸柜 | `warehouseOp.unloadDate` 或 `warehouseOp.unboxingTime` 存在 |
| 已提柜 | `trucking.pickupDate` 存在                                  |
| 已到港 | `destinationPort.ata` 存在                                  |
| 在途   | `destinationPort.eta` 存在                                  |
| 未知   | 以上都不满足                                                |

**状态标签颜色**：

- success: 已还箱、已卸柜、已提柜、已到港
- warning: 在途
- info: 未知
- primary: 其他

### 2. 目的港信息

| 字段 | 数据源                | 说明           |
| ---- | --------------------- | -------------- |
| ETA  | `dest.eta` → `sf.eta` | 目的港预计到港 |
| ATA  | `dest.ata` → `sf.ata` | 目的港实际到港 |

优先级：先取 `destinationPortOperation`，若无则取 `SeaFreight`

### 3. 预计时间 (estimatedTimes)

#### 3.1 预计提柜 (pickup)

**计算逻辑**：

```
IF trucking.pickupDate EXISTS:
  RETURN trucking.pickupDate
ELSE IF destinationPort.ata EXISTS:
  RETURN ata + 2 天
ELSE IF destinationPort.eta EXISTS:
  RETURN eta + 2 天
ELSE:
  RETURN null
```

**业务规则**：到港后 2 天提柜

#### 3.2 预计卸柜 (unloading)

**计算逻辑**：

```
IF warehouseOp.unloadDate OR warehouseOp.unboxingTime EXISTS:
  RETURN 实际卸柜日期
ELSE IF trucking.pickupDate EXISTS:
  RETURN pickupDate + 1 天
ELSE IF pickupPrediction EXISTS:
  RETURN predictedPickup + 1 天
ELSE:
  RETURN null
```

**业务规则**：提柜后 1 天卸柜

#### 3.3 预计还箱 (return)

**计算逻辑**：

```
IF emptyReturn.returnTime EXISTS:
  RETURN emptyReturn.returnTime
ELSE IF warehouseOp.unboxingTime EXISTS:
  RETURN unboxingTime + 3 天
ELSE IF unloadingPrediction EXISTS:
  RETURN predictedUnloading + 3 天
ELSE:
  RETURN null
```

**业务规则**：卸柜后 3 天还箱

#### 3.4 预计流程完成 (completion)

**计算逻辑**：

```
RETURN predictedReturn
```

当前与预计还箱时间一致

### 4. 实际时间 (actualTimes)

| 字段      | 数据源                                                 | 说明         |
| --------- | ------------------------------------------------------ | ------------ |
| pickup    | `trucking.pickupDate`                                  | 实际提柜日期 |
| unloading | `warehouseOp.unloadDate` 或 `warehouseOp.unboxingTime` | 实际卸柜日期 |
| return    | `emptyReturn.returnTime`                               | 实际还箱时间 |

## 预测算法总结

### 依赖关系链

```
还箱时间 ← 卸柜时间 ← 提柜时间 ← 到港时间 (ATA/ETA)
```

### 预测原则

1. **实际优先**：有实际数据则使用实际数据
2. **逐层推导**：基于上游节点预测下游节点
3. **固定周期**：
   - 提柜：到港后 2 天
   - 卸柜：提柜后 1 天
   - 还箱：卸柜后 3 天

### 预测场景

| 场景                     | 提柜  | 卸柜     | 还箱       |
| ------------------------ | ----- | -------- | ---------- |
| 已到港 (有 ATA)          | ATA+2 | ATA+3    | ATA+6      |
| 在途 (有 ETA)            | ETA+2 | ETA+3    | ETA+6      |
| 已提柜 (有 pickupDate)   | 实际  | pickup+1 | pickup+4   |
| 已卸柜 (有 unboxingTime) | 实际  | 实际     | unboxing+3 |
| 已还箱 (有 returnTime)   | 实际  | 实际     | 实际       |

## 前端展示结构

```
时间预测
├── 状态标签 (当前状态)
├── 港口与在途
│   ├── 目的港 ETA
│   └── 目的港 ATA
├── 预计节点
│   ├── 预计提柜
│   ├── 预计卸柜
│   ├── 预计还箱
│   └── 预计流程完成
└── 实际节点（已有则显示）
    ├── 实际提柜
    ├── 实际卸柜
    └── 实际还箱
```

## 日期格式化

- 格式：`YYYY-MM-DD HH:mm`
- 空值处理：`null` / `undefined` / 无效日期 → 显示 `—`

## 关键代码位置

### 前端

- 组件：`frontend/src/views/shipments/components/TimePredictionTab.vue`
- API 服务：`frontend/src/services/time.ts`
- 接口定义：`TimePredictionPayload`

### 后端

- 服务类：`backend/src/services/timeService.ts`
- 方法：`getContainerTimePrediction()`
- 路由：`/api/v1/time/predict/:containerNumber`

## 数据来源表

| 实体               | 表名                           | 主要字段                                           |
| ------------------ | ------------------------------ | -------------------------------------------------- |
| Container          | `biz_containers`               | containerNumber, billOfLadingNumber                |
| SeaFreight         | `process_sea_freight`          | eta, ata, mblNumber                                |
| PortOperation      | `process_port_operations`      | portType, eta, ata, plannedCustomsDate             |
| TruckingTransport  | `process_trucking_transport`   | pickupDate, plannedPickupDate, plannedDeliveryDate |
| WarehouseOperation | `process_warehouse_operations` | unloadDate, unboxingTime, plannedUnloadDate        |
| EmptyReturn        | `process_empty_return`         | returnTime, plannedReturnDate                      |

## 业务价值

1. **提前规划**：预测卸柜、还箱时间，便于仓库和车队安排
2. **进度透明**：清晰展示货柜流转的各个节点
3. **异常预警**：实际与预计对比，及时发现延误
4. **决策支持**：为智能排柜提供时间参考

## 优化建议

### 当前局限

1. **固定周期过于理想化**
   - 到港后 2 天提柜、提柜后 1 天卸柜、卸柜后 3 天还箱
   - 未考虑不同港口、仓库、车队的实际操作效率差异
   - 未考虑周末、节假日因素

2. **未考虑产能约束**
   - 仓库日卸柜能力限制（`daily_unload_capacity`）
   - 车队日运输能力限制（`daily_capacity`）
   - 堆场还箱档期限制（`hasYard` 车队的还箱槽位）
   - 已有排产占用情况（`ext_warehouse_daily_occupancy`、`ext_trucking_slot_occupancy`）

3. **未区分操作模式**
   - Live Unload（直接卸柜）vs Direct（ Drop off 还箱）
   - 不同模式的作业周期差异

4. **与智能排柜脱节**
   - 未使用排产引擎的实际安排时间
   - 未考虑智能排柜的产能日历
   - 预测结果可能与排产结果不一致

5. **缺乏历史数据学习**
   - 未基于历史实际操作时间优化预测参数
   - 未统计预测准确率

### 改进方案

#### 方案 A：基于智能排柜的预测（推荐）

**核心思路**：直接调用智能排柜引擎，获取真实的排产时间

```typescript
// 改进后的预测逻辑
async function predictWithSchedulingEngine(containerNumber: string) {
  // 1. 查询该货柜是否已有排产计划
  const scheduledPlan = await schedulingService.getContainerPlan(containerNumber)

  if (scheduledPlan) {
    // 有排产：使用实际排产时间
    return {
      pickup: scheduledPlan.plannedPickupDate,
      unloading: scheduledPlan.plannedUnloadDate,
      return: scheduledPlan.plannedReturnDate,
      completion: scheduledPlan.plannedCompletionDate,
    }
  } else {
    // 无排产：调用排产引擎模拟排产
    const simulation = await schedulingService.simulateScheduling(containerNumber)
    return {
      pickup: simulation.truckingDate,
      unloading: simulation.warehouseDate,
      return: simulation.returnDate,
      completion: simulation.completionDate,
    }
  }
}
```

**优势**：

- 预测结果与排产结果一致
- 考虑产能约束（仓库/车队/堆场）
- 考虑节假日和周末
- 考虑映射关系（港口→车队→仓库）

#### 方案 B：基于产能日历的启发式预测

**核心思路**：使用产能日历数据，逐层推算

```typescript
// 改进后的预测逻辑（考虑产能）
async function predictWithCapacityCalendar(container: Container) {
  // 1. 确定目的港
  const destPort = container.portOperations?.find(op => op.portType === 'destination')
  const eta = destPort?.eta || container.seaFreight?.eta

  if (!eta) return null

  // 2. 获取销往国家
  const country = container.order?.sellToCountry

  // 3. 获取默认资源（清关行、车队、仓库）
  const resources = await getDefaultResources(country, destPort.portCode)

  // 4. 基于产能日历逐层推算
  let pickupDate = await findAvailableDate(
    eta,
    resources.truckingCompanyId,
    'trucking',
    2 // 最早可提柜日期偏移
  )

  let unloadDate = await findAvailableDate(pickupDate, resources.warehouseCode, 'warehouse', 1)

  let returnDate = await findAvailableDate(
    unloadDate,
    resources.truckingCompanyId,
    'trucking-return',
    3
  )

  return { pickupDate, unloadDate, returnDate }
}

// 查找下一个可用日期
async function findAvailableDate(
  startDate: Date,
  resourceId: string,
  resourceType: 'trucking' | 'warehouse' | 'trucking-return',
  minOffset: number
) {
  let currentDate = addDays(startDate, minOffset)

  while (true) {
    // 检查是否为工作日（排除周末/节假日）
    if (!isWorkingDay(currentDate)) {
      currentDate = addDays(currentDate, 1)
      continue
    }

    // 检查产能是否可用
    const capacity = await getCapacity(resourceType, resourceId, currentDate)
    if (capacity.status !== '超负荷' && capacity.status !== '紧张') {
      return currentDate
    }

    // 产能已满，尝试下一天
    currentDate = addDays(currentDate, 1)
  }
}
```

**优势**：

- 考虑产能约束
- 考虑工作日/节假日
- 不依赖完整排产引擎

#### 方案 C：混合预测（过渡方案）

**核心思路**：

- 已有排产：使用排产时间
- 无排产：使用当前简单预测 + 产能校验

```typescript
async function predictHybrid(containerNumber: string) {
  // 1. 尝试获取排产计划
  const plan = await getContainerPlan(containerNumber)
  if (plan) {
    return extractDatesFromPlan(plan)
  }

  // 2. 无排产：使用简单预测，但校验产能
  const simplePrediction = predictSimple(containerNumber)

  // 3. 校验产能，如不可用则顺延
  const validatedPrediction = await validateAndAdjust(simplePrediction, containerNumber)

  return validatedPrediction
}
```

### 实施建议

**优先级排序**：

1. **短期（1-2 周）**：方案 C（混合预测）
   - 最小改动
   - 立即提升准确性
   - 为方案 A 铺路

2. **中期（1 个月）**：方案 A（基于排产引擎）
   - 预测与排产统一
   - 消除数据不一致
   - 提升系统可信度

3. **长期优化**：
   - 历史数据学习优化参数
   - 预测准确率统计
   - 机器学习模型训练

### 关键依赖

- 智能排柜引擎：`backend/src/services/intelligentScheduling.service.ts`
- 产能日历：`backend/src/utils/smartCalendarCapacity.ts`
- 资源档期 API：`/api/v1/scheduling/resources/capacity/range`
- 前端档期组件：`frontend/src/views/scheduling/components/CalendarCapacityView.vue`

### 数据表依赖

- `ext_warehouse_daily_occupancy`：仓库日产能占用
- `ext_trucking_slot_occupancy`：车队日运输占用
- `ext_trucking_return_slot_occupancy`：车队还箱占用
- `dict_scheduling_config`：排产配置（工作日定义、能力倍率等）
