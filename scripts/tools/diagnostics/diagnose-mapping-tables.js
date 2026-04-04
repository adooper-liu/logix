/**
 * 诊断脚本：检查映射表数据与货柜数据的匹配情况
 * 
 * 使用方法：
 * 1. 确保后端服务正在运行
 * 2. 在浏览器控制台或 Postman 中调用 API
 * 
 * 或者直接在数据库中执行以下 SQL 检查：
 */

/*
-- 1. 检查映射表中的港口-车队映射
SELECT 
    port_code,
    country,
    trucking_company_id,
    trucking_company_name,
    is_default,
    is_active
FROM dict_trucking_port_mapping
WHERE is_active = true
ORDER BY country, port_code, is_default DESC;

-- 2. 检查映射表中的仓库-车队映射
SELECT 
    trucking_company_id,
    country,
    warehouse_code,
    warehouse_name,
    is_default,
    is_active
FROM dict_warehouse_trucking_mapping
WHERE is_active = true
ORDER BY country, trucking_company_id, is_default DESC;

-- 3. 检查货柜对应的目的港和国家
--    需要确认货柜的 port_code 和 sell_to_country 与映射表中的 code 是否匹配

-- 4. 示例：检查 US 国家的映射
SELECT * FROM dict_trucking_port_mapping WHERE country = 'US' AND is_active = true;
SELECT * FROM dict_warehouse_trucking_mapping WHERE country = 'US' AND is_active = true;
*/

-- 如果映射表为空，需要先添加映射数据
-- 格式示例：
/*
INSERT INTO dict_trucking_port_mapping 
    (country, port_code, trucking_company_id, trucking_company_name, is_default, is_active)
VALUES 
    ('US', 'LAX', 'TRUCK001', '洛杉矶车队A', true, true),
    ('US', 'LAX', 'TRUCK002', '洛杉矶车队B', false, true),
    ('US', 'NYC', 'TRUCK001', '纽约车队A', true, true);
*/
