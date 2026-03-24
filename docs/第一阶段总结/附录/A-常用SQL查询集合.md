# A-常用SQL查询集合

**创建日期**: 2026-03-23  
**用途**: 写 SQL 时快速参考

---

## 目录

1. [基础查询模板](#1-基础查询模板)
2. [货柜相关查询](#2-货柜相关查询)
3. [备货单相关查询](#3-备货单相关查询)
4. [统计查询](#4-统计查询)
5. [复杂关联查询](#5-复杂关联查询)
6. [数据验证查询](#6-数据验证查询)

---

## 1. 基础查询模板

### 分页查询

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

### 基础 CRUD

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

### 条件筛选

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

### 获取货柜列表（含关联数据）

```sql
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

### 按状态统计货柜数量

```sql
SELECT 
    logistics_status,
    COUNT(*) as count
FROM biz_containers
GROUP BY logistics_status
ORDER BY count DESC;
```

### 按目的港统计

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

### 查询即将到港的货柜

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

### 备货单及货柜列表

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

---

## 4. 统计查询

### 每日货柜统计

```sql
SELECT 
    DATE(created_at) as date,
    COUNT(*) as total_containers,
    COUNT(DISTINCT destination_port) as unique_ports
FROM biz_containers
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

---

## 5. 复杂关联查询

### 完整供应链查询

```sql
SELECT 
    c.container_number,
    c.logistics_status,
    o.order_number,
    o.customer_name,
    sf.vessel_name,
    sf.bl_number,
    po.port_name,
    po.ata,
    tt.trucking_company_name,
    wo.warehouse_name,
    wo.unloaded_date
FROM biz_containers c
LEFT JOIN biz_replenishment_orders o ON c.order_number = o.order_number
LEFT JOIN process_sea_freight sf ON c.container_number = sf.container_number
LEFT JOIN process_port_operations po ON c.container_number = po.container_number
LEFT JOIN process_trucking_transports tt ON c.container_number = tt.container_number
LEFT JOIN process_warehouse_operations wo ON c.container_number = wo.container_number
WHERE c.logistics_status != 'returned_empty'
ORDER BY c.created_at DESC;
```

---

## 6. 数据验证查询

### 检查缺失数据

```sql
-- 检查没有海运信息的货柜
SELECT c.container_number
FROM biz_containers c
LEFT JOIN process_sea_freight sf ON c.container_number = sf.container_number
WHERE sf.container_number IS NULL;

-- 检查重复的货柜号
SELECT container_number, COUNT(*)
FROM biz_containers
GROUP BY container_number
HAVING COUNT(*) > 1;
```

---

**文档版本**: v2.0 (精简版)  
**审查状态**: ✅ 已审查  
**备注**: 保留所有实用 SQL 示例，仅删除 emoji
