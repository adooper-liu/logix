# 数据库主表关联关系说明

基于后端实体（TypeORM）整理，用于核对表间关联字段是否正确。

---

## 一、核心主表

| 表名 | 实体 | 主键 | 说明 |
|------|------|------|------|
| **biz_containers** | Container | `container_number` | 货柜主表 |
| **biz_replenishment_orders** | ReplenishmentOrder | `order_number` | 备货单主表 |
| **process_sea_freight** | SeaFreight | `bill_of_lading_number` | 海运/提单主表 |
| **process_port_operations** | PortOperation | `id` | 港口操作 |
| **process_trucking_transport** | TruckingTransport | `container_number` | 拖卡运输（一柜一条） |
| **process_warehouse_operations** | WarehouseOperation | `container_number` | 仓库操作（一柜一条） |
| **process_empty_return** | EmptyReturn | `container_number` | 还空箱（一柜一条） |
| **biz_container_skus** | ContainerSku | `id` (自增) | 货柜 SKU 明细 |

---

## 二、关联关系总览

```
                    ┌─────────────────────────┐
                    │  dict_container_types   │
                    │  (type_code)            │
                    └───────────▲─────────────┘
                                │ container_type_code
┌───────────────────────────────┼───────────────────────────────────┐
│                       biz_containers                               │
│  PK: container_number                                              │
│  FK: bill_of_lading_number ──────────────► process_sea_freight      │
└───▲───────────────────────────────────────────────────────────────┘
    │
    │ container_number（多方存 FK）
    ├──────────────────────────────────► biz_replenishment_orders.container_number
    ├──────────────────────────────────► process_port_operations.container_number
    ├──────────────────────────────────► process_trucking_transport.container_number
    ├──────────────────────────────────► process_warehouse_operations.container_number
    ├──────────────────────────────────► process_empty_return.container_number
    └──────────────────────────────────► biz_container_skus.container_number

biz_replenishment_orders:
  PK: order_number
  FK: main_order_number ──► order_number (自关联，主/子备货单)
  FK: container_number ──► biz_containers.container_number
  FK: customer_code ────► biz_customers.customer_code

biz_container_skus:
  FK: container_number ──► biz_containers.container_number
  FK: order_number ──────► biz_replenishment_orders.order_number
```

---

## 三、逐表关联字段（用于写 SQL / 核对数据）

### 1. biz_containers（货柜）

| 关联目标 | 本表字段 | 目标表 | 目标主键/字段 | 说明 |
|----------|----------|--------|----------------|------|
| 柜型 | `container_type_code` | dict_container_types | type_code | 必填 |
| 海运/提单 | **`bill_of_lading_number`** | process_sea_freight | bill_of_lading_number | 可为 NULL；**为空则列表拿不到提单号、目的港、海运出运日期等** |

**注意**：process_sea_freight 表**没有** container_number 字段，只能通过「柜表存提单号」关联。

---

### 2. biz_replenishment_orders（备货单）

| 关联目标 | 本表字段 | 目标表 | 目标主键/字段 | 说明 |
|----------|----------|--------|----------------|------|
| 货柜 | **`container_number`** | biz_containers | container_number | 可为 NULL；**为空则按柜号查不到备货单，列表备货单号、出运日期等为空** |
| 主订单（自关联） | `main_order_number` | biz_replenishment_orders | order_number | 主/子备货单关系，**表间关联请用 order_number，不要用 main_order_number** |
| 客户 | `customer_code` | biz_customers | customer_code | 可选 |

---

### 3. process_sea_freight（海运）

| 关联目标 | 说明 |
|----------|------|
| 货柜 | 由 **biz_containers.bill_of_lading_number** 指向本表 bill_of_lading_number；一对多（一个提单可对应多个柜） |

本表无 container_number 列，不要按柜号 JOIN 本表。

---

### 4. process_port_operations（港口操作）

| 关联目标 | 本表字段 | 目标表 | 说明 |
|----------|----------|--------|------|
| 货柜 | **`container_number`** | biz_containers | container_number → containerNumber |

一柜可有多条港口操作（起运港/途经港/目的港等），按 container_number 查。

**典型三条记录（出运港 / 中转港 / 目的港）**：

| port_type   | port_sequence | 到港判定字段说明 |
|-------------|---------------|------------------|
| origin      | 1             | 起运港，一般不填到港时间 |
| transit     | 2             | **已到中转港**：有任一非空即可 — `ata_dest_port`、`gate_in_time` 或 **`transit_arrival_date`**（途经港到达日期；实际数据常只填此项） |
| destination | 3             | **已到目的港**：`ata_dest_port` 非空；预计到港用 `eta_dest_port` |

状态机与「已到中转港」统计/列表均按上述字段判定，避免只填 `transit_arrival_date` 的柜子被漏计。

---

### 5. process_trucking_transport（拖卡运输）

| 关联目标 | 本表字段 | 目标表 | 说明 |
|----------|----------|--------|------|
| 货柜 | **`container_number`** | biz_containers | 主键即 container_number，一柜一条 |

---

### 6. process_warehouse_operations（仓库操作）

| 关联目标 | 本表字段 | 目标表 | 说明 |
|----------|----------|--------|------|
| 货柜 | **`container_number`** | biz_containers | 主键即 container_number，一柜一条 |
| 仓库 | `warehouse_id` | dict_warehouses(或等价) | warehouse_code |

---

### 7. process_empty_return（还空箱）

| 关联目标 | 本表字段 | 目标表 | 说明 |
|----------|----------|--------|------|
| 货柜 | **`container_number`** | biz_containers | 主键即 container_number，一柜一条 |

---

### 8. biz_container_skus（货柜 SKU 明细）

| 关联目标 | 本表字段 | 目标表 | 目标字段 | 说明 |
|----------|----------|--------|----------|------|
| 货柜 | **`container_number`** | biz_containers | container_number | 必填 |
| 备货单 | **`order_number`** | biz_replenishment_orders | order_number | 用 order_number 关联，不用 main_order_number |

---

## 四、与列表/统计相关的关键关联

- **柜 → 备货单**：`biz_replenishment_orders.container_number = biz_containers.container_number`  
  - 备货单表若不填 container_number，列表「备货单号、出运日期(订单)」等为空。
- **柜 → 海运**：`biz_containers.bill_of_lading_number = process_sea_freight.bill_of_lading_number`  
  - 柜表若不填 bill_of_lading_number，列表「提单号、目的港、出运日期(海运)」等为空。
- **柜 → 港口操作**：`process_port_operations.container_number = biz_containers.container_number`  
  - 用于预计到港、修正 ETA、实际到港、清关状态等。

---

## 五、实体文件位置

- `backend/src/entities/Container.ts`
- `backend/src/entities/ReplenishmentOrder.ts`
- `backend/src/entities/SeaFreight.ts`
- `backend/src/entities/PortOperation.ts`
- `backend/src/entities/TruckingTransport.ts`
- `backend/src/entities/WarehouseOperation.ts`
- `backend/src/entities/EmptyReturn.ts`
- `backend/src/entities/ContainerSku.ts`

修改表结构或关联时，请同步修改对应实体与本文档。
