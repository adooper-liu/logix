-- ============================================================
-- 飞驼导入表：增加 raw_data_by_group 列
-- 按 Excel 分组存储原始数据，避免同名字段错位
-- ============================================================
-- raw_data_by_group 结构: { "1": {"MBL Number": "xxx", ...}, "7": {"状态代码": "a"}, "12": {"状态代码": "b"} }
-- 分组编号与文档 13-飞驼导出字段与LogiX映射表.md 一致
-- ============================================================

ALTER TABLE ext_feituo_import_table1
  ADD COLUMN IF NOT EXISTS raw_data_by_group JSONB;

ALTER TABLE ext_feituo_import_table2
  ADD COLUMN IF NOT EXISTS raw_data_by_group JSONB;

COMMENT ON COLUMN ext_feituo_import_table1.raw_data_by_group IS '按分组存储的原始数据，key 为分组编号(1-15)，避免同名字段错位';
COMMENT ON COLUMN ext_feituo_import_table2.raw_data_by_group IS '按分组存储的原始数据，key 为分组编号(1-17)，避免同名字段错位';
