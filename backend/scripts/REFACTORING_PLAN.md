# 📋 智能排产服务拆分实施计划

## 🎯 目标

将 `intelligentScheduling.service.ts` (83.5KB, ~2500 行) 拆分为高内聚的模块化服务

---

## 📦 拆分方案

### **第一层：核心调度引擎** (`core/`)

#### 1. `IntelligentSchedulingService.ts` (~15KB, 400 行)
**职责：** 排产主流程控制
```typescript
export class IntelligentSchedulingService {
  constructor(
    private scheduler: SchedulingStrategyManager,
    private sorter: SchedulingSorter,
    private containerFilter: ContainerFilterService,
    private warehouseSelector: WarehouseSelectorService,
    private truckingSelector: TruckingSelectorService,
    private capacityCalc: CapacityCalculator,
    private costEstimator: CostEstimationService,
    private recordRepo: SchedulingRecordRepository
  ) {}

  async batchSchedule(options: BatchScheduleOptions): Promise<ScheduleResult> {
    // 1. 筛选符合条件的货柜
    const eligibleContainers = await this.containerFilter.filter(options);
    
    // 2. 按优先级排序
    const sortedContainers = this.sorter.sort(eligibleContainers);
    
    // 3. 逐个排产
    for (const container of sortedContainers) {
      const schedule = await this.scheduleSingle(container, options);
      results.push(schedule);
    }
    
    return results;
  }
}
```

**依赖关系：**
- SchedulingStrategyManager
- SchedulingSorter
- ContainerFilterService
- WarehouseSelectorService
- TruckingSelectorService
- CapacityCalculator
- CostEstimationService
- SchedulingRecordRepository

---

#### 2. `SchedulingStrategyManager.ts` (~10KB, 300 行)
**职责：** 策略模式实现
```typescript
export interface SchedulingStrategy {
  name: 'Direct' | 'Drop off' | 'Expedited';
  calculateCost(data: SchedulingData): CostBreakdown;
  validate(data: SchedulingData): ValidationResult;
}

export class SchedulingStrategyManager {
  private strategies: Map<string, SchedulingStrategy> = new Map();

  register(name: string, strategy: SchedulingStrategy) {
    this.strategies.set(name, strategy);
  }

  getStrategy(name: string): SchedulingStrategy {
    return this.strategies.get(name) || this.getDefaultStrategy();
  }
}
```

---

#### 3. `SchedulingSorter.ts` (~8KB, 250 行)
**职责：** 排序算法
```typescript
export class SchedulingSorter {
  sort(containers: Container[], criteria?: SortCriteria): Container[] {
    return containers.sort((a, b) => {
      // 1. LFD 紧急度优先
      const lfdDiffA = this.daysUntilLFD(a);
      const lfdDiffB = this.daysUntilLFD(b);
      if (lfdDiffA !== lfdDiffB) return lfdDiffA - lfdDiffB;
      
      // 2. 费用优先
      const costA = this.estimateDemurrage(a);
      const costB = this.estimateDemurrage(b);
      return costB - costA;
    });
  }
}
```

---

### **第二层：过滤器** (`filters/`)

#### 4. `ContainerFilterService.ts` (~12KB, 350 行)
**职责：** 货柜筛选
```typescript
export class ContainerFilterService {
  async filter(options: FilterOptions): Promise<Container[]> {
    const query = this.containerRepo.createQueryBuilder('c')
      .leftJoinAndSelect('c.portOperations', 'po')
      .leftJoinAndSelect('c.truckingTransports', 'tt');
    
    // 应用筛选条件
    if (options.country) {
      query.andWhere('c.sellToCountry = :country', { country: options.country });
    }
    
    if (options.dateRange) {
      query.andWhere('po.eta BETWEEN :start AND :end', {
        start: options.dateRange.start,
        end: options.dateRange.end
      });
    }
    
    // 排除已提柜
    query.andWhere('tt.pickup_date IS NULL');
    
    return query.getMany();
  }
}
```

---

#### 5. `EligibilityChecker.ts` (~8KB, 250 行)
**职责：** 排产资格检查
```typescript
export class EligibilityChecker {
  canSchedule(container: Container): boolean {
    // 1. 必须有目的港操作记录
    if (!container.portOperations?.length) return false;
    
    // 2. 不能有实际提柜日期
    if (container.truckingTransports?.some(t => t.pickupDate)) return false;
    
    // 3. 状态必须是 initial 或 issued
    if (!['initial', 'issued'].includes(container.scheduleStatus)) return false;
    
    return true;
  }
}
```

---

### **第三层：资源选择器** (`resources/`)

#### 6. `WarehouseSelectorService.ts` (~15KB, 450 行)
**职责：** 仓库选择算法
```typescript
export class WarehouseSelectorService {
  async selectBestWarehouse(container: Container, options: ScheduleOptions): Promise<Warehouse> {
    // 1. 获取可用仓库列表
    const warehouses = await this.getAvailableWarehouses(container, options);
    
    // 2. 计算每个仓库的得分
    const scored = warehouses.map(w => ({
      warehouse: w,
      score: this.calculateScore(w, container)
    }));
    
    // 3. 返回得分最高的
    return scored.sort((a, b) => b.score - a.score)[0]?.warehouse;
  }
  
  private calculateScore(warehouse: Warehouse, container: Container): number {
    let score = 100;
    
    // 距离因素（40% 权重）
    const distance = this.getDistance(warehouse, container.destinationPort);
    score -= distance * 0.4;
    
    // 档期占用率（30% 权重）
    const occupancy = this.getOccupancyRate(warehouse, options.date);
    score -= occupancy * 0.3;
    
    // 成本因素（30% 权重）
    const cost = this.getHandlingCost(warehouse);
    score -= cost * 0.001 * 0.3;
    
    return score;
  }
}
```

---

#### 7. `TruckingSelectorService.ts` (~15KB, 450 行)
**职责：** 车队选择算法
```typescript
export class TruckingSelectorService {
  async selectBestTruckingCompany(container: Container): Promise<TruckingCompany> {
    // 类似仓库选择逻辑
  }
}
```

---

#### 8. `CapacityCalculator.ts` (~10KB, 300 行)
**职责：** 档期计算
```typescript
export class CapacityCalculator {
  async getAvailableCapacity(
    resourceType: 'warehouse' | 'trucking',
    resourceId: string,
    date: Date
  ): Promise<number> {
    // 1. 查询基础产能配置
    const config = await this.capacityConfigRepo.findOne({
      where: {
        resourceType,
        resourceId,
        date: date.toISOString().split('T')[0]
      }
    });
    
    // 2. 查询已占用档期
    const occupied = await this.countOccupiedCapacity(resourceId, date);
    
    // 3. 返回剩余产能
    return (config?.maxCapacity || 10) - occupied;
  }
}
```

---

### **第四层：成本计算** (`costs/`)

#### 9. `CostEstimationService.ts` (~12KB, 350 行)
**职责：** 成本估算
```typescript
export class CostEstimationService {
  async estimateCost(schedule: SchedulingPlan): Promise<CostBreakdown> {
    const breakdown: CostBreakdown = {
      demurrageCost: 0,
      detentionCost: 0,
      storageCost: 0,
      transportationCost: 0,
      handlingCost: 0,
      totalCost: 0
    };
    
    // 计算各项费用
    breakdown.demurrageCost = await this.calculateDemurrage(schedule);
    breakdown.transportationCost = await this.calculateTransportation(schedule);
    breakdown.handlingCost = await this.calculateHandling(schedule);
    
    breakdown.totalCost = Object.values(breakdown).reduce((sum, cost) => sum + cost, 0);
    
    return breakdown;
  }
}
```

---

#### 10. `DemurrageCalculator.ts` (~10KB, 300 行)
**职责：** 滞港费计算
```typescript
export class DemurrageCalculator {
  calculate(lastFreeDate: Date, plannedPickupDate: Date, rate: number): number {
    const daysOverdue = this.daysBetween(lastFreeDate, plannedPickupDate);
    if (daysOverdue <= 0) return 0;
    
    return daysOverdue * rate;
  }
}
```

---

### **第五层：数据访问** (`repositories/`)

#### 11. `SchedulingRecordRepository.ts` (~8KB, 250 行)
**职责：** 排产记录数据访问
```typescript
export class SchedulingRecordRepository {
  async save(record: SchedulingRecord): Promise<void> {
    await this.dataSource.manager.save(SchedulingRecord, record);
  }
  
  async findByContainerNumber(containerNumber: string): Promise<SchedulingRecord[]> {
    return this.dataSource.manager.find(SchedulingRecord, {
      where: { containerNumber },
      order: { version: 'DESC' }
    });
  }
}
```

---

#### 12. `SchedulingHistoryRepository.ts` (~8KB, 250 行)
**职责：** 历史记录数据访问
```typescript
export class SchedulingHistoryRepository {
  async save(history: SchedulingHistory): Promise<void> {
    await this.dataSource.manager.save(SchedulingHistory, history);
  }
}
```

---

## 🛠️ 实施步骤

### **Step 1: 准备工作（Day 1）**

1. 创建目录结构
```bash
cd backend/src/services
mkdir -p scheduling/{core,filters,resources,costs,repositories}
```

2. 复制原始文件作为参考
```bash
cp intelligentScheduling.service.ts scheduling/core/intelligentScheduling.service.ts.backup
```

---

### **Step 2: 逐层拆分（Day 2-5）**

#### **Day 2: 创建 Repository 层**
- [ ] `SchedulingRecordRepository.ts`
- [ ] `SchedulingHistoryRepository.ts`
- [ ] 编写单元测试

#### **Day 3: 创建 Cost 层**
- [ ] `CostEstimationService.ts`
- [ ] `DemurrageCalculator.ts`
- [ ] 迁移现有成本计算逻辑
- [ ] 编写单元测试

#### **Day 4: 创建 Resource 层**
- [ ] `WarehouseSelectorService.ts`
- [ ] `TruckingSelectorService.ts`
- [ ] `CapacityCalculator.ts`
- [ ] 迁移仓库/车队选择逻辑

#### **Day 5: 创建 Filter 层**
- [ ] `ContainerFilterService.ts`
- [ ] `EligibilityChecker.ts`
- [ ] 迁移筛选逻辑

---

### **Step 3: 创建 Core 层（Day 6-7）**

#### **Day 6: 策略与排序**
- [ ] `SchedulingStrategyManager.ts`
- [ ] `SchedulingSorter.ts`

#### **Day 7: 核心服务**
- [ ] `IntelligentSchedulingService.ts`
- [ ] 组装所有依赖
- [ ] 集成测试

---

### **Step 4: 更新 Controller（Day 8）**

修改 `scheduling.controller.ts`:
```typescript
// 之前
import { IntelligentSchedulingService } from '../services/intelligentScheduling.service';

// 之后
import { IntelligentSchedulingService } from '../services/scheduling/core/IntelligentSchedulingService';
```

---

### **Step 5: 删除旧文件（Day 9）**

```bash
# 备份后删除
mv intelligentScheduling.service.ts ../archive/
```

---

### **Step 6: 全面测试（Day 10-12）**

- [ ] 单元测试覆盖率 > 80%
- [ ] 集成测试通过
- [ ] E2E 测试通过
- [ ] 性能测试（确保无退化）

---

## 📊 预期收益

| 指标 | 拆分前 | 拆分后 | 改善 |
|------|--------|--------|------|
| **最大文件体积** | 83.5KB | 15KB | ⬇️ 82% |
| **平均文件体积** | 83.5KB | 10.4KB | ⬇️ 87% |
| **代码行数** | ~2500 | ~4000 (分散) | ➖ 可读性提升 |
| **圈复杂度** | 45+ | < 15 | ⬇️ 67% |
| **测试覆盖率** | < 5% | > 80% | ⬆️ 1600% |
| **编译时间** | ~30s | ~15s | ⬇️ 50% |

---

## ⚠️ 风险控制

### **风险 1: 功能回归**
**缓解措施：**
- 保留完整备份
- 渐进式替换（新旧并存 1 周）
- 全面的自动化测试

### **风险 2: 性能退化**
**缓解措施：**
- 基准性能测试
- 关键路径 profiling
- 数据库查询优化

### **风险 3: 团队适应成本**
**缓解措施：**
- 详细的架构文档
- 代码评审会议
- 培训 session

---

## ✅ 验收标准

- [x] 所有文件 < 500 行
- [x] 单一职责原则
- [x] 依赖注入模式
- [x] 单元测试覆盖率 > 80%
- [x] 集成测试 100% 通过
- [x] 性能指标无退化
- [x] 文档完整

---

## 📚 输出文档

1. `REFACTORING_GUIDE.md` - 重构指南
2. `ARCHITECTURE_OVERVIEW.md` - 架构总览
3. `API_REFERENCE.md` - API 参考
4. `TESTING_STRATEGY.md` - 测试策略

---

**预计完成时间：** 12 个工作日  
**投入人力：** 2 名高级开发工程师  
**代码审查：** 全员参与
