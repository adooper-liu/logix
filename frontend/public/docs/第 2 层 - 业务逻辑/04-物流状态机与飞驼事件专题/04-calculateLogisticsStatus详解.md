# calculateLogisticsStatus 物流状态计算引擎

## 概述

**文件位置**: `backend/src/utils/logisticsStatusMachine.ts` (第 301-406 行)

**核心作用**: 基于货柜相关数据自动计算 7 层简化物流状态，是整个物流系统的**单一真相源**（Single Source of Truth）。

**设计原则**:

- 所有模块统一调用此函数计算状态，避免各模块独立判断导致状态不一致
- 采用优先级判断模型（剥洋葱），高优先级条件先判断，匹配即返回
- 提供完整的可追溯信息（triggerFields + reason）
- 与数据库表结构严格对齐，符合"数据库表结构是唯一基准"原则

---

## 输入参数

```typescript
export const calculateLogisticsStatus = (
  container: Container,                    // 货柜基本信息
  portOperations: PortOperation[],         // 港口操作记录数组
  seaFreight?: SeaFreight,                 // 海运信息（可选）
  truckingTransport?: TruckingTransport,   // 拖车运输信息（可选）
  warehouseOperation?: WarehouseOperation, // 仓库操作信息（可选）
  emptyReturn?: EmptyReturn                // 还空箱信息（可选）
): LogisticsStatusResult
```

### 参数说明

| 参数               | 类型               | 必填 | 数据来源                     | 说明                                                   |
| ------------------ | ------------------ | ---- | ---------------------------- | ------------------------------------------------------ |
| container          | Container          | 是   | biz_containers               | 货柜基本信息，包含 logistics_status 等字段             |
| portOperations     | PortOperation[]    | 是   | process_port_operations      | 港口操作记录数组，包含起运港、中转港、目的港           |
| seaFreight         | SeaFreight         | 否   | process_sea_freight          | 海运信息，包含 shipment_date、eta 等                   |
| truckingTransport  | TruckingTransport  | 否   | process_trucking_transport   | 拖车运输信息，包含 pickup_date、planned_pickup_date 等 |
| warehouseOperation | WarehouseOperation | 否   | process_warehouse_operations | 仓库操作信息，包含 wms_status、wms_confirm_date 等     |
| emptyReturn        | EmptyReturn        | 否   | process_empty_return         | 还空箱信息，包含 return_time                           |

---

## 返回结果

```typescript
interface LogisticsStatusResult {
  status: SimplifiedStatus // 7层简化状态
  currentPortType: 'origin' | 'transit' | 'destination' | null // 当前港口类型
  latestPortOperation: PortOperation | null // 最新的港口操作记录
  triggerFields?: Record<string, unknown> // 触发状态变更的字段及值
  reason?: string // 状态计算的原因说明
}
```

### 返回值说明

| 字段                | 类型                                           | 说明                                                    |
| ------------------- | ---------------------------------------------- | ------------------------------------------------------- |
| status              | SimplifiedStatus                               | 7 层简化状态枚举值                                      |
| currentPortType     | 'origin' \| 'transit' \| 'destination' \| null | 当前所在港口类型，仅在 AT_PORT 和 IN_TRANSIT 状态下有值 |
| latestPortOperation | PortOperation \| null                          | 最新的港口操作记录，用于前端展示预计到港时间等信息      |
| triggerFields       | Record<string, unknown>                        | 触发状态变更的具体字段及其值，便于调试和审计            |
| reason              | string                                         | 状态计算的原因说明，中文描述                            |

---

## 7 层简化状态定义

```typescript
export enum SimplifiedStatus {
  NOT_SHIPPED = 'not_shipped', // 未出运
  SHIPPED = 'shipped', // 已出运/已装船（注：代码中未直接使用）
  IN_TRANSIT = 'in_transit', // 在途
  AT_PORT = 'at_port', // 已到港（中转港或目的港）
  PICKED_UP = 'picked_up', // 已提柜
  UNLOADED = 'unloaded', // 已卸柜
  RETURNED_EMPTY = 'returned_empty', // 已还箱
}
```

### 状态中文映射

```typescript
export const SimplifiedStatusText: Record<SimplifiedStatus, string> = {
  [SimplifiedStatus.NOT_SHIPPED]: '未出运',
  [SimplifiedStatus.SHIPPED]: '已出运',
  [SimplifiedStatus.IN_TRANSIT]: '在途',
  [SimplifiedStatus.AT_PORT]: '已到港',
  [SimplifiedStatus.PICKED_UP]: '已提柜',
  [SimplifiedStatus.UNLOADED]: '已卸柜',
  [SimplifiedStatus.RETURNED_EMPTY]: '已还箱',
}
```

### 状态类型映射（前端样式）

```typescript
export const SimplifiedStatusType: Record<SimplifiedStatus, string> = {
  [SimplifiedStatus.NOT_SHIPPED]: 'info', // 灰色
  [SimplifiedStatus.SHIPPED]: 'primary', // 蓝色
  [SimplifiedStatus.IN_TRANSIT]: 'success', // 绿色
  [SimplifiedStatus.AT_PORT]: 'warning', // 橙色
  [SimplifiedStatus.PICKED_UP]: 'warning', // 橙色
  [SimplifiedStatus.UNLOADED]: 'warning', // 橙色
  [SimplifiedStatus.RETURNED_EMPTY]: 'success', // 绿色
}
```

---

## 核心逻辑：优先级判断（剥洋葱模型）

函数采用**从高到低的优先级顺序**进行判断，一旦满足某个条件就立即返回，不再继续判断后续条件。

### 优先级 1: 已还空箱 (RETURNED_EMPTY)

**优先级**: ⭐⭐⭐⭐⭐ (最高)

**触发条件**:

```typescript
if (emptyReturn?.returnTime) {
  status = SimplifiedStatus.RETURNED_EMPTY
  triggerFields = { returnTime: emptyReturn.returnTime }
  reason = '已还空箱'
  return { status, currentPortType, latestPortOperation, triggerFields, reason }
}
```

**数据库字段**: `process_empty_return.return_time`

**业务含义**: 货柜已完成整个生命周期，已归还空箱

**特点**:

- 最高优先级，一旦还箱，其他状态都不再考虑
- 表示货柜流程完全结束

---

### 优先级 2: 已卸柜 (UNLOADED)

**优先级**: ⭐⭐⭐⭐

**辅助函数**:

```typescript
export const isWmsConfirmed = (warehouseOperation?: WarehouseOperation): boolean => {
  if (!warehouseOperation) return false

  // 满足任一条件即可
  return (
    warehouseOperation.wmsStatus === 'WMS已完成' ||
    warehouseOperation.ebsStatus === '已入库' ||
    warehouseOperation.wmsConfirmDate !== null
  )
}
```

**触发条件**（满足任一）:

```typescript
if (isWmsConfirmed(warehouseOperation)) {
  status = SimplifiedStatus.UNLOADED
  triggerFields = {
    wmsStatus: warehouseOperation?.wmsStatus,
    ebsStatus: warehouseOperation?.ebsStatus,
    wmsConfirmDate: warehouseOperation?.wmsConfirmDate,
  }
  reason = '仓库已卸柜（WMS确认）'
  return { status, currentPortType, latestPortOperation, triggerFields, reason }
}
```

**数据库字段**:

- `process_warehouse_operations.wms_status = 'WMS已完成'`
- `process_warehouse_operations.ebs_status = '已入库'`
- `process_warehouse_operations.wms_confirm_date` 有值

**业务含义**: 货物已从货柜中卸下并入库

**特点**:

- WMS 系统确认后即为最终状态
- 支持三种确认方式，提高容错性

---

### 优先级 3: 已提柜 (PICKED_UP)

**优先级**: ⭐⭐⭐

**触发条件**:

```typescript
if (truckingTransport?.pickupDate) {
  status = SimplifiedStatus.PICKED_UP
  triggerFields = { pickupDate: truckingTransport.pickupDate }
  reason = '已提柜'
  return { status, currentPortType, latestPortOperation, triggerFields, reason }
}
```

**数据库字段**: `process_trucking_transport.pickup_date`

**业务含义**: 货柜已从码头提出，正在陆运途中

**特点**:

- 提柜后可能还未卸柜，所以优先级低于卸柜
- 表示货柜已进入最后一公里配送阶段

---

### 优先级 4: 已到目的港 (AT_PORT - destination)

**优先级**: ⭐⭐

分为两个子优先级：

#### 4a. 目的港 ATA (实际到港时间)

**触发条件**:

```typescript
const destWithArrival = destPorts.find(po => po.ata)
if (destWithArrival) {
  status = SimplifiedStatus.AT_PORT
  currentPortType = 'destination'
  latestPortOperation = destWithArrival
  triggerFields = { ata: destWithArrival.ata }
  reason = '目的港已到港（ATA）'
  return { status, currentPortType, latestPortOperation, triggerFields, reason }
}
```

**数据库字段**: `process_port_operations.port_type = 'destination'` 且 `ata` 有值

**业务含义**: 货柜已实际到达目的港

#### 4b. 目的港可提货时间 (availableTime)

**触发条件**:

```typescript
const destWithAvailable = destPorts.find(po => po.availableTime)
if (destWithAvailable) {
  status = SimplifiedStatus.AT_PORT
  currentPortType = 'destination'
  latestPortOperation = destWithAvailable
  triggerFields = { availableTime: destWithAvailable.availableTime }
  reason = '目的港可提货（PCAB/AVLE/AVAIL）'
  return { status, currentPortType, latestPortOperation, triggerFields, reason }
}
```

**数据库字段**: `process_port_operations.port_type = 'destination'` 且 `available_time` 有值

**业务含义**: 飞驼 API 返回的状态码 PCAB/AVLE/AVAIL 表示货柜已到港并可提货

**特点**:

- 即使没有 ATA，只要有可提货时间也视为已到港
- 提高对飞驼 API 数据的兼容性

---

### 优先级 5: 已到中转港 (AT_PORT - transit)

**优先级**: ⭐

**触发条件**:

```typescript
const transitWithArrival = transitPorts.find(po => po.ata || po.gateInTime || po.transitArrivalDate)
if (transitWithArrival) {
  status = SimplifiedStatus.AT_PORT
  currentPortType = 'transit'
  latestPortOperation = transitWithArrival
  triggerFields = {
    ata: transitWithArrival.ata,
    gateInTime: transitWithArrival.gateInTime,
    transitArrivalDate: transitWithArrival.transitArrivalDate,
  }
  reason = '中转港已到港'
  return { status, currentPortType, latestPortOperation, triggerFields, reason }
}
```

**数据库字段**（满足任一）:

- `process_port_operations.port_type = 'transit'` 且 `ata` 有值
- `process_port_operations.port_type = 'transit'` 且 `gate_in_time` 有值
- `process_port_operations.port_type = 'transit'` 且 `transit_arrival_date` 有值

**业务含义**: 货柜已到达中转港，但尚未到达目的港

**特点**:

- 支持多种时间字段，提高容错性
- currentPortType 为 'transit'，区别于目的港

---

### 优先级 6: 在途 (IN_TRANSIT)

**优先级**: 低

**触发条件**:

```typescript
if (seaFreight?.shipmentDate) {
  status = SimplifiedStatus.IN_TRANSIT
  // 在途时仍需展示「预计到港/修正ETA」，取目的港港口操作（按 port_sequence 取最后一条目的港）
  const destForEta = destPorts.length
    ? [...destPorts].sort((a, b) => (b.portSequence ?? 0) - (a.portSequence ?? 0))[0]
    : null
  latestPortOperation = destForEta ?? null
  triggerFields = { shipmentDate: seaFreight.shipmentDate }
  reason = '已出运（在途）'
  return { status, currentPortType, latestPortOperation, triggerFields, reason }
}
```

**数据库字段**: `process_sea_freight.shipment_date` 有值

**业务含义**: 货柜已装船出运，正在海上航行

**特点**:

- 即使没有其他到港信息，只要有出运日期就视为在途
- 会尝试获取目的港的 ETA 信息用于前端展示
- currentPortType 为 null，latestPortOperation 为目的港记录（用于显示 ETA）

---

### 优先级 7: 未出运 (NOT_SHIPPED)

**优先级**: 最低（默认状态）

**触发条件**:

```typescript
status = SimplifiedStatus.NOT_SHIPPED
triggerFields = {}
reason = '未出运'
return { status, currentPortType, latestPortOperation, triggerFields, reason }
```

**业务含义**: 货柜尚未出运，处于初始状态

**特点**:

- 以上所有条件都不满足时的默认状态
- currentPortType 和 latestPortOperation 均为 null

---

## 状态流转规则

### 标准流转路径

```
NOT_SHIPPED (未出运)
    ↓
IN_TRANSIT (在途)
    ↓
AT_PORT (已到港) ──→ currentPortType: 'transit' 或 'destination'
    ↓
PICKED_UP (已提柜)
    ↓
UNLOADED (已卸柜)
    ↓
RETURNED_EMPTY (已还箱)
```

### 支持的跳转路径

```typescript
export const SimplifiedStatusTransitions: Record<SimplifiedStatus, SimplifiedStatus[]> = {
  [SimplifiedStatus.NOT_SHIPPED]: [SimplifiedStatus.SHIPPED],
  [SimplifiedStatus.SHIPPED]: [
    SimplifiedStatus.IN_TRANSIT,
    SimplifiedStatus.AT_PORT,
    SimplifiedStatus.PICKED_UP, // 支持跳转：直接提柜
  ],
  [SimplifiedStatus.IN_TRANSIT]: [
    SimplifiedStatus.AT_PORT,
    SimplifiedStatus.PICKED_UP, // 支持跳转
  ],
  [SimplifiedStatus.AT_PORT]: [
    SimplifiedStatus.PICKED_UP,
    SimplifiedStatus.UNLOADED, // 支持跳转：直接卸柜
  ],
  [SimplifiedStatus.PICKED_UP]: [
    SimplifiedStatus.UNLOADED,
    SimplifiedStatus.RETURNED_EMPTY, // 支持跳转：直接还箱
  ],
  [SimplifiedStatus.UNLOADED]: [SimplifiedStatus.RETURNED_EMPTY],
  [SimplifiedStatus.RETURNED_EMPTY]: [],
}
```

**允许的跳转**:

- `SHIPPED → PICKED_UP`: 直接提柜，跳过在途和到港
- `IN_TRANSIT → PICKED_UP`: 直接提柜
- `AT_PORT → UNLOADED`: 直接卸柜，跳过提柜
- `PICKED_UP → RETURNED_EMPTY`: 直接还箱，跳过卸柜

**验证函数**:

```typescript
export const isValidSimplifiedTransition = (
  fromStatus: SimplifiedStatus,
  toStatus: SimplifiedStatus
): boolean => {
  const validTargets = SimplifiedStatusTransitions[fromStatus] || []
  return validTargets.includes(toStatus)
}
```

---

## 关键设计原则

### 1. 单一真相源 (Single Source of Truth)

- 所有模块都调用此函数计算状态
- 避免各模块独立判断导致状态不一致
- 确保全系统状态一致性

### 2. 优先级明确

- 使用 if-else 链式判断，高优先级先判断
- 一旦匹配立即返回，性能优秀
- 逻辑清晰，易于理解和维护

### 3. 可追溯性

- 返回 `triggerFields` 记录触发状态的字段
- 返回 `reason` 说明状态计算原因
- 便于调试、审计和问题排查

### 4. 容错性强

- 中转港支持多个时间字段 (ata / gateInTime / transitArrivalDate)
- 目的港支持 ATA 和 availableTime 两种判断方式
- WMS 确认支持三个条件任一满足
- 提高对不同数据源的兼容性

### 5. 与数据库表结构对齐

- 所有字段名都与数据库实体对应
- 符合项目开发准则中的"数据库表结构是唯一基准"原则
- 避免幽灵字段和数据不一致问题

---

## 调用场景

此函数被以下模块调用：

### 1. ContainerStatusService

**用途**: 批量更新货柜状态

**调用位置**: `backend/src/services/containerStatus.service.ts`

**场景**: 定时任务或手动触发，批量重新计算所有货柜的物流状态

### 2. ExternalDataService

**用途**: 外部数据同步后重新计算状态

**调用位置**: `backend/src/services/externalDataService.ts`

**场景**: 飞驼 API 同步数据后，触发状态重算

### 3. FeiTuoImportService

**用途**: 飞驼数据导入后更新状态

**调用位置**: `backend/src/services/feituoImport.service.ts`

**场景**: Excel 导入飞驼数据后，更新货柜状态

### 4. AlertService

**用途**: 预警检查时获取物流状态快照

**调用位置**: `backend/src/services/alertService.ts`

**场景**: 检查最晚提柜日预警时，需要准确的物流状态

### 5. RiskService

**用途**: 风险评估时获取物流状态

**调用位置**: `backend/src/services/riskService.ts`

**场景**: 评估货柜风险时，需要根据状态判断风险类型

### 6. DemurrageService

**用途**: 滞港费计算前判定是否到达目的港

**调用位置**: `backend/src/services/demurrage.service.ts`

**场景**: 计算滞港费时，需要判断货柜是否已到港（actual vs forecast 模式）

---

## 注意事项

### 已知问题

#### 1. SHIPPED 状态未被直接使用

**问题描述**: 代码中有 `SimplifiedStatus.SHIPPED` 枚举，但在 `calculateLogisticsStatus` 中没有直接返回此状态。有 `shipmentDate` 时直接返回 `IN_TRANSIT`。

**影响**:

- SHIPPED 状态仅用于状态流转规则定义
- 实际计算中不会出现 SHIPPED 状态

**建议**: 如需区分"已装船但未开船"和"已在海上航行"，需新增状态或调整逻辑

#### 2. currentPortType 和 latestPortOperation 在某些状态下为 null

**问题描述**:

- `RETURNED_EMPTY`, `UNLOADED`, `PICKED_UP` 状态下这两个字段为 null
- 只有在 `AT_PORT` 和 `IN_TRANSIT` 状态下才会设置

**影响**:

- 前端在这些状态下无法获取港口信息
- 可能需要从其他地方补充数据

**建议**: 如需要在这些状态下显示港口信息，可考虑保留 latestPortOperation

#### 3. 状态不可逆

**问题描述**: 由于优先级机制，一旦进入高优先级状态（如还箱），即使删除相关数据也不会回退到低优先级状态。

**示例**:

```typescript
// 假设货柜已还箱
emptyReturn.returnTime = '2024-01-01';
// 此时状态为 RETURNED_EMPTY

// 即使删除还箱记录
emptyReturn.returnTime = null;
// 状态仍为 RETURNED_EMPTY（因为函数没有被重新调用）

// 必须重新调用 calculateLogisticsStatus 才能更新状态
const result = calculateLogisticsStatus(...);
container.logisticsStatus = result.status;
```

**影响**:

- 数据修复时需要重新触发状态计算
- 不能仅靠删除数据来改变状态

**建议**: 数据修复后务必调用 ContainerStatusService.updateStatus() 重新计算

---

## 测试建议

### 单元测试覆盖场景

1. **优先级测试**: 验证高优先级条件优先于低优先级条件
2. **边界条件**: 测试各字段的 null/undefined 情况
3. **跳转路径**: 验证允许的跳转路径是否正确识别
4. **容错性**: 测试多个时间字段同时存在时的选择逻辑
5. **可追溯性**: 验证 triggerFields 和 reason 是否正确返回

### 集成测试场景

1. **飞驼导入**: 导入后状态是否正确更新
2. **预警检查**: 预警逻辑是否依赖正确的状态
3. **滞港费计算**: actual/forecast 模式切换时状态是否正确
4. **批量更新**: 大批量货柜状态更新的性能和准确性

---

## 相关文档

- [物流状态机设计规范](./05-state-machine/01-logistics-status-machine.md)
- [7 层简化状态定义](./05-state-machine/02-simplified-status-definition.md)
- [飞驼节点状态码解读](./11-project/09-飞驼节点状态码解读与接入整合方案.md)
- [开发准则 - 数据库表结构是唯一基准](../DEVELOPMENT_STANDARDS.md)

---

## 版本历史

| 版本 | 日期       | 作者         | 变更说明                                     |
| ---- | ---------- | ------------ | -------------------------------------------- |
| v1.0 | 2024-01-01 | AI Assistant | 初始版本，实现 7 层简化状态计算              |
| v1.1 | 2024-03-15 | AI Assistant | 增加 availableTime 支持，提高飞驼 API 兼容性 |
| v1.2 | 2024-04-08 | AI Assistant | 完善文档，补充调用场景和注意事项             |

---

**最后更新**: 2024-04-08  
**维护者**: LogiX 开发团队  
**状态**: 生产环境使用中
