-- 创建流程实例表 (flow_instances)
-- 用于存储 AI 流程的执行实例

CREATE TABLE IF NOT EXISTS flow_instances (
    id VARCHAR(50) PRIMARY KEY,
    flow_id VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    variables JSONB,
    current_node_id VARCHAR(50),
    execution_history JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    FOREIGN KEY (flow_id) REFERENCES flow_definitions(id) ON DELETE CASCADE
);

CREATE INDEX idx_flow_instances_flow_id ON flow_instances(flow_id);
CREATE INDEX idx_flow_instances_status ON flow_instances(status);
CREATE INDEX idx_flow_instances_created_at ON flow_instances(created_at DESC);

COMMENT ON TABLE flow_instances IS 'AI流程实例表，存储流程的执行状态、历史等';
