-- 诊断费用明细问题
-- 检查 process_demurrage_records 表中的费用记录

-- 1. 查看最近的费用记录
SELECT 
  container_number,
  charge_type,
  charge_name,
  free_days,
  calculation_basis,
  calculation_mode,
  charge_start_date,
  charge_end_date,
  charge_days,
  charge_amount,
  currency,
  charge_status,
  computed_at
FROM process_demurrage_records
ORDER BY computed_at DESC
LIMIT 20;

-- 2. 检查特定货柜的费用明细（请替换 CONTAINER_NUMBER）
-- SELECT 
--   charge_type,
--   charge_name,
--   charge_amount,
--   calculation_mode,
--   charge_status
-- FROM process_demurrage_records
-- WHERE container_number = 'CONTAINER_NUMBER'
-- ORDER BY charge_type;

-- 3. 汇总每个货柜的总费用
SELECT 
  container_number,
  COUNT(*) as item_count,
  SUM(charge_amount) as total_amount,
  MAX(currency) as currency,
  MAX(charge_status) as status,
  MAX(computed_at) as last_computed
FROM process_demurrage_records
GROUP BY container_number
ORDER BY last_computed DESC
LIMIT 10;

-- 4. 检查是否有 Storage Charge 和 Demurrage & Detention Charge
SELECT 
  container_number,
  charge_name,
  charge_amount,
  calculation_mode
FROM process_demurrage_records
WHERE container_number IN (
  SELECT container_number 
  FROM process_demurrage_records 
  ORDER BY computed_at DESC 
  LIMIT 1
)
ORDER BY charge_type;
