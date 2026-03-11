---
name: code-review
description: Review code for quality, security, and maintainability following LogiX team standards. Use when reviewing pull requests, examining code changes, or when the user asks for a code review.
---

# Code Review

## Quick Start

When reviewing code, verify against LogiX development standards (`.cursor/rules/logix-development-standards.mdc`) and project map (`.cursor/rules/logix-project-map.mdc`).

## Review Checklist

### 核心原则
- [ ] 数据库表结构为唯一基准：表名/字段名与 `backend/03_create_tables.sql` 一致
- [ ] 无临时 SQL 补丁修数据；导入错误应删数据 → 修映射 → 重导
- [ ] 开发顺序正确：SQL → 实体 → API → 前端

### 命名与映射
- [ ] 数据库：snake_case（`container_number`, `eta_dest_port`）
- [ ] 实体：camelCase + `@Column({ name: 'snake_case' })`
- [ ] API/Excel 映射：`table`/`field` 与数据库完全一致
- [ ] 前端：组件 PascalCase.vue，组合式 use+PascalCase，CSS kebab-case

### 数据展示与日期
- [ ] 有数据展示的页面提供顶部日期范围选择器
- [ ] 统计/列表/图表共用同一套 startDate/endDate
- [ ] 后端口径：`actual_ship_date` 或 `shipment_date`

### 前端规范
- [ ] 无硬编码色值；用 `@use '@/assets/styles/variables'` 或 `useColors()`
- [ ] 用户可见文案用 `$t()`/`t()`，无硬编码中文
- [ ] 搜索输入防抖；长列表虚拟滚动或分页

### 单一职责
- [ ] Vue 单文件 < 300 行、TS 逻辑 < 200 行；过长则拆分
- [ ] Controller 只做参数校验与调用 Service；业务在 Service
- [ ] 命名体现职责（如 CountdownCard、useContainerStats）

### 代码风格
- [ ] 2 空格、单引号；后端加分号、行宽 ~120；前端无分号、行宽 ~100
- [ ] 无 console.log、无硬编码魔法数字；避免 any

## Feedback Format

- 🔴 **Critical**：必须修复（违反核心原则、命名错误、数据口径不一致）
- 🟡 **Suggestion**：建议改进（可读性、性能、拆分）
- 🟢 **Nice to have**：可选优化

## Verification

建议 reviewer 运行：`npm run validate`（含 type-check + lint）。
