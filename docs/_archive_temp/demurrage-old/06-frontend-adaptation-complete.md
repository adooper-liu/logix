# 滞港费计算模式前端适配完整指南

> **创建日期**: 2026-03-16  
> **最后更新**: 2026-03-16  
> **状态**: ✅ 已完成并上线  
> **相关文档**: [滞港费计算模式说明](./08-DEMURRAGE_CALCULATION_MODES.md) | [计算规则](./01-DEMURRAGE_CALCULATION_RULES.md)

---

## 📋 概述

本文档完整说明前端如何适配滞港费计算的实际模式和预测模式标注功能，包括 TypeScript 接口定义、组件展示、样式更新及验证清单。

### 适配目标

1. 在 TypeScript 接口中添加模式相关字段定义
2. 在滞港费展示组件中显示计算模式标签
3. 提供清晰的模式说明和区分
4. 在最晚提柜日标签中显示具体计算来源

---

## 📝 第一部分：TypeScript 接口更新

### 1.1 更新 `DemurrageItemResult` 接口

**文件**: `frontend/src/services/demurrage.ts`

```typescript
export interface DemurrageItemResult {
  // ... 原有字段 ...
  calculationMode?: 'actual' | 'forecast'
  startDateMode?: 'actual' | 'forecast'
  endDateMode?: 'actual' | 'forecast'
  lastFreeDateMode?: 'actual' | 'forecast'
}
```

**新增字段说明**:

- `calculationMode`: 计算模式（actual=实际，forecast=预测）
- `startDateMode`: 起算日来源模式
- `endDateMode`: 截止日来源模式
- `lastFreeDateMode`: 最晚免费日计算模式

### 1.2 更新 `CalculationDates` 接口

```typescript
export interface CalculationDates {
  // ... 原有字段 ...
  revisedEtaDestPort?: string | null // 新增：修正 ETA
  dischargeDateSource?: 'dest_port_unload_date' | 'discharged_time' | null // 新增：卸船日来源
  lastPickupDateMode?: 'actual' | 'forecast' | null // 新增：最晚提柜日模式
  lastReturnDateMode?: 'actual' | 'forecast' | null // 新增：最晚还箱日模式
}
```

### 1.3 更新 `DemurrageCalculationResponse` 接口

```typescript
export interface DemurrageCalculationResponse {
  data?: {
    // ... 原有字段 ...
    calculationMode?: 'actual' | 'forecast' // 新增：整体计算模式
  }
}
```

---

## 🎨 第二部分：滞港费展示组件更新

### 2.1 添加模式标签配置

**文件**: `frontend/src/components/demurrage/DemurrageCalculationPanel.vue`

```typescript
const MODE_LABELS = {
  actual: { text: '实际模式', type: 'success' as const, desc: '基于实际到港数据计算' },
  forecast: { text: '预测模式', type: 'info' as const, desc: '基于 ETA 预测费用' },
}

function getModeLabel(mode: string | undefined) {
  return (
    MODE_LABELS[mode as keyof typeof MODE_LABELS] || {
      text: '未知模式',
      type: 'info' as const,
      desc: '',
    }
  )
}
```

### 2.2 更新日期来源标签

```typescript
const SOURCE_LABELS_SHORT: Record<string, string> = {
  // ... 原有字段 ...
  revised_eta_dest_port: '修正 ETA', // 新增
  discharged_time: '卸船时间',
  dest_port_unload_date: '卸船日期',
}
```

### 2.3 滞港费合计卡片显示

```vue
<div class="demurrage-card total-card">
  <div class="card-header">
    <span class="card-icon">📊</span>
    <span class="card-title">滞港费合计</span>
    <!-- 新增：计算模式标签 -->
    <el-tag v-if="data.calculationMode" :type="getModeLabel(data.calculationMode).type" size="small" effect="plain">
      {{ getModeLabel(data.calculationMode).text }}
    </el-tag>
    <!-- ... 其他标签 ... -->
    <span class="total-amount">{{ data.totalAmount.toFixed(2) }} {{ data.currency }}</span>
  </div>
  <!-- 新增：预测模式提示 -->
  <div v-if="data.calculationMode === 'forecast'" class="mode-hint">
    <span class="hint-icon">ℹ️</span>
    <span class="hint-text">预测模式基于 ETA 计算，仅供参考。实际费用以实际到港后的计算为准。</span>
  </div>
</div>
```

### 2.4 费用项表格显示

```vue
<el-table-column label="计算模式" width="90" align="center">
  <template #default="{ row }">
    <el-tag v-if="row.calculationMode" :type="getModeLabel(row.calculationMode).type" size="small" effect="plain">
      {{ getModeLabel(row.calculationMode).text }}
    </el-tag>
    <span v-else>-</span>
  </template>
</el-table-column>
```

### 2.5 展开详情显示

在展开区域新增计算模式详情：

```vue
<div v-if="row.calculationMode" class="expand-block">
  <span class="expand-label">计算模式</span>
  <el-tag :type="getModeLabel(row.calculationMode).type" size="small" effect="plain">
    {{ getModeLabel(row.calculationMode).text }}
  </el-tag>
  <span class="mode-detail">({{
    row.startDateMode === 'actual' ? '起算日：实际' : '起算日：预测'
  }} {{
    row.endDateMode === 'actual' ? '截止日：实际' : '截止日：预测'
  }} {{
    row.lastFreeDateMode === 'actual' ? '最晚免费日：实际' : '最晚免费日：预测'
  }})</span>
</div>
```

---

## 🏷️ 第三部分：最晚提柜日标签更新

### 3.1 添加计算来源判断函数

**文件**: `frontend/src/views/shipments/components/KeyDatesTimeline.vue`

```typescript
/**
 * 获取最晚提柜日的计算来源文字
 * @param mode 计算模式（actual/forecast）
 * @param ataDestPort 实际到港日期
 * @param etaDestPort 原始 ETA
 * @param revisedEtaDestPort 修正 ETA
 * @param dischargeDate 卸船日期
 */
const getCalculationSourceText = (
  mode: 'actual' | 'forecast' | null,
  ataDestPort?: string | null,
  etaDestPort?: string | null,
  revisedEtaDestPort?: string | null,
  dischargeDate?: string | null
): string | null => {
  if (!mode) return null

  if (mode === 'actual') {
    // 实际模式：基于实际到港日或实际卸船日
    if (ataDestPort) {
      return '按实际 ATA 计算'
    } else if (dischargeDate) {
      return '按实际卸船日计算'
    }
    return '按实际数据计算'
  } else {
    // 预测模式：基于 ETA
    if (ataDestPort) {
      return '按实际 ATA 计算' // 如果有 ATA，优先用 ATA
    } else if (dischargeDate) {
      return '按实际卸船日计算' // 如果有实际卸船日，用实际卸船日
    } else if (revisedEtaDestPort) {
      return '按修正 ETA 计算'
    } else if (etaDestPort) {
      return '按 ETA 计算'
    }
    return '按 ETA 计算'
  }
}

/**
 * 获取最晚还箱日的计算来源文字
 * @param pickupDateActual 实际提柜日期
 */
const getCalculationSourceTextForReturn = (pickupDateActual?: string | null): string | null => {
  if (!pickupDateActual) return null
  return '按实际提柜日计算'
}
```

### 3.2 更新时间线事件构建逻辑

```typescript
// 最晚提柜日 - 添加计算来源标注
const lastPickupDate = d.lastPickupDateComputed ?? d.lastPickupDate
const isLastPickupComputed = !!d.lastPickupDateComputed
const isLastPickupFromDb = !!d.lastPickupDate && !d.lastPickupDateComputed
add('最晚提柜', '最晚提柜日', lastPickupDate, '⏰', 'danger', {
  isComputed: isLastPickupComputed,
  isFromDb: isLastPickupFromDb,
  calculationMode: isLastPickupComputed ? d.lastPickupDateMode : null,
  calculationSource: isLastPickupComputed
    ? getCalculationSourceText(
        d.lastPickupDateMode,
        d.ataDestPort,
        d.etaDestPort,
        d.revisedEtaDestPort,
        d.dischargeDate
      )
    : null,
})

// 最晚还箱日 - 添加计算来源标注
const lastReturnDate = d.lastReturnDateComputed ?? d.lastReturnDate
const isLastReturnComputed = !!d.lastReturnDateComputed
const isLastReturnFromDb = !!d.lastReturnDate && !d.lastReturnDateComputed
add('最晚还箱', '最晚还箱日', lastReturnDate, '📦', 'danger', {
  isComputed: isLastReturnComputed,
  isFromDb: isLastReturnFromDb,
  calculationMode: isLastReturnComputed ? d.lastReturnDateMode : null,
  calculationSource: isLastReturnComputed
    ? getCalculationSourceTextForReturn(d.pickupDateActual)
    : null,
})
```

### 3.3 更新模板显示

```vue
<div class="item-header">
  <span class="item-label">{{ event.label }}</span>
  <span v-if="event.isComputed && event.calculationSource" class="item-tag item-tag-computed">
    {{ event.calculationSource }}
  </span>
  <span v-else-if="event.isComputed" class="item-tag item-tag-computed">计算</span>
  <span v-else-if="event.isFromDb" class="item-tag item-tag-db">录入</span>
</div>
```

---

## 🎨 第四部分：样式更新

### 4.1 模式提示样式

```scss
.mode-hint {
  margin-top: $spacing-sm;
  padding: $spacing-sm $spacing-md;
  background: rgba($info-color, 0.05);
  border-left: 3px solid $info-color;
  border-radius: $radius-base;
  display: flex;
  align-items: center;
  gap: $spacing-sm;

  .hint-icon {
    font-size: 16px;
    flex-shrink: 0;
  }

  .hint-text {
    font-size: $font-size-sm;
    color: $text-secondary;
    line-height: 1.5;
  }
}

.mode-detail {
  margin-left: $spacing-sm;
  font-size: $font-size-xs;
  color: $text-secondary;
}
```

### 4.2 时间线标签样式

```scss
.item-tag {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: $radius-small;
  font-weight: 500;
  white-space: nowrap; // 防止标签文字换行

  &.item-tag-computed {
    background: rgba($warning-color, 0.12);
    color: darken($warning-color, 8%);
  }

  &.item-tag-db {
    background: rgba($info-color, 0.12);
    color: darken($info-color, 8%);
  }
}
```

---

## 🎯 第五部分：UI 展示效果

### 5.1 实际模式展示

**滞港费合计卡片**:

- 显示绿色"实际模式"标签
- 无额外提示信息

**费用项表格**:

- 每个项目显示绿色"实际模式"标签
- 展开详情显示各日期来源模式（起算日：实际、截止日：实际、最晚免费日：实际）

**最晚提柜日标签**（有 ATA）:

```
出运 🚢  2026/01/03  已历时 67 天
ETA  📅   2026/02/11  已历时 28 天
最晚提柜 ⏰ 2026/02/17  已历时 22 天 [按实际 ATA 计算]
当前 📆  2026/03/11
```

**最晚提柜日标签**（无 ATA，有卸船日）:

```
出运 🚢  2026/01/03  已历时 67 天
ETA  📅   2026/02/11  已历时 28 天
卸船 🚢  2026/02/12  已历时 27 天
最晚提柜 ⏰ 2026/02/18  已历时 21 天 [按实际卸船日计算]
当前 📆  2026/03/11
```

### 5.2 预测模式展示

**滞港费合计卡片**:

- 显示蓝色"预测模式"标签
- 显示提示信息："预测模式基于 ETA 计算，仅供参考。实际费用以实际到港后的计算为准。"

**费用项表格**:

- 每个项目显示蓝色"预测模式"标签
- 展开详情显示各日期来源模式（可能混合实际和预测）

**最晚提柜日标签**（有修正 ETA）:

```
出运 🚢  2026/01/03  已历时 67 天
ETA  📅   2026/02/11  已历时 28 天
最晚提柜 ⏰ 2026/02/17  已历时 22 天 [按修正 ETA 计算]
当前 📆  2026/03/11
```

**最晚提柜日标签**（只有原始 ETA）:

```
出运 🚢  2026/01/03  已历时 67 天
ETA  📅   2026/02/11  已历时 28 天
最晚提柜 ⏰ 2026/02/17  已历时 22 天 [按 ETA 计算]
当前 📆  2026/03/11
```

### 5.3 录入数据展示

```
出运 🚢  2026/01/03  已历时 67 天
ATA  📍  2026/02/10  已历时 29 天
最晚提柜 ⏰ 2026/02/20  已历时 19 天 [录入]
当前 📆  2026/03/11
```

---

## 📊 第六部分：模式标签规则

### 6.1 滞港费计算模式颜色方案

| 模式     | 颜色 | 类型    | 说明                                   |
| -------- | ---- | ------- | -------------------------------------- |
| 实际模式 | 绿色 | success | 基于实际到港数据计算，用于实际费用结算 |
| 预测模式 | 蓝色 | info    | 基于 ETA 预测，用于计划调度和费用预警  |

### 6.2 最晚提柜日标签规则

| 优先级 | 条件                       | 标签文字         |
| ------ | -------------------------- | ---------------- |
| 1      | actual 模式 + 有 ATA       | 按实际 ATA 计算  |
| 2      | actual 模式 + 有卸船日     | 按实际卸船日计算 |
| 3      | forecast 模式 + 有 ATA     | 按实际 ATA 计算  |
| 4      | forecast 模式 + 有卸船日   | 按实际卸船日计算 |
| 5      | forecast 模式 + 有修正 ETA | 按修正 ETA 计算  |
| 6      | forecast 模式 + 有原始 ETA | 按 ETA 计算      |
| 7      | 录入数据                   | 录入             |

### 6.3 最晚还箱日标签规则

| 优先级 | 条件                 | 标签文字         |
| ------ | -------------------- | ---------------- |
| 1      | 计算（有实际提柜日） | 按实际提柜日计算 |
| 2      | 录入数据             | 录入             |

---

## 🔍 第七部分：使用场景

### 7.1 实际模式

- **适用场景**: 货柜已实际到港（有 ATA 或实际卸船日）
- **用途**: 用于实际滞港费结算
- **数据存储**: 写入数据库的滞港费记录
- **标签颜色**: 绿色

### 7.2 预测模式

- **适用场景**: 货柜尚未到港（只有 ETA）
- **用途**: 用于费用预算和计划调度
- **数据存储**: 不写入数据库，仅用于参考
- **标签颜色**: 蓝色
- **自动切换**: 货柜到港后自动切换为实际模式

---

## ✅ 第八部分：验证清单

### 代码质量检查

- [x] TypeScript 接口定义完整
- [x] 模式标签正确显示
- [x] 预测模式提示信息清晰
- [x] 展开详情显示模式详情
- [x] 计算来源判断逻辑正确
- [x] 模板显示逻辑正确
- [x] 样式调整合适
- [x] 无 linter 错误
- [x] 向后兼容（旧数据显示"计算"或"录入"）

### 功能验证

- [x] 实际模式标签显示正确
- [x] 预测模式标签显示正确
- [x] 最晚提柜日计算来源标注准确
- [x] 最晚还箱日计算来源标注准确
- [x] 优先级规则正确（实际日期优先于 ETA）

---

## 📌 第九部分：注意事项

### 9.1 向后兼容性

- 所有模式字段都是可选的，旧数据可以正常显示
- 如果没有 `calculationSource`，显示"计算"
- 如果是录入数据，显示"录入"
- 确保旧数据正常显示

### 9.2 数据源标记

- 展开详情中显示每个日期的来源模式，便于追溯
- `dischargeDateSource` 字段记录真实来源（`dest_port_unload_date` 或 `discharged_time`）

### 9.3 用户友好

- 预测模式下有明显的提示信息，避免误解为实际费用
- 通过不同颜色清晰区分两种模式
- 标签文字简洁明了

### 9.4 标签长度控制

- 最长标签为"按实际卸船日计算"（7 个中文字符）
- 样式已添加 `white-space: nowrap` 防止换行
- 卡片宽度自适应，可以容纳长标签

### 9.5 优先级规则

- 实际日期（ATA/卸船日）优先于 ETA
- 修正 ETA 优先于原始 ETA
- 计算值优先于录入值

---

## 🔧 第十部分：常见问题

### Q1: 为什么需要区分 `dest_port_unload_date` 和 `discharged_time`？

**A**: 虽然两个字段都是卸船相关，但：

- 字段名称不同，数据类型可能不同（日期 vs 时间戳）
- 用户可能需要知道具体来源
- 系统日志和调试需要精确信息
- 审计需要追溯原始数据来源

### Q2: 预测模式和实际模式会同时存在吗？

**A**: 不会。同一个货柜的滞港费计算只会使用一种模式：

- 货柜未到港：使用预测模式
- 货柜已到港：使用实际模式
- 到港后自动从预测切换为实际

### Q3: 标签文字太长怎么办？

**A**: 已采取以下措施：

- 使用简洁的中文描述
- 添加 `white-space: nowrap` 防止换行
- 卡片宽度自适应
- 最长标签已在设计时考虑

---

## 🔗 第十一部分：相关文档

- [滞港费计算模式说明](./08-DEMURRAGE_CALCULATION_MODES.md)
- [滞港费计算规则](./01-DEMURRAGE_CALCULATION_RULES.md)
- [数据库迁移脚本](../../../../../backend/migrations/add_demurrage_calculation_mode.sql)
- [后端修复总结](./10-MODE_FIX_SUMMARY.md)

---

## 📝 第十二部分：修改历史

| 日期       | 修改内容                        | 修改人   |
| ---------- | ------------------------------- | -------- |
| 2025-03-11 | 初始实现模式标签功能            | 开发团队 |
| 2025-03-11 | 添加最晚提柜日计算来源标注      | 开发团队 |
| 2025-03-11 | 修复 forecast 模式 ETA 回退问题 | 开发团队 |
| 2025-03-11 | 补充 `dischargeDateSource` 字段 | 开发团队 |
| 2026-03-16 | 整合三篇文档为完整指南          | Lingma   |

---

**文档整合说明**: 本文档由以下三篇文档整合而成：

- `09-FRONTEND_MODE_ADAPTATION.md` (前端模式适配说明)
- `10-MODE_FIX_SUMMARY.md` (问题修复总结)
- `11-LAST_PICKUP_DATE_LABEL_UPDATE.md` (最晚提柜日标签更新)
