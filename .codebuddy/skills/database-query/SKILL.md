---
name: database-query
description: Query and analyze PostgreSQL/TimescaleDB databases following LogiX schema. Use when writing SQL, analyzing container/port data, or debugging database issues.
---

# Database Query

## Schema Reference

以 `backend/03_create_tables.sql` 为准；项目速查见 `.cursor/rules/logix-project-map.mdc`。

### 表前缀与核心表

| 前缀 | 用途 | 核心表 |
|------|------|--------|
| dict_ | 字典 | dict_countries, dict_ports, dict_container_types, dict_customer_types, dict_warehouses |
| biz_ | 业务 | biz_containers, biz_replenishment_orders, biz_customers, biz_container_skus |
| process_ | 流程 | process_sea_freight, process_port_operations, process_trucking_transport, process_warehouse_operations, process_empty_return |
| ext_ | 扩展 | ext_container_status_events, ext_container_loading_records, ext_container_charges |

### 关联链

- `biz_replenishment_orders.container_number` → `biz_containers`
- `biz_containers.bill_of_lading_number` → `process_sea_freight`
- 流程表均通过 `container_number` 关联 `biz_containers`

### 命名规则

- 表名、字段名均为 **snake_case**
- 日期口径：出运日期用 `actual_ship_date`（备货单）或 `shipment_date`（海运），为空时按另一字段

## 常用查询模式

### 日期筛选（出运日期口径）

```sql
-- 按 actual_ship_date 或 shipment_date 筛选
WHERE (ro.actual_ship_date BETWEEN :startDate AND :endDate
   OR (ro.actual_ship_date IS NULL AND sf.shipment_date BETWEEN :startDate AND :endDate))
```

### 货柜与流程关联

```sql
SELECT c.container_number, c.logistics_status,
       po.ata_dest_port, po.last_free_date,
       sf.eta_dest_port
FROM biz_containers c
LEFT JOIN process_sea_freight sf ON c.bill_of_lading_number = sf.bill_of_lading_number
LEFT JOIN process_port_operations po ON c.container_number = po.container_number
WHERE ...
```

### 滞港费相关

- `process_port_operations.last_free_date`：免费期截止日
- 统计分类：expired / urgent / warning / normal / noLastFreeDate

## 注意事项

- 禁止临时 `UPDATE`/`INSERT` 修补数据；导入错误应删数据 → 修映射 → 重导
- 新增表/字段时先改 `03_create_tables.sql` 与实体，再改 API 与前端
