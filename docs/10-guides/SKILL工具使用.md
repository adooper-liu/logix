# LogiX SKILL 工具使用指南

> 借助 CodeBuddy SKILL 提升开发效率

## SKILL 概述

LogiX 项目为 CodeBuddy 配置了多个专业 SKILL，提供特定领域的专业知识、标准化工作流和可执行工具。

## SKILL 列表

### 核心开发 SKILL

| SKILL | 用途 | 触发时机 |
|-------|------|----------|
| `logix-development` | LogiX 开发规范和标准 | 所有开发任务 |
| `database-query` | PostgreSQL/TimescaleDB 查询 | 数据库相关任务 |
| `excel-import-requirements` | Excel 导入规范 | Excel 导入功能 |
| `document-processing` | Excel/PDF 处理 | 文档处理任务 |
| `code-review` | 代码质量审查 | 代码审查请求 |

### Vue 开发 SKILL

| SKILL | 用途 | 触发时机 |
|-------|------|----------|
| `vue-best-practices` | Vue 3 最佳实践 | Vue 组件开发 |
| `vue-testing-best-practices` | Vue 测试指南 | 编写 Vue 测试 |

### 领域专用 SKILL

| SKILL | 用途 | 触发时机 |
|-------|------|----------|
| `logix-demurrage` | 滞港费计算逻辑 | 滞港费相关开发 |
| `data-import-verify` | 数据导入验证 | 验证导入数据 |
| `feituo-eta-ata-validation` | 飞驼 ETA/ATA 验证 | 飞驼数据验证 |
| `intelligent-scheduling-date-calculation` | 智能排柜日期计算 | 排柜功能开发 |
| `typeorm-exists-subquery-solution` | TypeORM EXISTS 子查询 | 复杂查询问题 |

## 如何使用 SKILL

### 自动触发

CodeBuddy 会根据任务内容自动加载相关 SKILL。例如：
- 编写 Vue 组件 → 自动加载 `vue-best-practices`
- 数据库查询 → 自动加载 `database-query`
- Excel 导入 → 自动加载 `excel-import-requirements`

### 手动触发

在对话中明确指定 SKILL：

```
请使用 logix-demurrage SKILL 帮助我理解滞港费的计算规则。
```

## 常用 SKILL 详解

### logix-development

**用途**：LogiX 项目核心开发规范

**核心内容**：
- 数据库优先原则
- 命名与映射规则
- 项目结构速查
- 开发流程
- 数据库迁移规范

**示例问题**：
- "如何新增一个数据库表？"
- "备货单和货柜是什么关系？"
- "滞港费标准的选择条件是什么？"

### database-query

**用途**：PostgreSQL/TimescaleDB 数据库查询

**核心内容**：
- Schema 参考（表结构）
- 常用查询模式
- 日期筛选方法
- 关联查询示例

**示例问题**：
- "如何查询货柜的滞港费信息？"
- "统计已到目的港的货柜数量"
- "按日期范围筛选备货单"

### vue-best-practices

**用途**：Vue 3 开发最佳实践

**核心内容**：
- Composition API 规范
- 组件设计原则
- 响应式系统
- 性能优化

**示例问题**：
- "如何设计一个可复用的表格组件？"
- "如何正确使用 ref 和 reactive？"
- "组件拆分原则是什么？"

### logix-demurrage

**用途**：滞港费计算逻辑

**核心内容**：
- 滞港费标准匹配条件
- 免费天数计算
- 多行费用项合计
- 预测模式规则

**示例问题**：
- "滞港费的匹配条件有哪些？"
- "免费天数如何计算？"
- "预测模式和实际模式有什么区别？"

### excel-import-requirements

**用途**：Excel 导入规范

**核心内容**：
- 字段映射规则
- 数据类型转换
- 主键处理
- 模板格式要求

**示例问题**：
- "如何新增一个导入字段？"
- "日期格式如何转换？"
- "如何处理主键冲突？"

## SKILL 使用技巧

### 1. 明确问题背景

```markdown
# 推荐
在货柜详情页，我需要显示滞港费信息。
请帮我确认应该调用哪个 API 接口？

# 不推荐
帮我看看
```

### 2. 指定 SKILL

```markdown
# 推荐
请使用 database-query SKILL 查询滞港费计算需要的字段

# 不推荐
帮我查一下数据库
```

### 3. 结合代码上下文

```markdown
# 推荐
我正在修改 container.service.ts 中的 findOne 方法，
需要确保返回货柜的港口操作信息。
请帮我确认关联查询的方式。
```

### 4. 分步提问

```markdown
# 推荐
第一步：确认货柜表的字段结构
第二步：确认港口操作表的字段结构
第三步：确认如何关联查询
```

## SKILL 与文档的关系

SKILL 提供：
- 实时交互指导
- 代码生成建议
- 问题诊断建议

文档提供：
- 完整的参考信息
- 可离线查阅
- 体系化知识

**建议**：先阅读文档了解体系，再通过 SKILL 解决具体问题。

## 下一步

- [开发环境准备](./开发环境准备.md) - 环境搭建
- [项目结构速查](./项目结构速查.md) - 代码组织
- [开发流程指南](./开发流程指南.md) - 功能开发
- [测试指南](./测试指南.md) - 测试编写
- [排错指南](./排错指南.md) - 问题排查
