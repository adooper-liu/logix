# 桑基图节点与 Shipments 卡片统计 SQL 对齐说明

桑基图节点数值与 Shipments 页对应卡片使用**同一套后端统计逻辑**（不改变桑基图结构与连线）。

---

## 一、数据来源统一

- **桑基图**：仅使用 `getStatisticsDetailed` 返回的 `statusDistribution` 计算各节点数值。
- **Shipments「按状态」卡片**：同一接口的 `statusDistribution`，子维度「已到中转港」「已到目的港」与 `arrived_at_transit`、`arrived_at_destination` 同源。
- **后端**：`StatusDistributionService.getDistribution(startDate, endDate)` 为唯一数据源；日期筛选使用 `createDateRangeSubQuery`，与 Shipments 其它卡片（到港、最晚提柜等）的出运日期口径一致。

---

## 二、节点与 statusDistribution / SQL 对应关系

| 桑基图节点 | 计算公式（前端） | 对应 statusDistribution 键 | 后端 SQL 说明 |
|------------|------------------|-----------------------------|----------------|
| 已出运 | shipped + in_transit + at_port + picked_up + unloaded + returned_empty | 7 个主状态（除 not_shipped） | getDistribution 主查询：按 logistics_status 分组，日期子查询 createDateRangeSubQuery |
| 在途 | 未到港 + 已到中转港 | shipped, in_transit, arrived_at_transit | 同上 + getTransitArrivalCount |
| 未到港 | shipped + in_transit | shipped, in_transit | 主查询分组 |
| 已到中转港 | arrived_at_transit | arrived_at_transit | getTransitArrivalCount（at_port 且 current_port_type=transit，与状态机优先级 5 一致） |
| 已到目的港 | 未提柜 + 已提柜 | arrived_at_destination, picked_up, unloaded, returned_empty | getDestinationArrivalCount + 主查询分组 |
| 未提柜 | arrived_at_destination | arrived_at_destination | getDestinationArrivalCount（目的港 ATA、未还箱/未 WMS/未提柜，与状态机优先级 4 一致） |
| 已提柜 | picked_up + unloaded + returned_empty | picked_up, unloaded, returned_empty | 主查询分组 |
| 已卸柜 | unloaded + returned_empty | unloaded, returned_empty | 主查询分组 |
| 未卸柜 | picked_up | picked_up | 主查询分组 |
| 未还箱 | unloaded | unloaded | 主查询分组 |
| 已还箱 | returned_empty | returned_empty | 主查询分组 |

---

## 三、与 Shipments 卡片的对应关系

- **「按状态」卡片**：与桑基图同源，均为 `statusDistribution`。卡片分组「在途」= 未到港 + 已到中转港，「已到港」= 已到目的港（arrived_at_destination + 已提柜及以后）。
- **「按到港」「按提柜计划」「按最晚提柜」「按最晚还箱」**：各自使用 arrivalDistribution、pickupDistribution、lastPickupDistribution、returnDistribution；桑基图**不直接使用**这些分布，仅通过「同一接口、同一日期口径」与页面其它数据一致。

---

## 四、实现要点（已落实）

1. **StatusDistribution.service.ts**：getDistribution 主查询在有 startDate/endDate 时改用 `createDateRangeSubQuery`，与 LastPickupStatistics、ArrivalStatistics 等共用出运日期子查询。
2. **getTransitArrivalCount / getDestinationArrivalCount**：传日期时使用同一 createDateRangeSubQuery，且 `setParameters` 合并原有参数与子查询参数，避免覆盖导致 arrived_at_transit / arrived_at_destination 为 0。
3. **桑基图组件**：不改节点与连线，仅从 `props.data.statusDistribution` 推导 nodeValues 与 links value，与上述表格一致。
