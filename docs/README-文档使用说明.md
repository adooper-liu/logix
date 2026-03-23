# LogiX项目文档使用说明（2026-03-21 重构版）

**重要提示**: 本文档体系已于 2026-03-21 完成重构，请按照新的结构查阅文档。

---

## 🎯 **快速开始**

### 新人入职（必读顺序）⭐⭐⭐

```
第 1 步：阅读总索引
  → docs/DOCUMENT_INDEX.md
  
第 2 步：第一阶段总结前 2 章
  → docs/Phase3/第一阶段总结/README.md
  → docs/Phase3/第一阶段总结/01-项目愿景与战略定位.md
  → docs/Phase3/第一阶段总结/02-项目结构与布局.md
  
第 3 步：学习 SKILL 规范
  → .codebuddy/skills/logix-development/SKILL.md
  
第 4 步：根据岗位选择专项文档
```

### 日常开发查阅

```
场景 1: 新建功能
  → .codebuddy/skills/logix-development/SKILL.md
  → docs/Phase3/第一阶段总结/06-技术与开发规范.md (待编写)

场景 2: 数据库相关
  → backend/docs/DATABASE_SCRIPTS_INDEX.md
  → docs/Phase3/数据库与 API 完整文档.md

场景 3: Excel 导入
  → .codebuddy/skills/excel-import-requirements/SKILL.md
  → docs/Phase3/数据导入系统完整文档.md

场景 4: 飞驼数据
  → .codebuddy/skills/feituo-eta-ata-validation/SKILL.md
  → docs/Phase3/数据导入系统完整文档.md
```

---

## 📚 **核心文档位置**

### 最重要的 5 个文档 ⭐⭐⭐

1. **docs/DOCUMENT_INDEX.md** - 文档总索引（本文档）
2. **docs/Phase3/第一阶段总结/README.md** - 第一阶段总结总索引
3. **.codebuddy/skills/logix-development/SKILL.md** - 核心开发规范
4. **docs/Phase3/智能排柜系统完整文档.md** - 智能排柜完整总结
5. **docs/Phase3/数据导入系统完整文档.md** - 数据导入完整总结

### 按功能模块查找

| 功能模块 | 文档位置 |
|---------|---------|
| 智能排柜 | `docs/Phase3/智能排柜系统完整文档.md` |
| 数据导入 | `docs/Phase3/数据导入系统完整文档.md` |
| 甘特图 | `docs/Phase3/甘特图模块完整文档.md` |
| 预警系统 | `docs/Phase3/智能预警系统完整文档.md` |
| 数据库 | `docs/Phase3/数据库与 API 完整文档.md` + `backend/docs/DATABASE_SCRIPTS_INDEX.md` |
| API | `backend/docs/API_DOCS_UPDATE.md` |
| 飞驼系统 | `docs/Phase3/数据导入系统完整文档.md` + `.codebuddy/skills/feituo-eta-ata-validation/SKILL.md` |
| 滞港费 | `docs/Phase3/智能预警系统完整文档.md` + `.codebuddy/skills/logix-demurrage/SKILL.md` |

---

## 🗂️ **文档架构**

### 三级文档体系

```
Level 1: 核心文档（必读）⭐⭐⭐
  - docs/DOCUMENT_INDEX.md（总索引）
  - docs/Phase3/第一阶段总结/*（10 章，编写中）
  - .codebuddy/skills/logix-development/SKILL.md

Level 2: 综合文档（重要）⭐⭐
  - docs/Phase3/*.md（6 个完整文档）
  - frontend/public/docs/01-standards/*（开发规范）
  - frontend/public/docs/02-architecture/*（架构设计）

Level 3: 参考文档（按需）⭐
  - frontend/public/docs/03-database/*（数据库）
  - frontend/public/docs/05-state-machine/*（状态机）
  - frontend/public/docs/06-statistics/*（统计分析）
  - frontend/public/docs/10-guides/*（使用指南）
```

### 文档分布

```
docs/
├── Phase3/第一阶段总结/        # 第一阶段完整总结（10 章）
├── Phase3/*.md                 # Phase3 综合文档（6 篇）
├── DOCUMENT_INDEX.md            # 总索引（本文档）
├── 数据库迁移执行指南.md         # 数据库迁移
└── 飞驼原始数据双表方案评审报告.md # 双表方案

.codebuddy/skills/              # AI 辅助开发技能（10 个）
  └── logix-development/         # 核心开发技能（必学）

frontend/public/docs/           # 前端文档（保留精华）
  ├── 01-standards/             # 开发规范（9 篇）
  ├── 02-architecture/          # 架构设计（5 篇）
  ├── 03-database/              # 数据库（3 篇）
  ├── 05-state-machine/         # 状态机（3 篇）
  ├── 06-statistics/            # 统计分析（12 篇）
  └── 10-guides/                # 使用指南（5 篇）

backend/docs/                   # 后端文档（保留精华）
  ├── API_DOCS_UPDATE.md         # API 文档
  ├── DATABASE_SCRIPTS_INDEX.md  # SQL 脚本索引
  ├── LogiX 外部数据适配器架构.md # 适配器架构
  └── MIGRATION_ORDER_VERIFICATION.md # 迁移验证
```

---

## 🔍 **常见问题解答**

### Q1: 文档太多，从哪里开始？

**A**: 按这个顺序：
```
1. docs/DOCUMENT_INDEX.md（了解文档架构）
2. docs/Phase3/第一阶段总结/README.md（阅读指南）
3. 01-项目愿景与战略定位.md（理解为什么做）
4. 02-项目结构与布局.md（知道代码在哪里）
5. .codebuddy/skills/logix-development/SKILL.md（掌握开发规范）
```

### Q2: 如何快速找到需要的文档？

**A**: 
```
方法 1: 查看 docs/DOCUMENT_INDEX.md 的"快速查找"表格
方法 2: 使用 VS Code 全局搜索（Ctrl+Shift+F）
方法 3: 查看各目录下的 README.md
```

### Q3: 发现文档有错误或过时怎么办？

**A**:
```
1. 检查是否是最新文档（看最后更新日期）
2. 如果是旧文档（已归档），查看对应的新文档
3. 如果是新文档有问题，提交 Issue 或 PR
4. 更新 docs/DOCUMENT_INDEX.md 的维护记录
```

### Q4: 想贡献文档，如何提交？

**A**:
```
1. 确认内容确实有价值（不是重复的）
2. 确定所属分类（ standards/architecture/database等）
3. 按规范命名文件（如：07-xxx.md）
4. 提交 PR
5. Team Review 通过后合并
6. 更新 docs/DOCUMENT_INDEX.md
```

### Q5: 旧的文档去哪里了？

**A**:
```
旧文档已移至 docs/_archive_temp/ 目录，不再主动维护。
如果确实需要查阅，可以查看该目录。
但建议优先查看新文档（更准确、更完整）。
```

---

## 📝 **文档维护**

### 维护原则

```
✅ 唯一性：每个主题只有一个权威文档
✅ 有用性：对实际工作有指导价值
✅ 准确性：基于现有代码和 SKILL，不虚构
✅ 及时性：功能变更后及时更新文档
✅ 可维护性：清晰的架构和索引
```

### 更新流程

```
1. 修改文档内容
2. 更新最后修改日期和版本号
3. 如有必要，更新 docs/DOCUMENT_INDEX.md
4. 提交 Git
5. 通知团队
```

### 审查周期

```
📅 月度审查：每月检查一次文档完整性
📅 季度重构：每季度整理一次文档结构
📅 年度归档：每年归档一次过时文档
```

---

## 🎉 **文档重构成果**

### 整理前 vs 整理后

| 指标 | 整理前 | 整理后 | 改进 |
|------|-------|-------|------|
| 文档总数 | ~172 篇 | ~72 篇 | **-58%** |
| 重复文档 | ~40 篇 | 0 篇 | **消除重复** |
| 临时文档 | ~30 篇 | 0 篇 | **已整合或归档** |
| 索引清晰度 | 低 | 高 | **三级索引体系** |
| 查找效率 | 慢 | 快 | **快速查找表格** |

### 核心价值

```
✅ 脉络清晰：文档架构一目了然
✅ 唯一权威：每个主题只有一个准确来源
✅ 基于实际：所有内容都来自代码和 SKILL
✅ 易于维护：清晰的维护责任和规范
✅ 新人友好：完善的阅读指南和路径
```

---

## 📞 **获取帮助**

### 文档相关问题

1. **找不到文档**: 查看 `docs/DOCUMENT_INDEX.md`
2. **文档有错误**: 提交 Issue 或 PR
3. **想贡献文档**: 联系团队负责人
4. **历史文档**: 查看 `docs/_archive_temp/`

### 联系方式

- **文档维护人**: AI Development Team
- **最后更新**: 2026-03-21
- **下次审查**: 2026-04-21
- **反馈渠道**: 提交 Issue 或团队会议讨论

---

## 🚀 **下一步行动**

### 文档完善计划

```
本周（P0）:
  □ 完成 03-技术选型与架构决策.md
  □ 完成 06-技术与开发规范.md
  □ 更新 docs/DOCUMENT_INDEX.md

下周（P1）:
  □ 完成 04-业务基础知识体系.md
  □ 开始 05-专属领域知识（6 篇）
  □ 完成 07-SKILL 体系与 AI 集成.md

本月内（P2）:
  □ 完成所有第一阶段总结章节
  □ 补充附录（SQL/API/错误代码/FAQ）
  □ 团队培训和反馈收集
```

### 团队培训

```
培训计划:
  1. 文档体系介绍（30 分钟）
  2. 如何使用新文档（30 分钟）
  3. 实践练习（60 分钟）
  4. 反馈收集和改进（30 分钟）

培训材料:
  - docs/DOCUMENT_INDEX.md
  - docs/Phase3/第一阶段总结/README.md
  - 实际代码示例
```

---

**文档状态**: ✅ 已完成重构  
**版本**: v2.0  
**创建日期**: 2026-03-21  
**维护人**: AI Development Team  
**下次审查**: 2026-04-21

**开始阅读**: [docs/DOCUMENT_INDEX.md](./DOCUMENT_INDEX.md)
