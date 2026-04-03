# 物流路径三模式智能分组规范

## 业务背景

### 三种运输模式

#### 1. 纯海运 (Standard Sea Freight)

**适用场景**：传统港到港海运服务

**流程**：

```
提空箱 → 进场 → 装船 → 离港 → 海运 → 抵港 → 靠泊 → 卸船 → 可提货 → 提柜 → 交货地 → 还箱
```

**特点**：

- 单一海运段
- 无中转环节
- 时间顺序固定

---

#### 2. 海铁联运 (Sea-Rail Intermodal) - 美加线

**适用场景**：海运到目的港后，铁路转运到内陆点（如美加线）

**流程**：

```
提空箱 → 进场 → 装船 → 离港 → 海运 → 抵港 → 靠泊 → 卸船
→ 铁路装车 → 铁路运输 → 铁路到达 → 铁路卸箱
→ 提柜 → 交货地 → 还箱
```

**关键点**：

- 铁路运输发生在**海运之后、提柜之前**
- 目的港（如洛杉矶）卸船后，用铁路转运到内陆点（如芝加哥）
- 铁路段替代了"提柜"阶段的部分环节

**状态码映射**：

- `IRLB` (Rail Loaded) - 铁路装车
- `IRDP` (Rail Departed) - 铁路离站
- `IRAR` (Rail Arrived) - 铁路到达
- `IRDS` (Rail Discharged) - 铁路卸箱

---

#### 3. 驳船联运 (Feeder Service)

**适用场景**：支线港口通过驳船集疏到枢纽港，再海运

**流程**：

```
提空箱 → 进场
→ 驳船装船 → 驳船离港 → 驳船抵达 → 驳船卸船
→ 海运装船 → 海运离港 → 海运 → 抵港 → 靠泊 → 卸船 → 可提货 → 提柜 → 交货地 → 还箱
```

**关键点**：

- 驳船运输发生在**海运之前**
- 用小船从支线港集疏到枢纽港
- 驳船段替代了"装船"阶段的前置环节

**状态码映射**：

- `FDLB` (Feeder Loaded) - 驳船装船
- `FDDP` (Feeder Departed) - 驳船离港
- `FDBA` (Feeder Arrived) - 驳船抵达
- `FDDC` (Feeder Discharged) - 驳船卸船

---

## 系统实现

### 1. 运输模式识别

```typescript
export enum TransportMode {
  /** 纯海运：起运港 -> 海运 -> 目的港 -> 提柜 */
  STANDARD = 'STANDARD',
  /** 海铁联运：海运到目的港后，铁路转运到内陆点（美加线） */
  SEA_RAIL = 'SEA_RAIL',
  /** 驳船联运：驳船从支线港到枢纽港，再海运 */
  FEEDER = 'FEEDER',
}

/**
 * 识别运输模式
 * 基于实际发生的事件来判断
 */
function identifyTransportMode(events: DbEvent[]): TransportMode {
  const statusCodes = events.map(e => e.status_code).filter(Boolean) as string[]

  // 检查铁路事件（海铁联运：海运后铁路转运）
  const hasRailEvents = statusCodes.some(code => ['IRLB', 'IRDP', 'IRAR', 'IRDS'].includes(code))

  // 检查驳船事件（驳船联运：海运前驳船集疏）
  const hasFeederEvents = statusCodes.some(code => ['FDLB', 'FDDP', 'FDBA', 'FDDC'].includes(code))

  // 优先级：海铁联运 > 驳船联运 > 纯海运
  if (hasRailEvents) {
    return TransportMode.SEA_RAIL
  }

  if (hasFeederEvents) {
    return TransportMode.FEEDER
  }

  return TransportMode.STANDARD
}
```

**识别规则**：

1. **铁路事件**：`IRLB`、`IRDP`、`IRAR`、`IRDS`
2. **驳船事件**：`FDLB`、`FDDP`、`FDBA`、`FDDC`
3. **优先级**：海铁联运优先于驳船联运（一个货柜可能同时有两种事件）

---

### 2. 阶段模板定义

#### 纯海运模板

```typescript
const STANDARD_MODE_TEMPLATE = [
  { order: 1, label: '未出运', statuses: [NOT_SHIPPED] },
  { order: 2, label: '提空箱', statuses: [EMPTY_PICKED_UP] },
  { order: 3, label: '进港', statuses: [GATE_IN, CONTAINER_STUFFED] },
  { order: 4, label: '装船', statuses: [LOADED] },
  { order: 5, label: '离港', statuses: [DEPARTED] },
  { order: 6, label: '海运', statuses: [SAILING] },
  { order: 7, label: '抵港', statuses: [ARRIVED, BERTHED] },
  { order: 8, label: '卸船', statuses: [DISCHARGED] },
  { order: 9, label: '可提', statuses: [AVAILABLE] },
  {
    order: 10,
    label: '提柜',
    statuses: [GATE_OUT, IN_TRANSIT_TO_DEST, DELIVERY_ARRIVED, STRIPPED],
  },
  { order: 11, label: '还箱', statuses: [RETURNED_EMPTY, COMPLETED] },
]
```

**阶段卡片**：

```
[未出运] [提空箱] [进港] [装船] [离港] [海运] [抵港] [卸船] [可提] [提柜] [还箱]
```

---

#### 海铁联运模板

```typescript
const SEA_RAIL_MODE_TEMPLATE = [
  { order: 1, label: '未出运', statuses: [NOT_SHIPPED] },
  { order: 2, label: '提空箱', statuses: [EMPTY_PICKED_UP] },
  { order: 3, label: '进港', statuses: [GATE_IN, CONTAINER_STUFFED] },
  { order: 4, label: '装船', statuses: [LOADED] },
  { order: 5, label: '离港', statuses: [DEPARTED] },
  { order: 6, label: '海运', statuses: [SAILING] },
  { order: 7, label: '抵港', statuses: [ARRIVED, BERTHED] },
  { order: 8, label: '卸船', statuses: [DISCHARGED] },
  // 铁路运输段（卸船后，提柜前）
  { order: 9, label: '铁路装车', statuses: [RAIL_LOADED] },
  { order: 10, label: '铁路运输', statuses: [RAIL_DEPARTED] },
  { order: 11, label: '铁路到达', statuses: [RAIL_ARRIVED] },
  { order: 12, label: '铁路卸箱', statuses: [RAIL_DISCHARGED] },
  // 提柜交货段
  {
    order: 13,
    label: '提柜',
    statuses: [GATE_OUT, IN_TRANSIT_TO_DEST, DELIVERY_ARRIVED, STRIPPED],
  },
  { order: 14, label: '还箱', statuses: [RETURNED_EMPTY, COMPLETED] },
]
```

**阶段卡片**：

```
[未出运] [提空箱] [进港] [装船] [离港] [海运] [抵港] [卸船] [铁路装车] [铁路运输] [铁路到达] [铁路卸箱] [提柜] [还箱]
```

---

#### 驳船联运模板

```typescript
const FEEDER_MODE_TEMPLATE = [
  { order: 1, label: '未出运', statuses: [NOT_SHIPPED] },
  { order: 2, label: '提空箱', statuses: [EMPTY_PICKED_UP] },
  { order: 3, label: '进港', statuses: [GATE_IN, CONTAINER_STUFFED] },
  // 驳船运输段（海运前）
  { order: 4, label: '驳船装船', statuses: [FEEDER_LOADED] },
  { order: 5, label: '驳船离港', statuses: [FEEDER_DEPARTED] },
  { order: 6, label: '驳船抵达', statuses: [FEEDER_ARRIVED] },
  { order: 7, label: '驳船卸船', statuses: [FEEDER_DISCHARGED] },
  // 海运段
  { order: 8, label: '海运装船', statuses: [LOADED] },
  { order: 9, label: '海运离港', statuses: [DEPARTED] },
  { order: 10, label: '海运', statuses: [SAILING] },
  { order: 11, label: '抵港', statuses: [ARRIVED, BERTHED] },
  { order: 12, label: '卸船', statuses: [DISCHARGED] },
  { order: 13, label: '可提', statuses: [AVAILABLE] },
  {
    order: 14,
    label: '提柜',
    statuses: [GATE_OUT, IN_TRANSIT_TO_DEST, DELIVERY_ARRIVED, STRIPPED],
  },
  { order: 15, label: '还箱', statuses: [RETURNED_EMPTY, COMPLETED] },
]
```

**阶段卡片**：

```
[未出运] [提空箱] [进港] [驳船装船] [驳船离港] [驳船抵达] [驳船卸船] [海运装船] [海运离港] [海运] [抵港] [卸船] [可提] [提柜] [还箱]
```

---

### 3. 节点构建逻辑

```typescript
/** 将事件按阶段分组，支持三种运输模式；缺数据时用 process 表补充 */
function buildFullPathNodes(
  events: DbEvent[],
  supplement: ProcessSupplement | null,
  portName: string | null,
  portCode: string | null,
): StatusNode[] {
  // 1. 识别运输模式
  const mode = identifyTransportMode(events);

  // 2. 根据模式选择模板
  const template = getTemplateByMode(mode);

  const nodes: StatusNode[] = [];
  const eventNodes = events.map(eventToNode);
  const now = new Date();
  let lastTimestamp = new Date(0);
  let placeholderIndex = 0;

  for (const templateItem of template) {
    const matching = eventNodes.filter((n) => templateItem.statuses.includes(n.status));
    if (matching.length > 0) {
      // 按时间顺序排序，取最早的事件
      const sorted = matching.sort((a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      const chosen = sorted[0];
      lastTimestamp = new Date(chosen.timestamp);
      nodes.push({
        ...chosen,
        rawData: { ...chosen.rawData, stageOrder: templateItem.order, transportMode: mode },
      });
    } else {
      // 创建占位节点或补充节点
      const supp = stageToSupplement[templateItem.order];
      if (supp) {
        nodes.push(createSupplementNode(...));
      } else {
        nodes.push(createPlaceholderNode(...));
      }
    }
  }

  return nodes;
}
```

**关键逻辑**：

1. **模式识别**：根据实际事件识别运输模式
2. **模板选择**：根据模式选择对应的阶段模板
3. **节点匹配**：每个阶段匹配对应状态的事件
4. **时间排序**：阶段内事件按时间排序
5. **缺数据处理**：无事件时创建占位节点

---

## 时间线验证规则

### 业务规则矩阵

```typescript
const STATUS_ORDER_RULES: Record<string, string[]> = {
  // 起运阶段
  EMPTY_PICKED_UP: ['GATE_IN', 'CONTAINER_STUFFED', 'LOADED'],
  GATE_IN: ['LOADED'],
  CONTAINER_STUFFED: ['LOADED'],

  // 装船离港
  LOADED: ['DEPARTED', 'SAILING'],
  DEPARTED: ['SAILING'],

  // 海运
  SAILING: ['ARRIVED', 'BERTHED'],

  // 铁路（海铁联运）
  RAIL_LOADED: ['RAIL_DEPARTED'],
  RAIL_DEPARTED: ['RAIL_ARRIVED'],
  RAIL_ARRIVED: ['RAIL_DISCHARGED'],
  RAIL_DISCHARGED: ['GATE_OUT'],

  // 驳船
  FEEDER_LOADED: ['FEEDER_DEPARTED'],
  FEEDER_DEPARTED: ['FEEDER_ARRIVED'],
  FEEDER_ARRIVED: ['FEEDER_DISCHARGED'],
  FEEDER_DISCHARGED: ['LOADED'],

  // 抵港
  ARRIVED: ['BERTHED', 'DISCHARGED'],
  BERTHED: ['DISCHARGED'], // 靠泊后卸船

  // 卸船可提
  DISCHARGED: ['AVAILABLE'],
  AVAILABLE: ['GATE_OUT'],

  // 提柜交货
  GATE_OUT: ['IN_TRANSIT_TO_DEST', 'DELIVERY_ARRIVED'],
  IN_TRANSIT_TO_DEST: ['DELIVERY_ARRIVED'],
  DELIVERY_ARRIVED: ['STRIPPED', 'RETURNED_EMPTY'],

  // 还箱
  RETURNED_EMPTY: ['COMPLETED'],
}
```

### 关键业务规则

1. **靠泊必须在卸船前**：`BERTHED` → `DISCHARGED`
2. **卸船必须在可提前**：`DISCHARGED` → `AVAILABLE`
3. **可提必须在提柜前**：`AVAILABLE` → `GATE_OUT`
4. **提柜必须在交货前**：`GATE_OUT` → `DELIVERY_ARRIVED`
5. **交货必须在还箱前**：`DELIVERY_ARRIVED` → `RETURNED_EMPTY`

**海铁联运特殊规则**：

- 铁路段必须在卸船后：`DISCHARGED` → `RAIL_LOADED`
- 铁路段必须在提柜前：`RAIL_DISCHARGED` → `GATE_OUT`

**驳船联运特殊规则**：

- 驳船段必须在海运前：`FEEDER_DISCHARGED` → `LOADED`

---

## 前端显示

### 运输模式标识

```vue
<div class="transport-mode-indicator">
  <el-tag :type="getModeType(currentMode)">
    {{ getModeLabel(currentMode) }}
  </el-tag>
</div>

<script setup>
const TRANSPORT_MODE_LABELS = {
  STANDARD: '纯海运',
  SEA_RAIL: '海铁联运',
  FEEDER: '驳船联运',
}

const TRANSPORT_MODE_TYPES = {
  STANDARD: 'info',
  SEA_RAIL: 'warning',
  FEEDER: 'success',
}
</script>
```

### 阶段卡片动态渲染

```vue
<div v-for="stage in nodesByStage" :key="stage.stage" class="stage-card">
  <div class="stage-header">
    <h3>{{ stage.label }}</h3>
    <span class="node-count">{{ stage.nodes.length }} 个节点</span>
  </div>
  <div class="stage-nodes">
    <div v-for="item in stage.nodes" :key="item.globalIndex" class="stage-node">
      {{ item.node.description }}
    </div>
  </div>
</div>
```

---

## 测试场景

### 场景 1：纯海运货柜

**数据**：

- 有 `LOBD`（装船）、`DLPT`（离港）、`BDAR`（抵港）、`DSCH`（卸船）事件
- 无铁路、驳船事件

**预期**：

- 识别为 `STANDARD` 模式
- 显示 11 个阶段卡片
- 时间顺序正常

---

### 场景 2：海铁联运货柜（美加线）

**数据**：

- 有 `LOBD`、`DLPT`、`BDAR`、`DSCH`（海运段）
- 有 `IRLB`、`IRDP`、`IRAR`、`IRDS`（铁路段）

**预期**：

- 识别为 `SEA_RAIL` 模式
- 显示 14 个阶段卡片
- 铁路段在卸船后、提柜前

---

### 场景 3：驳船联运货柜

**数据**：

- 有 `FDLB`、`FDDP`、`FDBA`、`FDDC`（驳船段）
- 有 `LOBD`、`DLPT`、`BDAR`、`DSCH`（海运段）

**预期**：

- 识别为 `FEEDER` 模式
- 显示 15 个阶段卡片
- 驳船段在海运前

---

## 常见问题

### Q1: 如何区分海铁联运和中转港？

**A**:

- **海铁联运**：铁路事件发生在目的港卸船后（`DSCH` → `IRLB`）
- **中转港**：中转事件发生在海运途中（`SAILING` → `TSBA` → `SAILING`）

### Q2: 驳船联运和支线运输有什么区别？

**A**:

- **驳船联运**：使用驳船（Feeder）从支线港到枢纽港
- **支线运输**：可能使用其他运输方式
- 系统通过 `FD*` 状态码识别驳船事件

### Q3: 如何验证模式识别的准确性？

**A**:

1. 查询 `ext_container_status_events` 表
2. 检查事件中的状态码
3. 对照模式识别规则
4. 验证阶段卡片数量和顺序

---

## 版本历史

| 版本 | 日期       | 更新内容                     |
| ---- | ---------- | ---------------------------- |
| 1.0  | 2026-04-02 | 初始版本：三模式智能分组规范 |

---

## 参考文档

- [物流流程完整说明](./02-architecture/02-物流流程完整说明.md)
- [状态机文档](./05-state-machine/02-物流状态机.md)
- [飞驼状态码映射](../backend/src/constants/FeiTuoStatusMapping.ts)
- [物流路径微服务实现](../logistics-path-system/backend/src/services/statusPathFromDb.ts)
