# Shipments 页面「查询过滤」五卡片映射与验证说明

用于排查与验证：点击 5 个统计卡片及其子维度时，前端传入的 `filterCondition` 与后端路由、子服务是否一致。

---

## 一、数据流

1. 用户点击卡片上的某个标签（如「未出运」「已到目的港」）→ CountdownCard 触发 `@filter`，参数为 `(title, days)`，其中 **`days` 即后端 `filterCondition`**。
2. Shipments.vue：`handleCountdownFilter(type, days)` → 设置 `activeFilter` → 调用 `loadContainersByFilter()`。
3. `loadContainersByFilter()` 将 `activeFilter.value.days` 作为 **filterCondition**，与可选 `startDate`、`endDate` 一起请求 `GET /api/v1/containers/by-filter?filterCondition=xxx&startDate=&endDate=`。
4. 后端 `containerStatisticsService.getContainersByCondition(filterCondition, startDate, endDate)` 根据 filterCondition 分发到对应子服务或按状态查询，返回货柜列表并 enrich 后返回前端。

---

## 二、五卡片 filterCondition 映射表

### 1. 按状态（全部货柜）

| 前端标签           | filterCondition       | 后端处理 |
|--------------------|------------------------|----------|
| 未出运             | `not_shipped`          | validStatuses → getContainersByStatus |
| 已出运             | `shipped`              | 同上 |
| 在途               | `in_transit`          | 同上（仅「未到港」；已到中转港见子项） |
| ├ 未到港           | `in_transit`          | 同上 |
| └ 已到中转港       | `arrived_at_transit`   | statusDistribution.getContainersByArrivedAtTransit |
| 已到港             | `arrived_at_destination` | 仅已到目的港，与子项同列表 |
| └ 已到目的港       | `arrived_at_destination`| statusDistribution.getContainersByArrivedAtDestination |
| 已提柜             | `picked_up`           | validStatuses → getContainersByStatus |
| 已卸柜             | `unloaded`            | 同上 |
| 已还箱             | `returned_empty`      | 同上 |

**说明**：业务口径「在途」= 尚未到目的港（含未到港 + 已到中转港），「已到港」= 仅已到目的港；子项不重复计入总数。按状态筛选时，若选择了顶部「出运日期范围」，会按出运日期在范围内过滤。

---

### 2. 按到港（全部货柜）

| 前端标签           | filterCondition              | 后端服务 |
|--------------------|------------------------------|----------|
| 已到目的港         | `arrivedAtDestination`       | ArrivalStatistics |
| ├ 今日到港         | `arrivalToday`               | ArrivalStatistics |
| ├ 之前未提柜       | `arrivedBeforeTodayNotPickedUp` | ArrivalStatistics |
| └ 之前已提柜       | `arrivedBeforeTodayPickedUp`  | ArrivalStatistics |
| 已到中转港         | `arrivedAtTransit`           | ArrivalStatistics |
| ├ 已逾期           | `transitOverdue`             | ArrivalStatistics |
| ├ 3日内            | `transitWithin3Days`         | ArrivalStatistics |
| ├ 7日内            | `transitWithin7Days`         | ArrivalStatistics |
| ├ 7日后            | `transitOver7Days`           | ArrivalStatistics |
| └ 无ETA            | `transitNoETA`               | ArrivalStatistics |
| 预计到港           | `expectedArrival`            | ArrivalStatistics |
| ├ 已逾期           | `overdue`                    | **EtaStatistics** |
| ├ 3天内            | `within3Days`                | EtaStatistics |
| ├ 7天内            | `within7Days`                | EtaStatistics |
| ├ 7天后            | `over7Days`                  | EtaStatistics |
| └ 其他             | `otherRecords`               | EtaStatistics |

**说明**：CONDITION_TO_SERVICE_MAP 中 `overdue`、`within3Days`、`within7Days`、`over7Days`、`otherRecords` 映射到 `eta`，由 EtaStatistics 处理。

---

### 3. 按提柜计划（已到目的港 + 未提柜状态）

| 前端标签           | filterCondition     | 后端服务 |
|--------------------|---------------------|----------|
| 逾期未提柜         | `overduePlanned`    | PlannedPickupStatistics |
| 今日计划提柜       | `todayPlanned`      | 同上 |
| 3天内计划提柜      | `plannedWithin3Days`| 同上 |
| 7天内计划提柜      | `plannedWithin7Days`| 同上 |
| 待安排提柜         | `pendingArrangement`| 同上 |

---

### 4. 按最晚提柜（已到目的港 + 未提柜状态）

| 前端标签             | filterCondition   | 后端服务 |
|----------------------|-------------------|----------|
| 已超时               | `expired`         | LastPickupStatistics |
| 即将超时(1-3天)      | `urgent`          | 同上 |
| 预警(4-7天)         | `warning`         | 同上 |
| 时间充裕(7天以上)    | `normal`          | 同上 |
| 最晚提柜日为空       | `noLastFreeDate`  | 同上 |

**说明**：LastPickupStatistics / PlannedPickupStatistics 已按「统计与查询共用 SQL」重构，列表与统计均使用 `runSubqueryForCondition` + 统一日期过滤（startDate/endDate），点击卡片后表格数量与卡片数字一致。

---

### 5. 按最晚还箱（已提柜或有拖卡记录 + 未还箱状态）

| 前端标签             | filterCondition    | 后端服务 |
|----------------------|--------------------|----------|
| 已逾期未还箱         | `returnExpired`    | LastReturnStatistics |
| 紧急：倒计时3天内    | `returnUrgent`     | 同上 |
| 警告：倒计时7天内    | `returnWarning`    | 同上 |
| 正常                 | `returnNormal`     | 同上 |
| 最后还箱日为空       | `noLastReturnDate` | 同上 |

**说明**：LastReturnStatistics 的 getContainersBy* 使用 ContainerQueryBuilder.addDateFilters，会应用 startDate/endDate（出运日期范围）。

---

## 三、已做修正

1. **按状态 + 日期筛选时 join 错误**  
   `containerStatistics.service.ts` 中 `getContainersByStatus`、`getContainersByInTransitTransit` 的日期过滤 join 已由 `container.billOfLadingNumber` 改为 **`container.bill_of_lading_number`**（与表 `biz_containers` 列名一致），避免按状态+日期筛选时结果错误或为空。

2. **无 filterCondition 时不再请求 by-filter**  
   `loadContainersByFilter` 在 `activeFilter.value.days` 为空时不再请求 `/by-filter`，改为调用 `loadContainers()` 加载默认列表。

---

## 四、验证步骤建议

1. **按状态**：依次点击「未出运」「已出运」「在途」「已到港」「已到中转港」「已到目的港」「已提柜」「已卸柜」「已还箱」，表格应只显示对应状态的柜子；选上出运日期范围后再点，数量应与卡片数字一致（在日期范围内）。
2. **按到港**：点击「已到目的港」「已到中转港」「预计到港」及其子项，表格应为对应到港/ETA 分组；与统计卡片数字一致。
3. **按提柜计划 / 按最晚提柜 / 按最晚还箱**：各子项点击后表格应为对应计划提柜、最晚提柜、最晚还箱维度，且与卡片数字一致。
4. **重置**：点击「重置」后应清空筛选并重新加载默认列表，且不再带 filterCondition 请求 by-filter。

---

## 五、相关文件

- 前端：`frontend/src/views/shipments/Shipments.vue`（handleCountdownFilter、loadContainersByFilter）、`frontend/src/composables/useContainerCountdown.ts`（各卡片 filterItems 的 days 值）、`frontend/src/components/CountdownCard.vue`（触发 filter）。
- 后端：`backend/src/controllers/container.controller.ts`（getContainersByFilterCondition）、`backend/src/services/containerStatistics.service.ts`（getContainersByCondition、getContainersByStatus）、`backend/src/constants/FilterConditions.ts`（CONDITION_TO_SERVICE_MAP）、各 `backend/src/services/statistics/*.service.ts`（getContainersByCondition 实现）。
