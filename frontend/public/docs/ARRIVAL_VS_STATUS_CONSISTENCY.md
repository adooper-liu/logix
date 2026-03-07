# 按到港 vs 按状态 — 统计逻辑一致性对比

本文档对比 **按到港** 与 **按状态** 两个卡片中「已到中转港」「已到目的港」的统计口径，并记录已完成的**状态机对齐**修改。

---

## 状态：已按状态机对齐（2025-03）

**按到港** 已与 **按状态 / 状态机** 对齐：

- **已到中转港**：模板 `ARRIVED_AT_TRANSIT_SUBQUERY` 及所有 ETA 细分模板（已逾期、3 日内、7 日内、7 日后、无 ETA）均已：
  - 去掉「目的港有 ETA」限制（主分组不要求 ETA；ETA 细分项仍按目的港 ETA 日期划分）。
  - 增加 NOT EXISTS 还空箱、NOT EXISTS WMS 确认、NOT EXISTS 拖车提柜。
- **列表**：`ArrivalStatistics.getContainersByArrivedAtTransit` 改为使用与统计同源的 `ARRIVED_AT_TRANSIT_SUBQUERY` 模板（子查询取号再查实体），统计与列表同源。
- **已到目的港**：三个子查询模板（今日到港、今日前未提柜、今日前已提柜）均已增加 NOT EXISTS 还空箱、NOT EXISTS WMS 确认。

以下为对齐前的差异说明（保留作参考）。

---

## 一、已到中转港（已对齐）

### 按状态（StatusDistribution）

- **入口**：`getTransitArrivalCount` / `getContainersByArrivedAtTransit`
- **逻辑**（与状态机优先级 5 一致）：
  1. **NOT EXISTS** 还空箱、WMS 确认、拖车提柜、目的港 ATA
  2. **EXISTS** 中转港到港（`ata_dest_port` / `gate_in_time` / `transit_arrival_date` 任一非空）
- **不要求**目的港有 ETA。

### 按到港（ArrivalStatistics）— 已对齐

- **统计**：`getArrivedAtTransit` 使用 **ARRIVED_AT_TRANSIT_SUBQUERY**，已含 NOT 还箱/WMS/提柜、目的港无 ATA、不要求目的港 ETA、EXISTS 中转港到港。
- **列表**：`getContainersByArrivedAtTransit` 使用同一模板取 container_number 再查实体，与统计同源。

---

## 二、已到目的港（已对齐）

### 按状态（StatusDistribution）

- NOT EXISTS 还空箱、WMS、拖车提柜；EXISTS 目的港 ATA。

### 按到港（ArrivalStatistics）— 已对齐

- 三个子查询（今日到港、今日前未提柜、今日前已提柜）均已增加 NOT EXISTS 还空箱、NOT EXISTS WMS 确认；仍通过目的港 ATA + 无中转港 + logistics_status 区分子项。

---

## 三、约定（对齐后）

- **三主分组**：已到目的港、已到中转港、预计到港；已到中转港下按 ETA 细分（已逾期、3 日内、7 日内、7 日后、无 ETA）。
- **统计与查询共用 SQL**：按到港卡片统计与点击后的列表使用同一套模板/子查询，一次修改两处同步。
