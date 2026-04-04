# SKILL 使用

LogiX 项目技能（SKILL）使用指南。

## SKILL 简介

SKILL 是 LogiX 项目的专业知识系统，为开发提供领域特定的知识和最佳实践。

## SKILL 文件位置

### 主 SKILL 目录

```
.lingma/skills/
├── 00-core/                    # 核心技能
│   ├── README.md              # 技能地图
│   └── logix-dev-paradigm.md  # 开发范式
├── 01-backend/                 # 后端技能
│   ├── database-query/        # 数据库查询
│   ├── postgresql-table-design/ # 表设计
│   └── excel-import-requirements/ # Excel导入
├── 02-frontend/                # 前端技能
│   ├── vue-best-practices/    # Vue最佳实践
│   └── vue-testing-best-practices/ # Vue测试
├── 04-quality/                 # 质量保障
│   ├── code-review/           # 代码审查
│   └── commit-message/        # 提交信息
├── 05-domain/                  # 领域知识
│   ├── scheduling/            # 智能排产
│   └── logistics/             # 物流追踪
└── INDEX.md                    # 技能索引
```

### 快速查找

```bash
# 查看技能地图
cat .lingma/skills/00-core/README.md

# 查看技能索引
cat .lingma/skills/INDEX.md

# 查看开发范式
cat .lingma/skills/00-core/logix-dev-paradigm.md
```

## 核心 SKILL

| SKILL | 说明 | 位置 |
|-------|------|------|
| 开发范式总纲 | 五维分析法、SKILL原则 | 00-core/logix-dev-paradigm.md |
| 数据库查询 | PostgreSQL/TimescaleDB规范 | 01-backend/database-query/ |
| Vue最佳实践 | Composition API + script setup | 02-frontend/vue-best-practices/ |
| 代码审查 | Code Review规范 | 04-quality/code-review/ |
| 滞港费计算 | 成本优化算法 | 05-domain/scheduling/logix-demurrage/ |

## SKILL 原则

1. **单一职责**：一个 SKILL 只解决一类问题
2. **知识沉淀**：积累开发经验和业务知识
3. **索引清晰**：编号管理，快速查找
4. **活文档**：持续更新，与代码同步
5. **面向学习**：帮助开发者快速上手

## 使用方式

1. 开发前查阅相关 SKILL
2. 遇到问题先搜索 SKILL 索引
3. 新功能开发后更新 SKILL
4. 定期审查 SKILL 与代码一致性
