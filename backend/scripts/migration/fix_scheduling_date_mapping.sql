-- =====================================================
-- 修复排产日期字段映射错误
-- Fix Scheduling Date Field Mapping Error
-- =====================================================
-- 问题：排产确认保存时，错误地将计划提柜日保存到 pickup_date 字段
-- 应该保存到 planned_pickup_date 字段
--
-- 修复逻辑：
-- 1. 将 pickup_date 中的计划日期数据迁移到 planned_pickup_date
-- 2. 清空 pickup_date（保留给实际提柜日使用）
-- 3. 保留 pickup_date_source 字段用于追踪数据来源
--
-- 创建时间：2026-03-27
-- =====================================================

-- 开始事务
BEGIN;

-- 步骤 1: 备份现有数据（可选，但强烈推荐）
-- CREATE TABLE process_trucking_transport_backup_20260327 AS 
-- SELECT * FROM process_trucking_transport;

-- 步骤 2: 将 pickup_date 中的计划日期迁移到 planned_pickup_date
-- 条件：planned_pickup_date 为空且 pickup_date 不为空
UPDATE process_trucking_transport
SET 
  planned_pickup_date = pickup_date,
  pickup_date = NULL,
  pickup_date_source = 'manual'  -- 标记为手工录入/排产系统生成
WHERE 
  planned_pickup_date IS NULL 
  AND pickup_date IS NOT NULL;

-- 步骤 3: 验证修复结果
SELECT 
  container_number,
  planned_pickup_date,
  pickup_date,
  pickup_date_source
FROM process_trucking_transport
WHERE planned_pickup_date IS NOT NULL
ORDER BY container_number
LIMIT 10;

-- 步骤 4: 提交事务
COMMIT;

-- =====================================================
-- 回滚脚本（如果需要）
-- =====================================================
-- BEGIN;
-- UPDATE process_trucking_transport
-- SET 
--   pickup_date = planned_pickup_date,
--   planned_pickup_date = NULL
-- WHERE 
--   planned_pickup_date IS NOT NULL 
--   AND pickup_date IS NULL
--   AND pickup_date_source = 'manual';
-- COMMIT;
-- =====================================================
