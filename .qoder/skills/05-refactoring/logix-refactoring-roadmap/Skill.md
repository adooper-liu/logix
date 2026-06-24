---
name: logix-refactoring-roadmap
description: LogiX 重构路线图 - 模块优先级、实施计划、验收标准
version: 1.0.0
updated: 2026-06-23
trigger: manual
tags: [refactoring, roadmap, planning]
---

# LogiX 重构路线图

## 重构目标

**从零开始，确保每个模块从一开始就是正确的**

---

## 📋 重构原则

### 1. 渐进式重构（Strangler Fig Pattern）

```
不推翻重来，而是逐步替换：

旧系统 ──→ 新模块1 ──→ 新模块2 ──→ ... ──→ 完全替换
   │           │           │                    │
   └───────────┴───────────┴────────────────────┘
         并行运行，逐步迁移
```

### 2. 测试驱动（Test-Driven）

```
先写测试 → 再重构 → 确保测试通过
```

### 3. 小步快跑（Small Steps）

```
每次重构一个函数/类，不超过 2 小时
```

---

## 🗺️ 重构阶段规划

### 阶段一：基础设施准备（Week 1-2）

#### 任务清单

- [ ] **1.1 清理 NestJS 依赖**
  ```bash
  cd backend
  npm uninstall @nestjs/common @nestjs/core @nestjs/typeorm @nestjs/swagger
  ```

- [ ] **1.2 建立接口目录结构**
  ```
  backend/src/interfaces/
  ├── ICostCalculator.ts
  ├── IWarehouseSelector.ts
  ├── ITruckingSelector.ts
  ├── IDataAdapter.ts
  └── IStatusCalculator.ts
  ```

- [ ] **1.3 配置 ESLint 严格规则**
  ```javascript
  // .eslintrc.js
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
    'max-lines-per-function': ['warn', { max: 50 }],
    'max-lines': ['warn', { max: 300 }],
    'complexity': ['warn', 10],
    'no-console': 'error',
  }
  ```

- [ ] **1.4 建立单元测试框架**
  ```bash
  # 后端
  npm install --save-dev jest ts-jest @types/jest
  
  # 前端已有 Vitest，无需额外安装
  ```

- [ ] **1.5 创建 Git 分支策略**
  ```bash
  git checkout -b refactor/modular-architecture
  ```

**验收标准**：
- ✅ NestJS 依赖已移除
- ✅ ESLint 无警告
- ✅ 可以运行 `npm run test`

---

### 阶段二：核心领域层重构（Week 3-6）

#### 2.1 货柜状态机模块

**当前问题**：
- `ContainerStatusService` 包含 200+ 行状态计算逻辑
- 缺少单元测试

**重构方案**：

```typescript
// 新建文件：backend/src/domain/container/ContainerStatus.ts

/**
 * 货柜状态枚举
 */
export enum ContainerStatus {
  NOT_SHIPPED = 'not_shipped',
  SHIPPED = 'shipped',
  TRANSIT_ATA = 'transit_ata',
  ATA_DEST_PORT = 'ata_dest_port',
  GATE_IN = 'gate_in',
  PICKED_UP = 'picked_up',
  WMS_UNLOADED = 'wms_unloaded',
  EMPTY_RETURNED = 'empty_returned'
}

/**
 * 状态检查器接口
 */
interface IStatusChecker {
  hasEmptyReturn(container: Container): boolean;
  hasWmsUnload(container: Container): boolean;
  hasPickup(container: Container): boolean;
  // ... 其他检查方法
}

/**
 * 状态计算器（纯函数）
 */
export function calculateStatus(
  container: Container,
  checker: IStatusChecker
): ContainerStatus {
  // 按优先级检查
  if (checker.hasEmptyReturn(container)) return ContainerStatus.EMPTY_RETURNED;
  if (checker.hasWmsUnload(container)) return ContainerStatus.WMS_UNLOADED;
  if (checker.hasPickup(container)) return ContainerStatus.PICKED_UP;
  if (checker.hasGateIn(container)) return ContainerStatus.GATE_IN;
  if (checker.hasAtaDestPort(container)) return ContainerStatus.ATA_DEST_PORT;
  if (checker.hasTransitAta(container)) return ContainerStatus.TRANSIT_ATA;
  if (checker.hasShipped(container)) return ContainerStatus.SHIPPED;
  return ContainerStatus.NOT_SHIPPED;
}
```

**测试用例**：

```typescript
// backend/src/domain/container/ContainerStatus.test.ts

describe('calculateStatus', () => {
  it('should return EMPTY_RETURNED when has empty return record', () => {
    const container = mockContainer({ hasEmptyReturn: true });
    const checker = mockChecker({ hasEmptyReturn: true });
    
    const status = calculateStatus(container, checker);
    
    expect(status).toBe(ContainerStatus.EMPTY_RETURNED);
  });

  it('should return NOT_SHIPPED when no events', () => {
    const container = mockContainer();
    const checker = mockChecker({ allFalse: true });
    
    const status = calculateStatus(container, checker);
    
    expect(status).toBe(ContainerStatus.NOT_SHIPPED);
  });
});
```

**重构步骤**：
1. 创建 `ContainerStatus.ts` 和测试
2. 运行测试确保通过
3. 修改 `ContainerStatusService` 调用新模块
4. 删除旧的内联逻辑
5. 提交代码

**预计工时**：4 小时

---

#### 2.2 滞港费计算模块

**当前问题**：
- `DemurrageService` 包含 486 行代码
- 费率解析逻辑混杂

**重构方案**：

```typescript
// backend/src/domain/demurrage/DemurrageCalculator.ts

interface DemurrageInput {
  lastFreeDate: Date;
  currentDate: Date;
  dailyRate: number;
}

interface DemurrageResult {
  overdueDays: number;
  totalAmount: number;
  isOverdue: boolean;
}

/**
 * 计算滞港费（纯函数）
 */
export function calculateDemurrage(input: DemurrageInput): DemurrageResult {
  const overdueDays = Math.max(
    0,
    differenceInDays(input.currentDate, input.lastFreeDate)
  );
  
  return {
    overdueDays,
    totalAmount: overdueDays * input.dailyRate,
    isOverdue: overdueDays > 0
  };
}
```

```typescript
// backend/src/domain/demurrage/LastFreeDateResolver.ts

/**
 * 解析最后免费日期
 */
export class LastFreeDateResolver {
  resolve(portOperation: PortOperation): Date {
    if (portOperation.lastFreeDate) {
      return portOperation.lastFreeDate;
    }
    
    // 根据模式推算
    const baseDate = portOperation.lastFreeDateMode === 'BY_ARRIVAL'
      ? portOperation.eta
      : portOperation.dischargedTime;
    
    const freeDays = portOperation.lastFreeDateMode === 'BY_ARRIVAL'
      ? portOperation.freeStorageDays
      : portOperation.freeDetentionDays;
    
    return addDays(baseDate, freeDays);
  }
}
```

**预计工时**：6 小时

---

#### 2.3 智能排柜引擎模块

**当前问题**：
- `SchedulingCostOptimizerService` 1731 行代码
- 仓库选择、车队选择、成本计算全部内联

**重构方案**：

```
拆分模块：
├── WarehouseSelector.ts       (100行)
├── TruckingSelector.ts        (100行)
├── CostCalculator.ts          (150行)
├── CapacityChecker.ts         (80行)
└── SchedulingOrchestrator.ts  (120行)  ← 编排层
```

**详细设计见**：[模块化架构指南](../logix-modular-architecture/Skill.md#案例一智能排柜模块重构)

**预计工时**：16 小时（分4次完成）

---

### 阶段三：服务层重构（Week 7-10）

#### 3.1 Controller 瘦身

**目标**：Controller 只负责参数校验和响应格式化

```typescript
// ❌ 重构前
@Controller('containers')
class ContainerController {
  async getContainers(@Query() query: any) {
    // 业务逻辑...
    const containers = await this.repo.find({...});
    const filtered = containers.filter(...);
    const transformed = filtered.map(...);
    return transformed;
  }
}

// ✅ 重构后
@Controller('containers')
class ContainerController {
  constructor(private containerService: ContainerService) {}
  
  async getContainers(@Query() query: ContainerQueryDto) {
    return this.containerService.getList(query);
  }
}
```

**预计工时**：8 小时（25个Controller）

---

#### 3.2 Service 分层

**目标**：区分 Query Service 和 Command Service

```typescript
// Query Service（只读）
class ContainerQueryService {
  async getList(query: ContainerQueryDto): Promise<Container[]> {
    return this.repo.findWithFilters(query);
  }
  
  async getById(id: string): Promise<Container> {
    return this.repo.findOneOrFail(id);
  }
}

// Command Service（写操作）
class ContainerCommandService {
  async updateStatus(id: string, status: string): Promise<void> {
    await this.repo.updateStatus(id, status);
    await this.eventBus.publish('container.status.changed', { id, status });
  }
  
  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
```

**预计工时**：12 小时

---

### 阶段四：前端组件重构（Week 11-14）

#### 4.1 Composable 提取

**目标**：将业务逻辑从组件中提取到 Composable

```typescript
// ❌ 重构前：组件中包含业务逻辑
<script setup>
const containers = ref([]);
const loading = ref(false);

async function loadContainers() {
  loading.value = true;
  try {
    const response = await axios.get('/api/containers');
    containers.value = response.data;
  } finally {
    loading.value = false;
  }
}

onMounted(loadContainers);
</script>

// ✅ 重构后：使用 Composable
<script setup>
import { useContainerList } from '@/composables/useContainerList';

const { containers, loading, refresh } = useContainerList();

onMounted(refresh);
</script>
```

```typescript
// composables/useContainerList.ts
export function useContainerList() {
  const containers = ref<Container[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  
  async function refresh() {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await containerApi.getList();
      containers.value = response.data;
    } catch (e) {
      error.value = e.message;
    } finally {
      loading.value = false;
    }
  }
  
  return {
    containers,
    loading,
    error,
    refresh
  };
}
```

**预计工时**：16 小时

---

#### 4.2 组件拆分

**目标**：大组件拆分为小组件

```
❌ 重构前：ContainerDetails.vue (800行)
✅ 重构后：
   ContainerDetails.vue (100行) ← 布局编排
   ├── ContainerBasicInfo.vue (150行)
   ├── ContainerTimeline.vue (200行)
   ├── ContainerFees.vue (150行)
   └── ContainerActions.vue (100行)
```

**预计工时**：20 小时

---

### 阶段五：数据库优化（Week 15-16）

#### 5.1 索引优化

```sql
-- 分析慢查询
EXPLAIN ANALYZE SELECT * FROM biz_containers WHERE logistics_status = 'expired';

-- 添加缺失索引
CREATE INDEX idx_containers_status_updated ON biz_containers(logistics_status, updated_at DESC);
CREATE INDEX idx_port_operations_last_free ON process_port_operations(last_free_date) WHERE last_free_date IS NOT NULL;
```

**预计工时**：4 小时

---

#### 5.2 查询优化

```typescript
// ❌ 重构前：N+1 查询问题
const containers = await containerRepo.find();
for (const container of containers) {
  container.portOp = await portRepo.findByContainer(container.id);
}

// ✅ 重构后：JOIN 查询
const containers = await containerRepo
  .createQueryBuilder('container')
  .leftJoinAndSelect('container.portOperations', 'portOp')
  .getMany();
```

**预计工时**：6 小时

---

### 阶段六：文档完善（Week 17-18）

#### 6.1 API 文档

```bash
# 安装 Swagger
npm install @nestjs/swagger swagger-ui-express

# 生成 API 文档
# 访问 http://localhost:3001/api-docs
```

**预计工时**：4 小时

---

#### 6.2 业务文档

- [ ] 更新业务知识手册
- [ ] 编写模块使用说明
- [ ] 创建常见问题FAQ

**预计工时**：8 小时

---

## 📊 进度跟踪

### 每周检查点

```markdown
## Week 1
- [x] 清理 NestJS 依赖
- [x] 建立接口目录
- [ ] 配置 ESLint

## Week 2
- [ ] 完成 ESLint 配置
- [ ] 建立测试框架
- [ ] 创建 Git 分支策略
```

### 质量指标监控

| 指标 | 当前值 | 目标值 | 状态 |
|------|--------|--------|------|
| 平均文件行数 | 450 | ≤ 300 | 🔴 |
| 平均函数行数 | 80 | ≤ 50 | 🔴 |
| `any` 类型使用 | 25次 | 0次 | 🔴 |
| 测试覆盖率 | 30% | ≥ 60% | 🟡 |
| TODO 数量 | 29个 | 0个 | 🔴 |

---

## ⚠️ 风险控制

### 风险1：重构引入新Bug

**缓解措施**：
- 每次重构后立即运行测试
- 保持向后兼容（不破坏现有API）
- 使用 Feature Flag 控制新功能

### 风险2：重构进度延期

**缓解措施**：
- 每周回顾进度
- 优先重构高频修改模块
- 必要时调整范围（MVP优先）

### 风险3：团队成员不熟悉新模式

**缓解措施**：
- 编写详细的开发规范
- 组织代码审查会议
- 提供示例代码

---

## 🎓 学习资源

### 必读文档
- 开发规则 - ../../rules/logix-development-rules.mdc
- 业务知识手册 - ../01-business/logix-business-knowledge/Skill.md
- 模块化架构指南 - ../00-core/logix-modular-architecture/Skill.md

### 推荐书籍
- 《Clean Architecture》- Robert C. Martin
- 《Refactoring》- Martin Fowler
- 《Domain-Driven Design》- Eric Evans

### 在线课程
- SOLID Principles (Pluralsight)
- Clean Code (Udemy)

---

## 📝 总结

**重构不是一次性任务，而是持续改进的过程**

```
关键成功因素：
1. ✅ 小步快跑，每次重构一个模块
2. ✅ 测试驱动，确保不引入新Bug
3. ✅ 文档先行，明确目标和方案
4. ✅ 团队协作，定期Code Review
5. ✅ 持续监控，跟踪质量指标
```

**预期收益**：
- 代码可维护性提升 50%
- Bug率降低 40%
- 新功能开发速度提升 30%
- 团队成员满意度提升

---

**版本**: v1.0  
**创建时间**: 2026-06-23  
**预计总工时**: 120 小时（约 6 周全职工作）  
**负责人**: LogiX Team
