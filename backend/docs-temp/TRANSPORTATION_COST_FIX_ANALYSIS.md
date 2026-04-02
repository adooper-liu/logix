# 排产预览费用计算逻辑分析与修复

## 问题现象

用户反馈：排产预览界面显示所有费用项都是 $0.00，但运输费不可能是 0。

```
费用明细
├─ 总费用 $0.00
├─ 滞港费 $0.00
├─ 滞箱费 $0.00
├─ D&D 合并费 $0.00
├─ 港口存储费 $0.00
├─ 运输费 $0.00        ← ❌ 不可能为 0
├─ 堆场堆存费 $0.00
└─ 操作费 $0.00
```

## 费用计算逻辑梳理

### 1. 费用计算调用链

```
intelligentScheduling.service.ts (L1402-1412)
  └─ calculateEstimatedCosts()
      └─ demurrageService.calculateTotalCost()  ← 计算 D&D 费用和运输费
          ├─ calculateTotalCostWithPlannedDates()
          │   ├─ calculateForContainer()  ← 计算 D&D 费用
          │   └─ calculateTransportationCostInternal()  ← 计算运输费
          └─ 返回所有费用项
```

### 2. 各项费用的计算逻辑

#### 2.1 滞港费 (Demurrage)

**计算位置**: `demurrage.service.ts` - `calculateForContainer()`

**计算逻辑**:
```typescript
// 1. 获取目的港的 last_free_date
const destPort = await portOpRepo.findOne({
  where: { containerNumber, portType: 'destination' }
});

// 2. 从 ext_demurrage_standards 匹配费率标准
const standards = await matchStandards(containerNumber);

// 3. 计算免费期和计费天数
const freeDays = standard.freeDays;
const chargeDays = daysBetween(lastFreeDate, plannedPickupDate);

// 4. 按阶梯费率计算费用
const amount = calculateTieredCost(chargeDays, ratePerDay, tiers);
```

**可能为 0 的原因**:
- ✅ 在免费期内（plannedPickupDate <= lastFreeDate）
- ✅ 目的港没有 last_free_date 数据
- ✅ 没有匹配到滞港费标准

#### 2.2 滞箱费 (Detention)

**计算位置**: `demurrage.service.ts` - `calculateForContainer()`

**计算逻辑**:
```typescript
// 1. 从实际提柜日起算
const detentionStartDate = pickupDateActual;

// 2. 到计划还箱日的天数
const detentionDays = daysBetween(pickupDateActual, plannedReturnDate);

// 3. 减去免费期
const chargeDays = detentionDays - freeDays;

// 4. 计算费用
const amount = calculateTieredCost(chargeDays, ratePerDay, tiers);
```

**可能为 0 的原因**:
- ✅ 在免费期内还箱
- ✅ 没有实际提柜日数据
- ✅ 没有匹配到滞箱费标准

#### 2.3 港口存储费 (Storage)

**计算位置**: `demurrage.service.ts` - `calculateForContainer()`

**计算逻辑**:
```typescript
// 从 ATA 到提柜日的存储费
const storageDays = daysBetween(ataDestPort, plannedPickupDate);
const amount = storageDays * dailyRate;
```

**可能为 0 的原因**:
- ✅ 没有 ATA 数据
- ✅ 提柜日 = ATA（当天提柜）
- ✅ 没有存储费标准

#### 2.4 D&D 合并费 (Combined)

**计算位置**: `demurrage.service.ts` - `calculateForContainer()`

**计算逻辑**:
```typescript
// 某些港口使用合并的 D&D 标准
const ddDays = daysBetween(etaDestPort, plannedReturnDate);
const chargeDays = ddDays - freeDays;
const amount = calculateTieredCost(chargeDays, ratePerDay, tiers);
```

**可能为 0 的原因**:
- ✅ 港口不使用合并 D&D 标准
- ✅ 在免费期内
- ✅ 没有匹配到标准

#### 2.5 运输费 (Transportation) ⭐ 重点分析

**计算位置**: `demurrage.service.ts` - `calculateTransportationCostInternal()` (L3756-3808)

**计算逻辑**:
```typescript
private async calculateTransportationCostInternal(
  containerNumber: string,
  warehouse: Warehouse,
  truckingCompany: TruckingCompany,
  unloadMode: string
): Promise<number> {
  try {
    // 1. 从 dict_warehouse_trucking_mapping 获取基础运费
    const warehouseTruckingMapping = await warehouseTruckingMappingRepo.findOne({
      where: {
        country: warehouse.country || 'US',
        warehouseCode: warehouse.warehouseCode,
        truckingCompanyId: truckingCompany.companyCode,
        isActive: true
      }
    });

    // 2. 默认 $100
    let transportFee = warehouseTruckingMapping?.transportFee || 100;
    transportFee = Number(transportFee) || 100;  // ← 关键：确保是数字

    // 3. Drop off 模式下，如果实际使用堆场（提 < 送），费用翻倍
    if (unloadMode === 'Drop off') {
      const actuallyUsedYard = await this.checkIfActuallyUsedYard(
        containerNumber, warehouse, truckingCompany
      );
      if (actuallyUsedYard) {
        const dropoffMultiplier = await this.getDropoffMultiplier(); // 默认 2.0
        transportFee *= dropoffMultiplier;
      }
    }

    return transportFee;
  } catch (error) {
    logger.warn(`[Demurrage] calculateTransportationCostInternal error:`, error);
    return 0;  // ← ❌ 出错时返回 0
  }
}
```

**可能为 0 的原因**:
1. ❌ **仓库信息为空或 warehouseCode 为空**
2. ❌ **车队信息为空或 companyCode 为空**
3. ❌ **dict_warehouse_trucking_mapping 表中没有匹配记录**
4. ❌ **查询出错，catch 返回 0**
5. ✅ Drop off 模式但未使用堆场（提=送），不翻倍（但基础运费不应该为 0）

#### 2.6 堆场堆存费 (Yard Storage)

**计算位置**: `intelligentScheduling.service.ts` - `calculateEstimatedCosts()` (L2099-2155)

**计算逻辑**:
```typescript
// 仅在 Drop off 模式、车队有堆场且实际使用时计算
if (unloadMode === 'Drop off' && truckingCompany.hasYard) {
  // 判断是否实际使用堆场：提柜日 < 送仓日
  const pickupDayStr = plannedPickupDate.toISOString().split('T')[0];
  const deliveryDayStr = plannedDeliveryDate.toISOString().split('T')[0];
  
  if (pickupDayStr !== deliveryDayStr) {
    // 从 TruckingPortMapping 获取费率
    const truckingPortMapping = await truckingPortMappingRepo.findOne({
      where: {
        country: warehouse.country,
        portCode: destPortCode,
        truckingCompanyId: truckingCompany.companyCode,
        isActive: true
      }
    });
    
    if (truckingPortMapping) {
      const yardStorageDays = daysBetween(plannedPickupDate, plannedDeliveryDate);
      const standardRate = Number(truckingPortMapping.standardRate) || 0;
      const yardOperationFee = Number(truckingPortMapping.yardOperationFee) || 0;
      yardStorageCost = standardRate * yardStorageDays + yardOperationFee;
    }
  }
}
```

**可能为 0 的原因**:
- ✅ Live load 模式
- ✅ Drop off 但车队没有堆场（hasYard = false）
- ✅ Drop off 但提=送（未实际使用堆场）
- ✅ TruckingPortMapping 表中没有记录
- ✅ 费率字段为 0

#### 2.7 操作费 (Handling)

**计算位置**: `intelligentScheduling.service.ts` - `calculateEstimatedCosts()` (L2157-2169)

**计算逻辑**:
```typescript
// 仅在 Expedited 模式下收取
let handlingCost = 0;
if (unloadMode === 'Expedited') {
  const config = await schedulingConfigRepo.findOne({
    where: { configKey: 'expedited_handling_fee' }
  });
  handlingCost = config?.configValue ? parseFloat(config.configValue) : 50;
}
```

**可能为 0 的原因**:
- ✅ 不是 Expedited 模式（正常情况应该是 Drop off 或 Live load）

## 问题诊断

### 调试日志分析

查看 `intelligentScheduling.service.ts` L2080-2097 的调试日志：

```typescript
logger.info(`[IntelligentScheduling] Cost breakdown for ${containerNumber}:`, {
  demurrageCost: totalCostResult.demurrageCost,
  detentionCost: totalCostResult.detentionCost,
  storageCost: totalCostResult.storageCost,
  ddCombinedCost: totalCostResult.ddCombinedCost,
  transportationCost: totalCostResult.transportationCost,  // ← 关键字段
  totalCost: totalCostResult.totalCost,
  currency: totalCostResult.currency,
  items: totalCostResult.items?.map((item) => ({
    chargeName: item.chargeName,
    chargeTypeCode: item.chargeTypeCode,
    freeDays: item.freeDays,
    chargeDays: item.chargeDays,
    amount: item.amount,
    tierBreakdown: item.tierBreakdown
  }))
});
```

**需要检查后端日志**，看 `transportationCost` 的值是多少。

### 可能的问题根因

#### 问题 1: warehouse 或 truckingCompany 为空

**检查点**:
```typescript
// intelligentScheduling.service.ts L1409-1410
const estimatedCosts = request.dryRun
  ? await this.calculateEstimatedCosts(
      container.containerNumber,
      plannedPickupDate,
      unloadDate,
      plannedReturnDate,
      unloadMode,
      warehouse,      // ← 这个变量是否为空？
      truckingCompany // ← 这个变量是否为空？
    )
```

**验证方法**:
在 `calculateEstimatedCosts` 函数开头添加日志：
```typescript
logger.info(`[IntelligentScheduling] Calculating costs for ${containerNumber}`, {
  warehouse,
  truckingCompany,
  warehouseCode: warehouse?.warehouseCode,
  truckingCompanyId: truckingCompany?.companyCode
});
```

#### 问题 2: dict_warehouse_trucking_mapping 表中没有记录

**检查 SQL**:
```sql
SELECT * FROM dict_warehouse_trucking_mapping
WHERE country = 'US'
  AND warehouse_code = 'CA-S003'  -- 假设的仓库代码
  AND trucking_company_id = 'RT LOGISTICA Srl'  -- 假设的车队名称
  AND is_active = true;
```

**可能的问题**:
- `trucking_company_id` 字段存储的是 `companyCode` 还是 `companyName`？
- `warehouse_code` 是否正确？
- `country` 字段是否为空？

#### 问题 3: calculateTransportationCostInternal 查询失败

**检查 catch 块**:
```typescript
catch (error) {
  logger.warn(`[Demurrage] calculateTransportationCostInternal error:`, error);
  return 0;  // ← 返回 0 而不是抛出错误
}
```

**需要查看后端日志**，是否有错误信息。

## 修复方案

### 方案 1: 增强错误处理和日志记录

**修改位置**: `demurrage.service.ts` - `calculateTransportationCostInternal()`

**修复代码**:
```typescript
private async calculateTransportationCostInternal(
  containerNumber: string,
  warehouse: Warehouse,
  truckingCompany: TruckingCompany,
  unloadMode: string
): Promise<number> {
  try {
    logger.debug(`[Demurrage] Calculating transportation cost for ${containerNumber}`, {
      warehouseCode: warehouse?.warehouseCode,
      warehouseCountry: warehouse?.country,
      truckingCompanyId: truckingCompany?.companyCode,
      truckingCompanyName: truckingCompany?.companyName,
      unloadMode
    });

    // 验证必需参数
    if (!warehouse || !warehouse.warehouseCode) {
      logger.error(`[Demurrage] Missing warehouse info for ${containerNumber}`);
      return 100; // 返回默认值而不是 0
    }

    if (!truckingCompany || !truckingCompany.companyCode) {
      logger.error(`[Demurrage] Missing trucking company info for ${containerNumber}`);
      return 100; // 返回默认值而不是 0
    }

    // 从 dict_warehouse_trucking_mapping 获取基础运费
    const warehouseTruckingMappingRepo =
      this.containerRepo.manager.getRepository(WarehouseTruckingMapping);
    
    const warehouseTruckingMapping = await warehouseTruckingMappingRepo.findOne({
      where: {
        country: warehouse.country || 'US',
        warehouseCode: warehouse.warehouseCode,
        truckingCompanyId: truckingCompany.companyCode,
        isActive: true
      }
    });

    logger.debug(`[Demurrage] Warehouse-Trucking mapping result for ${containerNumber}:`, {
      mapping: warehouseTruckingMapping,
      transportFee: warehouseTruckingMapping?.transportFee
    });

    let transportFee = warehouseTruckingMapping?.transportFee || 100; // 默认 $100
    // ✅ 关键修复：TypeORM 的 decimal 类型返回字符串，需要显式转换为数字
    transportFee = Number(transportFee) || 100;

    logger.info(`[Demurrage] Base transport fee for ${containerNumber}: $${transportFee}`);

    // ✅ 关键修复：Drop off 模式下，只有实际使用了堆场（提 < 送）才翻倍
    if (unloadMode === 'Drop off') {
      const actuallyUsedYard = await this.checkIfActuallyUsedYard(
        containerNumber,
        warehouse,
        truckingCompany
      );

      if (actuallyUsedYard) {
        // ✅ 实际使用了堆场（提 < 送），需要两次运输，费用翻倍
        const dropoffMultiplier = await this.getDropoffMultiplier();
        transportFee *= dropoffMultiplier;
        logger.debug(
          `[Demurrage] Drop off mode (used yard): transportFee=${transportFee}, multiplier=${dropoffMultiplier}`
        );
      } else {
        // ✅ 未使用堆场（提 = 送），只运输一次，不翻倍
        logger.debug(
          `[Demurrage] Drop off mode (direct delivery): transportFee=${transportFee}, no multiplier`
        );
      }
    }

    logger.info(`[Demurrage] Final transport fee for ${containerNumber}: $${transportFee}`);
    return transportFee;
  } catch (error) {
    logger.error(`[Demurrage] calculateTransportationCostInternal error:`, {
      containerNumber,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return 100; // 返回默认值而不是 0
  }
}
```

### 方案 2: 检查数据库映射表

**检查清单**:

1. **验证 dict_warehouse_trucking_mapping 表数据**:
```sql
SELECT 
  country,
  warehouse_code,
  trucking_company_id,
  transport_fee,
  is_active
FROM dict_warehouse_trucking_mapping
WHERE is_active = true;
```

2. **验证 dict_trucking_port_mapping 表数据**:
```sql
SELECT 
  country,
  port_code,
  trucking_company_id,
  standard_rate,
  yard_operation_fee,
  has_yard,
  is_active
FROM dict_trucking_port_mapping
WHERE is_active = true;
```

3. **验证 warehouse 和 truckingCompany 数据**:
```sql
-- 检查仓库
SELECT warehouse_code, warehouse_name, country
FROM dict_warehouses
WHERE warehouse_code = 'CA-S003';  -- 替换为实际仓库代码

-- 检查车队
SELECT company_code, company_name, has_yard
FROM dict_trucking_companies
WHERE company_code = 'RT LOGISTICA Srl';  -- 替换为实际车队代码
```

### 方案 3: 前端显示调试信息

**修改位置**: `SchedulingVisual.vue` - 费用明细显示部分

**添加调试日志**:
```typescript
// 在 buildCostTree 函数中添加日志
const buildCostTree = (costs: any, country: string) => {
  logger.debug('[SchedulingVisual] Building cost tree:', {
    costs,
    country
  });
  
  // ... 现有代码
};
```

## 测试验证步骤

### 步骤 1: 检查后端日志

重新启动服务并执行排产预览，查看以下日志：

```
[IntelligentScheduling] Calculating estimated costs for HMMU6232153
[IntelligentScheduling] Cost breakdown for HMMU6232153:
  transportationCost: ???  ← 关键检查点
[Demurrage] Calculating transportation cost for HMMU6232153
[Demurrage] Base transport fee for HMMU6232153: $???
[Demurrage] Final transport fee for HMMU6232153: $???
```

### 步骤 2: 执行数据库检查

运行上述 SQL 查询，验证映射表数据。

### 步骤 3: 手动测试

1. 刷新页面
2. 选择目的港和日期范围
3. 点击"排产预览"按钮
4. 打开浏览器控制台，查看打印的费用数据
5. 检查后端日志，查看运输费计算过程

### 步骤 4: 验证修复

如果运输费仍然为 0，检查：
- warehouse 和 truckingCompany 是否正确传入
- dict_warehouse_trucking_mapping 表中是否有记录
- transport_fee 字段的值是否为 NULL 或 0

## 后续优化建议

1. **统一费用计算逻辑**: 当前 `CostEstimationService` 和 `demurrageService.calculateTotalCost` 都有费用计算逻辑，建议统一

2. **改进错误处理**: 费用计算失败时返回默认值而不是 0，避免误导用户

3. **添加费用计算单元测试**: 为 `calculateTransportationCostInternal` 添加完整的单元测试

4. **费用计算可视化**: 在前端添加费用计算说明，让用户知道每项费用是如何计算的

## 相关文件

- `backend/src/services/demurrage.service.ts` - 费用计算核心服务
- `backend/src/services/intelligentScheduling.service.ts` - 智能排产服务
- `backend/src/services/schedulingCostOptimizer.service.ts` - 成本优化服务
- `frontend/src/views/scheduling/SchedulingVisual.vue` - 排产预览界面

## 修复时间

- **分析日期**: 2026-04-02
- **分析人员**: 刘志高
- **状态**: 待修复
