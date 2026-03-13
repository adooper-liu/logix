# LogiX Skills 使用指南

> 💡 **用途**: 指导开发者在实际开发中如何高效使用 LogiX 技能体系

---

## 🎯 什么是 Skills？

Skills 是 LogiX 项目为 AI 助手（如 Cursor、CodeBuddy）编写的**开发规范集合**，用于确保代码质量、统一开发风格、提高开发效率。

### 核心价值

- ✅ **自动应用** - 使用 AI 助手时自动遵循规范
- ✅ **质量保证** - 内置最佳实践和检查清单
- ✅ **效率提升** - 减少查阅文档时间
- ✅ **知识传承** - 沉淀团队经验

---

## 📚 Skills 完整列表

| Skill                                                   | 优先级 | 用途           | 何时使用     |
| ------------------------------------------------------- | ------ | -------------- | ------------ |
| **[logix-development](logix-development/SKILL.md)**     | ⭐⭐⭐ | 核心开发技能   | 所有开发任务 |
| **[database-query](database-query/SKILL.md)**           | ⭐⭐⭐ | 数据库查询     | 编写 SQL 时  |
| **[document-processing](document-processing/SKILL.md)** | ⭐⭐   | Excel/PDF 处理 | 导入导出功能 |
| **[code-review](code-review/SKILL.md)**                 | ⭐⭐   | 代码审查       | 提交前自查   |
| **[commit-message](commit-message/SKILL.md)**           | ⭐     | Git 提交       | 提交代码时   |
| **[README](README.md)**                                 | ⭐⭐⭐ | 总索引         | 查找技能     |
| **[QUICK_REFERENCE](QUICK_REFERENCE.md)**               | ⭐⭐   | 快速参考       | 不确定用哪个 |

---

## 🚀 典型开发场景使用流程

### 场景 1: 开发新功能

```
需求：添加"滞港费统计"功能
```

#### 步骤 1: 查看核心技能（必做）

```bash
# 打开帮助页面 → AI 开发助手技能体系 → 核心开发技能
# 或直接访问：/.cursor/skills/logix-development/SKILL.md
```

**重点关注**:

- ✅ 核心原则（数据库优先、数据完整性、日期口径统一）
- ✅ 命名与映射规则
- ✅ 开发任务检查清单 → "新增功能开发"部分

#### 步骤 2: 参考数据库技能（如需数据库操作）

```bash
# 访问：/.cursor/skills/database-query/SKILL.md
```

**重点关注**:

- ✅ 表前缀规范（dict*, biz*, process*, ext*）
- ✅ 关联关系图
- ✅ 常用查询模式 → 日期筛选、货柜关联

#### 步骤 3: 开始编码（AI 助手会自动应用 Skills）

**与 AI 对话示例**:

```
我需要在 process_port_operations表中添加一个新字段
demurrage_fee(滞港费)，请帮我设计完整的实现方案。
```

**AI 会自动遵循**:

- ✅ 数据库优先原则 → 先改 SQL
- ✅ 命名规范 → snake_case
- ✅ 开发顺序 → SQL → 实体 → API → 前端

#### 步骤 4: 自我审查（提交前）

```bash
# 访问：/.cursor/skills/code-review/SKILL.md
```

**使用检查清单**:

- [ ] 核心原则是否遵守？
- [ ] 命名是否规范？
- [ ] 日期口径是否统一？
- [ ] 代码风格是否符合要求？

#### 步骤 5: 提交代码

```bash
# AI 会自动生成规范的 commit message
# 或手动参考：/.cursor/skills/commit-message/SKILL.md
```

**示例输出**:

```
feat(demurrage): add demurrage fee calculation feature

- Add demurrage_fee column to process_port_operations
- Implement DemurrageService for calculation
- Add DemurrageStatistics component
```

---

### 场景 2: 修复 Bug

```
问题：货柜状态显示不正确
```

#### 使用流程

```
1. 查看 logix-development → 核心原则
   └─ 确认是否违反"数据库优先"原则

2. 参考 database-query → 验证数据查询
   └─ 检查 SQL 关联是否正确

3. 使用 code-review → 定位问题
   └─ 逐项检查可能的问题点

4. 修复后再次 code-review
   └─ 确保修复没有引入新问题

5. 提交代码
   └─ fix(container): correct logistics status display
```

---

### 场景 3: Excel 数据导入

```
需求：导入新的 Excel 格式的货柜数据
```

#### 使用流程

```
1. 查看 document-processing
   └─ Excel导入约定（table/field映射规则）

2. 参考 logix-development
   └─ 确认 table/field 与数据库一致

3. 实现导入功能
   └─ AI 会自动遵循映射规范

4. 测试验证
   └─ 使用 database-query 检查导入数据
```

**关键配置示例**:

```vue
<!-- ✅ 正确做法 -->
<excel-import
  :mappings="[
    {
      table: 'process_port_operations', // 数据库表名
      field: 'container_number', // 数据库字段名
      excelColumn: '集装箱号',
    },
  ]"
/>

<!-- ❌ 错误做法 -->
<excel-import
  :mappings="[
    {
      table: 'portOperations', // 错误：使用了 camelCase
      field: 'containerNumber', // 错误：应该是 snake_case
      excelColumn: '集装箱号',
    },
  ]"
/>
```

---

### 场景 4: 代码审查（PR Review）

```
任务：审查团队成员的 Pull Request
```

#### 使用流程

```
1. 打开 code-review 技能
   └─ 获取完整的审查清单

2. 逐项检查
   ├─ 核心原则（数据库优先、数据完整性）
   ├─ 命名与映射（snake_case/camelCase）
   ├─ 数据展示（日期口径统一）
   ├─ 前端规范（无硬编码、国际化）
   ├─ 单一职责（文件大小、职责分离）
   └─ 代码风格（缩进、引号、分号）

3. 提供反馈
   ├─ 🔴 Critical: 必须修复
   ├─ 🟡 Suggestion: 建议改进
   └─ 🟢 Nice to have: 可选优化
```

**审查意见示例**:

```markdown
## Code Review 意见

### 🔴 Critical

- [ ] `ContainerStatus.vue`第 45 行使用了硬编码色值 `#ff0000`
      应改用 SCSS 变量：`$error-color`

- [ ] `updateStatus()`方法直接 UPDATE 数据库
      应使用 `ContainerStatusService.updateSingleContainerStatus()`

### 🟡 Suggestion

- [ ] 组件文件超过 300 行，建议拆分为子组件
- [ ] 搜索输入未加防抖，建议使用 `useDebounce`

### 🟢 Nice to have

- [ ] 可以添加单元测试覆盖边界情况
```

---

## 💡 与 AI 助手协作的最佳实践

### ✅ 推荐做法

#### 1. 明确告知使用 Skill

```
请根据 logix-development skill 的要求，
帮我设计一个查询货柜状态的 API。
```

#### 2. 指定具体技能

```
参考 database-query skill 中的日期筛选模式，
编写一个按出运日期范围查询的 SQL。
```

#### 3. 请求检查

```
请用 code-review skill 的检查清单，
审查一下这段代码有哪些需要改进的地方。
```

#### 4. 询问最佳实践

```
根据 logix-development skill，
在 Excel导入时如何处理日期格式转换？
```

### ❌ 避免的做法

#### 1. 忽略 Skills

```
❌ "随便写个查询就行"
✅ "按照 database-query skill 的规范写查询"
```

#### 2. 混淆技能

```
❌ 同时参考多个冲突的来源
✅ 以指定的 Skill 为准
```

#### 3. 跳过检查

```
❌ 直接提交代码
✅ 先用 code-review 自我检查
```

---

## 🎯 快速查找指南

### 遇到问题时的解决方案

| 问题类型             | 使用 Skill                                          | 关键章节             |
| -------------------- | --------------------------------------------------- | -------------------- |
| **不知道从哪里开始** | [README.md](README.md)                              | 快速开始             |
| **不确定命名规范**   | [logix-development](logix-development/SKILL.md)     | 命名与映射规则       |
| **不会写 SQL**       | [database-query](database-query/SKILL.md)           | 常用查询模式         |
| **Excel 导入出错**   | [document-processing](document-processing/SKILL.md) | LogiX Excel 导入约定 |
| **代码质量担忧**     | [code-review](code-review/SKILL.md)                 | Review Checklist     |
| **不会写 commit**    | [commit-message](commit-message/SKILL.md)           | Format & Examples    |
| **按任务找技能**     | [QUICK_REFERENCE.md](QUICK_REFERENCE.md)            | 按任务类型选择       |

---

## 📊 使用频率统计

### 日常开发（每天）

```
logix-development     ████████████████░░ 80% (始终遵循)
database-query        ████████░░░░░░░░░░ 40% (数据库操作时)
code-review           ████░░░░░░░░░░░░░░ 20% (提交前自查)
commit-message        ██░░░░░░░░░░░░░░░░ 10% (提交代码时)
```

### 特定任务

```
document-processing   需要 Excel/PDF处理时使用
database-query        需要编写复杂 SQL 时使用
```

---

## 🔗 与其他资源的关系

### Skills vs Rules

```
.cursor/rules/
├── logix-development-standards.mdc (始终自动应用)
└── logix-project-map.mdc (项目结构速查)

.cursor/skills/
├── logix-development/SKILL.md (详细版 + 最佳实践)
├── database-query/SKILL.md (专用技能)
└── ...其他技能
```

**区别**:

- **Rules**: 简洁、强制、始终自动应用
- **Skills**: 详细、场景化、按需使用

### Skills vs 文档

```
frontend/public/docs/
├── 01-standards/ (开发规范文档)
├── 02-architecture/ (架构设计文档)
└── ...技术文档

.cursor/skills/
└── 面向 AI助手的执行规范
```

**关系**:

- **文档**: 人类阅读的技术资料
- **Skills**: AI 助手执行的规范指令

---

## 🎓 学习路径

### 新开发者入门（第 1 周）

```
Day 1: 阅读 README.md → 了解 Skills 体系
Day 2: 精读 logix-development → 掌握核心原则
Day 3: 参考 database-query → 学习数据库规范
Day 4: 使用 code-review → 自我检查代码
Day 5: 实践完整流程 → 开发第一个功能
```

### 进阶提升（持续）

```
每周:
- 回顾一次 code-review 清单
- 学习一个最佳实践案例
- 分享一个使用心得

每月:
- 更新 Skill 内容（如有改进）
- 收集团队反馈
- 优化使用体验
```

---

## 🆘 常见问题

### Q1: Skills 太多记不住怎么办？

**A**: 不需要死记硬背！

- 记住核心技能：`logix-development`
- 其他技能用时再查：[QUICK_REFERENCE.md](QUICK_REFERENCE.md)
- AI 助手会自动应用合适的技能

### Q2: Skills 之间有冲突怎么办？

**A**: 遵循优先级原则

- ⭐⭐⭐ 核心技能 > ⭐⭐ 专用技能 > ⭐ 辅助技能
- 如有疑问，查看 [README.md](README.md) 中的层级关系

### Q3: 如何验证是否正确使用了 Skills？

**A**: 三个检查点

1. 运行 `npm run validate`（类型检查 + Lint）
2. 使用 `code-review` 技能自我审查
3. 请团队成员进行 Code Review

### Q4: Skills 会更新吗？

**A**: 会定期更新

- 每季度回顾一次
- 根据项目发展补充新技能
- 收集团队反馈持续改进

---

## 📝 总结

### 一句话概括

**Skills 是你的 AI 开发助手的行为准则，让它帮你写出更规范、更高质量的代码！**

### 三个关键点

1. **开发新功能** → 先看 `logix-development`
2. **专用场景** → 参考对应专用技能
3. **提交代码** → 使用 `code-review` + `commit-message`

### 最终目标

- ✅ 提高代码质量
- ✅ 统一开发风格
- ✅ 提升开发效率
- ✅ 传承团队经验

---

**最后更新**: 2026-03-12  
**维护者**: LogiX Team  
**反馈**: 欢迎提出改进建议！
