-- ============================================
-- 数据类型迁移：date -> timestamp
-- 用于修复时间信息丢失问题
--
-- 注意：此脚本作为备用方案，用于已有数据库的迁移
-- 对于新创建的数据库，03_create_tables.sql 已直接使用timestamp类型
-- ============================================

-- ===== 港口操作表 (process_port_operations) =====

-- 1. eta_dest_port: date -> timestamp
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'process_port_operations'
    AND column_name = 'eta_dest_port'
    AND data_type = 'date'
  ) THEN
    ALTER TABLE process_port_operations
      ALTER COLUMN eta_dest_port TYPE timestamp USING eta_dest_port::timestamp;
    RAISE NOTICE 'eta_dest_port 已从 date 转换为 timestamp';
  ELSE
    RAISE NOTICE 'eta_dest_port 已经是 timestamp 类型';
  END IF;
END $$;

-- 2. ata_dest_port: date -> timestamp
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'process_port_operations'
    AND column_name = 'ata_dest_port'
    AND data_type = 'date'
  ) THEN
    ALTER TABLE process_port_operations
      ALTER COLUMN ata_dest_port TYPE timestamp USING ata_dest_port::timestamp;
    RAISE NOTICE 'ata_dest_port 已从 date 转换为 timestamp';
  ELSE
    RAISE NOTICE 'ata_dest_port 已经是 timestamp 类型';
  END IF;
END $$;

-- 3. dest_port_unload_date: date -> timestamp
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'process_port_operations'
    AND column_name = 'dest_port_unload_date'
    AND data_type = 'date'
  ) THEN
    ALTER TABLE process_port_operations
      ALTER COLUMN dest_port_unload_date TYPE timestamp USING dest_port_unload_date::timestamp;
    RAISE NOTICE 'dest_port_unload_date 已从 date 转换为 timestamp';
  ELSE
    RAISE NOTICE 'dest_port_unload_date 已经是 timestamp 类型';
  END IF;
END $$;

-- 4. planned_customs_date: date -> timestamp
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'process_port_operations'
    AND column_name = 'planned_customs_date'
    AND data_type = 'date'
  ) THEN
    ALTER TABLE process_port_operations
      ALTER COLUMN planned_customs_date TYPE timestamp USING planned_customs_date::timestamp;
    RAISE NOTICE 'planned_customs_date 已从 date 转换为 timestamp';
  ELSE
    RAISE NOTICE 'planned_customs_date 已经是 timestamp 类型';
  END IF;
END $$;

-- 5. isf_declaration_date: date -> timestamp
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'process_port_operations'
    AND column_name = 'isf_declaration_date'
    AND data_type = 'date'
  ) THEN
    ALTER TABLE process_port_operations
      ALTER COLUMN isf_declaration_date TYPE timestamp USING isf_declaration_date::timestamp;
    RAISE NOTICE 'isf_declaration_date 已从 date 转换为 timestamp';
  ELSE
    RAISE NOTICE 'isf_declaration_date 已经是 timestamp 类型';
  END IF;
END $$;

-- ===== 仓库操作表 (process_warehouse_operations) =====

-- 6. warehouse_arrival_date: date -> timestamp
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'process_warehouse_operations'
    AND column_name = 'warehouse_arrival_date'
    AND data_type = 'date'
  ) THEN
    ALTER TABLE process_warehouse_operations
      ALTER COLUMN warehouse_arrival_date TYPE timestamp USING warehouse_arrival_date::timestamp;
    RAISE NOTICE 'warehouse_arrival_date 已从 date 转换为 timestamp';
  ELSE
    RAISE NOTICE 'warehouse_arrival_date 已经是 timestamp 类型';
  END IF;
END $$;

-- 7. planned_unload_date: date -> timestamp
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'process_warehouse_operations'
    AND column_name = 'planned_unload_date'
    AND data_type = 'date'
  ) THEN
    ALTER TABLE process_warehouse_operations
      ALTER COLUMN planned_unload_date TYPE timestamp USING planned_unload_date::timestamp;
    RAISE NOTICE 'planned_unload_date 已从 date 转换为 timestamp';
  ELSE
    RAISE NOTICE 'planned_unload_date 已经是 timestamp 类型';
  END IF;
END $$;

-- 8. wms_confirm_date: date -> timestamp
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'process_warehouse_operations'
    AND column_name = 'wms_confirm_date'
    AND data_type = 'date'
  ) THEN
    ALTER TABLE process_warehouse_operations
      ALTER COLUMN wms_confirm_date TYPE timestamp USING wms_confirm_date::timestamp;
    RAISE NOTICE 'wms_confirm_date 已从 date 转换为 timestamp';
  ELSE
    RAISE NOTICE 'wms_confirm_date 已经是 timestamp 类型';
  END IF;
END $$;

-- ===== 还空箱表 (process_empty_return) =====

-- 9. last_return_date: date -> timestamp
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'process_empty_return'
    AND column_name = 'last_return_date'
    AND data_type = 'date'
  ) THEN
    ALTER TABLE process_empty_return
      ALTER COLUMN last_return_date TYPE timestamp USING last_return_date::timestamp;
    RAISE NOTICE 'last_return_date 已从 date 转换为 timestamp';
  ELSE
    RAISE NOTICE 'last_return_date 已经是 timestamp 类型';
  END IF;
END $$;

-- 10. planned_return_date: date -> timestamp
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'process_empty_return'
    AND column_name = 'planned_return_date'
    AND data_type = 'date'
  ) THEN
    ALTER TABLE process_empty_return
      ALTER COLUMN planned_return_date TYPE timestamp USING planned_return_date::timestamp;
    RAISE NOTICE 'planned_return_date 已从 date 转换为 timestamp';
  ELSE
    RAISE NOTICE 'planned_return_date 已经是 timestamp 类型';
  END IF;
END $$;

-- ============================================
-- 验证修改结果
-- ============================================

SELECT
  'process_port_operations' as table_name,
  COUNT(*) FILTER (WHERE data_type LIKE 'timestamp%') as timestamp_fields,
  STRING_AGG(column_name, ', ') FILTER (WHERE data_type LIKE 'timestamp%') as field_names
FROM information_schema.columns
WHERE table_name = 'process_port_operations'
  AND column_name IN (
    'eta_dest_port',
    'ata_dest_port',
    'dest_port_unload_date',
    'planned_customs_date',
    'isf_declaration_date'
  )
UNION ALL
SELECT
  'process_warehouse_operations' as table_name,
  COUNT(*) FILTER (WHERE data_type LIKE 'timestamp%') as timestamp_fields,
  STRING_AGG(column_name, ', ') FILTER (WHERE data_type LIKE 'timestamp%') as field_names
FROM information_schema.columns
WHERE table_name = 'process_warehouse_operations'
  AND column_name IN (
    'warehouse_arrival_date',
    'planned_unload_date',
    'wms_confirm_date'
  )
UNION ALL
SELECT
  'process_empty_return' as table_name,
  COUNT(*) FILTER (WHERE data_type LIKE 'timestamp%') as timestamp_fields,
  STRING_AGG(column_name, ', ') FILTER (WHERE data_type LIKE 'timestamp%') as field_names
FROM information_schema.columns
WHERE table_name = 'process_empty_return'
  AND column_name IN (
    'last_return_date',
    'planned_return_date'
  );

-- ============================================
-- 说明
-- ============================================
-- 此脚本将10个日期字段从date类型改为timestamp类型
-- 修改后可以保存完整的时间信息（时、分、秒）
-- 已有数据不会丢失，只是时间部分为 00:00:00
-- 重新导入Excel后，时间信息将正确保存
--
-- 注意：对于新创建的数据库，03_create_tables.sql 已直接使用timestamp类型
-- 所以此脚本主要用于迁移已存在的旧数据库
