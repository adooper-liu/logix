-- 添加 container_number 字段到 biz_replenishment_orders 表
ALTER TABLE biz_replenishment_orders
ADD COLUMN container_number VARCHAR(50);

-- 添加外键约束
ALTER TABLE biz_replenishment_orders
ADD CONSTRAINT fk_replenishment_order_container
FOREIGN KEY (container_number)
REFERENCES biz_containers(container_number)
ON DELETE SET NULL;

-- 添加索引
CREATE INDEX idx_replenishment_order_container
ON biz_replenishment_orders(container_number);
