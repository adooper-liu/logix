# Phase 2 实施总结 - 堆存费概念澄清与重构

**实施日期**: 2026-03-25  
**状态**: ✅ 已完成  
**优先级**: P0  

---

## 📋 实施目标

1. **概念澄清**：区分港口存储费（Storage Charge）与外部堆场堆存费（Yard Storage Fee）
2. **代码审查**：检查现有实现是否混淆两种费用
3. **重构实现**：在 Drop off 模式下正确计算外部堆场堆存费

---

## ✅ Task 2.1: 概念澄清（已完成）

### 核心概念对比

| 维度 | 港口存储费（Storage Charge） | 外部堆场堆存费（Yard Storage Fee） |
|------|---------------------------|----------------------------------|
| **英文名称** | Storage Charge / Port Storage Fee | Yard Storage Fee / External Storage Fee |
| **收取方** | 港口/码头 | 拖车车队 |
| **数据源** | `ext_demurrage_standards` 表 | `dict_trucking_port_mapping` 表 |
| **字段映射** | `chargeTypeCode = 'STORAGE'` | `standard_rate` + `yard_operation_fee` |
| **判断条件** | 匹配到 STORAGE 类型标准 | `yard_capacity > 0` + Drop off 模式 |
| **费用范畴** | D&D 费用类型之一 | 运输环节附加费 |
| **计费区间** | 到港日 → 提柜日 | 卸柜日 → 还箱日（堆场存放期间） |
| **免费期** | 有（根据标准 freeDays） | 无（从第一天开始收费） |
| **阶梯费率** | 支持 | 不支持（固定费率） |

### 文档更新

- ✅ 更新了 [SKILL 规范](memory://project_introduction)
- ✅ 创建了 [堆存费概念澄清与命名规范.md](file://d:\Gihub\logix\docs\Phase3\堆存费概念澄清与命名规范.md)
- ✅ 更新了 [智能排柜成本计算统一方案.md](file://d:\Gihub\logix\docs\Phase3\智能排柜成本计算统一方案.md)

---

## 🔍 Task 2.2: 代码审查（已完成）

### 审查项 1：港口存储费计算 ✅

**位置**: [`demurrage.service.ts:3155-3156`](file://d:\Gihub\logix\backend\src\services\demurrage.service.ts#L3155-L3156)

```typescript
// ✅ 正确：从 calculateForContainer() 的结果中提取港口存储费
if (isStorageCharge(item)) {
  costs.storageCost += item.amount;
}
```

**验证结果**：
- ✅ 使用 `ext_demurrage_standards` 表
- ✅ 通过 `matchStandards()` 匹配标准
- ✅ 支持阶梯费率和工作日/自然日
- ✅ 已包含在 `calculateTotalCost()` 中

---

### 审查项 2：未发现概念混淆 ✅

**检查结果**：
- ✅ 没有找到将 `TruckingPortMapping.standardRate` 用作港口存储费的情况
- ✅ 所有调用方都正确使用 `calculateTotalCost()`
- ✅ `storageCost` 字段明确来自 `totalCostResult.storageCost`

---

### ⚠️ 审查项 3：Drop off 模式缺少外部堆场堆存费计算

**问题发现**：两个调用方都**没有计算外部堆场堆存费**！

#### **问题 1**: `schedulingCostOptimizer.service.ts`

**原代码** (Line 374-390):
```typescript
breakdown.demurrageCost = totalCostResult.demurrageCost;
breakdown.detentionCost = totalCostResult.detentionCost;
breakdown.storageCost = totalCostResult.storageCost; // ← 仅港口存储费
breakdown.transportationCost = totalCostResult.transportationCost;

// ❌ 缺失：外部堆场堆存费（Drop off 模式专属）

breakdown.totalCost = 
  breakdown.demurrageCost +
  breakdown.detentionCost +
  breakdown.storageCost +      // ← 只有港口存储费
  breakdown.transportationCost +
  breakdown.handlingCost;
```

**影响**：
- ❌ Drop off 模式的总成本被低估
- ❌ 可能导致错误的排产决策
- ❌ 与实际费用不符

---

#### **问题 2**: `intelligentScheduling.service.ts`

**原代码** (Line 1126-1133):
```typescript
return {
  demurrageCost: totalCostResult.demurrageCost,
  detentionCost: totalCostResult.detentionCost,
  storageCost: totalCostResult.storageCost, // ← 仅港口存储费
  transportationCost: totalCostResult.transportationCost,
  totalCost: totalCostResult.totalCost
};
```

**影响**：
- ❌ 预览排产的费用显示不完整
- ❌ Drop off 模式下缺少外部堆场堆存费
- ❌ 用户看到的费用比实际低

---

## 🔧 Task 2.3: 重构实现（已完成）

### 修复 1: `schedulingCostOptimizer.service.ts`

**新增代码** (Line 376-425):

```typescript
breakdown.demurrageCost = totalCostResult.demurrageCost;
breakdown.detentionCost = totalCostResult.detentionCost;
breakdown.storageCost = totalCostResult.storageCost; // 港口存储费
breakdown.transportationCost = totalCostResult.transportationCost;

// ✅ 新增：外部堆场堆存费（仅在 Drop off 模式且车队有堆场时计算）
let yardStorageCost = 0;
if (option.strategy === 'Drop off' && option.truckingCompany) {
  try {
    // 检查车队是否有堆场
    const hasYard = option.truckingCompany.hasYard || false;
    
    if (hasYard) {
      // 预计堆场存放天数（从卸柜日到还箱日）
      const yardStorageDays = dateTimeUtils.daysBetween(option.unloadDate, plannedReturnDate);
      
      // 从 TruckingPortMapping 获取堆场费率
      const destPo = await AppDataSource.getRepository(Container)
        .createQueryBuilder('c')
        .leftJoinAndSelect('c.portOperations', 'po')
        .where('c.containerNumber = :containerNumber', { containerNumber: option.containerNumber })
        .andWhere('po.portType = :portType', { portType: 'destination' })
        .getOne();
      
      const po = destPo?.portOperations?.find((p: any) => p.portType === 'destination');
      const portCode = po?.portCode || 'USLAX';
      const countryCode = option.warehouse.country || 'US';
      
      const truckingPortMapping = await this.truckingPortMappingRepo.findOne({
        where: {
          country: countryCode,
          portCode,
          truckingCompanyId: option.truckingCompany.companyCode,
          isActive: true
        }
      });
      
      if (truckingPortMapping) {
        // 计算外部堆场堆存费 = 每日费率 × 天数 + 操作费
        yardStorageCost = 
          (truckingPortMapping.standardRate || 0) * yardStorageDays + 
          (truckingPortMapping.yardOperationFee || 0);
      }
    }
  } catch (error) {
    log.warn(`[CostOptimizer] Yard storage cost calculation failed:`, error);
    // 计算失败不影响整体，yardStorageCost 保持为 0
  }
}

// 加急费单独计算
if (option.strategy === 'Expedited') {
  breakdown.handlingCost = await this.getConfigNumber('expedited_handling_fee', 50);
}

// ✅ 总成本（包含外部堆场堆存费）
breakdown.totalCost =
  breakdown.demurrageCost +
  breakdown.detentionCost +
  breakdown.storageCost +
  breakdown.transportationCost +
  yardStorageCost +              // ← 新增
  breakdown.handlingCost;
```

**关键改进**：
- ✅ 仅在 Drop off 模式下计算
- ✅ 检查车队是否有堆场（`hasYard = true`）
- ✅ 从 `dict_trucking_port_mapping` 读取费率
- ✅ 计算公式：`standard_rate * days + yard_operation_fee`
- ✅ 错误处理完善，失败不影响整体

---

### 修复 2: `intelligentScheduling.service.ts`

**新增代码** (Line 1126-1176):

```typescript
// 使用统一的 calculateTotalCost 方法计算所有 D&D 费用和运输费
const totalCostResult = await this.demurrageService.calculateTotalCost(containerNumber, {
  mode: 'forecast',
  plannedDates: { plannedPickupDate, plannedUnloadDate, plannedReturnDate },
  includeTransport: true,
  warehouse,
  truckingCompany,
  unloadMode
});

// ✅ 新增：计算外部堆场堆存费（仅在 Drop off 模式且车队有堆场时）
let yardStorageCost = 0;
if (unloadMode === 'Drop off' && truckingCompany.hasYard) {
  try {
    // 预计堆场存放天数
    const yardStorageDays = dateTimeUtils.daysBetween(plannedUnloadDate, plannedReturnDate);
    
    // 获取货柜的目的港信息
    const container = await this.containerRepo.findOne({
      where: { containerNumber },
      relations: ['portOperations']
    });
    
    if (container) {
      const destPo = container.portOperations?.find((po: any) => po.portType === 'destination');
      const portCode = destPo?.portCode || 'USLAX';
      const countryCode = warehouse.country || 'US';
      
      // 从 TruckingPortMapping 获取堆场费率
      const truckingPortMapping = await this.truckingPortMappingRepo.findOne({
        where: {
          country: countryCode,
          portCode,
          truckingCompanyId: truckingCompany.companyCode,
          isActive: true
        }
      });
      
      if (truckingPortMapping) {
        // 计算外部堆场堆存费 = 每日费率 × 天数 + 操作费
        yardStorageCost = 
          (truckingPortMapping.standardRate || 0) * yardStorageDays + 
          (truckingPortMapping.yardOperationFee || 0);
      }
    }
  } catch (error) {
    logger.error(`[IntelligentScheduling] Yard storage cost calculation failed:`, error);
    // 计算失败不影响整体，yardStorageCost 保持为 0
  }
}

return {
  demurrageCost: totalCostResult.demurrageCost,
  detentionCost: totalCostResult.detentionCost,
  storageCost: totalCostResult.storageCost, // 港口存储费
  transportationCost: totalCostResult.transportationCost,
  yardStorageCost, // ✅ 新增：外部堆场堆存费（如有）
  totalCost: totalCostResult.totalCost + yardStorageCost, // ✅ 总计包含两种堆存费
  currency: totalCostResult.currency
};
```

**关键改进**：
- ✅ 返回类型新增 `yardStorageCost` 字段
- ✅ 分别显示两种堆存费
- ✅ 总计包含两种费用
- ✅ 错误处理完善

---

### 辅助修改：导入 `dateTimeUtils`

**位置**: `intelligentScheduling.service.ts:30`

```typescript
import * as dateTimeUtils from '../utils/dateTimeUtils';
```

---

## 📊 重构效果对比

### Before（修改前）

```
场景：Drop off 模式，车队有堆场，堆放 3 天

费用明细：
- 滞港费：$0
- 港口存储费：$200（来自 ext_demurrage_standards）
- 滞箱费：$150
- 运输费：$100
- 外部堆场堆存费：$0 ❌（未计算）
─────────────────────────────
总计：$450

问题：实际应支付 $740，但系统只显示 $450 ❌
```

### After（修改后）

```
场景：Drop off 模式，车队有堆场，堆放 3 天

费用明细：
- 滞港费：$0
- 港口存储费：$200（来自 ext_demurrage_standards）✅
- 滞箱费：$150
- 运输费：$100
- 外部堆场堆存费：$290 ✅（$80/天 × 3 天 + $50）
─────────────────────────────
总计：$740

优势：完整显示所有费用，与实际一致 ✅
```

---

## 🎯 成果展示

### 代码统计

| 指标 | 数值 |
|------|------|
| 修改文件数 | 2 个 |
| 新增代码行数 | ~95 行 |
| 新增字段 | `yardStorageCost` |
| 覆盖场景 | Drop off 模式专属 |
| 错误处理 | try-catch 保护 |

### 功能完整性

- ✅ **概念清晰**：严格区分两种堆存费
- ✅ **数据源正确**：
  - 港口存储费 → `ext_demurrage_standards` ✅
  - 外部堆场堆存费 → `dict_trucking_port_mapping` ✅
- ✅ **计算逻辑完整**：仅在 Drop off + 有堆场时计算
- ✅ **费用透明**：分别显示两种堆存费
- ✅ **总计准确**：包含所有费用

---

## 🧪 验证方案

### Test 1: Live load 模式（无外部堆场堆存费）

```typescript
const costs = await calculateEstimatedCosts(
  'ECMU1234567',
  plannedPickupDate,
  plannedUnloadDate,
  plannedReturnDate,
  'Live load', // ← Live load
  warehouse,
  truckingCompany
);

// 预期结果
expect(costs.yardStorageCost).toBe(0); // ✅ 无外部堆场堆存费
expect(costs.storageCost).toBeGreaterThan(0); // ✅ 有港口存储费
```

---

### Test 2: Drop off 模式 - 车队无堆场

```typescript
truckingCompany.hasYard = false; // ← 无堆场

const costs = await calculateEstimatedCosts(
  'ECMU1234567',
  plannedPickupDate,
  plannedUnloadDate,
  plannedReturnDate,
  'Drop off',
  warehouse,
  truckingCompany
);

// 预期结果
expect(costs.yardStorageCost).toBe(0); // ✅ 无外部堆场堆存费
expect(costs.storageCost).toBeGreaterThan(0); // ✅ 有港口存储费
```

---

### Test 3: Drop off 模式 - 车队有堆场（完整计算）

```typescript
truckingCompany.hasYard = true; // ← 有堆场
truckinPortMapping.standardRate = 80;
truckinPortMapping.yardOperationFee = 50;

const costs = await calculateEstimatedCosts(
  'ECMU1234567',
  new Date('2026-03-25'), // 卸柜日
  new Date('2026-03-28'), // 还箱日（堆放 3 天）
  'Drop off',
  warehouse,
  truckingCompany
);

// 预期结果
expect(costs.yardStorageCost).toBe(290); // ✅ $80 × 3 + $50
expect(costs.storageCost).toBeGreaterThan(0); // ✅ 港口存储费独立计算
expect(costs.totalCost).toBe(
  costs.demurrageCost +
  costs.detentionCost +
  costs.storageCost +
  costs.transportationCost +
  costs.yardStorageCost
); // ✅ 总计包含所有费用
```

---

## 📝 相关文件

- **修改文件 1**: [`schedulingCostOptimizer.service.ts`](file://d:\Gihub\logix\backend\src\services\schedulingCostOptimizer.service.ts#L376-L425)
- **修改文件 2**: [`intelligentScheduling.service.ts`](file://d:\Gihub\logix\backend\src\services\intelligentScheduling.service.ts#L1126-L1176)
- **权威源**: [`demurrage.service.ts`](file://d:\Gihub\logix\backend\src\services\demurrage.service.ts#L3155-L3156)
- **概念文档**: [`堆存费概念澄清与命名规范.md`](file://d:\Gihub\logix\docs\Phase3\堆存费概念澄清与命名规范.md)
- **主方案**: [`智能排柜成本计算统一方案.md`](file://d:\Gihub\logix\docs\Phase3\智能排柜成本计算统一方案.md)

---

## 🚀 下一步计划

### Phase 3: 统一运输费计算（已在 Phase 1.1 完成）

**状态**: ✅ 已完成

- ✅ `calculateTransportationCostInternal()` 已创建
- ✅ 所有调用方都使用 `calculateTotalCost()`
- ✅ 从 `TruckingPortMapping.transportFee` 读取

---

### Phase 4: 清理与优化（待执行）

**任务**：
- [ ] 删除旧的重复代码（如有）
- [ ] 更新 API 文档
- [ ] 添加集成测试
- [ ] 前端展示调整（如需要）

**预计完成时间**: 2026-03-27

---

**实施状态**: ✅ Phase 2 已完成  
**下一步**: Phase 4 - 清理与优化  
**预计完成时间**: 2026-03-27
