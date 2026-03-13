# 08-DEMURRAGE_CALCULATION_MODES.md 文档与代码一致性检查报告

**检查日期**：2025-03-11  
**文档**：`frontend/public/docs/demurrage/08-DEMURRAGE_CALCULATION_MODES.md`  
**主实现**：`backend/src/services/demurrage.service.ts`

---

## 一、完全一致项 ✅

| 文档规则 | 代码位置 | 结论 |
|---------|---------|------|
| 计算模式判断：有 ATA 或实际卸船日 → actual | 814-814 行 `hasAtaOrDischarge ? 'actual' : 'forecast'` | ✅ 一致 |
| 起算日（按到港 actual）：ATA > 实际卸船日 | 863-864 行 `ataDestPort ?? dischargeDate` | ✅ 一致 |
| 起算日（按到港 forecast）：ATA > 实际卸船日 > 修正ETA > 原始ETA | 871-875 行 | ✅ 一致 |
| 最晚提柜日公式：起算日 + 免费天数 - 1 | 894-897 行 `n = freeDays - 1`，`addDays/addWorkingDays` | ✅ 一致 |
| 写回规则：actual 写回 last_free_date，forecast 不写回 | 1082-1092 行 | ✅ 一致 |
| 滞箱费起算日 = 实际提柜日，始终 actual | 901-903、1042 行 | ✅ 一致 |
| 修正ETA 优先级：revisedEta > etaFromPort > etaFromSeaFreight | 426-427 行 getContainerMatchParams | ✅ 一致 |
| 数据字段：revised_eta_dest_port、dest_port_unload_date、discharged_time | PortOperation 实体、discharge 计算 429-433 行 | ✅ 一致 |
| Q5：按最晚提柜统计要求 ata_dest_port IS NOT NULL | LastPickupSubqueryTemplates.TARGET_SET_SUBQUERY 第 25 行 | ✅ 一致 |

---

## 二、差异与问题

### 1. 【实现缺失】按卸船 + forecast 模式：无 ETA 回退

**文档**（第 84-86 行）：
```
标准为"按卸船"
起算日 = 实际卸船日（如果有） > 修正ETA > 原始ETA
```

**代码**（853-858 行）：
```typescript
if (useDischargeOnly) {
  demurrageStartDate = params.calculationDates.dischargeDate ?? null;
  demurrageStartDateSource = demurrageStartDate ? ... : null;
}
```

**问题**：当标准为「按卸船」且 forecast 模式（无实际卸船日）时，代码只用 `dischargeDate`，无则直接为 null，**未按文档回退到 修正ETA > 原始ETA**。

**影响**：forecast + 按卸船 + 仅有 ETA 的货柜无法计算滞港费，与文档不符。

**建议**：在 `useDischargeOnly` 分支中，当 `dischargeDate` 为空且为 forecast 模式时，增加回退逻辑：
```typescript
demurrageStartDate = params.calculationDates.dischargeDate
  ?? params.calculationDates.revisedEtaDestPort
  ?? params.calculationDates.etaDestPort
  ?? null;
```

---

### 2. 【实现缺失】ext_demurrage_records 未写入计算模式字段

**文档**（第 56-58 行）：
```
写回规则 - actual 模式：
- ✅ calculation_mode = 'actual'
```

**文档**（第 136-141 行）ext_demurrage_records 表说明：
```
calculation_mode, start_date_mode, last_free_date_mode, end_date_mode
```

**代码**：
- `ExtDemurrageRecord` 实体（`backend/src/entities/ExtDemurrageRecord.ts`）**未定义**上述字段
- `saveCalculationToRecords`（1169-1187 行）**未设置** calculation_mode、start_date_mode 等

**问题**：迁移脚本 `add_demurrage_calculation_mode.sql` 已添加这些列，但实体与保存逻辑未使用，写入后这些列始终为 NULL。

**建议**：
1. 在 `ExtDemurrageRecord` 中增加 `calculation_mode`、`start_date_mode`、`last_free_date_mode`、`end_date_mode` 的 `@Column`
2. 在 `saveCalculationToRecords` 中，从 `DemurrageCalculationResult` 和 `DemurrageItemResult` 中取对应值并写入

---

### 3. 【小问题】起算日来源 source 可能不精确

**场景**：按到港 actual 模式，起算日来自 `dischargeDate`（即实际卸船日）时。

**代码**（976-980 行）：
```typescript
demurrageStartSource = params.calculationDates.ataDestPort
  ? 'ata_dest_port'
  : params.calculationDates.dischargeDate
    ? 'dest_port_unload_date'  // 固定为 dest_port_unload_date
    : null;
```

**问题**：`dischargeDate` 可能来自 `destPortUnloadDate` 或 `dischargedTime`（见 429-433 行），但 source 固定为 `dest_port_unload_date`。若实际来源是 `discharged_time`，则 source 不准确。

**建议**：在 `calculationDates` 中增加 `dischargeDateSource`，或在 getContainerMatchParams 中记录 discharge 的真实来源，供后续使用。

---

## 三、文档可优化点

| 项目 | 说明 |
|-----|------|
| API 路径 | 文档写 `GET /api/demurrage/calculate/:containerNumber`，实际路由需对照 `demurrage.routes.ts` 确认 |
| 统计汇总分离 | 文档 228-234 行示例中 `getSummary` 按 calculationMode 过滤，需确认 `getSummaryFromRecords` 是否按 calculation_mode 过滤；当前实现可能未区分 |

---

## 四、总结

| 类别 | 数量 |
|-----|------|
| 完全一致 | 9 项 |
| 实现缺失/错误 | 2 项（按卸船 forecast 回退、ext_demurrage_records 模式字段） |
| 小问题 | 1 项（discharge source 精度） |

**整体吻合度**：约 85%。核心计算逻辑（模式判断、按到港优先级、公式、写回条件、滞箱费规则、按最晚提柜统计口径）与文档一致。主要差异集中在「按卸船 + forecast」的 ETA 回退，以及 ext_demurrage_records 的模式字段未写入。
