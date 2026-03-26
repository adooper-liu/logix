# 成本集成 - unloadDate 重命名为 plannedPickupDate

**实施日期**: 2026-03-26  
**重构类型**: 变量重命名 + 语义澄清  
**影响范围**: 后端服务、前端组件、测试用例  

---

## 📋 **问题背景**

### **原始问题**

`UnloadOption` 接口中的 `unloadDate` 字段存在严重的**语义混淆**：

```typescript
// ❌ 原始定义
export interface UnloadOption {
  unloadDate: Date;  // 实际含义是什么？
}
```

**实际使用中的矛盾**：
1. 在 Direct/Live load 模式下：`unloadDate` = 提柜日 = 卸柜日（提=卸）
2. 在 Drop off 模式下：代码把 `unloadDate` 当作提柜日用，但名称叫"卸柜日"
3. 在 Expedited 模式下：`unloadDate` = 免费期前的提柜日

**导致的问题**：
- 💥 外部堆场堆存费计算错误（提=卸 vs 提<卸）
- 💥 送仓日计算逻辑混乱
- 💥 代码注释与实际实现不符

---

## ✅ **解决方案：方案 A（重命名）**

### **核心改动**

将 `unloadDate` 重命名为 `plannedPickupDate`，并增加可选的 `plannedUnloadDate`：

```typescript
// ✅ 新定义
export interface UnloadOption {
  containerNumber: string;
  warehouse: Warehouse;
  plannedPickupDate: Date;      // ← 重命名：计划提柜日（核心输入）
  plannedUnloadDate?: Date;     // ← 新增：计划卸柜日（可选，由策略推导）
  strategy: 'Direct' | 'Drop off' | 'Expedited';
  truckingCompany?: TruckingCompany;
  isWithinFreePeriod: boolean;
  totalCost?: number;
}
```

---

## 🔧 **修改清单**

### **1. 后端类型定义**

#### **schedulingCostOptimizer.service.ts**

```typescript
/**
 * 卸柜方案选项
 * 
 * ⚠️ 关键说明：
 * - plannedPickupDate: 计划提柜日（核心输入）
 * - plannedUnloadDate: 计划卸柜日（可选，未提供时根据策略计算）
 *   • Direct/Live load: plannedPickupDate = plannedUnloadDate
 *   • Drop off: plannedPickupDate < plannedUnloadDate
 *   • Expedited: plannedPickupDate = plannedUnloadDate（免费期内）
 */
export interface UnloadOption {
  containerNumber: string;
  warehouse: Warehouse;
  plannedPickupDate: Date;      // ← 重命名
  plannedUnloadDate?: Date;     // ← 新增
  strategy: 'Direct' | 'Drop off' | 'Expedited';
  truckingCompany?: TruckingCompany;
  isWithinFreePeriod: boolean;
  totalCost?: number;
}
```

---

#### **evaluateTotalCost 方法逻辑修复**

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

  try {
    // 1. 根据策略计算计划日期
    // Direct/Live load: 提=送=卸
    // Drop off: 提<送=卸
    // Expedited: 提=送=卸（免费期内）
    
    // ✅ 关键修复：明确区分提柜日和卸柜日
    const plannedPickupDate = option.plannedPickupDate;
    
    // 如果未提供 plannedUnloadDate，根据策略推导
    let actualPlannedUnloadDate = option.plannedUnloadDate;
    if (!actualPlannedUnloadDate) {
      if (option.strategy === 'Drop off') {
        // Drop off 模式：假设提柜后 2 天卸柜（堆场堆存）
        actualPlannedUnloadDate = dateTimeUtils.addDays(option.plannedPickupDate, 2);
      } else {
        // Direct/Expedited: 提=卸
        actualPlannedUnloadDate = option.plannedPickupDate;
      }
    }
    
    // 估算还箱日：根据卸柜方式不同
    let plannedReturnDate: Date;
    if (option.strategy === 'Drop off') {
      // Drop off 模式：假设堆场堆存 3 天后还箱
      plannedReturnDate = dateTimeUtils.addDays(actualPlannedUnloadDate, 3);
    } else {
      // Live load / Expedited: 当天还箱
      plannedReturnDate = actualPlannedUnloadDate;
    }

    // 使用统一的 calculateTotalCost 方法计算所有费用
    const totalCostResult = await this.demurrageService.calculateTotalCost(
      option.containerNumber,
      {
        mode: 'forecast',
        plannedDates: {
          plannedPickupDate,
          plannedUnloadDate: actualPlannedUnloadDate,
          plannedReturnDate
        },
        includeTransport: true,
        warehouse: option.warehouse,
        truckingCompany: option.truckingCompany,
        unloadMode: option.strategy === 'Drop off' ? 'Drop off' : 'Live load'
      }
    );

    breakdown.demurrageCost = totalCostResult.demurrageCost;
    breakdown.detentionCost = totalCostResult.detentionCost;
    breakdown.storageCost = totalCostResult.storageCost;
    breakdown.transportationCost = totalCostResult.transportationCost;
    breakdown.yardStorageCost = 0;

    // ✅ 关键修复：外部堆场堆存费（仅在 Drop off 模式、车队有堆场且实际使用时计算）
    if (option.strategy === 'Drop off' && option.truckingCompany) {
      try {
        const hasYard = option.truckingCompany.hasYard || false;
        
        if (hasYard) {
          // ✅ 送仓日计算：Drop off 模式下，送仓日 = 卸柜日
          const plannedDeliveryDate = actualPlannedUnloadDate;
          
          // ✅ 判断是否实际使用了堆场：提柜日 < 送仓日
          const pickupDayStr = option.plannedPickupDate.toISOString().split('T')[0];
          const deliveryDayStr = plannedDeliveryDate.toISOString().split('T')[0];
          
          if (pickupDayStr !== deliveryDayStr) {
            // ✅ 提 < 送，说明货柜在堆场存放了
            // ✅ 预计堆场存放天数（从提柜日到送仓日）
            const yardStorageDays = dateTimeUtils.daysBetween(
              option.plannedPickupDate,
              plannedDeliveryDate
            );
            
            // ... 计算费用
          }
        }
      } catch (error) {
        log.warn(`[CostOptimizer] Yard storage cost calculation failed:`, error);
      }
    }

    // 加急费单独计算
    if (option.strategy === 'Expedited') {
      breakdown.handlingCost = await this.getConfigNumber('expedited_handling_fee', 50);
    }

    breakdown.totalCost =
      breakdown.demurrageCost +
      breakdown.detentionCost +
      breakdown.storageCost +
      breakdown.transportationCost +
      breakdown.yardStorageCost +
      breakdown.handlingCost;

  } catch (error) {
    log.warn(`[CostOptimizer] Cost evaluation failed for ${option.containerNumber}:`, error);
  }

  return breakdown;
}
```

---

#### **generateDropOffOptions 方法**

```typescript
private async generateDropOffOptions(/* ... */): Promise<UnloadOption[]> {
  
  options.push({
    containerNumber: container.containerNumber,
    warehouse,
    plannedPickupDate: candidateDate,  // ← 重命名
    strategy: 'Drop off',
    truckingCompany: trucking,
    isWithinFreePeriod: false
  });
  
}
```

---

#### **generateExpeditedOptions 方法**

```typescript
private async generateExpeditedOptions(/* ... */): Promise<UnloadOption[]> {
  
  options.push({
    containerNumber: container.containerNumber,
    warehouse,
    plannedPickupDate: candidateDate,  // ← 重命名
    strategy: 'Expedited',
    isWithinFreePeriod: candidateDate <= lastFreeDate
  });
  
}
```

---

#### **日志输出修复**

```typescript
log.info(
  `[CostOptimizer] Selected optimal option: ` +
  `Strategy=${best.option.strategy}, ` +
  `PickupDate=${best.option.plannedPickupDate.toISOString().split('T')[0]}, ` +  // ← 重命名
  `Cost=$${best.option.totalCost}`
);
```

---

### **2. 前端类型定义**

#### **frontend/src/types/scheduling.ts**

```typescript
export interface UnloadOption {
  containerNumber: string;
  warehouse: Warehouse;
  /**
   * ⚠️ 重命名：原 unloadDate → plannedPickupDate
   * 计划提柜日（核心输入）
   */
  plannedPickupDate: string;  // ← 重命名
  strategy: 'Direct' | 'Drop off' | 'Expedited';
  truckingCompany?: TruckingCompany;
  isWithinFreePeriod: boolean;
  estimatedDemurrage?: number;
  estimatedStorage?: number;
  estimatedTransport?: number;
  totalCost?: number;
}
```

---

### **3. 前端组件**

#### **UnloadOptionSelector.vue**

```vue
<el-form-item label="提柜日期">  <!-- ← 重命名 -->
  <el-date-picker
    v-model="selectedOption.plannedPickupDate"  <!-- ← 重命名 -->
    type="date"
    placeholder="选择提柜日期"  <!-- ← 重命名 -->
    format="YYYY-MM-DD"
    value-format="YYYY-MM-DD"
    @change="handleDateChange"
  />
</el-form-item>
```

---

### **4. 测试用例**

#### **schedulingCostOptimizer.service.test.ts**

```typescript
// ✅ 所有测试用例批量替换
const option: UnloadOption = {
  containerNumber: 'TEST1234567',
  warehouse: mockWarehouse,
  plannedPickupDate: pickupDate,  // ← 重命名
  strategy: 'Direct',
  isWithinFreePeriod: true
};
```

---

## 📊 **业务逻辑对比**

### **修复前（混乱）**

```typescript
// ❌ 错误逻辑
const plannedPickupDate = option.unloadDate;  // unloadDate 被当作提柜日

// Drop off 模式下
const plannedDeliveryDate = option.unloadDate;  // 送仓日 = unloadDate
const yardStorageDays = dateTimeUtils.daysBetween(
  option.unloadDate,      // D1
  plannedDeliveryDate     // D1
); // = 0 天 ❌ 应该是 2-3 天
```

---

### **修复后（清晰）**

```typescript
// ✅ 正确逻辑
const plannedPickupDate = option.plannedPickupDate;  // D1

// Drop off 模式：自动推导卸柜日
let actualPlannedUnloadDate = option.plannedUnloadDate;
if (!actualPlannedUnloadDate && option.strategy === 'Drop off') {
  actualPlannedUnloadDate = dateTimeUtils.addDays(option.plannedPickupDate, 2);  // D3
}

const plannedDeliveryDate = actualPlannedUnloadDate;  // D3

const yardStorageDays = dateTimeUtils.daysBetween(
  option.plannedPickupDate,  // D1
  plannedDeliveryDate        // D3
); // = 2 天 ✅ 正确
```

---

## 🎯 **三种策略的日期关系**

| 策略 | 提柜日 | 送仓日 | 卸柜日 | 还箱日 | 说明 |
|------|--------|--------|--------|--------|------|
| **Direct / Live load** | D1 | D1 | D1 | D1 | 直接送仓，不经堆场 |
| **Drop off** | D1 | D3 | D3 | D6 | 在堆场存放 2 天，卸柜后 3 天还箱 |
| **Expedited** | D(-1) | D(-1) | D(-1) | D(-1) | 免费期内加急处理 |

---

## ✅ **验证清单**

### **单元测试**

```bash
cd d:\Gihub\logix\backend
npm test -- schedulingCostOptimizer.service.test.ts
```

**预期结果**：
- ✅ 所有测试通过
- ✅ Direct 模式成本计算正确
- ✅ Drop off 模式外部堆场堆存费计算正确
- ✅ Expedited 模式加急费计算正确

---

### **集成测试**

创建测试场景验证修复效果：

```typescript
// 场景 1: Drop off 真 Drop off（提<送=卸）
const dropOffOption: UnloadOption = {
  containerNumber: 'TEST123',
  warehouse: warehouse1,
  plannedPickupDate: new Date('2026-03-25'),
  strategy: 'Drop off',
  isWithinFreePeriod: false
};

const breakdown = await service.evaluateTotalCost(dropOffOption);

// 预期：yardStorageCost > 0（因为提<送）
expect(breakdown.yardStorageCost).toBeGreaterThan(0);
```

---

### **手动测试**

访问排产页面：`http://localhost:5173/#/scheduling`

**测试步骤**：
1. 选择一个待排产货柜
2. 点击"预览排产"
3. 查看费用明细中的"外部堆场费"
4. 验证 Drop off 模式下的费用计算是否正确

---

## 📝 **文档更新**

需要更新的相关文档：

1. ✅ `智能排柜系统完整文档.md` - 已更新接口定义
2. ✅ `成本计算 - 所有费用项完整清单.md` - 已更新日期变量命名
3. ✅ `Drop off 模式场景详解.md` - 已更新提送卸关系说明

---

## 🎉 **改进效果**

### **代码可读性提升**

- ✅ 变量名实相符：`plannedPickupDate` = 提柜日
- ✅ 语义清晰：不再需要猜测 `unloadDate` 的含义
- ✅ 注释完善：添加了详细的业务逻辑说明

---

### **Bug 修复**

- ✅ 外部堆场堆存费计算逻辑修正
- ✅ Drop off 模式送仓日计算修正
- ✅ 还箱日推导逻辑优化

---

### **可维护性提升**

- ✅ 新成员可以快速理解日期关系
- ✅ 减少沟通成本（无需解释 unloadDate 的真实含义）
- ✅ 降低未来出错的概率

---

## 🔄 **兼容性说明**

### **破坏性变更**

由于修改了接口定义，需要同步更新：

1. ✅ 后端服务代码（已完成）
2. ✅ 前端类型和组件（已完成）
3. ✅ 测试用例（已完成）

### **数据迁移**

无数据库变更，纯代码重构。

---

## 📞 **后续建议**

### **Phase 2: 添加 computed 属性**

在前端组件中添加计算属性，自动推导卸柜日：

```typescript
const computedUnloadDate = computed(() => {
  if (!selectedOption.plannedPickupDate) return null;
  
  if (selectedOption.strategy === 'Drop off') {
    return addDays(selectedOption.plannedPickupDate, 2);
  }
  
  return selectedOption.plannedPickupDate;
});
```

---

### **Phase 3: 可视化日期关系**

在 UI 上显示完整的日期时间线：

```
提柜日 (D1) → 送仓日 (D3) → 卸柜日 (D3) → 还箱日 (D6)
     ↓              ↓           ↓            ↓
  2026-03-25   2026-03-27  2026-03-27  2026-03-30
```

---

**重构完成时间**: 2026-03-26  
**重构负责人**: AI Assistant  
**状态**: ✅ 已完成
