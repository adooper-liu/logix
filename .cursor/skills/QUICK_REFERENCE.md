# LogiX Skills 快速参考

> 💡 **用途**: 快速查找应该使用哪个技能

---

## 🎯 按任务类型选择

### 我要开发新功能 → **logix-development** ⭐⭐⭐

```
路径：.cursor/skills/logix-development/SKILL.md

包含:
✅ 完整开发流程（5步法）
✅ 命名规范对照表
✅ 最佳实践示例
✅ 代码审查清单
```

### 我要写 SQL 查询 → **database-query** ⭐⭐⭐

```
路径：.cursor/skills/database-query/SKILL.md

包含:
✅ 表前缀规范
✅ 关联关系图
✅ 常用查询模式
✅ 日期筛选口径
```

### 我要导入 Excel 数据 → **document-processing** ⭐⭐

```
路径：.cursor/skills/document-processing/SKILL.md

包含:
✅ Excel 映射约定
✅ xlsx/exceljs 示例
✅ 字段校验规则
✅ PDF 解析技巧
```

### 我要审查代码 → **code-review** ⭐⭐

```
路径：.cursor/skills/code-review/SKILL.md

包含:
✅ 核心原则检查
✅ 命名规范验证
✅ 代码风格审查
✅ 反馈格式模板
```

### 我要提交代码 → **commit-message** ⭐

```
路径：.cursor/skills/commit-message/SKILL.md

包含:
✅ Conventional Commits 格式
✅ Type 分类说明
✅ Scope 命名建议
✅ 示例模板
```

---

## 🔍 按关键词查找

| 如果你在找...                              | 使用这个技能            |
| ------------------------------------------ | ----------------------- |
| 数据库优先、开发顺序、SQL→ 实体 →API→ 前端 | **logix-development**   |
| 命名规范、snake_case、camelCase            | **logix-development**   |
| 表前缀 dict*/biz*/process\_、SQL 查询      | **database-query**      |
| Excel 导入、table/field 映射、PDF 解析     | **document-processing** |
| 代码审查、PR、质量检查                     | **code-review**         |
| Git 提交、commit message、changelog        | **commit-message**      |

---

## 📊 技能层级关系

```
┌─────────────────────────────────────┐
│   logix-development (核心技能)      │
│   - 完整开发流程                    │
│   - 命名规范                        │
│   - 最佳实践                        │
└─────────────────────────────────────┘
              ↓ 配合使用
    ┌─────────┬─────────┬─────────┐
    ↓         ↓         ↓         ↓
┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐
│database│ │document│ │code-  │ │commit-│
│-query │ │processing│ │review │ │message│
│(专用) │ │ (专用)  │ │(专用) │ │(辅助) │
└───────┘ └───────┘ └───────┘ └───────┘
```

---

## 🚀 典型工作流

### 场景 1: 开发新功能

```
1. 阅读 logix-development
   └─ 了解核心原则和开发流程

2. 参考 database-query（如需数据库操作）
   └─ 编写正确的 SQL 查询

3. 实现功能后，使用 code-review 自我审查
   └─ 确保符合规范

4. 提交时使用 commit-message
   └─ 生成规范的提交信息
```

### 场景 2: 修复 Bug

```
1. 查看 logix-development
   └─ 确认问题是否违反核心原则

2. 参考 database-query（如怀疑数据问题）
   └─ 验证数据和查询逻辑

3. 修复后使用 code-review
   └─ 确保修复质量

4. 提交时使用 commit-message
   └─ type 选择 fix
```

### 场景 3: 数据导入

```
1. 查看 document-processing
   └─ Excel 映射约定和示例

2. 参考 logix-development
   └─ 确认 table/field 与数据库一致

3. 导入后验证数据
   └─ 使用 database-query 检查
```

---

## 💡 使用提示

### ✅ 推荐做法

- 开发新功能时**首先**参考 `logix-development`
- 专用场景使用对应的专用技能
- 提交代码前使用 `code-review` 自我检查
- 不确定时查看 `.cursor/skills/README.md` 总索引

### ❌ 避免的做法

- 不要同时参考多个技能（会混淆）
- 不要跳过核心原则直接看细节
- 不要忘记运行 `npm run validate`

---

## 🔗 相关链接

- **总索引**: `.cursor/skills/README.md`
- **整合总结**: `.cursor/skills/INTEGRATION_SUMMARY.md`
- **开发准则**: `.cursor/rules/logix-development-standards.mdc`
- **项目地图**: `.cursor/rules/logix-project-map.mdc`
- **帮助页面**: 前端按 F1 或点击帮助按钮

---

**最后更新**: 2026-03-12  
**维护者**: LogiX Team
