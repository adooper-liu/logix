# A-常用 SQL 查询集合 🔧

**创建日期**: 2026-03-23  
**用途**: 写 SQL 时快速参考

---

## 📋 目录

1. [基础查询模板](#1-基础查询模板)
2. [货柜相关查询](#2-货柜相关查询)
3. [备货单相关查询](#3-备货单相关查询)
4. [统计查询](#4-统计查询)
5. [复杂关联查询](#5-复杂关联查询)
6. [数据验证查询](#6-数据验证查询)

---

## 1. 基础查询模板

### 1.1 分页查询

```sql
-- 分页查询模板
SELECT * FROM table_name
ORDER BY created_at DESC
LIMIT 10 OFFSET 0;

-- 带条件的分页
SELECT * FROM biz_containers
WHERE logistics_status = 'in_transit'
ORDER BY eta_dest_port ASC
LIMIT 20 OFFSET (page - 1) * limit;
```

### 1.2 基础 CRUD

```sql
-- 插入
INSERT INTO table_name (column1, column2)
VALUES ('value1', 'value2');

-- 更新
UPDATE table_name
SET column1 = 'new_value'
WHERE id = 1;

-- 删除
DELETE FROM table_name
WHERE id = 1;
```

### 1.3 条件筛选

```sql
-- 多条件 AND
SELECT * FROM biz_containers
WHERE destination_port = 'USLAX'
  AND logistics_status = 'in_transit';

-- 多条件 OR
SELECT * FROM biz_containers
WHERE logistics_status = 'in_transit'
   OR logistics_status = 'at_port';

-- 范围查询
SELECT * FROM biz_containers
WHERE eta_dest_port BETWEEN '2026-01-01' AND '2026-01-31';

-- IN 查询
SELECT * FROM biz_containers
WHERE destination_port IN ('USLAX', 'USLGB', 'USNYC');
```

---

## 2. 货柜相关查询

### 2.1 获取货柜列表（含关联数据）

```sql
-- 获取货柜及关联的备货单、海运信息
SELECT 
    c.container_number,
    c.logistics_status,
    c.destination_port,
    c.eta_dest_port,
    c.ata_dest_port,
    o.order_number,
    o.customer_name,
    sf.vessel_name,
    sf.bl_number
FROM biz_containers c
LEFT JOIN biz_replenishment_orders o ON c.order_number = o.order_number
LEFT JOIN process_sea_freight sf ON c.container_number = sf.container_number
WHERE c.logistics_status IN ('shipped', 'in_transit', 'at_port')
ORDER BY c.eta_dest_port ASC;
```

### 2.2 按状态统计货柜数量

```sql
SELECT 
    logistics_status,
    COUNT(*) as count
FROM biz_containers
GROUP BY logistics_status
ORDER BY count DESC;
```

### 2.3 按目的港统计

```sql
SELECT 
    destination_port,
    COUNT(*) as total,
    SUM(CASE WHEN logistics_status = 'in_transit' THEN 1 ELSE 0 END) as in_transit_count,
    SUM(CASE WHEN logistics_status = 'at_port' THEN 1 ELSE 0 END) as at_port_count
FROM biz_containers
GROUP BY destination_port
ORDER BY total DESC;
```

### 2.4 查询即将到港的货柜

```sql
SELECT 
    c.container_number,
    c.destination_port,
    c.eta_dest_port,
    DATEDIFF('day', CURRENT_DATE, c.eta_dest_port) as days_until_arrival
FROM biz_containers c
WHERE c.logistics_status IN ('shipped', 'in_transit')
  AND c.eta_dest_port BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
ORDER BY c.eta_dest_port ASC;
```

---

## 3. 备货单相关查询

### 3.1 备货单及货柜列表

```sql
SELECT 
    o.order_number,
    o.customer_name,
    o.sell_to_country,
    o.total_boxes,
    o.total_volume,
    COUNT(c.container_number) as container_count
FROM biz_replenishment_orders o
LEFT JOIN biz_containers c ON o.order_number = c.order_number
GROUP BY o.order_number, o.customer_name, o.sell_to_country, o.total_boxes, o.total_volume
ORDER BY o.created_at DESC;
```

### 3.2 按客户统计备货单

```sql
SELECT 
    customer_name,
    COUNT(*) as order_count,
    SUM(total_boxes) as total_boxes,
    SUM(total_volume) as total_volume
FROM biz_replenishment_orders
GROUP BY customer_name
ORDER BY total_volume DESC;
```

### 3.3 主备货单关联查询

```sql
-- 查询主备货单及其子单
SELECT 
    main.order_number as main_order,
    main.customer_name,
    sub.order_number as sub_order,
    sub.total_boxes as sub_boxes
FROM biz_replenishment_orders main
LEFT JOIN biz_replenishment_orders sub ON main.order_number = sub.main_order_number
WHERE main.main_order_number IS NULL
ORDER BY main.order_number;
```

---

## 4. 统计查询

### 4.1 按到港统计（今日到港）

```sql
SELECT 
    c.container_number,
    c.destination_port,
    po.ata_dest_port
FROM biz_containers c
INNER JOIN process_port_operations po ON c.container_number = po.container_number
WHERE po.port_type = 'destination'
  AND po.ata_dest_port IS NOT NULL
  AND DATE(po.ata_dest_port) = CURRENT_DATE
  AND po.port_sequence = (
    SELECT MAX(po2.port_sequence)
    FROM process_port_operations po2
    WHERE po2.container_number = po.container_number
      AND po2.port_type = 'destination'
  );
```

### 4.2 按 ETA 逾期统计

```sql
SELECT 
    c.container_number,
    c.destination_port,
    c.eta_dest_port,
    DATEDIFF('day', c.eta_dest_port, CURRENT_DATE) as overdue_days
FROM biz_containers c
WHERE c.logistics_status IN ('shipped', 'in_transit')
  AND c.eta_dest_port < CURRENT_DATE
ORDER BY overdue_days DESC;
```

### 4.3 按计划提柜超期统计

```sql
SELECT 
    c.container_number,
    c.destination_port,
    tt.planned_pickup_date,
    DATEDIFF('day', tt.planned_pickup_date, CURRENT_DATE) as overdue_days
FROM biz_containers c
LEFT JOIN process_trucking_transport tt ON c.container_number = tt.container_number
WHERE tt.planned_pickup_date < CURRENT_DATE
  AND c.logistics_status NOT IN ('picked_up', 'unloaded', 'returned_empty')
ORDER BY overdue_days DESC;
```

### 4.4 最晚提柜日统计

```sql
SELECT 
    c.container_number,
    c.destination_port,
    po.last_free_date,
    DATEDIFF('day', CURRENT_DATE, po.last_free_date) as days_remaining
FROM biz_containers c
INNER JOIN process_port_operations po ON c.container_number = po.container_number
WHERE po.port_type = 'destination'
  AND po.last_free_date IS NOT NULL
  AND c.logistics_status NOT IN ('picked_up', 'unloaded', 'returned_empty')
ORDER BY days_remaining ASC;
```

---

## 5. 复杂关联查询

### 5.1 货柜完整信息（含所有流程表）

```sql
SELECT 
    c.container_number,
    c.logistics_status,
    c.destination_port,
    -- 海运信息
    sf.vessel_name,
    sf.bl_number,
    sf.eta as sea_freight_eta,
    -- 港口操作（目的港）
    po_dest.ata_dest_port,
    po_dest.eta_dest_port,
    po_dest.last_free_date,
    -- 拖卡运输
    tt.planned_pickup_date,
    tt.planned_delivery_date,
    -- 仓库操作
    wo.warehouse_code,
    wo.planned_unload_date,
    wo.actual_unload_date
FROM biz_containers c
LEFT JOIN process_sea_freight sf ON c.container_number = sf.container_number
LEFT JOIN process_port_operations po_dest 
    ON c.container_number = po_dest.container_number 
    AND po_dest.port_type = 'destination'
LEFT JOIN process_trucking_transport tt ON c.container_number = tt.container_number
LEFT JOIN process_warehouse_operations wo ON c.container_number = wo.container_number
WHERE c.container_number = 'CXDU1234567';
```

### 5.2 多港经停查询

```sql
SELECT 
    c.container_number,
    po.port_type,
    po.port_sequence,
    po.port_code,
    po.eta_dest_port,
    po.ata_dest_port
FROM biz_containers c
INNER JOIN process_port_operations po ON c.container_number = po.container_number
WHERE c.container_number = 'CXDU1234567'
ORDER BY po.port_sequence;
```

### 5.3 滞港费统计

```sql
SELECT 
    c.container_number,
    c.destination_port,
    po.last_free_date,
    dc.free_days,
    dc.daily_rate,
    dc.actual_days,
    dc.total_charge,
    dc.calculation_mode
FROM biz_containers c
INNER JOIN process_port_operations po 
    ON c.container_number = po.container_number 
    AND po.port_type = 'destination'
LEFT JOIN ext_demurrage_records dc ON c.container_number = dc.container_number
WHERE dc.total_charge > 0
ORDER BY dc.total_charge DESC;
```

---

## 6. 数据验证查询

### 6.1 检查孤立数据

```sql
-- 货柜关联的备货单不存在
SELECT c.container_number, c.order_number
FROM biz_containers c
WHERE c.order_number IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM biz_replenishment_orders o 
    WHERE o.order_number = c.order_number
  );

-- 海运信息关联的货柜不存在
SELECT sf.container_number
FROM process_sea_freight sf
WHERE NOT EXISTS (
    SELECT 1 FROM biz_containers c 
    WHERE c.container_number = sf.container_number
);
```

### 6.2 检查数据完整性

```sql
-- 缺少 ETA 的在途货柜
SELECT container_number, logistics_status
FROM biz_containers
WHERE logistics_status IN ('shipped', 'in_transit')
  AND eta_dest_port IS NULL;

-- 缺少目的港信息的货柜
SELECT container_number, logistics_status
FROM biz_containers
WHERE logistics_status IN ('shipped', 'in_transit', 'at_port')
  AND destination_port IS NULL;
```

### 6.3 检查重复数据

```sql
-- 重复的货柜号
SELECT container_number, COUNT(*) as count
FROM biz_containers
GROUP BY container_number
HAVING COUNT(*) > 1;

-- 重复的备货单号
SELECT order_number, COUNT(*) as count
FROM biz_replenishment_orders
GROUP BY order_number
HAVING COUNT(*) > 1;
```

---

## 📚 相关文档

- [附录 B-API 端点速查表](./B-API端点速查表.md)
- [附录 C-错误代码大全](./C-错误代码大全.md)
- [06-技术与开发规范](../06-技术与开发规范.md)

---

**返回**: [README](./README.md)
