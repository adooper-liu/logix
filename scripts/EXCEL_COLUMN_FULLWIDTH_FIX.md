# Excel 列名全角/半角字符匹配问题修复

**创建日期**: 2026-03-21  
**问题类型**: 列名不匹配 - 全角/半角括号混用

---

## 📋 问题描述

### 现象

Excel 文件中包含列名：`箱号 (集装箱号)`  
配置中别名：`箱号 (集装箱号)`

**结果**：❌ 验证失败，提示"缺少必填字段：集装箱号"

### 根本原因

**字符不匹配**：

- Excel 列名可能使用：**全角括号** `（）` 或 **半角括号** `()`
- 配置别名只包含一种形式
- 字符串比较时：`"箱号 (集装箱号)" !== "箱号（集装箱号）"`

---

## 🔍 技术分析

### 字符编码对比

| 字符   | 半角 | 全角 | Unicode          |
| ------ | ---- | ---- | ---------------- |
| 左括号 | `(`  | `（` | U+0028 vs U+FF08 |
| 右括号 | `)`  | `）` | U+0029 vs U+FF09 |
| 空格   | ` `  | ` `  | U+0020 vs U+3000 |

### JavaScript 字符串比较

```javascript
// ❌ 不相等
"箱号 (集装箱号)" === "箱号（集装箱号）"; // false

// ❌ 不相等（包含空格）
"体积合计 (m3)" === "体积合计（m3）"; // false
```

---

## ✅ 解决方案

### 方案一：添加所有变体（推荐）⭐

为每个包含括号的列名添加全角和半角两种版本：

```typescript
// frontend/src/configs/importMappings/container.ts

{
  excelField: '集装箱号',
  field: 'container_number',
  required: true,
  aliases: [
    '箱号 (集装箱号)',  // 半角括号
    '箱号（集装箱号）',  // 全角括号
    '箱号',             // 简化版本
  ],
}

{
  excelField: '体积合计 (m3)',
  field: 'total_cbm',
  aliases: ['体积合计（m3）', '体积合计'],
}

{
  excelField: '毛重合计 (KG)',
  field: 'total_gross_weight',
  aliases: ['毛重合计（KG）', '毛重合计'],
}
```

### 方案二：模糊匹配（高级）

使用正则表达式或归一化处理：

```typescript
function normalizeColumnName(name: string): string {
  // 全角转半角
  return name.replace(/（/g, "(").replace(/）/g, ")").replace(/：/g, ":").replace(/；/g, ";").replace(/，/g, ",").replace(/。/g, ".").replace(/？/g, "?").replace(/！/g, "!").replace(/　/g, " "); // 全角空格转半角
}

function matchColumnName(row: Record<string, any>, targetName: string): any {
  // 精确匹配
  if (row[targetName]) return row[targetName];

  // 归一化后匹配
  const normalizedTarget = normalizeColumnName(targetName);
  for (const [key, value] of Object.entries(row)) {
    if (normalizeColumnName(key) === normalizedTarget) {
      return value;
    }
  }

  return null;
}
```

---

## 📊 修复前后对比

### 修复前 ❌

```typescript
aliases: ['箱号 (集装箱号)']

// Excel 列名
"箱号（集装箱号）"  // 全角括号

// 匹配结果
❌ false - 不匹配
```

### 修复后 ✅

```typescript
aliases: [
  '箱号 (集装箱号)',  // 半角
  '箱号（集装箱号）',  // 全角
  '箱号',
]

// Excel 列名
"箱号（集装箱号）"  // 全角括号

// 匹配结果
✅ true - 匹配成功（第二个别名）
```

---

## 🛠️ 完整修复列表

### 1. 货柜表字段

```typescript
// 修复前
aliases: ["箱号 (集装箱号)"];

// 修复后
aliases: ["箱号 (集装箱号)", "箱号（集装箱号）", "箱号"];
```

### 2. 备货单表字段

```typescript
// 体积合计
aliases: ["体积合计（m3）", "体积合计"];

// 毛重合计
aliases: ["毛重合计（KG）", "毛重合计"];
```

### 3. 港口操作表字段

```typescript
// 预计到港日期
aliases: ["预计到港日期 (ETA)", "预计到港日期（ETA）", "预计到港日期（目的港）"];

// 免堆期
aliases: ["免堆期（天）", "免堆期"];

// 场内免箱期
aliases: ["场内免箱期（天）", "场内免箱期"];
```

---

## 🧪 测试验证

### 测试用例

#### 用例 1: 半角括号

```excel
列名：箱号 (集装箱号)
值：ECMU5397691
```

**预期**：✅ 匹配成功

---

#### 用例 2: 全角括号

```excel
列名：箱号（集装箱号）
值：ECMU5397691
```

**预期**：✅ 匹配成功

---

#### 用例 3: 混合括号

```excel
列名：体积合计 (m3)
值：66.59
```

**预期**：✅ 匹配成功

---

#### 用例 4: 简化列名

```excel
列名：箱号
值：ECMU5397691
```

**预期**：✅ 匹配成功

---

## 💡 最佳实践建议

### 1. 配置规范

**为所有包含括号的列名添加变体**：

```typescript
{
  excelField: '标准列名 (半角)',
  aliases: [
    '标准列名 (半角)',      // 半角版本
    '标准列名（全角）',      // 全角版本
    '简化列名',            // 简化版本
  ]
}
```

### 2. Excel 模板设计

**在模板中使用标准列名**：

```excel
✅ 推荐：使用半角括号
箱号 (集装箱号)、体积合计 (m3)、毛重合计 (KG)

❌ 不推荐：混用全角/半角
箱号（集装箱号）、体积合计 (m3)
```

### 3. 用户指引

**在导入说明中明确列名规范**：

```markdown
## Excel 列名规范

1. 括号字符：建议使用半角括号 `()`
2. 支持变体：系统自动识别全角/半角括号
3. 简化列名：支持使用简化列名（如"箱号"）
```

---

## 🔗 相关知识点

### 全角/半角字符对照表

| 类型   | 半角 | 全角   | 说明       |
| ------ | ---- | ------ | ---------- |
| 括号   | `()` | `（）` | 最常用     |
| 冒号   | `:`  | `：`   | 时间、说明 |
| 逗号   | `,`  | `，`   | 分隔符     |
| 句号   | `.`  | `。`   | 结束符     |
| 问号   | `?`  | `？`   | 疑问符     |
| 感叹号 | `!`  | `！`   | 强调符     |
| 分号   | `;`  | `；`   | 分句符     |
| 空格   | ` `  | ` `    | 全角空格   |

### Unicode 转换

```javascript
// 全角转半角
function toHalfWidth(str: string): string {
  return str.replace(/[\uFF01-\uFF5E]/g, (ch) => {
    return String.fromCharCode(ch.charCodeAt(0) - 0xFEE0)
  })
}

// 半角转全角
function toFullWidth(str: string): string {
  return str.replace(/[\u0021-\u007E]/g, (ch) => {
    return String.fromCharCode(ch.charCodeAt(0) + 0xFEE0)
  })
}
```

---

## 📝 经验总结

### 教训

1. ❌ **不要假设**用户 Excel 使用哪种括号
2. ❌ **不要只配置**一种形式
3. ✅ **优先适配**中文用户的习惯（全角括号）
4. ✅ **提供多个**别名变体

### 原则

1. **兼容性优先**：宁可多配，不可少配
2. **用户友好**：支持常见变体
3. **明确文档**：告知用户推荐格式

---

## 🎯 总结

### 问题根源

中文 Excel 中经常混用全角和半角括号，导致字符串匹配失败。

### 解决方法

为每个包含括号的列名配置全角和半角两种版本的别名。

### 经验教训

在国际化系统中，必须考虑字符编码和全角/半角的问题。

---

**修复状态**: ✅ 已完成  
**测试状态**: 待验证  
**影响范围**: 所有包含括号的列名匹配

---

**报告生成时间**: 2026-03-21  
**修复人**: AI Assistant  
**审核状态**: 待测试验证
