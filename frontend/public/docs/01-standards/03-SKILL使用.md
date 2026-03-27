# SKILL 使用

CodeBuddy AI 辅助开发技能（SKILL）使用指南。

## SKILL 简介

SKILL 是 CodeBuddy 的专业技能系统，为 LogiX 项目提供领域特定的知识和工具。

## 核心 SKILL

### logix-development

**用途**: 核心开发技能，数据库优先原则、命名规范、开发流程

**触发**: 任何后端/前端开发任务

**内容**:
- 数据库优先开发原则
- 命名规则对照表
- 开发流程指南
- 常见任务速查

### database-query

**用途**: PostgreSQL 数据库查询

**触发**: 需要编写 SQL 查询时

**内容**:
- 查询示例
- 性能优化
- 常见模式

### excel-import-requirements

**用途**: Excel 数据导入规范

**触发**: 导入/导出功能开发

**内容**:
- 字段映射规则
- 数据类型转换
- 主键处理

### vue-best-practices

**用途**: Vue 3 开发规范

**触发**: 任何 Vue 组件开发

**内容**:
- Composition API 规范
- TypeScript 类型定义
- 组件结构

### vue-testing-best-practices

**用途**: Vue 测试规范

**触发**: 编写测试用例

**内容**:
- Vitest 单元测试
- Vue Test Utils
- Playwright E2E

### logix-demurrage

**用途**: 滞港费计算逻辑

**触发**: 滞港费相关开发

**内容**:
- 计算规则
- 匹配条件
- 费用项合计

### code-review

**用途**: 代码质量审查

**触发**: 代码审查请求

**内容**:
- 质量标准
- 安全检查
- 性能评估

### commit-message

**用途**: 生成 Git 提交信息

**触发**: 需要提交代码时

**内容**:
- 提交格式
- 作用域定义
- 示例

### document-processing

**用途**: Excel/PDF 文档处理

**触发**: 文档处理任务

**内容**:
- xlsx 文件读写
- PDF 解析

### postgresql-table-design

**用途**: PostgreSQL 表设计

**触发**: 数据库设计任务

**内容**:
- 最佳实践
- 数据类型选择
- 索引设计

## 使用方式

### 自动触发

CodeBuddy 会根据任务内容自动加载相关 SKILL。

```bash
# 触发 logix-development
"修复货柜列表查询的 bug"

# 触发 database-query
"编写一个查询货柜统计的 SQL"

# 触发 vue-best-practices
"创建一个新的货柜卡片组件"
```

### 手动触发

使用 use_skill 工具显式加载。

```
skill: logix-development
skill: database-query
skill: vue-best-practices
```

## SKILL 文件位置

```
.codebuddy/skills/
├── logix-development/         # 核心开发
├── database-query/            # 数据库查询
├── excel-import-requirements/ # Excel 导入
├── vue-best-practices/        # Vue 规范
├── vue-testing-best-practices/# 测试规范
├── logix-demurrage/           # 滞港费
├── code-review/               # 代码审查
├── commit-message/            # 提交信息
├── document-processing/       # 文档处理
├── postgresql-table-design/   # 表设计
└── ...
```

## 文档原则

SKILL 遵循以下原则：

```
简洁即美: 去除 emoji、装饰性语言
真实第一: 所有命令可执行，输出真实
遵循规范: 数据库优先、基于权威源验证
业务导向: 解决实际问题
```

详细规范见各 SKILL 文档。
