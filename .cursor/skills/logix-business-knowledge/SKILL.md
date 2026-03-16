# LogiX 业务知识技能

## 技能信息

- **技能名称**：LogiX 业务知识
- **技能描述**：提供 LogiX 系统的核心业务知识，包括物流状态流转、筛选条件、滞港费计算、时间概念、港口操作、数据库表结构和数据服务重构等内容
- **技能类型**：业务知识
- **版本**：1.0.0

## 核心功能

- **物流状态流转**：解释物流状态机定义和状态判定逻辑
- **筛选条件**：说明系统支持的各种筛选方式和搜索功能
- **滞港费计算**：详细介绍滞港费计算规则和免费日更新机制
- **时间概念**：解释核心时间概念、倒计时计算和超期判定
- **港口操作**：说明多港经停场景和到港判定逻辑
- **数据库表结构**：提供核心主表结构、关联关系和字段映射
- **数据服务重构**：介绍货柜数据服务的重构方案和技术要点

## 业务知识分类

| 分类 | 关键词 | 内容概要 |
|------|--------|----------|
| 物流状态 | 状态、流转、桑基图、物流状态、state、status | 物流状态机定义和状态判定逻辑 |
| 筛选条件 | 筛选、过滤、按到港、按ETA、按计划提柜、filter、condition | 时间筛选、状态筛选、统计卡片筛选和搜索功能 |
| 滞港费 | 滞港费、堆存费、demurrage、storage、free_days、免费天数 | 滞港费计算规则和免费日更新机制 |
| 时间概念 | 历时、倒计时、超期、时间、eta、ata、duration | 核心时间概念、倒计时计算和超期判定 |
| 港口操作 | 多港、中转港、目的港、经停、port、transit、destination | 多港经停场景和到港判定逻辑 |
| 数据结构 | 表、表结构、数据库、table、schema、字段 | 核心主表结构、关联关系和字段映射 |
| 数据服务 | 数据服务、重构、ContainerDataService、ContainerQueryBuilder、enrich | 货柜数据服务的重构方案、技术要点和Enrich逻辑详解 |
| 开发实践 | AI幻觉、数据库字段、字段错误、leftJoin、leftJoinAndSelect、TypeORM | 消除AI幻觉与数据库字段错误的最佳实践 |

## 使用指南

### 如何调用

1. **直接提问**：在与 AI 助手对话时，直接询问相关业务知识，例如：
   - "什么是物流状态流转？"
   - "滞港费如何计算？"
   - "系统支持哪些筛选条件？"

2. **明确指定技能**：在问题中明确提及技能名称，例如：
   - "请使用业务知识技能查询物流状态流转"
   - "请使用业务知识技能解释滞港费计算规则"

### 常见问题

**Q: 物流状态机有哪些状态？**
A: 物流状态机包括：not_shipped（未出运）、shipped（已出运）、in_transit（在途）、at_port（已到目的港）、picked_up（已提柜）、unloaded（已卸柜）、returned_empty（已还箱）。

**Q: 如何计算最晚提柜日？**
A: 最晚提柜日 = 基准日 + (免费天数 - 1)天，基准日优先级：修正ETA → ETA → ATA → 实际卸船日。

**Q: 系统支持哪些筛选方式？**
A: 系统支持按出运日期、物流状态进行筛选，以及通过统计卡片进行筛选，还支持搜索集装箱号、备货单号、提单号等关键词。

**Q: 数据服务重构的核心组件有哪些？**
A: 数据服务重构的核心组件包括 ContainerQueryBuilder（统一查询构建）、ContainerDataService（分层数据服务）和 enrichContainersList（数据丰富）。

**Q: 如何消除AI幻觉？**
A: 消除AI幻觉的策略包括：基于实际代码分析、严格遵循现有代码结构、避免臆造功能、验证API的存在性和用法。

**Q: 如何避免数据库字段错误？**
A: 避免数据库字段错误的方法：在QueryBuilder中使用camelCase格式的实体属性名、只在原生SQL中使用snake_case格式的数据库列名、利用TypeScript的类型系统捕获字段名错误。

**Q: createBaseQuery与leftJoinAndSelect的区别是什么？**
A: createBaseQuery使用leftJoin，只参与WHERE条件，不加载关联实体；而leftJoinAndSelect会加载关联实体到结果中，确保enrich逻辑能获取到完整数据。

**Q: Enrich逻辑的实现原理是什么？**
A: Enrich逻辑通过批量查询优化，收集所有货柜号，一次性查询所有关联数据，使用Promise.all并行处理多个查询，将结果转换为Map结构提高查找效率，为货柜数据添加丰富的关联信息和计算字段。

**Q: Enrich数据结构包含哪些字段？**
A: Enrich数据结构包含基础字段、订单信息、状态信息、港口信息、海运信息、时间信息、供应商信息和关联数据等多个维度的字段，为前端提供完整的货柜信息。

**Q: Enrich的价值与意义是什么？**
A: Enrich的价值在于数据整合、性能优化、业务逻辑统一和代码复用，能够为前端和其他服务提供完整、一致、有业务语义的数据，同时保持良好的性能表现。

## 参考文档

- **数据库主表关系**：`frontend/public/docs/03-database/01-数据库主表关系.md`
- **货柜表格绑定**：`frontend/public/docs/09-misc/12-货柜表格绑定.md`
- **多订单货柜设计**：`frontend/public/docs/02-architecture/03-多订单货柜设计.md`
- **TimescaleDB指南**：`frontend/public/docs/08-deployment/01-TimescaleDB指南.md`

## 技术实现

- **知识库文件**：`backend/src/ai/data/knowledgeBase.template.ts`
- **知识管理**：`backend/src/ai/utils/knowledgeManager.ts`
- **数据服务**：`backend/src/services/ContainerDataService.ts`
- **查询构建**：`backend/src/services/statistics/common/ContainerQueryBuilder.ts`

## 版本历史

| 版本 | 日期 | 变更内容 |
|------|------|----------|
| 1.0.0 | 2026-03-16 | 初始版本，包含物流状态、筛选条件、滞港费计算、时间概念、港口操作、数据库表结构和数据服务重构等内容 |
| 1.1.0 | 2026-03-16 | 添加Enrich逻辑详解相关内容，包括实现原理、数据结构、价值与意义等 |