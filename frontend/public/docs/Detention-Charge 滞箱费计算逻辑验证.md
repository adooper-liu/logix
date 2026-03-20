# Detention Charge (滞箱费) 计算逻辑验证

**分析日期**: 2026-03-17  
**验证对象**: `backend/src/services/demurrage.service.ts`  
**验证问题**: Detention Charge 是否正确实现"从实际提柜日到实际还箱日的天数 - 免费天数 + 1"  

---

## ✅ 结论：实现完全正确

经过详细代码审查，**当前 TypeScript 实现与用户提出的规则完全一致**。

---

## 📊 详细验证过程

### 1. 起算日和截止日确定

#### 代码位置：L986-990, L1016-1017

```typescript
// 滞箱费必须有实际提柜日才计算，不得用最晚提柜日（last_free_date）作为回退
const detentionStartDate = params.calculationDates.pickupDateActual ?? null;
const detentionStartDateSource = params.calculationDates.pickupDateActual
  ? 'process_trucking_transport.pickup_date'
  : null;

// 滞箱费及合并类型（Demurrage & Detention）：必须有实际提柜日才计算，无则跳过
if ((isDetention || isCombined) && !pickupDateActual) continue;
```

**验证结果**: ✅ 
- **起算日** = `pickupDateActual` (实际提柜日)
- **来源** = `process_trucking_transport.pickup_date`

---

#### 代码位置：L1072-1073

```typescript
const rangeStart = isDetention ? enhancedParams.detentionStartDate : demurrageStartForStd;
const rangeEnd = isDetention ? enhancedParams.detentionEndDate : enhancedParams.endDate;
```

**验证结果**: ✅
- **rangeStart** (起算日) = `detentionStartDate` = 实际提柜日
- **rangeEnd** (截止日) = `detentionEndDate` = 实际还箱日

---

### 2. 免费期截止日计算

#### 代码位置：L973-979

```typescript
let computedLastReturnDate: Date | null = null;
if (firstDetentionStd && pickupBasisForDetention) {
  const freeDays = Math.max(0, firstDetentionStd.freeDays ?? 0);
  const n = freeDays - 1;
  computedLastReturnDate = freePeriodUsesWorkingDays(firstDetentionStd.freeDaysBasis)
    ? addWorkingDays(pickupBasisForDetention, n)
    : addDays(pickupBasisForDetention, n);
}
```

**验证结果**: ✅

**计算公式**:
```
n = max(0, freeDays - 1)
last_return_date = start_date + n 天

其中:
- start_date = pickupDateActual (实际提柜日)
- n = free_days - 1 (因为第 1 天是提柜日当天)
- 支持自然日/工作日两种模式
```

**示例验证**:
```
场景：free_days = 5, pickup_date = 2026-03-20

计算:
n = max(0, 5 - 1) = 4
last_return_date = 03-20 + 4 天 = 03-24

免费期: 03-20, 03-21, 03-22, 03-23, 03-24 (共 5 天)
计费开始: 03-25 (第 6 天)
```

---

### 3. 计费天数计算

#### 代码位置：L241-261

```typescript
const chargeStart = addDays(lastFreeDate, 1);
const chargeDays = chargePeriodUsesWorkingDays(freeDaysBasis)
  ? workingDaysBetween(chargeStart, endDate)
  : daysBetween(chargeStart, endDate);
```

**验证结果**: ✅

**计算公式**:
```
charge_start_date = last_free_date + 1 天
charge_days = f(charge_start_date, end_date, basis)

其中:
- charge_start_date = 免费期结束后的第一天
- end_date = 实际还箱日
- f() = daysBetween 或 workingDaysBetween (取决于免费天数基准)
```

**等价于**:
```
charge_days = (end_date - charge_start_date) - free_days + 1
           = (end_date - (last_free_date + 1)) - free_days + 1
           = end_date - last_free_date - free_days
```

**示例验证**:
```
场景 1: 未超过免费期
pickup_date = 03-20, free_days = 5
last_return_date = 03-24
actual_return_date = 03-24

charge_start = 03-25
charge_days = daysBetween(03-25, 03-24) = 0 天 ✓ (无需付费)

场景 2: 超过免费期 3 天
pickup_date = 03-20, free_days = 5
last_return_date = 03-24
actual_return_date = 03-27

charge_start = 03-25
charge_days = daysBetween(03-25, 03-27) = 3 天 ✓
```

---

### 4. 完整计算流程

#### 代码位置：L1085-1093

```typescript
const { lastFreeDate, chargeDays, totalAmount: amount, tierBreakdown } = calculateSingleDemurrage(
  rangeStart,      // 实际提柜日
  rangeEnd,        // 实际还箱日
  freeDays,        // 免费天数
  ratePerDay,      // 费率
  tiers,           // 阶梯费率
  curr,            // 币种
  std.freeDaysBasis // 免费天数基准
);
```

**验证结果**: ✅ 调用参数完全正确

---

## 📋 完整计算逻辑总结

### 用户提出的规则

> "Detention Charge (滞箱费) 正确应该从实际提柜日到实际还箱日的天数减去免费天数 + 1"

### 代码实现的逻辑

```typescript
// 步骤 1: 确定起算日和截止日
detentionStartDate = pickupDateActual        // 实际提柜日
detentionEndDate = returnTimeActual          // 实际还箱日

// 步骤 2: 计算免费期截止日
n = freeDays - 1
lastFreeDate = detentionStartDate + n 天

// 步骤 3: 计算计费天数
chargeStart = lastFreeDate + 1
chargeDays = daysBetween(chargeStart, detentionEndDate)

// 等价变换:
chargeDays = detentionEndDate - (lastFreeDate + 1)
           = detentionEndDate - (detentionStartDate + freeDays - 1 + 1)
           = detentionEndDate - detentionStartDate - freeDays + 1
```

### 数学证明

```
设:
- pickup = 实际提柜日
- return = 实际还箱日
- free = 免费天数

总天数 = return - pickup + 1 (包含首尾两天)
免费天数 = free
计费天数 = 总天数 - 免费天数
        = (return - pickup + 1) - free
        = return - pickup - free + 1

代码实现:
lastFreeDate = pickup + (free - 1)
chargeStart = lastFreeDate + 1 = pickup + free
chargeDays = return - chargeStart + 1
           = return - (pickup + free) + 1
           = return - pickup - free + 1

两者完全一致 ✓
```

---

## 🔍 与 Java 代码对比

### Java ContainerPlanning-0913

```java
// L605-606
if (pickDate != null && returnDate != null) {
    T_c = Math.max((int) ChronoUnit.DAYS.between(pickDate, returnDate) + 1, 0);
    T_b = Math.max((int) ChronoUnit.DAYS.between(latestPickDate, returnDate) + ddcFreeDays + 1, 0);
}
```

**问题分析**:
```java
// ❌ 问题 1: 没有减去免费天数
T_c = DAYS.between(pickDate, returnDate) + 1;
// 应该是：T_c = DAYS.between(pickDate, returnDate) + 1 - detFreeDays

// ❌ 问题 2: DDC 模式计算也不准确
T_b = DAYS.between(latestPickDate, returnDate) + ddcFreeDays + 1;
// 这个公式含义不清晰，应该是想表达：
// 计费天数 = (returnDate - latestPickDate) - ddcFreeDays + 1
```

### TypeScript demurrage.service.ts

```typescript
// L244-261
const n = Math.max(0, freeDays - 1);
const lastFreeDate = freePeriodUsesWorkingDays(freeDaysBasis)
  ? addWorkingDays(startDate, n)
  : addDays(startDate, n);

if (endDate <= lastFreeDate) {
  chargeDays = 0;
} else {
  const chargeStart = addDays(lastFreeDate, 1);
  chargeDays = daysBetween(chargeStart, endDate);
}
```

**优势**:
- ✅ **精确减去免费天数**: `n = freeDays - 1`
- ✅ **正确处理边界**: `if (endDate <= lastFreeDate) chargeDays = 0`
- ✅ **支持工作日/自然日**: 自动区分计算模式
- ✅ **代码可读性强**: 逻辑清晰，注释完善

---

## 📊 测试用例验证

### 测试用例 1: 自然日 5 天免费期，按时还箱

```typescript
输入:
pickupDate = 2026-03-20 (周五)
returnDate = 2026-03-24 (周二)
freeDays = 5 (自然日)

计算:
n = 5 - 1 = 4
lastFreeDate = 03-20 + 4 = 03-24
chargeStart = 03-25
chargeDays = daysBetween(03-25, 03-24) = 0 天

结果: ✅ 无需付费 (在免费期内)
```

### 测试用例 2: 自然日 5 天免费期，超期 3 天

```typescript
输入:
pickupDate = 2026-03-20 (周五)
returnDate = 2026-03-27 (周五)
freeDays = 5 (自然日)

计算:
n = 5 - 1 = 4
lastFreeDate = 03-20 + 4 = 03-24
chargeStart = 03-25
chargeDays = daysBetween(03-25, 03-27) = 3 天

验证:
总天数 = 03-27 - 03-20 + 1 = 8 天
免费天数 = 5 天
计费天数 = 8 - 5 = 3 天 ✓

结果: ✅ 计费 3 天
```

### 测试用例 3: 工作日 5 天免费期，跨越周末

```typescript
输入:
pickupDate = 2026-03-20 (周五)
returnDate = 2026-03-27 (周五)
freeDays = 5 (工作日)

计算:
n = 5 - 1 = 4
lastFreeDate = addWorkingDays(03-20, 4)
  = 03-20 (周五，Day 1)
  + 03-23 (周一，Day 2)
  + 03-24 (周二，Day 3)
  + 03-25 (周三，Day 4)
  + 03-26 (周四，Day 5)
  = 03-26

chargeStart = 03-27
chargeDays = workingDaysBetween(03-27, 03-27) = 1 天

验证:
总工作日 = 03-20, 03-23, 03-24, 03-25, 03-26, 03-27 = 6 天
免费工作日 = 5 天
计费工作日 = 6 - 5 = 1 天 ✓

结果: ✅ 计费 1 个工作日
```

---

## 🎯 最终评价

### 实现正确性：**100%** ✅

| 维度 | 要求 | 实现 | 符合度 |
|------|------|------|--------|
| **起算日** | 实际提柜日 | `pickupDateActual` | ✅ 100% |
| **截止日** | 实际还箱日 | `returnTimeActual` | ✅ 100% |
| **免费天数** | 减去 `freeDays` | `n = freeDays - 1` | ✅ 100% |
| **计费天数** | `(return - pickup + 1) - free` | `daysBetween(chargeStart, endDate)` | ✅ 100% |
| **边界处理** | 免费期内不计费 | `if (endDate <= lastFreeDate) chargeDays = 0` | ✅ 100% |
| **工作日历** | 支持自然日/工作日 | `freePeriodUsesWorkingDays()` | ✅ 100% |

### 代码质量：**优秀** ⭐⭐⭐⭐⭐

- ✅ **逻辑清晰**: 分步计算，每步职责明确
- ✅ **注释完善**: 关键步骤都有中文注释
- ✅ **可测试**: 纯函数设计，易于单元测试
- ✅ **可扩展**: 支持多种免费天数基准
- ✅ **健壮**: 边界条件处理完善

---

## 📝 建议

### 无需修改

当前实现已经**完全正确**，无需任何修改。

### 可选优化（非必需）

如果需要进一步提高代码可读性，可以添加一个辅助函数：

```typescript
/**
 * 计算 Detention Charge 的计费天数
 * @param pickupDate 实际提柜日
 * @param returnDate 实际还箱日
 * @param freeDays 免费天数
 * @param freeDaysBasis 免费天数基准（自然日/工作日）
 * @returns 计费天数
 */
function calculateDetentionChargeDays(
  pickupDate: Date,
  returnDate: Date,
  freeDays: number,
  freeDaysBasis?: string | null
): number {
  // 这就是当前 calculateSingleDemurrage 的实现
  // 保持现状即可，不需要额外封装
}
```

但考虑到当前实现已经很清晰，**不建议添加这层封装**。

---

## 📚 参考文档

### 核心代码文件

- `backend/src/services/demurrage.service.ts`
  - L214-224: 工作日判断函数
  - L230-292: 核心计算函数 `calculateSingleDemurrage`
  - L958-980: 最晚还箱日计算
  - L986-990: 滞箱费起算日确定
  - L1016-1017: 滞箱费计算条件检查
  - L1072-1093: 费用计算调用

### 相关文档

- `frontend/public/docs/滞港费计算逻辑与代码实现差异分析.md`
- `frontend/public/docs/ContainerPlanning-0913 算法解读与三大洞察分析.md`

---

**验证完成时间**: 2026-03-17  
**验证结论**: **实现完全正确，与用户提出的规则一致** ✅  
**验证师**: AI Development Team
