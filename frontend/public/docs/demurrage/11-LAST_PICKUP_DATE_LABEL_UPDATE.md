# 最晚提柜日标签更新说明

## 📋 修改日期
2025-03-11

## 🎯 修改目标

将最晚提柜日的标签从简单的"计算"改为更具体的计算来源标注，明确显示是基于哪种日期计算的：
- 按实际ATA计算
- 按ETA计算
- 按修正ETA计算
- 按实际卸船日计算

## 📝 修改内容

### 1. 更新TypeScript接口

**文件**: `frontend/src/services/demurrage.ts`

```typescript
export interface CalculationDates {
  // ... 其他字段 ...
  lastPickupDateMode?: 'actual' | 'forecast' | null
  lastReturnDateMode?: 'actual' | 'forecast' | null
}
```

**文件**: `frontend/src/views/shipments/components/KeyDatesTimeline.vue`

```typescript
interface CalculationDates {
  // ... 其他字段 ...
  lastPickupDateMode?: 'actual' | 'forecast' | null
  lastReturnDateMode?: 'actual' | 'forecast' | null
}

interface TimelineEvent {
  // ... 其他字段 ...
  calculationMode?: 'actual' | 'forecast' | null
  calculationSource?: string | null
}
```

### 2. 添加计算来源判断函数

**文件**: `frontend/src/views/shipments/components/KeyDatesTimeline.vue`

```typescript
/**
 * 获取最晚提柜日的计算来源文字
 * @param mode 计算模式（actual/forecast）
 * @param ataDestPort 实际到港日期
 * @param etaDestPort 原始ETA
 * @param revisedEtaDestPort 修正ETA
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
      return '按实际ATA计算'
    } else if (dischargeDate) {
      return '按实际卸船日计算'
    }
    return '按实际数据计算'
  } else {
    // 预测模式：基于ETA
    if (ataDestPort) {
      return '按实际ATA计算'  // 如果有ATA，优先用ATA
    } else if (dischargeDate) {
      return '按实际卸船日计算'  // 如果有实际卸船日，用实际卸船日
    } else if (revisedEtaDestPort) {
      return '按修正ETA计算'
    } else if (etaDestPort) {
      return '按ETA计算'
    }
    return '按ETA计算'
  }
}

/**
 * 获取最晚还箱日的计算来源文字
 * @param pickupDateActual 实际提柜日期
 */
const getCalculationSourceTextForReturn = (
  pickupDateActual?: string | null
): string | null => {
  if (!pickupDateActual) return null
  return '按实际提柜日计算'
}
```

### 3. 更新时间线事件构建逻辑

**文件**: `frontend/src/views/shipments/components/KeyDatesTimeline.vue`

```typescript
// 最晚提柜日 - 添加计算来源标注
const lastPickupDate = d.lastPickupDateComputed ?? d.lastPickupDate
const isLastPickupComputed = !!d.lastPickupDateComputed
const isLastPickupFromDb = !!d.lastPickupDate && !d.lastPickupDateComputed
add('最晚提柜', '最晚提柜日', lastPickupDate, '⏰', 'danger', {
  isComputed: isLastPickupComputed,
  isFromDb: isLastPickupFromDb,
  calculationMode: isLastPickupComputed ? d.lastPickupDateMode : null,
  calculationSource: isLastPickupComputed ? getCalculationSourceText(d.lastPickupDateMode, d.ataDestPort, d.etaDestPort, d.revisedEtaDestPort, d.dischargeDate) : null
})

// 最晚还箱日 - 添加计算来源标注
const lastReturnDate = d.lastReturnDateComputed ?? d.lastReturnDate
const isLastReturnComputed = !!d.lastReturnDateComputed
const isLastReturnFromDb = !!d.lastReturnDate && !d.lastReturnDateComputed
add('最晚还箱', '最晚还箱日', lastReturnDate, '📦', 'danger', {
  isComputed: isLastReturnComputed,
  isFromDb: isLastReturnFromDb,
  calculationMode: isLastReturnComputed ? d.lastReturnDateMode : null,
  calculationSource: isLastReturnComputed ? getCalculationSourceTextForReturn(d.pickupDateActual) : null
})
```

### 4. 更新模板显示

**文件**: `frontend/src/views/shipments/components/KeyDatesTimeline.vue`

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

### 5. 调整标签样式

**文件**: `frontend/src/views/shipments/components/KeyDatesTimeline.vue`

```scss
.item-tag {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: $radius-small;
  font-weight: 500;
  white-space: nowrap;  // 添加：防止标签文字换行

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

## 🎨 展示效果

### 实际模式示例

**有ATA**：
```
出运 🚢  2026/01/03  已历时67天
ETA  📅   2026/02/11  已历时28天
最晚提柜 ⏰ 2026/02/17  已历时22天 [按实际ATA计算]
当前 📆  2026/03/11
```

**无ATA，有卸船日**：
```
出运 🚢  2026/01/03  已历时67天
ETA  📅   2026/02/11  已历时28天
卸船 🚢  2026/02/12  已历时27天
最晚提柜 ⏰ 2026/02/18  已历时21天 [按实际卸船日计算]
当前 📆  2026/03/11
```

### 预测模式示例

**有修正ETA**：
```
出运 🚢  2026/01/03  已历时67天
ETA  📅   2026/02/11  已历时28天
最晚提柜 ⏰ 2026/02/17  已历时22天 [按修正ETA计算]
当前 📆  2026/03/11
```

**只有原始ETA**：
```
出运 🚢  2026/01/03  已历时67天
ETA  📅   2026/02/11  已历时28天
最晚提柜 ⏰ 2026/02/17  已历时22天 [按ETA计算]
当前 📆  2026/03/11
```

### 录入数据示例

```
出运 🚢  2026/01/03  已历时67天
ATA  📍  2026/02/10  已历时29天
最晚提柜 ⏰ 2026/02/20  已历时19天 [录入]
当前 📆  2026/03/11
```

## 📊 标签文字规则

### 最晚提柜日标签

| 优先级 | 条件 | 标签文字 |
|--------|------|----------|
| 1 | actual模式 + 有ATA | 按实际ATA计算 |
| 2 | actual模式 + 有卸船日 | 按实际卸船日计算 |
| 3 | forecast模式 + 有ATA | 按实际ATA计算 |
| 4 | forecast模式 + 有卸船日 | 按实际卸船日计算 |
| 5 | forecast模式 + 有修正ETA | 按修正ETA计算 |
| 6 | forecast模式 + 有原始ETA | 按ETA计算 |
| 7 | 录入数据 | 录入 |

### 最晚还箱日标签

| 优先级 | 条件 | 标签文字 |
|--------|------|----------|
| 1 | 计算（有实际提柜日） | 按实际提柜日计算 |
| 2 | 录入数据 | 录入 |

## ✅ 修改验证

- [x] TypeScript接口更新完整
- [x] 计算来源判断逻辑正确
- [x] 模板显示逻辑正确
- [x] 样式调整合适
- [x] 无linter错误
- [x] 向后兼容（旧数据显示"计算"或"录入"）

## 📝 注意事项

1. **优先级规则**：
   - 实际日期（ATA/卸船日）优先于ETA
   - 修正ETA优先于原始ETA
   - 计算值优先于录入值

2. **标签长度**：
   - 最长标签为"按实际卸船日计算"（7个中文字符）
   - 样式已添加`white-space: nowrap`防止换行
   - 卡片宽度自适应，可以容纳长标签

3. **向后兼容**：
   - 如果没有`calculationSource`，显示"计算"
   - 如果是录入数据，显示"录入"
   - 确保旧数据正常显示

## 🔗 相关文档

- [滞港费计算模式说明](./08-DEMURRAGE_CALCULATION_MODES.md)
- [滞港费计算模式问题修复总结](./10-MODE_FIX_SUMMARY.md)
- [前端模式适配说明](./09-FRONTEND_MODE_ADAPTATION.md)
