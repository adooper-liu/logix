-- =====================================================
-- 状态一致性修复SQL
-- 用途: 批量修复货柜状态为returned_empty
-- 生成时间: 2026-03-06
-- =====================================================

-- 1. 删除错误的表 (如果存在)
SELECT '1. 删除错误的表' as description;
DROP TABLE IF EXISTS process_empty_return CASCADE;

-- 2. 备份当前状态
SELECT '2. 备份当前状态' as description;
CREATE TABLE IF NOT EXISTS container_status_backup_20260306 AS
SELECT * FROM biz_containers;

-- 3. 更新有还箱记录但状态不是returned_empty的货柜
SELECT '3. 批量修复状态' as description;
UPDATE biz_containers c
SET logistics_status = 'returned_empty',
    updated_at = NOW()
WHERE EXISTS (
  SELECT 1 FROM process_empty_returns er
  WHERE er.container_number = c.container_number
    AND er.return_time IS NOT NULL
)
AND c.logistics_status != 'returned_empty';

-- 4. 显示修复的记录数
SELECT '4. 修复结果' as description;
SELECT 
  c.container_number,
  c.logistics_status as new_status,
  er.return_time
FROM biz_containers c
INNER JOIN process_empty_returns er ON c.container_number = er.container_number
WHERE er.return_time IS NOT NULL
ORDER BY c.container_number;

-- 5. 验证修复后的状态分布
SELECT '5. 修复后的状态分布' as description;
SELECT
  logistics_status,
  COUNT(*) as count
FROM biz_containers
GROUP BY logistics_status
ORDER BY logistics_status;

-- 6. 检查是否还有状态不一致的货柜 (应该为0)
SELECT '6. 验证状态一致性(应该为0)' as description;
SELECT
  COUNT(*) as inconsistent_count
FROM biz_containers c
WHERE EXISTS (
  SELECT 1 FROM process_empty_returns er
  WHERE er.container_number = c.container_number
    AND er.return_time IS NOT NULL
)
AND c.logistics_status != 'returned_empty';
