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

#### 4. **code-review** - 代码质量审查

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

#### 5. **commit-message** - Git 提交信息生成

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

---

## 📊 Skills 功能对比

| Skill                   | 开发规范 | 数据库   | 代码审查 | 文档处理 | Git 提交 | 专属程度   |
| ----------------------- | -------- | -------- | -------- | -------- | -------- | ---------- |
| **logix-development**   | ✅⭐⭐⭐ | ✅⭐⭐   | ✅⭐⭐   | ❌       | ❌       | LogiX 专属 |
| **database-query**      | ✅       | ✅⭐⭐⭐ | ❌       | ❌       | ❌       | 通用       |
| **document-processing** | ✅       | ✅       | ❌       | ✅⭐⭐⭐ | ❌       | 通用       |
| **code-review**         | ✅⭐⭐   | ✅       | ✅⭐⭐⭐ | ❌       | ❌       | 通用       |
| **commit-message**      | ❌       | ❌       | ❌       | ❌       | ✅⭐⭐⭐ | 通用       |

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
6. **了解整合**: 查看 [`INTEGRATION_SUMMARY.md`](./INTEGRATION_SUMMARY.md) - 理解技能体系设计

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
| 2.0  | 2026-03-12 | 整合统一所有 skills，形成完整体系 |
| 1.0  | 2026-03-10 | 初始版本，分散的 skills           |

---

**最后更新**: 2026-03-12  
**维护者**: LogiX Team
