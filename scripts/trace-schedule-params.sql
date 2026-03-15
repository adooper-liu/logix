-- ============================================================
-- 智能排柜参数追踪：根据柜号查找所有排柜所用参数
-- 用法: psql -v container_number=MRSU3454770 -f scripts/trace-schedule-params.sql
-- 或: 将 MRSU3454770 替换为实际柜号
-- ============================================================

\set container_number 'MRSU3454770'

\echo '========== 1. 货柜基础信息 (biz_containers) =========='
SELECT container_number, bill_of_lading_number, container_type_code, logistics_status, schedule_status
FROM biz_containers WHERE container_number = :'container_number';

\echo ''
\echo '========== 2. 备货单 (biz_replenishment_orders) → sell_to_country / customer_code =========='
SELECT order_number, container_number, sell_to_country, customer_code, customer_name
FROM biz_replenishment_orders WHERE container_number = :'container_number';

\echo ''
\echo '========== 3. 客户 (biz_customers) → country 国家代码 =========='
SELECT cust.customer_code, cust.customer_name, cust.country, cust.customer_type_code
FROM biz_replenishment_orders o
LEFT JOIN biz_customers cust ON cust.customer_code = o.customer_code
WHERE o.container_number = :'container_number';

\echo ''
\echo '========== 4. 目的港操作 (process_port_operations) → port_code, ATA, ETA, last_free_date =========='
SELECT id, container_number, port_type, port_code, port_name,
       eta_dest_port, ata_dest_port, last_free_date
FROM process_port_operations
WHERE container_number = :'container_number' AND port_type = 'destination';

\echo ''
\echo '========== 5. 海运 (process_sea_freight) → ETA 备选 =========='
SELECT sf.bill_of_lading_number, sf.eta, sf.port_of_discharge
FROM biz_containers c
LEFT JOIN process_sea_freight sf ON c.bill_of_lading_number = sf.bill_of_lading_number
WHERE c.container_number = :'container_number';

\echo ''
\echo '========== 6. 国家代码 → 候选车队 (dict_trucking_port_mapping) =========='
SELECT tpm.country, tpm.port_code, tpm.trucking_company_id, tpm.trucking_company_name
FROM process_port_operations po
CROSS JOIN (SELECT country FROM biz_replenishment_orders o
            LEFT JOIN biz_customers cust ON cust.customer_code = o.customer_code
            WHERE o.container_number = :'container_number' LIMIT 1) cc
LEFT JOIN dict_trucking_port_mapping tpm ON tpm.port_code = po.port_code AND tpm.country = cc.country AND tpm.is_active = true
WHERE po.container_number = :'container_number' AND po.port_type = 'destination';

\echo ''
\echo '========== 7. 国家代码 → 候选仓库 (dict_warehouses + dict_warehouse_trucking_mapping) =========='
WITH country_code AS (
  SELECT COALESCE(cust.country, '') AS code
  FROM biz_replenishment_orders o
  LEFT JOIN biz_customers cust ON cust.customer_code = o.customer_code
  WHERE o.container_number = :'container_number' LIMIT 1
),
port_trucking AS (
  SELECT tpm.trucking_company_id
  FROM process_port_operations po, country_code cc
  JOIN dict_trucking_port_mapping tpm ON tpm.port_code = po.port_code AND tpm.country = cc.code AND tpm.is_active = true
  WHERE po.container_number = :'container_number' AND po.port_type = 'destination'
)
SELECT w.warehouse_code, w.warehouse_name, w.country
FROM dict_warehouses w
, country_code cc
WHERE w.country = cc.code AND w.status = 'ACTIVE'
  AND EXISTS (SELECT 1 FROM dict_warehouse_trucking_mapping wtm
              WHERE wtm.warehouse_code = w.warehouse_code AND wtm.country = cc.code AND wtm.is_active = true
                AND wtm.trucking_company_id IN (SELECT trucking_company_id FROM port_trucking))
LIMIT 20;

\echo ''
\echo '========== 8. 仓库日产能 (ext_warehouse_daily_occupancy) =========='
SELECT * FROM ext_warehouse_daily_occupancy
WHERE warehouse_code IN (
  SELECT warehouse_code FROM dict_warehouses w
  JOIN biz_replenishment_orders o ON 1=1
  LEFT JOIN biz_customers cust ON cust.customer_code = o.customer_code
  WHERE o.container_number = :'container_number' AND w.country = COALESCE(cust.country, '')
  LIMIT 5
)
ORDER BY date DESC LIMIT 10;

\echo ''
\echo '========== 9. 还箱 (process_empty_return) → last_return_date =========='
SELECT container_number, last_return_date FROM process_empty_return
WHERE container_number = :'container_number';

\echo ''
\echo '========== 10. 清关行 (dict_customs_brokers) 无则用 XX清关行 =========='
SELECT broker_code, broker_name, country FROM dict_customs_brokers
WHERE country = (SELECT COALESCE(cust.country, '') FROM biz_replenishment_orders o
                 LEFT JOIN biz_customers cust ON cust.customer_code = o.customer_code
                 WHERE o.container_number = :'container_number' LIMIT 1)
  AND status = 'ACTIVE';
