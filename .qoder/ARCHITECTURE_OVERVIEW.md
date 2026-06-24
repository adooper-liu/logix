# LogiX 架构总览

## 文档体系

- **logix-development-rules.mdc** - 核心开发规则（always_on）
- **logix-business-knowledge/Skill.md** - 业务知识（28张表、4大流程）
- **logix-modular-architecture/Skill.md** - 模块化架构设计
- **logix-refactoring-roadmap/Skill.md** - 重构路线图
- **logix-quick-start-refactoring/Skill.md** - 快速启动指南

## 技术栈

**后端**: NestJS + TypeORM + PostgreSQL  
**前端**: Vue 3 + TypeScript + Element Plus  
**测试**: Jest + Vitest + Playwright

## 核心原则

1. **单一职责** - 函数≤50行，文件≤300行
2. **类型安全** - 禁止any类型
3. **依赖倒置** - 面向接口编程
4. **纯函数优先** - 业务逻辑无副作用
5. **数据库优先** - SQL → Entity → Service → API

## 目录结构

```
backend/src/
├── entities/          # TypeORM实体
├── services/          # 业务逻辑
├── controllers/       # API路由
├── domain/            # 领域层（重构目标）
└── utils/             # 工具函数

frontend/src/
├── views/             # 页面组件
├── components/        # 可复用组件
├── composables/       # 组合式函数
└── services/          # API调用
```

## 质量指标目标

| 指标 | 当前 | 目标 |
|------|------|------|
| 平均文件行数 | 450 | 200 |
| 平均函数行数 | 80 | 30 |
| any类型使用 | 25次 | 0次 |
| 测试覆盖率 | 30% | 75% |
| TODO数量 | 29个 | 0个 |

## ESLint关键规则

```javascript
{
  '@typescript-eslint/no-explicit-any': 'error',
  'max-lines-per-function': ['error', { max: 50 }],
  'max-lines': ['warn', { max: 300 }],
  'complexity': ['error', 10],
  'no-console': 'error'
}
```

## Git Hooks

pre-commit自动执行：
- npm run type-check
- npm run lint
- npm run lint:naming

## 参考文档

详细规范见 `.qoder/rules/` 和 `.qoder/skills/`
