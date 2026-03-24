# LogiX 项目 Skills 索引

本目录包含 LogiX 项目开发所需的所有技能规范，AI 助手会自动应用这些技能来提升代码质量和开发效率。

---

## 📚 Skills 列表

### ⭐⭐⭐ 核心技能（必须）

#### 1. **logix-development** - LogiX 项目开发全流程

- **文件**: `logix-development/SKILL.md`
- **用途**: 完整的开发流程指导，涵盖从数据库设计到前端实现的所有环节
- **使用场景**:
  - ✅ 开发新功能
  - ✅ 修复 bug
  - ✅ 修改现有代码
  - ✅ 代码审查参考
- **核心内容**:
  - 核心原则（数据库优先、数据完整性、日期口径统一）
  - 命名与映射规则（完整对照表）
  - 项目结构速查（数据库表关联链、API 路由）
  - 开发任务检查清单（新增功能 5 步法、修改功能 3 步法）
  - 常见场景最佳实践
  - 代码审查要点
  - 问题排查指南

#### 1b. **logix-quality-gates** - 质量门禁与技术债

- **文件**: `logix-quality-gates/SKILL.md`
- **用途**: 合并前检查、`npm run quality` / `verify:stats-filter`、还债文档维护、CI 目标对齐
- **使用场景**:
  - ✅ 准备合并或建立 CI
  - ✅ 修改统计、筛选、`ContainerStatisticsService`、`*Statistics.service`
  - ✅ 更新 `docs/quality/DEVELOPMENT_DEBT.md` 时核对要点
- **核心内容**:
  - 根目录命令：`validate` / `test` / `quality` / `verify:stats-filter`
  - 对账脚本必跑条件
  - 与 `logix-development` 的关系（不降低门禁）

---

### ⭐⭐ 专用技能（按场景使用）

#### 2. **database-query** - 数据库查询与分析

- **文件**: `database-query/SKILL.md`
- **用途**: PostgreSQL/TimescaleDB 数据库查询规范
- **使用场景**:
  - ✅ 编写 SQL 查询
  - ✅ 数据分析
  - ✅ 数据库调试
  - ✅ 性能优化
- **核心内容**:
  - 表前缀规范（dict*, biz*, process*, ext*）
  - 核心表关系图
  - 常用查询模式
  - 日期筛选口径
  - 注意事项

#### 3. **document-processing** - Excel/PDF 文档处理

- **文件**: `document-processing/SKILL.md`
- **用途**: Excel 和 PDF 文件的导入导出处理
- **使用场景**:
  - ✅ Excel 数据导入
  - ✅ 报表导出
  - ✅ PDF 解析
  - ✅ 数据转换
- **核心内容**:
  - Excel 导入约定（table/field 映射）
  - xlsx/exceljs 使用示例
  - PDF 提取技巧
  - 字段映射校验

#### 4. **excel-import-requirements** - Excel 导入规范

- **文件**: `excel-import-requirements/SKILL.md`
- **用途**: LogiX Excel 导入的完整要求与实现规范
- **使用场景**:
  - ✅ 实现或扩展 Excel 导入功能
  - ✅ 调试导入错误
  - ✅ 新增字典/业务导入
  - ✅ 编写导入模板
- **核心内容**:
  - 映射与命名规则
  - 类型转换（布尔、日期、数字）
  - 主键处理（业务主键 vs 自增 id）
  - 模板导出规范
  - 后端要求与检查清单

#### 5. **code-review** - 代码质量审查

- **文件**: `code-review/SKILL.md`
- **用途**: 代码质量、安全性和可维护性审查
- **使用场景**:
  - ✅ Pull Request 审查
  - ✅ 代码检查
  - ✅ 质量评估
  - ✅ 自我审查
- **核心内容**:
  - 核心原则检查
  - 命名与映射验证
  - 代码风格审查
  - 反馈格式（Critical/Suggestion/Nice to have）

---

### ⭐ 辅助技能

#### 6. **commit-message** - Git 提交信息生成

- **文件**: `commit-message/SKILL.md`
- **用途**: 生成规范的 Conventional Commits 提交信息
- **使用场景**:
  - ✅ 提交代码
  - ✅ 编写 changelog
  - ✅ 版本管理
- **核心内容**:
  - Commit 格式规范
  - Type 分类说明
  - Scope 命名建议
  - 示例模板

#### 7. **gantt-drag-drop** - 甘特图拖拽实现

- **文件**: `gantt-drag-drop/SKILL.md`
- **用途**: 甘特图拖拽落点识别、高亮、确认弹窗的实现要点
- **使用场景**:
  - ✅ 实现或修改甘特图拖拽
  - ✅ 调试落点识别、高亮异常
  - ✅ 确认弹窗需点二次等问题
- **核心内容**:
  - elementFromPoint 精确定位
  - RAF 节流防卡顿
  - 确认弹窗在 dragend 后、双重 rAF 避免首次点击被消费

#### 8. **gantt-hierarchy** - 甘特图一、二、三级层级

- **文件**: `gantt-hierarchy/SKILL.md`
- **用途**: 甘特图目的港→节点→供应商三级分组与折叠实现
- **使用场景**:
  - ✅ 修改甘特图分组结构
  - ✅ 调整折叠/展开逻辑
  - ✅ 新增节点或供应商维度
- **核心内容**:
  - finalGroupedByPort 数据结构
  - 折叠 key 约定与一级互斥
  - 模板嵌套与辅助函数

#### 9. **vue-flow-troubleshooting** - Vue Flow 问题排查

- **文件**: `vue-flow-troubleshooting/SKILL.md`
- **用途**: FlowEditor 中 Vue Flow 报错排查与修复
- **使用场景**:
  - ✅ `Cannot read properties of undefined (reading 'height')`
  - ✅ `Cannot read properties of undefined (reading 'target')`
  - ✅ Handle/Node 挂载或渲染异常
  - ✅ MISSING_VIEWPORT_DIMENSIONS 等
- **核心内容**:
  - 节点必须包含 dimensions、handleBounds
  - 常见错误与对应修复
  - 排查步骤与检查清单

#### 10. **intelligent-scheduling-mapping** - 智能排柜映射与仓库/车队选择

- **文件**: `intelligent-scheduling-mapping/SKILL.md`
- **用途**: 智能排柜引擎的仓库、车队选择逻辑，严格匹配映射关系
- **使用场景**:
  - ✅ 修改智能排柜逻辑
  - ✅ 配置或调试 dict_warehouse_trucking_mapping、dict_trucking_port_mapping
  - ✅ 排查 CA-S003/FBW_CA 等仓库显示问题
  - ✅ 新增映射或调整仓库优先级
- **核心内容**:
  - 严格匹配映射（无回退到全部仓库/仅港口车队）
  - 映射链：港口→车队→仓库
  - 仓库优先级：is_default > 自营仓 > 平台仓 > 第三方仓
  - 仓库名称从 dict_warehouses 查 warehouse_name

#### 11. **fix-verification** - 问题修复验证（防幻觉）

- **文件**: `fix-verification/SKILL.md`
- **用途**: 确保修改的有效性与准确性，消除 AI 幻觉，尤其保证数据库字段准确性
- **使用场景**:
  - ✅ 修复 Bug（尤其涉及表名、字段名）
  - ✅ 修改数据库相关代码
  - ✅ 修改 Excel 导入映射
  - ✅ 修改 API 路由或导入路径
- **核心内容**:
  - 先验证后修改原则
  - 权威源定义（03_create_tables.sql、实体、Excel 映射）
  - 修复前验证流程与强制清单
  - 常见幻觉与纠正
  - 验证命令速查

#### 12. **ai-collaboration-methodology** - AI 协作开发方法论

- **文件**: `ai-collaboration-methodology/SKILL.md`
- **用途**: 需求理解、技能调用、错误排查、SOP 流程
- **使用场景**:
  - ✅ 开发/排查时按流程执行
  - ✅ 需求澄清（避免过度编辑）
  - ✅ 错误分类与定位
  - ✅ 避免重复问题
- **核心内容**:
  - 技能调用流程
  - 需求理解四步法
  - 错误排查速查表
  - 智能排产 message→动作
  - 避免重复问题清单
  - SOP 速查

#### 13. **container-intelligent-processing** - 货柜智能处理系统实施

- **文件**: `container-intelligent-processing/SKILL.md`
- **用途**: 货柜智能处理系统增强实施方案的实施与维护
- **使用场景**:
  - ✅ 实现或修改 ext_container_alerts、ext_container_risk_assessments
  - ✅ 开发 AlertService、TimeService、RiskService
  - ✅ 预警持久化、时间预测、风险评分功能
  - ✅ 排查增强方案相关实现问题
- **核心内容**:
  - calculateLogisticsStatus 完整参数、实体关系、raw SQL
  - 前端 API 路径 /v1 前缀、响应结构兼容
  - 数据库与实体、集成步骤、检查清单
  - 常见错误与正确做法对照

#### 14. **logix-business-knowledge** - LogiX 业务知识

- **文件**: `logix-business-knowledge/SKILL.md`
- **用途**: 管理和查询 LogiX 项目业务知识
- **使用场景**:
  - ✅ 查找业务规则和流程
  - ✅ 理解领域知识
  - ✅ 开发业务相关功能
  - ✅ 排查业务逻辑问题
- **核心内容**:
  - 物流状态流转
  - 筛选条件
  - 滞港费计算
  - 时间概念
  - 甘特图功能
  - 全局国家筛选
  - 物流路径
  - 飞驼API集成
  - 智能排产
  - 客户类型

---

## 🎯 使用优先级

### 开发新功能时

```
1. logix-development ⭐⭐⭐ (首要遵循)
   └─ 第 1 步：数据库设计 → 参考 database-query
   └─ 第 2 步：实体/API → 遵循命名规范
   └─ 第 3 步：前端实现 → 查看最佳实践
   └─ 第 4 步：联调测试 → 运行 validate

2. database-query ⭐⭐ (如需数据库操作)
   └─ 编写 SQL 查询
   └─ 确认表关系
   └─ 日期口径检查

3. code-review ⭐⭐ (完成后自我审查)
   └─ 检查核心原则
   └─ 验证命名规范
   └─ 代码风格审查

4. commit-message ⭐ (提交代码时)
   └─ 生成规范的提交信息
```

### 数据库相关任务

```
1. database-query ⭐⭐⭐
   └─ SQL 编写规范
   └─ 表结构参考
   └─ 查询优化

2. logix-development ⭐⭐⭐
   └─ 命名规范
   └─ 开发顺序
   └─ 数据完整性

3. document-processing ⭐⭐ (如需导入数据)
   └─ Excel 映射配置
   └─ 字段校验

4. excel-import-requirements ⭐⭐ (实现/扩展 Excel 导入)
   └─ 映射与命名规则
   └─ 类型转换、主键处理
   └─ 模板导出、后端要求
```

### 代码审查时

```
1. code-review ⭐⭐ (主要标准)
   └─ 核心原则检查
   └─ 命名验证
   └─ 代码风格

2. logix-development ⭐⭐⭐ (项目特定规范)
   └─ 数据库优先原则
   └─ 开发顺序
   └─ 最佳实践
```

### 修复 Bug 时（尤其涉及表/字段/API）

```
1. fix-verification ⭐⭐⭐ (必用，防幻觉)
   └─ 读取权威源（03_create_tables.sql、实体、Excel 映射）
   └─ 核对表名、字段名、导出名
   └─ 执行验证清单后再修改

2. ai-collaboration-methodology ⭐⭐
   └─ 错误分类与定位
   └─ 需求澄清
```

### 实施货柜智能处理系统（预警/时间预测/风险评分）时

```
1. container-intelligent-processing ⭐⭐⭐ (必用)
   └─ calculateLogisticsStatus 完整参数
   └─ 前端 API 路径含 /v1
   └─ AppDataSource.query、实体注册
   └─ 集成步骤与检查清单

2. logix-development ⭐⭐⭐
   └─ 数据库优先、命名规范
   └─ 新增实体与路由注册
```

---

## 📊 Skills 功能对比

| Skill                      | 开发规范 | 数据库   | 代码审查 | 文档处理 | Excel 导入 | Git 提交 | 专属程度   |
| -------------------------- | -------- | -------- | -------- | -------- | ---------- | -------- | ---------- |
| **logix-development**      | ✅⭐⭐⭐ | ✅⭐⭐   | ✅⭐⭐   | ❌       | ❌         | ❌       | LogiX 专属 |
| **database-query**         | ✅       | ✅⭐⭐⭐ | ❌       | ❌       | ❌         | ❌       | 通用       |
| **document-processing**    | ✅       | ✅       | ❌       | ✅⭐⭐⭐ | ✅         | ❌       | 通用       |
| **excel-import-requirements** | ✅     | ✅       | ❌       | ✅       | ✅⭐⭐⭐ | ❌       | LogiX 专属 |
| **code-review**            | ✅⭐⭐   | ✅       | ✅⭐⭐⭐ | ❌       | ❌         | ❌       | 通用       |
| **commit-message**         | ❌       | ❌       | ❌       | ❌       | ❌         | ✅⭐⭐⭐ | 通用       |
| **fix-verification**           | ✅⭐⭐   | ✅⭐⭐⭐ | ✅       | ❌       | ✅         | ❌       | LogiX 专属 |
| **ai-collaboration-methodology** | ✅       | ✅       | ✅       | ❌       | ❌         | ❌       | 通用       |
| **logix-business-knowledge** | ✅⭐⭐ | ✅⭐⭐ | ✅       | ❌       | ❌         | ❌       | LogiX 专属 |
| **container-intelligent-processing** | ✅⭐⭐ | ✅       | ✅       | ❌       | ❌         | ❌       | LogiX 专属 |

---

## 🔗 与其他规范的关系

### 自动应用的 Rules

- **`.cursor/rules/logix-development-standards.mdc`** - 始终自动应用的核心准则
- **`.cursor/rules/logix-project-map.mdc`** - 项目结构速查

### Skills 与 Rules 的区别

- **Rules**: 简洁、强制、始终自动应用（如命名规范、开发顺序）
- **Skills**: 详细、场景化、按需使用（如完整开发流程、最佳实践）

### 参考文档

- **正式文档**: `frontend/public/docs/` - 70+ 篇技术文档
- **帮助页面**: 前端内置的帮助系统（按 F1 或点击帮助按钮）

---

## 🚀 快速开始

### 新开发者入门

1. **阅读**: `logix-development/SKILL.md` - 了解核心原则
2. **参考**: `database-query/SKILL.md` - 学习数据库规范
3. **实践**: 按照开发任务检查清单完成第一个功能
4. **审查**: 使用 `code-review/SKILL.md` 自我检查
5. **快速查找**: 查看 [`QUICK_REFERENCE.md`](./QUICK_REFERENCE.md) - 按任务类型找到合适的技能
6. **学习使用**: 查看 [`HOW_TO_USE_SKILLS.md`](./HOW_TO_USE_SKILLS.md) - 详细使用指南
7. **了解整合**: 查看 [`INTEGRATION_SUMMARY.md`](./INTEGRATION_SUMMARY.md) - 理解技能体系设计

### AI 助手自动应用

当你使用 Cursor、CodeBuddy 等 AI 工具时：

- 会根据你的操作**自动选择**合适的 skill
- 提供**符合项目规范**的建议
- 检查**潜在问题**并给出改进意见

---

## 📝 维护说明

### 更新频率

- **logix-development**: 每季度或项目重大更新时
- **其他 skills**: 根据需要适时更新
- **本索引**: 添加新 skill 时更新

### 贡献指南

如需添加或修改 skill：

1. 在对应目录创建/修改 `SKILL.md`
2. 更新本索引文件
3. 通知团队成员

---

## 📅 版本历史

| 版本 | 日期       | 更新内容                          |
| ---- | ---------- | --------------------------------- |
| 2.2  | 2026-03-17 | 添加 fix-verification 技能（修复验证、防幻觉） |
| 2.3  | 2026-03-18 | 添加 container-intelligent-processing 技能（货柜智能处理系统实施） |
| 2.1  | 2026-03-16 | 添加 logix-business-knowledge 技能 |
| 2.0  | 2026-03-12 | 整合统一所有 skills，形成完整体系 |
| 1.0  | 2026-03-10 | 初始版本，分散的 skills           |

---

**最后更新**: 2026-03-18  
**维护者**: LogiX Team
