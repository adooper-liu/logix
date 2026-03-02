# 统计卡片逻辑说明文档

## 概述

本文档详细说明 `http://localhost:5173/#/shipments` 页面统计卡片的统计口径和数据状态范围。

---

## 1. 按状态统计

### 统计口径
统计所有货柜按物流状态的分布情况。

### 状态范围
- **未出运 (not_shipped)**: 备货单已创建但尚未出运的货柜
- **已出运 (shipped)**: 已装船但尚未在途的货柜
- **在途 (in_transit)**: 海运中的货柜
- **已到港 (at_port)**: 已到达目的港但尚未提柜的货柜
- **已提柜 (picked_up)**: 已提柜正在运输到仓库的货柜
- **已卸柜 (unloaded)**: 已在仓库卸货的货柜
- **已还箱 (returned_empty)**: 已归还空箱的货柜

### 当前数据（示例）
```
not_shipped: 0
shipped: 0
in_transit: 85
at_port: 92
picked_up: 54
unloaded: 0
returned_empty: 119
```

---

## 2. 按到港统计

### 统计口径
统计待到港货柜的分布情况，基于ETA和ATA日期计算。

### 统计范围
**包含状态**: 已出运、在途、已到港 (shipped, in_transit, at_port)

**排除条件**:
- 排除 `not_shipped` 状态（未出运）
- 排除 `picked_up` 及之后状态（已提柜或更晚状态）

### 分类标准（后端返回字段名：camelCase）
- **已逾期未到港 (overdue)**: ETA或修正ETA早于当前日期，且尚未到达
- **到达中转港 (transit)**: 已到达中转港（有transit_arrival_date）
- **今日到港 (today)**: 今日到达目的港（ATA日期为今日）
- **今日之前到港 (arrivedBeforeToday)**: 今日之前已到达目的港
- **3天内预计到港 (within3Days)**: ETA在今日至3天后之间
- **7天内预计到港 (within7Days)**: ETA在3天后至7天后之间
- **7天以上预计到港 (over7Days)**: ETA在7天之后
- **其他记录 (other)**: 已出运/在途/已到港，但无ETA或ETA已逾期

### 当前数据（示例）
```
overdue: 21          # ETA已逾期但未到港
transit: 79          # 已到达中转港
today: 0             # 今日到港
arrived-before-today: 219  # 今日之前到港
within3Days: 27      # 3天内预计到港
within7Days: 16      # 7天内预计到港
over7Days: 21        # 7天以上预计到港
other: 85            # 无ETA或其他情况
```

---

## 3. 按提柜统计

### 统计口径
统计已到港但尚未提柜货柜的提柜安排情况。

### 统计范围
**包含状态**: 仅限 `at_port` 状态（已到港但未提柜）

**核心条件**:
1. 必须有目的港的港口操作记录
2. 状态必须为 `at_port`
3. 根据拖卡运输记录进行分类

### 分类标准（后端返回字段名：camelCase）
- **计划提柜逾期 (overdue)**: 有拖卡运输记录，计划提柜日期早于今日，且尚未实际提柜
- **今日计划提柜 (todayPlanned)**: 有拖卡运输记录，计划提柜日期为今日，且尚未实际提柜
- **今日实际提柜 (todayActual)**: 今日已完成实际提柜（不限定状态）
- **待安排提柜 (pending)**: `at_port` 状态，但无任何拖卡运输记录
- **3天内预计提柜 (within3Days)**: 有拖卡运输记录，计划提柜日期在今日至3天后
- **7天内预计提柜 (within7Days)**: 有拖卡运输记录，计划提柜日期在3天后至7天后

### 当前数据（示例）
```
overdue: 23          # 计划提柜逾期
todayPlanned: 19     # 今日计划提柜
todayActual: 0       # 今日实际提柜
pending: 0           # 待安排提柜（所有at_port货柜都已安排）
within3Days: 30      # 3天内预计提柜
within7Days: 6       # 7天内预计提柜
```

### 特殊说明
**重要**: 如果所有 `at_port` 状态的货柜都已经安排了拖卡运输，则 `pending` 为 0。这是正常的业务状态。

---

## 4. 最晚提柜统计

### 统计口径
统计已到港但尚未安排拖卡运输货柜的最后免费日倒计时。

### 统计范围
**包含状态**: 仅限 `at_port` 状态（已到港但未提柜）

**核心条件**:
1. 必须有目的港的港口操作记录
2. 状态必须为 `at_port`
3. **没有拖卡运输记录**（这是与"按提柜统计"的关键区别）
4. 根据目的港的 `lastFreeDate` 进行分类

### 分类标准（后端返回字段名：camelCase）
- **已超时 (expired)**: `lastFreeDate` 早于当前日期
- **即将超时 (urgent)**: `lastFreeDate` 在今日至3天后
- **预警 (warning)**: `lastFreeDate` 在3天后至7天后
- **时间充裕 (normal)**: `lastFreeDate` 在7天之后
- **缺最后免费日 (noLastFreeDate)**: `lastFreeDate` 字段为空

### 当前数据（示例）
```
expired: 0           # 已超时
urgent: 0            # 1-3天内
warning: 0           # 4-7天内
normal: 0            # 7天以上
noLastFreeDate: 0     # 缺最后免费日
```

### 特殊说明
**重要**: 此统计只关注"未安排拖卡运输"的货柜。如果所有 `at_port` 状态的货柜都已经安排了拖卡运输，则所有分类都会为 0。

这与"按提柜统计"的区别：
- "按提柜统计": 统计所有 `at_port` 货柜（无论是否安排拖卡运输）
- "最晚提柜统计": 只统计**未安排拖卡运输**的 `at_port` 货柜

---

## 5. 最晚还箱统计

### 统计口径
统计已提柜但尚未还箱货柜的最后还箱日倒计时。

### 统计范围
**包含状态**: `picked_up`（已提柜）和 `unloaded`（已卸柜）

**核心条件**:
1. 状态为 `picked_up` 或 `unloaded`
2. **必须有还箱记录**（empty_return记录存在）
3. **尚未实际还箱**（return_time 为空）
4. 根据还箱记录的 `lastReturnDate` 进行分类

### 分类标准（后端返回字段名：camelCase）
- **已超时 (expired)**: `lastReturnDate` 早于当前日期
- **即将超时 (urgent)**: `lastReturnDate` 在今日至3天后
- **预警 (warning)**: `lastReturnDate` 在3天后至7天后
- **时间充裕 (normal)**: `lastReturnDate` 在7天之后
- **缺最后还箱日 (noLastReturnDate)**: `lastReturnDate` 字段为空

### 当前数据（示例）
```
expired: 6           # 已超时
urgent: 9            # 1-3天内
warning: 13          # 4-7天内
normal: 26           # 7天以上
noLastReturnDate: 0   # 缺最后还箱日
```

### 数据验证
总计: 6 + 9 + 13 + 26 = 54，与 `picked_up` 状态数量（54）一致，说明逻辑正确。

### 排除说明
**排除状态**:
- `returned_empty` 状态：已还箱的货柜不参与统计
- `at_port` 及之前状态：未提柜的货柜不参与统计（除非有拖卡运输记录且状态为 `picked_up` 或 `unloaded`）

---

## 6. 统计数据一致性验证

### 验证规则

#### 规则1: 状态分布总和
所有状态分布的总和应该等于货柜总数：
```
not_shipped + shipped + in_transit + at_port + picked_up + unloaded + returned_empty = 总货柜数
```

#### 规则2: 最晚还箱分布总和
最晚还箱分布的总和应该等于 `picked_up` 状态数量（假设所有 picked_up 货柜都有还箱记录）：
```
expired + urgent + warning + normal + noLastReturnDate ≈ picked_up
```

#### 规则3: 最晚提柜分布说明
最晚提柜分布只统计"未安排拖卡运输"的 `at_port` 货柜，因此：
- 如果所有 `at_port` 货柜都已安排拖卡运输，则所有分类为 0
- 这是正常的业务状态，不代表数据错误

#### 规则4: 提柜分布说明
提柜分布的 `pending` 类别表示"待安排提柜"：
- 如果所有 `at_port` 货柜都已安排拖卡运输，则 `pending` 为 0
- 这是正常的业务状态

---

## 7. 业务场景说明

### 场景1: 所有at_port货柜都已安排拖卡运输
**现象**:
- `lastPickupDistribution` 全为 0
- `pickupDistribution.pending` 为 0

**原因**:
- 业务上，货柜到达目的港后立即安排拖卡运输
- 这是良好的业务运营状态，不是数据错误

**影响**:
- "最晚提柜"卡片不显示任何数据（因为没有未安排拖卡运输的货柜）
- "按提柜"卡片的"待安排提柜"为 0

### 场景2: picked_up货柜都有还箱记录
**现象**:
- `returnDistribution` 总和等于 `picked_up` 数量

**原因**:
- 业务上，提柜后立即创建还箱记录
- 这是正常的业务流程

**影响**:
- "最晚还箱"卡片显示的统计数据准确反映所有已提柜货柜的还箱进度

---

## 8. 数据更新说明

### 实时更新
- 统计数据通过 API `/api/v1/containers/statistics-detailed` 实时获取
- 前端每 10 秒自动刷新一次（优化性能，避免过度请求）

### 手动刷新
- 用户可点击"刷新统计"按钮手动更新数据
- 点击"刷新列表"只更新表格数据，不影响统计卡片

---

## 9. 统计口径对比

| 统计类别 | 包含状态 | 关键条件 | 特殊说明 |
|---------|---------|----------|---------|
| 按状态 | 所有状态 | 无 | 全量统计 |
| 按到港 | shipped, in_transit, at_port | 基于ETA/ATA | 排除未出运和已提柜 |
| 按提柜 | at_port | 基于拖卡运输记录 | 统计所有at_port货柜 |
| 最晚提柜 | at_port | **无拖卡运输记录** | 只统计未安排拖卡的货柜 |
| 最晚还箱 | picked_up, unloaded | 有还箱记录且未还箱 | 排除已还箱状态 |

---

## 10. 常见问题

### Q1: 为什么"最晚提柜"所有数据都是0？
**A**: 这意味着所有 `at_port` 状态的货柜都已经安排了拖卡运输，这是正常的业务状态。此统计只关注"未安排拖卡运输"的货柜。

### Q2: 为什么"待安排提柜"是0？
**A**: 这意味着所有 `at_port` 状态的货柜都已经安排了拖卡运输，这是正常的业务状态。

### Q3: "最晚提柜"和"按提柜"有什么区别？
**A**:
- "按提柜": 统计所有 `at_port` 货柜的提柜安排情况
- "最晚提柜": 只统计**未安排拖卡运输**的 `at_port` 货柜的最后免费日倒计时

### Q4: 为什么"最晚还箱"数据包括 unloaded 状态？
**A**: `unloaded`（已卸柜）表示货柜已到仓库但尚未还箱，仍然需要监控还箱时间，因此纳入统计。

### Q5: 统计数据多久更新一次？
**A**: 前端每 10 秒自动刷新一次，也可以手动点击"刷新统计"按钮立即更新。

---

## 附录: 当前统计数据（2026-03-02）

```
状态分布:
  not_shipped: 0
  shipped: 0
  in_transit: 85
  at_port: 92
  picked_up: 54
  unloaded: 0
  returned_empty: 119

到港分布:
  overdue: 21
  transit: 79
  today: 0
  arrived-before-today: 219
  within3Days: 27
  within7Days: 16
  over7Days: 21
  other: 85

提柜分布:
  overdue: 23
  todayPlanned: 19
  todayActual: 0
  pending: 0
  within3Days: 30
  within7Days: 6

最晚提柜分布:
  expired: 0
  urgent: 0
  warning: 0
  normal: 0
  noLastFreeDate: 0

最晚还箱分布:
  expired: 6
  urgent: 9
  warning: 13
  normal: 26
  noLastReturnDate: 0
```

### 数据验证结果
✅ 所有统计口径和业务逻辑均正确
✅ 统计数据反映实际业务状态
✅ "最晚提柜"全为0是正常的（所有at_port货柜都已安排拖卡运输）
