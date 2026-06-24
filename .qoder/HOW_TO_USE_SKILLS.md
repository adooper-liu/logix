# Skills 使用指南

## Skills列表

| Skill | 优先级 | 用途 |
|-------|--------|------|
| logix-development | ⭐⭐⭐ | 核心开发规范 |
| database-query | ⭐⭐⭐ | 数据库查询 |
| document-processing | ⭐⭐ | Excel/PDF处理 |
| code-review | ⭐⭐ | 代码审查 |
| commit-message | ⭐ | Git提交 |

## 典型场景

### 开发新功能

1. 查看logix-development - 核心原则、命名规则
2. 参考database-query（如需SQL）- 表前缀、关联关系
3. 编码（AI自动应用Skills）
4. code-review自我检查
5. 提交（commit-message生成规范消息）

### 修复Bug

1. logix-development - 确认是否违反核心原则
2. database-query - 验证SQL关联
3. code-review - 定位问题
4. 修复后再次检查

### Excel导入

1. document-processing - 映射规则
2. logix-development - 确认table/field与数据库一致
3. 实现导入功能

### Code Review

使用code-review清单逐项检查：
- 核心原则
- 命名规范
- 日期口径
- 前端规范
- 单一职责
- 代码风格

## 快速查找

| 问题 | 使用Skill |
|------|----------|
| 不知道从哪里开始 | README.md |
| 不确定命名规范 | logix-development |
| 不会写SQL | database-query |
| Excel导入出错 | document-processing |
| 代码质量担忧 | code-review |
| 不会写commit | commit-message |

## Rules vs Skills

**Rules** (.qoder/rules/):
- 简洁、强制、always_on自动加载

**Skills** (.qoder/skills/):
- 详细、场景化、按需调用
