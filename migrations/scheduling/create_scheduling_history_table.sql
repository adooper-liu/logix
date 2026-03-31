-- =====================================================
-- 排产历史记录表
-- Scheduling History Records
-- =====================================================
-- 功能：记录每次排产确认的完整历史
-- 用途：
-- 1. 追溯排产决策过程
-- 2. 对比不同时期的排产方案
-- 3. 分析排产优化效果
-- 4. 审计排产操作记录
-- =====================================================

-- 1. 创建排产历史记录表
CREATE TABLE IF NOT EXISTS hist_scheduling_records (
    id SERIAL PRIMARY KEY,
    
    -- 业务主键
    container_number VARCHAR(50) NOT NULL,
    scheduling_version INT NOT NULL DEFAULT 1,  -- 版本号（同一货柜多次排产递增）
    
    -- 排产基本信息
    scheduling_mode VARCHAR(20) NOT NULL,        -- 'MANUAL' | 'AUTO' | 'BATCH'
    strategy VARCHAR(20) NOT NULL,               -- 'Direct' | 'Drop off' | 'Expedited'
    
    -- 排产日期信息
    planned_customs_date DATE,                   -- 计划报关日
    planned_pickup_date DATE,                    -- 计划提柜日
    planned_delivery_date DATE,                  -- 计划送仓日
    planned_unload_date DATE,                    -- 计划卸柜日
    planned_return_date DATE,                    -- 计划还箱日
    
    -- 实际执行日期（后续更新）
    actual_pickup_date DATE,                     -- 实际提柜日
    actual_delivery_date DATE,                   -- 实际送仓日
    actual_unload_date DATE,                     -- 实际卸柜日
    actual_return_date DATE,                     -- 实际还箱日
    
    -- 资源信息
    warehouse_code VARCHAR(50),                  -- 仓库代码
    warehouse_name VARCHAR(100),                 -- 仓库名称
    trucking_company_code VARCHAR(50),           -- 车队代码
    trucking_company_name VARCHAR(100),          -- 车队名称
    
    -- 费用信息（排产时的预估费用）
    total_cost DECIMAL(12,2),                    -- 总费用
    demurrage_cost DECIMAL(12,2),                -- 滞港费
    detention_cost DECIMAL(12,2),                -- 滞箱费
    storage_cost DECIMAL(12,2),                  -- 堆存费
    yard_storage_cost DECIMAL(12,2),             -- 外部堆场费
    transportation_cost DECIMAL(12,2),           -- 运输费
    handling_cost DECIMAL(12,2),                 -- 操作费
    currency VARCHAR(10) DEFAULT 'USD',
    
    -- 免费期信息
    last_free_date DATE,                         -- 最晚提柜日
    last_return_date DATE,                       -- 最晚还箱日
    remaining_free_days INT,                     -- 剩余免费天数
    
    -- 档期信息
    warehouse_occupancy_rate DECIMAL(5,2),       -- 仓库占用率（排产时）
    trucking_occupancy_rate DECIMAL(5,2),        -- 车队占用率（排产时）
    
    -- 备选方案（JSON 格式存储其他可行方案）
    alternative_solutions JSONB,                 -- [{strategy, pickupDate, totalCost, ...}]
    
    -- 操作信息
    operated_by VARCHAR(50),                     -- 操作人（用户名/系统）
    operated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- 操作时间
    operation_type VARCHAR(20) DEFAULT 'CREATE', -- 'CREATE' | 'UPDATE' | 'CANCEL'
    
    -- 状态
    scheduling_status VARCHAR(20) DEFAULT 'CONFIRMED',  -- 'CONFIRMED' | 'CANCELLED' | 'SUPERSEDED'
    
    -- 备注
    remarks TEXT,
    
    -- 审计字段
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- 索引
    CONSTRAINT unique_container_version UNIQUE (container_number, scheduling_version)
);

-- 2. 创建索引
CREATE INDEX idx_scheduling_history_container ON hist_scheduling_records(container_number);
CREATE INDEX idx_scheduling_history_operated_at ON hist_scheduling_records(operated_at);
CREATE INDEX idx_scheduling_history_warehouse ON hist_scheduling_records(warehouse_code);
CREATE INDEX idx_scheduling_history_trucking ON hist_scheduling_records(trucking_company_code);
CREATE INDEX idx_scheduling_history_status ON hist_scheduling_records(scheduling_status);
CREATE INDEX idx_scheduling_history_strategy ON hist_scheduling_records(strategy);

-- 3. 创建注释
COMMENT ON TABLE hist_scheduling_records IS '排产历史记录表 - 记录每次排产确认的完整方案';
COMMENT ON COLUMN hist_scheduling_records.container_number IS '货柜号';
COMMENT ON COLUMN hist_scheduling_records.scheduling_version IS '排产版本号（同一货柜多次排产递增）';
COMMENT ON COLUMN hist_scheduling_records.scheduling_mode IS '排产模式：MANUAL(手动) | AUTO(自动) | BATCH(批量)';
COMMENT ON COLUMN hist_scheduling_records.strategy IS '排产策略：Direct | Drop off | Expedited';
COMMENT ON COLUMN hist_scheduling_records.alternative_solutions IS '备选方案（JSON 数组）';
COMMENT ON COLUMN hist_scheduling_records.scheduling_status IS '排产状态：CONFIRMED(已确认) | CANCELLED(已取消) | SUPERSEDED(已被新版本替代)';

-- 4. 创建视图：最新排产记录
CREATE OR REPLACE VIEW v_latest_scheduling AS
SELECT DISTINCT ON (container_number)
    container_number,
    scheduling_version,
    strategy,
    planned_pickup_date,
    planned_delivery_date,
    planned_unload_date,
    planned_return_date,
    warehouse_code,
    trucking_company_code,
    total_cost,
    scheduling_status,
    operated_at
FROM hist_scheduling_records
WHERE scheduling_status != 'CANCELLED'
ORDER BY container_number, scheduling_version DESC;

COMMENT ON VIEW v_latest_scheduling IS '最新排产记录视图（每个货柜的最新有效排产）';

-- 5. 创建函数：自动递增版本号
CREATE OR REPLACE FUNCTION increment_scheduling_version()
RETURNS TRIGGER AS $$
DECLARE
    max_version INT;
BEGIN
    SELECT COALESCE(MAX(scheduling_version), 0) INTO max_version
    FROM hist_scheduling_records
    WHERE container_number = NEW.container_number;
    
    NEW.scheduling_version := max_version + 1;
    
    -- 将旧记录标记为 SUPERSEDED
    UPDATE hist_scheduling_records
    SET scheduling_status = 'SUPERSEDED',
        updated_at = CURRENT_TIMESTAMP
    WHERE container_number = NEW.container_number
      AND scheduling_status = 'CONFIRMED';
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. 创建触发器：自动递增版本号
CREATE TRIGGER trg_increment_scheduling_version
BEFORE INSERT ON hist_scheduling_records
FOR EACH ROW
EXECUTE FUNCTION increment_scheduling_version();

-- 7. 初始化数据（可选）：从现有排产数据导入历史记录
-- INSERT INTO hist_scheduling_records (
--     container_number,
--     scheduling_version,
--     scheduling_mode,
--     strategy,
--     planned_pickup_date,
--     planned_delivery_date,
--     planned_unload_date,
--     planned_return_date,
--     warehouse_code,
--     trucking_company_code,
--     total_cost,
--     operated_by,
--     operated_at,
--     scheduling_status,
--     remarks
-- )
-- SELECT 
--     tt.container_number,
--     1,
--     'AUTO',
--     COALESCE(tt.unload_mode_plan, 'Direct'),
--     tt.planned_pickup_date,
--     tt.planned_delivery_date,
--     wo.planned_unload_date,
--     er.planned_return_date,
--     wo.warehouse_id,
--     tt.trucking_company_id,
--     NULL,
--     'SYSTEM',
--     tt.created_at,
--     'CONFIRMED',
--     'Migration from existing data'
-- FROM process_trucking_transport tt
-- LEFT JOIN process_warehouse_operations wo ON tt.container_number = wo.container_number
-- LEFT JOIN process_empty_return er ON tt.container_number = er.container_number
-- WHERE tt.planned_pickup_date IS NOT NULL;
