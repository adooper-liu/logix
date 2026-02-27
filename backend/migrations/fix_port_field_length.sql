-- ============================================================
-- 修复字段长度问题
-- 说明: 扩大 port_code 和 country 字段的长度以支持中文名称
--       这样可以确保 Excel 导入不会因为字段长度限制而失败
-- ============================================================

-- 1. 修改 dict_ports 表的 port_code 字段长度
ALTER TABLE dict_ports ALTER COLUMN port_code TYPE VARCHAR(50);

-- 2. 修改 dict_ports 表的 country 字段长度
ALTER TABLE dict_ports ALTER COLUMN country TYPE VARCHAR(50);

-- 3. 修改 dict_overseas_companies 表的 code 字段长度 (如果存在)
-- ALTER TABLE dict_overseas_companies ALTER COLUMN code TYPE VARCHAR(50);

-- 4. 修改 dict_shipping_companies 表的 code 字段长度 (如果存在)
-- ALTER TABLE dict_shipping_companies ALTER COLUMN code TYPE VARCHAR(50);

-- ============================================================
-- 修改说明
-- ============================================================
-- 原设计: port_code VARCHAR(10) - 只能存储简短的代码
-- 修改后: port_code VARCHAR(50) - 可以存储中文港口名称
--
-- 原设计: country VARCHAR(10) - 只能存储 2-3 字母的国家代码
-- 修改后: country VARCHAR(50) - 可以存储中文名称
--
-- 注意: 这是临时解决方案。理想情况下应该在导入前将
--       中文港口名称映射为标准化的 port_code(如 CNSHG、USLAX 等)
-- ============================================================
