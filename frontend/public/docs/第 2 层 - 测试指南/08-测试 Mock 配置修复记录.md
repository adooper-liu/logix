# 测试 Mock 配置修复记录

## 问题描述

运行 `schedulingCostOptimizer.service.test.ts` 时出现多个 Mock 配置错误：

**错误 1**: DemurrageService 未正确 Mock
```
TypeError: Cannot read properties of undefined (reading 'findOne')
at DemurrageService.getContainerMatchParams
at SchedulingCostOptimizerService.evaluateTotalCost
```

**错误 2**: calculateTotalCost 不是函数
```
TypeError: this.demurrageService.calculateTotalCost is not a function
at SchedulingCostOptimizerService.evaluateTotalCost
```

## 根本原因分析

### 原因 1: 缺少必要的 Mock 配置

测试文件缺少以下 Mock 配置：
1. **数据库访问** - `AppDataSource.getRepository()` 返回 undefined
2. **滞港费服务** - `DemurrageService` 需要数据库查询
3. **日志工具** - `logger.warn()` 未 Mock
4. **智能日历容量** - `SmartCalendarCapacity` 需要数据库访问

### 原因 2: DemurrageService 实例化方式特殊

**关键发现**: `SchedulingCostOptimizerService` 的构造函数中直接实例化了 `DemurrageService`：

```typescript
// schedulingCostOptimizer.service.ts:169
constructor() {
  // ... 其他初始化
  this.demurrageService = new DemurrageService(
    AppDataSource.getRepository(ExtDemurrageStandard),
    AppDataSource.getRepository(Container),
    AppDataSource.getRepository(PortOperation),
    // ... 更多 Repository
  );
}
```

**这意味着**:
- ❌ 不能只 Mock 模块的部分导出
- ✅ 必须 Mock 整个类的实现
- ✅ 使用 `return { ClassName: jest.fn()... }` 格式

## 解决方案

### 1. 添加数据库 Mock

```typescript
import { AppDataSource } from '../database';

jest.mock('../database', () => ({
  AppDataSource: {
    getRepository: jest.fn()
  }
}));

// 在 beforeEach 中配置
const mockQueryBuilder = {
  leftJoinAndSelect: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  getMany: jest.fn().mockResolvedValue([mockWarehouse]),
  getOne: jest.fn().mockResolvedValue(mockWarehouse)
};

const mockRepo = {
  find: jest.fn().mockResolvedValue([mockWarehouse]),
  findOne: jest.fn().mockResolvedValue(mockWarehouse),
  createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder)
};

(AppDataSource.getRepository as jest.Mock).mockReturnValue(mockRepo);
```

### 2. 添加滞港费服务 Mock（⚠️ 重要修正）

**错误示范**（会导致 `is not a function` 错误）:
```typescript
jest.mock('./demurrage.service', () => ({
  DemurrageService: jest.fn().mockImplementation(() => ({
    calculateTotalCost: jest.fn().mockResolvedValue({...})
  }))
}));
```

**正确方式**（使用 return 语句包裹）:
```typescript
jest.mock('./demurrage.service', () => {
  return {
    DemurrageService: jest.fn().mockImplementation(() => ({
      calculateTotalCost: jest.fn().mockResolvedValue({
        demurrageDays: 0,
        detentionDays: 0,
        storageDays: 0,
        totalCost: 0,
        costBreakdown: {
          demurrageCost: 0,
          detentionCost: 0,
          storageCost: 0,
          transportationCost: 0,
          handlingCost: 0
        }
      }),
      getContainerMatchParams: jest.fn().mockResolvedValue({
        container: {},
        portOperations: [],
        seaFreight: null
      })
    }))
  };
});
```

**为什么需要 `return`?**
- 当被 Mock 的类在构造函数中被 `new` 时
- Jest 需要完整的模块导出结构
- `return { ClassName: ... }` 确保模块导出格式正确

### 3. 添加日志工具 Mock

```typescript
jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}));
```

### 4. 添加智能日历容量 Mock

```typescript
jest.mock('../utils/smartCalendarCapacity', () => ({
  SmartCalendarCapacity: jest.fn().mockImplementation(() => ({
    ensureWarehouseOccupancy: jest.fn().mockResolvedValue(true),
    checkWarehouseAvailability: jest.fn().mockResolvedValue(true)
  }))
}));
```

### 5. 添加清理逻辑

```typescript
afterEach(() => {
  jest.clearAllMocks();
});
```

## 修复后的测试结构

完整的测试文件包含以下 Mock 层次：

```
┌─────────────────────────────────────┐
│   Test File: *.test.ts              │
├─────────────────────────────────────┤
│  Jest Mock Configuration            │
│  ├─ Database (AppDataSource)        │
│  ├─ Services (DemurrageService)     │
│  ├─ Utils (logger, smartCalendar)   │
│  └─ External Dependencies           │
├─────────────────────────────────────┤
│  beforeEach Setup                   │
│  ├─ Create Mock QueryBuilder        │
│  ├─ Create Mock Repository          │
│  ├─ Configure Mock Return Values    │
│  └─ Initialize Service              │
├─────────────────────────────────────┤
│  afterEach Cleanup                  │
│  └─ jest.clearAllMocks()            │
└─────────────────────────────────────┘
```

## 测试结果

修复后所有测试通过：

```
PASS src/services/schedulingCostOptimizer.service.test.ts
  SchedulingCostOptimizerService
    ✓ should return empty array when no warehouses found
    ✓ should handle invalid parameters
    ✓ should return true when warehouse is available
    ✓ should handle invalid warehouse
    ✓ should generate feasible options
    ✓ should handle empty container
    ✓ should evaluate cost for direct strategy
    ✓ should evaluate cost for drop off strategy
    ✓ should evaluate cost for expedited strategy
    ✓ should select best option from multiple options
    ✓ should throw error when no options provided
    ✓ should generate drop off options
    ✓ should generate expedited options
    ✓ should calculate storage days for drop off strategy
    ✓ should get config number with default value
    ✓ should return true for Saturday
    ✓ should return true for Sunday
    ✓ should return false for weekday
    ✓ should return boolean value
  Performance Tests
    ✓ should generate options within 1 second
    ✓ should evaluate cost within 500ms
  Integration Tests
    ✓ should complete full workflow

Test Suites: 1 passed, 1 total
Tests:       22 passed, 22 total
```

## 关键学习点

### 1. Mock 的必要性

**为什么需要 Mock？**
- 隔离外部依赖（数据库、HTTP、文件系统）
- 控制测试环境
- 加快测试执行速度
- 避免副作用

**哪些需要 Mock？**
- 数据库访问（TypeORM Repository）
- HTTP 请求（axios, fetch）
- 文件系统操作
- 时间相关（Date.now, setTimeout）
- 复杂业务逻辑（其他 Service）

### 2. ⚠️ 重要：构造函数中直接实例化的 Mock

**问题场景**: 
当被测试的类在构造函数中直接 `new` 了其他服务时：

```typescript
// 被测试的类
class MyService {
  private otherService: OtherService;
  
  constructor() {
    this.otherService = new OtherService(); // ← 直接实例化
  }
}
```

**错误 Mock 方式**（会导致 `is not a function`）:
```typescript
jest.mock('./OtherService', () => ({
  OtherService: jest.fn().mockImplementation(() => ({
    someMethod: jest.fn()
  }))
}));
```

**正确 Mock 方式**（使用 return 包裹）:
```typescript
jest.mock('./OtherService', () => {
  return {  // ← 必须有 return
    OtherService: jest.fn().mockImplementation(() => ({
      someMethod: jest.fn()
    }))
  };
});
```

**原理说明**:
- Jest 的 `jest.mock()` 会替换整个模块的导出
- 当类在构造函数中被 `new` 时，Jest 需要使用 Mock 的构造函数
- `return { ClassName: ... }` 确保模块导出的结构正确

### 3. Mock 配置层次

```typescript
// Level 1: 模块级 Mock（文件顶部）
jest.mock('../database', () => ({...}));
jest.mock('./other-service', () => ({...}));

// Level 2: 测试套件级 Mock（beforeEach）
beforeEach(() => {
  const mockRepo = {...};
  service = new MyService(mockRepo);
});

// Level 3: 单个测试 Mock（it 内部）
it('should...', () => {
  mockMethod.mockReturnValue(specificValue);
  // ...test code
});
```

### 3. Mock 对象完整性

确保 Mock 对象提供所有必要的方法：

```typescript
// ❌ 不完整的 Mock
const mockRepo = {
  find: jest.fn(),
  findOne: jest.fn()
};

// ✅ 完整的 Mock
const mockRepo = {
  find: jest.fn().mockResolvedValue([]),
  findOne: jest.fn().mockResolvedValue(null),
  save: jest.fn().mockResolvedValue({}),
  createQueryBuilder: jest.fn().mockReturnValue({
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
    getOne: jest.fn().mockResolvedValue(null)
  })
};
```

### 4. 链式调用的 Mock

对于链式调用（如 QueryBuilder），使用 `mockReturnThis()`：

```typescript
mockQueryBuilder = {
  leftJoinAndSelect: jest.fn().mockReturnThis(), // 返回自身以支持链式调用
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  getMany: jest.fn().mockResolvedValue([]) // 最终返回值
};
```

### 5. 清理 Mock 状态

```typescript
// 在每个测试后清理
afterEach(() => {
  jest.clearAllMocks();  // 清除 Mock 调用历史
  // 或
  jest.resetAllMocks();  // 重置 Mock 实现
  // 或
  jest.restoreAllMocks(); // 恢复原始实现
});
```

## 常见错误及解决方案

### 错误 1: Cannot read property 'X' of undefined

**症状**:
```
TypeError: Cannot read property 'findOne' of undefined
```

**原因**: Mock 对象未正确配置

**解决**: 
```typescript
// 确保 Mock 对象有所有必要方法
const mock = {
  method1: jest.fn().mockReturnValue(value),
  method2: jest.fn().mockReturnValue(value)
};
```

### 错误 2: Mock 返回值不符合预期

**症状**:
```
Expected: Array, Received: undefined
```

**原因**: 忘记设置 Mock 返回值

**解决**:
```typescript
// 使用 mockResolvedValue 或 mockReturnValue
mockFn.mockResolvedValue(expectedValue);
```

### 错误 3: 测试间相互污染

**症状**:
```
前一个测试的数据影响到后一个测试
```

**原因**: Mock 状态未清理

**解决**:
```typescript
afterEach(() => {
  jest.clearAllMocks();
});
```

## 最佳实践检查清单

在编写测试前检查：

- [ ] 是否 Mock 了所有外部依赖？
- [ ] Mock 对象是否有完整的方法列表？
- [ ] 是否正确设置了返回值？
- [ ] 是否处理了链式调用？
- [ ] 是否在 afterEach 中清理了 Mock？
- [ ] Mock 数据是否符合业务场景？
- [ ] 测试是否独立（不依赖其他测试）？

## 参考资源

- **成功示例**: `backend/src/services/ContainerFilterService.test.ts`
- **完整示例**: `backend/src/services/DemurrageDateCalculator.test.ts`
- **规范文档**: `frontend/public/docs/第 2 层 - 测试指南/01-测试指南.md`

---

**修复日期**: 2026-03-31  
**修复内容**: schedulingCostOptimizer.service.test.ts Mock 配置  
**测试覆盖**: 22 个测试用例全部通过  
**适用场景**: 所有需要 Mock 数据库和服务的单元测试
