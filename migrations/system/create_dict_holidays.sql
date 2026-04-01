-- Phase 2 Task 2: 节假日配置表
-- 创建时间：2026-04-01
-- 作者：刘志高

-- 1. 创建节假日字典表（PostgreSQL 语法）
CREATE TABLE IF NOT EXISTS dict_holidays (
  id SERIAL PRIMARY KEY,
  country_code VARCHAR(10) NOT NULL,
  holiday_date DATE NOT NULL,
  holiday_name VARCHAR(200) NOT NULL,
  is_recurring BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 添加索引优化查询性能
CREATE INDEX IF NOT EXISTS idx_country_date ON dict_holidays(country_code, holiday_date);
CREATE INDEX IF NOT EXISTS idx_date_range ON dict_holidays(holiday_date);

-- 添加表和字段注释（PostgreSQL 使用 COMMENT ON 语法）
COMMENT ON TABLE dict_holidays IS '节假日字典表 - 支持多国节假日配置';
COMMENT ON COLUMN dict_holidays.country_code IS '国家代码（如 US, CA）';
COMMENT ON COLUMN dict_holidays.holiday_date IS '节假日日期';
COMMENT ON COLUMN dict_holidays.holiday_name IS '节假日名称';
COMMENT ON COLUMN dict_holidays.is_recurring IS '是否每年重复';

-- 2. 插入示例数据（美国主要节假日）
INSERT INTO dict_holidays (country_code, holiday_date, holiday_name, is_recurring) VALUES
('US', '2026-01-01', 'New Year''s Day', TRUE),
('US', '2026-01-19', 'Martin Luther King Jr. Day', TRUE),
('US', '2026-02-16', 'Presidents'' Day', TRUE),
('US', '2026-05-25', 'Memorial Day', TRUE),
('US', '2026-07-04', 'Independence Day', TRUE),
('US', '2026-09-07', 'Labor Day', TRUE),
('US', '2026-10-12', 'Columbus Day', TRUE),
('US', '2026-11-11', 'Veterans Day', TRUE),
('US', '2026-11-26', 'Thanksgiving Day', TRUE),
('US', '2026-11-27', 'Day after Thanksgiving', TRUE),
('US', '2026-12-25', 'Christmas Day', TRUE),

-- 加拿大节假日
('CA', '2026-01-01', 'New Year''s Day', TRUE),
('CA', '2026-02-16', 'Family Day', TRUE),
('CA', '2026-04-03', 'Good Friday', TRUE),
('CA', '2026-05-25', 'Victoria Day', TRUE),
('CA', '2026-07-01', 'Canada Day', TRUE),
('CA', '2026-08-03', 'Civic Holiday', TRUE),
('CA', '2026-09-07', 'Labour Day', TRUE),
('CA', '2026-10-12', 'Thanksgiving Day', TRUE),
('CA', '2026-12-25', 'Christmas Day', TRUE),
('CA', '2026-12-26', 'Boxing Day', TRUE);

-- 3. 创建视图：支持按年份查询节假日
CREATE OR REPLACE VIEW v_holidays_by_year AS
SELECT 
  id,
  country_code,
  holiday_date,
  holiday_name,
  is_recurring,
  EXTRACT(YEAR FROM holiday_date) AS holiday_year,
  created_at,
  updated_at
FROM dict_holidays
ORDER BY country_code, holiday_date;

-- 4. 添加注释
COMMENT ON TABLE dict_holidays IS '节假日字典表 - 支持多国节假日配置';
COMMENT ON COLUMN dict_holidays.country_code IS '国家代码（如 US, CA）';
COMMENT ON COLUMN dict_holidays.holiday_date IS '节假日日期';
COMMENT ON COLUMN dict_holidays.holiday_name IS '节假日名称';
COMMENT ON COLUMN dict_holidays.is_recurring IS '是否每年重复';
