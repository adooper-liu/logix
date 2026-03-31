-- 添加 container_number 字段到 biz_replenishment_orders 表
-- 支持一个货柜可以有多个备货单的关系

ALTER TABLE biz_replenishment_orders
ADD COLUMN IF NOT EXISTS container_number VARCHAR(50);

-- 添加外键约束
ALTER TABLE biz_replenishment_orders
ADD CONSTRAINT fk_replenishment_orders_container
FOREIGN KEY (container_number)
REFERENCES biz_containers(container_number)
ON DELETE SET NULL;

-- 添加索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_replenishment_orders_container_number
ON biz_replenishment_orders(container_number);
