-- 迁移脚本：优化车队相关表结构
-- 创建时间：2026-03-20
-- 目标：统一以 dict_trucking_companies 为主数据，映射表使用外键关联

-- 注意：在 pgAdmin 中直接执行时，不需要 BEGIN/COMMIT，PostgreSQL 会自动处理
-- 如果使用 psql 命令行工具，可以保留事务控制

-- 1. 修改 dict_trucking_port_mapping 表
-- 添加外键约束，确保 trucking_company_id 引用 dict_trucking_companies
ALTER TABLE dict_trucking_port_mapping
ADD CONSTRAINT fk_trucking_company
FOREIGN KEY (trucking_company_id) 
REFERENCES dict_trucking_companies(company_code)
ON DELETE CASCADE
ON UPDATE CASCADE;

-- 2. 修改 dict_warehouse_trucking_mapping 表
-- 添加外键约束，确保 trucking_company_id 引用 dict_trucking_companies
ALTER TABLE dict_warehouse_trucking_mapping
ADD CONSTRAINT fk_trucking_company
FOREIGN KEY (trucking_company_id) 
REFERENCES dict_trucking_companies(company_code)
ON DELETE CASCADE
ON UPDATE CASCADE;

-- 3. 为 trucking_company_id 添加索引（如果还没有）
CREATE INDEX IF NOT EXISTS idx_trucking_port_mapping_company_id 
ON dict_trucking_port_mapping(trucking_company_id);

CREATE INDEX IF NOT EXISTS idx_warehouse_trucking_mapping_company_id 
ON dict_warehouse_trucking_mapping(trucking_company_id);

-- 4. 可选：如果希望进一步规范化，可以移除冗余的名称字段
-- 注意：这需要修改应用层代码，暂时注释
-- ALTER TABLE dict_trucking_port_mapping DROP COLUMN trucking_company_name;
-- ALTER TABLE dict_warehouse_trucking_mapping DROP COLUMN trucking_company_name;

-- 说明：
-- 1. 现在 trucking_company_id 必须存在于 dict_trucking_companies 表中
-- 2. 删除车队时，相关的映射会自动删除（CASCADE）
-- 3. 更新车队代码时，相关的映射会自动更新（CASCADE）
-- 4. 映射表不应该再存储 trucking_company_name，应该通过 JOIN 查询获取
