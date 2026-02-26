-- 为备货单表添加缺失的Excel导入字段
-- 执行前请备份数据库！

-- 添加是否查验字段
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'biz_replenishment_orders'
        AND column_name = 'inspection_required'
    ) THEN
        ALTER TABLE biz_replenishment_orders ADD COLUMN inspection_required BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- 添加是否装配件字段
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'biz_replenishment_orders'
        AND column_name = 'is_assembly'
    ) THEN
        ALTER TABLE biz_replenishment_orders ADD COLUMN is_assembly BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- 添加含要求打托产品字段
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'biz_replenishment_orders'
        AND column_name = 'pallet_required'
    ) THEN
        ALTER TABLE biz_replenishment_orders ADD COLUMN pallet_required BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- 为还空箱表添加缺失的字段（如果表名是 process_empty_return）
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'process_empty_return'
    ) THEN
        -- 检查并添加通知取空日期
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'process_empty_return'
            AND column_name = 'notification_return_date'
        ) THEN
            ALTER TABLE process_empty_return ADD COLUMN notification_return_date DATE;
        END IF;

        -- 检查并添加取空时间
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'process_empty_return'
            AND column_name = 'notification_return_time'
        ) THEN
            ALTER TABLE process_empty_return ADD COLUMN notification_return_time TIMESTAMP;
        END IF;
    END IF;
END $$;

-- 验证字段是否添加成功
SELECT
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name IN ('biz_replenishment_orders', 'process_empty_return')
AND column_name IN ('inspection_required', 'is_assembly', 'pallet_required', 'notification_return_date', 'notification_return_time')
ORDER BY table_name, column_name;
