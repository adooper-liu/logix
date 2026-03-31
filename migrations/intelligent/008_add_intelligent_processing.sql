-- 添加智能处理相关表
-- Add intelligent processing related tables

-- 预警表
-- Alert table
CREATE TABLE IF NOT EXISTS ext_container_alerts (
    id SERIAL PRIMARY KEY,
    container_number VARCHAR(50) NOT NULL,
    type VARCHAR(20) NOT NULL,
    level VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    resolved BOOLEAN DEFAULT FALSE,
    resolved_by VARCHAR(50),
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建预警表索引
-- Create indexes for alert table
CREATE INDEX IF NOT EXISTS idx_ext_container_alerts_container_number ON ext_container_alerts(container_number);
CREATE INDEX IF NOT EXISTS idx_ext_container_alerts_resolved ON ext_container_alerts(resolved);
CREATE INDEX IF NOT EXISTS idx_ext_container_alerts_level ON ext_container_alerts(level);

-- 风险评估表
-- Risk assessment table
CREATE TABLE IF NOT EXISTS ext_container_risk_assessments (
    id SERIAL PRIMARY KEY,
    container_number VARCHAR(50) NOT NULL,
    risk_score DECIMAL(5,2) NOT NULL,
    risk_level VARCHAR(20) NOT NULL,
    risk_factors JSONB,
    recommendation TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建风险评估表索引
-- Create indexes for risk assessment table
CREATE INDEX IF NOT EXISTS idx_ext_container_risk_assessments_container_number ON ext_container_risk_assessments(container_number);
CREATE INDEX IF NOT EXISTS idx_ext_container_risk_assessments_risk_level ON ext_container_risk_assessments(risk_level);

-- 添加更新时间触发器函数
-- Add update time trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为预警表添加更新时间触发器
-- Add update time trigger for alert table
CREATE TRIGGER update_ext_container_alerts_updated_at
    BEFORE UPDATE ON ext_container_alerts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 为风险评估表添加更新时间触发器
-- Add update time trigger for risk assessment table
CREATE TRIGGER update_ext_container_risk_assessments_updated_at
    BEFORE UPDATE ON ext_container_risk_assessments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
