# 到港倒计时验证文档

## 文档说明

本文档详细说明了LogiX系统中到港倒计时的计算逻辑、数据来源和验证方法。

**生成时间**: 2026年2月27日
**前端计算逻辑文件**: `frontend/src/composables/useContainerCountdown.ts`

---

## 一、核心计算公式

### 1. 倒计时计算函数

```typescript
const getRemainingTime = (targetDate: string | Date | null | undefined) => {
  if (!targetDate) return null

  const target = new Date(targetDate)
  const now = new Date()
  const diff = target.getTime() - now.getTime()

  // 已过期（倒计时<0）
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true }
  }

  // 未过期
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)

  return { days, hours, minutes, seconds, isExpired: false }
}
```

**关键点**:
- `diff = ETA时间 - 当前时间`
- `diff <= 0`: 已过期（倒计时<0）
- `diff > 0`: 剩余时间（天、时、分、秒）

---

## 二、数据来源与优先级

### 2.1 ETA（预计到港时间）优先级

```
destPortOp.etaCorrection > c.etaDestPort > destPortOp.etaDestPort
```

**数据来源**:
1. `portOperations[].etaCorrection`（最高优先级）- 修正后的ETA
2. `container.etaDestPort` - 集装箱表中的ETA
3. `portOperations[].etaDestPort` - 港口操作记录中的原始ETA

**获取方式**:
```typescript
const portOps = c.portOperations as PortOperation[] | undefined
const destPortOp = portOps?.find(po => po.portType === 'destination')
const etaDate = destPortOp?.etaCorrection || c.etaDestPort || destPortOp?.etaDestPort
```

### 2.2 ATA（实际到港时间）优先级

```
destPortOp.ataDestPort > c.ataDestPort
```

**数据来源**:
1. `portOperations[].ataDestPort`（最高优先级）
2. `container.ataDestPort`

**获取方式**:
```typescript
const ataDate = destPortOp?.ataDestPort || c.ataDestPort
```

---

## 三、状态过滤条件

### 3.1 只统计以下状态的货柜

| 状态代码 | 状态名称 | 说明 |
|---------|---------|------|
| `SHIPPED` | 已出运/已装船 | 已装船但未到港 |
| `IN_TRANSIT` | 在途 | 货柜在运输中 |
| `AT_PORT` | 已到港 | 已到港但未提柜 |

### 3.2 排除以下状态的货柜

| 状态代码 | 状态名称 | 说明 |
|---------|---------|------|
| `NOT_SHIPPED` | 未出运 | 货柜尚未出运 |
| `PICKED_UP` | 已提柜 | 已到港后续状态 |
| `UNLOADED` | 已卸柜 | 已到港后续状态 |
| `RETURNED_EMPTY` | 已还箱 | 已到港后续状态 |

### 3.3 状态判断函数

```typescript
const isShippedButNotArrived = (status: string) => {
  const statusIndex = [
    SimplifiedStatus.NOT_SHIPPED,      // index: 0
    SimplifiedStatus.SHIPPED,          // index: 1 ✅
    SimplifiedStatus.IN_TRANSIT,        // index: 2 ✅
    SimplifiedStatus.AT_PORT,          // index: 3 ✅
    SimplifiedStatus.PICKED_UP,         // index: 4 ❌
    SimplifiedStatus.UNLOADED,          // index: 5 ❌
    SimplifiedStatus.RETURNED_EMPTY     // index: 6 ❌
  ].indexOf(status as SimplifiedStatus)

  // 已出运（SHIPPED、IN_TRANSIT、AT_PORT）
  const isShipped = statusIndex >= 1 && statusIndex <= 3
  return isShipped
}
```

---

## 四、统计分类逻辑

### 4.1 统计分类概览

| 分类 | 条件 | 颜色 | days参数 |
|-----|------|------|---------|
| 已逾期未到港 | 倒计时<0 且状态为SHIPPED/IN_TRANSIT | 红色 #f56c6c | `overdue` |
| 今日累计到港 | ATA存在且等于今日，状态为AT_PORT | 绿色 #67c23a | `today` |
| 3天内预计到港 | 0<倒计时≤3天 | 橙色 #e6a23c | `0-3` |
| 7天内预计到港 | 3<倒计时≤7天 | 蓝色 #409eff | `4-7` |
| >7天预计到港 | 倒计时>7天 | 绿色 #67c23a | `7+` |
| 其他记录 | 符合状态条件但不属于上述任何分类 | 灰色 #909399 | `other` |

### 4.2 各分类详细逻辑

#### 4.2.1 已逾期未到港

**条件**:
1. 物流状态为 `SHIPPED` 或 `IN_TRANSIT`
2. 有ETA（优先使用etaCorrection）
3. 无ATA（未实际到港）
4. ETA已过期（当前时间 > ETA）

**代码逻辑**:
```typescript
if (etaDate && !ataDate) {
  const time = getRemainingTime(etaDate)
  if (time?.isExpired) {
    overdueNotArrived++
    expired++
  }
}
```

**示例**:
- 集装箱号: `CONT001`
- 状态: `IN_TRANSIT`
- ETA: `2026-02-25 10:00:00`
- ATA: `null`
- 当前时间: `2026-02-27 15:00:00`
- 倒计时: -2天5小时 → **已逾期未到港** ✅

#### 4.2.2 今日累计到港

**条件**:
1. 物流状态为 `AT_PORT`
2. 有ATA（实际到港时间）
3. ATA日期等于今天（00:00:00比较）

**代码逻辑**:
```typescript
if (ataDate && logisticsStatus === SimplifiedStatus.AT_PORT) {
  const arrivalDate = new Date(ataDate)
  arrivalDate.setHours(0, 0, 0, 0)
  if (arrivalDate.getTime() === today.getTime()) {
    todayArrived++
  }
}
```

**示例**:
- 集装箱号: `CONT002`
- 状态: `AT_PORT`
- ETA: `2026-02-27 08:00:00`
- ATA: `2026-02-27 07:30:00`
- 当前时间: `2026-02-27 15:00:00`
- 判断: ATA日期 === 今日 → **今日累计到港** ✅

#### 4.2.3 3天内预计到港

**条件**:
1. 物流状态为 `SHIPPED` 或 `IN_TRANSIT`
2. 有ETA（优先使用etaCorrection）
3. 无ATA（未实际到港）
4. 0 < 倒计时天数 ≤ 3

**代码逻辑**:
```typescript
if (etaDate && !ataDate) {
  const time = getRemainingTime(etaDate)
  if (time && !time.isExpired && time.days <= 3) {
    count++
    within3Days++
    urgent++
  }
}
```

**示例**:
- 集装箱号: `CONT003`
- 状态: `SHIPPED`
- ETA: `2026-02-28 10:00:00`
- ATA: `null`
- 当前时间: `2026-02-27 15:00:00`
- 倒计时: 0天19小时 → **3天内预计到港** ✅

#### 4.2.4 7天内预计到港

**条件**:
1. 物流状态为 `SHIPPED` 或 `IN_TRANSIT`
2. 有ETA（优先使用etaCorrection）
3. 无ATA（未实际到港）
4. 3 < 倒计时天数 ≤ 7

**代码逻辑**:
```typescript
if (etaDate && !ataDate) {
  const time = getRemainingTime(etaDate)
  if (time && !time.isExpired && time.days > 3 && time.days <= 7) {
    count++
    within7Days++
  }
}
```

**示例**:
- 集装箱号: `CONT004`
- 状态: `IN_TRANSIT`
- ETA: `2026-03-02 10:00:00`
- ATA: `null`
- 当前时间: `2026-02-27 15:00:00`
- 倒计时: 2天19小时 → **7天内预计到港** ✅

#### 4.2.5 >7天预计到港

**条件**:
1. 物流状态为 `SHIPPED` 或 `IN_TRANSIT`
2. 有ETA（优先使用etaCorrection）
3. 无ATA（未实际到港）
4. 倒计时天数 > 7

**代码逻辑**:
```typescript
if (etaDate && !ataDate) {
  const time = getRemainingTime(etaDate)
  if (time && !time.isExpired && time.days > 7) {
    count++
    over7Days++
  }
}
```

**示例**:
- 集装箱号: `CONT005`
- 状态: `SHIPPED`
- ETA: `2026-03-10 10:00:00`
- ATA: `null`
- 当前时间: `2026-02-27 15:00:00`
- 倒计时: 10天19小时 → **>7天预计到港** ✅

---

## 五、统计汇总

### 5.1 卡片显示的统计数据

```typescript
{
  count: number,      // 所有预计到港且未实际到港的货柜总数（已逾期+3天+7天+>7天）
  urgent: number,    // ≤ 3 天预计到港的货柜数
  expired: number,    // 已逾期未到港的货柜数
  filterItems: [
    { label: '已逾期未到港', count: overdueNotArrived, color: '#f56c6c', days: 'overdue' },
    { label: '今日累计到港', count: todayArrived, color: '#67c23a', days: 'today' },
    { label: '3天内预计到港', count: within3Days, color: '#e6a23c', days: '0-3' },
    { label: '7天内预计到港', count: within7Days, color: '#409eff', days: '4-7' },
    { label: '>7天预计到港', count: over7Days, color: '#67c23a', days: '7+' }
  ]
}
```

### 5.2 统计关系图

```
所有符合状态条件的货柜
├── 已实际到港（ATA存在）
│   └── 今日累计到港（ATA == 今日）
│
└── 未实际到港（ATA不存在）
    ├── 已逾期未到港（ETA < 当前时间）
    │   └── 计入 expired 和 overdueNotArrived
    │
    └── 未逾期（ETA >= 当前时间）
        ├── 0-3天预计到港
        │   └── 计入 urgent 和 within3Days
        │
        ├── 4-7天预计到港
        │   └── 计入 within7Days
        │
        └── >7天预计到港
            └── 计入 over7Days
```

---

## 六、"其他记录"分类说明

### 6.1 什么是"其他记录"

"其他记录"是指**符合状态条件**（SHIPPED、IN_TRANSIT、AT_PORT）但**不属于上述5个分类**的货柜。这些货柜可能存在数据缺失或异常情况。

### 6.2 "其他记录"的包含情况

| 情况 | 说明 | 示例 |
|-----|------|------|
| SHIPPED/IN_TRANSIT + 无ETA | 已出运或已在途，但没有ETA数据 | 状态=SHIPPED, ETA=null, ATA=null |
| SHIPPED/IN_TRANSIT + 既有ETA又有ATA | 已出运但ETA和ATA都存在（数据矛盾） | 状态=IN_TRANSIT, ETA存在, ATA存在 |
| AT_PORT + 无ATA | 状态是AT_PORT但没有ATA数据 | 状态=AT_PORT, ATA=null |
| AT_PORT + 非今日到港 | 状态是AT_PORT但ATA不是今天 | 状态=AT_PORT, ATA=2026-02-26 |

### 6.3 "其他记录"的统计逻辑

**代码逻辑**（在过滤逻辑中实现）:
```typescript
// 在 filterContainersByCondition 函数中
if (filterType === '按到港' && filterDays === 'other') {
  if (!isShippedButNotArrived(c.logisticsStatus)) {
    return false
  }

  // 检查是否属于"其他记录"
  if (ataDate && logisticsStatus === SimplifiedStatus.AT_PORT) {
    const arrivalDate = new Date(ataDate)
    arrivalDate.setHours(0, 0, 0, 0)
    // 今日到港则排除
    if (arrivalDate.getTime() === today.getTime()) {
      return false
    }
    // 非今日到港但状态是AT_PORT → 其他记录
    return true
  }

  // 已出运或在途，检查ETA情况
  if (etaDate && !ataDate) {
    const time = getRemainingTime(etaDate)
    if (time) {
      // 已被其他分类覆盖 → 排除
      return false
    }
  }

  // 无ETA但有ATA，或无ETA也无ATA → 其他记录
  return true
}
```

### 6.4 "其他记录"的作用

1. **数据质量检查**: 帮助发现数据缺失或异常的货柜
2. **异常追踪**: 快速定位需要人工处理的记录
3. **统计验证**: 确保所有符合条件的货柜都被统计到

### 6.5 "其他记录"示例

#### 示例1: 已出运但无ETA
```
集装箱号: CONT100
状态: SHIPPED
ETA: null
ATA: null
原因: 已出运但缺少ETA数据
分类: 其他记录
```

#### 示例2: 已到港但非今日
```
集装箱号: CONT200
状态: AT_PORT
ETA: 2026-02-26 10:00:00
ATA: 2026-02-26 08:00:00
当前时间: 2026-02-27 15:00:00
原因: AT_PORT状态但ATA是昨天，不是今日
分类: 其他记录
```

#### 示例3: 在途但无ETA
```
集装箱号: CONT300
状态: IN_TRANSIT
ETA: null
ATA: null
原因: 在途但缺少ETA数据
分类: 其他记录
```

---

## 七、状态与统计的映射表

| 物流状态 | 已逾期未到港 | 今日累计到港 | 预计到港统计 | 说明 |
|---------|-------------|--------------|--------------|------|
| NOT_SHIPPED（未出运） | ❌ 不统计 | ❌ 不统计 | ❌ 不统计 | 货柜尚未出运 |
| SHIPPED（已出运） | ✅ ETA过期则统计 | ❌ 不统计 | ✅ 按ETA统计 | 已装船但未到港 |
| IN_TRANSIT（在途） | ✅ ETA过期则统计 | ❌ 不统计 | ✅ 按ETA统计 | 货柜在运输中 |
| AT_PORT（已到港） | ❌ 不统计 | ✅ 今日到港则统计 | ❌ 不统计 | 已到港但未提柜 |
| PICKED_UP（已提柜） | ❌ 不统计 | ❌ 不统计 | ❌ 不统计 | 已到港后续状态 |
| UNLOADED（已卸柜） | ❌ 不统计 | ❌ 不统计 | ❌ 不统计 | 已到港后续状态 |
| RETURNED_EMPTY（已还箱） | ❌ 不统计 | ❌ 不统计 | ❌ 不统计 | 已到港后续状态 |

---

## 七、验证检查清单

### 7.1 数据完整性检查

- [ ] 每个货柜都有 `logisticsStatus` 字段
- [ ] 货柜有 `portOperations` 数组或单个 `portOperation` 对象
- [ ] `portOperations` 中有 `portType === 'destination'` 的记录
- [ ] ETA字段至少有一个数据源存在（etaCorrection / etaDestPort / portOp.etaDestPort）
- [ ] ATA字段至少有一个数据源存在（ataDestPort / portOp.ataDestPort）

### 7.2 计算逻辑检查

- [ ] 倒计时计算正确：`diff = ETA - 当前时间`
- [ ] `diff <= 0` 时 `isExpired = true`
- [ ] 时间单位转换正确（天、时、分、秒）
- [ ] 日期归零比较正确（`setHours(0,0,0,0)`）

### 7.3 状态过滤检查

- [ ] 只统计 SHIPPED、IN_TRANSIT、AT_PORT 状态的货柜
- [ ] 排除 NOT_SHIPPED、PICKED_UP、UNLOADED、RETURNED_EMPTY 状态的货柜
- [ ] AT_PORT状态只统计今日到港，不统计预计到港

### 7.4 数据优先级检查

- [ ] ETA优先级：etaCorrection > c.etaDestPort > portOp.etaDestPort
- [ ] ATA优先级：portOp.ataDestPort > c.ataDestPort
- [ ] 修正ETA（etaCorrection）优先于原始ETA

### 7.5 统计分类检查

- [ ] 已逾期未到港：ETA < 当前时间 && 状态=SHIPPED/IN_TRANSIT && 无ATA
- [ ] 今日累计到港：ATA存在 && ATA==今日 && 状态=AT_PORT
- [ ] 3天内预计到港：0<天数≤3 && 状态=SHIPPED/IN_TRANSIT && 无ATA
- [ ] 7天内预计到港：3<天数≤7 && 状态=SHIPPED/IN_TRANSIT && 无ATA
- [ ] >7天预计到港：天数>7 && 状态=SHIPPED/IN_TRANSIT && 无ATA

---

## 八、常见问题排查

### Q1: 为什么某货柜没有出现在任何统计中？

**可能原因**:
1. 物流状态不在允许范围内（可能是NOT_SHIPPED、PICKED_UP等）
2. 没有ETA数据
3. 状态是AT_PORT但没有ATA数据

**排查方法**:
```typescript
// 检查状态
console.log('物流状态:', container.logisticsStatus)

// 检查ETA数据
console.log('portOperations:', container.portOperations)
console.log('c.etaDestPort:', container.etaDestPort)

// 检查ATA数据
console.log('c.ataDestPort:', container.ataDestPort)
```

### Q2: 为什么修正ETA没有生效？

**可能原因**:
1. `portOperations` 数组中不存在 `portType === 'destination'` 的记录
2. 该记录的 `etaCorrection` 字段为空

**排查方法**:
```typescript
const portOps = container.portOperations
const destPortOp = portOps?.find(po => po.portType === 'destination')
console.log('目的港操作记录:', destPortOp)
console.log('修正ETA:', destPortOp?.etaCorrection)
```

### Q3: 为什么统计数量与实际不符？

**可能原因**:
1. 只统计了当前页的货柜，而非所有货柜
2. 前端过滤逻辑与后端数据不一致

**排查方法**:
- 确认使用 `allContainers` 进行统计，而非 `containers`
- 检查 `loadContainersByFilter` 是否正确从数据库获取所有数据

### Q4: 倒计时显示为负数（过期）但仍显示在"预计到港"中？

**原因**:
- 这是正常情况，已逾期的货柜会显示在"已逾期未到港"分类中
- 不会出现在"3天内"、"7天内"、">7天"这些预计到港分类中

---

## 九、手动计算验证

### 9.1 手动计算公式

**倒计时天数计算**:
```
倒计时天数 = (ETA时间戳 - 当前时间戳) / (1000 * 60 * 60 * 24)
```

**JavaScript示例**:
```javascript
const etaDate = new Date('2026-02-28 10:00:00')
const now = new Date('2026-02-27 15:00:00')
const diffMs = etaDate.getTime() - now.getTime()
const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
console.log('倒计时天数:', days)  // 输出: 0
```

### 9.2 验证步骤

1. **获取货柜数据**
   ```typescript
   const container = {
     containerNumber: 'CONT001',
     logisticsStatus: 'IN_TRANSIT',
     etaDestPort: '2026-02-28T10:00:00Z',
     portOperations: [
       {
         portType: 'destination',
         etaCorrection: null,
         etaDestPort: '2026-02-28T10:00:00Z',
         ataDestPort: null
       }
     ]
   }
   ```

2. **手动计算ETA**
   ```
   ETA = 2026-02-28 10:00:00
   当前 = 2026-02-27 15:00:00
   差值 = 19小时 = 0.79天
   向下取整 = 0天
   ```

3. **判断分类**
   ```
   状态: IN_TRANSIT ✅
   ETA: 存在 ✅
   ATA: 不存在 ✅
   倒计时: 0天 > 0 ✅
   0 <= 3天 ✅
   → 3天内预计到港
   ```

---

## 十、相关文件索引

| 文件路径 | 说明 |
|---------|------|
| `frontend/src/composables/useContainerCountdown.ts` | 倒计时计算逻辑 |
| `frontend/src/views/shipments/Shipments.vue` | 货柜列表页面 |
| `frontend/src/components/CountdownCard.vue` | 倒计时卡片组件 |
| `frontend/src/utils/logisticsStatusMachine.ts` | 物流状态机定义 |
| `frontend/src/types/container.ts` | 货柜类型定义 |
| `docs/COUNTDOWN_CARD_LOGIC.md` | 倒计时卡片逻辑文档 |

---

## 附录：完整计算流程代码

```typescript
// 1. 获取数据
const portOps = c.portOperations as PortOperation[] | undefined
const destPortOp = portOps?.find(po => po.portType === 'destination')

// 2. 按优先级获取ETA和ATA
const etaDate = destPortOp?.etaCorrection || c.etaDestPort || destPortOp?.etaDestPort
const ataDate = destPortOp?.ataDestPort || c.ataDestPort

// 3. 状态过滤
if (!isShippedButNotArrived(logisticsStatus)) {
  return  // 跳过不符合条件的货柜
}

// 4. 判断分类
if (ataDate && logisticsStatus === SimplifiedStatus.AT_PORT) {
  // 今日累计到港
  const arrivalDate = new Date(ataDate)
  arrivalDate.setHours(0, 0, 0, 0)
  if (arrivalDate.getTime() === today.getTime()) {
    todayArrived++
  }
} else if (etaDate && !ataDate) {
  // 预计到港
  const time = getRemainingTime(etaDate)
  if (time?.isExpired) {
    // 已逾期未到港
    overdueNotArrived++
    expired++
  } else if (time) {
    // 未逾期，按天数分类
    count++
    if (time.days <= 3) {
      within3Days++
      urgent++
    } else if (time.days <= 7) {
      within7Days++
    } else {
      over7Days++
    }
  }
}
```

---

**文档版本**: v1.0
**最后更新**: 2026-02-27
**维护者**: LogiX开发团队
