# LogiX项目文档总索引

**项目代号**: LogiX  
**重构日期**: 2026-03-21  
**重构原则**: 唯一、有用、准确、基于代码和 SKILL  
**适用范围**: 全项目文档导航  

---

## 🎯 **快速开始（新人必读）**

**第 1 步**: 阅读 [项目总览](../README.md)（如果存在）或 [快速指南](./快速指南.md)  
**第 2 步**: 查看本文档，了解文档体系  
**第 3 步**: 根据你的角色选择阅读路径（见下方"按角色查找"表格）  
**第 4 步**: 开始学习核心文档  

---

## 📋 **文档体系架构**

### 核心文档（必读）⭐⭐⭐

```
docs/Phase3/第一阶段总结/
├── README.md                           # 总索引 + 阅读指南 ⭐⭐⭐
├── 01-项目愿景与战略定位.md             # 为什么做这个项目 ⭐⭐⭐
├── 02-项目结构与布局.md                 # 代码在哪里 ⭐⭐⭐
├── 03-技术选型与架构决策.md (编写中)    # 技术决策记录 ⭐⭐⭐
├── 04-业务基础知识体系.md (待编写)      # 物流业务知识 ⭐⭐
├── 05-专属领域知识/ (待编写)            # 核心竞争力 🔥
│   ├── 01-飞驼系统集成.md
│   ├── 02-智能排柜系统.md
│   ├── 03-甘特图可视化.md
│   ├── 04-智能预警系统.md
│   ├── 05-滞港费计算.md
│   └── 06-物流状态机.md
├── 06-技术与开发规范.md (待编写)        # 开发必须遵守的规则 🔥
├── 07-SKILL 体系与 AI 集成.md (待编写)  # AI 辅助开发方法 ⭐⭐
├── 08-代码中隐藏的知识点.md (待编写)    # 代码考古发现 ⭐⭐
├── 09-开发进度与里程碑.md (待编写)      # 项目发展历程 ⭐
└── 10-优劣势分析与改进方向.md (待编写)  # SWOT 分析 ⭐⭐
```

### Phase3 综合文档（已完成）⭐⭐⭐

```
docs/Phase3/
├── README.md                         # Phase3 核心文档索引（新增）⭐
├── README-文档索引.md                # Phase3 详细索引
├── 智能排柜系统完整文档.md            # 任务 3.5 完整总结 (530 行)
├── 数据导入系统完整文档.md            # Excel/飞驼导入完整总结 (880 行)
├── 智能预警系统完整文档.md            # P0 预警系统完整总结 (876 行)
├── 甘特图模块完整文档.md              # 甘特图重构完整总结 (713 行)
├── 数据库与 API 完整文档.md           # 数据库与 API 完整总结 (853 行)
├── Phase3 文档整理完成报告.md         # 整理报告 (486 行)
└── 第一阶段项目开发总结完整清单.md    # 总结撰写指南 (1437 行)
```

### SKILL 体系（开发规范）⭐⭐⭐

```
.codebuddy/skills/
├── logix-development/                  # 核心开发技能（必学）🔥
│   └── SKILL.md                        # 数据库优先、命名规范等
├── database-query/                     # 数据库查询专用
├── excel-import-requirements/          # Excel 导入规范 🔥
├── code-review/                        # 代码质量审查
├── document-processing/                # Excel/PDF文档处理
├── feituo-eta-ata-validation/          # 飞驼数据验证
├── logix-demurrage/                    # 滞港费计算 🔥
└── typeorm-exists-subquery-solution/   # TypeORM EXISTS 子查询
```

### 前端文档（保留精华）⭐⭐

```
frontend/public/docs/
├── README.md                           # 前端文档总索引
├── DOCS_INDEX.md                       # 详细索引
├── 01-standards/                       # 开发规范（9 篇）✅ 保留
├── 02-architecture/                    # 架构设计（5 篇）✅ 保留
├── 03-database/                        # 数据库（3 篇）✅ 保留
├── 05-state-machine/                   # 状态机（3 篇）✅ 保留
├── 06-statistics/                      # 统计分析（12 篇）✅ 保留
└── 10-guides/                          # 使用指南（5 篇）✅ 保留
```

### 后端文档（保留精华）⭐⭐

```
backend/docs/
├── API_DOCS_UPDATE.md                  # API 文档更新 ✅ 保留
├── DATABASE_SCRIPTS_INDEX.md           # SQL 脚本索引 ✅ 保留
├── LogiX 外部数据适配器架构.md          # 适配器架构 ✅ 保留
└── MIGRATION_ORDER_VERIFICATION.md     # 迁移顺序验证 ✅ 保留
```

### 根目录文档（重要）⭐⭐

```
docs/
├── DOCUMENT_INDEX.md                 # 本文档 - 全项目总索引 ⭐⭐⭐
├── README-文档使用说明.md             # 文档使用说明 ⭐⭐
├── 快速指南.md                       # 5 分钟快速入门 ⭐⭐⭐
├── 文档整理完成报告.md                # 整理报告 ⭐⭐
├── 数据库迁移执行指南.md               # 数据库迁移操作指南 ✅
└── 飞驼原始数据双表方案评审报告.md     # 双表方案评审 ✅
```

---

## 🗑️ **已归档文档（临时文件夹）**

以下文档已移至 `docs/_archive_temp/`，**不再维护**：

### 归档原因分类

#### 1. 重复内容（已整合到综合文档）

```
❌ frontend/public/docs/demurrage/* (22 篇)
   → 已整合到《滞港费计算完整文档》(Phase3/智能预警系统完整文档.md)

❌ frontend/public/docs/07-performance/* (3 篇)
   → 已整合到《甘特图模块完整文档》性能优化章节

❌ frontend/public/docs/08-deployment/* (4 篇)
   → 已整合到各部署相关文档

❌ backend/docs/TypeORM-*.md (2 篇)
   → 已整合到《数据库与 API 完整文档》TypeORM 命名策略章节
```

#### 2. 临时分析（已完成使命）

```
❌ frontend/public/docs/analysis/*
❌ frontend/public/docs/proposals/*
❌ frontend/public/docs/technical/*
❌ frontend/public/docs/vision/*
❌ frontend/docs/shipments-gantt-switch-analysis.md
❌ frontend/docs/预警系统排查步骤.md
❌ frontend/docs/预警系统诊断指南.md
   → 临时分析文档，内容已整合到正式文档
```

#### 3. 过时项目文档（被第一阶段总结替代）

```
❌ frontend/public/docs/09-misc/* (20 篇)
❌ frontend/public/docs/11-project/* (33 篇)
❌ frontend/public/docs/implementation/* (4 篇)
❌ frontend/public/docs/logistics/* (2 篇)
❌ frontend/public/docs/help/* (1 篇)
❌ frontend/public/docs/*.md (根目录 30+ 篇)
   → 已被《第一阶段项目开发总结》替代
```

#### 4. 重复 API 目录

```
❌ frontend/public/docs/04-api/
❌ frontend/public/docs/04-api-integration/
   → 合并为一个，避免混淆
```

---

## 📊 **整理统计**

### 整理前

```
frontend/public/docs/:         ~120 篇
backend/docs/:                 6 篇
frontend/docs/:                10 篇
docs/:                         2 篇
Phase3/:                       34 篇
总计：~172 篇文档
```

### 整理后

```
核心文档（第一阶段总结）:       10 章（编写中）
Phase3 综合文档：6 篇
SKILL 体系：10 个
前端保留文档：~40 篇
后端保留文档：4 篇
根目录保留：2 篇
总计：~72 篇（精简 58%）
```

### 归档文档

```
docs/_archive_temp/:           ~100 篇（不删除，但不主动维护）
```

---

## 🎯 **文档使用指南**

### 新人入职（第 1 周）

```
Day 1-2:
  ✅ docs/Phase3/第一阶段总结/README.md
  ✅ 01-项目愿景与战略定位.md
  ✅ 02-项目结构与布局.md
  ✅ .codebuddy/skills/logix-development/SKILL.md

Day 3-4:
  ✅ 06-技术与开发规范.md（待编写）
  ✅ 前端 public/docs/01-standards/
  ✅ 前端 public/docs/02-architecture/

Day 5:
  ✅ 选择一个专属领域深入学习
  ✅ 05-专属领域知识/（待编写）
```

### 日常开发查阅

```
场景 1: 新建功能
  → 06-技术与开发规范.md
  → .codebuddy/skills/logix-development/SKILL.md

场景 2: 数据库查询
  → .codebuddy/skills/database-query/SKILL.md
  → backend/docs/DATABASE_SCRIPTS_INDEX.md

场景 3: Excel 导入
  → .codebuddy/skills/excel-import-requirements/SKILL.md
  → docs/Phase3/数据导入系统完整文档.md

场景 4: 飞驼数据
  → .codebuddy/skills/feituo-eta-ata-validation/SKILL.md
  → docs/Phase3/数据导入系统完整文档.md
  → 05-专属领域知识/01-飞驼系统集成.md（待编写）
```

### 问题解决

```
场景 1: 遇到 Bug
  → 08-代码中隐藏的知识点.md（待编写）
  → 查看 TODO/FIXME 标记

场景 2: 性能优化
  → docs/Phase3/甘特图模块完整文档.md 性能优化章节
  → docs/Phase3/数据库与 API 完整文档.md 最佳实践

场景 3: 业务逻辑疑问
  → 04-业务基础知识体系.md（待编写）
  → 05-专属领域知识/（待编写）
```

---

## 📝 **文档维护规范**

### 新增文档

**原则**:

```
✅ 必要原则：确实有价值才新增
✅ 归类原则：放到正确的分类目录下
✅ 命名原则：按规范编号命名
✅ 质量原则：经过 Review 才能合并
```

**流程**:

```
1. 检查是否已有类似文档
2. 确定所属分类
3. 按规范命名（如：06-xxx.md）
4. 提交 PR
5. Team Review
6. 更新索引
```

### 更新文档

**时机**:

```
✅ 功能变更时
✅ Bug 修复后
✅ 发现错误时
✅ 有更好实践时
```

**要求**:

```
✅ 标注版本号和更新日期
✅ 说明变更内容
✅ 保持格式一致
✅ 更新相关索引
```

### 废弃文档

**标准**:

```
❌ 内容已过时
❌ 已被其他文档替代
❌ 质量差且无修复价值
❌ 临时性文档已完成使命
```

**流程**:

```
1. 标记为"已废弃"
2. 说明替代文档
3. 移至 _archive_temp/
4. 更新索引
```

---

## 🔍 **快速查找**

### 按主题查找

| 主题 | 位置 | 优先级 |
|------|------|--------|
| **项目总览** | [../README.md](../README.md) | ⭐⭐⭐ |
| **快速入门** | [快速指南.md](./快速指南.md) | ⭐⭐⭐ |
| **文档使用** | [README-文档使用说明.md](./README-文档使用说明.md) | ⭐⭐⭐ |
| 项目愿景 | `第一阶段总结/01-项目愿景与战略定位.md` | ⭐⭐⭐ |
| 项目结构 | `第一阶段总结/02-项目结构与布局.md` | ⭐⭐⭐ |
| 技术选型 | `第一阶段总结/03-技术选型与架构决策.md` (编写中) | ⭐⭐⭐ |
| 开发规范 | `第一阶段总结/06-技术与开发规范.md` (待编写) | ⭐⭐⭐ |
| SKILL | `.codebuddy/skills/logix-development/SKILL.md` | ⭐⭐⭐ |
| 飞驼系统 | `第一阶段总结/05-专属领域知识/01-飞驼系统集成.md` (待编写) | ⭐⭐ |
| 智能排柜 | `docs/Phase3/智能排柜系统完整文档.md` | ⭐⭐⭐ |
| 数据导入 | `docs/Phase3/数据导入系统完整文档.md` | ⭐⭐⭐ |
| 预警系统 | `docs/Phase3/智能预警系统完整文档.md` | ⭐⭐⭐ |
| 甘特图 | `docs/Phase3/甘特图模块完整文档.md` | ⭐⭐⭐ |
| 数据库 | `docs/Phase3/数据库与 API 完整文档.md` | ⭐⭐⭐ |
| SQL 脚本 | `backend/docs/DATABASE_SCRIPTS_INDEX.md` | ⭐⭐ |
| API 端点 | `backend/docs/API_DOCS_UPDATE.md` | ⭐⭐ |

### 按角色查找

| 角色       | 必读文档                                                 |
| ---------- | -------------------------------------------------------- |
| 产品经理   | 01-项目愿景、09-开发进度、10-优劣势分析                  |
| 架构师     | 02-项目结构、03-技术选型、05-专属领域、08-代码知识       |
| 后端开发   | 02-项目结构、04-业务知识、06-开发规范、数据库与 API 文档 |
| 前端开发   | 02-项目结构、06-开发规范、甘特图、预警系统文档           |
| 测试工程师 | 04-业务知识、05-专属领域、测试指南                       |
| 新人       | README、01-愿景、02-结构、06-规范、SKILL                 |

---

## 🎉 **总结**

### 整理成果

✅ **精简文档**: 从 172 篇精简到 72 篇（-58%）  
✅ **消除重复**: 整合了所有重复内容  
✅ **建立体系**: 清晰的文档架构和索引  
✅ **保留精华**: 只保留唯一、有用、准确的文档  
✅ **基于实际**: 所有内容都基于现有代码和 SKILL

### 下一步行动

📝 **完成第一阶段总结所有章节**（优先级高）

- [ ] 03-技术选型与架构决策
- [ ] 04-业务基础知识体系
- [ ] 05-专属领域知识（6 篇）
- [ ] 06-技术与开发规范
- [ ] 07-SKILL 体系与 AI 集成
- [ ] 08-代码中隐藏的知识点
- [ ] 09-开发进度与里程碑
- [ ] 10-优劣势分析与改进方向

📝 **更新相关索引**

- [ ] frontend/public/docs/README.md
- [ ] frontend/public/docs/DOCS_INDEX.md

📝 **团队培训**

- [ ] 文档体系介绍
- [ ] 如何使用新文档
- [ ] 收集反馈持续改进

---

**文档状态**: ✅ 已完成初步整理  
**维护人**: AI Development Team  
**最后更新**: 2026-03-21  
**下次审查**: 2026-04-21（每月检查一次）
