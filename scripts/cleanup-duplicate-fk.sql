-- 清理脚本：删除重复的外键约束（只保留一个）

-- 1. 查看当前所有同名外键约束的详细信息
SELECT 
    conname AS constraint_name,
    conrelid::regclass AS table_name,
    oid::text AS constraint_oid
FROM pg_constraint
WHERE conname = 'fk_trucking_company'
AND contype = 'f'  -- 外键类型
ORDER BY conrelid::regclass::text;

-- 2. 如果要删除重复的约束，取消下面的注释并执行
-- 注意：只保留每组中的一个约束

-- 删除 dict_trucking_port_mapping 的重复外键（保留第一个）
-- ALTER TABLE dict_trucking_port_mapping DROP CONSTRAINT IF EXISTS fk_trucking_company;
-- ALTER TABLE dict_trucking_port_mapping ADD CONSTRAINT fk_trucking_company
--     FOREIGN KEY (trucking_company_id) REFERENCES dict_trucking_companies(company_code)
--     ON DELETE CASCADE ON UPDATE CASCADE;

-- 删除 dict_warehouse_trucking_mapping 的重复外键（保留第一个）
-- ALTER TABLE dict_warehouse_trucking_mapping DROP CONSTRAINT IF EXISTS fk_trucking_company;
-- ALTER TABLE dict_warehouse_trucking_mapping ADD CONSTRAINT fk_trucking_company
--     FOREIGN KEY (trucking_company_id) REFERENCES dict_trucking_companies(company_code)
--     ON DELETE CASCADE ON UPDATE CASCADE;
