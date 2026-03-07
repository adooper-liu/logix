# Shipments 卡片统计逻辑与分组设计确认稿

本文档用于在**修改代码前**与你确认：各卡片的统计口径、分组与子分类树、以及需要修复的不一致项。确认后再改代码。

---

## 原则：统计与查询共用 SQL

- **统计**（卡片上的数字）与**查询**（点击卡片后的列表）必须共用同一套 SQL/条件逻辑，不重复实现。
- 实现方式：抽「按条件得到柜号列表」的单一方法（同一子查询 + 统一日期过滤）；统计用该列表的 `length`，查询用该列表再按柜号取 Container。
- **一次修改、二处同步**：改筛选条件或日期范围时只改一处，统计与列表自动一致。

---

## 一、统一约定（与状态机、DB 一致）

- **统计范围**：所有卡片均按「出运日期在页面顶部所选日期范围内」的货柜统计（`actual_ship_date` 或 `shipment_date` 落在 `[startDate, endDate]`）。
- **状态口径**：状态维度的 7 种状态与 DB 字段 `biz_containers.logistics_status` 及《业务状态机》文档一致：`not_shipped` → `shipped` → `in_transit` → `at_port` → `picked_up` → `unloaded` → `returned_empty`。
- **点击筛选**：卡片内每个标签的 `days` 值 = 后端 `filterCondition`，点击时原样传给 `GET /api/v1/containers/by-filter?filterCondition=xxx&startDate=&endDate=`，且**必须与后端支持的 filterCondition 一致**，否则列表为空。

---

## 二、各卡片现状与待确认/待改项

### 1. 按状态

| 项目 | 现状 | 说明 |
|------|------|------|
| **数据来源** | 后端 `statusDistribution`（按 `logistics_status` 分组 + `arrived_at_transit` / `arrived_at_destination` 两子统计） | 与状态机一致 |
| **分组与树** | 业务口径：**未到目的港 = 在途**（含「未到港」「已到中转港」）；**已到目的港 = 已到港**（仅「已到目的港」）。故「已到中转港」作为**在途**的子节点，不计入「已到港」；总数 = 7 个顶级项之和。 | 在途 = in_transit + arrived_at_transit；已到港 = arrived_at_destination |
| **问题** | 点击「已到中转港」或「已到目的港」时，前端传的是 **snake_case**：`arrived_at_transit`、`arrived_at_destination`。后端 `CONDITION_TO_SERVICE_MAP` 只有 **camelCase**，且没有把这两个条件路由到「按状态」逻辑；`validStatuses` 也只有 7 个状态名。因此点击后列表为空。 | **必须修** |

**可选方案（请选一或给出你的方案）：**

- **方案 A**：保留「已到港」下两个子项且可点击。  
  - 后端：在 `getContainersByCondition` 中增加对 `arrived_at_transit`、`arrived_at_destination` 的支持（或同时支持 camelCase），路由到「按状态」子服务，返回「at_port 且当前港口类型=中转港/目的港」的货柜列表（与 StatusDistribution 子统计逻辑一致）。  
  - 前端：若后端只认 camelCase，则子项 `days` 改为 `arrivedAtTransit` / `arrivedAtDestination`，并确保后端按「状态维度」解析（避免与到港维度的 arrivedAtTransit 混用，见下）。
- **方案 B**：不区分子维度，只保留「已到港」一个可点击项，`days = at_port`，点击后列表为所有 at_port 的货柜。子项「已到中转港」「已到目的港」仅作展示，不可点击。
- **方案 C**：「已到中转港」点击时传后端已有的 `in_transit_transit`（在途且已有中转港、目的港无 ATA），与当前「按状态」下的「已到中转港」含义不同（状态是 in_transit 而非 at_port），需在文案上区分或放弃用 in_transit_transit 表示状态卡的「已到中转港」。

**建议**：若希望「按状态」与状态机完全一致且子项可点，采用**方案 A**（后端为状态维度增加 arrived_at_transit / arrived_at_destination 的列表查询，与 StatusDistribution 子统计同源）。

**✅ 方案 A 已实现（2025-03-07）**  
- 后端 `StatusDistributionService` 新增 `getContainersByArrivedAtTransit`、`getContainersByArrivedAtDestination`（与 count 同源 WHERE 逻辑）。  
- 后端 `ContainerStatisticsService.getContainersByCondition` 在 `in_transit_transit` 之后、`validStatuses` 之前增加对 `arrived_at_transit` / `arrived_at_destination` 的路由，调用上述两个方法。  
- 前端无需改：继续传 `days: 'arrived_at_transit'` / `'arrived_at_destination'`。

---

### 2. 按到港

| 项目 | 现状 | 说明 |
|------|------|------|
| **数据来源** | 后端 `arrivalDistribution`（Arrival + ETA 合并）：三组「已到目的港 / 已到中转港 / 预计到港」 | 与文档一致 |
| **分组与树** | 已到目的港（今日到港、之前未提柜、之前已提柜）；已到中转港（已逾期、3 日内、7 日内、7 日后、无 ETA）；预计到港（已逾期、3 天内、7 天内、7 天后、其他） | 前端 filterItems 的 days 与后端 CONDITION_TO_SERVICE_MAP 一致（camelCase） |
| **统计口径** | 已到目的港 = 目的港有 ATA；已到中转港 = 有中转港记录且目的港无 ATA；预计到港 = ETA 维度（目的港 ETA 与今天比较） | 与状态机、last_free_date 等文档一致 |
| **问题** | 无。仅需确认：当前三组树形结构是否保留不变？ | 可选微调文案 |

**待你确认**：  
- 是否维持当前「已到目的港 / 已到中转港 / 预计到港」三组及各自子项？  
- 「预计到港」下的「其他」是否保持为「无 ETA 记录」且 filterCondition = `otherRecords`？

---

### 3. 按提柜计划

| 项目 | 现状 | 说明 |
|------|------|------|
| **数据来源** | 后端 `pickupDistribution`（PlannedPickupStatistics） | 目标集与「按最晚提柜」一致：已到目的港且未提柜 |
| **分组** | 5 项平铺：逾期未提柜、今日计划提柜、3 天内、7 天内、待安排提柜 | 无树形 |
| **filterCondition** | overduePlanned, todayPlanned, plannedWithin3Days, plannedWithin7Days, pendingArrangement | 与后端 METHOD_MAP 一致 |
| **问题** | 无 | 仅确认是否保持当前分组与命名 |

**待你确认**：是否保持当前 5 项平铺、不做树形分组？

---

### 4. 按最晚提柜

| 项目 | 现状 | 说明 |
|------|------|------|
| **数据来源** | 后端 `lastPickupDistribution`（LastPickupStatistics） | 目标集：已到目的港且（无拖车或未提柜），按目的港 `last_free_date` 与今天比较 |
| **分组** | 5 项：已超时、即将超时(1–3 天)、预警(4–7 天)、时间充裕(7 天以上)、最晚提柜日为空 | 与《业务状态机》2.3 一致 |
| **filterCondition** | expired, urgent, warning, normal, noLastFreeDate | 与后端一致 |
| **问题** | 无 | 仅确认是否保持 |

**待你确认**：是否保持当前 5 项与文案？

---

### 5. 按最晚还箱

| 项目 | 现状 | 说明 |
|------|------|------|
| **数据来源** | 后端 `returnDistribution`（LastReturnStatistics） | 目标集：有实际提柜或拖车记录且未还箱 |
| **分组** | 5 项：已逾期未还箱、紧急(3 天内)、警告(7 天内)、正常、最后还箱日为空 | 与后端一致 |
| **filterCondition** | returnExpired, returnUrgent, returnWarning, returnNormal, noLastReturnDate | 与后端一致 |
| **问题** | 无 | 仅确认是否保持 |

**待你确认**：是否保持当前 5 项与文案？

---

## 三、必须修复的统计逻辑（与状态机、DB 一致）

在**不改变你确认后的分组/树形**前提下，只做以下修正即可保证「统计逻辑 + 点击筛选」与状态机、数据库一致：

1. **按状态卡片**
   - 修复「已到中转港」「已到目的港」点击后列表为空的问题：按你在第二节 1 中选择的方案（A/B/C）实施（例如方案 A：后端支持 `arrived_at_transit` / `arrived_at_destination` 的列表查询并与 StatusDistribution 子统计同源；前端如需则统一传 camelCase 或与后端约定一致）。
2. **其余卡片**
   - 按到港 / 计划提柜 / 最晚提柜 / 最晚还箱：当前统计与 filterCondition 已与后端一致，仅需在确认分组与文案后保留或做你指定的微调（不改变统计口径）。

---

## 四、请回复确认的内容

请直接回复或标注：

1. **按状态**：选择方案 A / B / C（或你的变体）。若选 A，是否同意后端新增「按状态」维度的 `arrived_at_transit` / `arrived_at_destination`（或 camelCase）列表接口并与 StatusDistribution 子统计一致？
2. **按到港**：是否维持当前三组树形及「其他」= otherRecords？
3. **按提柜计划 / 按最晚提柜 / 按最晚还箱**：是否均保持当前分组与 filterCondition 不变？

确认后，将只修改与上述一致项相关的统计与筛选逻辑（后端 + 前端），不扩大范围。
