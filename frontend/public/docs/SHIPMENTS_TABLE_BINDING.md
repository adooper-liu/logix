# Shipments 列表表字段与后端绑定说明

本文档说明 `#/shipments` 页数据表各列与后端 `GET /api/v1/containers` + `enrichContainersList` 返回字段的对应关系。

## 数据流

- 接口：`GET /api/v1/containers?page=&pageSize=&search=&startDate=&endDate=`
- 后端：`container.controller.getContainers` → `containerRepository` 查询 → `containerService.enrichContainersList(items)` → 返回 `items`（每条为 enrich 后的货柜对象）

## 表列与后端字段对应

| 表头     | 前端 prop / 数据来源           | 后端来源（enrich 后） |
|----------|--------------------------------|------------------------|
| 集装箱号 | `containerNumber`              | `container.containerNumber`（实体主键） |
| 出运日期 | `actualShipDate`（无则用 createdAt） | `orderInfo.actualShipDate \|\| seaFreight.shipmentDate` |
| 备货单号 | `orderNumber`                  | `orderInfo.orderNumber ?? firstOrderNumber`（已修复：列表返回中补充） |
| 提单号   | `billOfLadingNumber`           | `seaFreight.mblNumber \|\| seaFreight.billOfLadingNumber` |
| 柜型     | `containerTypeCode`            | `container.containerTypeCode` |
| 物流状态 | `logisticsStatus` + `currentPortType` | `container.logisticsStatus`（可能被状态机更新）、`currentPortType` |
| 查验     | `inspectionRequired`           | `container.inspectionRequired` |
| 开箱     | `isUnboxing`                    | `container.isUnboxing` |
| 目的港   | `destinationPort`              | `seaFreight.portOfDischarge` |
| 当前位置 | `location`                     | `calculateCurrentLocation(...)` 计算值 |
| 预计到港 | `etaDestPort`                   | `latestPortOperation.etaDestPort` |
| 修正ETA  | `etaCorrection`（优先）或 `getEtaCorrection(row)` | `latestPortOperation.etaCorrection`（列表已带，前端优先用 row.etaCorrection） |
| 实际到港 | `ataDestPort`                   | 中转用 `transitArrivalDate`，否则 `latestPortOperation.ataDestPort` |
| 清关状态 | `customsStatus`                 | `latestPortOperation.customsStatus` |
| 计划提柜日 | `plannedPickupDate`             | `truckingTransport.plannedPickupDate`（process_trucking_transport） |
| 最晚提柜日 | `lastFreeDate`                  | `latestPortOperation.lastFreeDate`（目的港港口操作，process_port_operations） |
| 最晚还箱日 | `lastReturnDate`                | `emptyReturn.lastReturnDate`（process_empty_return） |
| 实际还箱日 | `returnTime`                    | `emptyReturn.returnTime`（process_empty_return） |
| 货物描述 | `cargoDescription`              | `container.cargoDescription` |
| 最后更新 | `lastUpdated`                  | `container.updatedAt` |

## 已修复问题（2025-03-07）

1. **备货单号为空**：后端 `enrichContainersList` 未返回 `orderNumber`，表头 `orderNumber` 无数据。已改为在 enrich 结果中增加 `orderNumber: orderInfo?.orderNumber ?? firstOrderNumber ?? null`，并让 `enrichSingleContainer` 返回 `firstOrderNumber` 供列表使用。
2. **修正ETA 列**：列表接口未返回 `portOperations`，前端 `getEtaCorrection(row)` 依赖 `row.portOperations` 导致始终为空。后端已提供 `etaCorrection`，前端改为优先使用 `row.etaCorrection`，无则再走 `getEtaCorrection(row)`。

## 前端格式化说明

- 出运日期：`formatShipmentDate(row.actualShipDate || row.createdAt)`
- 物流状态：`getLogisticsStatusText(row)`（依赖 `logisticsStatus`、`currentPortType`）
- 预计到港 / 实际到港 / 修正ETA / 最后更新：`formatDate(...)` 日期格式化

---

## 如何核对某条列表记录与数据库是否一致

1. **调用核对接口**（与列表使用的 enrich 逻辑完全一致）  
   ```http
   GET /api/v1/containers/{集装箱号}/list-row
   ```  
   例如：`GET http://localhost:3001/api/v1/containers/MRKU4744365/list-row`

2. **响应示例**  
   `{ "success": true, "data": { "containerNumber": "MRKU4744365", "actualShipDate": "2026-03-06T00:00:00.000Z", "orderNumber": "...", "logisticsStatus": "unloaded", "location": "仓库", "lastUpdated": "2026-03-07T00:45:00.000Z", ... } }`

3. **逐项对比**  
   - 用接口返回的 `data` 各字段与前端表格该行显示对比。  
   - 出运日期：看 `data.actualShipDate` 与前端「出运日期」是否同一天（前端用 `formatShipmentDate` 可能只显示日期部分）。  
   - 物流状态：看 `data.logisticsStatus`（如 `unloaded`）与前端「已卸柜」是否对应。  
   - 最后更新：看 `data.lastUpdated` 与前端「最后更新」时间是否一致。  
   - 若某列为空：检查 `data` 中对应字段是否为 `null`/`undefined` 或空字符串。

4. **与数据库直接对比（可选）**  
   - `data` 即该柜在列表接口里经过 enrich 后的单条结果，数据来源为：  
     `biz_containers` + 关联的 `biz_replenishment_orders`、`process_sea_freight`、`process_port_operations` 等。  
   - 若需与库表逐列核对，可按 `SHIPMENTS_TABLE_BINDING.md` 中「表列与后端字段对应」查对应表与字段，用 `container_number = 'MRKU4744365'` 查主表与关联表。
