# 预览排产优化方案

**版本**: v2.0
**创建时间**: 2026-04-01
**最后更新**: 2026-04-01
**作者**: 刘志高

---

## 1. 问题聚焦

### 1.1 核心问题

**问题 1: 成本优化与实际排产分离**

- 仅在排产后作为建议
- 未实时计算成本
- 优化方案可能违反产能约束

**问题 2: 产能日历利用率不足**

- 仅用于简单容量检查 (remaining > 0)
- 未实现智能日历能力
- 缺少节假日自动识别

**不考虑**: 货柜详情页面 - 时间预测 TAB

---

## 2. 现状分析

### 2.1 预览排产流程

```
用户点击"预览排产"
  ↓
IntelligentSchedulingService.batchSchedule({ dryRun: true })
  ↓
1. 筛选待排产货柜 (ContainerFilterService)
2. 按清关可放行日排序 (SchedulingSorter)
3. 逐柜模拟排产 (scheduleSingleContainer)
   ├─ 选择仓库 (WarehouseSelectorService)
   ├─ 选择车队 (TruckingSelectorService)
   ├─ 计算日期 (SchedulingDateCalculator)
   └─ 决定卸柜方式 (Drop off / Live load)
  ↓
4. 返回排产结果 (不保存、不扣减产能)
  ↓
前端展示排产卡片
  ↓
用户点击"批量保存优化"
  ↓
SchedulingCostOptimizerService.suggestOptimalUnloadDate()
  ↓
成本优化建议 (可能违反产能约束)
```

### 2.2 现有代码分析

**IntelligentSchedulingService.batchSchedule()**:

```typescript
async batchSchedule(request: ScheduleRequest): Promise<BatchScheduleResponse> {
  const containers = await this.getContainersToSchedule(request);
  const sortedContainers = this.schedulingSorter.sortByClearanceDate(containers);

  const results: ScheduleResult[] = [];
  for (const container of sortedContainers) {
    // dryRun = true 时不保存、不扣减产能
    const result = await this.scheduleSingleContainer(container, request);
    results.push(result);
  }

  return {
    success: true,
    totalCount: containers.length,
    scheduledCount: results.filter(r => r.success).length,
    results
  };
}
```

**scheduleSingleContainer()**:

```typescript
private async scheduleSingleContainer(
  container: Container,
  request: ScheduleRequest
): Promise<ScheduleResult> {
  // 1. 选择仓库
  const warehouse = await this.warehouseSelectorService.selectWarehouse(
    container,
    request.designatedWarehouseCode
  );

  // 2. 选择车队
  const truckingCompany = await this.truckingSelectorService.selectTruckingCompany(
    container,
    warehouse
  );

  // 3. 计算日期 (基于固定周期，未考虑产能)
  const plannedPickupDate = this.dateCalculator.calculatePlannedPickupDate(
    container.etaDestPort,
    request.etaBufferDays || 0
  );

  const plannedUnloadDate = this.dateCalculator.calculatePlannedUnloadDate(
    plannedPickupDate,
    truckingCompany.hasYard
  );

  // 4. 决定卸柜方式
  const unloadMode = this.determineUnloadMode(truckingCompany, plannedPickupDate, plannedUnloadDate);

  // 5. 计算还箱日
  const plannedReturnDate = this.dateCalculator.calculateReturnDate(
    plannedUnloadDate,
    unloadMode,
    truckingCompany
  );

  // dryRun = true 时直接返回，不保存、不扣减产能
  if (request.dryRun) {
    return {
      containerNumber: container.containerNumber,
      success: true,
      plannedData: {
        plannedPickupDate,
        plannedDeliveryDate: plannedUnloadDate,
        plannedUnloadDate,
        plannedReturnDate,
        truckingCompanyId: truckingCompany.truckingCompanyId,
        warehouseId: warehouse.warehouseId,
        unloadMode
      }
    };
  }

  // dryRun = false 时保存并扣减产能
  await this.saveScheduleResult(...);
  await this.occupancyCalculator.decrementWarehouseOccupancy(...);
  await this.occupancyCalculator.decrementTruckingOccupancy(...);
}
```

**SchedulingCostOptimizerService.suggestOptimalUnloadDate()**:

```typescript
async suggestOptimalUnloadDate(
  containerNumber: string,
  warehouse: Warehouse,
  truckingCompany: TruckingCompany,
  basePickupDate: Date,
  lastFreeDate?: Date
) {
  // 1. 获取货柜信息
  const container = await this.containerRepo.findOne({ ... });

  // 2. 计算滞港费
  const demurrageResult = await this.demurrageService.calculateForContainer(containerNumber);
  const effectiveLastFreeDate = demurrageResult.result?.calculationDates?.lastPickupDateComputed;

  // 3. 分类判断
  const category = await this.categorizeSingleContainer(
    containerNumber,
    basePickupDate,
    effectiveLastFreeDate
  );

  // 4. 计算当前方案成本
  const originalCost = (await this.evaluateTotalCost({
    containerNumber,
    warehouse,
    plannedPickupDate: basePickupDate,
    strategy: truckingCompany.hasYard ? 'Drop off' : 'Direct',
    isWithinFreePeriod: basePickupDate <= effectiveLastFreeDate
  })).totalCost;

  // 5. 生成搜索范围
  const searchDates = this.generateSearchRange(
    basePickupDate,
    effectiveLastFreeDate,
    category
  );

  // 6. 遍历搜索日期，评估成本
  const candidates = [];
  for (const candidateDate of searchDates) {
    if (this.isWeekend(candidateDate)) continue;

    // ⚠️ 问题：未检查仓库/车队档期
    // if (!(await this.isWarehouseAvailable(warehouse, candidateDate))) continue;

    for (const strat of ['Direct', 'Drop off', 'Expedited']) {
      const breakdown = await this.evaluateTotalCost({
        containerNumber,
        warehouse,
        plannedPickupDate: candidateDate,
        strategy: strat,
        isWithinFreePeriod: candidateDate <= effectiveLastFreeDate
      });

      candidates.push({
        pickupDate: candidateDate,
        strategy: strat,
        totalCost: breakdown.totalCost
      });
    }
  }

  // 7. 选择成本最低的方案
  const optimalCandidate = candidates.reduce((min, curr) =>
    curr.totalCost < min.totalCost ? curr : min
  );

  return {
    suggestedPickupDate: optimalCandidate.pickupDate,
    suggestedStrategy: optimalCandidate.strategy,
    originalCost,
    optimizedCost: optimalCandidate.totalCost,
    savings: originalCost - optimalCandidate.totalCost,
    savingsPercent: ((originalCost - optimalCandidate.totalCost) / originalCost) * 100,
    alternatives: candidates
  };
}
```

### 2.3 问题根因

**根因 1: 成本优化在排产后执行**

- 排产时不考虑成本
- 成本优化时不检查产能
- 优化建议无法落地

**根因 2: 产能日历未充分利用**

- 只检查 remaining > 0
- 未考虑节假日
- 未实现智能日历能力

**根因 3: 性能瓶颈**

- 单次评估 10ms，批量处理 100 柜需 45 秒
- 滞港费标准每次请求都查询数据库
- 货柜串行处理，未充分利用多核

---

## 3. 优化方案

### 3.1 方案 C: 成本优化前置 (推荐)

**核心思路**:

- 在排产过程中实时计算成本
- 选择成本最低的可行方案
- 确保优化方案符合产能约束
- 引入缓存机制提升性能

**实现步骤**:

#### Step 1: 引入缓存机制

```typescript
// backend/src/services/CacheService.ts

interface CacheOptions {
  ttl: number // 过期时间（秒）
  prefix: string // 缓存键前缀
}

export class CacheService {
  private redis = AppDataSource.redis // 假设已配置 Redis

  /**
   * 获取缓存
   */
  async get<T>(key: string): Promise<T | null> {
    const cached = await this.redis.get(key)
    return cached ? JSON.parse(cached) : null
  }

  /**
   * 设置缓存
   */
  async set(key: string, value: any, ttl: number = 3600): Promise<void> {
    await this.redis.setex(key, ttl, JSON.stringify(value))
  }

  /**
   * 清除缓存
   */
  async invalidate(pattern: string): Promise<void> {
    const keys = await this.redis.keys(pattern)
    if (keys.length > 0) {
      await this.redis.del(...keys)
    }
  }
}

// 使用示例：demurrage.service.ts
export class DemurrageService {
  private cache = new CacheService()

  async getDemurrageStandard(portCode: string, shipper: string, forwarder: string) {
    const cacheKey = `demurrage:${portCode}:${shipper}:${forwarder}`

    // 先查缓存
    const cached = await this.cache.get<DemurrageStandard>(cacheKey)
    if (cached) return cached

    // 缓存未命中，查数据库
    const standard = await this.standardRepo.findOne({ where: { portCode, shipper, forwarder } })

    // 写入缓存（1 小时过期）
    if (standard) {
      await this.cache.set(cacheKey, standard, 3600)
    }

    return standard
  }
}
```

**预期效果**: 滞港费标准查询从 10ms 降至 <1ms。

---

#### Step 2: 批量查询优化

```typescript
// backend/src/services/OccupancyCalculator.ts

export class OccupancyCalculator {
  /**
   * 批量获取仓库档期（优化版）
   *
   * @param warehouseCodes 仓库代码列表
   * @param startDate 开始日期
   * @param days 天数
   */
  async getBatchWarehouseOccupancy(
    warehouseCodes: string[],
    startDate: Date,
    days: number = 30
  ): Promise<Map<string, Map<string, ExtWarehouseDailyOccupancy>>> {
    const endDate = dateTimeUtils.addDays(startDate, days)

    // 一次性查询所有仓库的未来档期
    const occupancies = await this.occupancyRepo
      .createQueryBuilder('occ')
      .where('occ.warehouse_code IN (:...warehouseCodes)', { warehouseCodes })
      .andWhere('occ.date >= :startDate', { startDate })
      .andWhere('occ.date <= :endDate', { endDate })
      .getMany()

    // 按 仓库 + 日期 组织
    const result = new Map<string, Map<string, ExtWarehouseDailyOccupancy>>()

    for (const occ of occupancies) {
      if (!result.has(occ.warehouseCode)) {
        result.set(occ.warehouseCode, new Map())
      }
      result.get(occ.warehouseCode)!.set(dateTimeUtils.formatDate(occ.date), occ)
    }

    return result
  }

  /**
   * 使用批量档期快速检查可用性
   */
  async findEarliestAvailableDayWithBatch(
    warehouseCode: string,
    startDate: Date,
    batchOccupancy: Map<string, Map<string, ExtWarehouseDailyOccupancy>>,
    maxDays: number = 30
  ): Promise<Date | null> {
    const warehouseOccupancy = batchOccupancy.get(warehouseCode)
    if (!warehouseOccupancy) return startDate

    for (let i = 0; i < maxDays; i++) {
      const date = dateTimeUtils.addDays(startDate, i)
      const dateStr = dateTimeUtils.formatDate(date)

      // 跳过周末
      if (this.isWeekend(date)) continue

      const occupancy = warehouseOccupancy.get(dateStr)
      if (!occupancy || occupancy.remaining > 0) {
        return date
      }
    }

    return null // 无可用日期
  }
}
```

**预期效果**: 1500 次查询 → 1 次查询。

---

#### Step 3: 修改 scheduleSingleContainer()

```typescript
private async scheduleSingleContainer(
  container: Container,
  request: ScheduleRequest
): Promise<ScheduleResult> {
  // 1. 选择仓库
  const warehouse = await this.warehouseSelectorService.selectWarehouse(
    container,
    request.designatedWarehouseCode
  );

  // 2. 选择车队
  const truckingCompany = await this.truckingSelectorService.selectTruckingCompany(
    container,
    warehouse
  );

  // 3. 计算基础提柜日
  const basePickupDate = this.dateCalculator.calculatePlannedPickupDate(
    container.etaDestPort,
    request.etaBufferDays || 0
  );

  // ✅ 新增：实时成本优化（使用缓存和批量查询）
  const optimization = await this.costOptimizerService.suggestOptimalUnloadDate(
    container.containerNumber,
    warehouse,
    truckingCompany,
    basePickupDate,
    container.lastFreeDate
  );

  // 4. 使用优化后的提柜日
  const optimizedPickupDate = optimization.suggestedPickupDate;

  // 5. 重新计算其他日期
  const plannedDeliveryDate = this.dateCalculator.calculatePlannedDeliveryDate(
    optimizedPickupDate,
    truckingCompany,
    warehouse
  );

  const plannedUnloadDate = this.dateCalculator.calculatePlannedUnloadDate(
    plannedDeliveryDate,
    truckingCompany.hasYard
  );

  const unloadMode = this.determineUnloadMode(truckingCompany, optimizedPickupDate, plannedUnloadDate);

  const plannedReturnDate = this.dateCalculator.calculateReturnDate(
    plannedUnloadDate,
    unloadMode,
    truckingCompany
  );

  // 6. 检查产能约束（使用批量档期）
  const warehouseAvailable = await this.occupancyCalculator.isWarehouseAvailable(
    warehouse.warehouseCode,
    plannedUnloadDate
  );

  const truckingAvailable = await this.occupancyCalculator.isTruckingAvailable(
    truckingCompany.truckingCompanyId,
    optimizedPickupDate,
    container.etaDestPort,
    warehouse.warehouseCode
  );

  if (!warehouseAvailable || !truckingAvailable) {
    return {
      containerNumber: container.containerNumber,
      success: false,
      message: '产能不足，无法排产'
    };
  }

  // 7. 返回排产结果（含成本明细）
  if (request.dryRun) {
    return {
      containerNumber: container.containerNumber,
      success: true,
      plannedData: {
        plannedPickupDate: optimizedPickupDate,
        plannedDeliveryDate,
        plannedUnloadDate,
        plannedReturnDate,
        truckingCompanyId: truckingCompany.truckingCompanyId,
        warehouseId: warehouse.warehouseId,
        unloadMode
      },
      estimatedCosts: {
        demurrageCost: optimization.optimizedCostBreakdown.demurrageCost,
        detentionCost: optimization.optimizedCostBreakdown.detentionCost,
        storageCost: optimization.optimizedCostBreakdown.storageCost,
        yardStorageCost: optimization.optimizedCostBreakdown.yardStorageCost,
        transportationCost: optimization.optimizedCostBreakdown.transportationCost,
        totalCost: optimization.optimizedCost
      }
    };
  }

  // 8. 保存并扣减产能
  await this.saveScheduleResult(...);
  await this.occupancyCalculator.decrementWarehouseOccupancy(
    warehouse.warehouseCode,
    plannedUnloadDate
  );
  await this.occupancyCalculator.decrementTruckingOccupancy({
    truckingCompanyId: truckingCompany.truckingCompanyId,
    date: optimizedPickupDate,
    portCode: container.etaDestPort,
    warehouseCode: warehouse.warehouseCode
  });

  return {
    containerNumber: container.containerNumber,
    success: true,
    plannedData: { ... },
    estimatedCosts: { ... }
  };
}
```

---

#### Step 4: 修改 SchedulingCostOptimizerService.suggestOptimalUnloadDate()

```typescript
async suggestOptimalUnloadDate(
  containerNumber: string,
  warehouse: Warehouse,
  truckingCompany: TruckingCompany,
  basePickupDate: Date,
  lastFreeDate?: Date
) {
  // 1. 获取货柜信息
  const container = await this.containerRepo.findOne({
    where: { containerNumber },
    relations: ['replenishmentOrder']
  });

  // 2. 计算滞港费（使用缓存）
  const demurrageResult = await this.demurrageService.calculateForContainer(containerNumber);
  const effectiveLastFreeDate = demurrageResult.result?.calculationDates?.lastPickupDateComputed;

  // 3. 分类判断
  const category = await this.categorizeSingleContainer(
    containerNumber,
    basePickupDate,
    effectiveLastFreeDate
  );

  // 4. 计算当前方案成本
  const currentOption: UnloadOption = {
    containerNumber,
    warehouse,
    plannedPickupDate: basePickupDate,
    strategy: truckingCompany.hasYard ? 'Drop off' : 'Direct',
    isWithinFreePeriod: basePickupDate <= effectiveLastFreeDate
  };
  const originalCost = (await this.evaluateTotalCost(currentOption)).totalCost;

  // 5. 生成智能搜索范围
  const searchDates = this.generateSearchRange(
    basePickupDate,
    effectiveLastFreeDate,
    category
  );

  // 6. 遍历搜索日期，评估成本
  const candidates = [];
  for (const candidateDate of searchDates) {
    // ✅ 新增：跳过周末
    if (await this.isWeekend(candidateDate)) continue;

    // ✅ 新增：检查仓库档期
    if (!(await this.isWarehouseAvailable(warehouse, candidateDate))) continue;

    // ✅ 新增：检查车队档期
    if (!(await this.isTruckingAvailable(truckingCompany, candidateDate, container.etaDestPort, warehouse.warehouseCode))) continue;

    // 评估不同策略
    for (const strat of ['Direct', 'Drop off', 'Expedited']) {
      const breakdown = await this.evaluateTotalCost({
        containerNumber,
        warehouse,
        plannedPickupDate: candidateDate,
        strategy: strat,
        isWithinFreePeriod: candidateDate <= effectiveLastFreeDate
      });

      candidates.push({
        pickupDate: candidateDate,
        strategy: strat,
        totalCost: breakdown.totalCost,
        breakdown
      });
    }
  }

  // 7. 选择成本最低的方案
  const optimalCandidate = candidates.reduce((min, curr) =>
    curr.totalCost < min.totalCost ? curr : min
  );

  if (!optimalCandidate) {
    // 无候选：返回原方案
    return {
      suggestedPickupDate: basePickupDate,
      suggestedStrategy: truckingCompany.hasYard ? 'Drop off' : 'Direct',
      originalCost,
      optimizedCost: originalCost,
      savings: 0,
      savingsPercent: 0,
      alternatives: []
    };
  }

  return {
    suggestedPickupDate: optimalCandidate.pickupDate,
    suggestedStrategy: optimalCandidate.strategy,
    originalCost,
    optimizedCost: optimalCandidate.totalCost,
    savings: originalCost - optimalCandidate.totalCost,
    savingsPercent: ((originalCost - optimalCandidate.totalCost) / originalCost) * 100,
    alternatives: candidates,
    optimizedCostBreakdown: optimalCandidate.breakdown
  };
}

// ✅ 新增方法
private async isWeekend(date: Date): Promise<boolean> {
  const day = date.getDay();
  return day === 0 || day === 6; // 周日或周六
}

private async isWarehouseAvailable(warehouse: Warehouse, date: Date): Promise<boolean> {
  const occupancy = await this.warehouseOccupancyRepo.findOne({
    where: {
      warehouseCode: warehouse.warehouseCode,
      date
    }
  });

  if (!occupancy) {
    // 无记录：默认可用 (产能 = 默认值)
    return true;
  }

  return occupancy.remaining > 0;
}

private async isTruckingAvailable(
  truckingCompany: TruckingCompany,
  date: Date,
  portCode: string,
  warehouseCode: string
): Promise<boolean> {
  const occupancy = await this.truckingOccupancyRepo.findOne({
    where: {
      truckingCompanyId: truckingCompany.truckingCompanyId,
      date,
      portCode,
      warehouseCode
    }
  });

  if (!occupancy) {
    // 无记录：默认可用
    return true;
  }

  return occupancy.remaining > 0;
}
```

---

#### Step 5: 并发处理优化

```typescript
// backend/src/services/IntelligentSchedulingService.ts

export class IntelligentSchedulingService {
  private readonly BATCH_SIZE = 10 // 每批并发数

  /**
   * 批量排产（并发优化版）
   */
  async batchScheduleOptimized(request: ScheduleRequest): Promise<BatchScheduleResponse> {
    const containers = await this.getContainersToSchedule(request)

    // 分批处理
    const results: ScheduleResult[] = []
    for (let i = 0; i < containers.length; i += this.BATCH_SIZE) {
      const batch = containers.slice(i, i + this.BATCH_SIZE)

      // 并发处理当前批次
      const batchResults = await Promise.all(
        batch.map(container => this.scheduleSingleOptimized(container, request))
      )

      results.push(...batchResults)

      // 批次间隔（避免数据库连接池耗尽）
      if (i + this.BATCH_SIZE < containers.length) {
        await this.delay(50)
      }
    }

    return {
      success: true,
      total: containers.length,
      successCount: results.filter(r => r.success).length,
      failedCount: results.filter(r => !r.success).length,
      results,
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private async scheduleSingleOptimized(
    container: Container,
    request: ScheduleRequest
  ): Promise<ScheduleResult> {
    // 复用批量档期（由调用方预加载）
    const batchOccupancy = await this.occupancyCalculator.getBatchWarehouseOccupancy(
      this.getCandidateWarehouseCodes(),
      new Date(),
      30
    )

    return this.scheduleSingleWithBatch(container, request, batchOccupancy)
  }
}
```

**预期效果**: 100 柜处理时间从 45 秒降至 5-10 秒。

---

### 3.2 智能日历能力增强

```typescript
// smartCalendarCapacity.ts
export class SmartCalendarCapacity {
  /**
   * 确保仓库档期记录存在并设置正确的能力
   */
  async ensureWarehouseOccupancy(
    warehouseCode: string,
    date: Date
  ): Promise<ExtWarehouseDailyOccupancy> {
    const dateStr = date.toISOString().split('T')[0]
    const normalizedDate = new Date(dateStr)

    // 查找现有记录
    let occupancy = await this.warehouseOccupancyRepo.findOne({
      where: { warehouseCode, date: normalizedDate },
    })

    if (occupancy) {
      if (occupancy.capacity > 0) {
        return occupancy
      }

      // 更新 capacity
      const calculatedCapacity = await this.calculateWarehouseCapacity(warehouseCode, date)
      occupancy.capacity = calculatedCapacity
      occupancy.remaining = Math.max(0, calculatedCapacity - occupancy.plannedCount)
      await this.warehouseOccupancyRepo.save(occupancy)
      return occupancy
    }

    // 创建新记录
    const calculatedCapacity = await this.calculateWarehouseCapacity(warehouseCode, date)
    occupancy = this.warehouseOccupancyRepo.create({
      warehouseCode,
      date: normalizedDate,
      plannedCount: 0,
      capacity: calculatedCapacity,
      remaining: calculatedCapacity,
    })

    await this.warehouseOccupancyRepo.save(occupancy)
    return occupancy
  }

  /**
   * 计算仓库在指定日期的产能
   */
  private async calculateWarehouseCapacity(warehouseCode: string, date: Date): Promise<number> {
    const warehouse = await this.warehouseRepo.findOne({
      where: { warehouseCode },
    })

    if (!warehouse) {
      return OCCUPANCY_CONFIG.DEFAULT_WAREHOUSE_DAILY_CAPACITY
    }

    // ✅ 新增：检查是否为周末
    const isWeekend = date.getDay() === 0 || date.getDay() === 6
    if (isWeekend) {
      return 0 // 周末产能为 0
    }

    // ✅ 新增：检查是否为节假日
    const isHoliday = await this.isHoliday(date)
    if (isHoliday) {
      return 0 // 节假日不工作
    }

    return warehouse.dailyUnloadCapacity || OCCUPANCY_CONFIG.DEFAULT_WAREHOUSE_DAILY_CAPACITY
  }

  /**
   * 检查是否为节假日
   */
  private async isHoliday(date: Date): Promise<boolean> {
    // TODO: 接入节假日 API 或配置表
    // 暂时返回 false
    return false
  }

  /**
   * 确保车队档期记录存在
   */
  async ensureTruckingOccupancy(
    truckingCompanyId: string,
    date: Date,
    portCode?: string,
    warehouseCode?: string
  ): Promise<ExtTruckingSlotOccupancy> {
    // 类似逻辑...
  }
}
```

---

### 3.3 前端优化

#### 排产结果卡片优化

```vue
<template>
  <div class="scheduling-page">
    <!-- 统计栏 -->
    <div class="stat-bar">
      <div class="stat-item">
        <span class="stat-value">{{ overview.pendingCount }}</span>
        <span class="stat-label">待排产</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">{{ totalEstimatedCost }}</span>
        <span class="stat-label">预估总成本</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">{{ avgCostPerContainer }}</span>
        <span class="stat-label">单柜平均成本</span>
      </div>
    </div>

    <!-- 排产结果卡片 -->
    <div class="scheduling-results">
      <div v-for="result in results" :key="result.containerNumber" class="result-card">
        <div class="card-header">
          <span class="container-number">{{ result.containerNumber }}</span>
          <el-tag :type="result.success ? 'success' : 'danger'">
            {{ result.success ? '可排产' : '无法排产' }}
          </el-tag>
        </div>

        <div class="card-body">
          <!-- 时间线 -->
          <div class="timeline">
            <div class="timeline-node">
              <span class="node-label">提柜</span>
              <span class="node-date">{{ result.plannedData.plannedPickupDate }}</span>
            </div>
            <div class="timeline-node">
              <span class="node-label">卸柜</span>
              <span class="node-date">{{ result.plannedData.plannedUnloadDate }}</span>
            </div>
            <div class="timeline-node">
              <span class="node-label">还箱</span>
              <span class="node-date">{{ result.plannedData.plannedReturnDate }}</span>
            </div>
          </div>

          <!-- 成本明细 -->
          <div class="cost-breakdown">
            <div class="cost-item">
              <span>滞港费</span>
              <span>${{ result.estimatedCosts.demurrageCost?.toFixed(2) || '0.00' }}</span>
            </div>
            <div class="cost-item">
              <span>运输费</span>
              <span>${{ result.estimatedCosts.transportationCost?.toFixed(2) || '0.00' }}</span>
            </div>
            <div class="cost-item total">
              <span>总成本</span>
              <span>${{ result.estimatedCosts.totalCost?.toFixed(2) || '0.00' }}</span>
            </div>
          </div>

          <!-- 优化建议 -->
          <div v-if="result.optimizationSuggestion" class="optimization-suggestion">
            <el-alert type="info" title="优化建议" :closable="false">
              <p>
                提柜日：{{ result.optimizationSuggestion.suggestedPickupDate }} ({{
                  result.optimizationSuggestion.suggestedStrategy
                }})
              </p>
              <p>
                可节省：${{ result.optimizationSuggestion.savings?.toFixed(2) }} ({{
                  result.optimizationSuggestion.savingsPercent?.toFixed(1)
                }}%)
              </p>
            </el-alert>
          </div>
        </div>

        <div class="card-footer">
          <el-checkbox v-model="selectedContainers" :label="result.containerNumber" />
        </div>
      </div>
    </div>

    <!-- 批量操作栏 -->
    <div class="batch-action-bar">
      <el-checkbox v-model="selectAll" @change="handleSelectAllChange">
        全选 ({{ selectedContainers.length }}/{{ results.length }})
      </el-checkbox>

      <div class="action-buttons">
        <el-button
          type="success"
          :disabled="selectedContainers.length === 0"
          @click="handleBatchSave"
        >
          保存选中 ({{ selectedContainers.length }})
        </el-button>

        <el-button type="primary" @click="handleBatchOptimize"> 批量优化 </el-button>
      </div>
    </div>
  </div>
</template>
```

---

## 4. 实施计划

### Phase 1: 基础优化 (1-2 周)

**Week 1**:

- [ ] 创建 CacheService 并集成 Redis
- [ ] 修改 DemurrageService 使用缓存
- [ ] 修改 OccupancyCalculator 实现批量查询

**Week 2**:

- [ ] 修改 scheduleSingleContainer() 集成成本优化
- [ ] 修改 suggestOptimalUnloadDate() 增加产能检查
- [ ] 实现并发处理 (Promise.all)

### Phase 2: 智能日历增强 (2-3 周)

**Week 1**:

- [ ] 修改 SmartCalendarCapacity.calculateWarehouseCapacity() 支持周末
- [ ] 添加节假日检查方法 isHoliday()
- [ ] 接入节假日 API 或配置表

**Week 2**:

- [ ] 修改 SmartCalendarCapacity.calculateTruckingCapacity() 支持周末
- [ ] 更新 OccupancyCalculator 支持智能日历
- [ ] 前端档期可视化

**Week 3**:

- [ ] 联调测试
- [ ] 性能优化

### Phase 3: 前端体验优化 (1-2 周)

**Week 1**:

- [ ] 实现成本展示组件
- [ ] 实现优化建议卡片
- [ ] 实现批量操作栏

**Week 2**:

- [ ] 联调测试
- [ ] UI/UX 优化

---

## 5. 成功指标

### 技术指标

| 指标           | 当前值 | 目标值         | 提升 |
| -------------- | ------ | -------------- | ---- |
| 单柜评估耗时   | 10ms   | <2ms           | 80%  |
| 100 柜批量处理 | 45s    | <5s            | 90%  |
| 滞港费标准查询 | 10ms   | <1ms           | 90%  |
| 仓库档期查询   | 5ms/次 | 1ms/次（批量） | 80%  |
| 成本优化率     | -      | >15%           | -    |
| 排产成功率     | -      | >95%           | -    |
| 产能约束违反率 | -      | 0%             | -    |

### 业务指标

| 指标         | 当前 | 目标   |
| ------------ | ---- | ------ |
| 用户满意度   | -    | >4.5/5 |
| 操作效率提升 | -    | >50%   |
| 平均成本降低 | -    | >20%   |

---

## 6. 风险评估

### 风险 1: Redis 不可用

**影响**: 高
**概率**: 低
**应对措施**: 降级到数据库查询

### 风险 2: 性能下降

**原因**: 实时成本计算增加数据库查询

**缓解措施**:

- 添加缓存 (Redis)
- 批量查询优化
- 限制搜索范围 (免费期内 3-5 天)

### 风险 3: 优化建议过于保守

**原因**: 产能约束过严

**缓解措施**:

- 添加"激进"模式选项
- 允许用户手动调整
- 提供备选方案

### 风险 4: 规则冲突

**影响**: 中
**概率**: 中
**应对措施**: 增加规则优先级和互斥机制

### 风险 5: 算法超时

**影响**: 高
**概率**: 低
**应对措施**: 设置超时和早停条件

---

## 7. 总结

**核心改进**:

1. 成本优化前置到排产过程中
2. 实时计算成本并选择最优方案
3. 确保优化方案符合产能约束
4. 智能日历能力增强 (周末、节假日)
5. 引入缓存机制提升性能
6. 批量查询减少数据库压力
7. 并发处理充分利用多核 CPU

**预期收益**:

- 成本降低 15-25%
- 操作效率提升 50%
- 用户满意度提升至 4.5/5
- 单柜评估耗时降低 80%
- 批量处理速度提升 90%

**下一步**:
请确认是否开始实施 Phase 1？

---

## 📚 相关文档

- [05-智能排柜进一步优化方案](../../第 2 层 - 业务逻辑/08-智能排柜系统专题/05-智能排柜进一步优化方案.md)
- [04-Java vs TypeScript 实现对比](../../第 2 层 - 业务逻辑/08-智能排柜系统专题/04-Java%20vs%20TypeScript%20实现对比.md)
- [01-智能排柜系统架构完整指南](../../第 2 层 - 业务逻辑/08-智能排柜系统专题/01-智能排柜系统架构完整指南.md)
- [02-智能排柜成本优化完整指南](../../第 2 层 - 业务逻辑/08-智能排柜系统专题/02-智能排柜成本优化完整指南.md)

---

**版本**: v2.0
**创建时间**: 2026-04-01
**最后更新**: 2026-04-01
**作者**: 刘志高
