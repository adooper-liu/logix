-- ============================================
-- 添加车队合作关系级别字段
-- ============================================
-- 创建日期：2026-03-26
-- 需求：车队选择优化方案 - Phase 2
-- 目的：明确定义车队关系类型，支持保底分配
-- ============================================

-- ① 添加 partnership_level 字段
ALTER TABLE dict_trucking_companies 
ADD COLUMN IF NOT EXISTS partnership_level VARCHAR(20) DEFAULT 'NORMAL';

-- ② 添加注释（PostgreSQL 使用 COMMENT ON）
COMMENT ON COLUMN dict_trucking_companies.partnership_level IS 
'合作关系级别：STRATEGIC=战略合作，CORE=核心，NORMAL=普通，TEMPORARY=临时';

-- ③ 初始化数据（将所有现有车队设置为 NORMAL）
UPDATE dict_trucking_companies 
SET partnership_level = 'NORMAL' 
WHERE partnership_level IS NULL;

-- ④ 可选：手动设置几个核心车队（示例）
-- UPDATE dict_trucking_companies 
-- SET partnership_level = 'CORE' 
-- WHERE company_code IN ('TRUCK_001', 'TRUCK_002');

-- ⑤ 验证
SELECT 
  company_code,
  company_name,
  daily_capacity,
  partnership_level,
  status
FROM dict_trucking_companies
ORDER BY partnership_level, company_code;
