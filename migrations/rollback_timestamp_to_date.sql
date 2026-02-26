-- ============================================
-- 回滚脚本：timestamp -> date
-- 用于撤销上述修改（谨慎使用！将丢失所有时间信息）
-- ============================================

⚠️ 警告：执行此脚本将丢失所有时间信息（时、分、秒）
-- 请确保已备份数据库

-- ===== 港口操作表 (process_port_operations) =====

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'process_port_operations'
    AND column_name = 'eta_dest_port'
    AND data_type LIKE 'timestamp%'
  ) THEN
    ALTER TABLE process_port_operations
      ALTER COLUMN eta_dest_port TYPE date USING eta_dest_port::date;
    RAISE NOTICE 'eta_dest_port 已从 timestamp 回滚为 date（时间信息已丢失）';
  ELSE
    RAISE NOTICE 'eta_dest_port 已经是 date 类型';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'process_port_operations'
    AND column_name = 'ata_dest_port'
    AND data_type LIKE 'timestamp%'
  ) THEN
    ALTER TABLE process_port_operations
      ALTER COLUMN ata_dest_port TYPE date USING ata_dest_port::date;
    RAISE NOTICE 'ata_dest_port 已从 timestamp 回滚为 date（时间信息已丢失）';
  ELSE
    RAISE NOTICE 'ata_dest_port 已经是 date 类型';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'process_port_operations'
    AND column_name = 'dest_port_unload_date'
    AND data_type LIKE 'timestamp%'
  ) THEN
    ALTER TABLE process_port_operations
      ALTER COLUMN dest_port_unload_date TYPE date USING dest_port_unload_date::date;
    RAISE NOTICE 'dest_port_unload_date 已从 timestamp 回滚为 date（时间信息已丢失）';
  ELSE
    RAISE NOTICE 'dest_port_unload_date 已经是 date 类型';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'process_port_operations'
    AND column_name = 'planned_customs_date'
    AND data_type LIKE 'timestamp%'
  ) THEN
    ALTER TABLE process_port_operations
      ALTER COLUMN planned_customs_date TYPE date USING planned_customs_date::date;
    RAISE NOTICE 'planned_customs_date 已从 timestamp 回滚为 date（时间信息已丢失）';
  ELSE
    RAISE NOTICE 'planned_customs_date 已经是 date 类型';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'process_port_operations'
    AND column_name = 'isf_declaration_date'
    AND data_type LIKE 'timestamp%'
  ) THEN
    ALTER TABLE process_port_operations
      ALTER COLUMN isf_declaration_date TYPE date USING isf_declaration_date::date;
    RAISE NOTICE 'isf_declaration_date 已从 timestamp 回滚为 date（时间信息已丢失）';
  ELSE
    RAISE NOTICE 'isf_declaration_date 已经是 date 类型';
  END IF;
END $$;

-- ===== 仓库操作表 (process_warehouse_operations) =====

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'process_warehouse_operations'
    AND column_name = 'warehouse_arrival_date'
    AND data_type LIKE 'timestamp%'
  ) THEN
    ALTER TABLE process_warehouse_operations
      ALTER COLUMN warehouse_arrival_date TYPE date USING warehouse_arrival_date::date;
    RAISE NOTICE 'warehouse_arrival_date 已从 timestamp 回滚为 date（时间信息已丢失）';
  ELSE
    RAISE NOTICE 'warehouse_arrival_date 已经是 date 类型';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'process_warehouse_operations'
    AND column_name = 'planned_unload_date'
    AND data_type LIKE 'timestamp%'
  ) THEN
    ALTER TABLE process_warehouse_operations
      ALTER COLUMN planned_unload_date TYPE date USING planned_unload_date::date;
    RAISE NOTICE 'planned_unload_date 已从 timestamp 回滚为 date（时间信息已丢失）';
  ELSE
    RAISE NOTICE 'planned_unload_date 已经是 date 类型';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'process_warehouse_operations'
    AND column_name = 'wms_confirm_date'
    AND data_type LIKE 'timestamp%'
  ) THEN
    ALTER TABLE process_warehouse_operations
      ALTER COLUMN wms_confirm_date TYPE date USING wms_confirm_date::date;
    RAISE NOTICE 'wms_confirm_date 已从 timestamp 回滚为 date（时间信息已丢失）';
  ELSE
    RAISE NOTICE 'wms_confirm_date 已经是 date 类型';
  END IF;
END $$;

-- ===== 还空箱表 (process_empty_return) =====

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'process_empty_return'
    AND column_name = 'last_return_date'
    AND data_type LIKE 'timestamp%'
  ) THEN
    ALTER TABLE process_empty_return
      ALTER COLUMN last_return_date TYPE date USING last_return_date::date;
    RAISE NOTICE 'last_return_date 已从 timestamp 回滚为 date（时间信息已丢失）';
  ELSE
    RAISE NOTICE 'last_return_date 已经是 date 类型';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'process_empty_return'
    AND column_name = 'planned_return_date'
    AND data_type LIKE 'timestamp%'
  ) THEN
    ALTER TABLE process_empty_return
      ALTER COLUMN planned_return_date TYPE date USING planned_return_date::date;
    RAISE NOTICE 'planned_return_date 已从 timestamp 回滚为 date（时间信息已丢失）';
  ELSE
    RAISE NOTICE 'planned_return_date 已经是 date 类型';
  END IF;
END $$;
