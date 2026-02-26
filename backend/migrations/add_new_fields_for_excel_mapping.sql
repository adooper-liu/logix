-- 新增Excel映射所需字段
-- Migration SQL for Excel Field Mapping

-- 1. 海运表 (process_sea_freight) - 新增费用相关字段
ALTER TABLE process_sea_freight
ADD COLUMN IF NOT EXISTS freight_currency VARCHAR(10),  -- 海运费币种
ADD COLUMN IF NOT EXISTS standard_freight_amount DECIMAL(10,2);  -- 标准海运费金额

-- 2. 港口操作表 (process_port_operations) - 新增免费期相关字段
ALTER TABLE process_port_operations
ADD COLUMN IF NOT EXISTS free_storage_days INT,  -- 免堆期(天)
ADD COLUMN IF NOT EXISTS free_detention_days INT,  -- 场内免箱期(天)
ADD COLUMN IF NOT EXISTS free_off_terminal_days INT;  -- 场外免箱期(天)

-- 3. 货柜表 (biz_containers) - 新增装配件字段
ALTER TABLE biz_containers
ADD COLUMN IF NOT EXISTS requires_assembly BOOLEAN DEFAULT FALSE;  -- 是否装配件

-- 4. 还空箱表 (process_empty_returns) - 新增通知时间字段
ALTER TABLE process_empty_returns
ADD COLUMN IF NOT EXISTS notification_return_date DATE,  -- 通知取空日期
ADD COLUMN IF NOT EXISTS notification_return_time TIMESTAMP;  -- 取空时间

-- 添加字段注释
COMMENT ON COLUMN process_sea_freight.freight_currency IS '海运费币种 (USD/CNY/EUR等)';
COMMENT ON COLUMN process_sea_freight.standard_freight_amount IS '标准海运费金额';
COMMENT ON COLUMN process_port_operations.free_storage_days IS '免堆期(天) - 货物在码头免费存放天数';
COMMENT ON COLUMN process_port_operations.free_detention_days IS '场内免箱期(天) - 集装箱在码头免费使用天数';
COMMENT ON COLUMN process_port_operations.free_off_terminal_days IS '场外免箱期(天) - 集装箱离开码头后免费使用天数';
COMMENT ON COLUMN biz_containers.requires_assembly IS '是否装配件';
COMMENT ON COLUMN process_empty_returns.notification_return_date IS '通知取空日期';
COMMENT ON COLUMN process_empty_returns.notification_return_time IS '取空时间';
