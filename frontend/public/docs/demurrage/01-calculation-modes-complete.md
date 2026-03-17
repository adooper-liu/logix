# 滞港费计算模式完整指南

> **最后更新**: 2026-03-16  
> **适用范围**: 滞港费计算、预警、统计汇总  
> **核心原则**: 实际模式用于结算，预测模式用于预警

---

## 一、概述

滞港费计算支持两种模式，系统自动判断使用：

| 模式                     | 触发条件                         | 用途                     | 写回规则                                                                    |
| ------------------------ | -------------------------------- | ------------------------ | --------------------------------------------------------------------------- |
| **实际模式（actual）**   | 有 ATA（实际到港日）或实际卸船日 | 计算实际发生的滞港费金额 | ✅ 写入 `last_free_date`<br>✅ 写入 `ext_demurrage_records`                 |
| **预测模式（forecast）** | 无 ATA、无实际卸船日，有 ETA     | 提前规划和预算滞港费     | ✅ 仅当 DB 为空时写入 `last_free_date`<br>❌ 不写入 `ext_demurrage_records` |

**自动判断逻辑**:

```typescript
const hasAtaOrDischarge = !!(
  params.calculationDates.ataDestPort ?? params.calculationDates.dischargeDate
)
const calculationMode = hasAtaOrDischarge ? 'actual' : 'forecast'
```

---

## 二、实际模式（actual）

### 2.1 触发条件

- ✅ 货柜有实际到港日（`ata_dest_port`）
- ✅ 或有实际卸船日（`dest_port_unload_date` 或 `discharged_time`）

### 2.2 起算日规则

**只用实际发生的日期，不使用 ETA**

#### 标准为"按到港"

```
起算日 = ATA（实际到港日） > 实际卸船日
```

#### 标准为"按卸船"

```
起算日 = 实际卸船日（dest_port_unload_date 或 discharged_time）
```

**注意**: 实际模式下完全不使用 ETA！

### 2.3 计算公式

```
最晚提柜日 = 起算日（ATA 或实际卸船日） + 免费天数 - 1
```

**示例**:

- ATA = 2024-03-15
- 免费天数 = 7 天
- 最晚提柜日 = 2024-03-15 + 7 - 1 = 2024-03-21

### 2.4 写回规则

- ✅ 写入 `process_port_operations.last_free_date`
- ✅ 写入 `ext_demurrage_records` 表
- ✅ `calculation_mode = 'actual'`

### 2.5 应用场景

- 💰 计算实际要支付的滞港费
- 📊 滞港费核算
- 🏦 向船公司/码头支付费用
- 📈 实际滞港费统计汇总

---

## 三、预测模式（forecast）

### 3.1 触发条件

- ❌ 无 ATA（实际到港日）
- ❌ 无实际卸船日
- ✅ 有 ETA（预计到港日）或修正 ETA

### 3.2 起算日规则

**优先使用修正 ETA，回退到原始 ETA**

#### 标准为"按到港"

```
起算日 = ATA（如果有） > 实际卸船日（如果有） > 修正 ETA > 原始 ETA
```

#### 标准为"按卸船" ⚠️

```
起算日 = 实际卸船日（如果有） > 修正 ETA > 原始 ETA
```

**注意**: 当前实现中，"按卸船"模式在无实际卸船日时直接返回 null，**未实现 ETA 回退**。这是已知的实现缺失。

### 3.3 修正 ETA 优先级

修正 ETA（`revised_eta_dest_port`）是船公司更新的预计到港日，优先级高于原始 ETA：

```typescript
const revisedEta = destPort?.revisedEtaDestPort ? toDateOnly(destPort.revisedEtaDestPort) : null
const etaFromPort = destPort?.etaDestPort ? toDateOnly(destPort.etaDestPort) : null
const etaFromSeaFreight = (sf as any)?.eta ? toDateOnly((sf as any).eta) : null
const eta = revisedEta ?? etaFromPort ?? etaFromSeaFreight
```

### 3.4 计算公式

```
最晚提柜日 = 起算日（修正 ETA 或原始 ETA） + 免费天数 - 1
```

### 3.5 写回规则

- ✅ **写入** `process_port_operations.last_free_date`（仅当 DB 为空时）
- ❌ **不写入** `ext_demurrage_records` 表
- ❌ **不写入** `last_return_date`（滞箱费需实际提柜日，forecast 不写回）
- ℹ️ ATA 到港后 actual 模式会覆盖 forecast 写入的 last_free_date

### 3.6 应用场景

- ⚠️ 提前预警（货柜即将超时）
- 📅 计划调度（安排提柜时间）
- 💵 成本预算（预估滞港费成本）
- 📊 前端"按最晚提柜"统计展示
- 📈 预测滞港费统计汇总

---

## 四、数据字段说明

### 4.1 process_port_operations 表

| 字段名                  | 类型      | 说明                                   |
| ----------------------- | --------- | -------------------------------------- |
| `ata_dest_port`         | TIMESTAMP | 实际到港日                             |
| `eta_dest_port`         | TIMESTAMP | 原始 ETA（初始预计到港日）             |
| `revised_eta_dest_port` | TIMESTAMP | **修正 ETA**（船公司更新的预计到港日） |
| `dest_port_unload_date` | TIMESTAMP | 实际卸船/火车日期                      |
| `discharged_time`       | TIMESTAMP | 实际卸船时间                           |
| `last_free_date`        | DATE      | 最晚提柜日（仅 actual 模式写入）       |

**优先级**（用于判断计算模式）:

```
ATA / 实际卸船日 > 修正 ETA > 原始 ETA
```

### 4.2 ext_demurrage_records 表

| 字段名                | 类型        | 说明                                                 |
| --------------------- | ----------- | ---------------------------------------------------- |
| `calculation_mode`    | VARCHAR(10) | 计算模式：`'actual'` 或 `'forecast'` ⚠️ 待实现       |
| `start_date_mode`     | VARCHAR(10) | 起算日模式：`'actual'` 或 `'forecast'` ⚠️ 待实现     |
| `last_free_date_mode` | VARCHAR(10) | 最晚免费日模式：`'actual'` 或 `'forecast'` ⚠️ 待实现 |
| `end_date_mode`       | VARCHAR(10) | 截止日模式：`'actual'` 或 `'forecast'` ⚠️ 待实现     |
| `charge_start_date`   | DATE        | 计费开始日期                                         |
| `charge_end_date`     | DATE        | 计费结束日期                                         |
| `last_free_date`      | DATE        | 最晚免费日                                           |

**注意**: 虽然数据库表已添加这些列，但实体和保存逻辑尚未实现，当前始终为 NULL。

---

## 五、计算结果标注

### 5.1 前端显示

在滞港费计算结果面板中，应清晰标注计算模式：

```vue
<template>
  <div class="demurrage-result">
    <span class="mode-badge" :class="calculationMode">
      {{ calculationMode === 'actual' ? '实际模式' : '预测模式' }}
    </span>

    <div class="result-item">
      <span class="label">起算日:</span>
      <span class="value">{{ startDate }}</span>
      <span class="source">{{ startDateFormat }}</span>
    </div>

    <div class="result-item">
      <span class="label">最晚提柜日:</span>
      <span class="value">{{ lastFreeDate }}</span>
      <span class="mode-tag">{{ lastFreeDateMode }}</span>
    </div>
  </div>
</template>
```

### 5.2 统计汇总分离

在实际模式和预测模式的统计汇总中，应分别计算：

```typescript
// 实际模式汇总
const actualSummary = records
  .filter(r => r.calculation_mode === 'actual')
  .reduce((sum, r) => sum + r.total_amount, 0)

// 预测模式汇总
const forecastSummary = records
  .filter(r => r.calculation_mode === 'forecast')
  .reduce((sum, r) => sum + r.total_amount, 0)
```

---

## 六、常见问题 FAQ

### Q1: 为什么同一个货柜会有两次计算？

**A**: 第一次是 forecast 模式（只有 ETA），用于预警；第二次是 actual 模式（ATA 到港后），用于实际结算。actual 会覆盖 forecast 的结果。

### Q2: 修正 ETA 从哪里来？

**A**: 修正 ETA 来自船公司更新，通过飞驼API 同步到 `revised_eta_dest_port` 字段。

### Q3: 按最晚提柜统计时，为什么有些货柜没有数据？

**A**: "按最晚提柜"统计要求 `ata_dest_port IS NOT NULL`（即必须已到港）。未到港的货柜只有 forecast 结果，不计入该统计。

### Q4: forecast 模式为什么不写入 ext_demurrage_records？

**A**: forecast 是预测值，不是实际发生的费用，因此不写入正式记录表，避免与实际费用混淆。

### Q5: 按卸船标准 + forecast 模式为什么不工作？

**A**: ⚠️ **已知缺陷**: 当前实现缺少 ETA 回退逻辑。当标准为"按卸船"且无实际卸船日时，应回退到 修正 ETA > 原始 ETA，但代码未实现。

---

## 七、实现状态与待办

### 7.1 已实现 ✅

- [x] 实际模式完整计算逻辑
- [x] 预测模式（按到港）完整计算逻辑
- [x] 修正 ETA 优先级处理
- [x] 自动模式判断
- [x] 实际模式写回 last_free_date

### 7.2 待实现 ⚠️

- [ ] 按卸船 + forecast 模式的 ETA 回退逻辑
- [ ] ext_demurrage_records 表的 calculation_mode 等字段写入
- [ ] 统计汇总按 calculation_mode 过滤
- [ ] dischargeDate 来源精确标注（dest_port_unload_date vs discharged_time）

---

## 八、相关文档

- [滞港费标准 Excel导入指南](./04-DEMURRAGE_STANDARDS_EXCEL_IMPORT.md)
- [滞港费数据口径统一](./05-DEMURRAGE_DATA_CALIBER_UNIFICATION.md)
- [滞港费聚合与预警](./06-DEMURRAGE_AGGREGATION_AND_ALERT_VISUALIZATION.md)

---

**维护者**: Backend Team  
**审查频率**: 月度  
**最后更新**: 2026-03-16
