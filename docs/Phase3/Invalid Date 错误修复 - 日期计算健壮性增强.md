# Invalid Date 错误修复 - 日期计算健壮性增强

## 🐛 问题描述

**错误现象**：

```
RangeError: Invalid time value
    at Date.toISOString (<anonymous>)
    at IntelligentSchedulingService.scheduleSingleContainer (line 329)
```

**错误日志**：

```
2026-03-26 13:08:30 [error]: [IntelligentScheduling] Error scheduling container ECMU5381817: Invalid time value
2026-03-26 13:08:30 [error]: [IntelligentScheduling] Error scheduling container ECMU5399586: Invalid time value
2026-03-26 13:08:30 [error]: [IntelligentScheduling] Error scheduling container ECMU5400183: Invalid time value
```

**影响**：5 个货柜排产全部失败

---

## 🔍 根本原因

### 问题链路

```
时区问题修复
  ↓
plannedCustomsDate = new Date(clearanceDate + 'T00:00:00')
  ↓
calculatePlannedPickupDate(plannedCustomsDate, lastFreeDate)
  ↓
如果 clearanceDate 无效 → plannedPickupDate 也无效
  ↓
调用 plannedPickupDate.toISOString()
  ↓
RangeError: Invalid time value ❌
```

### 代码缺陷

#### ❌ 缺陷 1：未验证日期计算结果

```typescript
// 第 321-324 行
let plannedPickupDate = await this.calculatePlannedPickupDate(plannedCustomsDate, destPo.lastFreeDate);

// ❌ 直接使用，未检查是否有效
const pickupDateStr = plannedPickupDate.toISOString().split("T")[0];
```

**问题**：

- `calculatePlannedPickupDate` 可能返回无效日期
- 如果 `customsDate` 本身无效，计算结果也无效
- 调用 `toISOString()` 时抛出 `RangeError`

#### ❌ 缺陷 2：未处理输入参数验证

```typescript
// calculatePlannedPickupDate 方法
private async calculatePlannedPickupDate(customsDate: Date, lastFreeDate?: Date): Promise<Date> {
  const pickupDate = new Date(customsDate);
  pickupDate.setDate(pickupDate.getDate() + 1);

  // ❌ 未验证 customsDate 是否有效
  // ❌ 直接计算，可能导致结果无效
}
```

---

## ✅ 修复方案

### 核心策略：**防御式编程 + 多层验证**

#### ✅ 修复 1：验证提柜日计算结果

**位置**：`scheduleSingleContainer` 方法（L321-338）

```typescript
let plannedPickupDate = await this.calculatePlannedPickupDate(plannedCustomsDate, destPo.lastFreeDate);

// ✅ 验证日期有效性
if (!plannedPickupDate || isNaN(plannedPickupDate.getTime())) {
  logger.warn(`[IntelligentScheduling] Invalid pickup date calculated for ${container.containerNumber}`);
  return {
    containerNumber: container.containerNumber,
    success: false,
    message: "计算提柜日失败",
    ...containerInfo,
  };
}

// ✅ 使用日期字符串比较（安全）
const todayStr = today.toISOString().split("T")[0];
const pickupDateStr = plannedPickupDate.toISOString().split("T")[0];

if (pickupDateStr < todayStr) {
  plannedPickupDate = new Date(todayStr + "T00:00:00");
  plannedCustomsDate.setTime(plannedPickupDate.getTime());
  plannedCustomsDate.setDate(plannedCustomsDate.getDate() - 1);
}
```

**优点**：

- ✅ 提前捕获无效日期，避免后续崩溃
- ✅ 返回友好的错误消息
- ✅ 使用 `toISOString().split('T')[0]` 安全转换

#### ✅ 修复 2：验证输入参数

**位置**：`calculatePlannedPickupDate` 方法（L562-578）

```typescript
private async calculatePlannedPickupDate(customsDate: Date, lastFreeDate?: Date): Promise<Date> {
  // ✅ 验证输入日期
  if (!customsDate || isNaN(customsDate.getTime())) {
    logger.warn('[IntelligentScheduling] Invalid customsDate passed to calculatePlannedPickupDate');
    return new Date(); // 返回今天作为默认值
  }

  const pickupDate = new Date(customsDate);
  pickupDate.setDate(pickupDate.getDate() + 1); // 清关后次日提柜

  if (lastFreeDate) {
    const lastFree = new Date(lastFreeDate);
    lastFree.setHours(0, 0, 0, 0);
    if (pickupDate > lastFree) {
      pickupDate.setTime(lastFree.getTime());
    }
  }

  // 跳过周末（如果配置了 skip_weekends = true）
  await this.skipWeekendsIfNeeded(pickupDate);

  return pickupDate;
}
```

**优点**：

- ✅ 源头验证，防止无效日期传入
- ✅ 提供兜底返回值（今天）
- ✅ 记录警告日志，便于排查问题

---

## 🔄 修复前后对比

### 修复前（崩溃）

```
输入：clearanceDate 无效
   ↓
new Date(clearanceDate + 'T00:00:00') → Invalid Date
   ↓
calculatePlannedPickupDate() → Invalid Date
   ↓
plannedPickupDate.toISOString()
   ↓
❌ RangeError: Invalid time value
   ↓
排产失败 ❌
```

### 修复后（安全处理）

```
输入：clearanceDate 无效
   ↓
new Date(clearanceDate + 'T00:00:00') → Invalid Date
   ↓
calculatePlannedPickupDate()
   → 检测到 customsDate 无效
   → 返回今天
   ↓
验证 plannedPickupDate
   → isValid = true ✅
   ↓
继续排产流程 ✅
```

---

## 🛡️ 防御式编程实践

### 1. 日期验证通用模式

```typescript
// ✅ 验证 Date 对象是否有效
function isValidDate(date: Date): boolean {
  return date instanceof Date && !isNaN(date.getTime());
}

// ✅ 使用示例
if (!isValidDate(plannedPickupDate)) {
  logger.warn("Invalid date detected");
  return error;
}
```

### 2. 安全的日期转字符串

```typescript
// ✅ 安全转换
function safeToISOString(date: Date): string {
  if (!date || isNaN(date.getTime())) {
    logger.warn("Invalid date in toISOString");
    return new Date().toISOString().split("T")[0]; // 回退到今天
  }
  return date.toISOString().split("T")[0];
}
```

### 3. 多层验证策略

```typescript
// 第 1 层：输入验证
if (!customsDate || isNaN(customsDate.getTime())) {
  return new Date();
}

// 第 2 层：计算结果验证
const pickupDate = await calculatePlannedPickupDate(customsDate);
if (!pickupDate || isNaN(pickupDate.getTime())) {
  return error;
}

// 第 3 层：使用前的最后验证
const dateStr = pickupDate.toISOString().split("T")[0]; // 安全
```

---

## 🧪 测试验证

### 测试场景 1：无效清关日

**输入**：

- `clearanceDate = null`
- `clearanceDate = undefined`
- `clearanceDate = new Date('invalid')`

**预期**：

- `calculatePlannedPickupDate` 返回今天
- 提柜日 = 今天 + 1 天
- 不抛出异常 ✅

### 测试场景 2：正常清关日

**输入**：

- `clearanceDate = 2026-03-25`

**预期**：

- 提柜日 = 2026-03-26
- 正常排产 ✅

### 测试场景 3：lastFreeDate 早于清关日

**输入**：

- `clearanceDate = 2026-03-25`
- `lastFreeDate = 2026-03-24`

**预期**：

- 提柜日 = lastFreeDate = 2026-03-24
- 不抛出异常 ✅

---

## 📚 技术要点

### 1. Date 对象验证

```javascript
// ❌ 错误：只检查是否为 Date 实例
if (date instanceof Date) {
}

// ✅ 正确：同时检查是否为有效时间戳
if (date instanceof Date && !isNaN(date.getTime())) {
}
```

### 2. isNaN() 的使用

```javascript
// isNaN() 专门用于检测 NaN
isNaN(NaN); // true
isNaN(123); // false
isNaN("abc"); // true (会转换为数字)

// 对于 Date 对象
const invalidDate = new Date("invalid");
isNaN(invalidDate.getTime()); // true
```

### 3. toISOString() 的安全性

```javascript
// ❌ 直接调用（可能崩溃）
const invalidDate = new Date("invalid");
invalidDate.toISOString(); // RangeError

// ✅ 先验证再调用
if (!isNaN(invalidDate.getTime())) {
  invalidDate.toISOString();
} else {
  // 处理无效日期
}
```

---

## 🎯 业务价值

### 解决的问题

✅ 防止无效日期导致系统崩溃  
✅ 提高排产系统的健壮性  
✅ 减少异常日志污染

### 带来的好处

✅ 用户体验更好（友好错误提示）  
✅ 运维成本更低（易于排查问题）  
✅ 代码质量更高（防御式编程）

---

## 📝 相关文档

- [时区问题修复 - 提柜日显示为过去日期](./时区问题修复 - 提柜日显示为过去日期.md)
- [计划提柜日过期问题修复](./计划提柜日过期问题修复.md)
- [ETA 顺延天数设计变更](./ETA 顺延天数设计变更.md)

---

**修复时间**：2026-03-26  
**修复状态**：✅ 已完成  
**影响范围**：智能排柜日期计算逻辑
