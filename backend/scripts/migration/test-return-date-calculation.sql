-- =====================================================
-- 还箱日计算算法 - 测试数据准备脚本
-- =====================================================
-- 用途：为单元测试和集成测试准备车队还箱档期数据
-- 执行环境：开发数据库
-- =====================================================

-- ① 清理旧测试数据
-- =====================================================
DELETE FROM ext_trucking_return_slot_occupancy 
WHERE trucking_company_id IN ('TRUCK_TEST_001', 'TRUCK_TEST_002');

-- ② 插入测试车队（如不存在）
-- =====================================================
INSERT INTO dict_trucking_companies 
(company_code, company_name, has_yard, daily_capacity, daily_return_capacity)
VALUES 
('TRUCK_TEST_001', 'Test Trucking Company A', true, 20, 20),
('TRUCK_TEST_002', 'Test Trucking Company B', false, 15, 15)
ON CONFLICT (company_code) DO UPDATE SET
  company_name = EXCLUDED.company_name,
  has_yard = EXCLUDED.has_yard,
  daily_capacity = EXCLUDED.daily_capacity,
  daily_return_capacity = EXCLUDED.daily_return_capacity;

-- =====================================================
-- 场景 A：Drop off - 卸柜日当天有能力
-- =====================================================
-- 预期结果：还箱日 = 卸柜日（当天还箱）
-- 测试目的：验证 Step 1 优先级

INSERT INTO ext_trucking_return_slot_occupancy 
(trucking_company_id, slot_date, planned_count, capacity, remaining)
VALUES 
('TRUCK_TEST_001', '2026-03-28', 5, 10, 5),  -- ✅ 有能力
('TRUCK_TEST_001', '2026-03-29', 8, 10, 2);  -- 也有能力

-- =====================================================
-- 场景 B：Drop off - 卸柜日没能力，卸 +1 有能力
-- =====================================================
-- 预期结果：还箱日 = 卸柜日 + 1（次日还箱）
-- 测试目的：验证 Step 2 优先级

UPDATE ext_trucking_return_slot_occupancy 
SET planned_count = 10, remaining = 0  -- ❌ 已满
WHERE trucking_company_id = 'TRUCK_TEST_001' 
  AND slot_date = '2026-03-28';

-- =====================================================
-- 场景 C：Drop off - 两天都没能力，需要顺延
-- =====================================================
-- 预期结果：还箱日 = 卸柜日 + 2（第三天还箱）
-- 测试目的：验证 Step 3 优先级

UPDATE ext_trucking_return_slot_occupancy 
SET planned_count = 10, remaining = 0  -- ❌ 已满
WHERE trucking_company_id = 'TRUCK_TEST_001' 
  AND slot_date = '2026-03-29';

INSERT INTO ext_trucking_return_slot_occupancy 
(trucking_company_id, slot_date, planned_count, capacity, remaining)
VALUES 
('TRUCK_TEST_001', '2026-03-30', 3, 10, 7);  -- ✅ 有能力

-- =====================================================
-- 场景 D：Live load - 能力不足需调整卸柜日
-- =====================================================
-- 预期结果：还箱日 = 卸柜日 + 1，同时调整卸柜日
-- 测试目的：验证 Live load 模式反向修正逻辑

-- 先恢复数据
UPDATE ext_trucking_return_slot_occupancy 
SET planned_count = 5, remaining = 5
WHERE trucking_company_id = 'TRUCK_TEST_001' 
  AND slot_date IN ('2026-03-28', '2026-03-29');

-- 设置 2026-03-28 已满
UPDATE ext_trucking_return_slot_occupancy 
SET planned_count = 10, remaining = 0
WHERE trucking_company_id = 'TRUCK_TEST_001' 
  AND slot_date = '2026-03-28';

-- =====================================================
-- 场景 E：超过最晚还箱日
-- =====================================================
-- 预期结果：找不到可用日期，返回原日期或 null
-- 测试目的：验证 lastReturnDate 红线约束

UPDATE ext_trucking_return_slot_occupancy 
SET planned_count = 10, remaining = 0
WHERE trucking_company_id = 'TRUCK_TEST_001' 
  AND slot_date IN ('2026-03-28', '2026-03-29', '2026-03-30');

-- =====================================================
-- 场景 F：无占用记录（使用车队默认能力）
-- =====================================================
-- 预期结果：使用 dailyReturnCapacity 判断
-- 测试目的：验证回退逻辑

DELETE FROM ext_trucking_return_slot_occupancy 
WHERE trucking_company_id = 'TRUCK_TEST_001' 
  AND slot_date >= '2026-04-01';

-- =====================================================
-- 场景 G：连续 14 天满载（极端情况）
-- =====================================================
-- 预期结果：返回第 14 天或 null
-- 测试目的：验证最坏情况处理

INSERT INTO ext_trucking_return_slot_occupancy 
(trucking_company_id, slot_date, planned_count, capacity, remaining)
SELECT 
  'TRUCK_TEST_001',
  generate_series('2026-04-01'::date, '2026-04-14'::date, '1 day'::interval)::date,
  10,  -- planned_count
  10,  -- capacity
  0    -- remaining
ON CONFLICT (trucking_company_id, slot_date) DO UPDATE SET
  planned_count = 10,
  capacity = 10,
  remaining = 0;

-- =====================================================
-- 验证查询 - 查看测试数据状态
-- =====================================================
SELECT 
  trucking_company_id,
  slot_date,
  planned_count,
  capacity,
  remaining,
  CASE 
    WHEN planned_count >= capacity THEN '❌ 已满'
    ELSE '✅ 有能力'
  END as status,
  TO_CHAR(slot_date, 'YYYY-MM-DD Dy') as date_str
FROM ext_trucking_return_slot_occupancy
WHERE trucking_company_id = 'TRUCK_TEST_001'
ORDER BY slot_date;

-- =====================================================
-- 使用指南
-- =====================================================
/*

# 执行测试数据脚本
psql -h localhost -U postgres -d logix -f scripts/test-return-date-calculation.sql

# 运行单元测试
npm test -- intelligentScheduling.service.return-date.test.ts

# 查看测试结果
npm test -- intelligentScheduling.service.return-date.test.ts --verbose

# 清理测试数据
DELETE FROM ext_trucking_return_slot_occupancy 
WHERE trucking_company_id IN ('TRUCK_TEST_001', 'TRUCK_TEST_002');

# 切换到不同场景
-- 场景 A: 执行场景 A 的 INSERT 语句
-- 场景 B: 执行场景 B 的 UPDATE 语句
-- 场景 C: 执行场景 C 的 UPDATE + INSERT 语句
-- ...以此类推

*/

-- =====================================================
-- 性能测试数据（可选）
-- =====================================================
-- 生成 30 天的测试数据用于性能分析

INSERT INTO ext_trucking_return_slot_occupancy 
(trucking_company_id, slot_date, planned_count, capacity, remaining)
SELECT 
  'TRUCK_TEST_002',
  generate_series('2026-03-28'::date, '2026-04-26'::date, '1 day'::interval)::date,
  FLOOR(RANDOM() * 15)::int,  -- 随机 planned_count
  15,  -- capacity
  15 - FLOOR(RANDOM() * 15)::int  -- remaining
ON CONFLICT (trucking_company_id, slot_date) DO UPDATE SET
  planned_count = EXCLUDED.planned_count,
  capacity = EXCLUDED.capacity,
  remaining = EXCLUDED.remaining;

-- 查看性能测试数据统计
SELECT 
  trucking_company_id,
  COUNT(*) as total_days,
  AVG(planned_count) as avg_planned,
  AVG(capacity) as avg_capacity,
  AVG(remaining) as avg_remaining,
  MIN(slot_date) as min_date,
  MAX(slot_date) as max_date
FROM ext_trucking_return_slot_occupancy
WHERE trucking_company_id = 'TRUCK_TEST_002'
GROUP BY trucking_company_id;
