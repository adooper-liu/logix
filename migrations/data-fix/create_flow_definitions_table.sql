-- 创建流程定义表 (flow_definitions)
-- 用于存储 AI 流程定义

CREATE TABLE IF NOT EXISTS flow_definitions (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    version VARCHAR(20) DEFAULT '1.0.0',
    created_by VARCHAR(50),
    nodes JSONB NOT NULL DEFAULT '[]',
    start_node_id VARCHAR(50),
    variables JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_flow_definitions_name ON flow_definitions(name);
CREATE INDEX idx_flow_definitions_created_at ON flow_definitions(created_at DESC);

COMMENT ON TABLE flow_definitions IS 'AI流程定义表，存储流程的节点、变量等配置';
