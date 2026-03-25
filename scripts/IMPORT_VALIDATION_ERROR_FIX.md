# 导入数据验证失败问题诊断与修复

**创建日期**: 2026-03-21  
**问题现象**: 所有数据都显示为"无效数据"

---

## 📋 问题描述

### 现象

```
数据预览（前 5 条）
有效数据：0
无效数据：5
总计：5
```

### 原因

通用导入组件会根据 `FieldMapping` 配置中的 `required: true` 字段进行验证。如果必填字段在 Excel 中不存在或为空，该行数据就会被标记为无效。

---

## 🔍 当前必填字段检查

### 货柜导入的必填字段

根据 `frontend/src/configs/importMappings/container.ts` 配置：

```typescript
// 必填字段 1
{
  excelField: '备货单号',  // ← Excel 列名
  field: 'order_number',
  required: true,         // ← 必填
}

// 必填字段 2
{
  excelField: '集装箱号',  // ← Excel 列名
  field: 'container_number',
  required: true,         // ← 必填
  aliases: ['箱号 (集装箱号)'],  // ← 支持的别名
}
```

---

## ✅ 解决方案

### 方案一：修改 Excel 文件（推荐）⭐

**操作步骤**:

1. **打开 Excel 文件**
2. **添加缺失的列**
   - 确保包含"备货单号"列
   - 确保包含"集装箱号"列（或"箱号 (集装箱号)"）

3. **填写数据**

   ```
   示例:
   ┌─────────────┬──────────────┬────────────┐
   │ 备货单号    │ 集装箱号     │ 其他字段   │
   ├─────────────┼──────────────┼────────────┤
   │ ORD001      │ TGHU1234567  │ ...        │
   │ ORD002      │ MSCU9876543  │ ...        │
   └─────────────┴──────────────┴────────────┘
   ```

4. **保存并重新上传**

**优点**:

- ✅ 符合业务规范
- ✅ 数据完整性好
- ✅ 无需修改代码

---

### 方案二：调整必填字段配置

如果某些字段在实际业务中不是必需的，可以修改配置：

#### 选项 A: 将必填改为非必填

```typescript
// frontend/src/configs/importMappings/container.ts

// 修改前
{
  excelField: '备货单号',
  field: 'order_number',
  required: true,  // ❌ 必填
}

// 修改后
{
  excelField: '备货单号',
  field: 'order_number',
  required: false, // ✅ 改为非必填
}
```

⚠️ **注意**: 这可能会导致缺少关键业务数据，请谨慎使用！

#### 选项 B: 添加更多列名变体（别名）

如果您的 Excel 使用了不同的列名：

```typescript
{
  excelField: '集装箱号',
  field: 'container_number',
  required: true,
  aliases: [
    '箱号 (集装箱号)',
    '箱号',              // ← 添加更多别名
    'Container No.',
    'Container Number',
    '柜号',
  ]
}
```

---

## 🔧 快速诊断步骤

### 步骤 1: 检查 Excel 列名

打开您的 Excel 文件，检查是否包含以下列名之一：

**备货单号的列名变体**:

- ✅ 备货单号
- ⚠️ 订单号（需要添加别名）
- ⚠️ PO 号（需要添加别名）

**集装箱号的列名变体**:

- ✅ 集装箱号
- ✅ 箱号 (集装箱号)
- ⚠️ 箱号（需要添加别名）
- ⚠️ Container No.（需要添加别名）

### 步骤 2: 检查数据是否为空

即使列名正确，如果该列的所有行都为空，也会验证失败：

```excel
❌ 错误示例:
┌─────────────┬──────────────┐
│ 备货单号    │ 集装箱号     │
├─────────────┼──────────────┤
│             │ TGHU1234567  │  ← 备货单号为空
│ ORD001      │              │  ← 集装箱号为空
│             │              │  ← 都为空
└─────────────┴──────────────┘

✅ 正确示例:
┌─────────────┬──────────────┐
│ 备货单号    │ 集装箱号     │
├─────────────┼──────────────┤
│ ORD001      │ TGHU1234567  │
│ ORD002      │ MSCU9876543  │
│ ORD003      │ CAIU4567890  │
└─────────────┴──────────────┘
```

### 步骤 3: 查看浏览器控制台

打开开发者工具（F12），查看控制台日志：

```javascript
// 应该能看到类似这样的日志
[ContainerImport] 根据客户名称自动填充国家：AOSOM US LLC -> 美国

// 如果有验证错误，会显示
// 第 X 行验证失败：缺少必填字段：备货单号
```

---

## 📊 常见错误场景

### 场景 1: 列名不匹配

**Excel 内容**:

```excel
┌─────────────┬──────────────┐
│ Order No.   │ Container    │
├─────────────┼──────────────┤
│ ORD001      │ TGHU1234567  │
└─────────────┴──────────────┘
```

**错误提示**:

- 缺少必填字段：备货单号
- 缺少必填字段：集装箱号

**解决方案**:

```typescript
// 添加别名支持
{
  excelField: '备货单号',
  aliases: ['Order No.', '订单号', 'PO 号']
}

{
  excelField: '集装箱号',
  aliases: ['Container', '箱号', 'Container No.']
}
```

---

### 场景 2: 部分行为空

**Excel 内容**:

```excel
┌─────────────┬──────────────┐
│ 备货单号    │ 集装箱号     │
├─────────────┼──────────────┤
│ ORD001      │ TGHU1234567  │ ✅ 有效
│ ORD002      │              │ ❌ 缺少集装箱号
│             │ MSCU9876543  │ ❌ 缺少备货单号
│             │              │ ❌ 都缺少
└─────────────┴──────────────┘
```

**结果**:

- 有效数据：1 条
- 无效数据：3 条

**解决方案**:

- ✅ 补全所有必填字段
- 或将 `required: false`（不推荐）

---

### 场景 3: 空格导致的验证失败

**Excel 内容**:

```excel
┌─────────────┬──────────────┐
│ 备货单号    │ 集装箱号     │
├─────────────┼──────────────┤
│ " ORD001 "  │ "TGHU1234567"│  ← 包含前后空格
└─────────────┴──────────────┘
```

**问题**:
虽然有空格，但不为空字符串，所以会通过验证。但可能导致后续处理问题。

**建议**:
在 transform 函数中添加 trim 处理：

```typescript
{
  excelField: '备货单号',
  field: 'order_number',
  required: true,
  transform: (value) => {
    if (typeof value === 'string') {
      return value.trim()  // 去除空格
    }
    return value
  }
}
```

---

## 🛠️ 实用工具：添加调试日志

在 `useExcelParser.ts` 中添加详细日志：

```typescript
// frontend/src/components/common/UniversalImport/useExcelParser.ts

function validateRow(row: Record<string, any>, fieldMappings: FieldMapping[]): string[] {
  const errors: string[] = [];

  for (const mapping of fieldMappings) {
    if (mapping.required && (row[mapping.field] === null || row[mapping.field] === undefined || row[mapping.field] === "")) {
      const errorMsg = `缺少必填字段：${mapping.excelField}`;
      console.warn("[Validation]", errorMsg, {
        fieldName: mapping.field,
        excelField: mapping.excelField,
        actualValue: row[mapping.field],
        fullRow: row,
      });
      errors.push(errorMsg);
    }
  }

  return errors;
}
```

这样可以在控制台中看到详细的验证失败原因。

---

## 📝 推荐的配置优化

### 1. 添加常用别名

```typescript
// frontend/src/configs/importMappings/container.ts

{
  excelField: '备货单号',
  field: 'order_number',
  required: true,
  aliases: [
    '主备货单号',
    '订单号',
    'PO 号',
    'Purchase Order',
    'Order No.',
    'Order Number'
  ]
}

{
  excelField: '集装箱号',
  field: 'container_number',
  required: true,
  aliases: [
    '箱号',
    '柜号',
    'Container No.',
    'Container Number',
    'Container',
    '箱号 (集装箱号)'
  ]
}
```

### 2. 添加友好的错误提示

```typescript
function validateRow(row: Record<string, any>, fieldMappings: FieldMapping[]): string[] {
  const errors: string[] = [];

  for (const mapping of fieldMappings) {
    if (mapping.required && !row[mapping.field]) {
      // 提供更友好的错误提示
      errors.push(`第 ${errors.length + 1} 项：请确保 Excel 中包含 "${mapping.excelField}" 列，且不为空`);
    }
  }

  return errors;
}
```

### 3. 添加数据预处理

```typescript
// 在转换前预处理原始数据
function preprocessRawData(jsonData: Record<string, any>[]): Record<string, any>[] {
  return jsonData.map((row) => {
    const processed: Record<string, any> = {};

    for (const [key, value] of Object.entries(row)) {
      // 去除键名的前后空格
      const trimmedKey = key.trim();

      // 去除字符串值的空格
      processed[trimmedKey] = typeof value === "string" ? value.trim() : value;
    }

    return processed;
  });
}
```

---

## ✅ 最佳实践总结

### Excel 模板设计

1. ✅ **使用标准列名**: 直接使用配置中的 `excelField` 名称
2. ✅ **避免空格**: 列名和数据都不要包含多余空格
3. ✅ **必填字段标识**: 在模板中用颜色或\*标记必填字段
4. ✅ **提供示例**: 附带示例 Excel 文件

### 代码配置

1. ✅ **合理的必填设置**: 只在业务上真正必填的字段设为 required
2. ✅ **丰富的别名**: 为常见变体添加 aliases
3. ✅ **数据清洗**: 在 transform 中处理空格、大小写等
4. ✅ **友好的提示**: 提供清晰的验证错误信息

### 用户体验

1. ✅ **实时反馈**: 解析时显示进度
2. ✅ **明确指引**: 告诉用户如何修正
3. ✅ **批量处理**: 允许部分行失败，不影响其他成功导入
4. ✅ **错误导出**: 允许用户下载错误报告

---

## 🔗 相关文档

- [UNIVERSAL_IMPORT_FILE_READER_FIX.md](./UNIVERSAL_IMPORT_FILE_READER_FIX.md) - FileReader 错误修复
- [AUTO_FILL_ENTITY_GUIDE.md](./AUTO_FILL_ENTITY_GUIDE.md) - 关联实体填充指南
- [EXCEL_COLUMN_MODIFICATION_GUIDE.md](./EXCEL_COLUMN_MODIFICATION_GUIDE.md) - Excel 列名修改指南

---

**下一步操作**:

1. ✅ 检查您的 Excel 文件是否包含必填字段
2. ✅ 确认列名是否匹配或需要添加别名
3. ✅ 补全缺失的数据
4. ✅ 重新上传测试

如需帮助，请提供：

- Excel 文件的列名截图
- 控制台中的具体错误信息
- 您期望的导入效果

---

**文档状态**: ✅ 已完成  
**适用版本**: v1.0+  
**最后更新**: 2026-03-21

**维护者**: Logix Team
