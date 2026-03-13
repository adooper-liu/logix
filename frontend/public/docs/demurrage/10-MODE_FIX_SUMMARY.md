# 滞港费计算模式问题修复总结

## 📋 修复日期
2025-03-11

## 🎯 修复的问题

### 问题1：按卸船 + forecast模式缺少ETA回退

**问题描述**：
- 当计算方式为"按卸船"且为forecast模式时，代码只使用`dischargeDate`
- 如果没有实际卸船日，直接返回null，没有回退到修正ETA或原始ETA
- 导致仅有ETA的forecast货柜无法计算

**修复位置**：`backend/src/services/demurrage.service.ts`

**修复内容**：
```typescript
if (useDischargeOnly) {
  // 按卸船
  if (calculationMode === 'actual') {
    // actual模式：只用实际卸船日
    demurrageStartDate = params.calculationDates.dischargeDate ?? null;
    demurrageStartDateSource = demurrageStartDate
      ? (params.calculationDates.dischargeDateSource ?? 'discharged_time')
      : null;
  } else {
    // forecast模式：实际卸船日 > 修正ETA > 原始ETA
    demurrageStartDate =
      params.calculationDates.dischargeDate ??
      params.calculationDates.revisedEtaDestPort ??
      params.calculationDates.etaDestPort ??
      null;
    if (params.calculationDates.dischargeDate) {
      demurrageStartDateSource = params.calculationDates.dischargeDateSource ?? 'discharged_time';
    } else if (params.calculationDates.revisedEtaDestPort) {
      demurrageStartDateSource = 'revised_eta_dest_port';
    } else if (params.calculationDates.etaDestPort) {
      demurrageStartDateSource = 'eta_dest_port';
    } else {
      demurrageStartDateSource = null;
    }
  }
}
```

**符合文档要求**：
- ✅ actual模式：实际卸船日（如有）
- ✅ forecast模式：实际卸船日（如有）> 修正ETA > 原始ETA

---

### 问题2：ext_demurrage_records未写入模式字段

**问题描述**：
- 数据库迁移脚本已添加了`calculation_mode`、`start_date_mode`、`last_free_date_mode`、`end_date_mode`字段
- 但`ExtDemurrageRecord`实体没有定义这些字段
- `saveCalculationToRecords`方法没有写入这些字段
- 导致写入后这些字段仍为NULL

**修复位置1**：`backend/src/entities/ExtDemurrageRecord.ts`

**修复内容**：
```typescript
@Column({ type: 'varchar', length: 10, nullable: true, name: 'calculation_mode' })
calculationMode: string;

@Column({ type: 'varchar', length: 10, nullable: true, name: 'start_date_mode' })
startDateMode: string;

@Column({ type: 'varchar', length: 10, nullable: true, name: 'last_free_date_mode' })
lastFreeDateMode: string;

@Column({ type: 'varchar', length: 10, nullable: true, name: 'end_date_mode' })
endDateMode: string;
```

**修复位置2**：`backend/src/services/demurrage.service.ts`

**修复内容**：
```typescript
const rec = this.recordRepo.create({
  containerNumber,
  destinationPort: destinationPort ?? undefined,
  logisticsStatus: logisticsStatus ?? undefined,
  chargeType: item.chargeTypeCode,
  chargeName: item.chargeName,
  freeDays: item.freeDays,
  freeDaysBasis: item.freeDaysBasis ?? undefined,
  calculationBasis: item.calculationBasis ?? undefined,
  calculationMode: item.calculationMode,           // ✅ 新增
  startDateMode: item.startDateMode,               // ✅ 新增
  endDateMode: item.endDateMode,                   // ✅ 新增
  lastFreeDateMode: item.lastFreeDateMode,       // ✅ 新增
  chargeStartDate: item.startDate,
  chargeEndDate: item.endDate,
  chargeDays: item.chargeDays,
  chargeAmount: item.amount,
  currency: item.currency,
  chargeStatus: isFinal ? 'FINAL' : 'TEMP',
  isFinal,
  computedAt: now
});
```

**符合文档要求**：
- ✅ 写入`calculation_mode`字段
- ✅ 写入`start_date_mode`字段
- ✅ 写入`last_free_date_mode`字段
- ✅ 写入`end_date_mode`字段

---

### 问题3：起算日来源source标注不准确

**问题描述**：
- `dischargeDate`字段可以来自`destPortUnloadDate`或`dischargedTime`
- 代码中统一标记为`dest_port_unload_date`或`discharged_time`，判断逻辑错误
- 例如：当实际来自`dischargedTime`时，可能被错误标记为`dest_port_unload_date`

**修复位置**：`backend/src/services/demurrage.service.ts`

**修复内容**：

1. **在`calculationDates`中添加`dischargeDateSource`字段**：
```typescript
calculationDates: {
  ataDestPort: Date | null;
  etaDestPort: Date | null;
  revisedEtaDestPort: Date | null;
  dischargeDate: Date | null;
  dischargeDateSource?: 'dest_port_unload_date' | 'discharged_time' | null;  // ✅ 新增
  lastPickupDate: Date | null;
  lastReturnDate?: Date | null;
  pickupDateActual: Date | null;
  returnTime: Date | null;
  today: Date;
};
```

2. **在`getContainerMatchParams`中记录来源**：
```typescript
const discharge = destPort?.destPortUnloadDate
  ? toDateOnly(destPort.destPortUnloadDate)
  : destPort?.dischargedTime
    ? toDateOnly(destPort.dischargedTime)
    : null;
const dischargeDateSource = destPort?.destPortUnloadDate
  ? 'dest_port_unload_date'
  : destPort?.dischargedTime
    ? 'discharged_time'
    : null;  // ✅ 记录真实来源

const startDateSource = ata
  ? 'ata_dest_port'
  : etaFromPort
    ? 'eta_dest_port'
    : etaFromSeaFreight
      ? 'process_sea_freight.eta'
      : discharge
        ? dischargeDateSource  // ✅ 使用真实来源
        : null;
```

3. **构建`calculationDates`时包含来源**：
```typescript
const calculationDates = {
  ataDestPort: ata,
  etaDestPort: eta,
  revisedEtaDestPort: revisedEta,
  dischargeDate: discharge,
  dischargeDateSource,  // ✅ 包含来源
  lastPickupDate: pickupDate,
  lastReturnDate: lastReturnDateFromDb,
  pickupDateActual: pickupDateActual,
  returnTime: returnTime,
  today
};
```

4. **更新所有使用dischargeDate的地方**：
```typescript
// 按卸船 - actual模式
demurrageStartDateSource = demurrageStartDate
  ? (params.calculationDates.dischargeDateSource ?? 'discharged_time')
  : null;

// 按卸船 - forecast模式
if (params.calculationDates.dischargeDate) {
  demurrageStartDateSource = params.calculationDates.dischargeDateSource ?? 'discharged_time';
}

// 按到港 - actual模式
demurrageStartDateSource = params.calculationDates.ataDestPort
  ? 'ata_dest_port'
  : params.calculationDates.dischargeDate
    ? (params.calculationDates.dischargeDateSource ?? 'discharged_time')  // ✅ 使用真实来源
    : null;

// 按到港 - forecast模式
} else if (params.calculationDates.dischargeDate) {
  demurrageStartSource = params.calculationDates.dischargeDateSource ?? 'discharged_time';  // ✅ 使用真实来源
}
```

**符合文档要求**：
- ✅ 当起算日来自`dest_port_unload_date`时，source标记为`dest_port_unload_date`
- ✅ 当起算日来自`discharged_time`时，source标记为`discharged_time`
- ✅ 起算日来源与实际一致，不会混淆

---

## 📊 修复验证清单

### 代码质量检查
- ✅ 无linter错误
- ✅ TypeScript类型检查通过
- ✅ 代码逻辑正确

### 功能验证
- ✅ 按卸船 + forecast模式正确回退ETA
- ✅ ext_demurrage_records正确写入模式字段
- ✅ 起算日来源标注准确

### 文档一致性
- ✅ 符合《滞港费计算模式说明》文档要求
- ✅ 符合《数据库迁移脚本》设计

---

## 🔍 影响范围

### 修改的文件
1. `backend/src/services/demurrage.service.ts`
2. `backend/src/entities/ExtDemurrageRecord.ts`

### 影响的功能
1. 滞港费计算逻辑（所有计算场景）
2. 滞港费记录写入
3. 起算日来源标注

### 向后兼容性
- ✅ 新增字段为可选类型，向后兼容
- ✅ 不影响现有数据的读取
- ✅ 新写入的数据包含完整模式信息

---

## 📝 额外说明

### dischargeDateSource字段的必要性

`dischargeDate`可能来自两个不同的数据库字段：
- `dest_port_unload_date`：目的港卸船日期
- `discharged_time`：卸船时间

这两个字段语义不同，需要区分：
- `dest_port_unload_date`：通常为日期类型，记录卸船日
- `discharged_time`：通常为时间戳类型，记录精确的卸船时间

虽然最终都转换为`Date`类型用于计算，但来源信息需要保留以便：
1. 追溯起算日的原始来源
2. 向用户展示准确的信息
3. 日志和审计需要

### 为什么不使用统一的"卸船日"标签

虽然两个字段都是卸船相关，但：
- 字段名称不同，需要区分
- 数据类型可能不同
- 用户可能需要知道具体来源
- 系统日志和调试需要精确信息

---

## ✅ 总结

本次修复解决了三个关键问题：

1. **按卸船 + forecast模式缺少ETA回退**：修复了forecast模式下无法使用ETA计算的问题
2. **ext_demurrage_records未写入模式字段**：补充了实体定义和写入逻辑
3. **起算日来源source标注不准确**：添加了`dischargeDateSource`字段记录真实来源

所有修复都经过linter检查，无错误，完全符合文档要求。
