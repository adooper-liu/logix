# 通用导入组件 - 快速参考卡片

## 🚀 一分钟上手

### 基础用法

```vue
<template>
  <UniversalImport title="我的导入" :field-mappings="MY_MAPPINGS" api-endpoint="/api/import/my-endpoint" />
</template>

<script setup lang="ts">
import { UniversalImport } from "@/components/common/UniversalImport";

const MY_MAPPINGS = [
  {
    excelField: "名称",
    table: "my_table",
    field: "name",
    required: true,
  },
];
</script>
```

## 📦 核心 API

### Props

| 参数              | 类型           | 默认值 | 必填 |
| ----------------- | -------------- | ------ | ---- |
| title             | string         | -      | ✅   |
| fieldMappings     | FieldMapping[] | -      | ✅   |
| apiEndpoint       | string         | -      | ✅   |
| showPreview       | boolean        | true   | ❌   |
| enableBatchImport | boolean        | false  | ❌   |
| batchSize         | number         | 100    | ❌   |

### Events

| 事件    | 参数         | 触发时机 |
| ------- | ------------ | -------- |
| success | ImportResult | 导入成功 |
| error   | string       | 导入失败 |

## 🔧 工具函数

```typescript
import {
  parseDate, // 解析日期
  parseDecimal, // 解析小数
  parseInteger, // 解析整数
  parseBoolean, // 解析布尔值
} from "@/components/common/UniversalImport";
```

## 📝 配置模板

### 简单字段

```typescript
{
  excelField: '列名',
  table: 'table_name',
  field: 'field_name',
  required: true
}
```

### 带别名

```typescript
{
  excelField: '主要列名',
  table: 'table_name',
  field: 'field_name',
  required: false,
  aliases: ['别名 1', '别名 2']
}
```

### 带转换

```typescript
{
  excelField: '日期列',
  table: 'table_name',
  field: 'date_field',
  required: true,
  transform: parseDate
}
```

## 🎯 完整示例

```typescript
// configs/importMappings/example.ts
import type { FieldMapping } from "@/components/common/UniversalImport";
import { parseDate, parseDecimal } from "@/components/common/UniversalImport";

export const EXAMPLE_MAPPINGS: FieldMapping[] = [
  {
    excelField: "订单号",
    table: "biz_orders",
    field: "order_number",
    required: true,
    aliases: ["订单编号", "单号"],
  },
  {
    excelField: "下单日期",
    table: "biz_orders",
    field: "order_date",
    required: false,
    transform: parseDate,
  },
  {
    excelField: "金额",
    table: "biz_orders",
    field: "amount",
    required: false,
    transform: parseDecimal,
  },
];
```

## 🐛 调试技巧

### 1. 检查配置

```typescript
console.log("字段映射:", FIELD_MAPPINGS);
console.log("预览数据:", previewData.value);
```

### 2. 验证错误

```typescript
// 查看无效行的错误信息
previewData.value.forEach((row) => {
  if (row.errors) {
    console.log("行错误:", row.errors);
  }
});
```

### 3. 网络请求

```typescript
// 在浏览器 DevTools Network 标签查看
// POST /api/import/xxx
```

## ⚡ 快捷键

- `F12` - 打开开发者工具
- `Ctrl+Shift+I` - 查看元素
- `Ctrl+Shift+J` - 查看控制台

## 📖 更多文档

- [完整文档](../components/common/UniversalImport/README.md)
- [迁移指南](./MIGRATION_GUIDE.md)
- [实施总结](./UNIVERSAL_IMPORT_SUMMARY.md)

---

**快速参考版本**: v1.0  
**最后更新**: 2026-03-21
