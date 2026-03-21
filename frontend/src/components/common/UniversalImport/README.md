# 通用 Excel 导入组件

## 📋 概述

通用 Excel 导入组件提供了一套可复用的导入解决方案，避免为每个导入场景重复编写界面代码。只需配置字段映射即可快速创建新的导入功能。

## 🎯 特性

- ✅ **高度可配置**: 通过字段映射配置驱动，无需修改组件代码
- ✅ **支持别名**: 同一字段支持多个 Excel 列名变体
- ✅ **数据验证**: 自动验证必填字段，标记无效数据
- ✅ **数据预览**: 上传前预览数据，显示有效/无效统计
- ✅ **批量导入**: 支持分批上传大量数据
- ✅ **错误处理**: 详细的错误报告和日志
- ✅ **类型安全**: 完整的 TypeScript 类型定义

## 📁 目录结构

```
frontend/src/components/common/UniversalImport/
├── types.ts                      # 类型定义
├── useExcelParser.ts             # Excel 解析 Composable
├── useFileUpload.ts              # 文件上传 Composable
├── utils.ts                      # 工具函数
├── UniversalImport.vue           # 主组件
└── index.ts                      # 统一导出

frontend/src/configs/importMappings/
├── container.ts                  # 货柜导入配置
├── demurrage.ts                  # 滞港费导入配置
└── feituo.ts                     # 飞驼导入配置
```

## 🚀 快速开始

### 1. 基础用法

```vue
<template>
  <UniversalImport 
    title="货柜数据导入"
    :field-mappings="CONTAINER_FIELD_MAPPINGS"
    api-endpoint="/api/import/container"
    @success="handleSuccess"
    @error="handleError"
  />
</template>

<script setup lang="ts">
import { UniversalImport } from '@/components/common/UniversalImport'
import { CONTAINER_FIELD_MAPPINGS } from '@/configs/importMappings/container'

function handleSuccess(result) {
  console.log('导入成功:', result)
}

function handleError(error) {
  console.error('导入失败:', error)
}
</script>
```

### 2. 配置字段映射

```typescript
import type { FieldMapping } from '@/components/common/UniversalImport'
import { parseDate, parseDecimal, parseBoolean } from '@/components/common/UniversalImport'

export const MY_CUSTOM_MAPPINGS: FieldMapping[] = [
  {
    excelField: '订单号',           // Excel 列名
    table: 'biz_orders',          // 数据库表
    field: 'order_number',        // 数据库字段
    required: true,               // 是否必填
    aliases: ['订单编号', '单号'],   // 列名别名
    transform: (val) => val.trim() // 值转换函数
  },
  {
    excelField: '下单日期',
    table: 'biz_orders',
    field: 'order_date',
    required: false,
    transform: parseDate
  },
  {
    excelField: '金额',
    table: 'biz_orders',
    field: 'amount',
    required: false,
    transform: parseDecimal
  }
]
```

## 📖 Props 配置

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| title | string | - | 组件标题 |
| fieldMappings | FieldMapping[] | - | 字段映射配置数组 |
| apiEndpoint | string | - | 后端 API 端点 |
| showPreview | boolean | true | 是否显示数据预览 |
| enableBatchImport | boolean | false | 是否启用批量导入 |
| batchSize | number | 100 | 每批导入数量 |
| acceptedFileTypes | string | '.xlsx,.xls' | 支持的文件格式 |
| maxFileSize | number | 10 | 最大文件大小 (MB) |

## 🎲 Events

| 事件名 | 参数 | 说明 |
|--------|------|------|
| success | result: ImportResult | 导入成功时触发 |
| error | error: string | 导入失败时触发 |

## 🔧 内置工具函数

### 数据类型转换

```typescript
import { 
  parseDate,       // 解析日期
  parseDecimal,    // 解析小数
  parseInteger,    // 解析整数
  parseBoolean     // 解析布尔值
} from '@/components/common/UniversalImport'
```

### 自定义转换函数

```typescript
function transformStatus(value: unknown): string | null {
  if (!value) return null
  
  const statusMap: Record<string, string> = {
    '待审核': 'PENDING',
    '已审核': 'APPROVED',
    '已完成': 'COMPLETED'
  }
  
  return statusMap[String(value).trim()] || String(value)
}

// 在配置中使用
{
  excelField: '订单状态',
  table: 'biz_orders',
  field: 'status',
  transform: transformStatus
}
```

## 📊 完整示例

### 示例 1: 简单导入

```vue
<template>
  <UniversalImport 
    title="客户信息导入"
    :field-mappings="CUSTOMER_MAPPINGS"
    api-endpoint="/api/import/customers"
  />
</template>

<script setup lang="ts">
import { UniversalImport } from '@/components/common/UniversalImport'

const CUSTOMER_MAPPINGS = [
  { 
    excelField: '客户名称', 
    table: 'dict_customers', 
    field: 'customer_name', 
    required: true 
  },
  { 
    excelField: '客户编码', 
    table: 'dict_customers', 
    field: 'customer_code', 
    required: true 
  },
  { 
    excelField: '联系人', 
    table: 'dict_customers', 
    field: 'contact_person', 
    required: false 
  }
]
</script>
```

### 示例 2: 带批量导入

```vue
<template>
  <UniversalImport 
    title="大批量数据导入"
    :field-mappings="BULK_MAPPINGS"
    api-endpoint="/api/import/bulk"
    :enable-batch-import="true"
    :batch-size="200"
    @success="handleSuccess"
  />
</template>
```

### 示例 3: 自定义验证

```vue
<template>
  <UniversalImport 
    title="产品导入"
    :field-mappings="PRODUCT_MAPPINGS"
    api-endpoint="/api/import/products"
    :show-preview="true"
    @success="handleSuccess"
  />
</template>

<script setup lang="ts">
import { parseDecimal } from '@/components/common/UniversalImport'

const PRODUCT_MAPPINGS = [
  {
    excelField: '产品编码',
    table: 'dict_products',
    field: 'product_code',
    required: true
  },
  {
    excelField: '产品名称',
    table: 'dict_products',
    field: 'product_name',
    required: true
  },
  {
    excelField: '单价',
    table: 'dict_products',
    field: 'unit_price',
    required: false,
    transform: parseDecimal
  },
  {
    excelField: '库存数量',
    table: 'dict_products',
    field: 'stock_quantity',
    required: false,
    transform: (val) => {
      const num = parseInt(String(val))
      return isNaN(num) ? null : num
    }
  }
]
</script>
```

## 🎨 样式定制

组件使用 Element Plus 组件库，可通过覆盖 CSS 变量进行定制：

```scss
// 覆盖主题色
:deep(.universal-import-container) {
  --el-color-primary: #your-color;
}
```

## 🐛 错误处理

组件会自动处理以下错误：

1. **文件格式错误**: 非 Excel 文件
2. **文件过大**: 超过 maxSize 限制
3. **解析失败**: Excel 格式损坏
4. **验证失败**: 缺少必填字段
5. **上传失败**: 网络错误或服务器异常

错误信息会通过 `ElMessage` 和 `error` 事件通知用户。

## 📝 最佳实践

### 1. 字段映射配置

✅ **推荐**: 使用常量导出配置
```typescript
// configs/importMappings/my-config.ts
export const MY_MAPPINGS: FieldMapping[] = [...]
```

❌ **不推荐**: 在组件内直接定义
```typescript
// 难以复用和维护
const mappings = [...]
```

### 2. 别名使用

✅ **推荐**: 为易变字段提供别名
```typescript
{
  excelField: '销往国家',
  aliases: ['进口国', '目的国']
}
```

### 3. 值转换

✅ **推荐**: 使用内置工具函数
```typescript
import { parseDate, parseDecimal } from '@/components/common/UniversalImport'

{
  excelField: '日期',
  transform: parseDate
}
```

### 4. 错误提示

✅ **推荐**: 提供友好的错误信息
```typescript
transform: (val) => {
  if (!isValid(val)) {
    throw new Error('日期格式不正确')
  }
  return parseDate(val)
}
```

## 🔍 调试技巧

1. **查看解析数据**: 在预览中检查数据是否正确解析
2. **检查验证**: 查看无效数据的错误提示
3. **监控进度**: 观察上传进度条
4. **查看日志**: 浏览器控制台会输出详细日志

## 📈 性能优化

- **大数据集**: 启用 `enableBatchImport` 分批上传
- **减少预览**: 设置 `showPreview=false` 跳过预览（不推荐）
- **合理配置**: 只配置必要的字段映射

## 🆚 对比传统方式

| 特性 | 传统方式 | 通用组件 |
|------|---------|---------|
| 开发时间 | 4-8 小时 | 0.5-2 小时 |
| 代码重复 | 高 | 无 |
| 维护成本 | 高 | 低 |
| 一致性 | 低 | 高 |
| 可扩展性 | 低 | 高 |

## 📚 相关资源

- [Element Plus Upload](https://element-plus.org/zh-CN/component/upload.html)
- [SheetJS/xlsx](https://github.com/SheetJS/sheetjs)
- [Vue 3 Composition API](https://vuejs.org/guide/reusability/composables.html)

## 👥 贡献指南

欢迎提交 Issue 和 Pull Request 来改进这个组件！

---

**最后更新**: 2026-03-21  
**维护者**: Logix Team
