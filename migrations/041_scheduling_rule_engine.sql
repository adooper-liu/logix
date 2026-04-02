-- =====================================================
-- 智能排产规则引擎表结构
-- Intelligent Scheduling Rule Engine Schema
-- =====================================================

-- 规则表：存储规则定义
CREATE TABLE IF NOT EXISTS scheduling_rules (
    -- 主键
    rule_id VARCHAR(50) PRIMARY KEY,
    
    -- 规则基本信息
    rule_name VARCHAR(200) NOT NULL,              -- 规则名称（中文）
    rule_name_en VARCHAR(200),                    -- 规则名称（英文）
    rule_code VARCHAR(100) NOT NULL UNIQUE,       -- 规则编码（系统标识）
    rule_description TEXT,                       -- 规则描述
    rule_type VARCHAR(50) NOT NULL,              -- 规则类型
    
    -- 规则条件配置（JSON）
    conditions JSONB NOT NULL DEFAULT '{}',      -- 匹配条件
    -- 条件示例：
    -- {
    --   "country_codes": ["US", "CA"],           -- 适用国家
    --   "port_codes": ["USLAX", "USLGB"],        -- 适用港口
    --   "warehouse_types": ["SELF_OPERATED"],    -- 适用仓库类型
    --   "trucking_types": ["CORE", "STRATEGIC"],-- 适用车队级别
    --   "time_ranges": {                         -- 适用时间范围
    --     "start_hour": 8,
    --     "end_hour": 18
    --   }
    -- }
    
    -- 规则动作配置（JSON）
    actions JSONB NOT NULL DEFAULT '{}',         -- 执行动作
    -- 动作示例：
    -- {
    --   "score_adjustments": {                   -- 评分调整
    --     "cost_weight": 0.4,
    --     "capacity_weight": 0.3,
    --     "relationship_weight": 0.3
    --   },
    --   "bonus_points": {                        -- 加分项
    --     "partnership_level": {
    --       "STRATEGIC": 30,
    --       "CORE": 20,
    --       "NORMAL": 10
    --     },
    --     "capacity_threshold": 50,
    --     "capacity_bonus": 15
    --   },
    --   "filters": {                             -- 过滤条件
    --     "min_capacity": 5,
    --     "exclude_types": ["TEMPORARY"]
    --   }
    -- }
    
    -- 优先级和生效配置
    priority INT NOT NULL DEFAULT 100,           -- 优先级（数值越小优先级越高）
    is_active BOOLEAN NOT NULL DEFAULT true,      -- 是否启用
    is_default BOOLEAN NOT NULL DEFAULT false,    -- 是否为默认规则（无匹配时使用）
    
    -- 时间范围
    effective_from DATE,                          -- 生效日期（NULL表示立即生效）
    effective_to DATE,                            -- 失效日期（NULL表示永久有效）
    
    -- 适用维度
    apply_to VARCHAR(50) NOT NULL,                -- 适用范围
    -- 枚举值：
    -- 'WAREHOUSE_SCORING'    - 仓库评分
    -- 'TRUCKING_SCORING'     - 车队评分
    -- 'DATE_CALCULATION'     - 日期计算
    -- 'CAPACITY_PLANNING'    - 能力规划
    -- 'COST_ESTIMATION'      - 成本估算
    
    -- 审计字段
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    version INT NOT NULL DEFAULT 1               -- 版本号（用于乐观锁）
);

-- 规则历史表：记录规则变更历史
CREATE TABLE IF NOT EXISTS scheduling_rule_history (
    history_id SERIAL PRIMARY KEY,
    rule_id VARCHAR(50) NOT NULL,
    rule_snapshot JSONB NOT NULL,               -- 规则快照
    change_type VARCHAR(20) NOT NULL,           -- 变更类型：CREATE/UPDATE/DELETE/ACTIVATE/DEACTIVATE
    change_reason TEXT,                          -- 变更原因
    changed_by VARCHAR(100),
    changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_rule_history_rule 
        FOREIGN KEY (rule_id) REFERENCES scheduling_rules(rule_id)
        ON DELETE CASCADE
);

-- 规则维度表：支持多维度条件组合
CREATE TABLE IF NOT EXISTS scheduling_rule_dimensions (
    dimension_id SERIAL PRIMARY KEY,
    rule_id VARCHAR(50) NOT NULL,
    
    -- 维度类型
    dimension_type VARCHAR(50) NOT NULL,         -- 维度类型
    -- 枚举值：
    -- 'COUNTRY'           - 国家
    -- 'PORT'              - 港口
    -- 'WAREHOUSE'         - 仓库
    -- 'WAREHOUSE_TYPE'    - 仓库类型
    -- 'TRUCKING'          - 车队
    -- 'TRUCKING_TYPE'     - 车队类型
    -- 'TIME_RANGE'        - 时间范围
    -- 'DAY_OF_WEEK'       - 星期几
    -- 'CONTAINER_TYPE'    - 柜型
    
    -- 维度值（支持多值）
    dimension_values JSONB NOT NULL DEFAULT '[]',  -- ["US", "CA"] 或 ["USLAX", "USLGB"]
    
    -- 操作符
    operator VARCHAR(20) NOT NULL DEFAULT 'IN',
    -- 枚举值：
    -- 'IN'       - 在列表中
    -- 'NOT_IN'   - 不在列表中
    -- 'EQ'       - 等于
    -- 'NEQ'      - 不等于
    -- 'GT'       - 大于
    -- 'GTE'      - 大于等于
    -- 'LT'       - 小于
    -- 'LTE'      - 小于等于
    -- 'BETWEEN'  - 在范围内
    -- 'LIKE'     - 模糊匹配
    
    -- 维度值范围（用于 BETWEEN 等操作符）
    range_min DECIMAL(10, 2),
    range_max DECIMAL(10, 2),
    
    CONSTRAINT fk_dimension_rule 
        FOREIGN KEY (rule_id) REFERENCES scheduling_rules(rule_id)
        ON DELETE CASCADE
);

-- 规则评分动作表：存储评分调整的具体配置
CREATE TABLE IF NOT EXISTS scheduling_rule_score_actions (
    action_id SERIAL PRIMARY KEY,
    rule_id VARCHAR(50) NOT NULL,
    
    -- 评分维度
    score_dimension VARCHAR(50) NOT NULL,
    -- 'COST'        - 成本评分
    -- 'CAPACITY'    - 能力评分
    -- 'RELATIONSHIP'- 关系评分
    -- 'QUALITY'     - 质量评分
    -- 'DISTANCE'    - 距离评分
    
    -- 动作类型
    action_type VARCHAR(50) NOT NULL,
    -- 'SET_WEIGHT'          - 设置权重
    -- 'ADD_BONUS'           - 加分
    -- 'MULTIPLY_FACTOR'     - 乘数因子
    -- 'SET_OVERRIDE'       - 覆盖值
    -- 'ADD_PENALTY'         - 扣分
    
    -- 动作值
    action_value DECIMAL(10, 4) NOT NULL,
    -- 根据 action_type 解释：
    -- SET_WEIGHT: 0.4 (权重值 0-1)
    -- ADD_BONUS: 10 (加分值)
    -- MULTIPLY_FACTOR: 1.2 (乘数)
    -- SET_OVERRIDE: 100 (覆盖值)
    -- ADD_PENALTY: -5 (扣分值)
    
    -- 条件阈值（可选）
    condition_threshold DECIMAL(10, 4),         -- 触发阈值
    condition_operator VARCHAR(20),             -- 阈值操作符
    
    -- 生效范围
    min_value DECIMAL(10, 4),                   -- 最小值
    max_value DECIMAL(10, 4),                   -- 最大值
    
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_score_action_rule 
        FOREIGN KEY (rule_id) REFERENCES scheduling_rules(rule_id)
        ON DELETE CASCADE
);

-- 规则应用日志表：记录规则执行情况
CREATE TABLE IF NOT EXISTS scheduling_rule_execution_log (
    log_id BIGSERIAL PRIMARY KEY,
    
    -- 执行上下文
    execution_id VARCHAR(100) NOT NULL,         -- 执行ID（关联到排产计划）
    rule_id VARCHAR(50),                        -- 匹配的规则ID
    
    -- 匹配信息
    matched_conditions JSONB,                    -- 匹配的条件
    non_matched_conditions JSONB,               -- 未匹配的条件
    
    -- 执行结果
    action_taken JSONB,                          -- 执行的动作
    score_before DECIMAL(10, 4),                 -- 执行前评分
    score_after DECIMAL(10, 4),                 -- 执行后评分
    
    -- 上下文信息
    context_data JSONB,                         -- 上下文数据（仓库/车队/港口等）
    
    -- 性能信息
    execution_time_ms INT,                       -- 执行耗时（毫秒）
    
    -- 时间戳
    executed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 索引
-- =====================================================

-- 规则表索引
CREATE INDEX IF NOT EXISTS idx_rules_type ON scheduling_rules(rule_type);
CREATE INDEX IF NOT EXISTS idx_rules_apply_to ON scheduling_rules(apply_to);
CREATE INDEX IF NOT EXISTS idx_rules_active ON scheduling_rules(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_rules_priority ON scheduling_rules(priority);
CREATE INDEX IF NOT EXISTS idx_rules_effective_date ON scheduling_rules(effective_from, effective_to) 
    WHERE effective_from IS NOT NULL OR effective_to IS NOT NULL;

-- 规则维度表索引
CREATE INDEX IF NOT EXISTS idx_dimensions_rule ON scheduling_rule_dimensions(rule_id);
CREATE INDEX IF NOT EXISTS idx_dimensions_type ON scheduling_rule_dimensions(dimension_type);
CREATE INDEX IF NOT EXISTS idx_dimensions_rule_type ON scheduling_rule_dimensions(rule_id, dimension_type);

-- 评分动作表索引
CREATE INDEX IF NOT EXISTS idx_score_actions_rule ON scheduling_rule_score_actions(rule_id);
CREATE INDEX IF NOT EXISTS idx_score_actions_dimension ON scheduling_rule_score_actions(score_dimension);

-- 执行日志表索引
CREATE INDEX IF NOT EXISTS idx_execution_log_exec_id ON scheduling_rule_execution_log(execution_id);
CREATE INDEX IF NOT EXISTS idx_execution_log_rule ON scheduling_rule_execution_log(rule_id);
CREATE INDEX IF NOT EXISTS idx_execution_log_time ON scheduling_rule_execution_log(executed_at);

-- =====================================================
-- 初始数据
-- =====================================================

-- 默认仓库评分规则
INSERT INTO scheduling_rules (rule_id, rule_name, rule_code, rule_description, rule_type, conditions, actions, priority, is_active, is_default, apply_to)
VALUES (
    'RULE-DEFAULT-WH-SCORING',
    '默认仓库评分规则',
    'DEFAULT_WAREHOUSE_SCORING',
    '适用于所有仓库的基础评分规则',
    'WAREHOUSE_SCORING',
    '{"warehouse_types": []}',  -- 空数组表示匹配所有
    '{
        "score_adjustments": {
            "property_priority_bonus": {
                "SELF_OPERATED": 1,
                "PLATFORM": 2,
                "THIRD_PARTY": 3
            }
        },
        "base_score": 50
    }',
    1000,
    true,
    true,
    'WAREHOUSE_SCORING'
);

-- 默认车队评分规则
INSERT INTO scheduling_rules (rule_id, rule_name, rule_code, rule_description, rule_type, conditions, actions, priority, is_active, is_default, apply_to)
VALUES (
    'RULE-DEFAULT-TRUCK-SCORING',
    '默认车队评分规则',
    'DEFAULT_TRUCKING_SCORING',
    '适用于所有车队的基础评分规则',
    'TRUCKING_SCORING',
    '{"trucking_types": []}',
    '{
        "score_weights": {
            "cost": 0.4,
            "capacity": 0.3,
            "relationship": 0.3
        },
        "partnership_bonus": {
            "STRATEGIC": 30,
            "CORE": 20,
            "NORMAL": 10,
            "TEMPORARY": 0
        },
        "capacity_threshold": 50,
        "capacity_bonus": 15,
        "collaboration_bonus_factor": 2,
        "collaboration_bonus_max": 20,
        "service_quality_bonus": 5
    }',
    1000,
    true,
    true,
    'TRUCKING_SCORING'
);

-- 美国港口特殊规则
INSERT INTO scheduling_rules (rule_id, rule_name, rule_code, rule_description, rule_type, conditions, actions, priority, is_active, apply_to)
VALUES (
    'RULE-US-PORT-SCORING',
    '美国港口车队评分规则',
    'US_PORT_TRUCKING_SCORING',
    '针对美国港口的特殊评分规则，增加关系评分权重',
    'TRUCKING_SCORING',
    '{"country_codes": ["US"]}',
    '{
        "score_weights": {
            "cost": 0.35,
            "capacity": 0.25,
            "relationship": 0.40
        },
        "partnership_bonus": {
            "STRATEGIC": 35,
            "CORE": 25,
            "NORMAL": 15,
            "TEMPORARY": 0
        }
    }',
    100,
    true,
    'TRUCKING_SCORING'
);

-- 英国港口仓库规则
INSERT INTO scheduling_rules (rule_id, rule_name, rule_code, rule_description, rule_type, conditions, actions, priority, is_active, apply_to)
VALUES (
    'RULE-UK-PORT-WH-SCORING',
    '英国港口仓库评分规则',
    'UK_PORT_WAREHOUSE_SCORING',
    '针对英国仓库的特殊评分规则，优先选择平台仓库',
    'WAREHOUSE_SCORING',
    '{"country_codes": ["UK"]}',
    '{
        "score_adjustments": {
            "property_priority_bonus": {
                "SELF_OPERATED": 2,
                "PLATFORM": 1,
                "THIRD_PARTY": 3
            }
        }
    }',
    100,
    true,
    'WAREHOUSE_SCORING'
);

COMMENT ON TABLE scheduling_rules IS '智能排产规则定义表';
COMMENT ON TABLE scheduling_rule_history IS '规则变更历史表';
COMMENT ON TABLE scheduling_rule_dimensions IS '规则条件维度表';
COMMENT ON TABLE scheduling_rule_score_actions IS '规则评分动作表';
COMMENT ON TABLE scheduling_rule_execution_log IS '规则执行日志表';
