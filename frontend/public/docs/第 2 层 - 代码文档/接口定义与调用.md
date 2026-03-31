# 接口定义与调用关系

## 一、API路由总览

### 1.1 路由架构

```
/api/
├── /                           # 根路由 - 服务信息
│
├── /containers/               # 货柜管理
│   ├── GET /                  # 获取货柜列表
│   ├── GET /statistics        # 获取统计数据
│   ├── GET /by-filter         # 条件筛选货柜
│   ├── GET /:id               # 获取详情
│   ├── POST /                 # 创建货柜
│   ├── PUT /:id               # 更新货柜
│   ├── DELETE /:id            # 删除货柜
│   ├── PATCH /:id/schedule    # 手工排柜
│   └── POST /update-statuses/batch  # 批量更新状态
│
├── /demurrage/                # 滞港费管理
│   ├── GET /standards         # 获取滞港费标准
│   ├── POST /standards        # 创建标准
│   ├── GET /summary           # 获取汇总
│   ├── GET /calculate/:id     # 计算单个货柜
│   └── POST /batch-compute    # 批量计算
│
├── /scheduling/               # 智能排柜
│   ├── POST /batch-schedule   # 批量排产
│   ├── POST /confirm         # 确认排产
│   ├── POST /optimize-cost   # 成本优化
│   ├── POST /evaluate-cost   # 成本评估
│   └── POST /schedule-preview # 排产预览
│
├── /import/                  # 数据导入
│   ├── POST /excel            # Excel导入
│   ├── POST /excel/batch     # 批量导入
│   └── POST /feituo-excel    # 飞驼Excel导入
│
├── /external/                # 外部数据
│   ├── POST /sync/:id        # 同步单个
│   ├── POST /sync/batch      # 批量同步
│   └── GET /events/:id       # 获取事件
│
├── /dict/                    # 字典管理
├── /customers/               # 客户管理
├── /countries/               # 国家管理
├── /logistics-path/          # 物流路径
├── /ai/                      # AI功能
└── /monitoring/              # 系统监控
```

---

## 二、模块接口定义

### 2.1 货柜管理模块

#### API接口

| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 获取货柜列表 | GET | `/api/containers/` | 分页查询 |
| 获取统计数据 | GET | `/api/containers/statistics` | 统计卡片数据 |
| 条件筛选 | GET | `/api/containers/by-filter` | 按到港/ETA/计划提柜筛选 |
| 获取详情 | GET | `/api/containers/:id` | 货柜详情 |
| 创建货柜 | POST | `/api/containers/` | 新增货柜 |
| 更新货柜 | PUT | `/api/containers/:id` | 修改货柜 |
| 删除货柜 | DELETE | `/api/containers/:id` | 删除货柜 |
| 手工排柜 | PATCH | `/api/containers/:id/schedule` | 更新计划日期 |
| 更新状态 | POST | `/api/containers/update-statuses/batch` | 批量更新状态 |

#### 前端Service接口

```typescript
// services/container.ts
export interface ContainerFilters {
  page?: number;
  pageSize?: number;
  search?: string;
  logisticsStatus?: string[];
  destinationPort?: string;
  country?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface Container {
  containerNumber: string;
  containerTypeCode?: string;
  logisticsStatus: string;
  etaDestPort?: string;
  ataDestPort?: string;
  lastFreeDate?: string;
  // ... 50+ 字段
}

// 核心方法
getContainers(filters: ContainerFilters): Promise<PaginatedResponse<Container>>
getContainerById(id: string): Promise<Container>
getContainersByFilter(filterCondition: string, startDate?: string, endDate?: string): Promise<Container[]>
updateSchedule(containerNumber: string, schedule: ScheduleData): Promise<Container>
```

#### 调用关系

```
前端调用                    后端路由                    控制器方法
─────────────────────────────────────────────────────────────────
containerService.getContainers()
    │                          GET /containers/
    │                              │
    └──────────────────────────────┤
                                   ▼
                          containerController.getContainers()
                                   │
                                   ▼
                          containerService.getContainers()
                                   │
                                   ▼
                          ContainerRepository.find()
```

---

### 2.2 滞港费模块

#### API接口

| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 获取标准列表 | GET | `/api/demurrage/standards` | 滞港费标准 |
| 创建标准 | POST | `/api/demurrage/standards` | 新增标准 |
| 获取汇总 | GET | `/api/demurrage/summary` | 费用汇总 |
| 计算单个 | GET | `/api/demurrage/calculate/:id` | 实时计算 |
| 批量计算 | POST | `/api/demurrage/batch-compute-records` | 批量计算 |
| 诊断匹配 | GET | `/api/demurrage/diagnose/:id` | 匹配诊断 |
| 批量回写 | POST | `/api/demurrage/batch-write-back` | 写回数据库 |

#### 前端Service接口

```typescript
// services/demurrage.ts
export interface DemurrageStandard {
  id?: number;
  overseasCompanyCode: string;
  destinationPortCode: string;
  shippingCompanyCode: string;
  freightForwarderCode: string;
  chargeTypeCode: string;
  chargeName: string;
  freeDays: number;
  freeDaysBasis: '自然日' | '工作日';
  calculationBasis: '按到港' | '按卸船';
  rate: number;
  currency: string;
}

export interface CalculationDates {
  etaDestPort?: string;
  ataDestPort?: string;
  dischargeDate?: string;
  plannedPickupDate?: string;
  lastFreeDate?: string;
}

export interface DemurrageCalculationResponse {
  containerNumber: string;
  calculationMode: 'actual' | 'forecast';
  matchedStandard?: MatchedDemurrageStandard;
  items: DemurrageItemResult[];
  totalAmount: number;
  calculationDates: CalculationDates;
}

// 核心方法
calculateDemurrage(containerNumber: string, options?: CalculationOptions): Promise<DemurrageCalculationResponse>
getStandards(): Promise<DemurrageStandard[]>
batchCompute(): Promise<BatchResult>
```

#### 调用关系

```
前端调用                         后端路由                        控制器方法
──────────────────────────────────────────────────────────────────────────────
demurrageService.calculateDemurrage()
    │                            GET /demurrage/calculate/:id
    │                                │
    └────────────────────────────────┤
                                     ▼
                            demurrageController.calculateForContainer()
                                     │
                                     ▼
                            demurrageService.calculateForContainer()
                                     │
           ┌─────────────────────────┼─────────────────────────┐
           ▼                         ▼                         ▼
    calculateSingleDemurrage()  calculateStorageCharge()   calculateDetention()
           │                         │                         │
           └─────────────────────────┼─────────────────────────┘
                                     ▼
                              返回计算结果
```

---

### 2.3 智能排柜模块

#### API接口

| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 批量排产 | POST | `/api/scheduling/batch-schedule` | 批量排产 |
| 确认排产 | POST | `/api/scheduling/confirm` | 确认并保存 |
| 排产概览 | GET | `/api/scheduling/overview` | 排产统计 |
| 成本优化 | POST | `/api/scheduling/optimize-cost` | 优化成本 |
| 成本评估 | POST | `/api/scheduling/evaluate-cost` | 评估成本 |
| 排产预览 | POST | `/api/scheduling/:id/preview` | 预览不保存 |

#### 前端Service接口

```typescript
// services/costOptimizer.service.ts
export interface OptimizeRequest {
  containerNumbers: string[];
  warehouseCode: string;
  truckingCompanyId: string;
  basePickupDate: string;
  candidateDates?: string[];
  calculationMode?: 'actual' | 'forecast';
}

export interface Alternative {
  pickupDate: string;
  totalCost: number;
  demurrageCost: number;
  detentionCost: number;
  savings: number;
}

export interface OptimizationResult {
  containerNumber: string;
  basePickupDate: string;
  alternatives: Alternative[];
  recommendedDate: string;
  totalSavings: number;
}

// 核心方法
optimizeCost(request: OptimizeRequest): Promise<OptimizationResult>
evaluateCost(containers: Container[], params: CostParams): Promise<CostEvaluation>
schedulePreview(containers: Container[], params: ScheduleParams): Promise<PreviewResult>
```

#### 调用关系

```
前端调用                         后端路由                        控制器方法
──────────────────────────────────────────────────────────────────────────────
costOptimizer.optimizeCost()
    │                            POST /scheduling/optimize-cost
    │                                │
    └────────────────────────────────┤
                                     ▼
                            schedulingController.optimizeCost()
                                     │
                                     ▼
                            intelligentSchedulingService.calculateTotalCostWithPlannedDates()
                                     │
           ┌─────────────────────────┼─────────────────────────┐
           ▼                         ▼                         ▼
    calculateDemurrage()       calculateDetention()      calculateStorage()
           │                         │                         │
           └─────────────────────────┼─────────────────────────┘
                                     ▼
                              返回优化结果
```

---

### 2.4 数据导入模块

#### API接口

| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| Excel导入 | POST | `/api/import/excel` | 单条导入 |
| 批量导入 | POST | `/api/import/excel/batch` | 批量导入 |
| 滞港费标准 | POST | `/api/import/demurrage-standards` | 标准导入 |
| 飞驼Excel | POST | `/api/import/feituo-excel` | 飞驼格式 |

#### 前端Service接口

```typescript
// 配置接口定义见 configs/importMappings/
export interface ImportConfig {
  entityName: string;
  sheetName: string;
  fieldMappings: FieldMapping[];
  requiredFields: string[];
}

export interface ImportResult {
  success: boolean;
  imported: number;
  failed: number;
  errors: ImportError[];
}
```

---

### 2.5 外部数据模块

#### API接口

| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 同步单个 | POST | `/api/external/sync/:id` | 同步货柜 |
| 批量同步 | POST | `/api/external/sync/batch` | 批量同步 |
| 获取事件 | GET | `/api/external/events/:id` | 状态事件 |
| 清理过期 | POST | `/api/external/cleanup` | 清理数据 |
| 数据统计 | GET | `/api/external/stats` | 统计信息 |

---

## 三、接口参数规范

### 3.1 通用参数

| 参数 | 类型 | 说明 |
|------|------|------|
| page | number | 页码 (默认1) |
| pageSize | number | 每页数量 (默认20) |
| sortBy | string | 排序字段 |
| order | 'asc' \| 'desc' | 排序方向 |

### 3.2 货柜筛选参数

```typescript
// 统计维度筛选
type FilterCondition = 
  | 'arrivalToday'        // 今日到港
  | 'arrivedBeforeNotPickedUp'   // 之前到港未提柜
  | 'arrivedBeforePickedUp'      // 之前到港已提柜
  | 'arrivedAtTransit'           // 已到中转港
  | 'overduePlanned'             // 计划提柜逾期
  | 'todayPlanned'               // 今日计划提柜
  | 'plannedWithin3Days'         // 3日内计划提柜
  | 'plannedWithin7Days'         // 7日内计划提柜
  | 'pendingArrangement';        // 待安排
```

### 3.3 日期参数规范

```
日期格式: ISO 8601 (YYYY-MM-DD)
示例: 2026-03-28

查询参数:
- dateFrom: 开始日期
- dateTo: 结束日期
- startDate: 统计开始日期
- endDate: 统计结束日期
```

---

## 四、响应格式规范

### 4.1 成功响应

```typescript
// 分页响应
interface PaginatedResponse<T> {
  success: true;
  items: T[];
  count: number;
  page: number;
  pageSize: number;
  total: number;
}

// 单条响应
interface SingleResponse<T> {
  success: true;
  item: T;
}

// 操作响应
interface ActionResponse {
  success: true;
  message: string;
  affected?: number;
}
```

### 4.2 错误响应

```typescript
interface ErrorResponse {
  success: false;
  message: string;
  code?: string;
  details?: any;
}
```

---

## 五、调用链示例

### 5.1 货柜列表查询

```
User: 访问 Shipments 页面
    │
    ▼
Shipments.vue
    │ onMounted() → loadContainers()
    │
    ▼
containerService.getContainers({
  page: 1,
  pageSize: 20,
  search: '',
  filters: []
})
    │
    ▼
HTTP GET /api/containers/?page=1&pageSize=20
    │
    ▼
containerController.getContainers()
    │
    ▼
containerService.getContainers()
    │ - QueryBuilder 构建查询
    │ - 分页处理
    │ -  enrichContainersList()  enrich
    │
    ▼
ContainerRepository.find()
    │
    ▼
Database (PostgreSQL)
    │
    ▼
响应: { success, items[], count, page, total }
    │
    ▼
更新 Vue reactive state
    │
    ▼
UI 渲染表格
```

### 5.2 滞港费计算

```
User: 点击"计算滞港费"
    │
    ▼
DemurrageDetailSection.vue
    │ onMounted() → calculate()
    │
    ▼
demurrageService.calculateDemurrage(
  containerNumber: 'EMCU5397691',
  calculationMode: 'actual'
)
    │
    ▼
HTTP GET /api/demurrage/calculate/EMCU5397691
    │
    ▼
demurrageController.calculateForContainer()
    │
    ▼
demurrageService.calculateForContainer()
    │
    ├─ getContainerMatchParams()     ← 获取匹配参数
    ├─ calculateSingleDemurrage()    ← 计算滞港费
    ├─ calculateStorageCharge()     ← 计算堆存费
    ├─ calculateDetention()         ← 计算滞箱费
    │
    ▼
Database (查询标准表、货柜表)
    │
    ▼
响应: { items[], totalAmount, calculationDates }
    │
    ▼
更新 UI 显示费用明细
```

### 5.3 成本优化

```
User: 点击"成本优化"
    │
    ▼
OptimizationResultCard.vue
    │ onMounted() → optimize()
    │
    ▼
costOptimizer.optimizeCost({
  containerNumbers: ['EMCU5397691'],
  warehouseCode: 'UK-S005',
  truckingCompanyId: 'TC001',
  basePickupDate: '2026-03-28',
  candidateDates: ['2026-03-27', '2026-03-30', '2026-03-31']
})
    │
    ▼
HTTP POST /api/scheduling/optimize-cost
    │
    ▼
schedulingController.optimizeCost()
    │
    ▼
intelligentSchedulingService.calculateTotalCostWithPlannedDates()
    │ for each candidateDate:
    │   paramsOverride = { calculationDates.plannedPickupDate = candidateDate }
    │   calculateForContainer(..., { paramsOverride })
    │
    ▼
demurrageService.calculateForContainer()
    │
    ▼
返回各候选日期的费用明细
    │
    ▼
计算最优方案
    │
    ▼
UI 显示优化建议
```

---

## 六、前后端类型对应

### 6.1 货柜状态

```typescript
// 后端 (Enum)
enum LogisticsStatus {
  NOT_SHIPPED = 'not_shipped',
  SHIPPED = 'shipped',
  IN_TRANSIT = 'in_transit',
  AT_PORT = 'at_port',
  PICKED_UP = 'picked_up',
  UNLOADED = 'unloaded',
  RETURNED_EMPTY = 'returned_empty'
}

// 前端 (String Union)
type LogisticsStatus = 
  | 'not_shipped'
  | 'shipped'
  | 'in_transit'
  | 'at_port'
  | 'picked_up'
  | 'unloaded'
  | 'returned_empty';
```

### 6.2 计算模式

```typescript
// 前后端统一
type CalculationMode = 'actual' | 'forecast';
// actual: 实际费用计算
// forecast: 预测费用计算
```

---

## 七、访问路径

```
/docs/99-code/README.md
```
