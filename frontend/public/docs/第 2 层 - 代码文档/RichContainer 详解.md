# Rich Container（增强货柜数据）详解

**版本**: v1.0  
**创建时间**: 2026-04-04  
**作者**: 刘志高

---

## 一、概念说明

### 1.1 什么是 Rich Container？

**Rich Container**（增强货柜数据）是指通过后端 `ContainerService.enrichContainersList()` 方法处理后的货柜数据对象。它在原始货柜数据的基础上，添加了丰富的关联信息、计算字段和派生数据，为前端展示提供完整的数据支持。

### 1.2 核心价值

- ✅ **数据完整性**: 一次性获取所有关联数据，避免 N+1 查询
- ✅ **性能优化**: 批量查询替代多次单独查询
- ✅ **前端友好**: 前端直接使用，无需额外计算
- ✅ **口径一致**: 列表、详情、统计使用同一套 enrich 逻辑

---

## 二、技术实现

### 2.1 核心方法

**文件位置**: `backend/src/services/container.service.ts`

```typescript
/**
 * 为货柜列表添加扩展信息（优化版本）
 * 使用批量查询替代 N+1 查询，提升性能
 */
async enrichContainersList(containers: Container[]): Promise<any[]> {
  const startTime = Date.now();

  // 批量查询优化：收集所有 container_number
  const containerNumbers = containers.map((c) => c.containerNumber);

  // 批量查询所有相关数据
  const [
    ordersMap,
    eventsMap,
    portOperationsMap,
    truckingMap,
    warehouseMap,
    emptyReturnsMap,
    alertsMap,
    customsBrokersMap,
    truckingCompaniesMap,
    warehousesMap,
    countriesMap,
    portNameMap,
    costBreakdownMap
  ] = await Promise.all([
    this.batchFetchOrders(containerNumbers),
    this.batchFetchStatusEvents(containerNumbers),
    this.batchFetchPortOperations(containerNumbers),
    this.batchFetchTruckingTransports(containerNumbers),
    this.batchFetchWarehouseOperations(containerNumbers),
    this.batchFetchEmptyReturns(containerNumbers),
    this.batchFetchAlerts(containerNumbers),
    this.batchFetchCustomsBrokers(),
    this.batchFetchTruckingCompanies(),
    this.batchFetchWarehouses(),
    this.batchFetchCountries(),
    this.batchFetchPortNames(containerNumbers),
    this.batchFetchCostBreakdown(containerNumbers)
  ]);

  // ... 后续数据组装逻辑
}
```

### 2.2 查询的 13 类数据

| 数据类型 | 查询方法 | 用途 |
|---------|---------|------|
| 备货单信息 | `batchFetchOrders()` | 订单号、客户信息、贸易条款等 |
| 状态事件 | `batchFetchStatusEvents()` | 物流状态事件时间线 |
| 港口操作 | `batchFetchPortOperations()` | 到港、卸货、报关等信息 |
| 拖车运输 | `batchFetchTruckingTransports()` | 车队、司机、运输状态 |
| 仓库操作 | `batchFetchWarehouseOperations()` | 仓库、卸货日期 |
| 空箱返还 | `batchFetchEmptyReturns()` | 还箱日期、堆场 |
| 预警信息 | `batchFetchAlerts()` | 滞港费预警、查验预警 |
| 清关行信息 | `batchFetchCustomsBrokers()` | 清关行名称 |
| 车队信息 | `batchFetchTruckingCompanies()` | 车队公司名称 |
| 仓库信息 | `batchFetchWarehouses()` | 仓库名称、地址 |
| 国家信息 | `batchFetchCountries()` | 国家名称 |
| 港口名称 | `batchFetchPortNames()` | 港口中文/英文名称 |
| 费用明细 | `batchFetchCostBreakdown()` | 滞港费、运费等费用构成 |

---

## 三、数据结构

### 3.1 Rich Container 完整结构

```typescript
interface RichContainer extends Container {
  // === 基础信息 ===
  id: string
  containerNumber: string
  orderNumber: string
  containerTypeCode: string
  
  // === 备货单关联 ===
  order?: ReplenishmentOrder           // 首个备货单
  allOrders?: ReplenishmentOrder[]     // 所有备货单
  summary?: {
    totalGrossWeight: number           // 总毛重
    totalCbm: number                   // 总体积
    totalBoxes: number                 // 总箱数
    shipmentTotalValue: number         // 出货总值
    fobAmount: number                  // FOB 金额
    cifAmount: number                  // CIF 金额
    negotiationAmount: number          // 议付金额
    orderCount: number                 // 备货单数量
  }
  
  // === 海运信息 ===
  seaFreight?: SeaFreight[]
  
  // === 流程信息 ===
  portOperations?: PortOperation[]     // 港口操作
  truckingTransports?: TruckingTransport[]  // 拖车运输
  warehouseOperations?: WarehouseOperation[] // 仓库操作
  emptyReturns?: EmptyReturn[]         // 空箱返还
  
  // === 状态信息 ===
  statusEvents?: StatusEvent[]         // 状态事件
  logisticsStatus: string              // 计算后的物流状态
  currentStatusDescCn?: string         // 当前状态中文描述
  currentStatusDescEn?: string         // 当前状态英文描述
  
  // === 甘特图数据 ===
  ganttDerived?: GanttDerived          // 甘特图阶段/主任务
  
  // === 排产信息 ===
  scheduleStatus?: 'initial' | 'issued' | 'dispatched' | 'adjusted'
  
  // === 预警信息 ===
  alerts?: ContainerAlert[]
  
  // === 费用信息 ===
  costBreakdown?: {
    demurrage: number                  // 滞港费
    detention: number                  // 滞箱费
    storage: number                    // 堆存费
    total: number                      // 总费用
  }
  
  // === 字典映射 ===
  customsBrokerName?: string           // 清关行名称
  truckingCompanyName?: string         // 车队名称
  warehouseName?: string               // 仓库名称
  countryName?: string                 // 销往国家名称
  portName?: string                    // 目的港名称
  
  // === 其他扩展 ===
  inspectionRequired: boolean          // 是否需要查验
  isUnboxing: boolean                  // 是否已拆箱
  isRolled: boolean                    // 是否已翻箱
  operator?: string                    // 操作员
  containerHolder?: string             // 持柜人
}
```

### 3.2 关键计算字段

#### 物流状态 (logisticsStatus)

通过 `calculateLogisticsStatus()` 方法计算，基于 7 层状态机优先级：

```typescript
// 优先级从高到低
1. 已还箱 (emptyReturn.actualReturnDate)
2. WMS 卸柜 (warehouseOperation.actualUnloadDate)
3. 已提柜 (truckingTransport.actualPickupDate)
4. 已到目的港 (portOperation.ata at destination)
5. 已到中转港 (portOperation.ata at transit)
6. 已进闸 (portOperation.gateInTime)
7. 海运出运 (seaFreight.shipmentDate)
8. 未出运 (default)
```

#### 甘特图阶段 (ganttDerived)

通过 `buildGanttDerived()` 方法从流程表构建：

```typescript
interface GanttDerived {
  stage: 'ocean' | 'trucking' | 'warehouse' | 'return'  // 主阶段
  startDate: Date                                        // 阶段开始日期
  endDate: Date                                          // 阶段结束日期
  progress: number                                       // 进度百分比
}
```

---

## 四、使用场景

### 4.1 列表页面

**文件**: `frontend/src/views/shipments/Shipments.vue`

```typescript
// 使用 useShipmentsTable composable
const { containers, loading } = useShipmentsTable()

// containers 已经是 Rich Container 数据
containers.value.forEach(container => {
  console.log(container.orderNumber)        // 备货单号
  console.log(container.logisticsStatus)    // 物流状态
  console.log(container.seaFreight?.[0]?.eta) // 预计到港时间
})
```

### 4.2 统计查询

**文件**: `backend/src/services/ContainerDataService.ts`

```typescript
async getContainersForStats(params: IStatsParams) {
  const qb = ContainerQueryBuilder.createListQuery(this.containerRepository, params);
  const containers = await qb.getMany();
  
  // 返回 Rich Container 用于统计
  const enriched = await this.containerService.enrichContainersList(containers);
  return enriched;
}
```

### 4.3 详情页面

**文件**: `frontend/src/views/shipments/ContainerDetailRefactored.vue`

```vue
<template>
  <ContainerSummary
    :container-data="containerData"  <!-- Rich Container -->
    :demurrage-calculation="demurrageCalculation"
  />
  <KeyDatesTimeline
    :container-data="containerData"
    :calculation-dates="calculationDates"
  />
</template>

<script setup lang="ts">
// 加载详情时也是 Rich Container
const loadContainerDetail = async () => {
  const response = await containerService.getContainerById(props.containerNumber)
  containerData.value = response.data  // Rich Container
}
</script>
```

### 4.4 甘特图组件

**文件**: `frontend/src/components/common/SimpleGanttChart.vue`

```typescript
// 加载富化的货柜数据用于甘特图展示
const loadContainers = async () => {
  const response = await containerService.getContainers({
    page: 1,
    pageSize: 500,
    startDate,
    endDate,
  })
  
  containers.value = response.items  // Rich Container
  // 使用 ganttDerived 字段绘制甘特图
  containers.value.forEach(c => {
    if (c.ganttDerived) {
      drawGanttBar(c.containerNumber, c.ganttDerived)
    }
  })
}
```

---

## 五、API 端点

### 5.1 列表接口

```http
GET /api/v1/containers
```

**请求参数**:
```typescript
{
  page: number
  pageSize: number
  search?: string
  startDate?: string  // 顶部日期范围 - 出运日期口径
  endDate?: string
}
```

**响应数据**:
```json
{
  "success": true,
  "items": [/* Rich Container[] */],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### 5.2 详情接口

```http
GET /api/v1/containers/:id
```

**响应数据**:
```json
{
  "success": true,
  "data": { /* Rich Container */ }
}
```

### 5.3 列表行核对接口

```http
GET /api/v1/containers/:id/list-row
```

**用途**: 获取与列表 API enrich 结果完全一致的数据，用于前端显示与后端数据核对

---

## 六、性能优化

### 6.1 批量查询优化

**优化前** (N+1 查询):
```typescript
// ❌ 错误示例：循环查询
for (const container of containers) {
  const order = await orderService.findByContainerNumber(container.containerNumber)
  container.order = order
}
// 执行 N+1 次查询
```

**优化后** (批量查询):
```typescript
// ✅ 正确示例：批量查询
const containerNumbers = containers.map(c => c.containerNumber)
const orders = await orderService.findByContainerNumbers(containerNumbers)
// 只执行 1 次查询
```

### 6.2 并行查询优化

```typescript
// ✅ 使用 Promise.all 并行查询所有数据
const [orders, events, portOps, truckings, warehouses] = await Promise.all([
  batchFetchOrders(containerNumbers),
  batchFetchStatusEvents(containerNumbers),
  batchFetchPortOperations(containerNumbers),
  batchFetchTruckingTransports(containerNumbers),
  batchFetchWarehouseOperations(containerNumbers)
])
```

### 6.3 Map 数据结构优化

```typescript
// 使用 Map 提高查找效率 O(1)
const ordersMap = new Map<string, Order>()
orders.forEach(order => {
  ordersMap.set(order.containerNumber, order)
})

// 后续查找
const order = ordersMap.get(containerNumber)
```

---

## 七、调试技巧

### 7.1 查看 Rich Container 数据

```typescript
// 浏览器控制台
const row = await containerService.getListRowByContainerNumber('CAIU1234567')
console.log('Rich Container:', JSON.stringify(row, null, 2))
```

### 7.2 性能监控

```typescript
// backend/src/services/container.service.ts
async enrichContainersList(containers: Container[]) {
  const startTime = Date.now();
  
  // ... enrich 逻辑
  
  const endTime = Date.now();
  logger.info(`[enrichContainersList] Processed ${containers.length} containers in ${endTime - startTime}ms`);
  
  return enriched;
}
```

### 7.3 常见问题排查

**问题 1: 某个字段为 undefined**
- 检查该字段是否在 enrich 逻辑中查询
- 检查关联表是否有对应数据
- 检查字段名拼写是否正确

**问题 2: 性能慢**
- 检查是否使用了批量查询
- 检查数据库索引是否建立
- 检查是否查询了不必要的数据

---

## 八、最佳实践

### 8.1 前端使用建议

```typescript
// ✅ 推荐：直接使用 Rich Container
const { containers } = useShipmentsTable()
const grossWeight = computed(() => 
  containerData.value?.summary?.totalGrossWeight ?? containerData.value?.grossWeight
)

// ❌ 不推荐：自己再查询一遍
const order = await orderService.getByContainerNumber(containerNumber)
```

### 8.2 后端开发建议

```typescript
// ✅ 推荐：保持 enrich 逻辑一致性
// 列表、详情、统计都使用同一个 enrichContainersList 方法

// ❌ 不推荐：每个接口写一套 enrich 逻辑
// 这会导致数据口径不一致
```

### 8.3 新增字段的正确姿势

```typescript
// 1. 在 enrichContainersList 中添加查询
const newFieldMap = await batchFetchNewField(containerNumbers)

// 2. 在循环中添加到结果对象
containers.map(container => ({
  ...container,
  newField: newFieldMap.get(container.containerNumber)
}))

// 3. 更新 TypeScript 类型定义
interface RichContainer {
  newField?: NewFieldType
}
```

---

## 九、相关文档

### 9.1 内部文档

- [模块调用关系](./模块调用关系.md) - 了解整体架构
- [滞港费计算逻辑](./01-滞港费计算逻辑.md) - 费用计算细节
- [状态机文档](../05-state-machine/02-物流状态机.md) - 物流状态计算

### 9.2 代码文件

- `backend/src/services/container.service.ts` - Enrich 核心逻辑
- `backend/src/controllers/container.controller.ts` - API 控制器
- `frontend/src/services/container.ts` - 前端服务
- `frontend/src/types/container.ts` - TypeScript 类型定义

---

## 十、总结

**Rich Container** 是 LogiX项目中的核心数据结构，它通过精心设计的 enrich 逻辑，为前端提供了完整、准确、易用的货柜数据。理解并正确使用 Rich Container，对于开发高质量的 LogiX 应用至关重要。

**关键要点**:
- ✅ 批量查询替代 N+1 查询
- ✅ 并行处理提升性能
- ✅ Map 结构优化查找
- ✅ 统一口径保证一致性
- ✅ 前端友好减少计算

---

**文档版本**: v1.0  
**最后更新**: 2026-04-04  
**维护者**: 刘志高  
**审核状态**: ✅ 已验证

---

**END**
