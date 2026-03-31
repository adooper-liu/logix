-- ============================================
-- 任务 3.5 Phase 3 - 日历化每日能力配置
-- ============================================
-- 用途：支持通过日历设置每日能力，默认周末为 0，工作日为字典表中的 daily_capacity
-- 执行时间：部署前执行
-- 依赖表：ext_warehouse_daily_occupancy, ext_trucking_slot_occupancy
-- ============================================
-- 说明：请在 psql 命令行执行以获得友好提示，或在 GUI 工具中直接运行

-- ============================================
-- 1. 添加配置项：是否启用智能日历能力
-- ============================================
INSERT INTO dict_scheduling_config (config_key, config_value, description, created_at, updated_at)
VALUES
  ('enable_smart_calendar_capacity', 'true', '是否启用智能日历能力（周末=0，工作日=字典表值）', NOW(), NOW())
ON CONFLICT (config_key) DO UPDATE SET
  config_value = EXCLUDED.config_value,
  description = EXCLUDED.description,
  updated_at = NOW();

-- ============================================
-- 2. 添加配置项：周末定义
-- ============================================
INSERT INTO dict_scheduling_config (config_key, config_value, description, created_at, updated_at)
VALUES
  ('weekend_days', '6,0', '周末定义（0=周日，1=周一...6=周六，逗号分隔）', NOW(), NOW())
ON CONFLICT (config_key) DO UPDATE SET
  config_value = EXCLUDED.config_value,
  description = EXCLUDED.description,
  updated_at = NOW();

-- ============================================
-- 3. 添加配置项：工作日默认能力倍率
-- ============================================
INSERT INTO dict_scheduling_config (config_key, config_value, description, created_at, updated_at)
VALUES
  ('weekday_capacity_multiplier', '1.0', '工作日能力倍率（可用于节假日调整）', NOW(), NOW())
ON CONFLICT (config_key) DO UPDATE SET
  config_value = EXCLUDED.config_value,
  description = EXCLUDED.description,
  updated_at = NOW();

-- ============================================
-- 4. 更新现有档期表的 capacity 字段注释
-- ============================================
COMMENT ON COLUMN ext_warehouse_daily_occupancy.capacity IS 
'日产能容量（如果为 NULL 或 0，则根据日历规则从 dict_warehouses.daily_unload_capacity 推导）';

COMMENT ON COLUMN ext_trucking_slot_occupancy.capacity IS 
'日容量容量（如果为 NULL 或 0，则根据日历规则从 dict_trucking_companies.daily_capacity 推导）';

-- ============================================
-- 5. 示例数据：初始化未来 30 天的仓库档期（演示用）
-- ============================================
-- 注意：实际应用中应该通过服务自动创建，而不是硬编码 SQL

DO $$
DECLARE
  start_date DATE := CURRENT_DATE;
  day_of_week INTEGER;
  wh_record RECORD;
  capacity_value INTEGER;
BEGIN
  -- 遍历所有活跃仓库
  FOR wh_record IN 
    SELECT warehouse_code, daily_unload_capacity 
    FROM dict_warehouses 
    WHERE status = 'ACTIVE'
  LOOP
    -- 生成未来 30 天的记录
    FOR i IN 0..29 LOOP
      day_of_week := EXTRACT(DOW FROM (start_date + i));
      
      -- 判断是否为周末（0=周日，6=周六）
      IF day_of_week = 0 OR day_of_week = 6 THEN
        capacity_value := 0;  -- 周末产能为 0
      ELSE
        capacity_value := COALESCE(wh_record.daily_unload_capacity, 10);  -- 工作日使用字典表值
      END IF;
      
      -- 插入或更新档期记录（不指定 remaining，让数据库自动计算）
      INSERT INTO ext_warehouse_daily_occupancy (warehouse_code, date, planned_count, capacity, created_at, updated_at)
      VALUES (
        wh_record.warehouse_code,
        start_date + i,
        0,  -- planned_count
        capacity_value,  -- capacity
        NOW(),
        NOW()
      )
      ON CONFLICT (warehouse_code, date) DO UPDATE SET
        capacity = EXCLUDED.capacity,
        updated_at = NOW();
    END LOOP;
  END LOOP;
  
  RAISE NOTICE '已初始化未来 30 天的仓库档期数据';
END $$;

-- ============================================
-- 6. 示例数据：初始化未来 30 天的车队档期（演示用）
-- ============================================

DO $$
DECLARE
  start_date DATE := CURRENT_DATE;
  day_of_week INTEGER;
  trucking_record RECORD;
  capacity_value INTEGER;
BEGIN
  -- 遍历所有活跃车队
  FOR trucking_record IN 
    SELECT company_code, daily_capacity 
    FROM dict_trucking_companies 
    WHERE status = 'ACTIVE'
  LOOP
    -- 生成未来 30 天的记录
    FOR i IN 0..29 LOOP
      day_of_week := EXTRACT(DOW FROM (start_date + i));
      
      -- 判断是否为周末（0=周日，6=周六）
      IF day_of_week = 0 OR day_of_week = 6 THEN
        capacity_value := 0;  -- 周末容量为 0
      ELSE
        capacity_value := COALESCE(trucking_record.daily_capacity, 10);  -- 工作日使用字典表值
      END IF;
      
      -- 插入或更新档期记录（不指定 portCode、warehouseCode 和 remaining，作为全局容量）
      INSERT INTO ext_trucking_slot_occupancy (trucking_company_id, date, port_code, warehouse_code, planned_trips, capacity, created_at, updated_at)
      VALUES (
        trucking_record.company_code,
        start_date + i,
        NULL,  -- port_code
        NULL,  -- warehouse_code
        0,  -- planned_trips
        capacity_value,  -- capacity
        NOW(),
        NOW()
      )
      ON CONFLICT (trucking_company_id, date, port_code, warehouse_code) DO UPDATE SET
        capacity = EXCLUDED.capacity,
        updated_at = NOW();
    END LOOP;
  END LOOP;
  
  RAISE NOTICE '已初始化未来 30 天的车队档期数据';
END $$;

-- ============================================
-- 7. 验证配置项已添加
-- ============================================
SELECT config_key, config_value, description 
FROM dict_scheduling_config 
WHERE config_key IN (
  'enable_smart_calendar_capacity',
  'weekend_days',
  'weekday_capacity_multiplier'
)
ORDER BY config_key;

-- ============================================
-- 8. 验证档期数据已初始化
-- ============================================
-- 检查仓库档期
SELECT 
  w.warehouse_name,
  o.date,
  o.capacity,
  o.planned_count,
  o.remaining,
  EXTRACT(DOW FROM o.date) as day_of_week
FROM ext_warehouse_daily_occupancy o
JOIN dict_warehouses w ON o.warehouse_code = w.warehouse_code
WHERE o.date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '29 days'
ORDER BY o.date, w.warehouse_name;

-- 检查车队档期
SELECT 
  t.company_name,
  o.date,
  o.capacity,
  o.planned_trips,
  o.remaining,
  EXTRACT(DOW FROM o.date) as day_of_week
FROM ext_trucking_slot_occupancy o
JOIN dict_trucking_companies t ON o.trucking_company_id = t.company_code
WHERE o.date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '29 days'
  AND o.port_code IS NULL  -- 只查看全局容量
ORDER BY o.date, t.company_name;

-- ============================================
-- 完成提示
-- ============================================
-- 如果使用 psql 命令行执行，会显示以下提示：
-- ====================================
-- 任务 3.5 Phase 3 - 执行完成!
-- ====================================
-- 
-- 日历化能力配置逻辑：
-- ① 启用智能日历（enable_smart_calendar_capacity = true）:
--    系统自动根据日期计算每日能力
-- ② 周末定义（weekend_days = 6,0）:
--    周六、周日 capacity = 0
-- ③ 工作日能力计算:
--    capacity = daily_capacity × weekday_capacity_multiplier
-- ④ 手动覆盖:
--    可以直接修改 ext_warehouse_daily_occupancy.capacity
--    手动设置的值优先于日历规则
