# 智能排产规则引擎

## 一、规则引擎概述

### 1.1 什么是规则引擎

规则引擎是智能排产系统的**可配置化评分框架**，允许在不修改代码的情况下调整：

- 仓库/车队选择时的评分权重
- 不同国家/港口的差异化策略
- 合作关系加分的具体数值
- 容量阈值和过滤条件

### 1.2 规则引擎的意义

| 维度 | 价值 |
|------|------|
| **业务敏捷性** | 业务人员可直接调整规则，无需开发介入 |
| **差异化运营** | 支持不同国家/港口设置不同策略 |
| **快速响应** | 市场变化时可快速调整评分参数 |
| **可追溯性** | 所有规则变更都有历史记录 |

---

## 二、规则定义与结构

### 2.1 规则核心属性

```
┌─────────────────────────────────────────────────────────────┐
│                      SchedulingRule                         │
├─────────────────────────────────────────────────────────────┤
│ ruleId       : 规则唯一标识                                  │
│ ruleCode     : 规则编码（唯一）                               │
│ ruleName     : 规则名称                                       │
│ ruleType     : 规则类型（见 2.2）                             │
│ applyTo      : 应用对象（WAREHOUSE / TRUCKING）               │
│ conditions   : 触发条件（见 2.3）                             │
│ actions      : 执行动作（见 2.4）                             │
│ priority     : 优先级（数值越小越优先）                        │
│ isActive     : 是否启用                                      │
│ isDefault    : 是否为默认规则                                │
│ effectiveFrom: 生效日期                                      │
│ effectiveTo  : 失效日期                                      │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 规则类型 (RuleType)

| 类型 | 说明 | 应用场景 |
|------|------|----------|
| `WAREHOUSE_SCORING` | 仓库评分规则 | 仓库选择时的权重调整 |
| `TRUCKING_SCORING` | 车队评分规则 | 车队选择时的权重调整 |
| `DATE_CALCULATION` | 日期计算规则 | 免费天数、标准耗时配置 |
| `CAPACITY_PLANNING` | 产能规划规则 | 容量阈值、分批策略 |
| `COST_ESTIMATION` | 成本估算规则 | 成本预测模型参数 |

### 2.3 触发条件 (Conditions)

```typescript
interface RuleConditions {
  countryCodes?: string[];      // 适用国家列表
  portCodes?: string[];         // 适用港口列表
  warehouseCodes?: string[];   // 适用仓库列表
  warehouseTypes?: WarehouseType[];  // 仓库类型
  truckingCodes?: string[];    // 适用车队列表
  truckingTypes?: PartnershipLevel[]; // 车队关系级别
  timeRange?: TimeRangeCondition; // 时间范围条件
}
```

**示例**：美国港口 + 平台仓库
```json
{
  "countryCodes": ["US"],
  "portCodes": ["USLGB", "USLAX"],
  "warehouseTypes": ["PLATFORM"]
}
```

### 2.4 执行动作 (Actions)

```typescript
interface RuleActions {
  scoreAdjustments?: {
    costWeight?: number;           // 成本权重 (0-1)
    capacityWeight?: number;        // 能力权重 (0-1)
    relationshipWeight?: number;    // 关系权重 (0-1)
    propertyPriorityBonus?: Record<string, number>; // 类型优先级加分
  };
  bonusPoints?: {
    partnershipLevel?: Record<string, number>; // 合作关系加分
    capacityThreshold?: number;   // 大运力阈值
    capacityBonus?: number;       // 大运力加分
    collaborationBonusFactor?: number; // 合作加分系数
    collaborationBonusMax?: number; // 合作加分上限
  };
  filters?: {
    minCapacity?: number;          // 最小容量要求
    excludeTypes?: string[];       // 排除的类型
  };
}
```

---

## 三、默认规则说明

### 3.1 默认仓库评分规则 (RULE-DEFAULT-WH-SCORING)

**规则编码**: `RULE-DEFAULT-WH-SCORING`

**触发条件**:
- 国家: 任意
- 仓库类型: 任意

**执行动作**:
```json
{
  "scoreAdjustments": {
    "costWeight": 0.35,
    "capacityWeight": 0.35,
    "relationshipWeight": 0.30
  },
  "bonusPoints": {
    "partnershipLevel": {
      "STRATEGIC": 25,
      "CORE": 15,
      "NORMAL": 5,
      "TEMPORARY": 0
    },
    "collaborationBonusFactor": 0.05,
    "collaborationBonusMax": 20
  },
  "filters": {
    "minCapacity": 20
  }
}
```

**静态配置对应** (`scheduling.config.ts`):
```typescript
SCORING_WEIGHTS: { COST: 0.35, CAPACITY: 0.35, RELATIONSHIP: 0.30 }
WAREHOUSE_PRIORITY: { SELF_OPERATED: 1, PLATFORM: 2, THIRD_PARTY: 3 }
```

---

### 3.2 默认车队评分规则 (RULE-DEFAULT-TRUCK-SCORING)

**规则编码**: `RULE-DEFAULT-TRUCK-SCORING`

**触发条件**:
- 国家: 任意
- 车队级别: 任意

**执行动作**:
```json
{
  "scoreAdjustments": {
    "costWeight": 0.40,
    "capacityWeight": 0.30,
    "relationshipWeight": 0.30
  },
  "bonusPoints": {
    "partnershipLevel": {
      "STRATEGIC": 30,
      "CORE": 20,
      "NORMAL": 10,
      "TEMPORARY": 0
    },
    "capacityThreshold": 10,
    "capacityBonus": 10,
    "collaborationBonusFactor": 0.05,
    "collaborationBonusMax": 25
  }
}
```

**静态配置对应**:
```typescript
SCORING_WEIGHTS: { COST: 0.40, CAPACITY: 0.30, RELATIONSHIP: 0.30 }
RELATIONSHIP_SCORING: {
  STRATEGIC: 30, CORE: 20, NORMAL: 10, TEMPORARY: 0,
  BASE_SCORE: 5, MAX_SCORE: 100
}
```

---

## 四、美国特殊规则

### 4.1 规则配置 (RULE-US-SCORING)

**规则编码**: `RULE-US-SCORING`

**触发条件**:
```json
{
  "countryCodes": ["US"]
}
```

**执行动作**:
```json
{
  "scoreAdjustments": {
    "costWeight": 0.35,
    "capacityWeight": 0.25,
    "relationshipWeight": 0.40
  },
  "bonusPoints": {
    "partnershipLevel": {
      "STRATEGIC": 35,
      "CORE": 25,
      "NORMAL": 10,
      "TEMPORARY": 0
    }
  }
}
```

### 4.2 与默认规则的差异

| 配置项 | 默认规则 | 美国规则 | 差异 |
|--------|----------|----------|------|
| 成本权重 | 40% | 35% | -5% |
| 能力权重 | 30% | 25% | -5% |
| **关系权重** | 30% | **40%** | **+10%** |
| STRATEGIC 加分 | 30 | 35 | +5 |
| CORE 加分 | 20 | 25 | +5 |

### 4.3 设计逻辑

**美国市场特点**:
1. **市场竞争充分**：美国物流市场竞争激烈，各车队成本差异相对较小
2. **合作关系重要**：长期合作伙伴关系能带来更稳定的服务质量
3. **服务稳定性优先**：相比单纯的价格优势，长期合作关系的稳定性更重要

**调整策略**:
- 降低**成本权重**（-5%），减少价格敏感度
- 降低**能力权重**（-5%），假设大多数车队能力达标
- 提高**关系权重**（+10%），鼓励与核心/战略合作伙伴长期合作

---

## 五、英国特殊规则

### 5.1 规则配置 (RULE-UK-WH-SCORING)

**规则编码**: `RULE-UK-WH-SCORING`

**触发条件**:
```json
{
  "countryCodes": ["GB", "UK"]
}
```

**执行动作**:
```json
{
  "scoreAdjustments": {
    "propertyPriorityBonus": {
      "PLATFORM": 10,
      "SELF_OPERATED": 8,
      "THIRD_PARTY": 3
    }
  }
}
```

### 5.2 与默认规则的差异

| 仓库类型 | 默认优先级分 | 英国优先级分 | 差异 |
|----------|--------------|--------------|------|
| PLATFORM（平台仓） | 2 | **10** | +8 |
| SELF_OPERATED（自营仓） | 1 | 8 | +7 |
| THIRD_PARTY（第三方仓） | 3 | 3 | 0 |

> 注：优先级分越高越优先选择

### 5.3 设计逻辑

**英国市场特点**:
1. **仓库资源有限**：英国本土仓库资源相对紧张
2. **平台仓优势**：平台仓库可共享资源，灵活性更高
3. **自营仓竞争**：自营仓数量有限，可能无法满足所有需求

**调整策略**:
- 提高**平台仓优先级分**（+8），优先使用可共享资源
- 保持**第三方仓**原有优先级，第三方仓质量参差不齐

---

## 六、规则执行流程

### 6.1 规则匹配流程

```
┌──────────────────────────────────────────────────────────────┐
│                    规则执行请求                               │
│  { warehouseCode, portCode, country, executionDate }        │
└─────────────────────────┬────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│                 查询所有启用规则                              │
│            WHERE is_active = true                           │
│            AND effective_from <= executionDate               │
│            AND (effective_to IS NULL OR >= executionDate)   │
└─────────────────────────┬────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│                 条件匹配筛选                                  │
│  遍历规则，检查条件是否全部满足                                 │
│  - countryCodes 匹配                                         │
│  - portCodes 匹配                                            │
│  - warehouseTypes 匹配                                       │
└─────────────────────────┬────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│                 优先级排序                                    │
│            ORDER BY priority ASC                             │
│            数值越小优先级越高                                  │
└─────────────────────────┬────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│                 执行最高优先级规则                            │
│            返回 adjustedScores                               │
└──────────────────────────────────────────────────────────────┘
```

### 6.2 评分计算流程

```
┌──────────────────────────────────────────────────────────────┐
│                   原始评分计算                                │
│  costScore = ((maxCost - cost) / costRange) * 100           │
│  capacityScore = hasCapacity ? 100 : 0                       │
│  relationshipScore = 基于合作历史                             │
└─────────────────────────┬────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│                   规则权重调整                                │
│  costScore *= rule.costWeight                                │
│  capacityScore *= rule.capacityWeight                        │
│  relationshipScore *= rule.relationshipWeight                │
└─────────────────────────┬────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│                   规则加分应用                                │
│  relationshipScore += partnershipLevelBonus                   │
│  relationshipScore += collaborationBonus                      │
└─────────────────────────┬────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│                   最终分数                                    │
│  totalScore = costScore + capacityScore + relationshipScore  │
└──────────────────────────────────────────────────────────────┘
```

---

## 七、前端操作指南

### 7.1 入口路径

```
排产配置 → 规则引擎
```

### 7.2 规则列表页面

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  规则引擎管理                                              [+ 创建规则]      │
├─────────────────────────────────────────────────────────────────────────────┤
│  [全部] [启用] [禁用]   搜索: [____________] [类型▼] [应用对象▼]             │
├─────────────────────────────────────────────────────────────────────────────┤
│  ☐ │ 规则名称           │ 类型           │ 应用    │ 优先级 │ 状态 │ 操作  │
├─────────────────────────────────────────────────────────────────────────────┤
│  ☐ │ 默认仓库评分       │ WAREHOUSE_SCORING │ 仓库   │  100   │  ●启用 │ ...  │
│  ☐ │ 默认车队评分       │ TRUCKING_SCORING  │ 车队   │  100   │  ●启用 │ ...  │
│  ☐ │ 美国特殊规则       │ WAREHOUSE_SCORING │ 仓库   │   50   │  ●启用 │ ...  │
│  ☐ │ 英国仓库优先规则    │ WAREHOUSE_SCORING │ 仓库   │   50   │  ○禁用 │ ...  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 7.3 创建/编辑规则

#### 基本信息
```
规则名称: [________________________]
规则编码: [________________________] (系统自动生成，可自定义)
规则类型: [WAREHOUSE_SCORING    ▼]
应用对象: [仓库                  ▼]
优先级:   [100] (数值越小越优先)
```

#### 触发条件
```
适用国家:
  [US] [GB] [DE] [+ 添加国家]

适用港口:
  [USLGB] [USLAX] [+ 添加港口]

适用仓库类型:
  [ ] 自营仓 (SELF_OPERATED)
  [✓] 平台仓 (PLATFORM)
  [ ] 第三方仓 (THIRD_PARTY)
```

#### 执行动作 - 评分权重
```
┌─────────────────────────────────────────────┐
│  评分权重配置                                 │
├─────────────────────────────────────────────┤
│  成本权重:     [====35%====] 0.35            │
│  能力权重:     [====35%====] 0.35            │
│  关系权重:     [====30%====] 0.30            │
│              (三项之和应接近或等于1.0)         │
└─────────────────────────────────────────────┘
```

#### 执行动作 - 合作关系加分
```
┌─────────────────────────────────────────────┐
│  合作关系加分配置                             │
├─────────────────────────────────────────────┤
│  战略合作伙伴: [===25===] +25分              │
│  核心合作伙伴: [===15===] +15分              │
│  普通合作伙伴: [===5====] +5分               │
│  临时合作:     [===0====] +0分               │
│                                             │
│  合作次数加分系数: [====5%====] 0.05          │
│  合作加分上限:   [====20====] 最高+20分       │
└─────────────────────────────────────────────┘
```

#### 执行动作 - 容量加分
```
┌─────────────────────────────────────────────┐
│  大运力加分配置                               │
├─────────────────────────────────────────────┤
│  容量阈值: [====10====] 10个集装箱           │
│  大运力加分: [===10===] +10分                │
└─────────────────────────────────────────────┘
```

### 7.4 测试规则

1. 选择测试上下文条件
   - 仓库代码
   - 港口代码
   - 国家代码

2. 点击「测试」按钮

3. 查看结果
```
┌─────────────────────────────────────────────┐
│  测试结果                                    │
├─────────────────────────────────────────────┤
│  匹配规则: 美国特殊规则 (RULE-US-SCORING)    │
│                                             │
│  分数调整:                                    │
│  - 成本权重: 0.40 → 0.35 (-0.05)             │
│  - 关系权重: 0.30 → 0.40 (+0.10)             │
│  - STRATEGIC加分: 30 → 35 (+5)              │
│                                             │
│  预期效果:                                    │
│  合作关系良好的战略伙伴评分将提高约 10-15%     │
└─────────────────────────────────────────────┘
```

### 7.5 规则管理操作

| 操作 | 说明 | 权限 |
|------|------|------|
| 查看详情 | 查看规则完整配置 | 所有用户 |
| 测试执行 | 测试规则匹配效果 | 所有用户 |
| 创建规则 | 新建规则 | 管理员 |
| 编辑规则 | 修改规则配置 | 管理员 |
| 启用/禁用 | 开关规则 | 管理员 |
| 删除规则 | 删除规则（保留历史） | 管理员 |
| 刷新缓存 | 重新加载规则缓存 | 管理员 |

---

## 八、API 接口

### 8.1 规则管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/scheduling/rules` | 查询规则列表 |
| GET | `/api/scheduling/rules/active` | 获取启用规则 |
| GET | `/api/scheduling/rules/:ruleId` | 获取规则详情 |
| POST | `/api/scheduling/rules` | 创建规则 |
| PUT | `/api/scheduling/rules/:ruleId` | 更新规则 |
| DELETE | `/api/scheduling/rules/:ruleId` | 删除规则 |
| POST | `/api/scheduling/rules/:ruleId/activate` | 激活规则 |
| POST | `/api/scheduling/rules/:ruleId/deactivate` | 禁用规则 |
| POST | `/api/scheduling/rules/reload` | 刷新缓存 |

### 8.2 规则测试

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/scheduling/rules/test-execute` | 测试规则执行 |

**请求示例**:
```json
POST /api/scheduling/rules/test-execute
{
  "warehouseCode": "WH001",
  "portCode": "USLGB",
  "country": "US",
  "executionDate": "2026-04-01"
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "matchedRule": {
      "ruleId": "RULE-US-SCORING",
      "ruleName": "美国特殊规则",
      "priority": 50
    },
    "adjustedScores": {
      "weights": {
        "cost": 0.35,
        "capacity": 0.25,
        "relationship": 0.40
      },
      "bonusPoints": {
        "STRATEGIC": 35,
        "CORE": 25
      }
    },
    "executionTimeMs": 12
  }
}
```

---

## 九、数据库表结构

### 9.1 核心表

| 表名 | 说明 |
|------|------|
| `scheduling_rules` | 规则主表 |
| `scheduling_rule_history` | 规则变更历史 |
| `scheduling_rule_dimensions` | 规则维度表 |
| `scheduling_rule_score_actions` | 评分动作表 |
| `scheduling_rule_execution_log` | 执行日志表 |

### 9.2 表关系图

```
┌─────────────────────┐       ┌──────────────────────────┐
│  scheduling_rules   │       │ scheduling_rule_history  │
│  - rule_id (PK)     │──────<│  - history_id (PK)       │
│  - rule_code        │       │  - rule_id (FK)         │
│  - conditions       │       │  - rule_snapshot         │
│  - actions          │       │  - change_type           │
└─────────────────────┘       └──────────────────────────┘
          │
          │ 1:N
          ▼
┌──────────────────────────┐  ┌──────────────────────────┐
│ scheduling_rule_dimensions│  │scheduling_rule_score_actions│
│  - dimension_id (PK)      │  │  - action_id (PK)        │
│  - rule_id (FK)          │  │  - rule_id (FK)          │
│  - dimension_type         │  │  - score_dimension        │
│  - dimension_values       │  │  - action_type            │
│  - operator              │  │  - action_value           │
└──────────────────────────┘  └──────────────────────────┘
                                        │
                                        │ 1:N
                                        ▼
                              ┌──────────────────────────┐
                              │scheduling_rule_execution_log│
                              │  - log_id (PK)           │
                              │  - execution_id          │
                              │  - matched_rule_id (FK)   │
                              │  - action_taken          │
                              │  - score_before/after     │
                              │  - executed_at            │
                              └──────────────────────────┘
```

---

## 十、最佳实践

### 10.1 规则设计原则

1. **保持简单**：每个规则只解决一个问题
2. **优先级明确**：避免多个规则覆盖相同条件
3. **增量调整**：优先修改权重而非推翻整个规则
4. **测试验证**：修改后先测试再上线

### 10.2 规则优先级建议

| 优先级范围 | 用途 | 示例 |
|------------|------|------|
| 1-50 | 特殊场景规则 | 美国规则、英国规则 |
| 51-100 | 默认规则 | 全局默认仓库/车队规则 |
| 101-200 | 备用规则 | 临时调整规则 |

### 10.3 权重配置建议

**总权重应为 1.0**：
```
costWeight + capacityWeight + relationshipWeight = 1.0
```

**市场差异化配置**：
| 市场 | 成本权重 | 能力权重 | 关系权重 | 说明 |
|------|----------|----------|----------|------|
| 默认 | 40% | 30% | 30% | 平衡型 |
| 美国 | 35% | 25% | 40% | 关系优先 |
| 英国 | 40% | 35% | 25% | 能力优先 |
| 新兴 | 50% | 25% | 25% | 价格敏感 |

---

## 十一、故障排查

### 11.1 规则未生效

**检查项**：
1. 规则 `is_active` 是否为 `true`
2. `effective_from` 是否已到生效日期
3. `effective_to` 是否已过失效日期
4. 规则的 `apply_to` 是否与调用场景匹配

### 11.2 规则匹配错误

**检查项**：
1. 条件配置是否正确（如国家代码格式）
2. 是否有更高优先级的规则覆盖
3. 调用时的上下文是否包含规则条件

### 11.3 缓存问题

**处理方法**：
1. 点击「刷新缓存」按钮
2. 或调用 `POST /api/scheduling/rules/reload`

---

## 附录 A：字段说明

### A.1 仓库类型 (WarehouseType)

| 类型 | 编码 | 说明 |
|------|------|------|
| 自营仓 | SELF_OPERATED | 公司自营仓库 |
| 平台仓 | PLATFORM | 共享平台仓库 |
| 第三方仓 | THIRD_PARTY | 第三方合作仓库 |

### A.2 合作关系级别 (PartnershipLevel)

| 级别 | 编码 | 说明 |
|------|------|------|
| 战略合作 | STRATEGIC | 最高级别合作伙伴 |
| 核心合作 | CORE | 核心供应商 |
| 普通合作 | NORMAL | 一般合作伙伴 |
| 临时合作 | TEMPORARY | 临时使用 |

### A.3 评分维度 (ScoreDimension)

| 维度 | 编码 | 说明 |
|------|------|------|
| 成本 | COST | 运输成本评分 |
| 能力 | CAPACITY | 运力/容量评分 |
| 关系 | RELATIONSHIP | 合作关系评分 |
| 质量 | QUALITY | 服务质量评分 |
| 距离 | DISTANCE | 距离/时效评分 |

---

*文档版本: 1.0.0*
*最后更新: 2026-04-01*
