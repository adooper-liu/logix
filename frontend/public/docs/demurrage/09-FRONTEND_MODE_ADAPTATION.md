# 滞港费计算模式前端适配说明

## 📋 概述

本文档说明前端如何适配滞港费计算的实际模式和预测模式标注功能。

## 🎯 适配目标

1. 在TypeScript接口中添加模式相关字段定义
2. 在滞港费展示组件中显示计算模式标签
3. 提供清晰的模式说明和区分

## 📝 修改内容

### 1. TypeScript接口更新

**文件**: `frontend/src/services/demurrage.ts`

#### 1.1 更新 `DemurrageItemResult` 接口

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

#### 1.2 更新 `CalculationDates` 接口

```typescript
export interface CalculationDates {
  // ... 原有字段 ...
  revisedEtaDestPort?: string | null  // 新增：修正ETA
}
```

#### 1.3 更新 `DemurrageCalculationResponse` 接口

```typescript
export interface DemurrageCalculationResponse {
  data?: {
    // ... 原有字段 ...
    calculationMode?: 'actual' | 'forecast'  // 新增：整体计算模式
  }
}
```

### 2. 滞港费展示组件更新

**文件**: `frontend/src/components/demurrage/DemurrageCalculationPanel.vue`

#### 2.1 添加模式标签配置

```typescript
const MODE_LABELS = {
  actual: { text: '实际模式', type: 'success' as const, desc: '基于实际到港数据计算' },
  forecast: { text: '预测模式', type: 'info' as const, desc: '基于ETA预测费用' }
}

function getModeLabel(mode: string | undefined) {
  return MODE_LABELS[mode as keyof typeof MODE_LABELS] || { text: '未知模式', type: 'info' as const, desc: '' }
}
```

#### 2.2 更新日期来源标签

```typescript
const SOURCE_LABELS_SHORT: Record<string, string> = {
  // ... 原有字段 ...
  revised_eta_dest_port: '修正ETA',  // 新增
}
```

#### 2.3 滞港费合计卡片显示

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
    <span class="hint-text">预测模式基于ETA计算，仅供参考。实际费用以实际到港后的计算为准。</span>
  </div>
</div>
```

#### 2.4 费用项表格显示

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

#### 2.5 展开详情显示

在展开区域新增计算模式详情：

```vue
<div v-if="row.calculationMode" class="expand-block">
  <span class="expand-label">计算模式</span>
  <el-tag :type="getModeLabel(row.calculationMode).type" size="small" effect="plain">
    {{ getModeLabel(row.calculationMode).text }}
  </el-tag>
  <span class="mode-detail">({{
    row.startDateMode === 'actual' ? '起算日:实际' : '起算日:预测'
  }} {{
    row.endDateMode === 'actual' ? '截止日:实际' : '截止日:预测'
  }} {{
    row.lastFreeDateMode === 'actual' ? '最晚免费日:实际' : '最晚免费日:预测'
  }})</span>
</div>
```

### 3. 样式更新

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

## 🎨 UI展示效果

### 实际模式展示
- 滞港费合计卡片显示绿色"实际模式"标签
- 费用项表格中每个项目显示绿色"实际模式"标签
- 展开详情显示各日期来源模式（起算日:实际、截止日:实际、最晚免费日:实际）

### 预测模式展示
- 滞港费合计卡片显示蓝色"预测模式"标签
- 显示提示信息："预测模式基于ETA计算，仅供参考。实际费用以实际到港后的计算为准。"
- 费用项表格中每个项目显示蓝色"预测模式"标签
- 展开详情显示各日期来源模式（可能混合实际和预测）

## 📊 模式标签颜色方案

| 模式 | 颜色 | 类型 | 说明 |
|------|------|------|------|
| 实际模式 | 绿色 | success | 基于实际到港数据计算，用于实际费用结算 |
| 预测模式 | 蓝色 | info | 基于ETA预测，用于计划调度和费用预警 |

## 🔍 使用场景

### 实际模式
- 货柜已实际到港（有ATA或实际卸船日）
- 用于实际滞港费结算
- 写入数据库的滞港费记录

### 预测模式
- 货柜尚未到港（只有ETA）
- 用于费用预算和计划调度
- 不写入数据库，仅用于参考
- 货柜到港后自动切换为实际模式

## ✅ 验证清单

- [x] TypeScript接口定义完整
- [x] 模式标签正确显示
- [x] 预测模式提示信息清晰
- [x] 展开详情显示模式详情
- [x] 样式美观，符合设计规范
- [x] 无linter错误

## 📌 注意事项

1. **向后兼容**: 所有模式字段都是可选的，旧数据可以正常显示
2. **数据源标记**: 展开详情中显示每个日期的来源模式，便于追溯
3. **用户友好**: 预测模式下有明显的提示信息，避免误解为实际费用
4. **颜色区分**: 通过不同颜色清晰区分两种模式

## 🔗 相关文档

- [滞港费计算模式说明](./08-DEMURRAGE_CALCULATION_MODES.md)
- [滞港费计算规则](./01-DEMURRAGE_CALCULATION_RULES.md)
- [数据库迁移脚本](../../../../../backend/migrations/add_demurrage_calculation_mode.sql)
