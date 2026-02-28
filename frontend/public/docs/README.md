# LogiX 文档目录

此目录存放 LogiX 项目的长期有效文档。

## 📚 文档结构

### 核心文档（必读）

| 文档 | 说明 | 优先级 |
|------|------|--------|
| INDEX.md | 项目总纲，所有文档的导航入口 | ⭐⭐⭐ |
| DEVELOPMENT_STANDARDS.md | 开发规范与最佳实践 | ⭐⭐⭐ |
| DEV_ENVIRONMENT_GUIDE.md | 开发环境启动指南 | ⭐⭐⭐ |
| QUICK_START.md | 快速启动指南（5分钟上手） | ⭐⭐ |

### 开发规范类

| 文档 | 说明 |
|------|------|
| CODE_STANDARDS.md | 代码规范与 Lint 配置 |
| LINT_GUIDE.md | 项目代码规范与 Lint 指南 |
| NAMING_CONVENTIONS.md | 统一命名规范（数据库、实体、API、前端） |
| NAMING_QUICK_REFERENCE.md | 命名规范快速参考 |

### 业务与架构类

| 文档 | 说明 |
|------|------|
| LOGISTICS_FLOW_COMPLETE.md | 物流全流程完整指南 |
| TIMESCALEDB_GUIDE.md | TimescaleDB 数据库使用指南 |
| TIMESCALEDB_QUICK_REFERENCE.md | TimescaleDB 快速参考 |

### 集成指南类

| 文档 | 说明 |
|------|------|
| BACKEND_QUICK_REFERENCE.md | 后端快速参考 |
| CORE_MAPPINGS_REFERENCE.md | 核心映射参考（表名、字段映射） |
| COUNTDOWN_CARD_LOGIC.md | 倒计时卡片逻辑说明 |
| EXCEL_IMPORT_GUIDE.md | Excel 导入指南 |
| EXTERNAL_DATA_INTEGRATION_GUIDE.md | 外部数据集成指南 |
| EXTERNAL_DATA_QUICKSTART.md | 外部数据快速开始 |
| UNIVERSAL_DICT_MAPPING_GUIDE.md | 通用字典映射指南 |
| EXCEL_STATUS_MAPPING.md | Excel 状态映射 |
| EXCEL_STATUS_MAPPING_ISSUE.md | Excel 状态映射问题说明 |

## 📝 文档生成规则（AI 记忆）

### 📄 文档分类规则

1. **长期有效文档（frontend/public/docs/）**
   - 项目总纲和导航文档
   - 开发规范、代码规范、命名规范
   - 架构设计文档
   - API 文档、数据库文档
   - 使用指南、快速参考
   - **特征**：内容通用、长期有效、持续更新

2. **临时性文档（public/docs-temp/）**
   - 特定问题的修复记录
   - 验证报告（特定数据、特定功能）
   - 迁移记录（SQL 迁移、结构变更）
   - 临时架构说明（整合前）
   - 一次性问题的解决方案
   - **特征**：带日期、针对特定场景、可能过期

### 🎯 文档创建规则

1. **创建文档前先分类**
   - 如果是通用的、长期有效的，创建在 `frontend/public/docs/`
   - 如果是临时的、特定场景的，创建在 `public/docs-temp/`

2. **命名规范**
   - 使用大写下划线命名：`DEVELOPMENT_STANDARDS.md`
   - 避免特殊字符（中文、emoji 仅在标题中使用）
   - 文件名应清晰反映文档内容

3. **内容组织**
   - 使用 Markdown 格式
   - 包含清晰的目录结构
   - 提供代码示例、表格、图表
   - 标注最后更新日期

4. **文档引用**
   - 正式文档间可以互相引用
   - 正式文档不应引用临时文档
   - 使用相对路径：`./DEVELOPMENT_STANDARDS.md`

5. **定期维护**
   - 每月检查一次临时文档，清理过期内容
   - 有价值的临时内容应及时整合到正式文档
   - 更新文档的版本信息和更新日期

### ⚡ 快速判断清单

创建文档时问自己：

- [ ] 这个文档对 6 个月后的新开发者有价值吗？
  - 是 → `frontend/public/docs/`
  - 否 → `public/docs-temp/`

- [ ] 这个文档是否与特定的 bug、验证、迁移相关？
  - 是 → `public/docs-temp/`
  - 否 → 考虑其他分类

- [ ] 这个文档是否需要在帮助文档系统中展示？
  - 是 → `frontend/public/docs/`
  - 否 → 根据内容分类

## 🔗 相关目录

- `public/docs-temp/` - 临时文档目录
- `backend/docs/` - 后端专用文档
- `logistics-path-system/` - 物流路径系统文档
