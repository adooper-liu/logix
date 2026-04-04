# SKILL 使用

LogiX 项目技能（SKILL）使用指南。

## SKILL 简介

SKILL 是 LogiX 项目的专业知识系统，为开发提供领域特定的知识和最佳实践。

## SKILL 文件位置

### 主 SKILL 目录

```
.lingma/skills/
├── 00-core/                    # 核心技能
│   ├── README.md              # 技能地图
│   └── logix-dev-paradigm.md  # 开发范式
├── 01-backend/                 # 后端技能
│   ├── database-query/        # 数据库查询
│   ├── postgresql-table-design/ # 表设计
│   └── excel-import-requirements/ # Excel导入
├── 02-frontend/                # 前端技能
│   ├── vue-best-practices/    # Vue最佳实践
│   └── vue-testing-best-practices/ # Vue测试
├── 04-quality/                 # 质量保障
│   ├── code-review/           # 代码审查
│   └── commit-message/        # 提交信息
├── 05-domain/                  # 领域知识
│   ├── scheduling/            # 智能排产
│   └── logistics/             # 物流追踪
└── INDEX.md                    # 技能索引
```

### 快速查找

```bash
# 查看技能地图
cat .lingma/skills/00-core/README.md

# 查看技能索引
cat .lingma/skills/INDEX.md

# 查看开发范式
cat .lingma/skills/00-core/logix-dev-paradigm.md
```

## 核心 SKILL

| SKILL        | 说明                           | 位置                                  |
| ------------ | ------------------------------ | ------------------------------------- |
| 开发范式总纲 | 五维分析法、SKILL原则          | 00-core/logix-dev-paradigm.md         |
| 数据库查询   | PostgreSQL/TimescaleDB规范     | 01-backend/database-query/            |
| Vue最佳实践  | Composition API + script setup | 02-frontend/vue-best-practices/       |
| 代码审查     | Code Review规范                | 04-quality/code-review/               |
| 滞港费计算   | 成本优化算法                   | 05-domain/scheduling/logix-demurrage/ |

## SKILL 原则

1. **单一职责**：一个 SKILL 只解决一类问题
2. **知识沉淀**：积累开发经验和业务知识
3. **索引清晰**：编号管理，快速查找
4. **活文档**：持续更新，与代码同步
5. **面向学习**：帮助开发者快速上手

## 使用方式

### 方式一：手动调用（传统方式）

1. 开发前查阅相关 SKILL
2. 遇到问题先搜索 SKILL 索引
3. 新功能开发后更新 SKILL
4. 定期审查 SKILL 与代码一致性

### 方式二：自动触发（推荐方式）⭐

**核心理念**：让用户**完全忘记 Skill 名称**，AI 自动识别场景并调用相应的 Skill。

**触发规则文件**：`.lingma/rules/ai-auto-skill-trigger.mdc`

#### 自动触发规则列表

目前支持 **11 条自动触发规则**，覆盖以下场景：

| 规则        | 触发场景      | 自动调用技能                          | 典型语句示例                               |
| ----------- | ------------- | ------------------------------------- | ------------------------------------------ |
| **规则 1**  | 数据库相关    | `fix-verification` + `database-query` | "unload_mode_plan 这个字段名对吗？"        |
| **规则 2**  | 前端相关      | `vue-best-practices`                  | "这个 Vue 组件怎么写？"                    |
| **规则 3**  | 后端相关      | `logix-development`                   | "后端 API 怎么设计？"                      |
| **规则 4**  | 文档生成      | `code-to-doc` ⭐                      | "帮我分析 demurrage.service.ts 的计算逻辑" |
| **规则 5**  | 验证/检查     | `fix-verification`                    | "这个字段名对吗？"                         |
| **规则 6**  | 滞港费计算    | `logix-demurrage`                     | "滞港费是怎么计算的？"                     |
| **规则 7**  | 智能排产      | `intelligent-scheduling-mapping`      | "CA-S003 这个仓库是怎么分配的？"           |
| **规则 8**  | 物流状态机    | `container-alerts-state-machine`      | "状态机的优先级是怎么判断的？"             |
| **规则 9**  | 飞驼 ETA 验证 | `feituo-eta-ata-validation`           | "飞驼的 ETA 数据准确吗？"                  |
| **规则 10** | 代码审查      | `code-review`                         | "帮我 review 一下这段代码"                 |
| **规则 11** | Git 提交      | `commit-message`                      | "帮我写个 commit message"                  |

#### 重点规则说明

##### 规则 4：文档生成 → code-to-doc

**触发条件**：

- 用户提到 "分析...计算逻辑"、"生成文档"、"场景模拟"
- 用户询问复杂业务逻辑（费用计算、排产调度、状态机等）
- 用户要求理解某个 Service 或模块的计算方式
- 用户打开 Service 文件并要求解释

**AI 执行步骤**：

1. 识别目标模块类型（费用计算/智能排柜/成本优化/状态机/统计分析）
2. 读取源代码（Service 层、工具函数、实体定义）
3. 提取核心计算公式和参数
4. 设计场景矩阵（正常/边界/异常）
5. 手工验算每个场景
6. 生成标准格式的 Markdown 文档
7. 标注权威来源

**生成的文档必须包含**：

- ✅ 核心计算公式
- ✅ 关键参数表（注明数据库来源）
- ✅ 至少 3 个场景模拟（含详细计算过程）
- ✅ 对比表格（如存在多模式）
- ✅ 权威源代码引用

**文档保存路径**：

- 默认：`frontend/public/docs/第 2 层 - 代码文档/[模块名称] 计算逻辑场景模拟.md`
- 如用户指定其他位置，则保存到用户指定的位置

##### 规则 6：滞港费计算 → logix-demurrage

**触发条件**：

- 用户提到 "滞港费"、"demurrage"、"滞箱费"、"detention"
- 用户询问费用计算逻辑、起算日、截止日
- 用户提到 last_free_date、last_return_date
- 用户询问 actual/forecast 计算模式

**数据来源**：

- 目的港 ATA：`process_port_operations.ata_dest_port`
- 修正 ETA：`process_port_operations.revised_eta`
- 计划提柜日：`process_trucking_transport.planned_pickup_date`
- 实际提柜日：`process_trucking_transport.pickup_date`
- 最晚提柜日：`process_port_operations.last_free_date`

##### 规则 7：智能排产 → intelligent-scheduling-mapping

**触发条件**：

- 用户提到 "智能排产"、"排柜"、"调度"
- 用户询问仓库选择、车队选择逻辑
- 用户提到 dict_warehouse_trucking_mapping
- 用户询问 CA-S003/FBW_CA 等排产规则

#### 违规处罚机制

如果 AI 没有自动调用 Skill：

1. **第一次**：用户提醒 → AI 立即调用
2. **第二次**：用户警告 → AI 重新执行并调用
3. **第三次**：用户报告 → 系统记录违规

**违规判定**：

- ❌ 只说"会调用"但没有实际调用
- ❌ 用 AI 幻觉编造答案
- ❌ 没有读取权威源就修改代码
- ❌ 违反"先验证，后修改"原则

#### 用户使用指南

**你只需要**：

1. ✅ 用自然语言描述问题（例如："这个字段名对吗？"）
2. ✅ 监督 AI 是否自动调用 Skill
3. ✅ 检查 AI 是否读取真实代码验证

**你不需要**：

- ❌ 记住任何 Skill 名称
- ❌ 手动指定调用哪个 Skill
- ❌ 担心 AI 幻觉（它必须验证）

#### 快速开始示例

**示例 1：文档生成**

```
用户：帮我分析 demurrage.service.ts 的计算逻辑，生成场景模拟文档
AI：[自动调用 code-to-doc] → 生成完整文档
```

**示例 2：滞港费咨询**

```
用户：滞港费是怎么计算的？actual 模式和 forecast 模式有什么区别？
AI：[自动调用 logix-demurrage] → 详细解释计算逻辑
```

**示例 3：智能排产**

```
用户：CA-S003 这个仓库是怎么分配的？销往英国的货柜应该去哪个仓库？
AI：[自动调用 intelligent-scheduling-mapping] → 分析排产逻辑
```

**示例 4：状态机**

```
用户：状态机的优先级是怎么判断的？为什么这个货柜是 returned_empty 状态？
AI：[自动调用 container-alerts-state-machine] → 解释状态判断逻辑
```

**示例 5：代码审查**

```
用户：帮我 review 一下这段代码，看看有什么问题吗？
AI：[自动调用 code-review] → 输出审查报告
```

---
