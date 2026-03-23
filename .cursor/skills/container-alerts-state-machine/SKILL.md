---
name: container-alerts-state-machine
description: Aligns ext_container_alerts (AlertService) with the 7-layer logistics state machine, last_free_date, LastPickup statistics, and automated alert deduplication. Use when modifying AlertService, alert routes/schedulers, LastPickupSubqueryTemplates, or container detail 预警 TAB.
---

# 货柜预警与状态机一致（LogiX）

## 必须遵守

| 要点 | 说明 |
|------|------|
| 状态闸门 | 规则类预警须先调用 `calculateLogisticsStatus(container, portOps, seaFreight, trucking, warehouse, emptyReturn)`（六参数齐全），禁止仅用零散字段推断阶段 |
| 目的港到港 | 与状态机 4/4a 一致：目的港 **ATA 或 `available_time`**；最晚提柜统计见 `LastPickupSubqueryTemplates.TARGET_SET_SUBQUERY`（`ATA IS NOT NULL OR available_time IS NOT NULL`） |
| 最晚提柜日 | 取自 `process_port_operations.last_free_date`（目的港 `port_sequence` 最大一条），禁止 ATA+7 等硬编码；`last_free_date_invalid = true` 时不生成依赖 LFD 的滞港/拖卡分级 |
| 卸柜判定 | 与状态机一致：使用 `isWmsConfirmed(warehouseOperation)`，不得单独依赖 `unboxingTime` 作为「已卸柜」 |
| 时间分档 | 拖卡/LFD 预警与 `LastPickupSubqueryTemplates` + `DateFilterBuilder` 自然日分档一致（已超时 / 0–3 天 / 3–7 天 / 7 天外不报） |
| 滞港费 | 仅在 `logistics.status === at_port` 且 `currentPortType === 'destination'`（已到目的港未提柜）且 `today > last_free_date` 时生成 |
| 还箱/滞箱 | 最晚还箱日优先 `process_empty_return.last_return_date`，缺省为 `pickup_date + 7 天`（与排柜/历史回退一致） |
| 幂等 | 每次 `checkContainerAlerts` 对 `AUTOMATED_ALERT_TYPES` 中**未解决**记录先 `DELETE` 再插入，避免重复刷屏；**已解决**（`resolved = true`）保留 |

## 自动化预警类型（参与删旧插新）

`trucking`, `unloading`, `emptyReturn`, `inspection`, `demurrage`, `detention`, `rollover`, `shipmentChange`

不含：`customs`（未实现）、`other`。

## 数据加载

单箱检查须加载：`Container` + `seaFreight` + `portOperations`（排序）、最新 `TruckingTransport`（与 `DemurrageService` 一致建议 `lastPickupDate DESC`）、最新 `WarehouseOperation`、`EmptyReturn`。

对外可复用 `AlertService.loadAlertCheckContext(containerNumber)` 获取 `AlertCheckContext`（含 `logistics`、`destPortOp`）。

## 关联代码

- `backend/src/utils/logisticsStatusMachine.ts` — `calculateLogisticsStatus`, `isWmsConfirmed`, `SimplifiedStatus`
- `backend/src/services/alertService.ts` — 实现入口
- `backend/src/services/statistics/LastPickupSubqueryTemplates.ts` — 最晚提柜统计目标集 SQL
- `backend/src/services/statistics/common/DateFilterBuilder.ts` — 自然日对齐
- `backend/src/services/riskService.ts` — 风险评分与状态机对齐的参考实现

## 禁止事项

- 禁止在未加载 `seaFreight` 时假定在途/未出运判断正确
- 禁止用临时 SQL 修补预警数据；应重跑 `checkContainerAlerts` 或修复映射/流程表
- 禁止在规则预警中硬编码「免费 7 天」替代库内 `last_free_date` / `last_return_date`（缺省回退除外且须与文档一致）

## 验证清单（修改后）

- [ ] `backend/src/entities` 与 `03_create_tables.sql` 字段一致
- [ ] 修改涉及统计子查询时，同步核对 `LastPickupSubqueryTemplates` 注释与条件
- [ ] 运行 `npm run type-check` / `npm run lint`（以项目可用命令为准）
