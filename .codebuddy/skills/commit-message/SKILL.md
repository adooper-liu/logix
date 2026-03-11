---
name: commit-message
description: Generate descriptive commit messages by analyzing git diffs. Use when the user asks for help writing commit messages, reviewing staged changes, or preparing to commit.
---

# Commit Message

## Format

采用 Conventional Commits 格式：

```
<type>(<scope>): <subject>

[optional body]
```

### Type

| Type | 用途 |
|------|------|
| feat | 新功能 |
| fix | Bug 修复 |
| docs | 文档 |
| style | 格式（不影响逻辑） |
| refactor | 重构 |
| perf | 性能 |
| test | 测试 |
| chore | 构建/工具/依赖 |

### Scope（可选）

- `backend` / `frontend` / `shared`
- 模块名：`demurrage`、`container`、`import`、`dict` 等

### Subject

- 祈使句、首字母小写、无句号
- 中文或英文均可，保持项目一致

## Examples

**feat**
```
feat(demurrage): add DemurrageSummarySection component
feat(backend): add dict CRUD API for ports and countries
```

**fix**
```
fix(container): correct last_free_date display in PortOperations
fix(import): snake_case field mapping for process_port_operations
```

**refactor**
```
refactor(shipments): split ContainerDetail into sub-components
refactor(backend): extract DateFilterBuilder for date range queries
```

**docs**
```
docs: add demurrage standards import guide
```

**chore**
```
chore: upgrade vue-i18n to 9.14.4
```

## Workflow

1. 分析 `git diff` 或 `git status` 确定变更范围
2. 选择 type 和 scope
3. 用一句话概括变更（subject）
4. 若变更复杂，可加 body 说明原因或影响
