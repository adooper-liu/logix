# LogiX AI Agent 配置索引

> **单一事实来源（Single Source of Truth）**  
> 所有AI Agent配置统一存放在 `.qoder/` 目录

---

## 🚀 快速开始

### 新手入门路径

```
1️⃣ 阅读核心规则 (10分钟)
   └─> .qoder/rules/logix-development-rules.mdc

2️⃣ 阅读业务知识手册 (60分钟)
   └─> .qoder/skills/logix-business-knowledge/Skill.md

3️⃣ 阅读快速启动指南 (10分钟)
   └─> .qoder/skills/logix-quick-start-refactoring/Skill.md

4️⃣ 开始第一次重构 (4-6小时)
   └─> 按照指南逐步执行
```

---

## 📁 目录结构

```
.qoder/
├── rules/                    # 开发规则（AI自动加载）
│   ├── logix-development-rules.mdc          # 核心开发规则（always_on）
│   ├── logix-coding-standards.mdc           # 详细编码规范（manual）
│   ├── logix-project-map.mdc                # 项目结构速查
│   ├── logix-doc-generation-rules.mdc       # 文档生成规则
│   ├── ai-auto-skill-trigger.mdc            # Skill自动触发规则
│   └── skill-principles.mdc                 # Skill编写原则
│
├── skills/                   # 技能库（按领域分层）
│   ├── 00-core/              # 核心规范
│   │   ├── ai-collaboration-methodology/    # AI协作方法论
│   │   ├── logix-code-quality-check/        # 代码质量检查
│   │   └── logix-modular-architecture/      # 模块化架构
│   │
│   ├── 01-business/          # 业务知识
│   │   ├── logix-business-knowledge/        # 业务知识手册
│   │   └── logix-demurrage/                 # 滞港费计算 ⭐新增
│   │
│   ├── 02-frontend/          # 前端开发
│   │   ├── vue-best-practices/              # Vue最佳实践（含20+参考文档）
│   │   └── vue-testing-best-practices/      # Vue测试最佳实践（含8+参考文档）
│   │
│   ├── 03-backend/           # 后端开发
│   │   └── database-query/                  # TypeORM查询优化 ⭐新增
│   │
│   ├── 04-feituo/            # 飞驼集成
│   │   ├── feituo-eta-ata-state-machine/    # 飞驼状态机
│   │   ├── feituo-import-rules/             # 飞驼导入规则
│   │   ├── feituo-eta-priority/             # 飞驼ETA优先级
│   │   └── feituo-eta-ata-validation/       # 飞驼ETA验证
│   │
│   └── 05-refactoring/       # 重构指南
│       ├── logix-quick-start-refactoring/   # 快速启动指南
│       └── logix-refactoring-roadmap/       # 重构路线图
│
├── docs/                     # 文档
│   ├── ARCHITECTURE_OVERVIEW.md             # 架构总览
│   ├── CHEAT_SHEET.md                       # 速查卡
│   ├── ESLINT_CONFIG_GUIDE.md               # ESLint配置指南
│   ├── HOW_TO_USE_SKILLS.md                 # 如何使用Skills
│   └── QUICK_REFERENCE.md                   # 快速参考
│
└── scripts/                  # 脚本（待创建）
    ├── verify-skills.ps1                    # 验证Skills完整性
    └── sync-to-other-ide.ps1                # 同步到其他IDE（可选）
```

---

## Rule 文件说明

### 自动加载的Rule（always_on）

| 文件名 | 用途 | 触发方式 |
|--------|------|---------|
| `logix-development-rules.mdc` | 核心开发规则（6大原则） | always_on |
| `logix-coding-standards.mdc` | 详细编码规范（命名、前端、代码风格） | manual |
| `logix-project-map.mdc` | 项目结构速查（表、API、前端） | always_on |
| `logix-doc-generation-rules.mdc` | 文档生成规则（何时生成文档） | always_on |
| `ai-auto-skill-trigger.mdc` | Skill自动触发机制 | always_on |
| `skill-principles.mdc` | Skill编写原则（简洁、真实、业务导向） | always_on |

**重要**：这些Rule文件会在AI每次对话时自动加载，指导AI生成符合规范的代码。

---

## 📚 Skill 分类

### 核心规范类

| Skill | 用途 | 关键词 |
|-------|------|--------|
| `ai-collaboration-methodology` | AI协作开发方法论 | 需求理解、错误排查、SOP |
| `logix-code-quality-check` | 代码质量检查（5步自检） | 类型安全、异步操作、复杂度 |
| `logix-modular-architecture` | 模块化架构设计 | 单一职责、低耦合、纯函数 |

### 01-business - 业务知识类

| Skill | 用途 | 关键词 |
|-------|------|--------|
| `logix-business-knowledge` | 完整业务知识手册 | 28张表、4大业务流程 |
| `logix-demurrage` | 滞港费计算逻辑 | demurrage、LFD、free days |

### 02-frontend - 前端开发类

| Skill | 用途 | 关键词 |
|-------|------|--------|
| `vue-best-practices` | Vue 3最佳实践 | Composition API、script setup |
| `vue-testing-best-practices` | Vue测试最佳实践 | Vitest、Test Utils、Playwright |

### 03-backend - 后端开发类

| Skill | 用途 | 关键词 |
|-------|------|--------|
| `database-query` | TypeORM查询优化 | QueryBuilder、N+1、batch |

### 04-feituo - 飞驼集成类

| Skill | 用途 | 关键词 |
|-------|------|--------|
| `feituo-eta-ata-state-machine` | 飞驼ETA/ATA状态机 | state machine、mapping |
| `feituo-import-rules` | 飞驼数据导入规则 | import、validation、transform |
| `feituo-eta-priority` | 飞驼ETA优先级规则 | priority、corrected_eta |
| `feituo-eta-ata-validation` | 飞驼ETA/ATA验证 | validation、consistency |

### 05-refactoring - 重构指南类

| Skill | 用途 | 关键词 |
|-------|------|--------|
| `logix-quick-start-refactoring` | 快速启动指南 | quick-start、modular、testing |
| `logix-refactoring-roadmap` | 重构路线图 | roadmap、planning、priority |

---

## 🚀 快速开始

### 新手路径

1. 了解规则: rules/logix-development-rules.mdc
2. 查看速查卡: CHEAT_SHEET.md
3. 学习使用Skills: HOW_TO_USE_SKILLS.md

### 进阶路径

1. 深入业务知识: skills/01-business/logix-business-knowledge/Skill.md
2. 掌握模块化: skills/00-core/logix-modular-architecture/Skill.md
3. 代码质量保障: skills/00-core/logix-code-quality-check/Skill.md
4. 重构路线图: skills/05-refactoring/logix-refactoring-roadmap/Skill.md

---

## 🔍 如何查找内容

### 按主题查找

- **数据库相关**: 搜索 `database`, `sql`, `typeorm`, `postgresql`
- **前端相关**: 搜索 `vue`, `component`, `composable`, `element-plus`
- **飞驼相关**: 搜索 `feituo`, `eta`, `ata`, `status`
- **排柜相关**: 搜索 `scheduling`, `warehouse`, `trucking`, `cost`
- **质量相关**: 搜索 `eslint`, `test`, `review`, `quality`

### 按文件类型查找

- **Rule文件**: `.qoder/rules/*.mdc`
- **Skill文件**: `.qoder/skills/*/Skill.md`
- **参考文档**: `.qoder/skills/*/references/*.md`
- **总览文档**: `.qoder/*.md`

---

## 🔄 维护指南

### 添加新Skill

```bash
# 1. 创建Skill目录
mkdir -p .qoder/skills/my-new-skill

# 2. 创建Skill文件
touch .qoder/skills/my-new-skill/Skill.md

# 3. 编写Skill内容（遵循 skill-principles.mdc）

# 4. 更新本索引文件
# 在对应分类下添加新Skill
```

### 更新现有Skill

```bash
# 直接编辑Skill文件
code .qoder/skills/logix-business-knowledge/Skill.md

# 确保遵循 skill-principles.mdc 的原则
```

### 定期审查

```bash
# 每月运行一次
npm run audit:skills

# 检查:
# - 是否有重复的Skill
# - 是否有过时的文档
# - 是否有缺失的索引
```

---

#

**版本**: v1.0  
**最后更新**: 2026-06-23  
**维护者**: LogiX Team  
**状态**: ✅ 活跃维护中
