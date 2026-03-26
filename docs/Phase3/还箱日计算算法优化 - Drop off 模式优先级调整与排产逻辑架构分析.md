# 还箱日计算算法优化 - Drop off 模式优先级调整与排产逻辑架构分析

**创建时间**: 2026-03-26  
**问题提出**: @用户  
**修复范围**: `backend/src/services/intelligentScheduling.service.ts`  
**涉及模式**: Drop off / Live load

---

## 📋 本次优化的两个关键问题

### 问题①：Drop off 模式的还箱能力检查顺序

#### ❌ 原有逻辑

```typescript
// Drop off 模式：还 = 卸 + 1
const nextDay = new Date(returnDateOnly);
nextDay.setUTCDate(nextDay.getUTCDate() + 1);

const availableDate = await this.findEarliestAvailableReturnDate(
  truckingCompanyId,
  nextDay, // ❌ 直接检查卸柜日 +1
  lastReturnDate,
);
```

**问题**：

- 跳过了卸柜日当天的能力检查
- 可能导致不必要的顺延（增加堆场费用）

#### ✅ 修正后的逻辑（三步优先级）

```typescript
// ✅ Drop off 模式：优先当天还箱，其次卸 +1，再往后顺延

// Step 1: 先检查卸柜日当天的还箱能力
const availableOnUnloadDate = await this.findEarliestAvailableReturnDate(
  truckingCompanyId,
  returnDateOnly, // ✅ 检查卸柜日当天
  lastReturnDate,
);

if (availableOnUnloadDate) {
  // 如果卸柜日当天有能力，当天还箱（最优解，减少堆场费用）
  return {
    returnDate: availableOnUnloadDate,
    adjustedUnloadDate: undefined,
  };
}

// Step 2: 如果卸柜日当天没能力，再检查卸柜日 +1
const nextDay = new Date(returnDateOnly);
nextDay.setUTCDate(nextDay.getUTCDate() + 1);

const availableOnNextDay = await this.findEarliestAvailableReturnDate(truckingCompanyId, nextDay, lastReturnDate);

if (availableOnNextDay) {
  // 卸柜日 +1 有能力，次日还箱（标准 Drop off 模式）
  return {
    returnDate: availableOnNextDay,
    adjustedUnloadDate: undefined,
  };
}

// Step 3: 如果都没能力，继续顺延查找
const availableDate = await this.findEarliestAvailableReturnDate(truckingCompanyId, nextDay, lastReturnDate);
```

**业务价值**：

1. ✅ **优先当天还箱** - 减少堆场费用（如果车队有能力）
2. ✅ **其次卸 +1** - 标准 Drop off 模式
3. ✅ **最后顺延** - 确保不超过最晚还箱日

---

### 问题②：提柜日兜底逻辑是否破坏了"先卸柜，后倒退"的逻辑？

#### 🔍 完整的排产流程分析

```
Step 1: 清关日 = ETA + 1 天（英国时间）
   ↓
Step 2: 提柜日 = 清关日 - 1 天（提 = 清关 +1）
   ↓
Step 3: 【兜底逻辑】如果 提柜日 ≤今天，调整为明天 ⚠️
   ↓
Step 4: 卸柜日 = 从提柜日起查找最早有仓库产能的日期
   ↓
Step 5: 送仓日 = 根据卸柜方式计算
   ↓
Step 6: 还箱日 = 根据卸柜日 + 车队还箱能力计算 ⚠️
```

#### 🎯 三种调整模式

| 模式         | 触发条件      | 调整方向      | 核心目标     |
| ------------ | ------------- | ------------- | ------------ |
| **兜底调整** | 提柜日 ≤ 今天 | 提柜日 → 明天 | 确保可执行性 |
| **正向推导** | 正常流程      | 提→送→卸→还   | 默认逻辑     |
| **反向修正** | 还箱能力不足  | 还→卸→送      | 满足外部约束 |

#### ✅ 结论：没有破坏逻辑，而是最优平衡

**兜底逻辑的本质**：

```typescript
if (pickupDateStr <= todayStr) {
  // 提柜日是过去日期或今天，调整为明天
  const tomorrow = new Date(todayStr + "T00:00:00Z");
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  plannedPickupDate = tomorrow;
  plannedCustomsDate.setTime(plannedPickupDate.getTime());
  plannedCustomsDate.setUTCDate(plannedCustomsDate.getUTCDate() - 1);
}
```

**关键点**：

1. ✅ **不是破坏**，而是**保护性调整**
2. ✅ 目的是确保**可执行性**（不能安排过去日期的操作）
3. ✅ 调整后，**后续步骤仍然基于新的提柜日继续正向推导**
4. ✅ 这是**单向流动**，不影响"以卸柜日为核心"的设计

**反向修正的特例**（还箱日计算）：

```typescript
// Live load 模式下，如果还箱能力不足，可能调整卸柜日
if (returnDateResult.adjustedUnloadDate) {
  unloadDate = returnDateResult.adjustedUnloadDate;
  plannedDeliveryDate = new Date(unloadDate);
}
```

**关键点**：

1. ✅ 这是**真正的反向修正**
2. ✅ 因为还箱日受**外部约束**（车队能力、最晚还箱日）
3. ✅ 当无法在理想日期还箱时，必须调整卸柜日

---

## 🏗️ 正确的理解框架

### "以卸柜日为核心"的双核心策略

| 场景             | 核心逻辑         | 调整方向                        | 原因                           |
| ---------------- | ---------------- | ------------------------------- | ------------------------------ |
| **正常情况**     | 以卸柜日为核心   | 卸柜日 ← 提柜日 ← 清关日        | 仓库产能是主要约束             |
| **兜底情况**     | 以可执行性为核心 | 提柜日（明天）→ 卸柜日 → 还箱日 | 不能安排过去日期               |
| **还箱能力不足** | 以还箱红线为核心 | 还箱日 → 卸柜日 → 送仓日        | 车队能力 + lastReturnDate 约束 |

**设计哲学**：

1. ✅ **正向推导为主** - 清晰、高效
2. ✅ **兜底保护为辅** - 确保可执行性
3. ✅ **特例反向修正** - 满足强外部约束

---

## 📊 场景示例对比

### 场景 A：Drop off 模式 - 卸柜日当天有能力

**输入**：

- 卸柜日：2026-03-28
- 车队还箱能力：
  - 2026-03-28: capacity=10, plannedCount=5 ✅
  - 2026-03-29: capacity=10, plannedCount=8 ✅

**原有逻辑**：

```
还箱日 = 卸柜日 + 1 = 2026-03-29
```

**修正后逻辑**：

```
Step 1: 检查 2026-03-28 → 有能力 (5 < 10) ✅
结果：还箱日 = 2026-03-28（当天还箱）
节省：1 天堆场费用 💰
```

### 场景 B：Drop off 模式 - 卸柜日没能力，卸 +1 有能力

**输入**：

- 卸柜日：2026-03-28
- 车队还箱能力：
  - 2026-03-28: capacity=10, plannedCount=10 ❌
  - 2026-03-29: capacity=10, plannedCount=7 ✅

**修正后逻辑**：

```
Step 1: 检查 2026-03-28 → 无能力 (10 = 10) ❌
Step 2: 检查 2026-03-29 → 有能力 (7 < 10) ✅
结果：还箱日 = 2026-03-29（次日还箱）
符合：标准 Drop off 模式
```

### 场景 C：提柜日兜底逻辑触发

**输入**：

- ETA: 2026-03-25
- 今天：2026-03-26

**原有计算**：

```
清关日 = ETA + 1 = 2026-03-26
提柜日 = 清关日 - 1 = 2026-03-25（昨天❌）
```

**兜底逻辑**：

```
判断：提柜日 (2026-03-25) ≤ 今天 (2026-03-26) → 触发
调整：提柜日 = 明天 = 2026-03-27
同步：清关日 = 提柜日 - 1 = 2026-03-26
后续：卸柜日从 2026-03-27 开始查找
```

**结果**：

- ✅ 提柜日：2026-03-27（未来日期，可执行）
- ✅ 清关日：2026-03-26（保持 提=清关+1）
- ✅ 卸柜日：从 2026-03-27 起查找
- ✅ 还箱日：根据卸柜日 + 车队能力计算

**没有破坏逻辑**，而是确保了可执行性。

---

## 🔧 代码修改详情

### 文件：`intelligentScheduling.service.ts`

#### 修改位置 1：`calculatePlannedReturnDate()` 方法

**行号**: L992-L1047

**修改内容**：

```typescript
// ✅ 修改前（L992-L1016）
} else {
  // Drop off 模式：还 = 卸 + 1，但受车队还箱能力约束
  // 从卸柜日次日起查找最近有还箱能力的日期
  const nextDay = new Date(returnDateOnly);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);

  const availableDate = await this.findEarliestAvailableReturnDate(
    truckingCompanyId,
    nextDay,
    lastReturnDate
  );

  if (!availableDate) {
    return {
      returnDate: nextDay,
      adjustedUnloadDate: undefined
    };
  }

  return {
    returnDate: availableDate,
    adjustedUnloadDate: undefined
  };
}

// ✅ 修改后（L992-L1047）
} else {
  // ✅ Drop off 模式：优先当天还箱，其次卸 +1，再往后顺延

  // Step 1: 先检查卸柜日当天的还箱能力
  const availableOnUnloadDate = await this.findEarliestAvailableReturnDate(
    truckingCompanyId,
    returnDateOnly,
    lastReturnDate
  );

  if (availableOnUnloadDate) {
    // 如果卸柜日当天有能力，当天还箱（最优解，减少堆场费用）
    return {
      returnDate: availableOnUnloadDate,
      adjustedUnloadDate: undefined
    };
  }

  // Step 2: 如果卸柜日当天没能力，再检查卸柜日 +1
  const nextDay = new Date(returnDateOnly);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);

  const availableOnNextDay = await this.findEarliestAvailableReturnDate(
    truckingCompanyId,
    nextDay,
    lastReturnDate
  );

  if (availableOnNextDay) {
    // 卸柜日 +1 有能力，次日还箱（标准 Drop off 模式）
    return {
      returnDate: availableOnNextDay,
      adjustedUnloadDate: undefined
    };
  }

  // Step 3: 如果都没能力，继续顺延查找
  const availableDate = await this.findEarliestAvailableReturnDate(
    truckingCompanyId,
    nextDay,
    lastReturnDate
  );

  if (!availableDate) {
    // 找不到可用日期，返回 nextDay
    return {
      returnDate: nextDay,
      adjustedUnloadDate: undefined
    };
  }

  return {
    returnDate: availableDate,
    adjustedUnloadDate: undefined
  };
}
```

---

## 🎯 业务价值总结

### 优化①：Drop off 模式三步优先级

| 价值点              | 说明                            |
| ------------------- | ------------------------------- |
| 💰 **降低堆场费用** | 优先当天还箱，减少 1 天堆场费用 |
| 📅 **智能顺延**     | 自动查找最近有能力的日期        |
| 🛡️ **红线保护**     | 不超过 lastReturnDate           |
| 🔄 **灵活适配**     | 适应不同车队的还箱能力波动      |

### 优化②：明确兜底逻辑的定位

| 价值点              | 说明                           |
| ------------------- | ------------------------------ |
| ✅ **可执行性保证** | 不安排过去日期的操作           |
| ✅ **逻辑清晰**     | 正向推导为主，反向修正为辅     |
| ✅ **最小调整**     | 仅调整提柜日，后续步骤自然顺延 |
| ✅ **业务对齐**     | 与实际操作的灵活性一致         |

---

## 📝 测试验证建议

### 测试场景 1：Drop off - 当天有能力

```sql
-- 准备数据
INSERT INTO ext_trucking_return_slot_occupancy
(trucking_company_id, slot_date, planned_count, capacity, remaining)
VALUES ('TRUCK001', '2026-03-28', 5, 10, 5);

-- 预期结果
卸柜日：2026-03-28
还箱日：2026-03-28（当天还箱）✅
```

### 测试场景 2：Drop off - 当天没能力，卸 +1 有能力

```sql
-- 准备数据
INSERT INTO ext_trucking_return_slot_occupancy
(trucking_company_id, slot_date, planned_count, capacity, remaining)
VALUES ('TRUCK001', '2026-03-28', 10, 10, 0),
       ('TRUCK001', '2026-03-29', 7, 10, 3);

-- 预期结果
卸柜日：2026-03-28
还箱日：2026-03-29（次日还箱）✅
```

### 测试场景 3：提柜日兜底逻辑

```
输入：
- ETA: 2026-03-25
- 今天：2026-03-26

预期结果：
- 清关日：2026-03-26
- 提柜日：2026-03-27（调整为明天）✅
- 卸柜日：从 2026-03-27 起查找
```

---

## 📚 相关文档

- [还箱日计算算法修复 - 车队还箱能力约束.md](./还箱日计算算法修复%20-%20车队还箱能力约束.md)
- [送仓日倒挂问题修复 - UTC 日期计算.md](./送仓日倒挂问题修复%20-%20UTC%20日期计算.md)
- [智能排产提柜日业务规则.md](./智能排产提柜日业务规则.md)

---

## ✅ 总结

本次优化解决了两个关键问题：

1. **Drop off 模式还箱能力检查顺序** - 采用三步优先级策略，优先当天还箱降低成本
2. **提柜日兜底逻辑定位** - 明确其为保护性调整，不破坏整体推导逻辑

两者结合，形成了更加完善、灵活的智能排产系统。
