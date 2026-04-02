-- ============================================================
-- 智能排产性能优化索引
-- Scheduling Performance Optimization Indexes
-- ============================================================
-- 说明：为智能排产概览 API 添加必要的数据库索引
-- 用途：解决 /api/v1/scheduling/overview 和 /api/v1/countries 超时问题
-- ============================================================

-- === 1. 货柜表相关索引 ===

-- 货柜状态索引（用于快速过滤 initial/issued 状态）
-- 场景：SELECT COUNT(*) FROM biz_containers WHERE schedule_status IN ('initial', 'issued')
CREATE INDEX IF NOT EXISTS idx_containers_schedule_status 
ON biz_containers(schedule_status);

-- 货柜号索引（用于关联查询）
-- 场景：JOIN process_port_operations po ON c.container_number = po.container_number
CREATE INDEX IF NOT EXISTS idx_containers_number 
ON biz_containers(container_number);

-- === 2. 补货订单表相关索引 ===

-- 补货订单 - 货柜号 + 客户代码索引（用于快速关联客户信息）
-- 场景：SELECT ro.customer_code FROM biz_replenishment_orders ro WHERE ro.container_number = ?
CREATE INDEX IF NOT EXISTS idx_replenishment_container_customer 
ON biz_replenishment_orders(container_number, customer_code);

-- === 3. 客户表相关索引 ===

-- 客户 - 国家索引（用于按国家过滤）
-- 场景：SELECT cu.country FROM biz_customers cu WHERE cu.customer_code = ?
CREATE INDEX IF NOT EXISTS idx_customers_country 
ON biz_customers(customer_code, country);

-- === 4. 港口操作表相关索引 ===

-- 港口操作 - 货柜号 + 港口类型索引（用于快速定位目的港操作）
-- 场景：SELECT po.port_code FROM process_port_operations po WHERE po.container_number = ? AND po.port_type = 'destination'
CREATE INDEX IF NOT EXISTS idx_port_ops_container_port_type 
ON process_port_operations(container_number, port_type);

-- 港口操作 - 货柜号索引（通用关联）
-- 场景：EXISTS (SELECT 1 FROM process_port_operations po WHERE po.container_number = c.container_number)
CREATE INDEX IF NOT EXISTS idx_port_ops_container 
ON process_port_operations(container_number);

-- 港口代码 + 名称索引（用于 GROUP BY 优化）
-- 场景：SELECT po.port_code, po.port_name, COUNT(*) FROM process_port_operations po GROUP BY po.port_code, po.port_name
CREATE INDEX IF NOT EXISTS idx_port_ops_code_name 
ON process_port_operations(port_code, port_name);

-- === 5. 拖卡运输表相关索引 ===

-- 拖卡运输 - 货柜号 + 提柜日期索引（用于快速排除已提柜）
-- 场景：NOT EXISTS (SELECT 1 FROM process_trucking_transport tt WHERE tt.container_number = ? AND tt.pickup_date IS NOT NULL)
CREATE INDEX IF NOT EXISTS idx_trucking_transport_container_pickup 
ON process_trucking_transport(container_number, pickup_date);

-- === 6. 仓库车队映射表相关索引 ===

-- 仓库 - 车队映射 - 国家 + 激活状态索引（用于按国家快速过滤）
-- 场景：SELECT * FROM dict_warehouse_trucking_mapping WHERE UPPER(country) = ANY(?) AND is_active = true
CREATE INDEX IF NOT EXISTS idx_warehouse_trucking_country_active 
ON dict_warehouse_trucking_mapping(UPPER(country), is_active);

-- 仓库代码索引（用于快速查找）
CREATE INDEX IF NOT EXISTS idx_warehouse_trucking_warehouse_code 
ON dict_warehouse_trucking_mapping(warehouse_code);

-- 车队公司 ID 索引（用于快速查找）
CREATE INDEX IF NOT EXISTS idx_warehouse_trucking_trucking_company_id 
ON dict_warehouse_trucking_mapping(trucking_company_id);

-- === 7. 车队港口映射表相关索引 ===

-- 车队 - 港口映射 - 国家 + 激活状态索引（用于按国家快速过滤）
-- 场景：SELECT * FROM dict_trucking_port_mapping WHERE UPPER(country) = ANY(?) AND is_active = true
CREATE INDEX IF NOT EXISTS idx_trucking_port_country_active 
ON dict_trucking_port_mapping(UPPER(country), is_active);

-- 车队公司 ID 索引（用于快速查找）
CREATE INDEX IF NOT EXISTS idx_trucking_port_trucking_company_id 
ON dict_trucking_port_mapping(trucking_company_id);

-- 港口代码索引（用于快速查找）
CREATE INDEX IF NOT EXISTS idx_trucking_port_port_code 
ON dict_trucking_port_mapping(port_code);

-- === 8. 仓库表相关索引 ===

-- 仓库 - 国家 + 状态索引（用于按国家过滤仓库）
-- 场景：SELECT * FROM dict_warehouses WHERE country = ? AND status = 'ACTIVE'
CREATE INDEX IF NOT EXISTS idx_warehouses_country_status 
ON dict_warehouses(country, status);

-- === 9. 车队表相关索引 ===

-- 车队 - 国家 + 状态索引（用于按国家过滤车队）
-- 场景：SELECT * FROM dict_trucking_companies WHERE country = ? AND status = 'ACTIVE'
CREATE INDEX IF NOT EXISTS idx_trucking_companies_country_status 
ON dict_trucking_companies(country, status);

-- === 10. 国别字典表相关索引（如果还没有） ===

-- 国别 - 激活状态 + 排序索引（用于快速获取可用国家列表）
-- 场景：SELECT * FROM dict_countries WHERE is_active = true ORDER BY sort_order, code
CREATE INDEX IF NOT EXISTS idx_countries_active_sort 
ON dict_countries(is_active, sort_order, code);

-- ============================================================
-- 索引创建完成提示
-- ============================================================

DO $$
BEGIN
  RAISE NOTICE '智能排产性能优化索引创建完成！';
  RAISE NOTICE 'Scheduling performance optimization indexes created successfully!';
  RAISE NOTICE '';
  RAISE NOTICE '建议执行以下命令分析统计信息:';
  RAISE NOTICE 'ANALYZE biz_containers;';
  RAISE NOTICE 'ANALYZE process_port_operations;';
  RAISE NOTICE 'ANALYZE biz_replenishment_orders;';
  RAISE NOTICE 'ANALYZE biz_customers;';
  RAISE NOTICE 'ANALYZE process_trucking_transport;';
END $$;

-- ============================================================
-- 验证索引是否创建成功
-- ============================================================
-- SELECT schemaname, tablename, indexname, indexdef
-- FROM pg_indexes
-- WHERE indexname LIKE 'idx_%scheduling%' OR indexname LIKE 'idx_%containers%' OR indexname LIKE 'idx_%port_ops%'
-- ORDER BY tablename, indexname;
