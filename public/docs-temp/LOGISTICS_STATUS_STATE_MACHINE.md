# LogiX 物流状态机说明

## 概述

LogiX 系统有两套状态体系：

1. **主服务简化状态**（用于桑基图和前端展示）
2. **微服务详细状态**（用于外部API集成和复杂状态流转）

---

## 1. 主服务简化状态（7层流转）

### 状态枚举

| 标准代码 | 中文名称 | 桑基图层级 | 说明 |
|---------|---------|-----------|------|
| `not_shipped` | 未出运 | 第1层 | 备货单已创建，但货物尚未出运 |
| `shipped` | 已装船 | 第1-2层 | 货物已装船离港 |
| `in_transit` | 在途 | 第2层 | 货物正在海运途中 |
| `at_port` | 已到港 | 第3层 | 货物已到达港口（中转港或目的港） |
| `picked_up` | 已提柜 | 第4层 | 已从港口提走货柜 |
| `unloaded` | 已卸柜 | 第5层 | 已在仓库卸柜 |
| `returned_empty` | 已还箱 | 第6层 | 空箱已归还船公司 |

### 状态流转图（简化版）

```
未出运 (not_shipped)
    ↓
已装船 (shipped) ──→ 在途 (in_transit)
                      ↓
                  已到港 (at_port) ←┐
                      ↓            │
                  已提柜 (picked_up)│
                      ↓            │
                  已卸柜 (unloaded)  │
                      ↓            │
                  已还箱 (returned_empty)
```

**注意**：
- `at_port` 状态支持动态显示中转港/目的港（通过 `port_type` 区分）
- 状态流转支持跳转（例如：在途 → 已提柜，如果有直接提柜场景）

---

## 2. 微服务详细状态（33种状态）

### 标准状态枚举

```typescript
enum StandardStatus {
  // 基础流转状态
  NOT_SHIPPED = 'NOT_SHIPPED',           // 未出运
  EMPTY_PICKED_UP = 'EMPTY_PICKED_UP',   // 提空箱
  GATE_IN = 'GATE_IN',                   // 进闸（装货）
  LOADED = 'LOADED',                     // 装货完成
  DEPARTED = 'DEPARTED',                 // 离港
  SAILING = 'SAILING',                   // 航行中
  TRANSIT_ARRIVED = 'TRANSIT_ARRIVED',   // 到达中转港
  TRANSIT_DEPARTED = 'TRANSIT_DEPARTED', // 离开中转港
  ARRIVED = 'ARRIVED',                   // 到达目的港
  DISCHARGED = 'DISCHARGED',             // 卸船
  AVAILABLE = 'AVAILABLE',               // 可提货
  GATE_OUT = 'GATE_OUT',                 // 出闸（提柜）
  DELIVERY_ARRIVED = 'DELIVERY_ARRIVED', // 送仓到达
  STRIPPED = 'STRIPPED',                 // 卸柜
  RETURNED_EMPTY = 'RETURNED_EMPTY',     // 还空箱
  COMPLETED = 'COMPLETED',               // 完成

  // 异常状态
  CUSTOMS_HOLD = 'CUSTOMS_HOLD',         // 清关扣货
  CARRIER_HOLD = 'CARRIER_HOLD',         // 承运人扣货
  TERMINAL_HOLD = 'TERMINAL_HOLD',       // 码头扣货
  CHARGES_HOLD = 'CHARGES_HOLD',         // 费用扣货
  DUMPED = 'DUMPED',                     // 倒箱
  DELAYED = 'DELAYED',                   // 延误
  DETENTION = 'DETENTION',               // 滞港费
  OVERDUE = 'OVERDUE',                   // 逾期
  CONGESTION = 'CONGESTION',             // 拥堵

  // 通用状态
  HOLD = 'HOLD',                         // 扣货（通用）
  UNKNOWN = 'UNKNOWN'                    // 未知
}
```

### 状态流转规则（100+规则）

详细的状态流转规则定义在 `logistics-path-system/backend/src/utils/pathValidator.ts` 中。

**示例流转路径**：

```
NOT_SHIPPED
  → EMPTY_PICKED_UP
  → GATE_IN
  → LOADED
  → DEPARTED
  → SAILING
  → TRANSIT_ARRIVED (中转港)
  → TRANSIT_DEPARTED
  → SAILING
  → ARRIVED (目的港)
  → DISCHARGED
  → AVAILABLE
  → GATE_OUT
  → DELIVERY_ARRIVED
  → STRIPPED
  → RETURNED_EMPTY
  → COMPLETED
```

---

## 3. 两套状态的映射关系

### 简化状态 ← 详细状态映射

| 简化状态 | 对应的详细状态 |
|---------|--------------|
| `not_shipped` | `NOT_SHIPPED` |
| `shipped` | `LOADED`, `DEPARTED` |
| `in_transit` | `SAILING`, `TRANSIT_DEPARTED` |
| `at_port` | `TRANSIT_ARRIVED`, `ARRIVED`, `DISCHARGED`, `AVAILABLE` |
| `picked_up` | `GATE_OUT`, `DELIVERY_ARRIVED` |
| `unloaded` | `STRIPPED` |
| `returned_empty` | `RETURNED_EMPTY`, `COMPLETED` |

**异常状态映射**：
- `at_port` 包含扣货状态：`CUSTOMS_HOLD`, `CARRIER_HOLD`, `TERMINAL_HOLD`, `CHARGES_HOLD`
- `in_transit` 包含延误状态：`DELAYED`, `CONGESTION`

---

## 4. 当前状态自动更新逻辑

### 4.1 基于港口操作的状态判断

**位置**：`backend/src/controllers/container.controller.ts` (第118-137行)

```typescript
// 查找最新的中转港或目的港操作记录
for (const po of portOperations) {
  if (po.portType === 'transit' || po.portType === 'destination') {
    latestPortOperation = po;
    currentPortType = po.portType;

    // 如果有实际到港时间但状态不是 at_port，需要更新状态
    const hasArrivalTime = po.portType === 'transit'
      ? !!po.transitArrivalDate      // 中转港检查 transit_arrival_date
      : !!po.ataDestPort;            // 目的港检查 ata_dest_port

    if (hasArrivalTime && container.logisticsStatus !== 'at_port') {
      needsStatusUpdate = true;
      container.logisticsStatus = 'at_port';
    }
    break;
  }
}
```

**问题**：当前逻辑只检查是否有实际到达时间，不检查"途经港"是否存在。

### 4.2 Excel 导入时的状态映射

**位置**：`frontend/src/views/import/ExcelImport.vue` (第127-132行)

```typescript
const transformLogisticsStatus = (value: string): string => {
  const map: Record<string, string> = {
    '未出运': 'not_shipped',
    '已装船': 'shipped',
    '在途': 'in_transit',
    '已到港': 'at_port',
    '已提柜': 'picked_up',
    '已卸柜': 'unloaded',
    '已还箱': 'returned_empty',
  };
  return map[value] || value;
};
```

---

## 5. 状态机改进建议

### 5.1 当前问题

根据用户反馈 MRKU4821517 货柜的情况：

**Excel 数据**：
- 途经港：上海
- 途经港到达日期：空
- 目的港到达日期：空
- 预计到港日期：2026-03-06
- 物流状态（Excel）：已出运

**当前逻辑**：
- 因为没有 `transit_arrival_date`，所以状态不会更新为 `at_port`
- 显示为"未出运"或"已出运"（取决于 Excel 中"物流状态"字段）

**用户需求**：
- 有途经港但没有到达日期 → 应显示为"已出运"

### 5.2 改进方案：完善状态判断规则

#### 方案A：增加基于港口存在的状态判断

```typescript
// 优先级1：检查实际到港时间
if (hasArrivalTime) {
  container.logisticsStatus = 'at_port';
}
// 优先级2：检查是否有目的港
else if (hasDestinationPort) {
  container.logisticsStatus = 'in_transit';
}
// 优先级3：检查是否有中转港
else if (hasTransitPort) {
  container.logisticsStatus = 'shipped';  // 已出运（在中转途中）
}
// 优先级4：检查是否有出运日期
else if (hasShipDate) {
  container.logisticsStatus = 'shipped';
}
```

#### 方案B：创建统一的状态机函数

```typescript
/**
 * 根据货柜数据自动计算物流状态
 */
export const calculateLogisticsStatus = (container: Container, portOperations: PortOperation[]): string => {
  // 1. 检查最高优先级状态（从后往前）
  if (container.warehouseUnloadDate) return 'unloaded';
  if (container.truckingPickupDate) return 'picked_up';
  
  // 2. 检查港口操作
  const transitPorts = portOperations.filter(po => po.portType === 'transit');
  const destPorts = portOperations.filter(po => po.portType === 'destination');
  
  // 目的港有实际到港时间
  if (destPorts.some(po => po.ataDestPort)) return 'at_port';
  
  // 中转港有到达时间
  if (transitPorts.some(po => po.transitArrivalDate)) return 'at_port';
  
  // 有目的港记录
  if (destPorts.length > 0) return 'in_transit';
  
  // 有中转港记录
  if (transitPorts.length > 0) return 'shipped';
  
  // 3. 检查海运信息
  if (container.shipDate) return 'shipped';
  
  // 4. 检查还箱
  if (container.emptyReturnDate) return 'returned_empty';
  
  // 默认状态
  return 'not_shipped';
};
```

---

## 6. 完整的状态机流转规则

### 6.1 基于时间字段的优先级

| 字段 | 对应状态 | 说明 |
|------|---------|------|
| `empty_return_date` | `returned_empty` | 还空箱日期（最高优先级） |
| `warehouse_unload_date` | `unloaded` | 仓库卸柜日期 |
| `trucking_pickup_date` | `picked_up` | 提柜日期 |
| `port_operations.ata_dest_port` | `at_port` | 目的港实际到港 |
| `port_operations.transit_arrival_date` | `at_port` | 中转港到达日期 |
| `port_operations` (destination 存在) | `in_transit` | 有目的港记录 |
| `port_operations` (transit 存在) | `shipped` | 有中转港记录 |
| `ship_date` | `shipped` | 出运日期 |
| (无任何字段) | `not_shipped` | 默认状态 |

### 6.2 状态流转合法性检查

```
not_shipped → shipped → in_transit → at_port → picked_up → unloaded → returned_empty
     ↑           ↓            ↓           ↓            ↓           ↓
     └───────────┴────────────┴───────────┴────────────┴───────────┘
                  支持跳转（例如：shipped → at_port）
```

---

## 7. 实施计划

### 7.1 短期（立即执行）

1. **修改状态自动更新逻辑**
   - 文件：`backend/src/controllers/container.controller.ts`
   - 增加：基于港口存在的状态判断

2. **更新状态机文档**
   - 创建本文档（已完成）
   - 更新 API 文档

### 7.2 中期

1. **实现统一状态机函数**
   - 创建 `backend/src/utils/logisticsStatusMachine.ts`
   - 封装所有状态判断逻辑
   - 提供单元测试

2. **前后端统一状态映射**
   - 前端使用相同的映射规则
   - 避免不一致

### 7.3 长期

1. **集成微服务详细状态**
   - 将外部API的详细状态映射到简化状态
   - 支持更精确的状态追踪

2. **状态流转验证**
   - 使用 `logistics-path-system` 的状态机验证
   - 防止非法状态流转

---

## 8. 参考资料

- [PORT_STATUS_MAPPING_GUIDE.md](./PORT_STATUS_MAPPING_GUIDE.md) - 港口状态映射方案
- [EXCEL_STATUS_MAPPING.md](./EXCEL_STATUS_MAPPING.md) - Excel 状态映射规则
- [ARCHITECTURE_EXPLAINED.md](./ARCHITECTURE_EXPLAINED.md) - 架构说明
- `logistics-path-system/backend/src/utils/pathValidator.ts` - 微服务状态机

---

**文档版本**：1.0
**创建日期**：2026-02-27
**最后更新**：2026-02-27
