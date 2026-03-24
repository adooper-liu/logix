## 变更说明

<!-- 简述本 PR 目的与范围 -->

## 检查清单

- [ ] 已阅读并遵守 `frontend/public/docs/DEVELOPMENT_STANDARDS.md` 与 `.cursor/rules` 中的 LogiX 准则
- [ ] `npm run quality`（或等价：`validate` + `test`）已通过
- [ ] 若修改 **数据库 / 实体 / API**：已按 **SQL → 实体 → API → 前端** 顺序，且未用临时 SQL 修生产数据
- [ ] 若修改 **统计 / 筛选 / 状态分布 / `filterCondition`**：已在可访问后端下执行 `npm run verify:stats-filter`（或与页面一致的 `START_DATE`/`END_DATE`）
- [ ] 用户可见文案使用 i18n（`$t`/`t()`），未新增无必要的硬编码中文
- [ ] 样式未新增硬编码色值（SCSS 变量 / `useColors`）

## 关联

<!-- 可选：Issue / 文档 / 截图 -->
