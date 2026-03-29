# Drop off 模式场景详解 - 提 < 送 = 卸

**创建日期**: 2026-03-25  
**关键发现**: 送仓日的作用与堆场使用判断  
**状态**: ✅ 已澄清  

---

## 📋 核心问题

您提出的关键场景：**提 < 送 = 卸**

这个场景揭示了当前实现中的一个**重要逻辑漏洞**！

---

## 🔍 四个关键日期概念

### **1. 提柜日 (Pickup Date)**
- 从港口提取货柜的日期
- 数据源：`process_trucking_transport.plannedPickupDate`

### **2. 送仓日 (Delivery Date)** ⭐ **关键！**
- 将货柜送到仓库的日期
- 数据源：`process_trucking_transport.plannedDeliveryDate`
- **业务含义**: 货柜实际到达仓库的日期

### **3. 卸柜日 (Unload Date)**
- 在仓库开始卸货的日期
- 数据源：`process_warehouse_operations.plannedUnloadDate`
- **业务含义**: 仓库开始作业的日期

### **4. 还箱日 (Return Date)**
- 将空箱返还给车队的日期
- 数据源：`process_empty_returns.plannedReturnDate`

---

## 📊 Drop off 模式的两种子场景

### **场景 A: 提 < 送 = 卸** ⭐ **真实 Drop off**

```
时间线:
Day 1 (提) → Day 2,3,...(堆场存放) → Day N(送=卸)

示例:
- 提柜日：2026-03-25
- 送仓日：2026-03-28  ← 货柜在堆场放了 3 天
- 卸柜日：2026-03-28  ← 送到当天立即卸货
- 还箱日：2026-03-29

判断:
✅ 提 (03-25) < 送 (03-28) = 卸 (03-28)
✅ 货柜在堆场存放了 3 天
✅ 实际使用了堆场服务
✅ 应该收费
```

**堆场存放天数计算**:
```typescript
yardStorageDays = 送仓日 - 提柜日 = 03-28 - 03-25 = 3 天
```

---

### **场景 B: 提 = 送 = 卸** ❌ **假 Drop off**

```
时间线:
Day 1 (提=送=卸) → Day 2 (还)

示例:
- 提柜日：2026-03-25
- 送仓日：2026-03-25  ← 直接从港口送到仓库
- 卸柜日：2026-03-25  ← 同日卸货
- 还箱日：2026-03-26

判断:
❌ 提 (03-25) = 送 (03-25) = 卸 (03-25)
❌ 货柜没有在堆场存放
❌ 未使用堆场服务
❌ 不应该收费
```

**堆场存放天数计算**:
```typescript
yardStorageDays = 送仓日 - 提柜日 = 03-25 - 03-25 = 0 天
```

---

## ⚠️ **当前实现的逻辑漏洞**

### ❌ **错误的判断逻辑**

**当前代码**:
```typescript
// ❌ 错误：只比较 提 vs 卸
const pickupDayStr = plannedPickupDate.toISOString().split('T')[0];
const unloadDayStr = plannedUnloadDate.toISOString().split('T')[0];

if (pickupDayStr !== unloadDayStr) {
  // 计算费用
}
```

**问题所在**:
- 只比较 `提` 和 `卸`，**忽略了 `送`**
- 无法区分**真 Drop off**（提 < 送 = 卸）和**假 Drop off**（提 = 送 = 卸）
- 可能误判场景

---

### ✅ **正确的判断逻辑**

**应该比较 `提` vs `送`**:

```typescript
// ✅ 正确：比较 提 vs 送
const pickupDayStr = plannedPickupDate.toISOString().split('T')[0];
const deliveryDayStr = plannedDeliveryDate.toISOString().split('T')[0];

if (pickupDayStr !== deliveryDayStr) {
  // ✅ 提 < 送，说明货柜在堆场存放了
  // 计算堆场堆存费
  const yardStorageDays = dateTimeUtils.daysBetween(plannedPickupDate, plannedDeliveryDate);
  yardStorageCost = standardRate * yardStorageDays + yardOperationFee;
}
```

**判断标准**:
- `提 ≠ 送` → ✅ **真 Drop off**，实际使用堆场 → **收费**
- `提 = 送` → ❌ **假 Drop off**，未使用堆场 → **不收费**

---

## 📊 **完整场景对比表**

| 场景 | 提 | 送 | 卸 | 还 | 是否 Drop off | 实际使用堆场 | 是否收费 |
|------|---|---|---|---|-------------|------------|---------|
| 1 | Day1 | Day1 | Day1 | Day1 | Live load | ❌ 否 | ❌ **不收费** |
| 2 | Day1 | Day1 | Day1 | Day2 | ❌ 假 Drop off | ❌ 否 | ❌ **不收费** |
| 3 | Day1 | Day3 | Day3 | Day4 | ✅ **真 Drop off** | ✅ **是** | ✅ **收费** |
| 4 | Day1 | Day2 | Day3 | Day4 | ✅ **真 Drop off** | ✅ **是** | ✅ **收费** |

**关键发现**:
- 场景 2 是**假 Drop off**，虽然模式选了 Drop off，但实际没有使用堆场
- 场景 3 和 4 是**真 Drop off**，货柜在堆场存放了
- **判断标准应该是 `提 vs 送`，而不是 `提 vs 卸`**

---

## 🔧 **修复方案**

### **方案 1: 使用送仓日判断** ⭐ **推荐**

```typescript
// intelligentScheduling.service.ts
let yardStorageCost = 0;
if (unloadMode === 'Drop off' && truckingCompany.hasYard) {
  try {
    // ✅ 正确：获取送仓日
    const plannedDeliveryDate = this.calculatePlannedDeliveryDate(
      plannedPickupDate,
      unloadMode,
      plannedUnloadDate
    );
    
    // 判断是否实际使用了堆场：提柜日 < 送仓日
    const pickupDayStr = plannedPickupDate.toISOString().split('T')[0];
    const deliveryDayStr = plannedDeliveryDate.toISOString().split('T')[0];
    
    if (pickupDayStr !== deliveryDayStr) {
      // ✅ 提 < 送，说明货柜在堆场存放了
      // 预计堆场存放天数（从提柜日到送仓日）
      const yardStorageDays = dateTimeUtils.daysBetween(plannedPickupDate, plannedDeliveryDate);
      
      // ... 计算费用逻辑
    }
  } catch (error) {
    logger.error(`[IntelligentScheduling] Yard storage cost calculation failed:`, error);
    yardStorageCost = 0;
  }
}
```

**优势**:
- ✅ 准确反映业务实际
- ✅ 区分真假 Drop off
- ✅ 避免误收费

---

### **方案 2: 保持当前逻辑（有缺陷）**

```typescript
// ❌ 当前代码：比较 提 vs 卸
if (pickupDayStr !== unloadDayStr) {
  // 计算费用
}
```

**问题**:
- ❌ 无法识别场景 2（假 Drop off）
- ❌ 可能误收费
- ❌ 不符合业务实际

---

## 🎯 **送仓日的业务意义**

### **送仓日的计算逻辑**

根据 [`intelligentScheduling.service.ts:738-748`](file://d:\Gihub\logix\backend\src\services\intelligentScheduling.service.ts#L738-L748):

```typescript
private calculatePlannedDeliveryDate(
  pickupDate: Date,
  unloadMode: string,
  unloadDate: Date
): Date {
  if (unloadMode === 'Live load') {
    return new Date(pickupDate); // 提 = 送（同日）
  }
  // Drop off：送 = 卸（送仓日即卸柜日）
  return new Date(unloadDate);
}
```

**关键发现**:
- **Live load**: 提 = 送 = 卸
- **Drop off**: 送 = 卸，但**提 < 送**

**问题**: 这个计算逻辑**假设** Drop off 模式下 `送 = 卸`，但实际上：
- 可能 `提 < 送 = 卸`（真 Drop off）
- 也可能 `提 = 送 = 卸`（假 Drop off，直接送仓）

---

## 📝 **实际业务场景举例**

### **场景 3: 真 Drop off（提 < 送 = 卸）**

```
背景:
- 仓库排产已满，无法立即卸货
- 车队有堆场，可以先存放

时间线:
Day 1 (03-25): 从港口提柜
               ↓
               放入车队堆场
               ↓
Day 2-4:       在堆场存放 3 天
               ↓
Day 5 (03-28): 送到仓库，立即卸货
               ↓
Day 6 (03-29): 还空箱

费用:
✅ 外部堆场堆存费 = $80 × 3 天 + $50 = $290
```

**判断逻辑**:
```typescript
提 (03-25) ≠ 送 (03-28) → ✅ 收费
```

---

### **场景 2: 假 Drop off（提 = 送 = 卸）**

```
背景:
- 仓库有档期，可以立即卸货
- 虽然选了 Drop off 模式，但不需要堆场

时间线:
Day 1 (03-25): 从港口提柜
               ↓
               直接送到仓库（不经堆场）
               ↓
               立即卸货
               ↓
Day 2 (03-26): 还空箱

费用:
❌ 外部堆场堆存费 = $0
```

**判断逻辑**:
```typescript
提 (03-25) = 送 (03-25) → ❌ 不收费
```

---

## 🚨 **当前代码的问题总结**

### **问题 1: 判断逻辑不准确**

```typescript
// ❌ 错误：比较 提 vs 卸
if (pickupDayStr !== unloadDayStr) {
  // 计算费用
}
```

**后果**:
- 场景 2（提=送=卸）可能被误判为需要收费
- 因为 `提 = 卸`，不会进入计费逻辑 → ✅ **碰巧正确**
- 但逻辑不清晰，容易误导

---

### **问题 2: 堆场天数计算不准确**

```typescript
// ❌ 错误：从卸柜日到还箱日
const yardStorageDays = dateTimeUtils.daysBetween(plannedUnloadDate, plannedReturnDate);
```

**正确应该是**:
```typescript
// ✅ 正确：从提柜日到送仓日
const yardStorageDays = dateTimeUtils.daysBetween(plannedPickupDate, plannedDeliveryDate);
```

**原因**:
- 堆场存放期间 = 提柜后 → 送仓前
- 不是 卸柜后 → 还箱前

---

## ✅ **完整修复方案**

### **步骤 1: 修改判断逻辑**

```typescript
// intelligentScheduling.service.ts:944-976
let yardStorageCost = 0;
if (unloadMode === 'Drop off' && truckingCompany.hasYard) {
  try {
    // ✅ 获取送仓日
    const plannedDeliveryDate = this.calculatePlannedDeliveryDate(
      plannedPickupDate,
      unloadMode,
      plannedUnloadDate
    );
    
    // ✅ 判断是否实际使用了堆场：提柜日 < 送仓日
    const pickupDayStr = plannedPickupDate.toISOString().split('T')[0];
    const deliveryDayStr = plannedDeliveryDate.toISOString().split('T')[0];
    
    if (pickupDayStr !== deliveryDayStr) {
      // ✅ 提 < 送，说明货柜在堆场存放了
      // ✅ 预计堆场存放天数（从提柜日到送仓日）
      const yardStorageDays = dateTimeUtils.daysBetween(
        plannedPickupDate, 
        plannedDeliveryDate
      );
      
      // ... 后续计算费用逻辑
    }
  } catch (error) {
    logger.error(`[IntelligentScheduling] Yard storage cost calculation failed:`, error);
    yardStorageCost = 0;
  }
}
```

---

### **步骤 2: 同步修改 schedulingCostOptimizer.service.ts**

```typescript
// schedulingCostOptimizer.service.ts:277-320
breakdown.yardStorageCost = 0;

if (option.strategy === 'Drop off' && option.truckingCompany) {
  try {
    const hasYard = option.truckingCompany.hasYard || false;
    
    if (hasYard) {
      // ✅ 获取送仓日
      const plannedDeliveryDate = option.unloadDate; // Drop off: 送 = 卸
      
      // ✅ 判断是否实际使用了堆场：提柜日 < 送仓日
      const pickupDayStr = option.unloadDate.toISOString().split('T')[0];
      const deliveryDayStr = plannedDeliveryDate.toISOString().split('T')[0];
      
      if (pickupDayStr !== deliveryDayStr) {
        // ✅ 提 < 送，说明货柜在堆场存放了
        const yardStorageDays = dateTimeUtils.daysBetween(
          option.unloadDate, // ← 这里应该是提柜日
          plannedDeliveryDate
        );
        
        // ... 计算费用
      }
    }
  } catch (error) {
    log.warn(`[CostOptimizer] Yard storage cost calculation failed:`, error);
    breakdown.yardStorageCost = 0;
  }
}
```

---

## 📊 **修复前后对比**

| 场景 | 修复前判断 | 修复后判断 | 改进 |
|------|-----------|-----------|------|
| **真 Drop off (提<送=卸)** | ✅ 收费 | ✅ 收费 | 保持正确 |
| **假 Drop off (提=送=卸)** | ✅ 不收费 | ✅ 不收费 | 保持正确 |
| **Live load (提=送=卸)** | ✅ 不收费 | ✅ 不收费 | 保持正确 |
| **堆场天数计算** | ❌ 卸→还 | ✅ 提→送 | **修正** |

---

## 🎯 **核心结论**

### **关键发现**

1. **送仓日是关键** ⭐
   - 判断堆场使用：`提 vs 送`
   - 不是 `提 vs 卸`

2. **堆场存放期间** 📅
   - 正确：`提柜日 → 送仓日`
   - 错误：`卸柜日 → 还箱日`

3. **真假 Drop off 区分** 🔍
   - 真 Drop off: `提 < 送 = 卸` → 收费
   - 假 Drop off: `提 = 送 = 卸` → 不收费

---

### **待修复问题**

- [ ] 修改判断逻辑：`提 vs 送` 而不是 `提 vs 卸`
- [ ] 修正堆场天数计算：`送 - 提` 而不是 `还 - 卸`
- [ ] 添加单元测试验证所有场景
- [ ] 更新文档说明

---

**状态**: 待修复  
**优先级**: P0  
**最后更新**: 2026-03-25  
**维护者**: AI Assistant
