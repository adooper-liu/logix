# 智能排产规则引擎设计文档

## 1. 概述

### 1.1 背景
当前 `intelligentScheduling.service.ts` 中的评分规则（如车队关系级别加分、评分权重）是硬编码在常量文件中的。为了支持运行时配置和差异化规则，需要设计一个可扩展的规则引擎。

### 1.2 目标
- 支持数据库存储规则定义
- 支持不同国家/港口的差异化规则
- 支持规则优先级和冲突处理
- 保持向后兼容（静态配置作为 fallback）

## 2. 数据库表设计

### 2.1 核心表结构

| 表名 | 说明 |
|------|------|
| `scheduling_rules` | 规则定义表 |
| `scheduling_rule_history` | 规则变更历史 |
| `scheduling_rule_dimensions` | 规则维度条件 |
| `scheduling_rule_score_actions` | 评分动作配置 |
| `scheduling_rule_execution_log` | 规则执行日志 |

### 2.2 规则条件配置 (conditions)

```json
{
  "countryCodes": ["US", "CA"],      // 适用国家
  "portCodes": ["USLAX", "USLGB"],   // 适用港口
  "warehouseTypes": ["SELF_OPERATED"], // 适用仓库类型
  "truckingTypes": ["CORE", "STRATEGIC"], // 适用车队级别
  "timeRange": {                      // 适用时间范围
    "startHour": 8,
    "endHour": 18
  }
}
```

### 2.3 规则动作配置 (actions)

```json
{
  "scoreAdjustments": {
    "scoreWeights": {
      "cost": 0.35,
      "capacity": 0.25,
      "relationship": 0.40
    }
  },
  "bonusPoints": {
    "partnershipLevel": {
      "STRATEGIC": 35,
      "CORE": 25,
      "NORMAL": 15
    },
    "capacityThreshold": 50,
    "capacityBonus": 15
  }
}
```

## 3. 规则匹配机制

### 3.1 匹配流程

```
1. 根据 applyTo 筛选规则类型
2. 检查生效时间 (effective_from / effective_to)
3. 评估每个条件的匹配度
4. 按优先级排序
5. 返回匹配度最高的规则
```

### 3.2 匹配度计算

- 每个条件权重为 1
- 匹配度 = 匹配条件数 / 总条件数
- 匹配度 >= 50% 视为匹配

### 3.3 优先级处理

- `priority` 数值越小，优先级越高
- 高优先级规则先应用
- 支持设置默认规则（无匹配时使用）

## 4. 差异化规则示例

### 4.1 美国港口特殊规则

```json
{
  "ruleId": "RULE-US-PORT-SCORING",
  "ruleCode": "US_PORT_TRUCKING_SCORING",
  "conditions": {
    "countryCodes": ["US"]
  },
  "actions": {
    "scoreAdjustments": {
      "scoreWeights": {
        "cost": 0.35,
        "capacity": 0.25,
        "relationship": 0.40
      }
    },
    "bonusPoints": {
      "partnershipLevel": {
        "STRATEGIC": 35,
        "CORE": 25,
        "NORMAL": 15
      }
    }
  },
  "priority": 100,
  "isActive": true
}
```

### 4.2 英国仓库优先规则

```json
{
  "ruleId": "RULE-UK-PORT-WH-SCORING",
  "ruleCode": "UK_PORT_WAREHOUSE_SCORING",
  "conditions": {
    "countryCodes": ["UK"]
  },
  "actions": {
    "scoreAdjustments": {
      "propertyPriorityBonus": {
        "SELF_OPERATED": 2,
        "PLATFORM": 1,
        "THIRD_PARTY": 3
      }
    }
  },
  "priority": 100,
  "isActive": true
}
```

## 5. API 接口

### 5.1 规则管理

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/scheduling/rules` | 创建规则 |
| PUT | `/api/scheduling/rules/:ruleId` | 更新规则 |
| DELETE | `/api/scheduling/rules/:ruleId` | 删除规则 |
| GET | `/api/scheduling/rules` | 查询规则列表 |
| GET | `/api/scheduling/rules/active` | 获取所有启用规则 |
| GET | `/api/scheduling/rules/:ruleId` | 获取规则详情 |
| GET | `/api/scheduling/rules/:ruleId/history` | 获取规则变更历史 |
| POST | `/api/scheduling/rules/:ruleId/activate` | 激活规则 |
| POST | `/api/scheduling/rules/:ruleId/deactivate` | 停用规则 |
| POST | `/api/scheduling/rules/reload` | 重新加载规则缓存 |
| POST | `/api/scheduling/rules/test-execute` | 测试规则执行 |

### 5.2 测试接口示例

```bash
# 测试美国港口规则
curl -X POST http://localhost:3000/api/scheduling/rules/test-execute \
  -H "Content-Type: application/json" \
  -d '{
    "executionId": "test-001",
    "countryCode": "US",
    "portCode": "USLAX",
    "truckingType": "STRATEGIC",
    "baseRelationshipScore": 50
  }'

# 响应
{
  "matchedRule": {
    "ruleId": "RULE-US-PORT-SCORING",
    "ruleCode": "US_PORT_TRUCKING_SCORING",
    "ruleName": "美国港口车队评分规则",
    "priority": 100
  },
  "originalScores": {
    "cost": 50,
    "capacity": 50,
    "relationship": 50
  },
  "adjustedScores": {
    "cost": 50,
    "capacity": 50,
    "relationship": 85,
    "weights": {
      "cost": 0.35,
      "capacity": 0.25,
      "relationship": 0.40
    }
  },
  "executionTimeMs": 12
}
```

## 6. 与现有代码集成

### 6.1 静态配置优先

```typescript
// intelligentScheduling.service.ts

import { ruleEngineService } from './RuleEngineService';
import { SCHEDULING_RULES } from '../constants/SchedulingRules';

// 获取评分权重（先尝试规则引擎，后使用静态配置）
async getScoringWeights(context: RuleExecutionContext) {
  const result = await ruleEngineService.executeRules(context);

  if (result.matchedRule) {
    return {
      cost: result.adjustedScores.weights?.cost ?? SCORING_WEIGHTS.COST,
      capacity: result.adjustedScores.weights?.capacity ?? SCORING_WEIGHTS.CAPACITY,
      relationship: result.adjustedScores.weights?.relationship ?? SCORING_WEIGHTS.RELATIONSHIP
    };
  }

  // Fallback 到静态配置
  return {
    cost: SCORING_WEIGHTS.COST,
    capacity: SCORING_WEIGHTS.CAPACITY,
    relationship: SCORING_WEIGHTS.RELATIONSHIP
  };
}
```

### 6.2 获取关系级别加分

```typescript
async getPartnershipLevelBonus(truckingType: string, context?: RuleExecutionContext) {
  // 先查询规则引擎
  if (context) {
    const result = await ruleEngineService.executeRules(context);
    if (result.matchedRule?.actions?.bonusPoints?.partnershipLevel) {
      return result.matchedRule.actions.bonusPoints.partnershipLevel[truckingType] ?? 0;
    }
  }

  // Fallback 到静态配置
  return getPartnershipLevelBonus(truckingType);
}
```

## 7. 性能考虑

### 7.1 缓存策略
- 规则数据缓存 5 分钟
- API 接口支持手动刷新缓存
- 规则变更时自动清除缓存

### 7.2 执行日志
- 记录规则执行上下文
- 记录匹配条件和执行动作
- 记录执行前后分数变化
- 用于调试和审计

## 8. 实施计划

### Phase 1: 基础设施 ✅
- [x] 数据库表结构设计
- [x] TypeORM 实体定义
- [x] 规则引擎服务

### Phase 2: API 接口
- [x] 规则管理 CRUD 接口
- [x] 规则测试执行接口
- [ ] 注册到模块

### Phase 3: 与智能排产集成
- [ ] 规则引擎服务集成到 `intelligentScheduling.service.ts`
- [ ] 评分权重动态获取
- [ ] 关系级别加分动态获取

### Phase 4: 完善功能
- [ ] 规则维度表支持
- [ ] 规则执行日志查询
- [ ] 规则变更告警

## 9. 文件清单

| 文件路径 | 说明 |
|---------|------|
| `migrations/041_scheduling_rule_engine.sql` | 数据库表结构 |
| `backend/src/entities/SchedulingRule.entities.ts` | TypeORM 实体 |
| `backend/src/services/RuleEngineService.ts` | 规则引擎服务 |
| `backend/src/dto/SchedulingRule.dto.ts` | DTO 定义 |
| `backend/src/controllers/SchedulingRule.controller.ts` | API 控制器 |
| `frontend/public/docs/智能排产/规则引擎设计.md` | 设计文档 |

## 10. 后续扩展方向

### 10.1 规则可视化配置
- 前端页面管理规则
- 可视化条件编辑器
- 规则模拟测试工具

### 10.2 规则版本管理
- 规则版本号
- 规则回滚
- 规则发布审批流

### 10.3 规则分析
- 规则命中率统计
- 规则效果分析
- 规则优化建议
