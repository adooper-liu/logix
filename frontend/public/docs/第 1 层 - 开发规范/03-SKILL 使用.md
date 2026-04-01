# SKILL 使用

CodeBuddy AI 辅助开发技能（SKILL）使用指南。

## SKILL 简介

SKILL 是 CodeBuddy 的专业技能系统，为 LogiX 项目提供领域特定的知识和工具。

## 核心 SKILL

## SKILL 文件位置

### 项目根目录

- **主 SKILL 规范**：`skill.md`（项目 SKILL 体系总纲）
- **SKILL 执行指南**：`docs/SKILL 执行指南.md`（实战案例、检查清单）

### 前端文档目录

- **SKILL 索引**：`frontend/public/docs/SKILL_INDEX.md`（所有 SKILL 文档索引）
- **具体 SKILL**：`frontend/public/docs/SKILL-*.md`（业务知识沉淀）

示例：

```bash
# 查看 SKILL 索引
cd frontend/public/docs
cat SKILL_INDEX.md

# 查看具体 SKILL
cat SKILL-时间线标签显示规则.md
```

### CodeBuddy Skills

```
.codebuddy/skills/logix-development/
├── skill-integration.md
├── phase2-intelligent-scheduling/
│   ├── skill-check.md
│   └── ...
```

## SKILL 原则

SKILL 遵循以下原则：

1. **单一职责**：一个 SKILL 只解决一类问题
2. **知识沉淀**：积累开发经验和业务知识
3. **索引清晰**：编号管理，快速查找
4. **活文档**：持续更新，与代码同步
5. **面向学习**：帮助开发者快速上手

详细规范见各 SKILL 文档和 `SKILL_INDEX.md`。
