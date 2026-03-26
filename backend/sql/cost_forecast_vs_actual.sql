-- =====================================================
-- 成本预测 vs 实际对比表
-- Cost Forecast vs Actual Comparison Table
-- 
-- 用途：
-- 1. 追踪预计费用与实际费用的差异
-- 2. 分析成本优化效果
-- 3. 生成成本分析报告
-- 4. 审计费用变化历史
-- =====================================================

-- 创建成本预测对比表
CREATE TABLE IF NOT EXISTS ext_cost_forecast_vs_actual (
    -- 主键
    id SERIAL PRIMARY KEY,
    
    -- 柜号（核心业务键）
    container_number VARCHAR(20) NOT NULL,
    
    -- 预测信息
    forecast_pickup_date DATE NOT NULL,           -- 预测提柜日
    forecast_unload_date DATE NOT NULL,           -- 预测卸柜日
    forecast_strategy VARCHAR(20) NOT NULL,       -- 预测策略 (Direct/Drop off/Expedited)
    forecast_demurrage_cost NUMERIC(10,2) DEFAULT 0,   -- 预测滞港费
    forecast_detention_cost NUMERIC(10,2) DEFAULT 0,   -- 预测滞箱费
    forecast_storage_cost NUMERIC(10,2) DEFAULT 0,     -- 预测港口存储费
    forecast_yard_storage_cost NUMERIC(10,2) DEFAULT 0, -- 预测外部堆场费
    forecast_transportation_cost NUMERIC(10,2) DEFAULT 0, -- 预测运输费
    forecast_handling_cost NUMERIC(10,2) DEFAULT 0,     -- 预测操作费
    forecast_total_cost NUMERIC(10,2) NOT NULL DEFAULT 0, -- 预测总成本
    
    -- 实际信息（后续填充）
    actual_pickup_date DATE,                      -- 实际提柜日
    actual_unload_date DATE,                      -- 实际卸柜日
    actual_strategy VARCHAR(20),                  -- 实际策略
    actual_demurrage_cost NUMERIC(10,2) DEFAULT 0,     -- 实际滞港费
    actual_detention_cost NUMERIC(10,2) DEFAULT 0,     -- 实际滞箱费
    actual_storage_cost NUMERIC(10,2) DEFAULT 0,       -- 实际港口存储费
    actual_yard_storage_cost NUMERIC(10,2) DEFAULT 0,  -- 实际外部堆场费
    actual_transportation_cost NUMERIC(10,2) DEFAULT 0, -- 实际运输费
    actual_handling_cost NUMERIC(10,2) DEFAULT 0,      -- 实际操作费
    actual_total_cost NUMERIC(10,2) DEFAULT 0,         -- 实际总成本
    
    -- 差异分析
    cost_variance NUMERIC(10,2) GENERATED ALWAYS AS (actual_total_cost - forecast_total_cost) STORED,
    variance_percent NUMERIC(5,2) GENERATED ALWAYS AS (
        CASE 
            WHEN forecast_total_cost > 0 THEN ((actual_total_cost - forecast_total_cost) / forecast_total_cost * 100)
            ELSE 0
        END
    ) STORED,
    variance_reason TEXT,                         -- 差异原因说明
    
    -- 优化建议
    suggested_pickup_date DATE,                   -- 建议提柜日
    suggested_strategy VARCHAR(20),               -- 建议策略
    potential_savings NUMERIC(10,2),              -- 潜在节省金额
    
    -- 元数据
    warehouse_code VARCHAR(50),                   -- 仓库代码
    trucking_company_code VARCHAR(50),            -- 车队代码
    port_code VARCHAR(10),                        -- 港口代码
    country_code VARCHAR(10),                     -- 国家代码
    
    -- 时间戳
    forecast_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- 预测创建时间
    actual_updated_at TIMESTAMP,                             -- 实际更新时间
    
    -- 审计字段
    created_by VARCHAR(100),                      -- 创建人（系统/用户）
    updated_by VARCHAR(100),                      -- 更新人
    optimization_run_id VARCHAR(100),             -- 优化批次 ID
    
    -- 约束
    CONSTRAINT chk_container_number CHECK (container_number ~ '^[A-Z]{4}[0-9]{6,7}$'),
    CONSTRAINT chk_strategy CHECK (forecast_strategy IN ('Direct', 'Drop off', 'Expedited')),
    CONSTRAINT chk_actual_strategy CHECK (actual_strategy IN ('Direct', 'Drop off', 'Expedited'))
);

-- 创建索引（提升查询性能）
CREATE INDEX idx_cost_forecast_container ON ext_cost_forecast_vs_actual(container_number);
CREATE INDEX idx_cost_forecast_warehouse ON ext_cost_forecast_vs_actual(warehouse_code);
CREATE INDEX idx_cost_forecast_trucking ON ext_cost_forecast_vs_actual(trucking_company_code);
CREATE INDEX idx_cost_forecast_port ON ext_cost_forecast_vs_actual(port_code);
CREATE INDEX idx_cost_forecast_country ON ext_cost_forecast_vs_actual(country_code);
CREATE INDEX idx_cost_forecast_created_at ON ext_cost_forecast_vs_actual(forecast_created_at DESC);
CREATE INDEX idx_cost_forecast_variance ON ext_cost_forecast_vs_actual(cost_variance DESC);

-- 添加注释
COMMENT ON TABLE ext_cost_forecast_vs_actual IS '成本预测 vs 实际对比表 - 用于追踪预计费用与实际费用的差异';

COMMENT ON COLUMN ext_cost_forecast_vs_actual.container_number IS '柜号（核心业务键）';
COMMENT ON COLUMN ext_cost_forecast_vs_actual.forecast_pickup_date IS '预测提柜日';
COMMENT ON COLUMN ext_cost_forecast_vs_actual.forecast_unload_date IS '预测卸柜日';
COMMENT ON COLUMN ext_cost_forecast_vs_actual.forecast_strategy IS '预测策略 (Direct/Drop off/Expedited)';
COMMENT ON COLUMN ext_cost_forecast_vs_actual.forecast_total_cost IS '预测总成本';
COMMENT ON COLUMN ext_cost_forecast_vs_actual.actual_total_cost IS '实际总成本';
COMMENT ON COLUMN ext_cost_forecast_vs_actual.cost_variance IS '成本差异（实际 - 预测）';
COMMENT ON COLUMN ext_cost_forecast_vs_actual.variance_percent IS '差异百分比';
COMMENT ON COLUMN ext_cost_forecast_vs_actual.variance_reason IS '差异原因说明';
COMMENT ON COLUMN ext_cost_forecast_vs_actual.suggested_pickup_date IS '建议提柜日（成本优化推荐）';
COMMENT ON COLUMN ext_cost_forecast_vs_actual.suggested_strategy IS '建议策略';
COMMENT ON COLUMN ext_cost_forecast_vs_actual.potential_savings IS '潜在节省金额';

-- 创建视图：成本差异分析
CREATE OR REPLACE VIEW v_cost_variance_analysis AS
SELECT 
    container_number,
    warehouse_code,
    trucking_company_code,
    port_code,
    forecast_strategy,
    actual_strategy,
    forecast_total_cost,
    actual_total_cost,
    cost_variance,
    variance_percent,
    variance_reason,
    potential_savings,
    forecast_created_at,
    actual_updated_at,
    CASE 
        WHEN cost_variance > 0 THEN '超支'
        WHEN cost_variance < 0 THEN '节省'
        ELSE '持平'
    END as variance_status
FROM ext_cost_forecast_vs_actual
WHERE actual_total_cost IS NOT NULL;

-- 创建视图：成本优化效果统计
CREATE OR REPLACE VIEW v_cost_optimization_stats AS
SELECT 
    DATE(forecast_created_at) as forecast_date,
    COUNT(*) as total_containers,
    COUNT(DISTINCT warehouse_code) as warehouses_used,
    COUNT(DISTINCT trucking_company_code) as trucking_companies_used,
    AVG(forecast_total_cost) as avg_forecast_cost,
    AVG(actual_total_cost) as avg_actual_cost,
    SUM(cost_variance) as total_variance,
    AVG(variance_percent) as avg_variance_percent,
    SUM(potential_savings) as total_potential_savings,
    COUNT(CASE WHEN cost_variance < 0 THEN 1 END) as containers_with_savings,
    COUNT(CASE WHEN cost_variance > 0 THEN 1 END) as containers_over_budget
FROM ext_cost_forecast_vs_actual
WHERE actual_total_cost IS NOT NULL
GROUP BY DATE(forecast_created_at)
ORDER BY forecast_date DESC;

-- 示例数据插入
-- INSERT INTO ext_cost_forecast_vs_actual (
--     container_number,
--     forecast_pickup_date,
--     forecast_unload_date,
--     forecast_strategy,
--     forecast_total_cost,
--     actual_total_cost,
--     variance_reason,
--     suggested_pickup_date,
--     suggested_strategy,
--     potential_savings,
--     warehouse_code,
--     trucking_company_code,
--     port_code,
--     created_by
-- ) VALUES (
--     'TEST1234567',
--     '2026-03-25',
--     '2026-03-27',
--     'Drop off',
--     1500.00,
--     1650.00,
--     '实际卸柜延迟 2 天，导致堆场费增加',
--     '2026-03-24',
--     'Direct',
--     200.00,
--     'WH001',
--     'TRUCK001',
--     'USLAX',
--     'system'
-- );
