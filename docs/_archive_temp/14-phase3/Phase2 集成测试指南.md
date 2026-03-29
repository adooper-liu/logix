# Phase 2 集成测试指南

**创建日期**: 2026-03-25  
**测试范围**: 堆存费概念澄清与重构  
**优先级**: P0  

---

## 📋 测试目标

验证 Phase 2 的实施是否正确：

1. ✅ **港口存储费（Storage Charge）** 正确计算
2. ✅ **外部堆场堆存费（Yard Storage Fee）** 仅在 Drop off 模式下计算
3. ✅ 两种费用不会混淆
4. ✅ 数据源使用正确

---

## 🚀 快速开始

### 前置条件

1. **数据库已初始化**
   ```bash
   # 确保测试数据库可用
   npm run db:test:init
   ```

2. **依赖已安装**
   ```bash
   npm install --save-dev @types/jest ts-jest
   ```

3. **Jest 配置正确**
   ```json
   // jest.config.json
   {
     "preset": "ts-jest",
     "testEnvironment": "node",
     "testMatch": ["**/*.test.ts"]
   }
   ```

---

## 🧪 运行测试

### 方式 1: 运行单个测试文件

```bash
# 从 backend 目录运行
cd backend
npm test -- phase2-storage-fee.integration.test.ts
```

### 方式 2: 运行所有测试

```bash
# 从项目根目录运行
npm test
```

### 方式 3: 带覆盖率报告

```bash
npm test -- --coverage phase2-storage-fee.integration.test.ts
```

---

## 📊 测试用例详解

### Test Suite 1: 智能排产服务

#### Test 1.1: Live load 模式（无外部堆场堆存费）

**测试文件**: `phase2-storage-fee.integration.test.ts:179-203`

**测试场景**:
- 卸柜方式：Live load
- 车队：有堆场
- 预期：**只计算港口存储费**

**关键断言**:
```typescript
expect(costs.storageCost).toBeDefined(); // ✅ 港口存储费
expect(costs.yardStorageCost).toBe(0);   // ❌ 无外部堆场堆存费
```

---

#### Test 1.2: Drop off 模式 - 车队无堆场

**测试文件**: `phase2-storage-fee.integration.test.ts:205-230`

**测试场景**:
- 卸柜方式：Drop off
- 车队：无堆场（hasYard = false）
- 预期：**只计算港口存储费**

**关键断言**:
```typescript
expect(costs.storageCost).toBeDefined(); // ✅ 港口存储费
expect(costs.yardStorageCost).toBe(0);   // ❌ 车队无堆场，不计算
```

---

#### Test 1.3: Drop off 模式 - 车队有堆场

**测试文件**: `phase2-storage-fee.integration.test.ts:232-263`

**测试场景**:
- 卸柜方式：Drop off
- 车队：有堆场（hasYard = true）
- 堆放天数：3 天
- 费率：$80/天 + $50 操作费
- 预期：**同时计算两种堆存费**

**关键断言**:
```typescript
expect(costs.storageCost).toBeGreaterThan(0); // ✅ 港口存储费
expect(costs.yardStorageCost).toBe(290);      // ✅ $80×3 + $50
```

---

### Test Suite 2: 成本优化服务

#### Test 2.1: Live load 模式

**测试文件**: `phase2-storage-fee.integration.test.ts:278-302`

**测试场景**:
- 卸柜方式：Direct (Live load)
- 预期：**只计算港口存储费**

**关键断言**:
```typescript
expect(breakdown.storageCost).toBeGreaterThan(0); // ✅ 港口存储费
```

---

#### Test 2.2: Drop off 模式 - 车队有堆场

**测试文件**: `phase2-storage-fee.integration.test.ts:304-335`

**测试场景**:
- 卸柜方式：Drop off
- 车队：有堆场
- 堆放天数：3 天
- 预期：**外部堆场堆存费计入 totalCost**

**关键断言**:
```typescript
expect(breakdown.totalCost).toBeGreaterThanOrEqual(
  breakdown.demurrageCost +
  breakdown.detentionCost +
  breakdown.storageCost +
  breakdown.transportationCost +
  breakdown.handlingCost
); // ✅ 差额为 yardStorageCost
```

---

### Test Suite 3: 概念澄清验证

#### Test 3.1: 严格区分两种堆存费的数据源

**测试文件**: `phase2-storage-fee.integration.test.ts:347-365`

**测试目的**: 验证 `calculateTotalCost()` 的 `storageCost` 只包含港口存储费

**关键断言**:
```typescript
expect(totalCostResult.storageCost).toBeDefined(); // ✅ 来自 ext_demurrage_standards
expect(totalCostResult.storageCost).not.toBe(290); // ❌ 不是 external storage fee
```

---

#### Test 3.2: Drop off 模式的额外费用计算

**测试文件**: `phase2-storage-fee.integration.test.ts:367-403`

**测试场景**: 对比 Live load 和 Drop off 的费用差异

**关键断言**:
```typescript
// ✅ Drop off 比 Live load 多外部堆场堆存费
expect(dropOffCosts.yardStorageCost).toBe(290);
expect(liveLoadCosts.yardStorageCost).toBe(0);

// ✅ 差额等于外部堆场堆存费
const costDifference = dropOffCosts.totalCost - liveLoadCosts.totalCost;
expect(costDifference).toBe(290);
```

---

### Test Suite 4: 边界情况与错误处理

#### Test 4.1: TruckingPortMapping 不存在

**测试文件**: `phase2-storage-fee.integration.test.ts:415-438`

**测试场景**: 使用不存在的港口代码

**预期行为**: 不报错，返回 0

**关键断言**:
```typescript
expect(costs.yardStorageCost).toBe(0); // 无映射时返回 0
```

---

#### Test 4.2: 堆放天数为 0

**测试文件**: `phase2-storage-fee.integration.test.ts:440-460`

**测试场景**: 当天还箱（堆放 0 天）

**预期结果**: 只收取操作费

**关键断言**:
```typescript
expect(costs.yardStorageCost).toBe(50); // $80×0 天 + $50 = $50
```

---

## 📈 预期测试结果

### 成功标准

所有测试用例应该通过：

```
 PASS  src/services/phase2-storage-fee.integration.test.ts
  Phase 2 - 堆存费概念澄清与重构
    IntelligentSchedulingService.calculateEstimatedCosts
      ✓ 应该只计算港口存储费（Live load 模式） (15 ms)
      ✓ 应该只计算港口存储费（Drop off 模式但车队无堆场） (12 ms)
      ✓ 应该同时计算两种堆存费（Drop off 模式且车队有堆场） (18 ms)
    SchedulingCostOptimizerService.evaluateTotalCost
      ✓ 应该只计算港口存储费（Live load 模式） (10 ms)
      ✓ 应该同时计算两种堆存费（Drop off 模式且车队有堆场） (14 ms)
    堆存费概念澄清验证
      ✓ 应该严格区分两种堆存费的数据源 (8 ms)
      ✓ 应该验证 Drop off 模式的额外费用计算 (16 ms)
    边界情况与错误处理
      ✓ 应该处理 TruckingPortMapping 不存在的情况 (11 ms)
      ✓ 应该处理堆放天数为 0 的情况 (9 ms)

Test Suites: 1 passed, 1 total
Tests:       9 passed, 9 total
Snapshots:   0 total
Time:        3.5 s
```

---

## 🔍 故障排查

### 问题 1: 测试失败 - yardStorageCost 不为 290

**可能原因**:
- TruckingPortMapping 数据未正确创建
- 费率字段值不正确

**解决方案**:
```typescript
// 检查测试数据
console.log('TruckingPortMapping:', testTruckingPortMapping);
// 预期输出：
// standardRate: 80
// yardOperationFee: 50
// yardCapacity: 50
```

---

### 问题 2: 测试失败 - storageCost 为 0

**可能原因**:
- ExtDemurrageStandard 未正确创建
- chargeTypeCode 不是 'STORAGE'

**解决方案**:
```typescript
// 检查测试数据
console.log('ExtDemurrageStandard:', testStorageStandard);
// 预期输出：
// chargeTypeCode: 'STORAGE'
// freeDays: 5
// ratePerDay: 50
```

---

### 问题 3: 数据库连接失败

**可能原因**:
- 测试数据库未启动
- 连接配置错误

**解决方案**:
```bash
# 检查数据库状态
docker ps | grep postgres

# 重启数据库
docker restart postgres-test

# 检查连接配置
cat .env.test
```

---

## 📝 测试数据说明

### 测试数据集

| 实体 | 标识符 | 用途 |
|------|--------|------|
| Container | TEST_PHASE2_001 | 测试货柜 |
| Warehouse | TEST_WH_PHASE2 | 测试仓库 |
| TruckingCompany (有堆场) | TEST_TC_YARD | 有堆场的车队 |
| TruckingCompany (无堆场) | TEST_TC_NO_YARD | 无堆场的车队 |
| TruckingPortMapping | US-LAX-TEST_TC_YARD | 堆场费率映射 |
| ExtDemurrageStandard | STORAGE-TEST | 港口存储费标准 |

### 清理策略

每个测试用例执行后会自动清理数据：

```typescript
afterEach(async () => {
  await AppDataSource.getRepository(PortOperation).delete({ container: testContainer });
  await AppDataSource.getRepository(Container).delete({ containerNumber: TEST_CONTAINER_NUMBER });
  // ... 其他清理
});
```

---

## 🎯 验证清单

执行测试前，请确认：

- [ ] 数据库已启动并可连接
- [ ] 测试数据库已初始化
- [ ] Jest 配置正确
- [ ] 所有依赖已安装
- [ ] 测试文件无语法错误

执行测试后，请验证：

- [ ] 所有测试用例通过
- [ ] 无警告或错误
- [ ] 代码覆盖率达标（建议 >80%）
- [ ] 测试报告生成成功

---

## 📊 测试报告示例

```
=============================== Coverage summary ===============================
Statements   : 85.71% ( 120/140 )
Branches     : 78.26% ( 54/69 )
Functions    : 90.00% ( 27/30 )
Lines        : 86.11% ( 124/144 )
================================================================================
```

---

## 🔗 相关文件

- **测试文件**: [`phase2-storage-fee.integration.test.ts`](file://d:\Gihub\logix\backend\src\services\phase2-storage-fee.integration.test.ts)
- **实现文件 1**: [`intelligentScheduling.service.ts`](file://d:\Gihub\logix\backend\src\services\intelligentScheduling.service.ts#L1126-L1176)
- **实现文件 2**: [`schedulingCostOptimizer.service.ts`](file://d:\Gihub\logix\backend\src\services\schedulingCostOptimizer.service.ts#L376-L425)
- **实施总结**: [`成本计算统一方案-Phase2 实施总结.md`](file://d:\Gihub\logix\docs\Phase3\成本计算统一方案-Phase2 实施总结.md)
- **概念澄清**: [`堆存费概念澄清与命名规范.md`](file://d:\Gihub\logix\docs\Phase3\堆存费概念澄清与命名规范.md)

---

**测试状态**: 待执行  
**最后更新**: 2026-03-25  
**维护者**: AI Assistant
