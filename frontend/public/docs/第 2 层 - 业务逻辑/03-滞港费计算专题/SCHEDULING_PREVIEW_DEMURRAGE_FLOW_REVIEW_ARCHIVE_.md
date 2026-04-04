# 排产预览中滞港费计算调用流程与问题评审

## 目录

- [1. 概述](#1-概述)
- [2. 调用流程图](#2-调用流程图)
- [3. 核心组件职责](#3-核心组件职责)
- [4. 详细调用流程](#4-详细调用流程)
- [5. 关键代码分析](#5-关键代码分析)
- [6. 发现的问题与风险](#6-发现的问题与风险)
- [7. 改进建议](#7-改进建议)
- [8. 行动清单](#8-行动清单)

---

## 1. 概述

### 1.1 业务背景

排产预览功能允许用户在确认排产计划前，预览不同卸柜方案的成本对比，其中**滞港费计算**是成本评估的核心组成部分。系统需要根据用户选择的仓库、车队、卸柜模式（Direct/Drop off/Expedited）和计划日期，准确预估滞港费、滞箱费、堆存费等各项费用。

### 1.2 文档目标

- ✅ 梳理从排产预览 UI → 后端成本计算 → 滞港费计算的完整调用链
- ✅ 识别当前实现中的问题和潜在风险
- ✅ 提出改进建议和修复方案
- ✅ 建立权威数据源和计算逻辑的统一规范

### 1.3 涉及的核心服务

| 服务 | 文件路径 | 职责 |
|------|----------|------|
| **SchedulingPreviewModal** | `frontend/src/views/scheduling/components/SchedulingPreviewModal.vue` | 排产预览弹窗（前端主导组件） |
| **IntelligentSchedulingService** | `backend/src/services/intelligentScheduling.service.ts` | 智能排柜服务（生成计划日期） |
| **SchedulingCostOptimizerService** | `backend/src/services/schedulingCostOptimizer.service.ts` | 成本优化服务（评估方案成本） |
| **DemurrageService** | `backend/src/services/demurrage.service.ts` | 滞港费计算服务（权威计算引擎） |

---

## 2. 调用流程图

### 2.1 高层架构

```
┌─────────────────────────────────────────────────────────────┐
│                    前端展示层 (Frontend)                     │
│  SchedulingPreviewModal.vue                                  │
│  ├─ 显示预估费用表格                                         │
│  └─ 调用 /api/v1/scheduling/preview                         │
└─────────────────────────────────────────────────────────────┘
                              ↓ HTTP POST
┌─────────────────────────────────────────────────────────────┐
│                   后端控制器层 (Controller)                  │
│  SchedulingController.previewScheduling()                    │
│  ├─ 参数校验                                                 │
│  └─ 调用 IntelligentSchedulingService                       │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                 智能排柜服务 (IntelligentScheduling)         │
│  generatePreviewPlans()                                      │
│  ├─ 遍历每个货柜                                             │
│  ├─ 调用 calculateEstimatedCostsForContainer()              │
│  └─ 调用 DemurrageService.calculateTotalCost()             │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                  滞港费计算服务 (Demurrage)                  │
│  calculateTotalCost(containerNumber, options)                │
│  ├─ 调用 calculateForContainer() 获取权威免费期             │
│  ├─ 匹配收费标准                                             │
│  ├─ 按 forecast 模式计算各项费用                             │
│  └─ 返回 { demurrageCost, detentionCost, storageCost, ... } │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 详细时序图

```
用户操作：选择仓库/车队 → 点击"预览排产"
    ↓
[SchedulingPreviewModal]
    ↓ POST /api/v1/scheduling/preview
    ↓
[SchedulingController.previewScheduling()]
    ↓
[IntelligentSchedulingService.generatePreviewPlans()]
    │
    ├─ for each container:
    │   │
    │   ├─ 1. 根据仓库 + 车队 + 卸柜模式生成计划日期
    │   │   plannedPickupDate = baseDate
    │   │   plannedUnloadDate = strategy === 'Drop off' ? baseDate + 1 : baseDate
    │   │   plannedReturnDate = plannedUnloadDate + returnWindow
    │   │
    │   ├─ 2. 调用 calculateEstimatedCostsForContainer()
    │   │   ↓
    │   │   [IntelligentSchedulingService.calculateEstimatedCostsForContainer()]
    │   │   │
    │   │   ├─ 调用 DemurrageService.calculateTotalCost()
    │   │   │   ↓
    │   │   │   [DemurrageService.calculateTotalCost()]
    │   │   │   │
    │   │   │   ├─ ① 调用 calculateForContainer(forecast 模式)
    │   │   │   │   ↓
    │   │   │   │   [DemurrageService.calculateForContainer()]
    │   │   │   │   ├─ 获取物流状态机快照
    │   │   │   │   ├─ 匹配收费标准 (matchStandards)
    │   │   │   │   ├─ 计算最晚提柜日/还箱日
    │   │   │   │   └─ 逐项计算费用 (calculateSingleDemurrage)
    │   │   │   │       ├─ 滞港费项
    │   │   │   │       ├─ 滞箱费项
    │   │   │   │       ├─ 堆存费项
    │   │   │   │       └─ D&D 合并项
    │   │   │   │
    │   │   │   ├─ ② 过滤 items 按 chargeTypeCode
    │   │   │   ├─ ③ 汇总各项费用
    │   │   │   └─ ④ 计算运输费（距离 × 费率）
    │   │   │
    │   │   └─ 返回 { demurrageCost, detentionCost, storageCost, transportationCost, totalCost }
    │   │
    │   └─ 3. 组装预览结果
    │       {
    │         containerNumber,
    │         plannedData: { plannedPickupDate, plannedUnloadDate, plannedReturnDate },
    │         estimatedCosts: { demurrageCost, detentionCost, ... }
    │       }
    │
    └─ 返回所有货柜的预览结果数组
```

---

## 3. 核心组件职责

### 3.1 前端组件

#### 3.1.1 `SchedulingPreviewModal.vue`

**位置**: `frontend/src/views/scheduling/components/SchedulingPreviewModal.vue`

**职责**:
- 展示排产预览结果表格
- 显示各项预估费用（滞港费、滞箱费、堆存费、运输费等）
- 提供智能成本优化入口
- 用户确认/取消排产计划

**关键数据结构**:

```typescript
interface PreviewResult {
  containerNumber: string
  plannedData?: {
    plannedPickupDate?: string
    plannedDeliveryDate?: string
    plannedUnloadDate?: string
    plannedReturnDate?: string
    warehouseId?: string
    warehouseName?: string
    warehouseCountry?: string
    truckingCompanyId?: string
    unloadMode?: 'Drop off' | 'Live load'
  }
  estimatedCosts?: {
    demurrageCost?: number
    detentionCost?: number
    storageCost?: number
    yardStorageCost?: number
    transportationCost?: number
    handlingCost?: number
    totalCost?: number
    currency?: string
  }
}
```

**费用展示逻辑**:

```vue
<el-table-column prop="estimatedCosts.demurrageCost" label="滞港费">
  <template #default="{ row }">
    <span v-if="row.estimatedCosts?.demurrageCost" 
          :class="getAmountClass(row.estimatedCosts.demurrageCost)">
      {{ formatCurrency(row.estimatedCosts.demurrageCost, row.plannedData?.warehouseCountry || 'US') }}
    </span>
    <span v-else>-</span>
  </template>
</el-table-column>
```

**费用分级规则**:

```typescript
const getAmountClass = (amount: number): string => {
  if (amount === 0) return 'amount-zero'     // 绿色：无费用
  if (amount <= 100) return 'amount-low'     // 黄色：低费用
  if (amount <= 500) return 'amount-medium'  // 橙色：中等费用
  if (amount <= 1000) return 'amount-high'   // 红色：高费用
  return 'amount-critical'                   // 深红：严重警告（> $1000）
}
```

### 3.2 后端服务

#### 3.2.1 `IntelligentSchedulingService`

**位置**: `backend/src/services/intelligentScheduling.service.ts`

**关键方法**: `calculateEstimatedCostsForContainer()`

**职责**:
- 根据仓库、车队、卸柜模式生成计划日期
- 调用 `DemurrageService.calculateTotalCost()` 计算预估费用
- 处理 Drop off 模式下的外部堆场费用计算

**代码示例**:

```typescript
async calculateEstimatedCostsForContainer(
  containerNumber: string,
  plannedPickupDate: Date,
  plannedUnloadDate: Date,
  plannedReturnDate: Date,
  unloadMode: string,
  warehouse: Warehouse,
  truckingCompany: TruckingCompany
): Promise<{
  demurrageCost?: number;
  detentionCost?: number;
  storageCost?: number;
  ddCombinedCost?: number;
  transportationCost?: number;
  yardStorageCost?: number;
  handlingCost?: number;
  totalCost?: number;
  currency?: string;
}> {
  // 使用统一的 calculateTotalCost 方法计算所有 D&D 费用和运输费
  const totalCostResult = await this.demurrageService.calculateTotalCost(containerNumber, {
    mode: 'forecast',
    plannedDates: {
      plannedPickupDate,
      plannedUnloadDate,
      plannedReturnDate
    },
    includeTransport: true,
    warehouse,
    truckingCompany,
    unloadMode
  });
  
  // 计算外部堆场堆存费（仅在 Drop off 模式、车队有堆场且实际使用时）
  let yardStorageCost = 0;
  if (unloadMode === 'Drop off' && truckingCompany.hasYard) {
    // 判断是否实际使用了堆场：提柜日 < 送仓日
    const plannedDeliveryDate = plannedUnloadDate; // Drop off: 送 = 卸
    if (plannedPickupDate.toISOString().split('T')[0] !== plannedDeliveryDate.toISOString().split('T')[0]) {
      // 计算堆场费用
      const yardStorageDays = dateTimeUtils.daysBetween(plannedPickupDate, plannedDeliveryDate);
      // ... 从 TruckingPortMapping 获取费率并计算
    }
  }
  
  return {
    demurrageCost: totalCostResult.demurrageCost,
    detentionCost: totalCostResult.detentionCost,
    storageCost: totalCostResult.storageCost,
    transportationCost: totalCostResult.transportationCost,
    yardStorageCost,
    totalCost: totalCostResult.totalCost,
    currency: totalCostResult.currency
  };
}
```

#### 3.2.2 `DemurrageService.calculateTotalCost()`

**位置**: `backend/src/services/demurrage.service.ts`

**职责**:
- 统一计算所有 D&D 相关费用（滞港费、滞箱费、堆存费、D&D 合并）
- 支持 actual/forecast 两种计算模式
- 支持传入计划日期（用于预测场景）

**入参**:

```typescript
interface CalculateTotalCostOptions {
  mode: 'actual' | 'forecast';
  plannedDates?: {
    plannedPickupDate: Date;
    plannedUnloadDate: Date;
    plannedReturnDate: Date;
  };
  includeTransport?: boolean;
  warehouse?: Warehouse;
  truckingCompany?: TruckingCompany;
  unloadMode?: 'Drop off' | 'Live load';
}
```

**计算步骤**:

1. **调用 `calculateForContainer()`** 获取权威免费期截止日
2. **匹配收费标准** (`matchStandards()`)
3. **逐项计算费用** (`calculateSingleDemurrage()`)
4. **分类汇总** (按 `chargeTypeCode` 过滤)
5. **计算运输费** (距离 × 费率)

**返回结构**:

```typescript
{
  demurrageCost: number;      // 滞港费
  detentionCost: number;      // 滞箱费
  storageCost: number;        // 堆存费
  ddCombinedCost: number;     // D&D 合并费用
  transportationCost: number; // 运输费
  totalCost: number;          // 总费用
  currency: string;           // 币种
  items: Array<{              // 费用明细
    chargeTypeCode: string;
    chargeName: string;
    freeDays: number;
    chargeDays: number;
    amount: number;
    tierBreakdown: [...]
  }>;
}
```

#### 3.2.3 `SchedulingCostOptimizerService`

**位置**: `backend/src/services/schedulingCostOptimizer.service.ts`

**职责**:
- 评估不同卸柜方案的总成本
- 生成最优方案建议
- 批量优化成本

**关键方法**: `evaluateTotalCost()`

```typescript
async evaluateTotalCost(option: UnloadOption): Promise<CostBreakdown> {
  const breakdown: CostBreakdown = {
    demurrageCost: 0,
    detentionCost: 0,
    storageCost: 0,
    yardStorageCost: 0,
    transportationCost: 0,
    handlingCost: 0,
    totalCost: 0
  };
  
  // 1. 推导卸柜日期
  const actualPlannedUnloadDate = option.plannedUnloadDate ?? option.plannedPickupDate;
  
  // 2. 计算预计还箱日
  const estimatedReturnDate = this.estimateReturnDate(
    actualPlannedUnloadDate,
    option.strategy,
    option.warehouse
  );
  
  // 3. 调用 DemurrageService.calculateTotalCost()
  const totalCostResult = await this.demurrageService.calculateTotalCost(
    option.containerNumber,
    {
      mode: 'forecast',
      plannedDates: {
        plannedPickupDate: option.plannedPickupDate,
        plannedUnloadDate: actualPlannedUnloadDate,
        plannedReturnDate: estimatedReturnDate
      },
      includeTransport: true,
      warehouse: option.warehouse,
      truckingCompany: option.truckingCompany,
      unloadMode: option.strategy === 'Drop off' ? 'Drop off' : 'Live load'
    }
  );
  
  // 4. 填充费用明细
  breakdown.demurrageCost = totalCostResult.demurrageCost;
  breakdown.detentionCost = totalCostResult.detentionCost;
  breakdown.storageCost = totalCostResult.storageCost;
  breakdown.transportationCost = totalCostResult.transportationCost;
  
  // 5. 计算外部堆场费用（Drop off 模式专属）
  if (option.strategy === 'Drop off' && option.truckingCompany?.hasYard) {
    // 判断是否实际使用堆场：提柜日 < 送仓日
    if (pickupDayStr !== deliveryDayStr) {
      const yardStorageDays = dateTimeUtils.daysBetween(
        option.plannedPickupDate,
        actualPlannedUnloadDate
      );
      // 从 TruckingPortMapping 获取费率并计算
      breakdown.yardStorageCost = standardRate * yardStorageDays + operationFee;
    }
  }
  
  breakdown.totalCost =
    breakdown.demurrageCost +
    breakdown.detentionCost +
    breakdown.storageCost +
    breakdown.yardStorageCost +
    breakdown.transportationCost +
    breakdown.handlingCost;
  
  return breakdown;
}
```

---

## 4. 详细调用流程

### 4.1 排产预览生成流程

#### 步骤 1: 前端发起预览请求

```typescript
// SchedulingPreviewModal.vue
const handlePreview = async () => {
  try {
    const response = await apiClient.post('/scheduling/preview', {
      containers: selectedContainers.value,
      warehouseId: selectedWarehouse.value,
      truckingCompanyId: selectedTruckingCompany.value,
      baseDate: selectedBaseDate.value
    });
    
    previewResults.value = response.data.data.results;
  } catch (error) {
    ElMessage.error('预览失败：' + error.message);
  }
};
```

#### 步骤 2: 后端控制器接收请求

```typescript
// scheduling.controller.ts
@Post('/preview')
async previewScheduling(@Body() req: Request, @Res() res: Response) {
  const { containers, warehouseId, truckingCompanyId, baseDate } = req.body;
  
  // 1. 获取仓库和车队信息
  const warehouse = await this.warehouseRepo.findOne({ where: { id: warehouseId } });
  const truckingCompany = await this.truckingCompanyRepo.findOne({ 
    where: { id: truckingCompanyId } 
  });
  
  // 2. 生成预览计划
  const results = await this.intelligentSchedulingService.generatePreviewPlans(
    containers,
    warehouse,
    truckingCompany,
    new Date(baseDate)
  );
  
  res.json({ success: true, data: { results } });
}
```

#### 步骤 3: 智能排柜服务生成计划

```typescript
// intelligentScheduling.service.ts
async generatePreviewPlans(
  containerNumbers: string[],
  warehouse: Warehouse,
  truckingCompany: TruckingCompany,
  baseDate: Date
): Promise<PreviewResult[]> {
  const results: PreviewResult[] = [];
  
  for (const containerNumber of containerNumbers) {
    // 1. 生成基础提柜日（排除周末）
    const plannedPickupDate = this.adjustToNextWorkingDay(baseDate);
    
    // 2. 根据卸柜模式推导卸柜日和还箱日
    const strategy = truckingCompany.hasYard ? 'Drop off' : 'Direct';
    const plannedUnloadDate = strategy === 'Drop off' 
      ? dateTimeUtils.addDays(plannedPickupDate, 1) 
      : plannedPickupDate;
    const plannedReturnDate = this.estimateReturnDate(
      plannedUnloadDate,
      strategy,
      warehouse
    );
    
    // 3. 计算预估费用
    const estimatedCosts = await this.calculateEstimatedCostsForContainer(
      containerNumber,
      plannedPickupDate,
      plannedUnloadDate,
      plannedReturnDate,
      strategy === 'Drop off' ? 'Drop off' : 'Live load',
      warehouse,
      truckingCompany
    );
    
    results.push({
      containerNumber,
      plannedData: {
        plannedPickupDate: plannedPickupDate.toISOString(),
        plannedUnloadDate: plannedUnloadDate.toISOString(),
        plannedReturnDate: plannedReturnDate.toISOString(),
        warehouseId: warehouse.id,
        warehouseName: warehouse.name,
        warehouseCountry: warehouse.country,
        truckingCompanyId: truckingCompany.id,
        unloadMode: strategy === 'Drop off' ? 'Drop off' : 'Live load'
      },
      estimatedCosts
    });
  }
  
  return results;
}
```

#### 步骤 4: 滞港费计算服务计算费用

```typescript
// demurrage.service.ts - calculateTotalCost()
async calculateTotalCost(
  containerNumber: string,
  options: CalculateTotalCostOptions
): Promise<{
  demurrageCost: number;
  detentionCost: number;
  storageCost: number;
  ddCombinedCost: number;
  transportationCost: number;
  totalCost: number;
  currency: string;
  items: DemurrageItemResult[];
}> {
  // 1. 调用 calculateForContainer 获取权威数据
  const result = await this.calculateForContainer(containerNumber);
  if (!result.result) {
    return { demurrageCost: 0, detentionCost: 0, storageCost: 0, ddCombinedCost: 0, transportationCost: 0, totalCost: 0, currency: 'USD', items: [] };
  }
  
  // 2. 使用传入的计划日期覆盖（forecast 模式）
  const params = {
    ...result.params,
    calculationDates: {
      ...result.params.calculationDates,
      plannedPickupDate: options.plannedDates?.plannedPickupDate,
      plannedReturnDate: options.plannedDates?.plannedReturnDate
    }
  };
  
  // 3. 重新计算各项费用
  const items: DemurrageItemResult[] = [];
  let totalAmount = 0;
  
  for (const standard of result.matchedStandards) {
    // 判断费用类型
    const isDetention = isDetentionCharge(standard);
    const isCombined = isCombinedDemurrageDetention(standard);
    const isStorage = isStorageCharge(standard);
    
    // 确定计算区间
    let rangeStart: Date;
    let rangeEnd: Date;
    
    if (isDetention) {
      // 滞箱费：提柜 → 还箱
      rangeStart = options.plannedDates!.plannedPickupDate;
      rangeEnd = options.plannedDates!.plannedReturnDate;
    } else if (isCombined) {
      // D&D 合并：到港/ETA → 还箱
      rangeStart = result.params.calculationDates.ataDestPort ?? 
                   result.params.calculationDates.etaDestPort;
      rangeEnd = options.plannedDates!.plannedReturnDate;
    } else if (isStorage) {
      // 堆存费：到港/ETA → 提柜
      rangeStart = result.params.calculationDates.ataDestPort ?? 
                   result.params.calculationDates.etaDestPort;
      rangeEnd = options.plannedDates!.plannedPickupDate;
    } else {
      // 纯滞港费：到港/ETA → 提柜
      rangeStart = result.params.calculationDates.ataDestPort ?? 
                   result.params.calculationDates.etaDestPort;
      rangeEnd = options.plannedDates!.plannedPickupDate;
    }
    
    // 调用 calculateSingleDemurrage 计算单项费用
    const { lastFreeDate, chargeDays, totalAmount: amount, tierBreakdown } = 
      calculateSingleDemurrage(
        rangeStart,
        rangeEnd,
        standard.freeDays,
        Number(standard.ratePerDay),
        normalizeTiers(standard.tiers),
        standard.currency || 'USD',
        standard.freeDaysBasis
      );
    
    items.push({
      standardId: standard.id,
      chargeName: standard.chargeName,
      chargeTypeCode: standard.chargeTypeCode,
      freeDays: standard.freeDays,
      startDate: rangeStart,
      endDate: rangeEnd,
      lastFreeDate,
      chargeDays,
      amount,
      currency: standard.currency || 'USD',
      tierBreakdown
    });
    
    totalAmount += amount;
  }
  
  // 4. 分类汇总
  const demurrageItems = items.filter(i => !isDetentionChargeByTypeCode(i.chargeTypeCode));
  const detentionItems = items.filter(i => isDetentionChargeByTypeCode(i.chargeTypeCode));
  
  const demurrageCost = demurrageItems.reduce((sum, i) => sum + i.amount, 0);
  const detentionCost = detentionItems.reduce((sum, i) => sum + i.amount, 0);
  const storageCost = items.filter(i => isStorageChargeByTypeCode(i.chargeTypeCode))
    .reduce((sum, i) => sum + i.amount, 0);
  const ddCombinedCost = items.filter(i => isCombinedDemurrageDetentionByTypeCode(i.chargeTypeCode))
    .reduce((sum, i) => sum + i.amount, 0);
  
  // 5. 计算运输费
  let transportationCost = 0;
  if (options.includeTransport && options.warehouse && options.truckingCompany) {
    transportationCost = this.calculateTransportationCost(
      result.params.destinationPortCode,
      options.warehouse,
      options.truckingCompany
    );
  }
  
  return {
    demurrageCost,
    detentionCost,
    storageCost,
    ddCombinedCost,
    transportationCost,
    totalCost: demurrageCost + detentionCost + storageCost + ddCombinedCost + transportationCost,
    currency: result.currency || 'USD',
    items
  };
}
```

---

## 5. 关键代码分析

### 5.1 权威数据源获取

**问题**: 排产预览中使用的是预测日期，但免费期应该基于数据库中的实际数据

**当前实现**:

```typescript
// DemurrageService.calculateTotalCost()
const result = await this.calculateForContainer(containerNumber);
if (!result.result) {
  return { /* 零值 */ };
}

// 使用传入的计划日期覆盖
const params = {
  ...result.params,
  calculationDates: {
    ...result.params.calculationDates,
    plannedPickupDate: options.plannedDates?.plannedPickupDate,
    plannedReturnDate: options.plannedDates?.plannedReturnDate
  }
};
```

**优点**:
- ✅ 免费期从 `process_port_operations.last_free_date` 获取，保证准确性
- ✅ 收费标准匹配基于实际的目的地港口、船公司、客户等信息
- ✅ 阶梯费率配置来自数据库，不是硬编码

**缺点**:
- ❌ `calculateForContainer()` 会执行完整的计算流程，包括写回免费期（虽然有控制）
- ❌ 在预览场景下，只需要免费期和标准匹配，不需要完整计算
- ⚠️ 性能开销较大

### 5.2 计算模式切换

**规则**: 排产预览统一使用 `forecast` 模式

```typescript
const totalCostResult = await this.demurrageService.calculateTotalCost(containerNumber, {
  mode: 'forecast',  // ← 固定为 forecast
  plannedDates: { ... },
  // ...
});
```

**原因**:
- 排产预览面向未来，使用的是计划日期
- 即使货柜已经到港，预览时也应该用预测逻辑
- 避免因为实际日期缺失导致计算失败

**潜在问题**:
- ⚠️ 如果货柜已经实际到港，`forecast` 模式和 `actual` 模式的起算日可能不同
  - `forecast`: 使用 ETA/修正 ETA
  - `actual`: 使用 ATA/卸船日
- ⚠️ 可能导致预览费用与实际费用不一致

### 5.3 外部堆场费用计算

**场景**: Drop off 模式下，如果车队有堆场且提柜日 < 送仓日，产生堆场费用

**计算逻辑**:

```typescript
if (unloadMode === 'Drop off' && truckingCompany.hasYard) {
  const plannedDeliveryDate = plannedUnloadDate; // Drop off: 送 = 卸
  
  // 判断是否实际使用堆场
  if (plannedPickupDate.toISOString().split('T')[0] !== plannedDeliveryDate.toISOString().split('T')[0]) {
    // 计算堆场存放天数
    const yardStorageDays = dateTimeUtils.daysBetween(plannedPickupDate, plannedDeliveryDate);
    
    // 从 TruckingPortMapping 获取费率
    const truckingPortMapping = await this.truckingPortMappingRepo.findOne({
      where: { country, portCode, truckingCompanyId, isActive: true }
    });
    
    if (truckingPortMapping) {
      yardStorageCost = (truckingPortMapping.standardRate || 0) * yardStorageDays +
                        (truckingPortMapping.yardOperationFee || 0);
    }
  }
}
```

**问题点**:
1. ⚠️ 送仓日计算假设：Drop off 模式下 送仓日 = 卸柜日，但实际可能不同
2. ⚠️ 堆场费率依赖 `TruckingPortMapping`，但该表可能缺少数据
3. ⚠️ 没有考虑堆场的容量限制和可用性

---

## 6. 发现的问题与风险

### 6.1 数据一致性问题

#### 问题 1: 免费期数据源不统一

**现象**: 
- `SchedulingCostOptimizerService` 尝试从多个来源获取免费期
- 优先使用 `demurrageResult.calculationDates.lastPickupDateComputed`
- 其次使用传入的 `lastFreeDate` 参数
- 最后使用默认值 `basePickupDate + 7`

**代码**:

```typescript
let effectiveLastFreeDate: Date;
if (demurrageResult.result?.calculationDates?.lastPickupDateComputed) {
  effectiveLastFreeDate = new Date(demurrageResult.result.calculationDates.lastPickupDateComputed);
} else if (lastFreeDate) {
  effectiveLastFreeDate = lastFreeDate;
} else {
  effectiveLastFreeDate = dateTimeUtils.addDays(basePickupDate, 7);
}
```

**风险**:
- ❌ 违反了 **Single Source of Truth** 原则
- ❌ 默认值 `+7` 可能与实际配置的免费天数不符
- ❌ 不同场景可能使用不同的免费期，导致费用计算不一致

**影响**:
- 成本优化建议可能基于错误的免费期
- 用户看到的预估费用与实际费用差异较大
- 降低用户对系统的信任度

**解决方案**:
```typescript
// ✅ 强制从 DemurrageService 获取权威数据
const demurrageResult = await this.demurrageService.calculateForContainer(containerNumber);
const effectiveLastFreeDate = demurrageResult.result?.calculationDates?.lastPickupDateComputed 
  ? new Date(demurrageResult.result.calculationDates.lastPickupDateComputed)
  : null;

if (!effectiveLastFreeDate) {
  logger.warn(`[CostOptimizer] No lastFreeDate available for ${containerNumber}`);
  // 可以选择抛出异常或使用保守估计
}
```

#### 问题 2: 货币配置不一致

**现象**:
- 排产预览中使用的货币来自 `DemurrageService` 返回结果
- 但 `DemurrageService` 的货币优先级为：
  1. 收费标准配置的 `currency`
  2. 销往国家对应的货币
  3. USD 兜底

**风险**:
- ⚠️ 如果收费标准未配置货币，可能使用 USD，而实际应为销往国货币（如 GBP）
- ⚠️ 前端展示时没有明确的货币提示，用户可能误解

**历史案例**: 见 memory: `滞港费货币配置错误：系统性数据配置错误的批量修复`

**解决方案**:
1. 在 `ext_demurrage_standards` 表中强制要求配置 `currency` 字段
2. 前端展示时明确显示币种符号（$、£、€等）
3. 添加货币一致性检查脚本

### 6.2 性能问题

#### 问题 1: 批量预览时的重复计算

**场景**: 批量预览 100 个货柜的排产计划

**当前实现**:

```typescript
for (const containerNumber of containerNumbers) {
  // 每个货柜都调用一次 calculateForContainer()
  const estimatedCosts = await this.calculateEstimatedCostsForContainer(
    containerNumber,
    plannedPickupDate,
    plannedUnloadDate,
    plannedReturnDate,
    unloadMode,
    warehouse,
    truckingCompany
  );
}
```

**问题**:
- ❌ 每个货柜独立调用 `calculateForContainer()`
- ❌ 每次调用都会查询数据库获取收费标准
- ❌ 没有利用缓存机制

**性能数据**:
- 单次 `calculateForContainer()` 耗时：~200ms
- 100 个货柜总耗时：~20 秒
- 数据库查询次数：100+ 次

**优化建议**:

```typescript
// ✅ 批量获取免费期和收费标准
const demurrageResults = await Promise.all(
  containerNumbers.map(cn => this.demurrageService.calculateForContainer(cn))
);

// ✅ 使用缓存减少数据库查询
const allStandards = await this.demurrageService.getAllActiveStandards(); // 带缓存
```

#### 问题 2: 外部堆场费用的 N+1 查询

**代码**:

```typescript
for (const option of options) {
  if (option.strategy === 'Drop off' && option.truckingCompany.hasYard) {
    // 每个选项都查询一次 TruckingPortMapping
    const truckingPortMapping = await this.truckingPortMappingRepo.findOne({
      where: { country, portCode, truckingCompanyId }
    });
    // 计算堆场费用...
  }
}
```

**优化方案**:

```typescript
// ✅ 提前批量加载所有需要的 TruckingPortMapping
const mappings = await this.truckingPortMappingRepo.find({
  where: { country: In(countries), portCode: In(portCodes), truckingCompanyId: In(companyIds) }
});
const mappingMap = new Map(mappings.map(m => [`${m.country}-${m.portCode}-${m.truckingCompanyId}`, m]));

// 在循环中直接使用
const key = `${country}-${portCode}-${truckingCompanyId}`;
const mapping = mappingMap.get(key);
```

### 6.3 业务逻辑缺陷

#### 问题 1: 送仓日计算假设不合理

**当前逻辑**:

```typescript
// Drop off 模式下，送仓日 = 卸柜日
const plannedDeliveryDate = plannedUnloadDate;
```

**问题**:
- ❌ 忽略了仓库的工作时间和预约机制
- ❌ 未考虑仓库排队等待时间
- ❌ 可能导致堆场费用计算不准确

**改进建议**:

```typescript
// ✅ 考虑仓库可用性和预约机制
const plannedDeliveryDate = this.calculateEarliestDeliveryDate(
  plannedUnloadDate,
  warehouse,
  truckingCompany
);

private calculateEarliestDeliveryDate(
  unloadDate: Date,
  warehouse: Warehouse,
  truckingCompany: TruckingCompany
): Date {
  // 1. 检查卸柜日是否为工作日
  if (!this.isBusinessDay(unloadDate)) {
    unloadDate = this.nextBusinessDay(unloadDate);
  }
  
  // 2. 检查仓库当天是否有可用预约槽位
  const occupancy = await this.warehouseOccupancyRepo.findOne({
    where: { warehouseId: warehouse.id, date: unloadDate }
  });
  
  if (occupancy && occupancy.usedSlots >= warehouse.dailyCapacity) {
    // 仓库已满，顺延到下一天
    unloadDate = this.nextAvailableDate(warehouse, unloadDate);
  }
  
  return unloadDate;
}
```

#### 问题 2: 未考虑周末和节假日

**场景**: 计划提柜日/卸柜日落在周末或节假日

**当前实现**:

```typescript
// 简单的日期调整
const plannedPickupDate = this.adjustToNextWorkingDay(baseDate);
```

**问题**:
- ❌ 只调整了提柜日，未调整卸柜日和还箱日
- ❌ 未考虑美国的联邦节假日
- ❌ 可能导致费用计算错误（周末提柜可能产生加急费）

**改进建议**:

```typescript
// ✅ 使用智能日历考虑周末 + 节假日 + 仓库可用性
const smartCalendar = smartCalendarCapacity(warehouse.country);

const plannedPickupDate = smartCalendar.getNextAvailableDate(
  baseDate,
  { excludeWeekends: true, excludeHolidays: true }
);

const plannedUnloadDate = smartCalendar.getNextAvailableDate(
  strategy === 'Drop off' ? dateTimeUtils.addDays(plannedPickupDate, 1) : plannedPickupDate,
  { excludeWeekends: true, excludeHolidays: true, warehouse }
);
```

### 6.4 用户体验问题

#### 问题 1: 费用分级阈值不合理

**当前阈值**:

```typescript
if (amount === 0) return 'amount-zero';     // 绿色
if (amount <= 100) return 'amount-low';     // 黄色
if (amount <= 500) return 'amount-medium';  // 橙色
if (amount <= 1000) return 'amount-high';   // 红色
return 'amount-critical';                   // 深红
```

**问题**:
- ❌ 固定阈值不适用于所有国家/货币
- ❌ 对于高成本港口（如 NY/NJ），$500 可能是正常水平
- ❌ 未考虑货柜体积/重量等因素

**改进建议**:

```typescript
// ✅ 基于百分位数的动态阈值
const getAmountClass = (amount: number, portCode: string): string => {
  const stats = getPortStatistics(portCode); // 从缓存获取该港口的费用统计
  
  if (amount === 0) return 'amount-zero';
  if (amount <= stats.p25) return 'amount-low';      // 低于 25% 分位
  if (amount <= stats.p50) return 'amount-medium';   // 25%-50% 分位
  if (amount <= stats.p75) return 'amount-high';     // 50%-75% 分位
  return 'amount-critical';                           // 高于 75% 分位
};
```

#### 问题 2: 缺少费用解释说明

**现状**: 用户看到费用数字，但不清楚费用产生的原因

**改进建议**: 添加 Tooltip 或展开详情

```vue
<el-table-column prop="estimatedCosts.demurrageCost" label="滞港费">
  <template #default="{ row }">
    <div class="cost-cell">
      <span :class="getAmountClass(row.estimatedCosts.demurrageCost)">
        {{ formatCurrency(row.estimatedCosts.demurrageCost, row.plannedData?.warehouseCountry) }}
      </span>
      
      <!-- ✅ 新增：费用说明 Tooltip -->
      <el-tooltip placement="top" effect="light">
        <template #content>
          <div class="cost-tooltip">
            <p><strong>滞港费</strong></p>
            <p>免费天数：{{ row.estimatedCosts.freeDays }} 天</p>
            <p>计费天数：{{ row.estimatedCosts.chargeDays }} 天</p>
            <p>费率：{{ row.estimatedCosts.ratePerDay }}/天</p>
            <p v-if="row.estimatedCosts.tierBreakdown">
              阶梯明细：{{ formatTierBreakdown(row.estimatedCosts.tierBreakdown) }}
            </p>
          </div>
        </template>
        <el-icon class="ml-2"><QuestionFilled /></el-icon>
      </el-tooltip>
    </div>
  </template>
</el-table-column>
```

---

## 7. 改进建议

### 7.1 架构优化

#### 建议 1: 引入滞港费计算中间层

**目标**: 解耦排产预览与滞港费计算的强耦合

**当前架构**:

```
IntelligentSchedulingService
  ↓ 直接调用
DemurrageService.calculateTotalCost()
  ↓ 内部调用
DemurrageService.calculateForContainer()
```

**优化后架构**:

```
IntelligentSchedulingService
  ↓ 调用
DemurrageForecastService (新增)
  ├─ 免费期缓存层
  ├─ 标准匹配缓存
  └─ 批量计算优化
      ↓ 调用
  DemurrageService.calculateSingleItem()
```

**优势**:
- ✅ 排产预览不需要完整的 `calculateForContainer()` 流程
- ✅ 可以批量获取免费期和收费标准
- ✅ 支持缓存和预计算

**实现示例**:

```typescript
// DemurrageForecastService.ts
export class DemurrageForecastService {
  constructor(
    private demurrageService: DemurrageService,
    private cacheService: CacheService
  ) {}
  
  /**
   * 批量获取免费期（带缓存）
   */
  async batchGetLastFreeDates(containerNumbers: string[]): Promise<Map<string, Date>> {
    const cacheKey = `demurrage:lastFreeDates:${containerNumbers.join(',')}`;
    
    let cached = await this.cacheService.get<Map<string, Date>>(cacheKey);
    if (cached) return cached;
    
    const results = await Promise.all(
      containerNumbers.map(cn => this.demurrageService.calculateForContainer(cn))
    );
    
    const lastFreeDates = new Map<string, Date>();
    results.forEach((result, index) => {
      if (result.result?.calculationDates?.lastPickupDateComputed) {
        lastFreeDates.set(
          containerNumbers[index],
          new Date(result.result.calculationDates.lastPickupDateComputed)
        );
      }
    });
    
    await this.cacheService.set(cacheKey, lastFreeDates, 3600); // 缓存 1 小时
    return lastFreeDates;
  }
  
  /**
   * 快速预测费用（不完整计算，仅用于预览）
   */
  async quickForecast(
    containerNumber: string,
    plannedDates: PlannedDates
  ): Promise<QuickForecastResult> {
    const lastFreeDate = await this.getLastFreeDate(containerNumber);
    const standards = await this.getMatchedStandards(containerNumber);
    
    // 简化计算逻辑，只计算主要费用项
    const demurrageCost = this.quickCalculateDemurrage(lastFreeDate, plannedDates.plannedPickupDate, standards);
    const detentionCost = this.quickCalculateDetention(plannedDates, standards);
    
    return { demurrageCost, detentionCost, totalCost: demurrageCost + detentionCost };
  }
}
```

#### 建议 2: 实现计算结果缓存

**策略**:

```typescript
// 缓存键设计
const cacheKeys = {
  demurrageStandards: `demurrage:standards:all`,           // 全量标准（24 小时）
  demurrageLastFreeDate: (cn: string) => `demurrage:lfd:${cn}`,  // 免费期（1 小时）
  demurrageForecast: (cn: string, dates: string) => `demurrage:fc:${cn}:${dates}` // 预测结果（10 分钟）
};

// 缓存 TTL 配置
const cacheTTL = {
  standards: 86400,      // 24 小时
  lastFreeDate: 3600,    // 1 小时
  forecast: 600          // 10 分钟
};
```

**实现示例**:

```typescript
async calculateEstimatedCostsForContainer(
  containerNumber: string,
  plannedPickupDate: Date,
  plannedUnloadDate: Date,
  plannedReturnDate: Date
): Promise<EstimatedCosts> {
  // 检查缓存
  const cacheKey = `demurrage:forecast:${containerNumber}:${plannedPickupDate.toISOString().split('T')[0]}`;
  const cached = await this.cacheService.get<EstimatedCosts>(cacheKey);
  if (cached) return cached;
  
  // 执行计算
  const costs = await this.demurrageService.calculateTotalCost(containerNumber, {
    mode: 'forecast',
    plannedDates: { plannedPickupDate, plannedUnloadDate, plannedReturnDate }
  });
  
  // 写入缓存
  await this.cacheService.set(cacheKey, costs, 600); // 10 分钟
  return costs;
}
```

### 7.2 数据质量提升

#### 建议 3: 添加数据验证层

**验证规则**:

```typescript
// 验证免费期数据的完整性
function validateLastFreeDate(containerNumber: string, lastFreeDate: Date | null): void {
  if (!lastFreeDate) {
    logger.warn(`[Validation] Missing lastFreeDate for ${containerNumber}`);
    // 触发数据补全任务
    triggerDataCompletionTask(containerNumber);
  }
  
  // 验证免费期是否合理（不能早于起算日）
  const startDate = getDemurrageStartDate(containerNumber);
  if (lastFreeDate < startDate) {
    logger.error(`[Validation] Invalid lastFreeDate for ${containerNumber}: ${lastFreeDate} < ${startDate}`);
    throw new Error('免费期不能早于起算日');
  }
}

// 验证收费标准的完整性
function validateStandards(containerNumber: string, standards: ExtDemurrageStandard[]): void {
  if (standards.length === 0) {
    logger.warn(`[Validation] No demurrage standards found for ${containerNumber}`);
    // 使用默认标准或触发告警
  }
  
  // 检查是否有配置货币
  const hasCurrency = standards.some(s => s.currency && s.currency.trim() !== '');
  if (!hasCurrency) {
    logger.error(`[Validation] No currency configured for standards of ${containerNumber}`);
    // 使用销往国货币或抛出警告
  }
}
```

#### 建议 4: 建立数据监控指标

**监控维度**:

```typescript
// 定义监控指标
interface DemurrageMetrics {
  // 计算成功率
  calculationSuccessRate: number;      // 目标 > 99%
  
  // 数据完整性
  lastFreeDateCoverage: number;        // 目标 100%
  standardMatchRate: number;           // 目标 > 95%
  currencyConfigRate: number;          // 目标 100%
  
  // 性能指标
  avgCalculationTime: number;          // 目标 < 100ms
  p95CalculationTime: number;          // 目标 < 500ms
  cacheHitRate: number;                // 目标 > 80%
  
  // 业务指标
  avgDemurrageCost: number;            // 平均滞港费
  zeroCostRate: number;                // 零费用比例
  highCostAlertCount: number;          // 高费用告警数
}

// 定期上报指标
function reportMetrics(metrics: DemurrageMetrics): void {
  metricsService.gauge('demurrage.success_rate', metrics.calculationSuccessRate);
  metricsService.gauge('demurrage.lfd_coverage', metrics.lastFreeDateCoverage);
  metricsService.histogram('demurrage.calculation_time', metrics.avgCalculationTime);
  // ...
}
```

### 7.3 用户体验优化

#### 建议 5: 增强费用可视化

**方案**: 添加费用趋势图和对比分析

```vue
<template>
  <div class="cost-analysis">
    <!-- 费用趋势图 -->
    <CostTrendChart 
      :alternatives="optimizationResult.allAlternatives"
      :highlight-free-period="true"
    />
    
    <!-- 费用对比卡片 -->
    <el-descriptions title="费用对比" :column="3">
      <el-descriptions-item label="原方案">
        <span :class="getAmountClass(originalCost.total)">
          {{ formatCurrency(originalCost.total) }}
        </span>
      </el-descriptions-item>
      <el-descriptions-item label="优化方案">
        <span :class="getAmountClass(optimizedCost.total)">
          {{ formatCurrency(optimizedCost.total) }}
        </span>
      </el-descriptions-item>
      <el-descriptions-item label="节省金额">
        <span class="text-green-600 font-bold">
          -{{ formatCurrency(savings.amount) }} ({{ savings.percentage }}%)
        </span>
      </el-descriptions-item>
    </el-descriptions>
    
    <!-- 费用明细展开 -->
    <el-collapse>
      <el-collapse-item title="查看费用明细">
        <CostBreakdownTable :breakdown="optimizedCost.breakdown" />
      </el-collapse-item>
    </el-collapse>
  </div>
</template>
```

#### 建议 6: 提供决策支持信息

**内容**:

```typescript
interface DecisionSupportInfo {
  // 免费期提醒
  remainingFreeDays: number;
  lastFreeDate: string;
  isUrgent: boolean;  // 剩余 < 3 天
  
  // 仓库可用性
  warehouseAvailability: {
    hasCapacity: boolean;
    nextAvailableDate: string;
    utilizationRate: number;
  };
  
  // 周末/节假日提醒
  weekendAlert: boolean;
  holidayAlert: boolean;
  expediteFeeRequired: boolean;
  
  // 建议文案
  recommendations: string[];
}

// 示例：
{
  remainingFreeDays: 2,
  lastFreeDate: '2026-04-05',
  isUrgent: true,
  recommendations: [
    '⚠️ 仅剩 2 天免费期，建议在 2026-04-05 前提柜',
    '💡 选择 Drop off 模式可节省 $150 滞港费',
    '📅 2026-04-04 为周六，可能需要支付加急费'
  ]
}
```

---

## 8. 行动清单

### 8.1 紧急修复（P0 - 本周内完成）

- [ ] **修复免费期数据源不统一问题**
  - 负责人：@developer-a
  - 预计工时：4h
  - 验收标准：所有场景统一从 `DemurrageService` 获取免费期

- [ ] **添加货币配置检查**
  - 负责人：@developer-b
  - 预计工时：2h
  - 验收标准：发现未配置货币的标准时抛出警告

- [ ] **修复送仓日计算逻辑**
  - 负责人：@developer-c
  - 预计工时：6h
  - 验收标准：考虑仓库可用性和预约机制

### 8.2 重要优化（P1 - 两周内完成）

- [ ] **实现滞港费计算缓存层**
  - 负责人：@developer-d
  - 预计工时：8h
  - 验收标准：批量预览性能提升 50% 以上

- [ ] **添加费用可视化 Tooltip**
  - 负责人：@frontend-dev-a
  - 预计工时：4h
  - 验收标准：所有费用列都有解释说明

- [ ] **建立数据监控指标**
  - 负责人：@developer-e
  - 预计工时：6h
  - 验收标准：Dashboard 显示关键指标

### 8.3 长期改进（P2 - 一个月内完成）

- [ ] **重构滞港费计算架构**
  - 负责人：@senior-developer
  - 预计工时：16h
  - 验收标准：引入 `DemurrageForecastService` 中间层

- [ ] **实现智能日历集成**
  - 负责人：@developer-f
  - 预计工时：12h
  - 验收标准：自动排除周末和节假日

- [ ] **开发费用趋势分析功能**
  - 负责人：@frontend-dev-b
  - 预计工时：10h
  - 验收标准：用户可以查看历史费用趋势

### 8.4 技术债清理

- [ ] **删除冗余的免费期获取逻辑**
  - 清理 `SchedulingCostOptimizerService` 中的多层免费期获取代码
  - 统一使用权威数据源

- [ ] **标准化日志输出**
  - 统一使用 `logger` 工具
  - 添加结构化日志便于分析

- [ ] **编写单元测试**
  - 为核心计算逻辑添加测试覆盖
  - 目标覆盖率 > 80%

---

## 附录 A: 关键 API 接口

### A.1 排产预览 API

**请求**:

```http
POST /api/v1/scheduling/preview
Content-Type: application/json

{
  "containers": ["CNTR001", "CNTR002"],
  "warehouseId": "WH001",
  "truckingCompanyId": "TC001",
  "baseDate": "2026-04-01"
}
```

**响应**:

```json
{
  "success": true,
  "data": {
    "results": [
      {
        "containerNumber": "CNTR001",
        "plannedData": {
          "plannedPickupDate": "2026-04-01T00:00:00.000Z",
          "plannedUnloadDate": "2026-04-02T00:00:00.000Z",
          "plannedReturnDate": "2026-04-03T00:00:00.000Z",
          "warehouseName": "LA Warehouse",
          "unloadMode": "Drop off"
        },
        "estimatedCosts": {
          "demurrageCost": 0,
          "detentionCost": 150,
          "storageCost": 0,
          "yardStorageCost": 50,
          "transportationCost": 300,
          "totalCost": 500,
          "currency": "USD"
        }
      }
    ]
  }
}
```

### A.2 滞港费计算 API

**请求**:

```http
GET /api/v1/demurrage/calculate/CNTR001
```

**响应**:

```json
{
  "success": true,
  "data": {
    "containerNumber": "CNTR001",
    "calculationMode": "forecast",
    "calculationDates": {
      "lastPickupDateComputed": "2026-04-07",
      "plannedPickupDate": "2026-04-01"
    },
    "matchedStandards": [
      {
        "id": 123,
        "chargeName": "滞港费",
        "freeDays": 7,
        "ratePerDay": 50,
        "currency": "USD"
      }
    ],
    "items": [
      {
        "chargeTypeCode": "DEMURRAGE",
        "chargeDays": 0,
        "amount": 0
      }
    ],
    "totalAmount": 0,
    "currency": "USD"
  }
}
```

---

**文档版本**: v1.0  
**创建时间**: 2026-04-02  
**作者**: 刘志高  
**状态**: 评审中  
**下次评审日期**: 2026-04-16
