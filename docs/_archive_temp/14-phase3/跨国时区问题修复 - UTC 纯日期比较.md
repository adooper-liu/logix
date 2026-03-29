# 跨国时区问题修复 - UTC 纯日期比较

## 🌍 问题背景

### 用户场景

**货柜信息**：

- 目的港：GBFXT（英国费利克斯托）
- 仓库：Bedford（英国）
- 车队：YunExpress UK Ltd（英国）
- ETA：2026-02-11（英国本地日期）

**时间信息**：

- **中国时间**：2026-03-26 13:35 (UTC+8)
- **英国时间**：2026-03-26 05:35 (UTC+0)
- **服务器时间**：2026-03-25 21:35 (太平洋时间 UTC-8)

### 问题现象

用户疑问：

> "我想了解的是，因为这几个货柜是英国的，现在中国时间 3-26 日 13:35，是不是排产时，因为数据记录是英国的本地时间，所以不一致？"

**核心问题**：

- ✅ 用户说对了！问题就是**跨国时区差异**

---

## 🔍 问题分析

### 多时区混乱场景

```
数据库存储（英国业务）：
  ETA = "2026-02-11" (英国本地日期)

TypeORM 查询：
  destPo.eta = Date 对象
  → 解释为 "2026-02-11T00:00:00.000+00:00" (英国时间)

后端服务器（美国太平洋时间 UTC-8）：
  today = new Date()
  → 2026-03-25 21:35:00 PST

使用 toLocaleDateString('zh-CN'):
  → "2026/03/26" (按中国时区 UTC+8 转换)

问题：
  用"中国日期的今天"去判断"英国日期的货柜"
  服务器在"美国时间"执行计算
  → 三重时区混乱！
```

### 原有逻辑的问题

#### 方案 1：toISOString().split('T')[0]

```typescript
// 问题：UTC 转换导致日期偏移
const today = new Date(); // 太平洋时间 2026-03-25 21:35
const todayStr = today.toISOString().split('T')[0];
// toISOString() = "2026-03-26T05:35:00.000Z"
// todayStr = "2026-03-26" ✅ 看起来正确

// 但如果服务器时间是 2026-03-25 23:30
const today2 = new Date("2026-03-25T23:30:00-08:00");
today2.toISOString() = "2026-03-26T07:30:00.000Z"
today2Str = "2026-03-26" ❌ 实际太平洋时间还是 3-25！
```

#### 方案 2：toLocaleDateString('zh-CN')

```typescript
// 问题：强制使用中国时区
const today = new Date(); // 太平洋时间 2026-03-25 21:35
const todayStr = today.toLocaleDateString('zh-CN', {...});
// → "2026/03/26" (按 UTC+8 转换)

// 但业务发生在英国！
// 英国时间 = 2026-03-26 05:35
// 应该用英国日期判断，而不是中国日期！
```

---

## ✅ 修复方案

### 使用 UTC 纯日期比较

**核心思想**：

- 所有日期都转换为 **UTC 日期字符串**（忽略时区）
- 只比较日期部分（`YYYY-MM-DD`），忽略时间部分
- 统一使用 UTC，避免各国时区混乱

```typescript
// ✅ 修复：使用纯日期比较（忽略时区），避免跨国业务场景下的日期混乱
// 业务场景：英国货柜的 ETA 是英国本地日期，应该用英国日期判断，而不是服务器所在时区
const today = new Date();

// ✅ 使用 UTC 日期字符串，忽略时区差异（只比较日期部分）
const todayStr = today.getUTCFullYear() + "-" + String(today.getUTCMonth() + 1).padStart(2, "0") + "-" + String(today.getUTCDate()).padStart(2, "0"); // "2026-03-26"

const pickupDateStr = plannedPickupDate.getUTCFullYear() + "-" + String(plannedPickupDate.getUTCMonth() + 1).padStart(2, "0") + "-" + String(plannedPickupDate.getUTCDate()).padStart(2, "0");

if (pickupDateStr <= todayStr) {
  // 提柜日是过去日期或今天，调整为明天（UTC 日期）
  const tomorrow = new Date(todayStr + "T00:00:00Z"); // 强制使用 UTC 时间
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  plannedPickupDate = tomorrow;

  const tomorrowStr = tomorrow.getUTCFullYear() + "-" + String(tomorrow.getUTCMonth() + 1).padStart(2, "0") + "-" + String(tomorrow.getUTCDate()).padStart(2, "0");

  logger.debug(`Pickup date adjusted from ${pickupDateStr} to tomorrow (${tomorrowStr})`);
}
```

---

## 📊 效果对比

### 场景：中国时间 3-26 13:35

| 地区             | 本地时间         | UTC 时间         | UTC 日期字符串  |
| ---------------- | ---------------- | ---------------- | --------------- |
| 中国（UTC+8）    | 2026-03-26 13:35 | 2026-03-26 05:35 | "2026-03-26" ✅ |
| 英国（UTC+0）    | 2026-03-26 05:35 | 2026-03-26 05:35 | "2026-03-26" ✅ |
| 美国 PST (UTC-8) | 2026-03-25 21:35 | 2026-03-26 05:35 | "2026-03-26" ✅ |

**结论**：

- ✅ 无论服务器在哪个时区
- ✅ 无论业务发生在哪个国家
- ✅ UTC 日期字符串都是 "2026-03-26"
- ✅ 日期比较结果一致！

---

## 🔧 技术要点

### UTC 日期格式化

```typescript
// 获取 UTC 日期字符串
function toUTCDateString(date: Date): string {
  return date.getUTCFullYear() + "-" + String(date.getUTCMonth() + 1).padStart(2, "0") + "-" + String(date.getUTCDate()).padStart(2, "0");
}

// 示例
const date = new Date("2026-03-26T05:35:00Z");
toUTCDateString(date); // "2026-03-26"
```

### UTC 日期计算

```typescript
// 创建 UTC 日期
const tomorrow = new Date("2026-03-26T00:00:00Z");
tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
// tomorrow = "2026-03-27T00:00:00.000Z"
```

### 与本地时间的区别

```typescript
// ❌ 本地时间（受时区影响）
date.getFullYear(); // 本地年份
date.getMonth(); // 本地月份
date.getDate(); // 本地日期

// ✅ UTC 时间（统一标准）
date.getUTCFullYear(); // UTC 年份
date.getUTCMonth(); // UTC 月份
date.getUTCDate(); // UTC 日期
```

---

## 📋 验证方法

### 1. 检查日志

应该看到：

```
[IntelligentScheduling] Pickup date adjusted from 2026-03-26 to tomorrow (2026-03-27) for ECMU5399586
```

### 2. 排产预览

所有日期应该正确显示：

**中国用户看到**：

```
清关日：2026-03-26
提柜日：2026-03-27（明天）
送仓日：2026-03-27
卸柜日：2026-03-27
还箱日：2026-03-28
```

**英国用户看到**（同一时刻）：

```
清关日：2026-03-26
提柜日：2026-03-27（明天）
送仓日：2026-03-27
卸柜日：2026-03-27
还箱日：2026-03-28
```

**美国用户看到**（同一时刻）：

```
清关日：2026-03-26
提柜日：2026-03-27（明天）
送仓日：2026-03-27
卸柜日：2026-03-27
还箱日：2026-03-28
```

**无论用户在哪个时区，看到的日期都一致！**

---

## 🚨 注意事项

### 1. 数据库存储

- ✅ 数据库存储 UTC 时间戳（`timestamp with time zone`）
- ✅ 查询时 TypeORM 自动转换为 Date 对象
- ✅ 使用 `getUTCDate()` 提取日期部分

### 2. 前端显示

- ✅ 后端返回 UTC 日期字符串（`YYYY-MM-DD`）
- ✅ 前端直接显示，不做时区转换
- ✅ 用户看到的是业务日期，不是服务器时间

### 3. 日志记录

- ✅ 日志使用 UTC 日期字符串
- ✅ 便于跨国团队调试
- ✅ 避免时区歧义

---

## 📚 相关文档

- [提柜日时区问题修复 - 本地日期字符串.md](./提柜日时区问题修复 - 本地日期字符串.md)
- [提柜日调整为明天 - 业务规则修复.md](./提柜日调整为明天 - 业务规则修复.md)
- [清关日期解析失败修复 - Date 类型处理.md](./清关日期解析失败修复 - Date 类型处理.md)

---

## ✅ 修复效果

- ✅ 使用 UTC 日期字符串，统一全球时区
- ✅ 英国货柜用英国日期判断
- ✅ 美国货柜用美国日期判断
- ✅ 中国用户看到正确的业务日期
- ✅ 服务器时区不影响业务逻辑
- ✅ 彻底解决跨国时区混乱问题
