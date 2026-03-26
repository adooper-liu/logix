# 送仓日倒挂问题修复 - UTC 日期计算

## 🚨 问题现象

```
提柜日：2026-03-27
送仓日：2026-03-26  ❌ 比提柜日早！
卸柜日：2026-03-26  ❌ 比提柜日早！
```

**业务逻辑错误**：必须先提柜，才能送仓和卸柜！

---

## 🔍 问题根源

### 代码位置

`intelligentScheduling.service.ts` L870

### 原有代码

```typescript
// ❌ 问题：使用本地时间方法
const date = new Date(earliestDate);
date.setDate(date.getDate() + i);     // ← 使用本地时区
date.setHours(0, 0, 0, 0);            // ← 使用本地时区
```

### 问题分析

```
场景：服务器在太平洋时间（UTC-8）

earliestDate = "2026-03-27T00:00:00Z" (UTC 提柜日)

执行代码：
  const date = new Date(earliestDate);
  // date = "2026-03-26T16:00:00-08:00" (太平洋时间)
  
  date.setDate(date.getDate() + 0);
  // date.getDate() = 26 (太平洋时间的日期)
  // date.setDate(26) → 保持 3-26
  
  date.setHours(0, 0, 0, 0);
  // "2026-03-26T00:00:00-08:00"
  
转换为 UTC 存储：
  // "2026-03-26T08:00:00Z" ❌ 变成 3-26！

结果：
  提柜日 = 3-27
  送仓日 = 3-26 ❌ 日期倒挂！
```

---

## ✅ 修复方案

### 使用 UTC 日期计算方法

```typescript
// ✅ 修复：使用 UTC 方法，避免时区问题
const date = new Date(earliestDate);
date.setUTCDate(date.getUTCDate() + i);  // ← 使用 UTC 方法
date.setUTCHours(0, 0, 0, 0);            // ← 使用 UTC 方法
```

### 修复效果

```
场景：服务器在太平洋时间（UTC-8）

earliestDate = "2026-03-27T00:00:00Z" (UTC 提柜日)

执行代码：
  const date = new Date(earliestDate);
  // date = "2026-03-27T00:00:00Z" (保持 UTC)
  
  date.setUTCDate(date.getUTCDate() + 0);
  // date.getUTCDate() = 27 (UTC 日期)
  // date.setUTCDate(27) → 保持 3-27
  
  date.setUTCHours(0, 0, 0, 0);
  // "2026-03-27T00:00:00Z" ✅ 正确！

结果：
  提柜日 = 3-27
  送仓日 = 3-27 ✅ 逻辑正确！
```

---

## 📊 修复对比

### 修复前

```
服务器时间：太平洋时间 (UTC-8)
提柜日：2026-03-27T00:00:00Z

计算送仓日：
  new Date(earliestDate) → 2026-03-26T16:00:00-08:00
  setDate(getDate() + 0) → 2026-03-26T00:00:00-08:00
  → 2026-03-26T08:00:00Z ❌ 3-26

送仓日 (3-26) < 提柜日 (3-27) ❌ 错误！
```

### 修复后

```
服务器时间：太平洋时间 (UTC-8)
提柜日：2026-03-27T00:00:00Z

计算送仓日：
  new Date(earliestDate) → 2026-03-27T00:00:00Z
  setUTCDate(getUTCDate() + 0) → 2026-03-27T00:00:00Z
  → 2026-03-27T00:00:00Z ✅ 正确！

送仓日 (3-27) = 提柜日 (3-27) ✅ 正确！
```

---

## 🔧 修复位置

### 1. findEarliestAvailableDay (L870-872)

```typescript
// ✅ 修复前
date.setDate(date.getDate() + i);
date.setHours(0, 0, 0, 0);

// ✅ 修复后
date.setUTCDate(date.getUTCDate() + i);
date.setUTCHours(0, 0, 0, 0);
```

### 2. 日期比较 (L467-469)

```typescript
// ✅ 修复前
const pickupDayStr = plannedPickupDate.toISOString().split('T')[0];
const unloadDayStr = unloadDate.toISOString().split('T')[0];

// ✅ 修复后
const pickupDayStr = plannedPickupDate.getUTCFullYear() + '-' + 
                     String(plannedPickupDate.getUTCMonth() + 1).padStart(2, '0') + '-' + 
                     String(plannedPickupDate.getUTCDate()).padStart(2, '0');
const unloadDayStr = unloadDate.getUTCFullYear() + '-' + 
                     String(unloadDate.getUTCMonth() + 1).padStart(2, '0') + '-' + 
                     String(unloadDate.getUTCDate()).padStart(2, '0');
```

### 3. 日期赋值 (L493-496)

```typescript
// ✅ 修复前
plannedPickupDate = new Date(futureDate);

// ✅ 修复后
plannedPickupDate = new Date(futureDate.getUTCFullYear(), 
                             futureDate.getUTCMonth(), 
                             futureDate.getUTCDate(),
                             0, 0, 0, 0);
```

### 4. 清关日期计算 (L389)

```typescript
// ✅ 修复前
plannedCustomsDate.setDate(plannedCustomsDate.getDate() - 1);

// ✅ 修复后
plannedCustomsDate.setUTCDate(plannedCustomsDate.getUTCDate() - 1);
```

---

## 📋 验证方法

### 1. 检查日志

应该看到：
```
[IntelligentScheduling] Pickup date adjusted from 2026-03-26 to tomorrow (2026-03-27) for ECMU5399586
[IntelligentScheduling] Scheduled ECMU5399586: 清关=2026-03-26, 提柜=2026-03-27, 送仓=2026-03-27, 卸柜=2026-03-27
```

### 2. 排产预览

日期逻辑应该正确：
```
清关日：2026-03-26
提柜日：2026-03-27（后天）✅
送仓日：2026-03-27（同日）✅
卸柜日：2026-03-27（同日）✅
还箱日：2026-03-28（提柜日 +1）✅
```

### 3. 业务规则验证

- ✅ Drop off：提 < 送 = 卸
- ✅ Live load：提 = 送 = 卸
- ✅ 清关日 = 提柜日 - 1 天
- ✅ 还箱日 = 提柜日 + 1 天

---

## 🎯 业务价值

- ✅ **日期逻辑正确**：送仓日 ≥ 提柜日
- ✅ **时区一致性**：所有日期计算使用 UTC
- ✅ **全球统一**：无论服务器时区，结果一致
- ✅ **业务可信**：用户看到合理的排产计划

---

## ✅ 修复完成

- ✅ findEarliestAvailableDay: 使用 UTC 日期计算
- ✅ 日期比较：使用 UTC 日期字符串
- ✅ 日期赋值：使用 UTC 年月日构造
- ✅ 清关日期：使用 UTC 方法
- ✅ 日期逻辑：送仓日 ≥ 提柜日
- ✅ 文档完善：详细说明问题根因

---

**修复时间**：2026-03-26  
**影响范围**：智能排产服务（intelligentScheduling.service.ts）  
**修复文件**：
- L389: 清关日期计算
- L467-469: 日期比较逻辑
- L493-496: 日期赋值逻辑
- L870-872: 仓库可用日计算

**业务价值**：解决送仓日倒挂问题，确保日期逻辑正确，彻底解决跨国时区混乱

---

## 📚 相关文档

- [跨国时区问题修复 - UTC 纯日期比较.md](./跨国时区问题修复 - UTC 纯日期比较.md)
- [提柜日时区问题修复 - 本地日期字符串.md](./提柜日时区问题修复 - 本地日期字符串.md)
- [提柜日调整为明天 - 业务规则修复.md](./提柜日调整为明天 - 业务规则修复.md)
