-- ============================================================================
-- 外键列命名不一致问题修复脚本
-- ============================================================================
-- 问题：containerNumber 和 container_number 列同时存在，导致数据冗余和维护困难
-- 解决方案：统一使用 containerNumber 作为外键列
-- ============================================================================

-- 步骤1：检查所有受影响的表
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'process_sea_freight',
    'process_port_operations',
    'process_trucking',
    'process_warehouse_operations',
    'process_empty_returns',
    'container_status_events',
    'container_charges'
  )
  AND column_name ILIKE '%container%'
ORDER BY table_name, column_name;

-- ============================================================================
-- 方案一：统一使用 containerNumber（推荐）
-- 优点：与主表主键命名一致，数据结构清晰
-- ============================================================================

-- 步骤2：为每个表删除 container_number 列（因为 containerNumber 已有数据）
-- 注意：执行前请先备份数据！

-- 2.1 process_port_operations
-- 删除外键约束
ALTER TABLE process_port_operations 
  DROP CONSTRAINT IF EXISTS "FK_8bd3a649de90bb7fb22408c81a1";

-- 删除冗余列
ALTER TABLE process_port_operations 
  DROP COLUMN IF EXISTS "container_number";

-- 重新创建外键约束（使用 containerNumber 列）
ALTER TABLE process_port_operations
  ADD CONSTRAINT "FK_8bd3a649de90bb7fb22408c81a1"
  FOREIGN KEY ("containerNumber")
  REFERENCES biz_containers("containerNumber")
  ON DELETE CASCADE;

-- 2.2 process_sea_freight
-- 注意：containerNumber 是主键，container_number 只能作为冗余列删除
ALTER TABLE process_sea_freight 
  DROP COLUMN IF EXISTS "container_number";

-- 2.3 process_trucking（检查是否存在）
-- 先检查列是否存在
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'process_trucking'
    AND column_name = 'container_number'
  ) THEN
    ALTER TABLE process_trucking 
      DROP CONSTRAINT IF EXISTS "FK_7ce2996fdfc8003b51ee3d6dddf";
    ALTER TABLE process_trucking 
      DROP COLUMN IF EXISTS "container_number";
    ALTER TABLE process_trucking
      ADD CONSTRAINT "FK_7ce2996fdfc8003b51ee3d6dddf"
      FOREIGN KEY ("containerNumber")
      REFERENCES biz_containers("containerNumber")
      ON DELETE CASCADE;
  END IF;
END $$;

-- 2.4 process_warehouse_operations
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'process_warehouse_operations'
    AND column_name = 'container_number'
  ) THEN
    ALTER TABLE process_warehouse_operations 
      DROP CONSTRAINT IF EXISTS "FK_6216e527509f188f8ec542b49cb";
    ALTER TABLE process_warehouse_operations 
      DROP COLUMN IF EXISTS "container_number";
    ALTER TABLE process_warehouse_operations
      ADD CONSTRAINT "FK_6216e527509f188f8ec542b49cb"
      FOREIGN KEY ("containerNumber")
      REFERENCES biz_containers("containerNumber")
      ON DELETE CASCADE;
  END IF;
END $$;

-- 2.5 process_empty_returns
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'process_empty_returns'
    AND column_name = 'container_number'
  ) THEN
    ALTER TABLE process_empty_returns 
      DROP CONSTRAINT IF EXISTS "FK_59d6811cfc07784a7795661e3e6";
    ALTER TABLE process_empty_returns 
      DROP COLUMN IF EXISTS "container_number";
    ALTER TABLE process_empty_returns
      ADD CONSTRAINT "FK_59d6811cfc07784a7795661e3e6"
      FOREIGN KEY ("containerNumber")
      REFERENCES biz_containers("containerNumber")
      ON DELETE CASCADE;
  END IF;
END $$;

-- 2.6 container_status_events
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'container_status_events'
    AND column_name = 'container_number'
  ) THEN
    ALTER TABLE container_status_events 
      DROP CONSTRAINT IF EXISTS "FK_377dad97397c1dd5fe45a63778b";
    ALTER TABLE container_status_events 
      DROP COLUMN IF EXISTS "container_number";
    ALTER TABLE container_status_events
      ADD CONSTRAINT "FK_377dad97397c1dd5fe45a63778b"
      FOREIGN KEY ("containerNumber")
      REFERENCES biz_containers("containerNumber")
      ON DELETE CASCADE;
  END IF;
END $$;

-- 2.7 container_charges
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'container_charges'
    AND column_name = 'container_number'
  ) THEN
    ALTER TABLE container_charges 
      DROP CONSTRAINT IF EXISTS "FK_1bcb63c6bb0fde4b599837e8d29";
    ALTER TABLE container_charges 
      DROP COLUMN IF EXISTS "container_number";
    ALTER TABLE container_charges
      ADD CONSTRAINT "FK_1bcb63c6bb0fde4b599837e8d29"
      FOREIGN KEY ("containerNumber")
      REFERENCES biz_containers("containerNumber")
      ON DELETE CASCADE;
  END IF;
END $$;

-- ============================================================================
-- 步骤3：验证修复结果
-- ============================================================================
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'process_sea_freight',
    'process_port_operations',
    'process_trucking',
    'process_warehouse_operations',
    'process_empty_returns',
    'container_status_events',
    'container_charges'
  )
  AND column_name ILIKE '%container%'
ORDER BY table_name, column_name;

-- ============================================================================
-- 步骤4：检查外键约束
-- ============================================================================
SELECT
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND ccu.table_name = 'biz_containers'
ORDER BY tc.table_name;
