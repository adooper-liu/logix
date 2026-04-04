# 物流路径状态系统完整基准

## 一、核心状态机（7 层标准状态）

### 1.1 StandardStatus 枚举定义

```typescript
enum StandardStatus {
  // 起运阶段 (order: 1-5)
  NOT_SHIPPED = 'NOT_SHIPPED',           // 未出运
  EMPTY_PICKED_UP = 'EMPTY_PICKED_UP',   // 提空箱
  CONTAINER_STUFFED = 'CONTAINER_STUFFED', // 已装柜
  GATE_IN = 'GATE_IN',                   // 进港
  LOADED = 'LOADED',                     // 装船
  DEPARTED = 'DEPARTED',                 // 离港
  
  // 海运阶段 (order: 6)
  SAILING = 'SAILING',                   // 海运中
  
  // 抵港阶段 (order: 7-8)
  ARRIVED = 'ARRIVED',                   // 抵港 BDAR
  BERTHED = 'BERTHED',                   // 靠泊 POCA
  DELIVERY_ARRIVED = 'DELIVERY_ARRIVED', // 交货地抵达 FETA
  DISCHARGED = 'DISCHARGED',             // 卸船 DSCH
  
  // 可提/提柜阶段 (order: 9-10)
  AVAILABLE = 'AVAILABLE',               // 可提货 PCAB
  IN_TRANSIT_TO_DEST = 'IN_TRANSIT_TO_DEST', // 提柜后运输中 STCS（Gate Out for Delivery）
  GATE_OUT = 'GATE_OUT',                 // 已提柜 GTOT
  STRIPPED = 'STRIPPED',                 // 拆箱 STRP
  
  // 还箱阶段 (order: 11)
  RETURNED_EMPTY = 'RETURNED_EMPTY',     // 已还空箱
  COMPLETED = 'COMPLETED',               // 已完成
  
  // 特殊状态
  HOLD = 'HOLD',                         // 滞留
  CUSTOMS_HOLD = 'CUSTOMS_HOLD',         // 海关滞留
  CARRIER_HOLD = 'CARRIER_HOLD',         // 船东扣货
  TERMINAL_HOLD = 'TERMINAL_HOLD',       // 码头扣货
  CHARGES_HOLD = 'CHARGES_HOLD',         // 费用未付
  DUMPED = 'DUMPED',                     // 弃货
  DELAYED = 'DELAYED',                   // 延迟
  DETENTION = 'DETENTION',               // 滞箱
  OVERDUE = 'OVERDUE',                   // 超期
  CONGESTION = 'CONGESTION',             // 拥堵
  UNKNOWN = 'UNKNOWN',                   // 未知
}
```

### 1.2 状态流转规则（STATUS_TRANSITIONS）

**核心原则**：状态只能向下游流转，或保持/HOLD，不能跳级。

#### 起运阶段流转
```
NOT_SHIPPED 
  -> EMPTY_PICKED_UP | GATE_IN

EMPTY_PICKED_UP 
  -> GATE_IN | CONTAINER_STUFFED | HOLD

GATE_IN 
  -> LOADED | HOLD

CONTAINER_STUFFED 
  -> GATE_IN | LOADED | HOLD

LOADED 
  -> DEPARTED | HOLD

DEPARTED 
  -> SAILING | TRANSIT_ARRIVED | ARRIVED | DELAYED | HOLD
```

#### 海运阶段流转
```
SAILING 
  -> TRANSIT_ARRIVED | ARRIVED | DELAYED | CONGESTION | HOLD
```

#### 抵港阶段流转
```
ARRIVED 
  -> DISCHARGED | AVAILABLE | DELAYED | HOLD

BERTHED 
  -> DISCHARGED | AVAILABLE | HOLD

DISCHARGED 
  -> AVAILABLE | IN_TRANSIT_TO_DEST | GATE_OUT | HOLD  // 关键：允许跳过可提货直接提柜

AVAILABLE 
  -> GATE_OUT | DELIVERY_ARRIVED | HOLD

DELIVERY_ARRIVED 
  -> STRIPPED | RETURNED_EMPTY | HOLD
```

#### 提柜阶段流转
```
GATE_OUT 
  -> DELIVERY_ARRIVED | STRIPPED | RETURNED_EMPTY | DELAYED | HOLD

IN_TRANSIT_TO_DEST 
  -> GATE_OUT | DELIVERY_ARRIVED | STRIPPED | RETURNED_EMPTY | HOLD

STRIPPED 
  -> RETURNED_EMPTY | COMPLETED
```

#### 还箱阶段流转
```
RETURNED_EMPTY 
  -> COMPLETED

COMPLETED 
  -> (终点)
```

---

## 二、三种运输模式阶段模板

### 2.1 纯海运模式（STANDARD）

**路径**：起运 → 装船 → 离港 → 海运 → 抵港 → 靠泊 → 卸船 → 可提 → 提柜 → 交货 → 还箱

| Order | 阶段 | 状态 | 说明 |
|-------|------|------|------|
| 1 | 未出运 | NOT_SHIPPED | 备货单创建 |
| 2 | 提空箱 | EMPTY_PICKED_UP | STSP |
| 3 | 进港 | GATE_IN, CONTAINER_STUFFED | GTIN, STUF |
| 4 | 装船 | LOADED | LOBD |
| 5 | 离港 | DEPARTED | DLPT |
| 6 | 海运 | SAILING | SAIL |
| 7 | 抵港 | ARRIVED, BERTHED, DELIVERY_ARRIVED | BDAR, POCA, FETA |
| 8 | 卸船 | DISCHARGED | DSCH |
| 9 | 可提 | AVAILABLE, IN_TRANSIT_TO_DEST | PCAB, STCS |
| 10 | 提柜 | GATE_OUT, STRIPPED | GTOT, STRP |
| 11 | 还箱 | RETURNED_EMPTY, COMPLETED | RCVE |

### 2.2 海铁联运模式（SEA_RAIL）

**路径**：起运 → 装船 → 离港 → 海运 → 抵港 → 靠泊 → 卸船 → 铁路装车 → 铁路运输 → 铁路到达 → 铁路卸箱 → 提柜 → 交货 → 还箱

| Order | 阶段 | 状态 | 说明 |
|-------|------|------|------|
| 1-8 | 同纯海运 | - | - |
| 9 | 铁路装车 | RAIL_LOADED | IRLB |
| 10 | 铁路运输 | RAIL_DEPARTED | IRDP |
| 11 | 铁路到达 | RAIL_ARRIVED | IRAR |
| 12 | 铁路卸箱 | RAIL_DISCHARGED | IRDS |
| 13 | 提柜 | GATE_OUT, IN_TRANSIT_TO_DEST, DELIVERY_ARRIVED, STRIPPED | GTOT, STCS |
| 14 | 还箱 | RETURNED_EMPTY, COMPLETED | RCVE |

**关键差异**：
- 铁路段在"卸船"之后、"提柜"之前
- 铁路卸箱后可直接提柜（`RAIL_DISCHARGED -> IN_TRANSIT_TO_DEST`）

### 2.3 驳船联运模式（FEEDER）

**路径**：起运 → 驳船装船 → 驳船离港 → 驳船抵达 → 驳船卸船 → 海运装船 → 海运离港 → 海运 → 抵港 → 靠泊 → 卸船 → 可提 → 提柜 → 交货 → 还箱

| Order | 阶段 | 状态 | 说明 |
|-------|------|------|------|
| 1-3 | 同纯海运 | - | - |
| 4 | 驳船装船 | FEEDER_LOADED | FDLB |
| 5 | 驳船离港 | FEEDER_DEPARTED | FDDP |
| 6 | 驳船抵达 | FEEDER_ARRIVED | FDBA |
| 7 | 驳船卸船 | FEEDER_DISCHARGED | FDDC |
| 8 | 海运装船 | LOADED | LOBD |
| 9 | 海运离港 | DEPARTED | DLPT |
| 10 | 海运 | SAILING | SAIL |
| 11 | 抵港 | ARRIVED, BERTHED, DELIVERY_ARRIVED | BDAR, POCA, FETA |
| 12 | 卸船 | DISCHARGED | DSCH |
| 13 | 可提 | AVAILABLE, IN_TRANSIT_TO_DEST | PCAB, STCS |
| 14 | 提柜 | GATE_OUT, STRIPPED | GTOT, STRP |
| 15 | 还箱 | RETURNED_EMPTY, COMPLETED | RCVE |

**关键差异**：
- 驳船段在"海运"之前
- 驳船卸船后才进入海运装船

---

## 三、飞驼状态码映射（FEITUO_STATUS_MAP）

### 3.1 起运阶段

| 飞驼码 | 中文 | StandardStatus | 说明 |
|--------|------|----------------|------|
| STSP | 提空箱 | EMPTY_PICKED_UP | 堆场提空箱 |
| STUF | 已装箱 | CONTAINER_STUFFED | 工厂装柜 |
| GITM | 进场 | CONTAINER_STUFFED | 货物进仓 |
| PRLD | 预装船 | CONTAINER_STUFFED | 准备装船 |
| GTIN | 卡车进场 | GATE_IN | 码头进闸 |

### 3.2 装船离港

| 飞驼码 | 中文 | StandardStatus | 说明 |
|--------|------|----------------|------|
| LOBD | 装船 | LOADED | 装上母船 |
| DLPT | 离港 | DEPARTED | 船舶离港 |
| SAIL | 开航 | SAILING | 海运中 |

### 3.3 抵港卸船

| 飞驼码 | 中文 | StandardStatus | 说明 |
|--------|------|----------------|------|
| BDAR | 抵港 | ARRIVED | 到达目的港 |
| POCA | 靠泊 | BERTHED | 船舶靠岸 |
| DSCH | 卸船 | DISCHARGED | 卸下集装箱 |

### 3.4 可提/提柜

| 飞驼码 | 中文 | StandardStatus | 说明 |
|--------|------|----------------|------|
| PCAB | 可提货 | AVAILABLE | 可以提柜 |
| STCS | 提柜 (货) | IN_TRANSIT_TO_DEST | 已提柜运输中 |
| GTOT | 已提柜 | GATE_OUT | 提柜完成 |
| STRP | 拆箱 | STRIPPED | 拆箱完成 |
| FETA | 交货地抵达 | DELIVERY_ARRIVED | 货物送达目的地 |

### 3.5 还箱

| 飞驼码 | 中文 | StandardStatus | 说明 |
|--------|------|----------------|------|
| RCVE | 还空箱 | RETURNED_EMPTY | 还空箱 |
| RTNE | 还空箱 | RETURNED_EMPTY | 退空箱 |

### 3.6 特殊状态

| 飞驼码 | 中文 | StandardStatus | 说明 |
|--------|------|----------------|------|
| CUIP | 海关查验 | CUSTOMS_HOLD | 海关扣留 |
| PASS | 海关放行 | AVAILABLE | 查验通过 |
| SRHD | 船东扣货 | CARRIER_HOLD | 船公司扣货 |
| TMHD | 码头扣货 | TERMINAL_HOLD | 码头扣货 |
| SRSD | 费用未付 | CHARGES_HOLD | 欠费 |
| DUMP | 弃货 | DUMPED | 放弃货物 |
| STLH | 滞留 | HOLD | 一般滞留 |

### 3.7 警告状态（FEITUO_WARNING_MAP）

| 飞驼码 | 中文 | StandardStatus | 说明 |
|--------|------|----------------|------|
| WGITM | 延迟进仓 | DELAYED | 未按时进仓 |
| WDLPT | 延迟离港 | DELAYED | 未按时离港 |
| WDUMP | 弃货警告 | DUMPED | 可能弃货 |
| WBDAR | 延迟抵港 | DELAYED | 晚于预计抵港 |
| WGTOT | 滞箱费 | DETENTION | 产生滞箱费 |
| WETA | 延迟交货 | DELAYED | 晚于预计交货 |
| WSTCS | 超期提柜 | OVERDUE | 超过免费期提柜 |
| WRCVE | 超期还箱 | OVERDUE | 超过免费期还箱 |

---

## 四、前端阶段映射（STAGE_MAP）

### 4.1 阶段分组与顺序

```typescript
const STAGE_MAP: Record<string, { stage: string; label: string; order: number }> = {
  // 起运阶段 (order: 1)
  NOT_SHIPPED: { stage: 'origin', label: '起运', order: 1 },
  EMPTY_PICKED_UP: { stage: 'origin', label: '起运', order: 1 },
  CONTAINER_STUFFED: { stage: 'origin', label: '起运', order: 1 },
  GATE_IN: { stage: 'origin', label: '起运', order: 1 },
  LOADED: { stage: 'origin', label: '起运', order: 1 },
  DEPARTED: { stage: 'origin', label: '起运', order: 1 },
  
  // 驳船联运 (order: 4)
  FEEDER_LOADED: { stage: 'feeder', label: '驳船', order: 4 },
  FEEDER_DEPARTED: { stage: 'feeder', label: '驳船', order: 4 },
  FEEDER_ARRIVED: { stage: 'feeder', label: '驳船', order: 4 },
  FEEDER_DISCHARGED: { stage: 'feeder', label: '驳船', order: 4 },
  
  // 海运阶段 (order: 5)
  SAILING: { stage: 'sea', label: '海运', order: 5 },
  
  // 中转阶段 (order: 3)
  TRANSIT_ARRIVED: { stage: 'transit', label: '中转', order: 3 },
  TRANSIT_BERTHED: { stage: 'transit', label: '中转', order: 3 },
  TRANSIT_DISCHARGED: { stage: 'transit', label: '中转', order: 3 },
  TRANSIT_LOADED: { stage: 'transit', label: '中转', order: 3 },
  TRANSIT_DEPARTED: { stage: 'transit', label: '中转', order: 3 },
  
  // 到港阶段 (order: 6)
  ARRIVED: { stage: 'arrival', label: '到港', order: 6 },
  BERTHED: { stage: 'arrival', label: '到港', order: 6 },
  DELIVERY_ARRIVED: { stage: 'arrival', label: '到港', order: 6 },
  DISCHARGED: { stage: 'arrival', label: '到港', order: 6 },
  AVAILABLE: { stage: 'arrival', label: '到港', order: 6 },
  
  // 海铁联运 (order: 9)
  RAIL_LOADED: { stage: 'rail', label: '铁路', order: 9 },
  RAIL_DEPARTED: { stage: 'rail', label: '铁路', order: 9 },
  RAIL_ARRIVED: { stage: 'rail', label: '铁路', order: 9 },
  RAIL_DISCHARGED: { stage: 'rail', label: '铁路', order: 9 },
  
  // 提柜阶段 (order: 10)
  GATE_OUT: { stage: 'pickup', label: '提柜', order: 10 },
  IN_TRANSIT_TO_DEST: { stage: 'pickup', label: '提柜', order: 10 },
  STRIPPED: { stage: 'pickup', label: '提柜', order: 10 },
  
  // 还箱阶段 (order: 11)
  RETURNED_EMPTY: { stage: 'return', label: '还箱', order: 11 },
  COMPLETED: { stage: 'return', label: '还箱', order: 11 },
}
```

### 4.2 运输模式过滤逻辑

```typescript
const shouldShowStage = (stage: string) => {
  if (!transportMode) return true
  
  // 纯海运：不显示铁路和驳船阶段
  if (transportMode === 'STANDARD') {
    return !['rail', 'feeder'].includes(stage)
  }
  
  // 海铁联运：显示铁路，不显示驳船
  if (transportMode === 'SEA_RAIL') {
    return stage !== 'feeder'
  }
  
  // 驳船联运：显示驳船，不显示铁路
  if (transportMode === 'FEEDER') {
    return stage !== 'rail'
  }
  
  return true
}
```

---

## 五、状态码中文显示（STATUS_CODE_DISPLAY）

**优先级**：状态码 > 默认描述

```typescript
const STATUS_CODE_DISPLAY: Record<string, string> = {
  STCS: "提柜 (货)",      // 强调是提取货物的动作
  GTOT: "已提柜",         // 提柜动作完成
  GATE_OUT: "已提柜",     // 同上
  PCAB: "可提货",         // 可以提取货物
  DSCH: "卸船",           // 从船上卸下
  BDAR: "抵港",           // 到达港口
  LOBD: "装船",           // 装上船舶
  RCVE: "已还空箱",       // 还空箱完成
  RTNE: "已还空箱",       // 同上
  GITM: "进场",           // 货物进仓
  CUIP: "海关滞留",       // 海关扣留
  PASS: "海关放行",       // 查验通过
}
```

---

## 六、路径验证规则（pathValidator）

### 6.1 验证项目

1. **节点时间顺序**（跳过缺数据节点）
   - 检查相邻节点的时间先后
   - "缺数据"节点不参与检查（时间戳随机生成）

2. **状态流转合法性**
   - 基于 `STATUS_TRANSITIONS` 验证
   - 支持三种运输模式的特殊流转

3. **重复状态检查**
   - 同一状态不应重复出现（除非有明确业务意义）

### 6.2 关键流转规则更新

**允许跳过可提货直接提柜**：
```typescript
DISCHARGED -> [
  AVAILABLE,              // 正常流程：先可提货
  IN_TRANSIT_TO_DEST,     // STCS: 跳过可提货直接提柜
  GATE_OUT,               // 直接提柜
  HOLD,                   // 各种滞留
]

RAIL_DISCHARGED -> [
  GATE_OUT,               // 铁路卸箱后提柜
  IN_TRANSIT_TO_DEST,     // STCS: 铁路卸箱后直接提柜运输
  HOLD,
]

FEEDER_DISCHARGED -> [
  GATE_OUT,               // 驳船卸船后提柜
  IN_TRANSIT_TO_DEST,     // STCS: 驳船卸船后直接提柜运输
  HOLD,
]
```

---

## 七、数据来源与补充逻辑

### 7.1 数据来源优先级

**主数据源**：`ext_container_status_events`（飞驼事件）
- 包含所有飞驼状态码事件
- 字段：`status_code`, `occurred_at`, `location`, `description`

**补充数据源**：
- `process_port_operations`: ATA, 卸船日期，可提货时间，提柜时间
- `process_trucking_transport`: 提柜日期，还箱时间
- `process_empty_return`: 还箱时间

### 7.2 缺数据节点处理

当某个阶段没有实际数据时：
- 创建占位节点，标记 `noData: true`
- 时间戳随机生成（前后节点之间）
- 中文描述：「XXX 缺数据」
- 不参与时间顺序检查

---

## 八、一致性检查清单

### 8.1 新增状态码时

- [ ] 在 `FEITUO_STATUS_MAP` 中添加映射
- [ ] 在 `STATUS_CODE_DISPLAY` 中添加中文显示
- [ ] 确认 `StandardStatus` 枚举已定义
- [ ] 确认 `STATUS_TRANSITIONS` 支持该状态的流转
- [ ] 确认阶段模板包含该状态
- [ ] 前端 `STAGE_MAP` 包含该状态的映射

### 8.2 修改阶段分配时

- [ ] 修改后端阶段模板（`statusPathFromDb.ts`）
- [ ] 修改前端 `STAGE_MAP`（`LogisticsPathTab.vue`）
- [ ] 确认三种模式模板都同步修改
- [ ] 运行验证确保无冲突

### 8.3 修改状态流转时

- [ ] 修改 `STATUS_TRANSITIONS`（`pathValidator.ts`）
- [ ] 确认符合业务逻辑
- [ ] 添加单元测试
- [ ] 更新本文档

---

## 九、常见问题与解决方案

### Q1: "可提 缺数据"但实际有 STCS 事件

**原因**：STCS 映射到 `IN_TRANSIT_TO_DEST`，原本不在"可提"阶段的 statuses 中。

**解决**：修改阶段模板，"可提"阶段同时接受 `AVAILABLE` 和 `IN_TRANSIT_TO_DEST`。

### Q2: FETA 分配到"提柜"阶段而非"到港"

**原因**：阶段模板的"提柜"阶段包含了 `DELIVERY_ARRIVED`。

**解决**：将 `DELIVERY_ARRIVED` 移到"到港"阶段的 statuses 中。

### Q3: POCA 节点不显示

**原因**：POCA 映射到 `BERTHED`，需要确认阶段模板的"到港"阶段包含 `BERTHED`。

**解决**：确认"到港"阶段的 statuses 包含 `BERTHED`。

### Q4: 非法状态流转错误（DISCHARGED -> IN_TRANSIT_TO_DEST）

**原因**：`STATUS_TRANSITIONS` 中 `DISCHARGED` 不能流转到 `IN_TRANSIT_TO_DEST`。

**解决**：添加 `DISCHARGED -> IN_TRANSIT_TO_DEST` 的合法流转。

---

## 十、版本历史

| 版本 | 日期 | 修改内容 | 作者 |
|------|------|----------|------|
| 1.0 | 2026-04-02 | 初始版本：完整梳理状态系统基准 | 刘志高 |
| 1.1 | 2026-04-02 | 添加 DISCHARGED -> IN_TRANSIT_TO_DEST 流转 | 刘志高 |

---

**文档位置**：`frontend/public/docs/05-state-machine/01-状态系统完整基准.md`  
**最后更新**：2026-04-02  
**维护者**：刘志高
