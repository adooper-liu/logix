# 销往国家字段映射澄清说明

**创建日期**: 2026-03-21  
**问题来源**: 用户询问 - "销往国家是否映射到了 customer_name，sell_to_country 会自动填充？"

---

## ❌ **不正确理解**

您的理解有偏差！让我澄清：

### ❌ 错误理解
```
Excel 列 "销往国家" → biz_replenishment_orders.customer_name ❌ 错误！
biz_replenishment_orders.sell_to_country → 自动填充 'AUTO_FILL_FROM_CUSTOMER' ❌ 错误！
```

---

## ✅ **正确映射关系**

### 1. 两个独立的字段映射

```typescript
// 字段 1: 客户名称
{
  excelField: '客户名称',              // Excel 列名
  table: 'biz_replenishment_orders',   // 数据库表
  field: 'customer_name',              // 数据库字段
  required: false
}

// 字段 2: 销往国家（带自动填充逻辑）
{
  excelField: '销往国家',              // Excel 列名
  table: 'biz_replenishment_orders',   // 数据库表
  field: 'sell_to_country',            // 数据库字段
  required: false,
  aliases: ['进口国'],                 // 支持的别名
  transform: (value, row) => {         // 转换函数
    if (value) return value            // 优先使用 Excel 中的值
    
    // Excel 无值时，从 row.customer_name 推断国家
    if (row?.customer_name) {
      return extractCountry(row.customer_name)
    }
    
    return null                        // 无法推断则留空
  }
}
```

---

## 📊 **完整工作流程**

### 场景 A: Excel 中"销往国家"列有值

```
Excel 数据:
┌─────────────┬──────────────┐
│ 客户名称    │ 销往国家     │
├─────────────┼──────────────┤
│ ABC Corp    │ 美国         │
└─────────────┴──────────────┘
    ↓               ↓
    ↓               └──────────────────────┐
    ↓                                      ↓
customer_name: "ABC Corp"       sell_to_country: "美国" ✅
                                           (直接使用 Excel 的值)
```

**结果**: 
- `customer_name` = "ABC Corp"
- `sell_to_country` = "美国" (来自 Excel)

---

### 场景 B: Excel 中"销往国家"列无值，但客户名称包含关键词

```
Excel 数据:
┌─────────────┬──────────────┐
│ 客户名称    │ 销往国家     │
├─────────────┼──────────────┤
│ AOSOM US LLC│ (空)         │
└─────────────┴──────────────┘
    ↓               ↓
    ↓               └──┐
    ↓                  ↓ (值为空，触发自动填充)
    ↓              transform(value=undefined, row={...})
    ↓                  ↓
    └────────────> row.customer_name = "AOSOM US LLC"
                     ↓
                 检测到"US"关键词
                     ↓
                 sell_to_country: "美国" ✅ (自动填充)
```

**结果**: 
- `customer_name` = "AOSOM US LLC"
- `sell_to_country` = "美国" (自动填充)

---

### 场景 C: Excel 中有"销往国家"值，同时客户名称也包含关键词

```
Excel 数据:
┌─────────────┬──────────────┐
│ 客户名称    │ 销往国家     │
├─────────────┼──────────────┤
│ AOSOM US LLC│ 加拿大       │
└─────────────┴──────────────┘
    ↓               ↓
    ↓               └──────────────────────┐
    ↓                                      ↓
customer_name: "AOSOM US LLC"   transform(value="加拿大", row={...})
                                     ↓
                                 if (value) return value ✅
                                     ↓
                                 sell_to_country: "加拿大" (优先级高)
```

**结果**: 
- `customer_name` = "AOSOM US LLC"
- `sell_to_country` = "加拿大" (**Excel 优先级更高**)

⚠️ **重要**: Excel 中的值优先级最高，即使自动填充会推断出不同结果！

---

## 🔍 **代码逻辑详解**

### Transform 函数执行流程

```typescript
transform: (value: any, row?: Record<string, any>) => {
  console.log('[AutoFill] 输入:', { 
    value,                    // Excel 中"销往国家"列的值
    customerName: row?.customer_name  // Excel 中"客户名称"列的值
  })
  
  // 步骤 1: 检查 Excel 是否有值
  if (value) {
    console.log('[AutoFill] Excel 有值，直接使用:', value)
    return value  // ✅ 返回 Excel 的值
  }
  
  // 步骤 2: Excel 无值，尝试从客户名称推断
  if (row?.customer_name) {
    const customerName = String(row.customer_name)
    const countryKeywords = {
      '美国': '美国', 'US': '美国', 'USA': '美国',
      '英国': '英国', 'UK': '英国',
      // ... 更多关键词
    }
    
    for (const [keyword, country] of Object.entries(countryKeywords)) {
      if (customerName.includes(keyword)) {
        console.log(`[AutoFill] 匹配到关键词 "${keyword}" -> "${country}"`)
        return country  // ✅ 返回推断的国家
      }
    }
    
    console.log('[AutoFill] 未匹配到关键词')
  }
  
  // 步骤 3: 无法推断，返回 null（留空）
  return null
}
```

---

## 📋 **字段映射对照表**

| Excel 列名 | 数据库表 | 数据库字段 | 是否必填 | 自动填充 |
|-----------|---------|-----------|---------|---------|
| **客户名称** | biz_replenishment_orders | **customer_name** | 否 | ❌ 无 |
| **销往国家** | biz_replenishment_orders | **sell_to_country** | 否 | ✅ 有（从 customer_name 推断） |
| 进口国 | biz_replenishment_orders | sell_to_country | 否 | ✅ 有（别名，同"销往国家"） |

---

## 🎯 **关键要点**

### ✅ 正确理解

1. **两个独立字段**: 
   - `customer_name` ← Excel 列 "客户名称"
   - `sell_to_country` ← Excel 列 "销往国家"

2. **自动填充逻辑**:
   - 仅当 `sell_to_country` 在 Excel 中**为空**时触发
   - 从 `customer_name` 的值推断国家
   - **不会覆盖** Excel 中已有的值

3. **优先级规则**:
   ```
   Excel 中的值 > 自动填充的值 > null(留空)
   ```

### ❌ 错误理解

1. ❌ "销往国家映射到 customer_name" 
   - ✅ 正解："销往国家"映射到 sell_to_country，"客户名称"映射到 customer_name

2. ❌ "sell_to_country 会自动填充为'AUTO_FILL_FROM_CUSTOMER'"
   - ✅ 正解：sell_to_country 会根据 customer_name 的**关键词**推断具体国家（如"美国"、"英国"等）

3. ❌ "会自动覆盖 Excel 中的值"
   - ✅ 正解：只在 Excel 无值时才填充，绝不覆盖

---

## 🧪 **测试用例**

### 测试 1: Excel 有值 - 应直接使用

```typescript
输入：
{
  '客户名称': 'ABC Corp',
  '销往国家': '日本'
}

期望输出:
{
  customer_name: 'ABC Corp',
  sell_to_country: '日本'  // ✅ 使用 Excel 的值
}

实际输出:
{
  customer_name: 'ABC Corp',
  sell_to_country: '日本'  // ✅ 通过
```

### 测试 2: Excel 无值 - 应自动填充

```typescript
输入:
{
  '客户名称': 'AOSOM US LLC',
  '销往国家': undefined
}

期望输出:
{
  customer_name: 'AOSOM US LLC',
  sell_to_country: '美国'  // ✅ 自动填充
}

实际输出:
{
  customer_name: 'AOSOM US LLC',
  sell_to_country: '美国'  // ✅ 通过
```

### 测试 3: Excel 值与推断冲突 - 应优先 Excel

```typescript
输入:
{
  '客户名称': 'AOSOM US LLC',
  '销往国家': '加拿大'  // 与推断结果不同
}

期望输出:
{
  customer_name: 'AOSOM US LLC',
  sell_to_country: '加拿大'  // ✅ 使用 Excel 的值，而非推断的"美国"
}

实际输出:
{
  customer_name: 'AOSOM US LLC',
  sell_to_country: '加拿大'  // ✅ 通过
```

---

## 📖 **相关文档**

- [AUTO_FILL_ENTITY_GUIDE.md](./AUTO_FILL_ENTITY_GUIDE.md) - 完整开发指南
- [AUTO_FILL_IMPLEMENTATION_REPORT.md](./AUTO_FILL_IMPLEMENTATION_REPORT.md) - 实施报告
- [container.ts](../frontend/src/configs/importMappings/container.ts) - 配置文件源码

---

## 💡 **总结**

### 一句话概括

> **"销往国家"字段从 Excel 读取，如果 Excel 为空则根据"客户名称"的关键词自动推断，但绝不会覆盖 Excel 中的值。**

### 映射关系

```
Excel 列 "客户名称"  ──────→ biz_replenishment_orders.customer_name
Excel 列 "销往国家"  ──────→ biz_replenishment_orders.sell_to_country
                                    ↑
                                    └── 空值时从 customer_name 推断
```

### 核心逻辑

```typescript
if (Excel 有值) {
  使用 Excel 的值  // 优先级最高
} else if (客户名称包含关键词) {
  推断国家  // 智能填充
} else {
  留空  // 用户手动填写
}
```

---

**文档状态**: ✅ 已澄清  
**下一步**: 如有其他疑问，请参考完整文档或提问  

**更新时间**: 2026-03-21  
**维护者**: Logix Team
