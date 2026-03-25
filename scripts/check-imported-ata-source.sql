-- ============================================================
-- 检查已导入货柜的 ATA 字段来源
-- ============================================================

-- 1. 检查 process_sea_freight 表中 ATA 不为空的记录
SELECT 
    'process_sea_freight' AS table_name,
    sf.bill_of_lading_number,
    c.container_number,
    sf.eta AS "预计_到港",
    sf.ata AS "实际_到港",
    sf.vessel_name AS "船名",
    sf.voyage_number AS "航次"
FROM process_sea_freight sf
LEFT JOIN biz_containers c ON c.bill_of_lading_number = sf.bill_of_lading_number
WHERE sf.ata IS NOT NULL
ORDER BY sf.ata DESC
LIMIT 10;

-- 2. 检查 process_port_operations 表中 ATA 不为空的记录
SELECT 
    'process_port_operations' AS table_name,
    po.container_number,
    po.port_type AS "港口类型",
    po.port_name AS "港口名称",
    po.eta AS "预计_到港",
    po.ata AS "实际_到港",
    po.port_sequence AS "顺序"
FROM process_port_operations po
WHERE po.ata IS NOT NULL
ORDER BY po.ata DESC
LIMIT 10;

-- 3. 统计两个表中 ATA 字段的填充情况
SELECT 
    'process_sea_freight' AS "表名",
    COUNT(*) AS "总记录数",
    COUNT(ata) AS "ATA 有值",
    COUNT(*) - COUNT(ata) AS "ATA 为空",
    ROUND(COUNT(ata)::numeric * 100 / COUNT(*), 2) AS "填充率%"
FROM process_sea_freight
UNION ALL
SELECT 
    'process_port_operations' AS "表名",
    COUNT(*) AS "总记录数",
    COUNT(ata) AS "ATA 有值",
    COUNT(*) - COUNT(ata) AS "ATA 为空",
    ROUND(COUNT(ata)::numeric * 100 / COUNT(*), 2) AS "填充率%"
FROM process_port_operations;

-- 4. 检查是否有 Excel 列名包含 ATA 相关字段（从最近导入的数据推断）
-- 这个需要查看审计日志或导入记录
