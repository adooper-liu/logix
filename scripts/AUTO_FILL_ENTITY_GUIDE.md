# 关联实体自动填充功能

**创建日期**: 2026-03-21  

---

## 📋 功能概述

在 Excel 导入场景中，某些字段需要根据其他字段自动填充。典型场景：

- **客户名称 → 销往国家**: 根据客户名称自动推断对应的国家
- **港口名称 → 港口代码**: 根据名称查询标准代码
- **供应商名称 → 供应商代码**: 字典项自动映射

---

## 🎯 实现方案

### 方案一：Transform 函数（推荐）✅

在字段映射配置中使用 `transform` 函数，支持接收完整的行数据作为第二个参数：

```typescript
{
  excelField: '销往国家',
  table: 'biz_replenishment_orders',
  field: 'sell_to_country',
  required: false,
  aliases: ['进口国'],
  transform: (value: any, row?: Record<string, any>) => {
    // 如果 Excel 中有值，直接使用
    if (value) return value
    
    // 如果 Excel 中无值，尝试从客户名称自动填充
    if (row?.customer_name) {
      const customerName = String(row.customer_name)
      // 根据关键词匹配国家
      const countryKeywords: Record<string, string> = {
        '美国': '美国', 'US': '美国', 'USA': '美国',
        '英国': '英国', 'UK': '英国',
        // ... 更多关键词
      }
      for (const [keyword, country] of Object.entries(countryKeywords)) {
        if (customerName.includes(keyword)) {
          console.log(`[ContainerImport] 根据客户名称自动填充国家：${customerName} -> ${country}`)
          return country
        }
      }
    }
    
    return null
  }
}
```

**优点**:
- ✅ 配置简单，无需修改通用组件
- ✅ 支持复杂的业务逻辑
- ✅ 可以访问整行数据进行判断
- ✅ 易于调试和测试

**缺点**:
- ⚠️ 需要为每个场景单独编写逻辑
- ⚠️ 无法复用 API 查询结果

---

### 方案二：专用 Composable（高级）

创建 `useEntityFiller` Composable，提供统一的自动填充能力：

```typescript
// frontend/src/components/common/UniversalImport/useEntityFiller.ts
import { ref } from 'vue'
import axios from 'axios'

export function useEntityFiller() {
  /**
   * 根据客户名称自动填充国家
   */
  async function autoFillCountryFromCustomer(customerName: string): Promise<string | null> {
    if (!customerName) return null

    try {
      // TODO: 调用后端 API 根据客户名称查询国家
      // const response = await axios.get(`/api/customers/lookup?name=${encodeURIComponent(customerName)}`)
      // return response.data.country
      
      // 临时方案：从客户名称中提取国家关键词
      const countryKeywords: Record<string, string> = {
        '美国': '美国', 'US': '美国', 'USA': '美国',
        '英国': '英国', 'UK': '英国',
        // ... 
      }

      for (const [keyword, country] of Object.entries(countryKeywords)) {
        if (customerName.includes(keyword)) {
          return country
        }
      }

      return null
    } catch (error) {
      console.error('[EntityFiller] 自动填充国家失败:', error)
      return null
    }
  }

  /**
   * 批量自动填充关联字段
   */
  async function batchAutoFill(
    rows: Record<string, any>[],
    mappings: EntityMapping[]
  ): Promise<void> {
    // 批量填充逻辑
    for (const mapping of mappings) {
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]
        
        if (row[mapping.targetField]) continue // 已有值，跳过
        
        const sourceValue = row[mapping.sourceField]
        if (!sourceValue) continue
        
        if (mapping.sourceField === 'customer_name' && mapping.targetField === 'sell_to_country') {
          const filledValue = await autoFillCountryFromCustomer(sourceValue)
          if (filledValue) {
            row[mapping.targetField] = filledValue
          }
        }
      }
    }
  }

  return {
    autoFillCountryFromCustomer,
    batchAutoFill
  }
}
```

**优点**:
- ✅ 统一的填充逻辑
- ✅ 支持批量处理
- ✅ 可以集成 API 查询
- ✅ 便于缓存和优化

**缺点**:
- ⚠️ 需要修改通用组件调用此 Composable
- ⚠️ 增加架构复杂度

---

## 📝 使用示例

### 当前已实现的配置

**文件**: `frontend/src/configs/importMappings/container.ts`

```typescript
import type { FieldMapping } from '@/components/common/UniversalImport'
import { parseDate, parseDecimal, parseBoolean } from '@/components/common/UniversalImport'

export const CONTAINER_FIELD_MAPPINGS: FieldMapping[] = [
  // ... 其他字段
  
  {
    excelField: '客户名称',
    table: 'biz_replenishment_orders',
    field: 'customer_name',
    required: false
  },
  
  {
    excelField: '销往国家',
    table: 'biz_replenishment_orders',
    field: 'sell_to_country',
    required: false,
    aliases: ['进口国'],
    transform: (value: any, row?: Record<string, any>) => {
      // 优先级 1: Excel 中的值
      if (value) return value
      
      // 优先级 2: 根据客户名称自动填充
      if (row?.customer_name) {
        const customerName = String(row.customer_name)
        
        // 关键词匹配规则
        const countryKeywords: Record<string, string> = {
          '美国': '美国', 'US': '美国', 'USA': '美国',
          '英国': '英国', 'UK': '英国',
          '德国': '德国', 'DE': '德国',
          '法国': '法国', 'FR': '法国',
          '日本': '日本', 'JP': '日本',
          '澳大利亚': '澳大利亚', 'AU': '澳大利亚',
          '加拿大': '加拿大', 'CA': '加拿大',
        }
        
        for (const [keyword, country] of Object.entries(countryKeywords)) {
          if (customerName.includes(keyword)) {
            console.log(`[ContainerImport] 根据客户名称自动填充国家：${customerName} -> ${country}`)
            return country
          }
        }
      }
      
      // 优先级 3: 返回 null（留空由用户手动填写）
      return null
    }
  }
]
```

---

## 🔍 工作流程

```
Excel 文件上传
    ↓
解析 Excel 数据
    ↓
逐行转换数据
    ↓
对于每个字段:
  1. 检查 Excel 中是否有值
     - 有 → 使用 Excel 的值
     - 无 → 进入自动填充逻辑
    ↓
  2. 检查是否有同名的客户名称
     - 有 → 提取国家关键词
     - 无 → 返回 null
    ↓
  3. 应用关键词匹配规则
     - 匹配成功 → 返回国家
     - 匹配失败 → 返回 null
    ↓
完成转换，显示预览
    ↓
用户确认后导入数据库
```

---

## 🎯 扩展场景

### 场景 1: 港口名称 → 港口代码

```typescript
{
  excelField: '起运港',
  table: 'process_sea_freight',
  field: 'port_of_loading',
  transform: (value: any, row?: Record<string, any>) => {
    if (value) return value
    
    // 调用通用字典查询 API
    return lookupPortCodeByName(row?.port_name_en)
  }
}
```

### 场景 2: 供应商名称 → 供应商代码

```typescript
{
  excelField: '船公司',
  table: 'process_sea_freight',
  field: 'shipping_company_id',
  transform: (value: any, row?: Record<string, any>) => {
    if (value) return value
    
    // 根据供应商全称查询代码
    return lookupSupplierCodeByName(row?.shipping_company_name)
  }
}
```

### 场景 3: 仓库名称 → 仓库 ID

```typescript
{
  excelField: '仓库 (计划)',
  table: 'process_warehouse_operations',
  field: 'planned_warehouse',
  transform: (value: any, row?: Record<string, any>) => {
    if (value) return value
    
    // 根据仓库名称查询 ID
    return lookupWarehouseIdByName(row?.warehouse_name)
  }
}
```

---

## 📊 性能优化建议

### 1. 缓存机制

```typescript
const countryCache = new Map<string, string>()

function getCachedCountry(customerName: string): string | null {
  if (countryCache.has(customerName)) {
    return countryCache.get(customerName)!
  }
  
  const country = extractCountryFromName(customerName)
  countryCache.set(customerName, country)
  return country
}
```

### 2. 批量查询

```typescript
// 收集所有需要查询的客户名称
const uniqueCustomers = new Set(rows.map(r => r.customer_name).filter(Boolean))

// 批量调用 API 查询
const customerCountries = await batchLookupCountries([...uniqueCustomers])

// 应用到每一行
rows.forEach(row => {
  if (row.customer_name && !row.sell_to_country) {
    row.sell_to_country = customerCountries.get(row.customer_name)
  }
})
```

### 3. 懒加载

只在必要时才执行自动填充逻辑：

```typescript
transform: (value, row) => {
  if (value) return value  // 优先使用已有值
  if (!row?.customer_name) return null  // 没有源数据
  return autoFillCountry(row.customer_name)  // 最后才执行填充
}
```

---

## 🐛 调试技巧

### 1. 添加日志

```typescript
transform: (value, row) => {
  console.log('[AutoFill] 原始值:', value)
  console.log('[AutoFill] 整行数据:', row)
  
  const result = /* 填充逻辑 */
  
  console.log('[AutoFill] 填充结果:', result)
  return result
}
```

### 2. 错误处理

```typescript
transform: (value, row) => {
  try {
    return doAutoFill(value, row)
  } catch (error) {
    console.error('[AutoFill] 填充失败:', error)
    return value || null  // 失败时返回原始值或 null
  }
}
```

---

## ✅ 最佳实践

### ✅ 推荐做法

1. **优先级明确**: Excel 值 > 自动填充 > null
2. **日志清晰**: 记录每次填充的输入输出
3. **容错处理**: 填充失败不影响导入流程
4. **性能优先**: 使用缓存避免重复计算

### ❌ 避免的做法

1. **强制填充**: 不要阻止用户手动填写
2. **过度依赖**: 复杂场景应提示用户确认
3. **静默失败**: 重要的填充应该有明显日志
4. **重复计算**: 使用缓存提高性能

---

## 📖 相关文档

- [通用导入组件使用文档](./README.md)
- [字段映射配置规范](../../configs/importMappings/README.md)
- [Transform 函数开发指南](./TRANSFORM_GUIDE.md)

---

**最后更新**: 2026-03-21  
**维护者**: Logix Team
