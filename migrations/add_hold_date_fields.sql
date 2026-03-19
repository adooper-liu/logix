-- 添加滞留日期字段到 process_port_operations 表
-- 用于记录海关、船公司、码头滞留/放行时间
-- 对应飞驼状态码：CUIP(海关滞留)、SRHD(船公司滞留)、TMHD(码头滞留)、PASS(海关放行)、TMPS(码头放行)

ALTER TABLE process_port_operations
ADD COLUMN IF NOT EXISTS customs_hold_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS carrier_hold_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS terminal_hold_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS customs_release_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS terminal_release_date TIMESTAMP;

COMMENT ON COLUMN process_port_operations.customs_hold_date IS '海关滞留日期';
COMMENT ON COLUMN process_port_operations.carrier_hold_date IS '船公司滞留日期';
COMMENT ON COLUMN process_port_operations.terminal_hold_date IS '码头滞留日期';
COMMENT ON COLUMN process_port_operations.customs_release_date IS '海关放行日期';
COMMENT ON COLUMN process_port_operations.terminal_release_date IS '码头放行日期';
