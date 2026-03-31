-- ============================================================
-- 增加 last_free_date_mode 字段，区分 last_free_date 来源
-- actual: 按 ATA/实际卸船日计算；forecast: 按 ETA 预测
-- 用于：forecast 写入的柜在 ATA 到港后触发 actual 重算覆盖
-- ============================================================

ALTER TABLE process_port_operations
ADD COLUMN IF NOT EXISTS last_free_date_mode VARCHAR(20);

COMMENT ON COLUMN process_port_operations.last_free_date_mode IS 'last_free_date 计算模式: actual=按ATA/卸船, forecast=按ETA预测';
