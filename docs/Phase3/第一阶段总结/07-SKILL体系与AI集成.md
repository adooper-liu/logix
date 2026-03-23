# 07-SKILL体系与AI集成

**创建日期**: 2026-03-21  
**最后更新**: 2026-03-23  
**预计阅读时间**: 60 分钟  

---

## 📋 本章目录

1. [SKILL体系架构](#1-skill体系架构)
2. [SKILL使用方法](#2-skill使用方法)
3. [SKILL编写规范](#3-skill编写规范)
4. [AI辅助开发实践](#4-ai辅助开发实践)
5. [知识库建设](#5-知识库建设)

---

## 1. SKILL体系架构 🔥

### 1.1 SKILL分类

```
logix-development           - 核心开发技能（必学）
database-query              - 数据库查询专用
document-processing         - Excel/PDF文档处理
excel-import-requirements   - Excel导入规范
code-review                 - 代码质量审查
commit-message              - Git提交信息生成
feituo-eta-ata-validation  - 飞驼数据验证
logix-demurrage            - 滞港费计算
typeorm-exists-subquery    - TypeORM EXISTS 子查询
```

### 1.2 项目中的 SKILL 位置

```
logix/
├── .codebuddy/skills/          # CodeBuddy SKILL
│   ├── logix-development/
│   ├── database-query/
│   ├── document-processing/
│   └── ...
│
├── .cursor/skills/             # Cursor IDE SKILL
│   ├── container-intelligent-processing/
│   └── ...
│
└── .lingma/skills/             # Lingma IDE SKILL
    └── ...
```

### 1.3 SKILL 结构

```markdown
---
name: skill-name
description: 简短描述
---

# 技能标题

## 核心原则
- 关键规则1
- 关键规则2

## 使用场景
- 场景1
- 场景2

## 示例代码
```typescript
// 代码示例
```

## 注意事项
- 注意1
- 注意2
```

---

## 2. SKILL使用方法

### 2.1 在 CodeBuddy 中使用

```bash
# 1. 查看可用 SKILL
# 在 CodeBuddy 对话框中输入 /skills

# 2. 加载特定 SKILL
# 使用 use_skill 工具
use_skill({ command: 'logix-development' })

# 3. 使用 SKILL 中的规则进行开发
```

### 2.2 在 Cursor 中使用

```markdown
# 打开 .cursor/skills/ 下的 SKILL 文件
# Cursor 会自动加载 SKILL 规则

# 在对话中引用 SKILL 名称
@logix-development
帮我创建一个新的货柜实体
```

---

## 3. SKILL编写规范

### 3.1 编写模板

```markdown
---
name: example-skill
description: 这是一个示例 SKILL
---

# 示例技能

## 核心原则
1. 第一条原则
2. 第二条原则

## 使用场景
- 当你需要做某事时
- 当你遇到某个问题时

## 示例代码

### 示例1：基本用法
```typescript
function example() {
  // 代码
}
```

### 示例2：进阶用法
```typescript
function advanced() {
  // 更多代码
}
```

## 注意事项
- 注意点1
- 注意点2
```

### 3.2 编写要点

```markdown
# ✅ 应该包含
- 清晰的核心原则
- 具体的使用场景
- 可运行的代码示例
- 常见问题和解决方案

# ❌ 避免
- 过于笼统的描述
- 过长的内容
- 歧义的表达
```

---

## 4. AI辅助开发实践 🔥

### 4.1 AI 角色定位

```
┌─────────────────────────────────────────────────────────────────────┐
│                        AI 在项目中的角色                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ✅ 代码生成助手                                                   │
│     - 生成样板代码                                                 │
│     - 提供实现思路                                                 │
│                                                                     │
│  ✅ 文档编写助手                                                   │
│     - 自动生成文档模板                                             │
│     - 整理现有代码                                                 │
│                                                                     │
│  ✅ Bug诊断助手                                                    │
│     - 分析错误原因                                                 │
│     - 提供修复建议                                                 │
│                                                                     │
│  ✅ 架构设计顾问                                                   │
│     - 提供架构建议                                                 │
│     - 评估技术选型                                                 │
│                                                                     │
│  ⚠️  不能替代                                                     │
│     - 业务理解（需要人工确认）                                       │
│     - 代码审查（需要人工把关）                                       │
│     - 复杂决策（需要团队讨论）                                       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.2 高效使用技巧

```typescript
// ❌ 低效提问
"帮我写一个API"

// ✅ 高效提问
"帮我写一个GET /api/v1/containers/:id的API
需要返回货柜基本信息、海运信息、港口操作信息
使用Express + TypeORM"

// ✅ 提供上下文
"在LogiX项目中，按照database-query SKILL的规范
写一个查询货柜列表的SQL
需要支持分页、排序、日期筛选"
```

### 4.3 验证 AI 输出

```typescript
// AI 生成的代码必须验证
// 1. 类型检查
// 2. 逻辑审查
// 3. 测试验证

// ✅ 正确流程
AI生成代码 → 类型检查 → 人工审查 → 测试验证 → 合并
```

---

## 5. 知识库建设 🔥

### 5.1 知识库结构

```
frontend/src/
└── ai/
    └── knowledgeBase.ts       # 知识库入口
      ├── 项目信息              # project
      ├── 数据结构             # data
      ├── 可视化               # visualization
      ├── 数据筛选             # filter
      ├── 开发规范             # rules
      └── 快速开始             # quickstart
```

### 5.2 知识条目设计

```typescript
interface KnowledgeItem {
  id: string
  category: string
  title: string
  keywords: string[]
  content: string
}

// 示例
{
  id: 'container-status',
  category: 'data',
  title: '货柜状态说明',
  keywords: ['logistics_status', '状态机', '桑基图'],
  content: 'LogiX使用7个简化状态...'
}
```

### 5.3 知识库使用场景

- **AI 问答检索**: AI 回答时从知识库获取信息
- **新人培训**: 新开发者快速了解项目
- **快速查阅**: 遇到问题时快速查找

---

## 📝 本章小结

| 知识点 | 核心要点 |
|--------|---------|
| SKILL分类 | 10+ 专用技能 |
| SKILL位置 | .codebuddy/.cursor/.lingma |
| AI角色 | 代码生成、文档、Bug诊断 |
| 使用技巧 | 提供上下文、明确需求 |
| 知识库 | 项目信息、结构化存储 |

---

**下一步**: 阅读 [08-代码中隐藏的知识点](./08-代码中隐藏的知识点.md)

---

**文档状态**: 🏗️ 建设中  
**最后更新**: 2026-03-23  
**维护人**: AI Development Team
