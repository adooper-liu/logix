# LogiX 智能排柜引擎

## 核心概念

### 智能排柜 vs 手动排柜
- **手动排柜**：用户手动选择车队、仓库、提柜日期
- **智能排柜**：引擎自动分派最优资源（成本优化）

### 排柜结果存储
智能排柜的结果写入流程表：
- `process_trucking_transport.trucking_company_code` - 分派的车队
- `process_warehouse_operations.warehouse_code` - 分派的仓库
- `process_trucking_transport.planned_pickup_date` - 计划提柜日期

---

## 排柜引擎逻辑

### Step 1: 识别销往国家
```typescript
const sellToCountry = replenishmentOrder.sellToCountry;
// 例如: "CA-S003" (加拿大子公司)
```

### Step 2: 查找映射关系
```typescript
// dict_warehouse_trucking_mapping 表
const mappings = await getWarehouseTruckingMappings({
  countryCode: extractCountryCode(sellToCountry)
});
// 返回: [{ warehouseCode, truckingCompanyCode, priority }]
```

### Step 3: 检查车队能力
```typescript
const truckingCompany = await getTruckingCompany(mapping.truckingCompanyCode);

// 能力检查
if (truckingCompany.dailyCapacity <= currentBookings) {
  skipThisCompany();  // 已达容量上限
}

if (!truckingCompany.hasYard && mode === 'Drop') {
  skipThisCompany();  // 无堆场不支持Drop模式
}
```

### Step 4: 检查仓库能力
```typescript
const warehouse = await getWarehouse(mapping.warehouseCode);

// 容量检查
if (warehouse.dailyUnloadCapacity <= scheduledUnloads) {
  skipThisWarehouse();  // 已达卸柜容量
}

// 物业类型检查
if (warehouse.propertyType === '3PL' && requiresSelfWarehouse) {
  skipThisWarehouse();  // 需要自营仓库
}
```

### Step 5: ETA约束
```typescript
const eta = container.etaDestPort;
const minPickupDate = addDays(eta, 2);  // 到港后至少2天才能提柜

if (plannedPickupDate < minPickupDate) {
  adjustPickupDate(minPickupDate);
}
```

### Step 6: 成本计算与排序
```typescript
const options = mappings.map(mapping => ({
  ...mapping,
  cost: calculateCost({
    truckingFee: getTruckingFee(mapping.truckingCompanyCode),
    warehouseFee: getWarehouseFee(mapping.warehouseCode),
    distance: calculateDistance(port, mapping.warehouseCode)
  })
}));

// 按成本升序排序
options.sort((a, b) => a.cost - b.cost);

// 选择最优方案
const bestOption = options.find(opt => 
  hasAvailableCapacity(opt.truckingCompanyCode) &&
  hasAvailableCapacity(opt.warehouseCode)
);
```

---

## 映射表结构

### dict_warehouse_trucking_mapping
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| country_code | VARCHAR | 国家代码（如'CA'） |
| warehouse_code | VARCHAR | 仓库代码 |
| trucking_company_code | VARCHAR | 车队代码 |
| priority | INT | 优先级（数字越小越优先） |
| is_active | BOOLEAN | 是否启用 |

### dict_trucking_port_mapping
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| port_code | VARCHAR | 港口代码（如'LAX'） |
| trucking_company_code | VARCHAR | 车队代码 |
| estimated_hours | INT | 预计运输时长（小时） |

---

## Drop vs Live 模式

### Drop Off模式
**适用条件**：
- 车队`has_yard = true`（有堆场）
- 提柜日 ≠ 送仓日

**流程**：
```
Day 1: 提柜 → 暂存堆场
Day 2: 从堆场送仓 → 卸柜
```

**优势**：灵活调度，避免司机等待

### Live模式
**适用条件**：
- 车队`has_yard = false`（无堆场）
- 提柜日 = 送仓日 = 卸柜日

**流程**：
```
Day 1: 提柜 → 直接送仓 → 卸柜（同日完成）
```

**劣势**：司机需等待卸柜，效率低

---

## 缺省规则

### 清关行/车队/仓库缺省
当某国家无映射记录时，使用默认命名：
```typescript
const defaultBroker = `${countryNameCn}清关行`;
const defaultTrucking = `${countryNameCn}车队`;
const defaultWarehouse = `${countryNameCn}仓库`;
```

**示例**：
- 销往英国但无英国映射 → 使用「英国清关行」「英国车队」「英国仓库」

### customer_code 空值处理
```typescript
if (!replenishmentOrder.customerCode) {
  replenishmentOrder.customerCode = replenishmentOrder.sellToCountry;
}
```

### last_free_date / last_return_date 补全
当这些字段为空时，按业务规则自动计算：
```typescript
if (!portOp.lastFreeDate && portOp.ataDestPort) {
  const freeDays = getFreeDays(container.shippingCompany);
  portOp.lastFreeDate = addDays(portOp.ataDestPort, freeDays);
}
```

---

## 排柜引擎调用时机

### 自动触发
```typescript
// 备货单创建后自动排柜
async function createReplenishmentOrder(order: ReplenishmentOrder) {
  await saveOrder(order);
  
  // 触发智能排柜
  await IntelligentSchedulingService.schedule(order.containerNumber);
}
```

### 手动触发
```typescript
// 用户点击"重新排柜"按钮
async function reschedule(containerNumber: string) {
  await IntelligentSchedulingService.reschedule(containerNumber);
}
```

### 定时任务
```typescript
// 每日凌晨重新优化未锁定排柜
@Cron('0 2 * * *')
async function dailyOptimization() {
  const unlockedContainers = await getUnlockedContainers();
  
  for (const container of unlockedContainers) {
    await IntelligentSchedulingService.optimize(container.containerNumber);
  }
}
```

---

## 常见问题

### Q1: 为什么选择了高成本仓库？
**A**: 检查dict_warehouse_trucking_mapping的priority字段，可能低成本仓库已满容量。

### Q2: 如何强制指定某个仓库？
**A**: 在映射表中提高该仓库的priority（数字越小越优先），或手动排柜覆盖。

### Q3: Drop模式失败怎么办？
**A**: 检查车队`has_yard`字段是否为true，以及堆场容量是否充足。

---

## 参考实现

- 排柜服务：`backend/src/services/intelligent-scheduling.service.ts`
- 映射实体：`backend/src/entities/warehouse-trucking-mapping.entity.ts`
- 前端界面：`frontend/src/views/scheduling/IntelligentScheduling.vue`

---

**维护者**: LogiX Team  
**最后更新**: 2026-06-23
