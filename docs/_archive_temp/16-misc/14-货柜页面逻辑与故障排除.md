# Shipments 页面逻辑总结与问题排查

本文档说明 `/#/shipments` 页面的**卡片统计**、**卡片条件查询**与**数据表**逻辑，并给出常见问题排查步骤。

---

## 一、页面结构概览

```
Shipments.vue
├── 搜索栏（关键词、日期范围、重置、刷新列表/统计）
├── 倒计时卡片区（5 张 CountdownCard）
│   ├── 按状态、按到港、按提柜计划、按最晚提柜、按最晚还箱
│   └── 点击卡片内标签 → 按条件筛选表格
└── 数据表格（el-table）
    └── 无筛选时：后端分页；有筛选时：前端分页（整批数据已加载）
```

---

## 二、卡片统计数据流

### 2.1 数据来源

- **唯一来源**：后端接口 `GET /api/v1/containers/statistics-detailed`。
- **调用时机**：
  - 页面挂载时 `onMounted`：与 `loadContainers()` 并行执行 `loadStatistics()`。
  - 日期范围变更时 `handleShipmentDateChange`：会再次调用 `loadStatistics()`。
  - 点击「刷新统计」：调用 `reloadStatistics()` → `loadStatistics()`。

### 2.2 当前实现要点

- `loadStatistics()` 会从页面顶部 **日期范围** `shipmentDateRange` 取出起止日，格式化为 `YYYY-MM-DD` 后传给 `containerService.getStatisticsDetailed(startDate, endDate)`。
- **卡片统计与表格列表共用同一套日期范围**：改日期会同时触发 `loadStatistics()` 与 `loadContainers()`，卡片数字与表格均按“出运日期”在该区间内的货柜统计/展示。

### 2.3 前端如何算出卡片展示

- 接口返回结构（camelCase）：
  - `statusDistribution`
  - `arrivalDistribution`
  - `pickupDistribution`
  - `lastPickupDistribution`
  - `returnDistribution`
- 这些数据注入到 `useContainerCountdown(statisticsData)` 的 `statisticsData`。
- `useContainerCountdown` 内部用 **computed** 从上述 5 个 distribution 算出每张卡片的：
  - `count`、`urgent`、`expired`
  - `filterItems`（子维度列表，每项含 `label`、`count`、`color`、**`days`**）
- **`days` 的约定**：即后端「条件查询」用的 **filterCondition**，点击时原样传给后端，不做前端映射。

### 2.4 各卡片 filterItems 与 filterCondition 对应关系

| 卡片 | 子维度示例 | days（filterCondition） | 后端服务 |
|------|------------|--------------------------|----------|
| 按状态 | 未出运、已出运、在途、已到港(已到中转港/已到目的港)、已提柜、已卸柜、已还箱 | `not_shipped`、`shipped`、`in_transit`、`at_port`、`arrived_at_transit`、`arrived_at_destination`、`picked_up`、`unloaded`、`returned_empty` | 状态用 status；子维度见下文 |
| 按到港 | 已到目的港、已到中转港、预计到港（及各自子项） | `arrivalToday`、`arrivedBeforeTodayNotPickedUp`、`overdue`、`within3Days` 等 | arrival / eta |
| 按提柜计划 | 逾期未提柜、今日计划提柜、3天内、7天内、待安排 | `overduePlanned`、`todayPlanned`、`plannedWithin3Days`、`plannedWithin7Days`、`pendingArrangement` | plannedPickup |
| 按最晚提柜 | 已超时、即将超时、预警、时间充裕、最晚提柜日为空 | `expired`、`urgent`、`warning`、`normal`、`noLastFreeDate` | lastPickup |
| 按最晚还箱 | 已逾期未还箱、紧急、警告、正常、最后还箱日为空 | `returnExpired`、`returnUrgent`、`returnWarning`、`returnNormal`、`noLastReturnDate` | lastReturn |

后端 filterCondition 与服务的映射见：`backend/src/constants/FilterConditions.ts`（CONDITION_TO_SERVICE_MAP）。

---

## 三、卡片条件查询（点击标签 → 表格筛选）

### 3.1 流程

1. 用户点击某张卡片内的一个标签（如「今日计划提柜」）。
2. `CountdownCard` 发出 `@filter`，参数为 `(title, days)`，其中 **days = 该维度的 filterCondition**。
3. `Shipments.vue` 中 `handleCountdownFilter(type, days)`：
   - 设置 `activeFilter.value = { type, days }`；
   - 调用 `loadContainersByFilter()`。
4. `loadContainersByFilter()`：
   - 从 `activeFilter.value.days` 取出 **filterCondition**（不做事先映射）；
   - 调用 `containerService.getContainersByFilterCondition(filterCondition, undefined, undefined)`；
   - 即请求 `GET /api/v1/containers/by-filter?filterCondition=xxx`（当前未传日期）。
5. 后端返回该条件下的货柜列表；前端赋给 `containers.value`，并设 `pagination.total = response.count`。
6. 表格展示：`filteredContainers` 实际来自 `paginatedContainers`；**有筛选时**为前端分页（对已加载的 `containers` 做 slice），**无筛选时**为后端分页（当前页即 `containers`）。

### 3.2 要点

- **filterCondition 必须与后端约定一致**：后端只识别 `FilterConditions.ts` 及 `containerStatistics.service` 里支持的字符串（如 camelCase 的 `arrivedAtDestination`、或 status 的 `not_shipped` 等）。
- 当前**按状态**卡片中「已到中转港」「已到目的港」使用的 `days` 为 **snake_case**：`arrived_at_transit`、`arrived_at_destination`。而后端 `CONDITION_TO_SERVICE_MAP` 使用 camelCase（如 `arrivedAtTransit`），且「已到中转港」列表接口实际认的是 **`in_transit_transit`**。因此这两项点击后可能得到空列表，属于前后端 filterCondition 不一致，需在排查时重点核对。

---

## 四、数据表逻辑

### 4.1 两套数据源

| 场景 | 数据来源 | 分页方式 |
|------|----------|----------|
| 无卡片筛选 | `GET /api/v1/containers?page=&pageSize=&search=&startDate=&endDate=` | 后端分页 |
| 有卡片筛选 | `GET /api/v1/containers/by-filter?filterCondition=xxx` | 前端分页（整批加载后 slice） |

### 4.2 表格绑定

- `el-table` 的 `:data="filteredContainers"`。
- `filteredContainers` = `paginatedContainers`（computed）。
- **无筛选**：`paginatedContainers` 直接返回 `containers.value`（当前页）。
- **有筛选**：`paginatedContainers` 对 `containers.value` 做 `slice((page-1)*pageSize, page*pageSize)`。

### 4.3 列与字段

- 表格列使用实体/前端约定字段名：如 `containerNumber`、`actualShipDate`、`orderNumber`、`billOfLadingNumber`、`logisticsStatus` 等。
- `actualShipDate`、`orderNumber` 等可能来自列表接口返回的扩展字段（enrichContainersList），若接口未带则可能为 undefined，显示为 `-` 或需从关联数据取。

### 4.4 搜索与日期

- **搜索**：输入关键词 + 点击搜索 → `handleSearch` → `loadContainers()`，带 `search`、`startDate`、`endDate`（来自 `shipmentDateRange`）。
- **日期范围**：`DateRangePicker` 绑定 `shipmentDateRange`，变更时 `handleShipmentDateChange` 会同时 `loadStatistics()` 和 `loadContainers()`（统计仍为全量，列表会按日期过滤）。
- **重置搜索**：清空关键词和 `activeFilter`，再 `loadContainers()`，回到无筛选、后端分页。

---

## 五、问题排查清单

### 5.1 卡片数字为 0 或一直不更新

- 检查 `GET /api/v1/containers/statistics-detailed` 是否 200、返回体是否含 `data.statusDistribution` 等 5 个 distribution。
- 若接口 500：查后端日志（统计服务、数据库、FilterConditions 引用等），参考此前修复的 shared 路径、getAbnormalDistribution 等。
- 确认 `loadStatistics` 在 onMounted 和「刷新统计」时都有执行（可打 log 或看 Network）。

### 5.2 点击卡片标签后表格为空或结果不符合预期

- 在控制台确认点击时传出的 **filterCondition**（即 `days`）：  
  `handleCountdownFilter` 和 `loadContainersByFilter` 内已有 console.log，查看请求 `/containers/by-filter?filterCondition=xxx` 的 **xxx**。
- 对照后端：
  - `backend/src/constants/FilterConditions.ts` 的 **CONDITION_TO_SERVICE_MAP**（camelCase 键）；
  - `containerStatistics.service.ts` 的 **getContainersByCondition**：  
    - 状态维度是否支持该字符串（如 `validStatuses`、`in_transit_transit`）；
    - 到港/提柜/还箱等是否在 CONDITION_TO_SERVICE_MAP 中有对应键（注意 **snake_case vs camelCase**）。
- **已知不一致**：「按状态」下的「已到中转港」「已到目的港」前端传 `arrived_at_transit` / `arrived_at_destination`，后端列表条件为 `in_transit_transit` 或 camelCase 的 arrival 条件，需统一（前端改传或后端兼容 snake_case）。

### 5.3 表格列表与日期范围不一致

- 列表由 `loadContainers()` 的 `startDate`/`endDate` 控制，来自 `shipmentDateRange`。
- 若发现“改了日期但列表没变”：确认 `handleShipmentDateChange` 是否被触发、是否调用了 `loadContainers()`，以及请求 Query 中是否带上正确的 startDate/endDate。

### 5.4 卡片数字与日期筛选不一致

- 卡片统计已与顶部日期范围绑定：`loadStatistics` 会使用 `shipmentDateRange` 作为 `startDate`/`endDate` 调用 `getStatisticsDetailed`。若仍不一致，请确认日期选择器是否正确更新 `shipmentDateRange`、以及 `handleShipmentDateChange` 是否被触发并调用了 `loadStatistics()`。

### 5.5 分页异常（有筛选时）

- 有筛选时：后端一次返回全部符合条件的货柜，前端用 `paginatedContainers` 做 slice 分页。
- 若总条数不对：看 `pagination.total` 是否在 `loadContainersByFilter` 里赋值为 `response.count`。
- 若翻页无数据：检查 `pagination.page` / `pageSize` 与 `containers.value.length`、slice 的 start/end 是否一致。

---

## 六、关键文件索引

| 功能 | 文件 |
|------|------|
| 页面入口、搜索/日期/筛选/表格 | `frontend/src/views/shipments/Shipments.vue` |
| 卡片 UI、点击 emit filter | `frontend/src/components/CountdownCard.vue` |
| 统计 → 卡片数据结构、filterCondition 取值 | `frontend/src/composables/useContainerCountdown.ts` |
| 统计接口、按条件查询接口 | `frontend/src/services/container.ts`（getStatisticsDetailed、getContainersByFilterCondition） |
| 后端统计与条件查询 | `backend/src/controllers/container.controller.ts`（getStatisticsDetailed、getContainersByFilterCondition） |
| 条件 → 服务路由 | `backend/src/constants/FilterConditions.ts` |
| 条件查询实现 | `backend/src/services/containerStatistics.service.ts`（getContainersByCondition） |

---

## 七、总结

- **卡片统计**：仅来自 `statistics-detailed`，目前不随页面日期范围变化；卡片展示由 `useContainerCountdown` 根据 5 个 distribution 计算得出，**days = 后端 filterCondition**。
- **卡片条件查询**：点击标签 → 用该维度的 **days** 作为 **filterCondition** 调 **by-filter**，后端返回列表；前端有筛选时做前端分页。
- **数据表**：无筛选用列表接口+后端分页，有筛选用 by-filter 全量+前端分页；表格列依赖接口返回的扩展字段。
- **排查重点**：接口是否 200、filterCondition 与后端常量是否一致（含 snake_case/camelCase 与 `in_transit_transit` 等）、统计是否需随日期变化、分页与 total 是否一致。
