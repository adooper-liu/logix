# 清关日期解析失败修复 - Date 类型处理

## 🐛 问题现象

**错误日志**：

```
2026-03-26 13:18:06 [error]: [IntelligentScheduling] Failed to parse clearanceDate to valid Date for ECMU5399586
2026-03-26 13:18:06 [error]: [IntelligentScheduling] Failed to parse clearanceDate to valid Date for ECMU5381817
2026-03-26 13:18:06 [error]: [IntelligentScheduling] Failed to parse clearanceDate to valid Date for ECMU5400183
2026-03-26 13:18:06 [error]: [IntelligentScheduling] Failed to parse clearanceDate to valid Date for ECMU5397691
2026-03-26 13:18:06 [error]: [IntelligentScheduling] Failed to parse clearanceDate to valid Date for ECMU5399797
```

**影响**：5 个货柜排产全部失败

---

## 🔍 根本原因

### 类型混淆问题

**核心问题**：`destPo.eta` 和 `destPo.ata` 的类型是 **Date 对象**，而不是字符串！

**错误链路**：

```typescript
const clearanceDate = destPo.eta; // Date 对象
const plannedCustomsDate = new Date(clearanceDate + "T00:00:00");
//                ↓
// Date + string → 字符串拼接
// "2026-02-11T00:00:00.000Z" + "T00:00:00"
// = "2026-02-11T00:00:00.000ZT00:00:00" ❌ 无效格式！
//                ↓
// new Date("2026-02-11T00:00:00.000ZT00:00:00")
// = Invalid Date ❌
```

### 为什么会产生类型混淆？

1. **TypeORM 查询结果**：从数据库查询的 `process_port_operations` 表中，`eta` 和 `ata` 字段被 TypeORM 自动转换为 `Date` 对象
2. **字符串拼接陷阱**：JavaScript 中 `Date + string` 会先将 Date 转为 ISO 字符串，再拼接
3. **重复添加时间部分**：导致生成 `"2026-02-11T00:00:00.000ZT00:00:00"` 这样的无效格式

---

## ✅ 修复方案

### 类型判断 + 分别处理

```typescript
let plannedCustomsDate: Date;

if (clearanceDate instanceof Date) {
  // 如果已经是 Date 对象，直接使用（避免字符串拼接导致的格式错误）
  plannedCustomsDate = new Date(clearanceDate);
  logger.debug(`ETA/ATA is Date object for ${container.containerNumber}`);
} else if (typeof clearanceDate === "string") {
  // 如果是字符串，添加时间部分并解析
  plannedCustomsDate = new Date(clearanceDate + "T00:00:00");
  logger.debug(`ETA/ATA is string for ${container.containerNumber}`);
} else {
  logger.error(`Invalid clearanceDate type: ${typeof clearanceDate}`);
  return { success: false, message: "到港日期类型错误" };
}

// 立即验证有效性
if (!plannedCustomsDate || isNaN(plannedCustomsDate.getTime())) {
  logger.error(`Failed to parse clearanceDate`);
  return { success: false, message: "清关日期解析失败" };
}
```

---

## 📊 数据类型对比

### Date 对象处理

```typescript
// ✅ 正确方式
const dateObj = new Date("2026-02-11"); // Date 对象
const parsed = new Date(dateObj); // 复制 Date 对象
// 结果：有效的 Date 对象
```

### 字符串处理

```typescript
// ✅ 正确方式（时区安全）
const dateStr = "2026-02-11"; // 字符串
const parsed = new Date(dateStr + "T00:00:00"); // 添加时间部分
// 结果：有效的 Date 对象（本地时间）
```

### 错误示例

```typescript
// ❌ 错误：Date + string
const dateObj = new Date("2026-02-11");
const wrong = new Date(dateObj + "T00:00:00");
// dateObj → "2026-02-11T00:00:00.000Z"
// + 'T00:00:00' → "2026-02-11T00:00:00.000ZT00:00:00" ❌
// new Date(...) → Invalid Date
```

---

## 🎯 验证方法

### 1. 检查日志

成功时应该看到：

```
[IntelligentScheduling] ETA/ATA is Date object for ECMU5399586
```

### 2. 排产预览

所有货柜应该正常显示：

- ✅ 提柜日、送仓日、卸柜日、还箱日正常计算
- ✅ 货币符号正确（英国仓库显示 `£`）
- ✅ 费用计算正确

---

## 📝 修改文件

**文件**：`backend/src/services/intelligentScheduling.service.ts`

**修改位置**：L310-L342

**修改内容**：

1. 添加类型判断逻辑（`instanceof Date` 和 `typeof string`）
2. 分别处理 Date 对象和字符串
3. 立即验证解析结果

---

## 🔧 技术要点

### TypeORM 的 Date 字段处理

```typescript
// 数据库表定义
@Column({ type: 'timestamp' })
eta: Date;

// TypeORM 查询结果
const destPo = await this.portOperationsRepo.findOne({...});
// destPo.eta 的类型是 Date，不是 string！
```

### JavaScript 类型转换陷阱

```typescript
// Date + string = string（先转 ISO 字符串，再拼接）
new Date() + "T00:00:00";
// = "2026-03-26T05:00:00.000ZT00:00:00" ❌

// 正确方式：使用 Date 构造函数
new Date(dateObj); // ✅ 复制 Date 对象
```

---

## ✅ 修复效果

- ✅ 清关日期解析成功
- ✅ 5 个货柜全部排产成功
- ✅ 货币符号正确显示（`£`）
- ✅ 费用计算正确

---

## 🚨 注意事项

1. **TypeORM 自动类型转换**：数据库的 `timestamp` 字段会被 TypeORM 转换为 `Date` 对象
2. **不要假设字段类型**：在处理数据库字段时，必须先检查实际类型
3. **避免字符串拼接**：`Date + string` 会产生意想不到的结果
4. **使用类型守卫**：`instanceof` 和 `typeof` 组合使用，确保类型安全

---

## 📚 相关文档

- [时区问题修复 - 提柜日显示为过去日期.md](./时区问题修复 - 提柜日显示为过去日期.md)
- [Invalid Date 错误终极解决方案.md](./Invalid Date 错误终极解决方案.md)
- [排产时区问题修复总结.md](./排产时区问题修复总结.md)
