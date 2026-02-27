# 倒计时卡片计算逻辑文档

## 概述

LogiX 集装箱管理系统包含 4 个倒计时卡片，每个卡片显示不同维度的货柜统计信息。用户可以点击卡片中的数字来过滤表格数据。

---

## 1. 按到港倒计时卡片

### 数据来源
- `container.etaDestPort`: 集装箱表中的预计到港时间
- `container.ataDestPort`: 集装箱表中的实际到港时间
- `portOperations` 数组中 `portType === 'destination'` 的记录
  - `etaCorrection`: 修正后的预计到港时间（优先级最高）
  - `etaDestPort`: 预计到港时间
  - `ataDestPort`: 实际到港时间
- `container.logisticsStatus`: 物流状态（状态机）

### 状态过滤条件
**只统计以下状态的货柜**：
- `SHIPPED`（已出运/已装船）
- `IN_TRANSIT`（在途）
- `AT_PORT`（已到港）

**排除以下状态的货柜**：
- `NOT_SHIPPED`（未出运）
- `PICKED_UP`（已提柜）
- `UNLOADED`（已卸柜）
- `RETURNED_EMPTY`（已还箱）

### 统计逻辑

#### 已逾期未到港
- **条件**:
  1. 物流状态为 `SHIPPED` 或 `IN_TRANSIT`
  2. 有 ETA（优先使用 `etaCorrection`）
  3. 无 `ataDestPort`（未实际到港）
  4. ETA 已过期（当前时间 > ETA）
- **包含**: 已出运但预计到港时间已过，仍未实际到港的货柜
- **颜色**: 红色 (#f56c6c)

#### 到达中转港
- **条件**:
  1. 当前港口类型 `currentPortType === 'transit'`
  2. 有 `ataDestPort`（**注意**：在中转港场景下，后端API返回的 `ataDestPort` 字段实际存储的是 `transitArrivalDate`）
- **包含**: 已到达中转港但尚未到达目的港的货柜
- **颜色**: 灰色 (#909399)
- **说明**: 后端API根据 `portType` 动态选择日期字段，中转港使用 `transitArrivalDate`，目的港使用 `ataDestPort`，但统一返回到 `ataDestPort` 字段中

#### 今日累计到港
- **条件**:
  1. 物流状态为 `AT_PORT`（已到港）
  2. 有 `ataDestPort`（实际到港时间）
  3. 实际到港日期等于今天（00:00:00）
- **包含**: 今天实际到港但尚未有后续状态（提柜、卸柜、还箱）的货柜
- **颜色**: 绿色 (#67c23a)

#### 3天内预计到港
- **条件**:
  1. 物流状态为 `SHIPPED` 或 `IN_TRANSIT`
  2. 有 ETA（优先使用 `etaCorrection`）
  3. 无 `ataDestPort`（未实际到港）
  4. 当前距离 ETA 时间 ≤ 3 天
- **包含**: 尚未到港但预计 3 天内到港的货柜
- **颜色**: 橙色 (#e6a23c)

#### 7天内预计到港
- **条件**:
  1. 物流状态为 `SHIPPED` 或 `IN_TRANSIT`
  2. 有 ETA（优先使用 `etaCorrection`）
  3. 无 `ataDestPort`（未实际到港）
  4. 当前距离 ETA 时间 > 3 天且 ≤ 7 天
- **包含**: 尚未到港但预计 4-7 天内到港的货柜
- **颜色**: 蓝色 (#409eff)

#### >7天预计到港
- **条件**:
  1. 物流状态为 `SHIPPED` 或 `IN_TRANSIT`
  2. 有 ETA（优先使用 `etaCorrection`）
  3. 无 `ataDestPort`（未实际到港）
  4. 当前距离 ETA 时间 > 7 天
- **包含**: 尚未到港且预计超过 7 天到港的货柜
- **颜色**: 绿色 (#67c23a)

### ETA 数据优先级
```
destPortOp.etaCorrection > c.etaDestPort > destPortOp.etaDestPort
```

**说明**：
- `etaCorrection`（修正后的ETA）优先级最高
- 其次使用 `c.etaDestPort`（集装箱表中的ETA）
- 最后使用 `destPortOp.etaDestPort`（港口操作记录中的原始ETA）

### 统计汇总
- `count`: 所有预计到港且未实际到港的货柜总数（已逾期 + 3天 + 7天 + >7天）
- `urgent`: ≤ 3 天预计到港的货柜数
- `expired`: 已逾期未到港的货柜数（状态为 SHIPPED 或 IN_TRANSIT，且 ETA 已过期）

### 状态与统计的关系

| 物流状态 | 已逾期未到港 | 到达中转港 | 今日累计到港 | 预计到港统计 | 说明 |
|---------|-------------|-------------|--------------|--------------|------|
| NOT_SHIPPED（未出运） | ❌ 不统计 | ❌ 不统计 | ❌ 不统计 | ❌ 不统计 | 货柜尚未出运 |
| SHIPPED（已出运） | ✅ ETA过期则统计 | ✅ 有transit ATA则统计 | ❌ 不统计 | ✅ 按ETA统计 | 已装船但未到港 |
| IN_TRANSIT（在途） | ✅ ETA过期则统计 | ✅ 有transit ATA则统计 | ❌ 不统计 | ✅ 按ETA统计 | 货柜在运输中 |
| AT_PORT（已到港） | ❌ 不统计 | ✅ 有transit ATA则统计 | ✅ 今日到港则统计 | ❌ 不统计 | 已到港但未提柜 |
| PICKED_UP（已提柜） | ❌ 不统计 | ❌ 不统计 | ❌ 不统计 | ❌ 不统计 | 已到港后续状态 |
| UNLOADED（已卸柜） | ❌ 不统计 | ❌ 不统计 | ❌ 不统计 | ❌ 不统计 | 已到港后续状态 |
| RETURNED_EMPTY（已还箱） | ❌ 不统计 | ❌ 不统计 | ❌ 不统计 | ❌ 不统计 | 已到港后续状态 |

### 当前逻辑详细说明

#### 状态过滤（代码第 72-75 行）
```typescript
// 只统计已出运但未到港之后状态的货柜
if (!isShippedButNotArrived(logisticsStatus)) {
  return  // 直接跳过
}
```

`isShippedButNotArrived` 函数（代码第 51-66 行）：
- **只包含**：`SHIPPED`（已出运）、`IN_TRANSIT`（在途）、`AT_PORT`（已到港）
- **排除**：`PICKED_UP`（已提柜）、`UNLOADED`（已卸柜）、`RETURNED_EMPTY`（已还箱）

#### 具体处理逻辑

**1. 已有到港之后状态（PICKED_UP、UNLOADED、RETURNED_EMPTY）**
- **结果**：**完全排除，不统计**
- 这些货柜在第 73 行就被 `return` 跳过了，不会计入任何数字

**2. 状态为 AT_PORT（已到港）**
- **今日累计到港**（代码第 87-94 行）：
  - 条件：有 `ataDestPort` **且** 状态是 `AT_PORT`
  - 如果到港日期是今天，计入 `todayArrived`
- **预计到港**（代码第 96-112 行）：
  - 条件：有 `etaDate` **且** 无 `ataDestPort`
  - 因为已有 `ataDestPort`，**不会计入预计到港统计**

**3. 状态为 SHIPPED 或 IN_TRANSIT**
- **今日累计到港**：不计入（无 `ataDestPort`）
- **已逾期未到港**（代码第 109-112 行）：
  - 条件：有 `etaDate` 且无 `ataDestPort`，且 `etaDate` 已过期
  - 计入 `overdueNotArrived` 和 `expired`
- **预计到港**（代码第 99-108 行）：
  - 如果有 `etaDate` 且无 `ataDestPort`，按天数分类统计
  - 计入 `within3Days`、`within7Days` 或 `over7Days`

**关键点**：已有到港之后状态的货柜（PICKED_UP、UNLOADED、RETURNED_EMPTY）不会被统计到"按到港"卡片中。

---

## 2. 按提柜倒计时卡片

### 数据来源
- `portOperations` 数组中 `portType === 'destination'` 的记录
  - `ataDestPort`: 实际到港时间
  - `lastFreeDate`: 最后免费日期
- `truckingTransports` 数组中的拖卡运输记录
  - `plannedPickupDate`: 计划提柜日期
  - `pickupDate`: 实际提柜日期

### 统计逻辑

#### 今日计划提柜
- **条件**: 
  - 已到港（有 `ataDestPort`）
  - 未提柜（无 `pickupDate`）
  - 计划提柜日期等于今天（00:00:00）
- **颜色**: 红色 (#f56c6c)

#### 今日实际提柜
- **条件**: 
  - 已到港（有 `ataDestPort`）
  - 实际提柜日期等于今天（00:00:00）
- **颜色**: 绿色 (#67c23a)

#### 3天内预计提柜
- **条件**: 
  - 已到港（有 `ataDestPort`）
  - 未提柜（无 `pickupDate`）
  - 不是今日计划提柜
  - 最后免费日期距离现在 ≤ 3 天
- **颜色**: 橙色 (#e6a23c)

#### 7天内预计提柜
- **条件**: 
  - 已到港（有 `ataDestPort`）
  - 未提柜（无 `pickupDate`）
  - 不是今日计划提柜
  - 最后免费日期距离现在 > 3 天且 ≤ 7 天
- **颜色**: 蓝色 (#409eff)

### 统计汇总
- `count`: 今日计划 + 3天内 + 7天内预计提柜的货柜数
- `urgent`: 今日计划 + 3天内预计提柜的货柜数
- `expired`: 已超过最后免费日期但未提柜的货柜数

---

## 3. 最晚提柜倒计时卡片

### 数据来源
- `portOperations` 数组中 `portType === 'destination'` 的记录
  - `lastFreeDate`: 最后免费日期
- `truckingTransports` 数组
  - `pickupDate`: 实际提柜日期

### 统计逻辑

#### 已超时 (≤0天)
- **条件**: 
  - 有 `lastFreeDate`
  - 未提柜（无 `pickupDate`）
  - 最后免费日期已过期
- **颜色**: 红色 (#f56c6c)

#### 即将超时 (≤3天)
- **条件**: 
  - 有 `lastFreeDate`
  - 未提柜（无 `pickupDate`）
  - 最后免费日期距离现在 1-3 天
- **颜色**: 橙色 (#e6a23c)

#### 预警 (≤7天)
- **条件**: 
  - 有 `lastFreeDate`
  - 未提柜（无 `pickupDate`）
  - 最后免费日期距离现在 4-7 天
- **颜色**: 蓝色 (#409eff)

### 统计汇总
- `count`: 尚未超时的货柜数（1-7 天）
- `urgent`: 即将超时（≤3 天）的货柜数
- `expired`: 已超时的货柜数

---

## 4. 最晚还箱倒计时卡片

### 数据来源
- `emptyReturns` 数组
  - `lastReturnDate`: 最后还箱日期
  - `returnTime`: 实际还箱时间

### 统计逻辑

#### 已超时 (≤0天)
- **条件**: 
  - 有 `lastReturnDate`
  - 未还箱（无 `returnTime`）
  - 最后还箱日期已过期
- **颜色**: 红色 (#f56c6c)

#### 即将超时 (≤3天)
- **条件**: 
  - 有 `lastReturnDate`
  - 未还箱（无 `returnTime`）
  - 最后还箱日期距离现在 1-3 天
- **颜色**: 橙色 (#e6a23c)

#### 预警 (≤7天)
- **条件**: 
  - 有 `lastReturnDate`
  - 未还箱（无 `returnTime`）
  - 最后还箱日期距离现在 4-7 天
- **颜色**: 蓝色 (#409eff)

### 统计汇总
- `count`: 尚未超时的货柜数（1-7 天）
- `urgent`: 即将超时（≤3 天）的货柜数
- `expired`: 已超时的货柜数

---

## 倒计时时间计算

### 计算函数
```typescript
const getRemainingTime = (targetDate: string | Date | null | undefined) => {
  if (!targetDate) return null
  
  const target = new Date(targetDate)
  const now = new Date()
  const diff = target.getTime() - now.getTime()
  
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true }
  }
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)
  
  return { days, hours, minutes, seconds, isExpired: false }
}
```

### 时间单位说明
- `days`: 剩余天数（整数）
- `hours`: 剩余小时（0-23）
- `minutes`: 剩余分钟（0-59）
- `seconds`: 剩余秒数（0-59）
- `isExpired`: 是否已过期（true/false）

---

## 前端过滤逻辑

点击卡片数字后，`filteredContainers` 计算属性会根据以下规则过滤货柜：

### 状态过滤规则（适用于所有过滤类型）

**按到港过滤额外条件**：
- 只统计以下状态的货柜：`SHIPPED`、`IN_TRANSIT`、`AT_PORT`
- 排除：`NOT_SHIPPED`、`PICKED_UP`、`UNLOADED`、`RETURNED_EMPTY`

### 按到港过滤
- `overdue`: 预计到港时间已过期（ETA < 当前时间）且未实际到港（状态为 `SHIPPED` 或 `IN_TRANSIT`）
- `transit`: 当前港口类型为 `transit` 且有 `ataDestPort`（**注意**：在中转港场景下，`ataDestPort` 字段实际存储的是 `transitArrivalDate`）
- `today`: 实际到港日期等于今天 **且** 状态为 `AT_PORT`
- `0-3`: 预计到港时间 ≤ 3 天且未实际到港（状态为 `SHIPPED` 或 `IN_TRANSIT`）
- `4-7`: 预计到港时间 4-7 天且未实际到港（状态为 `SHIPPED` 或 `IN_TRANSIT`）
- `7+`: 预计到港时间 > 7 天且未实际到港（状态为 `SHIPPED` 或 `IN_TRANSIT`）

### 按提柜过滤
- `0`: 计划提柜日期等于今天
- `0-actual`: 实际提柜日期等于今天
- `0-3`: 最后免费日期 ≤ 3 天且未提柜
- `4-7`: 最后免费日期 4-7 天且未提柜

### 最晚提柜过滤
- `0`: 最后免费日期已过期且未提柜
- `1-3`: 最后免费日期 1-3 天且未提柜
- `4-7`: 最后免费日期 4-7 天且未提柜

### 最晚还箱过滤
- `0`: 最后还箱日期已过期且未还箱
- `1-3`: 最后还箱日期 1-3 天且未还箱
- `4-7`: 最后还箱日期 4-7 天且未还箱

---

## 注意事项

1. **数据完整性**: 统计依赖于相关联数据的完整性（portOperations、truckingTransports、emptyReturns 等）

2. **时间精度**: 所有时间比较都使用 UTC 时间戳，忽略时区影响

3. **当日判断**: 当日判断使用 `setHours(0, 0, 0, 0)` 将时间归零后比较

4. **过滤联动**: 搜索关键词和卡片过滤可以同时生效，搜索在前端过滤后的结果上再次过滤

5. **实时更新**: 使用定时器每秒更新 `currentTime`，自动刷新倒计时显示

---

## 相关文件

- 前端组件: `frontend/src/components/CountdownCard.vue`
- 计算逻辑: `frontend/src/composables/useContainerCountdown.ts`
- 页面组件: `frontend/src/views/shipments/Shipments.vue`
- 类型定义: `frontend/src/types/container.ts`
