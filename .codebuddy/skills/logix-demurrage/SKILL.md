---
name: logix-demurrage
description: LogiX 滞港费计算逻辑与开发规范。用于滞港费(demurrage)、滞箱费(detention)、合并费用的计算规则、代码审查、数据验证和文档编写。
---

# LogiX 滞港费计算 Skill

## 用途

本 skill 提供 LogiX 项目滞港费计算的核心业务逻辑、代码实现规范和数据验证规则，用于：
- 滞港费功能开发与调试
- 代码审查与一致性验证
- 数据问题排查
- 文档编写与更新

## 触发条件

当用户提到以下内容时，应使用此 skill：
- 滞港费计算逻辑
- demurrage、Detention、滞箱费
- 费用起算日、截止日
- actual/forecast 计算模式
- last_free_date、last_return_date

## 核心业务规则

### 计算模式判定

使用 `calculateLogisticsStatus` + `isArrivedAtDestinationPortForDemurrage` 判断：

| 状态 | 计算模式 |
|------|----------|
| PICKED_UP / UNLOADED / RETURNED_EMPTY | actual |
| AT_PORT + currentPortType === 'destination' | actual |
| 其他状态 | forecast |

### 滞港费 (Demurrage)

| 模式 | 起算日 | 截止日 |
|------|--------|--------|
| forecast | ATA > 卸船日 > 修正ETA > ETA | max(Today, 计划提柜日) |
| actual | ATA > 卸船日 | 实际提柜日（有则用） |

### 滞箱费 (Detention)

| 模式 | 起算日 | 截止日 |
|------|--------|--------|
| forecast | 计划提柜日 | max(Today, 计划还箱日) |
| actual | 实际提柜日 | 实际还箱日或Today |

### 合并模式 (Demurrage & Detention)

| 模式 | 起算日 | 截止日 |
|------|--------|--------|
| forecast | 修正ETA > ETA | max(Today, 计划还箱日) |
| actual | ATA > 卸船日 | 实际还箱日或Today |

### 费用类型识别

通过 `chargeTypeCode` / `chargeName` 关键词判断：
- **合并 D&D**：同时包含 Demurrage 与 Detention
- **纯滞箱 Detention**：包含 Detention/滞箱，非合并
- **堆存 Storage**：包含 Storage/堆存，非滞箱/非合并
- **滞港 Demurrage**：其余非上述类型

### 费用项跳过规则

| 费用类型 | 模式 | 跳过条件 |
|----------|------|----------|
| Detention/Storage | forecast | 无计划提柜日 |
| Detention/Storage | actual | 无实际提柜日 |
| 合并 D&D | forecast | 无修正ETA/ETA |
| 合并 D&D | actual | 无ATA/卸船日 |

## 代码位置

| 功能 | 文件 |
|------|------|
| 入口 | `backend/src/services/demurrage.service.ts` - `calculateForContainer` |
| 模式判定 | `isArrivedAtDestinationPortForDemurrage` |
| 标准匹配 | `matchStandards` |
| 日期取值 | `getContainerMatchParams` |
| 类型识别 | `isDetentionCharge` / `isCombinedDemurrageDetention` / `isStorageCharge` |
| 单项计算 | `calculateSingleDemurrage` |

## 数据来源

| 字段 | 表 | 字段名 |
|------|-----|--------|
| 目的港 ATA | process_port_operations | ata_dest_port |
| 修正 ETA | process_port_operations | revised_eta |
| 目的港 ETA | process_port_operations | eta_dest_port |
| 卸船日 | process_port_operations | discharge_date |
| 计划提柜日 | process_trucking_transport | planned_pickup_date |
| 实际提柜日 | process_trucking_transport | pickup_date |
| 计划还箱日 | process_empty_return | planned_return_date |
| 实际还箱日 | process_empty_return | return_time |
| 最晚提柜日 | process_port_operations | last_free_date |
| 最晚还箱日 | process_empty_return | last_return_date |

## 参考文档

详细业务规则请参考：
- `frontend/public/docs/demurrage/13-DEMURRAGE_CALCULATION_LOGIC_FINAL.md`

## 常见问题排查

### 1. 为什么 forecast 模式用计划提柜日作为截止日？

forecast 模式下货柜未实际到港，用计划提柜日作为预估截止日进行费用预测。公式：`max(Today, 计划提柜日)`

### 2. 合并模式与单独滞港/滞箱的区别？

- 单独计算：滞港费 = 到港→提柜，滞箱费 = 提柜→还箱
- 合并模式：从到港→还箱作为整体计费区间

### 3. 为什么 actual 模式金额会封顶？

当有实际提柜日后，截止日固定为实际提柜日，不再随 Today 变化，金额封顶。

### 4. is_chargeable 字段含义

- `N`：收费并参与计算
- `Y`：不收费跳过

## 代码审查检查点

审查滞港费代码时，验证：
1. [ ] 计算模式判定使用状态机而非仅用 ATA 字段
2. [ ] forecast 模式用 max(Today, 计划日期)
3. [ ] actual 模式用实际日期，无则 Today
4. [ ] 合并模式 forecast 起算日用 ETA/修正ETA
5. [ ] 滞箱费 forecast 起算日用计划提柜日
6. [ ] 缺失前置条件时正确跳过并记录 reason
7. [ ] 日期顺序校验触发警告
