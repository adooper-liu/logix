# 甘特图四泳道与 Shipments 统计卡片子集逻辑对比

本文档对比 **甘特图四个泳道**（按到港、按提柜计划、按最晚提柜、按最晚还箱）的**前端子集逻辑**与 **Shipments 页统计卡片**对应的**后端条件**，便于对齐或收敛差异。

---

## 〇、甘特图与 Shipments 是否共用 SQL（确认）

**结论：数据源已共用，分组划分在前端按后端口径复现。**

| 项目 | 说明 |
|------|------|
| **数据加载** | 甘特图与 Shipments 使用同一套后端接口：无筛选时 `GET /api/v1/containers`（出运日期范围），有筛选时 `GET /api/v1/containers/by-filter?filterCondition=xxx&startDate=&endDate=`。即 **同一套后端 SQL** 产出货柜列表。 |
| **分组划分** | 后端按条件只返回「某一类」货柜（如点击「已逾期到港」则只返回该子集）。甘特图需在**同一批货柜**上同时展示多个泳道/多组（今日到港、已逾期、3 日内…），若按组逐次请求后端会请求数过多，故采用 **前端一次拉取**（按出运日期或一个 filterCondition）再在内存中按与后端**一致的口径**做分组。 |
| **对齐方式** | 不重复执行后端 SQL，而是将后端对「目标集 + 各子项条件」的**定义**在前端 `useGanttFilters.ts` 中复现，使同一柜在后端某条件与在前端对应泳道子项中归属一致。 |

因此：**甘特图可与 Shipments 共用同一套 SQL（同一套接口与数据），分组逻辑以前端复现、以后端为准进行对齐。**

---

## 一、数据源与约定

| 项目 | 说明 |
|------|------|
| **卡片/泳道** | Shipments 页 5 组统计卡片中，与甘特图对应的 4 组：按到港、按提柜计划、按最晚提柜、按最晚还箱（不含「按状态」） |
| **后端** | `FilterConditions.ts` → `ContainerStatisticsService.getContainersByCondition` → 各 Statistics 服务（Arrival / Eta / PlannedPickup / LastPickup / LastReturn） |
| **甘特图** | `useGanttFilters.ts`：`getArrivalSubset`、`getPickupSubset`、`getLastPickupSubset`、`getReturnSubset`；分组标签来自 `containerDimensions.ts` |
| **日期边界** | 后端多用 `DATE(x) < today` / `>= today` / `<= threeDaysLater` 等；甘特图用 `getRemainingTime` 的 `days`、`isExpired` 与当日比较 |

---

## 二、按到港（Arrival）

### 2.1 子项与标签对应

| 卡片/甘特图标签 | 后端 filterCondition | 甘特图 groupLabel |
|----------------|----------------------|-------------------|
| 今日到港 | `arrivalToday` | 今日到港 |
| 今日之前到港未提柜 | `arrivedBeforeTodayNotPickedUp` | 今日之前到港未提柜 |
| 今日之前到港已提柜 | `arrivedBeforeTodayPickedUp` | 今日之前到港已提柜 |
| 已逾期未到港 | `overdue`（ETA 维度） | 已逾期到港 |
| 3 日内预计到港 | `within3Days`（ETA 维度） | 3日内预计到港 |
| 7 日内预计到港 | `within7Days`（ETA 维度） | 7日内预计到港 |
| 7 日后预计到港 | `over7Days`（ETA 维度） | 7日后预计到港 |
| 其他记录 | `otherRecords`（ETA 维度） | 其他记录 |

### 2.2 目标集与条件对比

| 子项 | 后端逻辑要点 | 甘特图逻辑要点 | 是否一致 |
|------|--------------|----------------|----------|
| **今日到港** | 目的港 latest ATA，`DATE(latest_ata)=today`，状态 ALL_SHIPPED | `ataDestPort` 且 `currentPortType !== 'transit'`，ATA 日期 = 今天 | ⚠️ 口径一致，实现不同：后端用「最新目的港」ATA，前端用容器级 ataDestPort |
| **今日之前到港未提柜** | 目的港 ATA < today，排除 PICKED_UP 状态 | ATA < today，currentPortType≠transit，logisticsStatus 非 picked_up/unloaded/returned_empty | ✅ 一致 |
| **今日之前到港已提柜** | 目的港 ATA < today，状态为 PICKED_UP | ATA < today，currentPortType≠transit，logisticsStatus 为 picked_up/unloaded/returned_empty | ✅ 一致 |
| **已逾期到港** | EtaStatistics：目的港 ETA < today，状态 **shipped/in_transit**，排除已到中转港 | 有 ETA、无 ATA，**shipped/in_transit/at_port**，ETA < today | ❌ 差异：后端不含 at_port；后端排除「已到中转港」，甘特图未显式排除 |
| **3/7 日内、7 日后** | ETA 在 [today, today+3]、(today+3, today+7]、>today+7，状态 shipped/in_transit，排除已到中转港 | 同上，按 ETA 与 today 的 diffDays 划分；含 at_port；未排除已到中转港 | ❌ 同「已逾期」：状态集与是否排除中转港不一致 |
| **其他记录** | 目的港无 ATA 且无 ETA 的记录（otherRecords） | 无对应：getArrivalSubset 中 `if (!etaDate && !ataDate) return false` 会排除无 ETA/ATA 的柜 | ❌ 甘特图「其他记录」实际无货柜落入（与卡片可能不一致） |

### 2.3 小结（按到港）

- **已到目的港**三类（今日到港、今日前未提柜、今日前已提柜）：口径一致，实现细节不同（最新目的港 vs 容器级字段）。
- **预计到港**（已逾期、3/7 日内、7 日后）：后端仅 **shipped/in_transit** 且排除已到中转港；甘特图含 **at_port** 且未排除已到中转港，可能多出一部分柜。
- **其他记录**：后端有独立 otherRecords；甘特图当前逻辑会筛掉「无 ETA 且无 ATA」的柜，导致「其他记录」为空。

---

## 三、按提柜计划（Planned Pickup）

### 3.1 子项与标签对应

| 卡片/甘特图标签 | 后端 filterCondition | 甘特图 groupLabel |
|----------------|----------------------|-------------------|
| 逾期未提柜 | `overduePlanned` | 逾期未提柜 |
| 今日计划提柜 | `todayPlanned` | 今日计划提柜 |
| 3 天内计划提柜 | `plannedWithin3Days` | 3天内计划提柜 |
| 7 天内计划提柜 | `plannedWithin7Days` | 7天内计划提柜 |
| 待安排提柜 | `pendingArrangement` | 待安排提柜 |

### 3.2 目标集与条件对比

| 子项 | 后端逻辑要点 | 甘特图逻辑要点 | 是否一致 |
|------|--------------|----------------|----------|
| **目标集** | 已到目的港（目的港 ATA）+ 未还箱 + 无 WMS 完成 + **无实际提柜**（tt.pickup_date IS NULL） | 已到目的港（ataDestPort + currentPortType≠transit）；按子项再筛 | ⚠️ 后端用 SQL 多表 NOT EXISTS；甘特图用 enrich 后的 container 字段，逻辑等价可接受 |
| **逾期未提柜** | `planned_pickup_date < today`，有拖卡且有计划日、无 pickup_date | plannedPickupDate 存在、无 pickupDate，getRemainingTime().isExpired | ✅ 一致 |
| **今日计划提柜** | `DATE(planned_pickup_date) = today` | plannedPickupDate 日期 = today | ✅ 一致 |
| **3 天内计划提柜** | 后端：`today < planned_pickup_date <= threeDaysLater` | 未过期且 `time.days <= 3`（剩余天数 0~3） | ⚠️ 边界：后端为 (today, threeDaysLater]；甘特图「≤3 天」含今天+3 当天，可能多一天边界 |
| **7 天内计划提柜** | `threeDaysLater < planned_pickup_date <= sevenDaysLater` | 未过期且 `3 < time.days <= 7` | ✅ 一致 |
| **待安排提柜** | 目标集中无拖卡记录 **或** 有拖卡但 planned_pickup_date IS NULL | 已到目的港且 **无** firstTrucking（无拖卡记录） | ❌ 差异：后端还包含「有拖卡但无计划日期」；甘特图仅「无拖卡」 |

### 3.3 小结（按提柜计划）

- 逾期 / 今日 / 7 天内：基本一致。
- 3 天内：边界可能差一天（甘特图 days≤3 与后端开闭区间）。
- **待安排提柜**：后端包含「有拖卡但无计划日」；甘特图只做「无拖卡」，少了一部分柜。

---

## 四、按最晚提柜（Last Free Date）

### 4.1 子项与标签对应

| 卡片/甘特图标签 | 后端 filterCondition | 甘特图 groupLabel |
|----------------|----------------------|-------------------|
| 已逾期 | `expired` | 已逾期 |
| 紧急（1–3 天） | `urgent` | 紧急 |
| 警告（4–7 天） | `warning` | 警告 |
| 正常（7 天以上） | `normal` | 正常 |
| 最晚提柜日为空 | `noLastFreeDate` | 最晚提柜日为空 |

### 4.2 目标集与条件对比

| 子项 | 后端逻辑要点 | 甘特图逻辑要点 | 是否一致 |
|------|--------------|----------------|----------|
| **目标集** | 目的港有 ATA + 未还箱 + 无 WMS 完成 + **无实际提柜**（tt.pickup_date IS NULL）；取目的港 last_free_date | 已到目的港且未提柜；若有计划提柜+实际提柜则排除；否则看 destPortOp.lastFreeDate | ⚠️ 后端用「无 tt.pickup_date」；甘特图用「无 firstTrucking.pickupTime」及有计划+实际则排除，口径接近 |
| **已逾期** | `DATE(last_free_date) < today` | getRemainingTime(lastFreeDate).isExpired | ✅ 一致 |
| **紧急** | `today <= last_free_date < threeDaysLater` | !isExpired 且 `time.days <= 3` | ⚠️ 边界：后端 [today, threeDaysLater)；甘特图 days≤3 可能包含 threeDaysLater 当天 |
| **警告** | `threeDaysLater <= last_free_date < sevenDaysLater` | !isExpired 且 `3 < time.days <= 7` | ⚠️ 同上，边界可能差一天 |
| **正常** | `last_free_date >= sevenDaysLater` | !isExpired 且 time.days > 7 | ✅ 一致 |
| **最晚提柜日为空** | 目标集中 last_free_date IS NULL | 无 lastFreeDate 且 groupLabel 为「最晚提柜日为空」 | ✅ 一致 |

### 4.3 小结（按最晚提柜）

- 目标集与五类子项口径一致；**紧急 / 警告**因「剩余天数」与「日期区间」换算可能有一日边界差。

---

## 五、按最晚还箱（Last Return Date）

### 5.1 子项与标签对应

| 卡片/甘特图标签 | 后端 filterCondition | 甘特图 groupLabel |
|----------------|----------------------|-------------------|
| 已逾期 | `returnExpired` | 已逾期 |
| 紧急 | `returnUrgent` | 紧急 |
| 警告 | `returnWarning` | 警告 |
| 正常 | `returnNormal` | 正常 |
| 最后还箱日为空 | `noLastReturnDate` | 最后还箱日为空 |

### 5.2 目标集与条件对比

| 子项 | 后端逻辑要点 | 甘特图逻辑要点 | 是否一致 |
|------|--------------|----------------|----------|
| **目标集** | **logistics_status IN ('picked_up', 'unloaded')** + 关联 process_empty_return | 排除 returned_empty；**有拖卡记录 hasTrucking 或 status picked_up/unloaded**；且 emptyReturn.returnTime 为空 | ❌ 差异：后端仅「已提柜/已卸柜」状态；甘特图还包含「有拖卡记录但状态非 picked_up/unloaded」的柜（如 at_port 但有拖车记录） |
| **已逾期 / 紧急 / 警告 / 正常** | last_return_date 与 today、threeDays、sevenDays 比较 | getRemainingTime(lastReturnDate) 的 isExpired、days 分段 | ⚠️ 日期分段一致；目标集不同导致总体人数可能不同 |
| **最后还箱日为空** | 目标集中 er.last_return_date IS NULL | 无 lastReturnDate 且 groupLabel 为「最后还箱日为空」 | ❌ 同上：目标集不同，空值集合不一致 |

### 5.3 小结（按最晚还箱）

- **目标集不一致**：后端只统计 **picked_up / unloaded**；甘特图还包含「有 trucking 记录但状态不是 picked_up/unloaded」的柜。
- 日期分段规则一致，但因目标集不同，各子项数量可能与卡片不一致。

---

## 六、总体结论与建议

| 泳道 | 对齐情况 | 主要差异 |
|------|----------|----------|
| **按到港** | 部分一致 | 预计到港：后端仅 shipped/in_transit 且排除已到中转港，甘特图含 at_port 且未排除；「其他记录」甘特图当前无柜落入 |
| **按提柜计划** | 大部分一致 | 待安排：后端含「有拖卡无计划日」，甘特图仅「无拖卡」；3 天内边界可能差一天 |
| **按最晚提柜** | 基本一致 | 紧急/警告与后端日期区间可能有一日边界差 |
| **按最晚还箱** | 目标集不一致 | 后端仅 picked_up/unloaded；甘特图含「有拖卡即可」，范围更大 |

**建议（已实施，以后端为准）**：

1. **按到港**：✅ 预计到港仅保留 shipped/in_transit，并排除已到中转港（`hasArrivedAtTransit`）；「其他记录」单独分支，纳入目的港无 ETA 且无 ATA 的柜。
2. **按提柜计划**：✅ 待安排 = 已到目的港且未实际提柜，且（无拖卡 or 有拖卡但无计划日）；3 天内边界为剩余 1～3 天（与后端 (today, threeDaysLater] 一致）。
3. **按最晚提柜**：✅ 紧急 = 剩余小于 3 天（对应后端 today ≤ date &lt; threeDaysLater）；警告 = 剩余 3～7 天。
4. **按最晚还箱**：✅ 目标集收窄为 logisticsStatus in ('picked_up','unloaded')，与后端 LastReturnStatistics 一致。

实现位置：`frontend/src/components/common/composables/useGanttFilters.ts`。

---

*文档基于当前后端 Statistics 服务与前端 useGanttFilters 实现整理，后续若 SQL 或前端逻辑变更需同步更新此对比。*
