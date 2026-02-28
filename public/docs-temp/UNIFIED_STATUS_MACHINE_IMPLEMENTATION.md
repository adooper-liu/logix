# 统一状态机实施方案

## 概述

本文档说明 LogiX 系统统一状态机的实施细节，包括前后端统一状态映射、外部API集成和状态流转验证。

---

## 1. 架构设计

### 1.1 两套状态体系

```
┌─────────────────────────────────────────────────────────────┐
│                    外部API详细状态                        │
│          (33种状态 - logistics-path-system)              │
│  NOT_SHIPPED, LOADED, SAILING, TRANSIT_ARRIVED,       │
│  ARRIVED, DISCHARGED, CUSTOMS_HOLD, DELAYED, ...       │
└──────────────────────┬──────────────────────────────────────┘
                       │ 映射
                       ↓
┌─────────────────────────────────────────────────────────────┐
│                    主服务简化状态                          │
│             (7种状态 - 用于桑基图和前端)                  │
│  not_shipped, shipped, in_transit, at_port,             │
│  picked_up, unloaded, returned_empty                      │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 文件结构

```
backend/
├── src/
│   ├── utils/
│   │   └── logisticsStatusMachine.ts      # 后端状态机（统一）
│   └── controllers/
│       └── container.controller.ts       # 使用统一状态机

frontend/
├── src/
│   ├── utils/
│   │   └── logisticsStatusMachine.ts      # 前端状态机（统一）
│   └── views/
│       └── shipments/
│           ├── Shipments.vue              # 货柜列表页
│           └── ContainerDetail.vue       # 货柜详情页

docs/
├── LOGISTICS_STATUS_STATE_MACHINE.md      # 状态机文档
├── STATUS_LOGIC_TEST_SCENARIOS.md       # 测试场景
└── UNIFIED_STATUS_MACHINE_IMPLEMENTATION.md # 本文档
```

---

## 2. 核心实现

### 2.1 后端状态机

**文件**: `backend/src/utils/logisticsStatusMachine.ts`

**功能**:
1. 简化状态枚举（7种）
2. 详细状态枚举（33种）
3. 详细状态到简化状态的映射
4. Excel 中文状态映射
5. 外部API状态代码映射
6. 状态流转规则验证
7. 基于数据的自动状态计算（核心）

**核心函数**: `calculateLogisticsStatus()`

```typescript
/**
 * 基于货柜相关数据自动计算物流状态
 * 优先级顺序（从高到低）:
 * 1. 还空箱日期 → returned_empty
 * 2. 仓库卸柜日期 → unloaded
 * 3. 拖车提柜日期 → picked_up
 * 4. 目的港实际到港 → at_port
 * 5. 中转港到达日期 → at_port
 * 6. 有目的港记录（无到达时间）→ in_transit
 * 7. 有中转港记录（无到达时间）→ shipped
 * 8. 有出运日期 → shipped
 * 9. 默认 → not_shipped
 */
export const calculateLogisticsStatus = (
  container: Container,
  portOperations: PortOperation[],
  seaFreight?: SeaFreight,
  truckingTransport?: TruckingTransport,
  warehouseOperation?: WarehouseOperation,
  emptyReturn?: EmptyReturn
): { status, currentPortType, latestPortOperation }
```

### 2.2 前端状态机

**文件**: `frontend/src/utils/logisticsStatusMachine.ts`

**功能**:
1. 与后端完全一致的枚举定义
2. 动态物流状态显示（支持中转港/目的港区分）
3. Excel 状态转换
4. 状态流转验证
5. Element Plus 组件映射

**核心函数**: `getLogisticsStatusText()`

```typescript
/**
 * 根据港口类型动态获取物流状态文本
 */
export const getLogisticsStatusText = (
  status: SimplifiedStatus | string,
  portType?: PortType | string | null
): string => {
  if (status !== SimplifiedStatus.AT_PORT || !portType) {
    return SimplifiedStatusText[status as SimplifiedStatus] || status;
  }

  if (portType === PortType.TRANSIT) {
    return '到达中转港';
  } else if (portType === PortType.DESTINATION) {
    return '到达目的港';
  } else {
    return '已到港';
  }
};
```

---

## 3. 状态映射关系

### 3.1 简化状态（7种）

| 标准代码 | 中文名称 | 桑基图层级 | 说明 |
|---------|---------|-----------|------|
| `not_shipped` | 未出运 | 第1层 | 备货单已创建，但货物尚未出运 |
| `shipped` | 已出运 | 第1-2层 | 货物已装船离港 |
| `in_transit` | 在途 | 第2层 | 货物正在海运途中 |
| `at_port` | 已到港 | 第3层 | 货物已到达港口（中转港或目的港） |
| `picked_up` | 已提柜 | 第4层 | 已从港口提走货柜 |
| `unloaded` | 已卸柜 | 第5层 | 已在仓库卸柜 |
| `returned_empty` | 已还箱 | 第6层 | 空箱已归还船公司 |

### 3.2 详细状态到简化状态的映射（部分示例）

| 详细状态 | 简化状态 | 说明 |
|---------|---------|------|
| `NOT_SHIPPED` | `not_shipped` | 未出运 |
| `EMPTY_PICKED_UP` | `shipped` | 提空箱 |
| `GATE_IN` | `shipped` | 进闸 |
| `LOADED` | `shipped` | 装货完成 |
| `DEPARTED` | `shipped` | 离港 |
| `SAILING` | `in_transit` | 航行中 |
| `TRANSIT_DEPARTED` | `in_transit` | 离开中转港 |
| `TRANSIT_ARRIVED` | `at_port` | 到达中转港 |
| `ARRIVED` | `at_port` | 到达目的港 |
| `DISCHARGED` | `at_port` | 卸船 |
| `AVAILABLE` | `at_port` | 可提货 |
| `GATE_OUT` | `picked_up` | 出闸 |
| `DELIVERY_ARRIVED` | `picked_up` | 送仓到达 |
| `STRIPPED` | `unloaded` | 卸柜 |
| `RETURNED_EMPTY` | `returned_empty` | 还空箱 |
| `COMPLETED` | `returned_empty` | 完成 |
| `CUSTOMS_HOLD` | `at_port` | 清关扣货（视为在港） |
| `DELAYED` | `at_port` | 延误（优先在港） |
| `CONGESTION` | `in_transit` | 拥堵（视为在途） |

### 3.3 外部API状态代码映射

| API代码 | 详细状态 | 简化状态 | API来源 |
|---------|---------|---------|---------|
| `BO` | `LOADED` | `shipped` | 飞驼 |
| `DLPT` | `SAILING` | `in_transit` | 飞驼 |
| `ARRIVE` | `ARRIVED` | `at_port` | 飞驼 |
| `ATA` | `ARRIVED` | `at_port` | 飞驼 |
| `GATE_IN` | `GATE_IN` | `shipped` | 飞驼 |
| `GATE_OUT` | `GATE_OUT` | `picked_up` | 飞驼 |
| `DISCHARGED` | `DISCHARGED` | `at_port` | 飞驼 |
| `AVAIL` | `AVAILABLE` | `at_port` | 飞驼 |
| `EMPTY_RETURN` | `RETURNED_EMPTY` | `returned_empty` | 飞驼 |

---

## 4. 状态自动计算逻辑

### 4.1 优先级规则

```typescript
优先级1: emptyReturn.returnTime? → returned_empty
优先级2: warehouseOperation.unloadDate? → unloaded
优先级3: truckingTransport.pickupDate? → picked_up
优先级4: destPorts.some(po => po.ataDestPort)? → at_port (destination)
优先级5: transitPorts.some(po => po.transitArrivalDate)? → at_port (transit)
优先级6: destPorts.length > 0? → in_transit
优先级7: transitPorts.length > 0? → shipped
优先级8: seaFreight.shipmentDate || container.order.actualShipDate? → shipped
优先级9: → not_shipped (默认)
```

### 4.2 测试场景

| 场景 | 途经港 | 途经港到达 | 目的港 | 目的港到达 | 期望状态 |
|------|-------|----------|-------|----------|---------|
| 1 | 上海 | 空 | 萨凡纳 | 空 | `shipped` |
| 2 | 上海 | 2026-02-02 | 萨凡纳 | 空 | `at_port` |
| 3 | 无 | 无 | 萨凡纳 | 2026-03-07 | `at_port` |
| 4 | 无 | 无 | 萨凡纳 | 空 | `in_transit` |
| 5 | 无 | 无 | 无 | 无 | `not_shipped` |

---

## 5. 前后端统一

### 5.1 后端更新

**文件**: `backend/src/controllers/container.controller.ts`

**修改点**:
1. 导入统一状态机模块
2. 使用 `calculateLogisticsStatus()` 替代原有的状态判断逻辑
3. 查询所有相关数据（港口操作、海运、拖车、仓库、还空箱）
4. 自动更新 `logistics_status`

```typescript
// 导入状态机
import {
  SimplifiedStatus,
  calculateLogisticsStatus,
  getSimplifiedStatusText,
  DetailedStatus,
  mapExternalStatusToSimplified,
  DetailedToSimplifiedMap
} from '../utils/logisticsStatusMachine';

// 使用统一状态机计算状态
const result = calculateLogisticsStatus(
  container,
  portOperations,
  seaFreight,
  truckingTransport,
  warehouseOperation,
  emptyReturn
);

// 更新状态
if (result.status !== container.logisticsStatus) {
  container.logisticsStatus = result.status;
  currentPortType = result.currentPortType;
  latestPortOperation = result.latestPortOperation;
  await this.containerRepository.save(container);
}
```

### 5.2 前端更新

**文件**: `frontend/src/views/shipments/Shipments.vue`

**修改点**:
1. 导入统一状态机模块
2. 移除硬编码的 `statusMap`
3. 使用 `getLogisticsStatusText()` 动态显示状态
4. 使用 `getLogisticsStatusType()` 获取状态类型

```typescript
// 导入状态机
import {
  getLogisticsStatusText as getStatusText,
  getLogisticsStatusType,
  SimplifiedStatus
} from '@/utils/logisticsStatusMachine';

// 动态显示物流状态
const getLogisticsStatusText = (container: any): string => {
  const status = container.logisticsStatus
  const currentPortType = container.currentPortType || container.latestPortOperation?.portType
  return getStatusText(status, currentPortType)
}

// 获取状态类型
const getStatusType = (status: string): string => {
  return getLogisticsStatusType(status)
}
```

---

## 6. 外部API集成

### 6.1 状态代码转换

```typescript
import { mapExternalStatusToSimplified } from '../utils/logisticsStatusMachine';

// 将飞驼API的状态代码转换为简化状态
const simplifiedStatus = mapExternalStatusToSimplified('DLPT');
// 结果: 'in_transit'
```

### 6.2 批量转换

```typescript
import { batchMapExternalStatuses } from '../utils/logisticsStatusMachine';

const externalStatuses = [
  { statusCode: 'DLPT', containerNumber: 'MRKU4821517' },
  { statusCode: 'ARRIVE', containerNumber: 'SUDU6797842' }
];

const results = batchMapExternalStatuses(externalStatuses);
// 结果: [
//   { containerNumber: 'MRKU4821517', simplifiedStatus: 'in_transit' },
//   { containerNumber: 'SUDU6797842', simplifiedStatus: 'at_port' }
// ]
```

### 6.3 详细状态处理

```typescript
import { DetailedStatus, DetailedToSimplifiedMap, isAlertStatus } from '../utils/logisticsStatusMachine';

// 处理来自 logistics-path-system 的详细状态
const detailedStatus = DetailedStatus.CUSTOMS_HOLD;
const simplifiedStatus = DetailedToSimplifiedMap[detailedStatus];
const isAlert = isAlertStatus(detailedStatus);

console.log(`详细状态: ${detailedStatus}`);
console.log(`简化状态: ${simplifiedStatus}`); // 'at_port'
console.log(`是否异常: ${isAlert}`); // true
```

---

## 7. 状态流转验证

### 7.1 简化状态流转规则

```typescript
const isValid = isValidSimplifiedTransition(
  SimplifiedStatus.SHIPPED,
  SimplifiedStatus.AT_PORT
);
// 结果: true (shipped → at_port 是合法的)

const isInvalid = isValidSimplifiedTransition(
  SimplifiedStatus.NOT_SHIPPED,
  SimplifiedStatus.PICKED_UP
);
// 结果: false (not_shipped → picked_up 是非法的)
```

### 7.2 详细状态流转规则

详细状态流转规则在 `logistics-path-system` 微服务中实现（100+规则）。

**示例路径**:
```
NOT_SHIPPED → EMPTY_PICKED_UP → GATE_IN → LOADED → DEPARTED
  → SAILING → TRANSIT_ARRIVED → TRANSIT_DEPARTED → SAILING
  → ARRIVED → DISCHARGED → AVAILABLE → GATE_OUT
  → DELIVERY_ARRIVED → STRIPPED → RETURNED_EMPTY → COMPLETED
```

---

## 8. 使用示例

### 8.1 后端控制器

```typescript
import { calculateLogisticsStatus } from '../utils/logisticsStatusMachine';

// 在 getContainers 中使用
const result = calculateLogisticsStatus(
  container,
  portOperations,
  seaFreight,
  truckingTransport,
  warehouseOperation,
  emptyReturn
);

container.logisticsStatus = result.status;
currentPortType = result.currentPortType;
latestPortOperation = result.latestPortOperation;
```

### 8.2 前端组件

```vue
<script setup>
import { getLogisticsStatusText, getLogisticsStatusType } from '@/utils/logisticsStatusMachine'

const containers = ref([...])

const getStatusText = (container) => {
  const status = container.logisticsStatus
  const portType = container.currentPortType || container.latestPortOperation?.portType
  return getLogisticsStatusText(status, portType)
}

const getStatusType = (status) => {
  return getLogisticsStatusType(status)
}
</script>

<template>
  <el-table :data="containers">
    <el-table-column label="物流状态">
      <template #default="{ row }">
        <el-tag :type="getStatusType(row.logisticsStatus)">
          {{ getStatusText(row) }}
        </el-tag>
      </template>
    </el-table-column>
  </el-table>
</template>
```

### 8.3 Excel 导入

```typescript
import { transformLogisticsStatus } from '@/utils/logisticsStatusMachine';

// Excel 导入时转换状态
const excelStatus = '已出运';
const simplifiedStatus = transformLogisticsStatus(excelStatus);
// 结果: 'shipped'
```

---

## 9. 测试计划

### 9.1 单元测试

**测试文件**: `backend/src/__tests__/logisticsStatusMachine.test.ts`

```typescript
describe('logisticsStatusMachine', () => {
  it('should calculate status correctly for transit port with arrival', () => {
    const result = calculateLogisticsStatus(container, portOperations, ...);
    expect(result.status).toBe(SimplifiedStatus.AT_PORT);
    expect(result.currentPortType).toBe('transit');
  });

  it('should map detailed status to simplified', () => {
    expect(DetailedToSimplifiedMap[DetailedStatus.SAILING])
      .toBe(SimplifiedStatus.IN_TRANSIT);
  });

  it('should validate transition correctly', () => {
    expect(isValidSimplifiedTransition(
      SimplifiedStatus.SHIPPED,
      SimplifiedStatus.AT_PORT
    )).toBe(true);
  });
});
```

### 9.2 集成测试

1. **导入Excel数据**: 验证状态映射正确
2. **查询货柜列表**: 验证状态自动更新
3. **查看货柜详情**: 验证动态显示正确
4. **外部API集成**: 验证状态代码转换

### 9.3 测试场景

参考 `docs/STATUS_LOGIC_TEST_SCENARIOS.md` 中的6个测试场景。

---

## 10. 部署检查清单

### 10.1 后端

- [x] 创建 `backend/src/utils/logisticsStatusMachine.ts`
- [x] 更新 `backend/src/controllers/container.controller.ts`
- [x] 导入状态机模块
- [x] 使用 `calculateLogisticsStatus()` 替代原有逻辑
- [ ] 添加单元测试
- [ ] 重启后端服务
- [ ] 验证后端日志输出
- [ ] 查询数据库确认状态

### 10.2 前端

- [x] 创建 `frontend/src/utils/logisticsStatusMachine.ts`
- [x] 更新 `frontend/src/views/shipments/Shipments.vue`
- [ ] 更新 `frontend/src/views/shipments/ContainerDetail.vue`
- [x] 导入状态机模块
- [x] 使用 `getLogisticsStatusText()` 替代硬编码映射
- [ ] 测试前端页面显示
- [ ] 验证状态动态切换

### 10.3 文档

- [x] 创建状态机文档（`LOGISTICS_STATUS_STATE_MACHINE.md`）
- [x] 创建测试场景文档（`STATUS_LOGIC_TEST_SCENARIOS.md`）
- [x] 创建实施方案文档（本文档）
- [ ] 更新 API 文档
- [ ] 更新开发标准文档

---

## 11. 维护指南

### 11.1 添加新的详细状态

如果需要添加新的详细状态：

1. 在 `backend/src/utils/logisticsStatusMachine.ts` 中添加枚举值
2. 在 `DetailedToSimplifiedMap` 中添加映射
3. 在 `logistics-path-system` 中更新状态流转规则

### 11.2 修改状态优先级

如果需要修改状态计算优先级：

1. 修改 `calculateLogisticsStatus()` 函数中的优先级顺序
2. 更新本文档的优先级规则
3. 更新测试场景
4. 运行测试验证

### 11.3 添加新的外部API集成

如果需要集成新的外部API：

1. 在 `ExternalApiToDetailedMap` 中添加状态代码映射
2. 创建适配器层处理API调用
3. 测试状态转换逻辑

---

## 12. 回滚方案

如果出现问题需要回滚：

### 后端回滚

```typescript
// 恢复原有的状态判断逻辑
const hasArrivalTime = po.portType === 'transit'
  ? !!po.transitArrivalDate
  : !!po.ataDestPort;

if (hasArrivalTime && container.logisticsStatus !== 'at_port') {
  container.logisticsStatus = 'at_port';
}
```

### 前端回滚

```typescript
// 恢复原有的 statusMap
const statusMap = {
  'not_shipped': { text: '未出运', type: 'info' },
  'shipped': { text: '已装船', type: 'success' },
  // ...
};

const getStatusType = (status) => statusMap[status]?.type || 'info';
```

---

## 13. 总结

### 关键成果

1. ✅ **统一状态机**: 前后端使用完全一致的状态定义和映射规则
2. ✅ **精确状态追踪**: 支持33种详细状态，映射到7种简化状态
3. ✅ **动态显示**: 根据港口类型动态显示"到达中转港"或"到达目的港"
4. ✅ **自动状态计算**: 基于数据优先级自动计算正确的物流状态
5. ✅ **状态流转验证**: 防止非法状态流转
6. ✅ **外部API集成**: 支持飞驼等外部API的状态代码映射
7. ✅ **完善的文档**: 包含状态机文档、测试场景和实施方案

### 下一步计划

1. 完成 ContainerDetail.vue 的状态机集成
2. 添加单元测试
3. 集成 logistics-path-system 微服务的状态验证
4. 实现外部API适配器层
5. 添加状态变更历史记录

---

**文档版本**: 1.0
**创建日期**: 2026-02-27
**最后更新**: 2026-02-27
