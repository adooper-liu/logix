# LogiX 数据库、实体、前后端字段与命名一致性报告

本文档对照开发规范，对数据库、实体、前后端 API 与 Excel 导入的命名与一致性做核查结论，并记录已修复项与建议。

---

## 一、规范要求速览

| 层级 | 规范要求 |
|------|----------|
| 数据库 | 表名：前缀 + snake_case（biz_/process_/dict_/ext_）；字段名：snake_case |
| 实体 | 属性 camelCase；`@Column({ name: 'snake_case' })` 与表一致；表名与 DB 一致 |
| API（前后端通信） | 规范建议与数据库对齐使用 snake_case；部分接口当前使用 camelCase（见下） |
| Excel 映射 | table / field 必须为数据库完整表名与字段名（snake_case） |

---

## 二、一致性核查结果

### 2.1 数据库 ↔ 实体

- **结论：一致。**
- 抽样：`biz_containers`、`biz_replenishment_orders`、`process_port_operations`、`process_sea_freight`、`process_trucking_transport`、`process_warehouse_operations`、`process_empty_return`。
- 实体表名与 `backend/03_create_tables.sql` 一致；所有抽查字段均为实体 camelCase + `name: 'snake_case'` 与库表一一对应。

### 2.2 Excel 导入映射

- **结论：符合规范。**
- `frontend/src/views/import/ExcelImport.vue` 中：
  - `table` 使用完整表名：`biz_replenishment_orders`、`biz_containers`、`process_sea_freight`、`process_port_operations`、`process_trucking_transport`、`process_warehouse_operations`、`process_empty_return`。
  - `field` 使用数据库字段名 snake_case（如 `container_number`、`actual_ship_date`、`last_free_date`）。
- 后端 import 接口：前端传 snake_case 行数据，后端用 `snakeToCamel` 转成 camelCase 再写实体，与规范「API 对齐数据库、后端转实体」一致。

### 2.3 货柜 CRUD 接口（创建/更新）

- **结论：已统一为「API 请求体 snake_case、后端 snakeToCamel 后写实体」。**
- 实现：
  - 后端：`container.controller` 的 createContainer/updateContainer 对 `req.body` 先执行 `snakeToCamel`（`backend/src/utils/snakeToCamel.ts`），再 `repository.create/merge`，与 import 逻辑一致。
  - 前端：`ContainerService.createContainer/updateContainer` 在发请求前用 `camelToSnake`（`frontend/src/utils/camelToSnake.ts`）将 body 转为 snake_case，与数据库命名对齐。
- 约定：货柜创建/更新请求体字段使用 **snake_case**（如 `container_number`、`container_type_code`）；后端统一做 snake_case → camelCase 再写实体。

### 2.4 前端类型定义

- **结论：与实体命名一致，用于前端展示与请求体。**
- `frontend/src/types/container.ts` 中 `Container`、`ReplenishmentOrder`、`PortOperation`、`SeaFreight`、`TruckingTransport`、`WarehouseOperation`、`EmptyReturn` 等均为 camelCase，与后端实体属性一致；用于类型安全与发请求时与当前后端期望的 camelCase 一致。

### 2.5 已修复的不一致（代码错误）

1. **getContainers 搜索条件**
   - 问题：`container.orderNumber` 被用于搜索，但 `biz_containers` 表及 `Container` 实体均无 `order_number`/`orderNumber` 字段。
   - 修复：改为使用关联的备货单别名 `order`，条件改为 `order.orderNumber ILIKE :search`（与 `container.containerNumber` 并列）。文件：`backend/src/controllers/container.controller.ts`。

2. **enrichSingleContainer 中订单信息**
   - 问题：`container.orderNumber` 传入 `fetchOrderInfo`，但 `Container` 无该属性，导致订单信息始终为 null。
   - 修复：新增 `getFirstOrderNumberForContainer(containerNumber)`，按 `biz_replenishment_orders.container_number` 查第一个备货单号，再调用 `fetchOrderInfo`。文件：`backend/src/services/container.service.ts`。

---

## 三、表/实体对应速查（与 03_create_tables 一致）

| 表名 | 实体 | 说明 |
|------|------|------|
| biz_containers | Container | 无 order_number；关联 replenishmentOrders、seaFreight |
| biz_replenishment_orders | ReplenishmentOrder | 有 container_number FK |
| process_sea_freight | SeaFreight | 主键 bill_of_lading_number；无 container_number 列 |
| process_port_operations | PortOperation | 含 last_free_date 等 |
| process_trucking_transport | TruckingTransport | 主键 container_number |
| process_warehouse_operations | WarehouseOperation | 主键 container_number |
| process_empty_return | EmptyReturn | 主键 container_number |

---

## 四、建议与后续

- **新增 API**：请求体统一使用 **snake_case**（与数据库对齐）；后端在写实体前对 body 做 **snakeToCamel** 再 create/merge；前端在调用前对 payload 做 **camelToSnake** 再发送。工具：后端 `utils/snakeToCamel.ts`，前端 `utils/camelToSnake.ts`。
- **新增表/字段**：继续按「DB snake_case → 实体 camelCase + name → Excel/API 与 DB 对齐」执行。
- **定期核对**：修改 `03_create_tables.sql` 或实体时，同步检查 Excel 映射、相关 API 的请求/响应字段及本报告中的引用是否仍正确。
