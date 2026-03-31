# 滞港费计算模式说明

## 概述

滞港费计算支持两种模式：
- **实际模式（actual）**：用于计算实际发生的滞港费金额
- **预测模式（forecast）**：用于提前规划和预算滞港费

## 计算模式自动判断

**第一步（必须）**：用与全链路一致的 **`calculateLogisticsStatus`**（`backend/src/utils/logisticsStatusMachine.ts`）判断是否已**到达目的港**或已进入**提柜/卸柜/还箱**。

**第二步**：再确定计算模式：

```typescript
// 与 DemurrageService.calculateForContainer 一致
const arrivedAtDestinationPort = isArrivedAtDestinationPortForDemurrage(logisticsSnapshot);
// true：目的港 AT_PORT，或已 PICKED_UP / UNLOADED / RETURNED_EMPTY
const calculationMode = arrivedAtDestinationPort ? 'actual' : 'forecast';
```

**判断规则（状态机优先，不单看 ATA 字段）**：
- ✅ **actual**：状态机为「目的港已到港」或之后（已提柜、已卸柜、已还箱等）
- ❌ **forecast**：未到目的港（例如在途、仅中转港到港、未出运等）→ 用 **计划/预测** 逻辑（ETA、计划提柜日等）

> 历史说明：曾仅用「有无 ATA/卸船」切换模式；现改为**状态机先行**，避免与货柜 `logistics_status` 不一致。

---

## 实际模式（actual）

### 触发条件
- 货柜有实际到港日（`ata_dest_port`）
- 或有实际卸船日（`dest_port_unload_date` 或 `discharged_time`）

### 起算日规则
**只用实际发生的日期，不使用ETA**

#### 标准为"按到港"
```
起算日 = ATA（实际到港日） > 实际卸船日
```

#### 标准为"按卸船"
```
起算日 = 实际卸船日（dest_port_unload_date 或 discharged_time）
```

**注意**：实际模式下完全不使用ETA！

### 计算公式
```
最晚提柜日 = 起算日（ATA或实际卸船日） + 免费天数 - 1
```

### 写回规则
- ✅ 写入 `process_port_operations.last_free_date`
- ✅ 写入 `ext_demurrage_records` 表
- ✅ `calculation_mode = 'actual'`

### 应用场景
- 计算实际要支付的滞港费
- 滞港费核算
- 向船公司/码头支付费用
- 实际滞港费统计汇总

---

## 预测模式（forecast）

### 触发条件
- 无ATA（实际到港日）
- 无实际卸船日
- 有ETA（预计到港日）或修正ETA

### 起算日规则
**优先使用修正ETA，回退到原始ETA**

#### 标准为"按到港"
```
起算日 = ATA（如果有） > 实际卸船日（如果有） > 修正ETA > 原始ETA
```

#### 标准为"按卸船"
```
起算日 = 实际卸船日（如果有） > 修正ETA > 原始ETA
```

### 修正ETA优先级
修正ETA（`revised_eta_dest_port`）是船公司更新的预计到港日，优先级高于原始ETA：

```typescript
const revisedEta = destPort?.revisedEtaDestPort ? toDateOnly(destPort.revisedEtaDestPort) : null;
const etaFromPort = destPort?.etaDestPort ? toDateOnly(destPort.etaDestPort) : null;
const etaFromSeaFreight = (sf as any)?.eta ? toDateOnly((sf as any).eta) : null;
const eta = revisedEta ?? etaFromPort ?? etaFromSeaFreight;
```

### 计算公式
```
最晚提柜日 = 起算日（修正ETA或原始ETA） + 免费天数 - 1
```

### 写回规则
- ✅ **写入** `process_port_operations.last_free_date`（仅当 DB 为空时，支持智能排柜/预警）
- ❌ **不写入** `ext_demurrage_records` 表
- ❌ **不写入** `last_return_date`（滞箱费需实际提柜日，forecast 不写回）
- ℹ️ ATA 到港后 actual 模式会覆盖 forecast 写入的 last_free_date

### 应用场景
- 提前预警（货柜即将超时）
- 计划调度（安排提柜时间）
- 成本预算（预估滞港费成本）
- 前端"按最晚提柜"统计展示
- 预测滞港费统计汇总

---

## 数据字段说明

### process_port_operations 表

| 字段名 | 类型 | 说明 |
|-------|------|------|
| `ata_dest_port` | TIMESTAMP | 实际到港日 |
| `eta_dest_port` | TIMESTAMP | 原始ETA（初始预计到港日） |
| `revised_eta_dest_port` | TIMESTAMP | **修正ETA**（船公司更新的预计到港日） |
| `dest_port_unload_date` | TIMESTAMP | 实际卸船/火车日期 |
| `discharged_time` | TIMESTAMP | 实际卸船时间 |
| `last_free_date` | DATE | 最晚提柜日（仅actual模式写入） |

**优先级**（用于判断计算模式）：
```
ATA / 实际卸船日 > 修正ETA > 原始ETA
```

### ext_demurrage_records 表

| 字段名 | 类型 | 说明 |
|-------|------|------|
| `calculation_mode` | VARCHAR(10) | 计算模式：`'actual'` 或 `'forecast'` |
| `start_date_mode` | VARCHAR(10) | 起算日模式：`'actual'` 或 `'forecast'` |
| `last_free_date_mode` | VARCHAR(10) | 最晚免费日模式：`'actual'` 或 `'forecast'` |
| `end_date_mode` | VARCHAR(10) | 截止日模式：`'actual'` 或 `'forecast'` |
| `charge_start_date` | DATE | 计费开始日期 |
| `charge_end_date` | DATE | 计费结束日期 |
| `last_free_date` | DATE | 最晚免费日 |

---

## 计算结果标注

### 单柜计算结果（`DemurrageCalculationResult`）

```typescript
{
  containerNumber: string;
  calculationMode: 'actual' | 'forecast';  // 整体计算模式
  startDate: Date;
  endDate: Date;
  calculationDates: {
    ataDestPort: string | null;
    etaDestPort: string | null;
    revisedEtaDestPort: string | null;  // 修正ETA
    dischargeDate: string | null;
    lastPickupDate: string | null;
    lastPickupDateComputed: string | null;
    lastPickupDateMode: 'actual' | 'forecast';  // 最晚提柜日模式
    lastReturnDate: string | null;
    lastReturnDateComputed: string | null;
    lastReturnDateMode: 'actual' | 'forecast';  // 最晚还箱日模式
    // ...
  };
  items: DemurrageItemResult[];
  // ...
}
```

### 单项计算结果（`DemurrageItemResult`）

```typescript
{
  standardId: number;
  chargeName: string;
  calculationMode: 'actual' | 'forecast';  // 该项的计算模式
  startDate: Date;
  endDate: Date;
  startDateMode: 'actual' | 'forecast';  // 起算日模式
  endDateMode: 'actual' | 'forecast';  // 截止日模式
  lastFreeDate: Date;
  lastFreeDateMode: 'actual' | 'forecast';  // 最晚免费日模式
  chargeDays: number;
  amount: number;
  // ...
}
```

---

## 模式转换规则

### 货柜状态变化导致的模式转换

```
只有ETA（forecast模式）
  ↓ ATA到港
有ATA（actual模式）
```

**转换时机**：
1. 飞驼API同步到ATA
2. Excel导入包含ATA
3. 手动更新ATA

**转换影响**：
- 计算模式从 `forecast` 切换为 `actual`
- 起算日从ETA切换为ATA
- 重新计算最晚提柜日
- 写回数据库

---

## 统计与展示

### 前端区分展示

```vue
<template>
  <div class="demurrage-card">
    <div class="mode-badge" :class="result.calculationMode">
      {{ result.calculationMode === 'actual' ? '实际' : '预测' }}
    </div>
    <div class="last-free-date">
      <span>最晚提柜日：</span>
      <span>{{ result.calculationDates.lastPickupDate }}</span>
      <span v-if="result.calculationDates.lastPickupDateMode" class="mode-tag">
        ({{ result.calculationDates.lastPickupDateMode === 'actual' ? '实际' : '预测' }})
      </span>
    </div>
    <div class="calculation-details">
      <div>起算日：{{ result.startDate }} ({{ modeText(result.startDateMode) }})</div>
      <div>截止日：{{ result.endDate }} ({{ modeText(result.endDateMode) }})</div>
    </div>
  </div>
</template>
```

### 统计汇总分离

```typescript
// 实际滞港费汇总
const actualSummary = await demurrageService.getSummary(startDate, endDate);
// calculationMode = 'actual' 的记录

// 预测滞港费汇总（前端计算）
const forecastSummary = results.filter(r => r.calculationMode === 'forecast')
  .reduce((sum, r) => sum + r.totalAmount, 0);
```

---

## API接口

### 单柜计算

```http
GET /api/demurrage/calculate/:containerNumber
```

**响应示例**：
```json
{
  "result": {
    "containerNumber": "XXXX1234567",
    "calculationMode": "actual",
    "calculationDates": {
      "ataDestPort": "2025-03-10",
      "etaDestPort": "2025-03-08",
      "revisedEtaDestPort": "2025-03-09",
      "dischargeDate": "2025-03-11",
      "lastPickupDate": "2025-03-15",
      "lastPickupDateMode": "actual",
      // ...
    },
    "items": [
      {
        "calculationMode": "actual",
        "startDateMode": "actual",
        "endDateMode": "actual",
        "lastFreeDateMode": "actual",
        // ...
      }
    ]
  }
}
```

---

## 关键规则总结

### 1. 计算模式选择
| 条件 | 模式 |
|-----|------|
| 有ATA或实际卸船日 | `actual` |
| 只有ETA，无ATA/实际卸船日 | `forecast` |

### 2. 起算日优先级
**actual模式**：
- 按到港：ATA > 实际卸船日
- 按卸船：实际卸船日

**forecast模式**：
- 按到港：ATA > 实际卸船日 > 修正ETA > 原始ETA
- 按卸船：实际卸船日 > 修正ETA > 原始ETA

### 3. 写回规则
| 模式 | 写回last_free_date | 写入ext_demurrage_records |
|-----|-------------------|--------------------------|
| `actual` | ✅ 是 | ✅ 是 |
| `forecast` | ❌ 否 | ❌ 否 |

### 4. 滞箱费特殊规则
- 滞箱费起算日始终使用**实际提柜日**（`pickup_date_actual`）
- 因此滞箱费的计算模式始终为 `actual`
- 即使整体是 `forecast` 模式，滞箱费部分仍是 `actual`

---

## 常见问题

### Q1: 为什么需要区分两种计算模式？
**A**:
- 实际滞港费只能基于实际发生的时间（ATA/实际卸船日）计算，用ETA计算会导致费用不准确
- 但预测和预警功能需要基于ETA，提前规划提柜时间和预算成本
- 区分两种模式可以避免业务混淆，确保数据准确性

### Q2: 修正ETA和原始ETA的区别？
**A**:
- **原始ETA**（`eta_dest_port`）：初始预计到港日
- **修正ETA**（`revised_eta_dest_port`）：船公司更新的预计到港日，更准确
- 修正ETA优先级高于原始ETA

### Q3: forecast模式的计算结果能用于支付吗？
**A**:
- ❌ 不能。forecast模式仅用于预测、预警、计划调度和成本预算
- ✅ 实际支付必须使用actual模式的计算结果

### Q4: 从forecast模式切换到actual模式后，之前的预测数据会怎样？
**A**:
- 预测数据不写入数据库，所以不需要清理
- actual模式计算时会重新计算并写入数据库
- forecast模式的预测结果仅在前端展示，不影响实际数据

### Q5: 前端"按最晚提柜"统计是否包含forecast模式的货柜？
**A**:
- **否**。按最晚提柜统计要求必须有ATA（`ata_dest_port IS NOT NULL`）
- 只有ETA的货柜不会出现在"按最晚提柜"统计中
- 这是统计口径设计，确保统计的都是已实际到港的货柜

---

## 数据迁移

执行迁移脚本：
```bash
psql -U logix_user -d logix_db -f backend/migrations/add_demurrage_calculation_mode.sql
```

迁移脚本会：
1. 增加 `process_port_operations.revised_eta_dest_port` 字段
2. 增加 `ext_demurrage_records` 表的计算模式标注字段
3. 为现有记录设置 `calculation_mode = 'actual'`
4. 创建相关索引

---

## 更新日志

- **2025-03-11**: 初始版本
  - 增加修正ETA字段
  - 实现两种计算模式（actual/forecast）
  - 增加计算模式标注字段
  - 更新写回逻辑
