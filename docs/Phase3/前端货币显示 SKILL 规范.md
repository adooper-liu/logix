# 前端货币显示 SKILL 规范

## 🎯 规范目的

确保前端所有金额显示遵循统一的货币格式化规则，根据国家/地区自动显示对应的货币符号和格式。

---

## 📋 核心原则

### **1. 本地化原则**
- ✅ 货币符号必须与仓库所在国家/地区匹配
- ✅ 禁止硬编码 `$` 符号
- ✅ 使用 `formatCurrency()` 统一格式化函数

### **2. 自动匹配原则**
- ✅ 根据 `warehouseCountry` 自动选择货币符号
- ✅ 默认货币：`USD`（美国）
- ✅ 未知国家：降级到默认货币

### **3. 格式统一原则**
- ✅ 千分位分隔符：`,`
- ✅ 小数位数：2 位
- ✅ 格式：`符号 + 数字`（如 `$1,234.56`）

---

## 🛠️ 实现方案

### **1. 货币映射表**

```typescript
const currencyMap: Record<string, { symbol: string; code: string }> = {
  // 北美
  US: { symbol: '$', code: 'USD' },
  CA: { symbol: 'C$', code: 'CAD' },
  MX: { symbol: '$', code: 'MXN' },
  
  // 欧洲
  GB: { symbol: '£', code: 'GBP' },
  DE: { symbol: '€', code: 'EUR' },
  FR: { symbol: '€', code: 'EUR' },
  IT: { symbol: '€', code: 'EUR' },
  ES: { symbol: '€', code: 'EUR' },
  NL: { symbol: '€', code: 'EUR' },
  BE: { symbol: '€', code: 'EUR' },
  AT: { symbol: '€', code: 'EUR' },
  IE: { symbol: '€', code: 'EUR' },
  PT: { symbol: '€', code: 'EUR' },
  
  // 亚太
  AU: { symbol: 'A$', code: 'AUD' },
  NZ: { symbol: 'NZ$', code: 'NZD' },
  JP: { symbol: '¥', code: 'JPY' },
  CN: { symbol: '¥', code: 'CNY' },
  KR: { symbol: '₩', code: 'KRW' },
  SG: { symbol: 'S$', code: 'SGD' },
  HK: { symbol: 'HK$', code: 'HKD' },
  IN: { symbol: '₹', code: 'INR' },
  
  // 中东
  AE: { symbol: 'د.إ', code: 'AED' },
  SA: { symbol: '﷼', code: 'SAR' },
  IL: { symbol: '₪', code: 'ILS' },
  
  // 拉美
  BR: { symbol: 'R$', code: 'BRL' },
  AR: { symbol: '$', code: 'ARS' },
  CL: { symbol: '$', code: 'CLP' },
  CO: { symbol: '$', code: 'COP' },
  
  // 非洲
  ZA: { symbol: 'R', code: 'ZAR' },
  EG: { symbol: '£', code: 'EGP' },
  NG: { symbol: '₦', code: 'NGN' },
  
  // 其他
  RU: { symbol: '₽', code: 'RUB' },
  TR: { symbol: '₺', code: 'TRY' },
  PL: { symbol: 'zł', code: 'PLN' },
  TH: { symbol: '฿', code: 'THB' },
  MY: { symbol: 'RM', code: 'MYR' },
  ID: { symbol: 'Rp', code: 'IDR' },
  PH: { symbol: '₱', code: 'PHP' },
  VN: { symbol: '₫', code: 'VND' }
}
```

---

### **2. formatCurrency 函数**

```typescript
/**
 * SKILL 规范：货币格式化函数
 * @param amount 金额数字
 * @param countryCode 国家代码（ISO 3166-1 alpha-2）
 * @returns 格式化后的货币字符串
 */
const formatCurrency = (amount: number, countryCode?: string): string => {
  const country = countryCode || 'US'
  
  // 根据国家获取货币符号
  const currency = currencyMap[country] || { symbol: '$', code: 'USD' }
  
  // 格式化数字（带千分位，2 位小数）
  const formattedAmount = amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
  
  return `${currency.symbol}${formattedAmount}`
}
```

---

### **3. 使用示例**

#### **Vue 组件中使用**

```vue
<template>
  <!-- ✅ 正确：使用 formatCurrency -->
  <span>{{ formatCurrency(row.estimatedCosts.totalCost, row.plannedData?.warehouseCountry || 'US') }}</span>
  
  <!-- ❌ 错误：硬编码 $ 符号 -->
  <span>${{ row.estimatedCosts.totalCost.toLocaleString() }}</span>
</template>

<script setup lang="ts">
// ✅ 推荐：封装 formatCurrency 函数
const formatCurrency = (amount: number, countryCode?: string): string => {
  const country = countryCode || 'US'
  const currency = currencyMap[country] || { symbol: '$', code: 'USD' }
  const formattedAmount = amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
  return `${currency.symbol}${formattedAmount}`
}
</script>
```

#### **获取仓库国家**

```typescript
// 从后端返回的数据中获取
interface PreviewResult {
  plannedData?: {
    warehouseCountry?: string // ✅ 新增字段
    warehouseCode?: string
    warehouseName?: string
  }
  estimatedCosts?: {
    totalCost?: number
    currency?: string
  }
}

// 使用示例
const country = row.plannedData?.warehouseCountry || 'US'
const displayAmount = formatCurrency(row.estimatedCosts.totalCost, country)
```

---

## 📊 货币符号对照表

| 国家/地区 | 代码 | 货币符号 | 货币代码 | 示例 |
|----------|------|---------|---------|------|
| 美国 | US | $ | USD | $1,234.56 |
| 英国 | GB | £ | GBP | £1,234.56 |
| 欧盟 | EU/DE/FR/IT/ES | € | EUR | €1.234,56 |
| 日本 | JP | ¥ | JPY | ¥1,234 |
| 中国 | CN | ¥ | CNY | ¥1,234.56 |
| 澳大利亚 | AU | A$ | AUD | A$1,234.56 |
| 加拿大 | CA | C$ | CAD | C$1,234.56 |
| 韩国 | KR | ₩ | KRW | ₩1,234 |
| 印度 | IN | ₹ | INR | ₹1,234.56 |
| 巴西 | BR | R$ | BRL | R$ 1.234,56 |
| 俄罗斯 | RU | ₽ | RUB | 1 234,56 ₽ |
| 土耳其 | TR | ₺ | TRY | ₺1.234,56 |
| 泰国 | TH | ฿ | THB | ฿1,234.56 |
| 马来西亚 | MY | RM | MYR | RM1,234.56 |
| 新加坡 | SG | S$ | SGD | S$1,234.56 |
| 香港 | HK | HK$ | HKD | HK$1,234.56 |
| 墨西哥 | MX | $ | MXN | $1,234.56 |
| 南非 | ZA | R | ZAR | R1,234.56 |
| 阿联酋 | AE | د.إ | AED | د.إ 1,234.56 |
| 沙特 | SA | ﷼ | SAR | ﷼1,234.56 |
| 以色列 | IL | ₪ | ILS | ₪1,234.56 |
| 波兰 | PL | zł | PLN | 1 234,56 zł |
| 越南 | VN | ₫ | VND | 1.234.567 ₫ |
| 印尼 | ID | Rp | IDR | Rp1.234.567 |
| 菲律宾 | PH | ₱ | PHP | ₱1,234.56 |

---

## ✅ 检查清单

### **代码审查要点**

- [ ] 所有金额显示是否使用 `formatCurrency()` 函数
- [ ] 是否存在硬编码的 `$`、`£`、`€` 等符号
- [ ] 是否正确传递 `warehouseCountry` 参数
- [ ] 是否有降级处理（未知国家时使用默认货币）
- [ ] 数字格式化是否统一（千分位，2 位小数）

### **常见错误示例**

#### **❌ 错误 1：硬编码 $ 符号**
```vue
<span>${{ amount.toLocaleString() }}</span>
```

#### **❌ 错误 2：缺少国家参数**
```vue
<span>{{ formatCurrency(amount) }}</span> <!-- 未传递国家代码 -->
```

#### **❌ 错误 3：使用错误的字段**
```vue
<span>{{ formatCurrency(amount, row.destinationPort) }}</span> <!-- 应使用 warehouseCountry -->
```

#### **✅ 正确示例**
```vue
<span>{{ formatCurrency(amount, row.plannedData?.warehouseCountry || 'US') }}</span>
```

---

## 🔧 迁移指南

### **步骤 1：添加 formatCurrency 函数**

在使用的组件中添加 `formatCurrency` 函数和 `currencyMap`。

### **步骤 2：更新接口定义**

确保 `PreviewResult` 或其他相关接口包含 `warehouseCountry` 字段：

```typescript
interface PreviewResult {
  plannedData?: {
    warehouseCountry?: string // ✅ 新增
    // ... 其他字段
  }
}
```

### **步骤 3：批量替换**

全局搜索并替换：
- `${{ amount }}` → `{{ formatCurrency(amount, country) }}`
- `${{ amount.toLocaleString() }}` → `{{ formatCurrency(amount, country) }}`

### **步骤 4：测试验证**

- [ ] 美国仓库：显示 `$1,234.56`
- [ ] 英国仓库：显示 `£1,234.56`
- [ ] 欧盟仓库：显示 `€1.234,56`
- [ ] 日本仓库：显示 `¥1,234`
- [ ] 未知国家：显示 `$1,234.56`（默认）

---

## 📚 相关文档

- [ISO 4217 货币代码标准](https://www.iso.org/iso-4217-currency-codes.html)
- [ISO 3166-1 国家代码标准](https://www.iso.org/iso-3166-country-codes.html)
- [Intl.NumberFormat MDN 文档](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat)
- [Vue 3 国际化指南](https://vuejs.org/guide/scaling-up/i18n.html)

---

## 🏷️ 标签

#前端规范 #货币格式化 #本地化 #SKILL 规范 #Vue3 #TypeScript

---

**制定日期**：2026-03-25  
**维护人员**：LogiX 开发团队  
**适用范围**：所有前端金额显示场景
