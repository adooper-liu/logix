---
name: logix-modular-architecture
description: LogiX 模块化架构指南 - 模块拆分、依赖注入、领域驱动设计
version: 1.0.0
updated: 2026-06-23
trigger: manual
tags: [architecture, modular, ddd, design]
---

# LogiX 模块化架构指南

## 核心理念

**"大业务拆解为小函数，复杂逻辑拆分为独立模块"**

---

## 📐 模块设计原则

### 原则一：单一职责（Single Responsibility）

每个模块只解决一个问题：

```
❌ 错误：ContainerService 包含所有货柜相关逻辑
✅ 正确：拆分为多个小模块
   - ContainerService: 协调层
   - ContainerValidator: 数据验证
   - ContainerMapper: 数据转换
   - ContainerStatusCalculator: 状态计算
   - ContainerFeeCalculator: 费用计算
```

### 原则二：依赖倒置（Dependency Inversion）

高层模块不依赖低层模块实现：

```typescript
// ❌ 错误：直接依赖具体实现
import { CostCalculator } from './CostCalculator';

class SchedulingService {
  private calculator = new CostCalculator();
}

// ✅ 正确：依赖接口
import { ICostCalculator } from '../interfaces/ICostCalculator';

class SchedulingService {
  constructor(private calculator: ICostCalculator) {}
}
```

### 原则三：纯函数优先（Pure Functions First）

无副作用的函数更易测试和维护：

```typescript
// ✅ 纯函数：输入确定，输出确定，无副作用
function calculateDemurrage(
  lastFreeDate: Date,
  currentDate: Date,
  dailyRate: number
): number {
  const days = differenceInDays(currentDate, lastFreeDate);
  return Math.max(0, days) * dailyRate;
}

// ❌ 非纯函数：依赖外部状态
async function calculateDemurrage(containerId: string): Promise<number> {
  const container = await repo.findOne(containerId); // 数据库IO
  const config = await getConfig(); // 配置IO
  // ...
}
```

---

## 🏗️ 模块分层架构

### 后端分层

```
backend/src/
├── interfaces/              # 接口定义层
│   ├── ICostCalculator.ts
│   ├── IDataAdapter.ts
│   └── IStatusCalculator.ts
│
├── domain/                  # 领域层（纯业务逻辑）
│   ├── container/
│   │   ├── ContainerEntity.ts       # 领域实体
│   │   ├── ContainerValidator.ts    # 验证规则
│   │   └── ContainerStatus.ts       # 状态机
│   └── scheduling/
│       ├── SchedulingRule.ts        # 排柜规则
│       └── CostModel.ts             # 成本模型
│
├── services/                # 服务层（编排业务）
│   ├── container/
│   │   ├── ContainerService.ts      # 协调层
│   │   ├── ContainerQueryService.ts # 查询服务
│   │   └── ContainerCommandService.ts # 命令服务
│   └── scheduling/
│       ├── SchedulingOrchestrator.ts # 编排器
│       ├── WarehouseSelector.ts     # 仓库选择
│       └── TruckingSelector.ts      # 车队选择
│
├── infrastructure/          # 基础设施层
│   ├── repositories/        # 数据访问
│   │   ├── ContainerRepository.ts
│   │   └── WarehouseRepository.ts
│   ├── adapters/            # 外部适配器
│   │   ├── FeiTuoAdapter.ts
│   │   └── LogisticsPathAdapter.ts
│   └── external-api/        # 外部API客户端
│       └── FeiTuoClient.ts
│
├── application/             # 应用层
│   ├── controllers/         # API控制器（薄层）
│   ├── dtos/               # 数据传输对象
│   └── mappers/            # DTO ↔ Entity 映射
│
└── utils/                   # 工具层（纯函数）
    ├── dateUtils.ts
    ├── calculationUtils.ts
    └── validationUtils.ts
```

### 前端分层

```
frontend/src/
├── composables/             # 组合式函数（业务逻辑）
│   ├── useContainerData.ts
│   ├── useScheduling.ts
│   └── useDemurrageCalc.ts
│
├── services/                # API服务层
│   ├── containerApi.ts
│   └── schedulingApi.ts
│
├── stores/                  # 状态管理
│   ├── containerStore.ts
│   └── schedulingStore.ts
│
├── components/              # UI组件
│   ├── container/
│   │   ├── ContainerList.vue
│   │   ├── ContainerCard.vue
│   │   └── ContainerDetail.vue
│   └── scheduling/
│       ├── GanttChart.vue
│       └── CostComparison.vue
│
└── utils/                   # 工具函数
    ├── formatters.ts
    └── validators.ts
```

---

## 🔨 模块拆分实战

### 案例一：智能排柜模块重构

#### 重构前（上帝类）

```typescript
// ❌ 错误：1000+行的巨型Service
class IntelligentSchedulingService {
  async schedule(container: Container) {
    // 1. 获取候选仓库（50行）
    // 2. 获取候选车队（50行）
    // 3. 计算每个方案的成本（200行）
    // 4. 检查容量约束（100行）
    // 5. 排序和推荐（100行）
    // 6. 保存结果（50行）
    // ... 总共 1000+ 行
  }
}
```

#### 重构后（模块化）

```typescript
// ✅ 正确：拆分为独立模块

// 1. 接口定义
interface ISchedulingEngine {
  generateOptions(input: SchedulingInput): Promise<SchedulingOption[]>;
}

interface IWarehouseSelector {
  selectCandidates(country: string, port: string): Promise<Warehouse[]>;
}

interface ITruckingSelector {
  selectCandidates(warehouse: Warehouse): Promise<TruckingCompany[]>;
}

interface ICostCalculator {
  calculate(option: SchedulingOption): Promise<number>;
}

// 2. 领域层：纯业务逻辑
class WarehouseSelector implements IWarehouseSelector {
  async selectCandidates(country: string, port: string): Promise<Warehouse[]> {
    // 只负责选择仓库，不超过50行
    const mappings = await this.mappingRepo.findByPort(port);
    return mappings.map(m => m.warehouse);
  }
}

class TruckingSelector implements ITruckingSelector {
  async selectCandidates(warehouse: Warehouse): Promise<TruckingCompany[]> {
    // 只负责选择车队
    const mappings = await this.mappingRepo.findByWarehouse(warehouse.code);
    return mappings.map(m => m.truckingCompany);
  }
}

class CostCalculator implements ICostCalculator {
  calculate(option: SchedulingOption): number {
    // 纯函数：计算成本
    const baseFreight = this.getBaseFreight(option);
    const yardFee = this.calculateYardFee(option);
    const storageFee = this.calculateStorageFee(option);
    return baseFreight + yardFee + storageFee;
  }
}

// 3. 服务层：编排业务
class SchedulingOrchestrator implements ISchedulingEngine {
  constructor(
    private warehouseSelector: IWarehouseSelector,
    private truckingSelector: ITruckingSelector,
    private costCalculator: ICostCalculator
  ) {}

  async generateOptions(input: SchedulingInput): Promise<SchedulingOption[]> {
    // 步骤1：选择仓库
    const warehouses = await this.warehouseSelector.selectCandidates(
      input.countryCode,
      input.portCode
    );

    // 步骤2：为每个仓库选择车队
    const options: SchedulingOption[] = [];
    for (const warehouse of warehouses) {
      const truckings = await this.truckingSelector.selectCandidates(warehouse);
      
      // 步骤3：生成方案
      for (const trucking of truckings) {
        const option: SchedulingOption = {
          warehouse,
          trucking,
          unloadDate: input.pickupDate,
          strategy: trucking.hasYard ? 'Drop' : 'Live'
        };

        // 步骤4：计算成本
        option.totalCost = await this.costCalculator.calculate(option);
        options.push(option);
      }
    }

    // 步骤5：排序并返回Top N
    return options
      .sort((a, b) => a.totalCost - b.totalCost)
      .slice(0, 10);
  }
}
```

**优势**：
- 每个模块 < 100 行
- 可独立单元测试
- 易于替换实现（如更换成本计算算法）
- 清晰的依赖关系

---

### 案例二：滞港费计算模块重构

#### 重构前

```typescript
// ❌ 错误：混杂在 DemurrageService 中
class DemurrageService {
  async calculate(containerId: string) {
    const container = await repo.findOne(containerId);
    const portOp = await portRepo.findByContainer(containerId);
    
    // 内联计算逻辑（200行）
    let lastFreeDate = portOp.last_free_date;
    if (!lastFreeDate) {
      // 推算逻辑...
    }
    
    const freeDays = this.getFreeDays(container.shippingCompany);
    const dailyRate = this.getDailyRate(container.destinationPort);
    
    // 更多内联逻辑...
  }
}
```

#### 重构后

```typescript
// ✅ 正确：拆分为独立模块

// 1. 领域层：纯计算逻辑
class LastFreeDateCalculator {
  /**
   * 计算最后免费日期
   */
  calculate(portOperation: PortOperation): Date {
    if (portOperation.lastFreeDate) {
      return portOperation.lastFreeDate;
    }
    
    // 根据模式推算
    if (portOperation.lastFreeDateMode === 'BY_ARRIVAL') {
      return addDays(portOperation.eta, portOperation.freeStorageDays);
    } else {
      return addDays(portOperation.dischargedTime, portOperation.freeDetentionDays);
    }
  }
}

class DemurrageRateResolver {
  /**
   * 解析滞港费率
   */
  resolve(container: Container): DemurrageRate {
    // 从配置表或字典表读取
    return this.rateRepo.findByConditions({
      country: container.country,
      port: container.port,
      shippingCompany: container.shippingCompany
    });
  }
}

// 2. 纯函数：计算滞港费
function calculateDemurrageAmount(
  lastFreeDate: Date,
  currentDate: Date,
  dailyRate: number
): number {
  const overdueDays = differenceInDays(currentDate, lastFreeDate);
  return Math.max(0, overdueDays) * dailyRate;
}

// 3. 服务层：编排
class DemurrageService {
  constructor(
    private dateCalculator: LastFreeDateCalculator,
    private rateResolver: DemurrageRateResolver
  ) {}

  async calculate(containerId: string): Promise<DemurrageResult> {
    const container = await this.containerRepo.findOne(containerId);
    const portOp = await this.portRepo.findByContainer(containerId);
    
    // 步骤1：计算最后免费日期
    const lastFreeDate = this.dateCalculator.calculate(portOp);
    
    // 步骤2：解析费率
    const rate = this.rateResolver.resolve(container);
    
    // 步骤3：计算金额（纯函数）
    const amount = calculateDemurrageAmount(
      lastFreeDate,
      new Date(),
      rate.dailyRate
    );
    
    return {
      lastFreeDate,
      overdueDays: differenceInDays(new Date(), lastFreeDate),
      dailyRate: rate.dailyRate,
      totalAmount: amount
    };
  }
}
```

---

## 🧪 单元测试策略

### 测试金字塔

```
        /\
       /  \      E2E Tests (10%)
      /----\
     /      \    Integration Tests (20%)
    /--------\
   /          \  Unit Tests (70%)
  /------------\
```

### 单元测试示例

```typescript
// 测试纯函数
describe('calculateDemurrageAmount', () => {
  it('should return 0 when not overdue', () => {
    const lastFreeDate = new Date('2026-07-01');
    const currentDate = new Date('2026-06-25');
    const dailyRate = 100;
    
    const result = calculateDemurrageAmount(lastFreeDate, currentDate, dailyRate);
    
    expect(result).toBe(0);
  });

  it('should calculate correct amount when overdue', () => {
    const lastFreeDate = new Date('2026-06-20');
    const currentDate = new Date('2026-06-25');
    const dailyRate = 100;
    
    const result = calculateDemurrageAmount(lastFreeDate, currentDate, dailyRate);
    
    expect(result).toBe(500); // 5天 × 100
  });
});

// 测试带依赖的Service（使用Mock）
describe('DemurrageService', () => {
  let service: DemurrageService;
  let mockDateCalculator: jest.Mocked<LastFreeDateCalculator>;
  let mockRateResolver: jest.Mocked<DemurrageRateResolver>;

  beforeEach(() => {
    mockDateCalculator = {
      calculate: jest.fn()
    } as any;
    
    mockRateResolver = {
      resolve: jest.fn()
    } as any;
    
    service = new DemurrageService(mockDateCalculator, mockRateResolver);
  });

  it('should calculate demurrage correctly', async () => {
    // Arrange
    mockDateCalculator.calculate.mockReturnValue(new Date('2026-06-20'));
    mockRateResolver.resolve.mockReturnValue({ dailyRate: 100 });
    
    // Act
    const result = await service.calculate('CONTAINER001');
    
    // Assert
    expect(result.totalAmount).toBeGreaterThan(0);
    expect(mockDateCalculator.calculate).toHaveBeenCalled();
  });
});
```

---

## 📦 模块间通信规范

### 1. 同步调用（同一进程）

```typescript
// 通过接口注入依赖
class SchedulingService {
  constructor(
    private warehouseSelector: IWarehouseSelector,
    private costCalculator: ICostCalculator
  ) {}
  
  async schedule(input: SchedulingInput) {
    const warehouses = await this.warehouseSelector.select(input);
    const costs = await Promise.all(
      warehouses.map(w => this.costCalculator.calculate(w))
    );
    // ...
  }
}
```

### 2. 异步事件（跨模块解耦）

```typescript
// 发布事件
class ContainerService {
  constructor(private eventBus: EventBus) {}
  
  async updateStatus(containerId: string, status: string) {
    await this.repo.updateStatus(containerId, status);
    
    // 发布事件（其他模块可订阅）
    this.eventBus.publish('container.status.changed', {
      containerId,
      status,
      timestamp: new Date()
    });
  }
}

// 订阅事件
class AlertService {
  constructor(private eventBus: EventBus) {
    this.eventBus.subscribe('container.status.changed', this.handleStatusChange);
  }
  
  private handleStatusChange(event: StatusChangedEvent) {
    if (event.status === 'expired') {
      this.sendAlert(event.containerId);
    }
  }
}
```

### 3. API调用（跨服务）

```typescript
// 通过HTTP客户端
class LogisticsPathClient {
  constructor(private httpClient: AxiosInstance) {}
  
  async getPath(containerNumber: string): Promise<LogisticsPath> {
    const response = await this.httpClient.get(
      `/api/v1/logistics-path/container/${containerNumber}`
    );
    return response.data;
  }
}
```

---

## ⚡ 性能优化建议

### 1. 批量操作

```typescript
// ❌ 错误：循环中逐个查询
for (const container of containers) {
  const status = await this.getStatus(container.id);
}

// ✅ 正确：批量查询
const statuses = await this.getStatusBatch(containers.map(c => c.id));
```

### 2. 缓存热点数据

```typescript
class WarehouseCache {
  private cache = new Map<string, Warehouse>();
  
  async get(code: string): Promise<Warehouse> {
    if (this.cache.has(code)) {
      return this.cache.get(code)!;
    }
    
    const warehouse = await this.repo.findOne(code);
    this.cache.set(code, warehouse);
    return warehouse;
  }
}
```

### 3. 延迟加载

```typescript
// 只在需要时加载昂贵资源
class CostCalculator {
  private rateTable?: RateTable;
  
  private async getRateTable(): Promise<RateTable> {
    if (!this.rateTable) {
      this.rateTable = await this.loadRateTable();
    }
    return this.rateTable;
  }
}
```

---

## 🔄 重构步骤

### Step 1: 识别上帝类

```bash
# 查找超过500行的文件
find backend/src/services -name "*.ts" -exec wc -l {} + | sort -rn | head -10
```

### Step 2: 提取接口

```typescript
// 从现有代码中提取接口
interface IExtractedModule {
  method1(): Promise<Result>;
  method2(param: Param): Result;
}
```

### Step 3: 创建新模块

```typescript
// 新建独立文件
class ExtractedModule implements IExtractedModule {
  // 迁移逻辑到这里
}
```

### Step 4: 注入依赖

```typescript
// 在原Service中注入新模块
class OriginalService {
  constructor(private extracted: IExtractedModule) {}
  
  async originalMethod() {
    return this.extracted.method1();
  }
}
```

### Step 5: 编写测试

```typescript
// 为新模块编写单元测试
describe('ExtractedModule', () => {
  // ...
});
```

### Step 6: 删除旧代码

```typescript
// 确认测试通过后，删除原Service中的内联代码
```

---

## 📊 模块质量指标

| 指标 | 目标值 | 检查方式 |
|------|--------|----------|
| 单个文件行数 | ≤ 300 | `wc -l` |
| 单个函数行数 | ≤ 50 | ESLint |
| 圈复杂度 | ≤ 10 | ESLint complexity |
| 依赖数量 | ≤ 5 | 人工审查 |
| 单元测试覆盖率 | ≥ 80% | Jest/Vitest |
| 公共方法数 | ≤ 10 | 人工审查 |

---

**版本**: v1.0  
**最后更新**: 2026-06-23  
**参考**: Clean Architecture, SOLID Principles
