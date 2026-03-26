-- ============================================================
-- LogiX 数据库约束修复脚本
-- LogiX Database Constraints Fix Script
-- ============================================================
-- 说明: 修复数据库表关联与约束问题
-- Usage: Fix database foreign keys and constraints
-- ============================================================

\echo '开始修复数据库约束...'
\echo 'Starting to fix database constraints...'

-- ============================================================
-- 第1部分: 添加缺失的外键关联 (8个)
-- ============================================================

-- 1.1 备货单自关联
\echo '添加备货单自关联...'
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_replenishment_main_order'
        AND table_name = 'biz_replenishment_orders'
    ) THEN
        ALTER TABLE biz_replenishment_orders
        ADD CONSTRAINT fk_replenishment_main_order
        FOREIGN KEY (main_order_number)
        REFERENCES biz_replenishment_orders(order_number)
        ON DELETE SET NULL
        ON UPDATE CASCADE;
        RAISE NOTICE '备货单自关联已添加';
    ELSE
        RAISE NOTICE '备货单自关联已存在';
    END IF;
END $$;

-- 1.2 海运表关联船公司
\echo '添加海运表船公司关联...'
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_sea_freight_shipping_company'
        AND table_name = 'process_sea_freight'
    ) THEN
        ALTER TABLE process_sea_freight
        ADD CONSTRAINT fk_sea_freight_shipping_company
        FOREIGN KEY (shipping_company_id)
        REFERENCES dict_shipping_companies(company_code)
        ON DELETE SET NULL
        ON UPDATE CASCADE;
        RAISE NOTICE '海运表船公司关联已添加';
    ELSE
        RAISE NOTICE '海运表船公司关联已存在';
    END IF;
END $$;

-- 1.3 海运表关联货代公司
\echo '添加海运表货代公司关联...'
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_sea_freight_freight_forwarder'
        AND table_name = 'process_sea_freight'
    ) THEN
        ALTER TABLE process_sea_freight
        ADD CONSTRAINT fk_sea_freight_freight_forwarder
        FOREIGN KEY (freight_forwarder_id)
        REFERENCES dict_freight_forwarders(forwarder_code)
        ON DELETE SET NULL
        ON UPDATE CASCADE;
        RAISE NOTICE '海运表货代公司关联已添加';
    ELSE
        RAISE NOTICE '海运表货代公司关联已存在';
    END IF;
END $$;

-- 1.4 海运表关联起运港
\echo '添加海运表起运港关联...'
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_sea_freight_port_of_loading'
        AND table_name = 'process_sea_freight'
    ) THEN
        ALTER TABLE process_sea_freight
        ADD CONSTRAINT fk_sea_freight_port_of_loading
        FOREIGN KEY (port_of_loading)
        REFERENCES dict_ports(port_code)
        ON DELETE SET NULL
        ON UPDATE CASCADE;
        RAISE NOTICE '海运表起运港关联已添加';
    ELSE
        RAISE NOTICE '海运表起运港关联已存在';
    END IF;
END $$;

-- 1.5 海运表关联目的港
\echo '添加海运表目的港关联...'
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_sea_freight_port_of_discharge'
        AND table_name = 'process_sea_freight'
    ) THEN
        ALTER TABLE process_sea_freight
        ADD CONSTRAINT fk_sea_freight_port_of_discharge
        FOREIGN KEY (port_of_discharge)
        REFERENCES dict_ports(port_code)
        ON DELETE SET NULL
        ON UPDATE CASCADE;
        RAISE NOTICE '海运表目的港关联已添加';
    ELSE
        RAISE NOTICE '海运表目的港关联已存在';
    END IF;
END $$;

-- 1.6 海运表关联途经港
\echo '添加海运表途经港关联...'
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_sea_freight_transit_port'
        AND table_name = 'process_sea_freight'
    ) THEN
        ALTER TABLE process_sea_freight
        ADD CONSTRAINT fk_sea_freight_transit_port
        FOREIGN KEY (transit_port_code)
        REFERENCES dict_ports(port_code)
        ON DELETE SET NULL
        ON UPDATE CASCADE;
        RAISE NOTICE '海运表途经港关联已添加';
    ELSE
        RAISE NOTICE '海运表途经港关联已存在';
    END IF;
END $$;

-- 1.7 港口操作表关联港口
\echo '添加港口操作表港口关联...'
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_port_operations_port'
        AND table_name = 'process_port_operations'
    ) THEN
        ALTER TABLE process_port_operations
        ADD CONSTRAINT fk_port_operations_port
        FOREIGN KEY (port_code)
        REFERENCES dict_ports(port_code)
        ON DELETE SET NULL
        ON UPDATE CASCADE;
        RAISE NOTICE '港口操作表港口关联已添加';
    ELSE
        RAISE NOTICE '港口操作表港口关联已存在';
    END IF;
END $$;

-- 1.8 港口操作表关联清关公司
\echo '添加港口操作表清关公司关联...'
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_port_operations_customs_broker'
        AND table_name = 'process_port_operations'
    ) THEN
        ALTER TABLE process_port_operations
        ADD CONSTRAINT fk_port_operations_customs_broker
        FOREIGN KEY (customs_broker_code)
        REFERENCES dict_customs_brokers(broker_code)
        ON DELETE SET NULL
        ON UPDATE CASCADE;
        RAISE NOTICE '港口操作表清关公司关联已添加';
    ELSE
        RAISE NOTICE '港口操作表清关公司关联已存在';
    END IF;
END $$;

-- 1.9 拖卡运输表关联拖车公司
\echo '添加拖卡运输表拖车公司关联...'
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_trucking_company'
        AND table_name = 'process_trucking_transport'
    ) THEN
        ALTER TABLE process_trucking_transport
        ADD CONSTRAINT fk_trucking_company
        FOREIGN KEY (trucking_company_id)
        REFERENCES dict_trucking_companies(company_code)
        ON DELETE SET NULL
        ON UPDATE CASCADE;
        RAISE NOTICE '拖卡运输表拖车公司关联已添加';
    ELSE
        RAISE NOTICE '拖卡运输表拖车公司关联已存在';
    END IF;
END $$;

-- ============================================================
-- 第2部分: 修复字段类型不匹配 (2处)
-- ============================================================

-- 2.1 修复customer_type_code长度
\echo '修复customer_type_code字段长度...'
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'biz_customers'
        AND column_name = 'customer_type_code'
        AND character_maximum_length < 50
    ) THEN
        ALTER TABLE biz_customers
        ALTER COLUMN customer_type_code TYPE VARCHAR(50);
        RAISE NOTICE 'customer_type_code长度已修复';
    ELSE
        RAISE NOTICE 'customer_type_code长度已正确';
    END IF;
END $$;

-- 2.2 修复container_type_code长度
\echo '修复container_type_code字段长度...'
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'biz_containers'
        AND column_name = 'container_type_code'
        AND character_maximum_length < 20
    ) THEN
        ALTER TABLE biz_containers
        ALTER COLUMN container_type_code TYPE VARCHAR(20);
        RAISE NOTICE 'container_type_code长度已修复';
    ELSE
        RAISE NOTICE 'container_type_code长度已正确';
    END IF;
END $$;

-- ============================================================
-- 第3部分: 添加CHECK约束 (5个)
-- ============================================================

-- 3.1 备货单状态约束
\echo '添加备货单状态约束...'
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'chk_order_status'
        AND table_name = 'biz_replenishment_orders'
    ) THEN
        ALTER TABLE biz_replenishment_orders
        ADD CONSTRAINT chk_order_status
        CHECK (order_status IN (
            'DRAFT', 'CONFIRMED', 'SHIPPED',
            'IN_TRANSIT', 'DELIVERED', 'CANCELLED',
            '已出运', '已确认', '草稿'
        ));
        RAISE NOTICE '备货单状态约束已添加';
    ELSE
        RAISE NOTICE '备货单状态约束已存在';
    END IF;
END $$;

-- 3.2 货柜物流状态约束
\echo '添加货柜物流状态约束...'
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'chk_logistics_status'
        AND table_name = 'biz_containers'
    ) THEN
        ALTER TABLE biz_containers
        ADD CONSTRAINT chk_logistics_status
        CHECK (logistics_status IN (
            'not_shipped', 'in_transit', 'at_port',
            'picked_up', 'unloaded', 'returned_empty', 'cancelled',
            '未出运', '在途', '已到港', '已提柜', '已卸柜', '已还箱'
        ));
        RAISE NOTICE '货柜物流状态约束已添加';
    ELSE
        RAISE NOTICE '货柜物流状态约束已存在';
    END IF;
END $$;

-- 3.3 柜型尺寸约束
\echo '添加柜型尺寸约束...'
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'chk_container_size'
        AND table_name = 'dict_container_types'
    ) THEN
        ALTER TABLE dict_container_types
        ADD CONSTRAINT chk_container_size
        CHECK (size_ft IN (20, 40, 45, 53));
        RAISE NOTICE '柜型尺寸约束已添加';
    ELSE
        RAISE NOTICE '柜型尺寸约束已存在';
    END IF;
END $$;

-- 3.4 港口类型约束
\echo '添加港口类型约束...'
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'chk_port_type'
        AND table_name = 'process_port_operations'
    ) THEN
        ALTER TABLE process_port_operations
        ADD CONSTRAINT chk_port_type
        CHECK (port_type IN ('ORIGIN', 'TRANSIT', 'DESTINATION', 'origin', 'transit', 'destination'));
        RAISE NOTICE '港口类型约束已添加';
    ELSE
        RAISE NOTICE '港口类型约束已存在';
    END IF;
END $$;

-- 3.5 拖卡类型约束
\echo '添加拖卡类型约束...'
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'chk_trucking_type'
        AND table_name = 'process_trucking_transport'
    ) THEN
        ALTER TABLE process_trucking_transport
        ADD CONSTRAINT chk_trucking_type
        CHECK (trucking_type IN ('PRE_SHIPMENT', 'POST_SHIPMENT', 'PRE_SHIPMENT', 'POST_SHIPMENT'));
        RAISE NOTICE '拖卡类型约束已添加';
    ELSE
        RAISE NOTICE '拖卡类型约束已存在';
    END IF;
END $$;

-- ============================================================
-- 第4部分: 添加查询优化索引 (8个)
-- ============================================================

\echo '添加查询优化索引...'

-- 4.1 海运表索引
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'idx_sea_freight_shipping_company'
        AND tablename = 'process_sea_freight'
    ) THEN
        CREATE INDEX idx_sea_freight_shipping_company
        ON process_sea_freight(shipping_company_id);
        RAISE NOTICE '海运表船公司索引已添加';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'idx_sea_freight_port_loading'
        AND tablename = 'process_sea_freight'
    ) THEN
        CREATE INDEX idx_sea_freight_port_loading
        ON process_sea_freight(port_of_loading);
        RAISE NOTICE '海运表起运港索引已添加';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'idx_sea_freight_port_discharge'
        AND tablename = 'process_sea_freight'
    ) THEN
        CREATE INDEX idx_sea_freight_port_discharge
        ON process_sea_freight(port_of_discharge);
        RAISE NOTICE '海运表目的港索引已添加';
    END IF;
END $$;

-- 4.2 港口操作表索引
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'idx_port_operations_eta'
        AND tablename = 'process_port_operations'
    ) THEN
        CREATE INDEX idx_port_operations_eta
        ON process_port_operations(eta_dest_port);
        RAISE NOTICE '港口操作表ETA索引已添加';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'idx_port_operations_customs_status'
        AND tablename = 'process_port_operations'
    ) THEN
        CREATE INDEX idx_port_operations_customs_status
        ON process_port_operations(customs_status);
        RAISE NOTICE '港口操作表清关状态索引已添加';
    END IF;
END $$;

-- 4.3 仓库操作表索引
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'idx_warehouse_operations_wms_status'
        AND tablename = 'process_warehouse_operations'
    ) THEN
        CREATE INDEX idx_warehouse_operations_wms_status
        ON process_warehouse_operations(wms_status);
        RAISE NOTICE '仓库操作表WMS状态索引已添加';
    END IF;
END $$;

-- 4.4 拖卡运输表索引
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'idx_trucking_carrier'
        AND tablename = 'process_trucking_transport'
    ) THEN
        CREATE INDEX idx_trucking_carrier
        ON process_trucking_transport(carrier_company);
        RAISE NOTICE '拖卡运输表承运商索引已添加';
    END IF;
END $$;

-- 4.5 备货单表索引
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'idx_replenishment_sell_to_country'
        AND tablename = 'biz_replenishment_orders'
    ) THEN
        CREATE INDEX idx_replenishment_sell_to_country
        ON biz_replenishment_orders(sell_to_country);
        RAISE NOTICE '备货单表销往国家索引已添加';
    END IF;
END $$;

-- ============================================================
-- 第5部分: 数据一致性检查
-- ============================================================

\echo '执行数据一致性检查...'

-- 5.1 检查孤立记录
SELECT '孤立备货单' AS issue_type,
       COUNT(*) AS count,
       CASE WHEN COUNT(*) > 0 THEN '❌ 需要修复' ELSE '✅ 正常' END AS status
FROM biz_replenishment_orders ro
LEFT JOIN biz_customers c ON ro.customer_code = c.customer_code
WHERE c.customer_code IS NULL

UNION ALL

SELECT '孤立货柜' AS issue_type,
       COUNT(*) AS count,
       CASE WHEN COUNT(*) > 0 THEN '❌ 需要修复' ELSE '✅ 正常' END AS status
FROM biz_containers ct
LEFT JOIN biz_replenishment_orders ro ON ct.order_number = ro.order_number
WHERE ro.order_number IS NULL

UNION ALL

SELECT '无效柜型货柜' AS issue_type,
       COUNT(*) AS count,
       CASE WHEN COUNT(*) > 0 THEN '❌ 需要修复' ELSE '✅ 正常' END AS status
FROM biz_containers ct
LEFT JOIN dict_container_types t ON ct.container_type_code = t.type_code
WHERE t.type_code IS NULL;

-- ============================================================
-- 完成提示
-- ============================================================

\echo '数据库约束修复完成'
\echo 'Database constraints fix completed'
\echo ''
\echo '修复摘要:'
\echo '✅ 外键关联: 添加了 9 个外键关联'
\echo '✅ 字段类型: 修复了 2 处字段类型不匹配'
\echo '✅ CHECK约束: 添加了 5 个CHECK约束'
\echo '✅ 查询索引: 添加了 8 个查询优化索引'
\echo ''
\echo '请检查上方的数据一致性检查结果'

-- 显示约束统计
SELECT
    '约束统计' AS category,
    COUNT(*) AS total_count
FROM information_schema.table_constraints
WHERE table_schema = 'public'
  AND constraint_type = 'FOREIGN KEY'

UNION ALL

SELECT
    'CHECK约束' AS category,
    COUNT(*) AS total_count
FROM information_schema.table_constraints
WHERE table_schema = 'public'
  AND constraint_type = 'CHECK'

UNION ALL

SELECT
    '唯一约束' AS category,
    COUNT(*) AS total_count
FROM information_schema.table_constraints
WHERE table_schema = 'public'
  AND constraint_type = 'UNIQUE';
