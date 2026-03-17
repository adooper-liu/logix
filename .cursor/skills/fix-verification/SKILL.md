---
name: fix-verification
description: Ensures accuracy and effectiveness of code fixes by mandating verification against authoritative sources. Use when fixing bugs, modifying database-related code, or implementing changes that involve table/field names. Prevents AI hallucinations by requiring read-before-modify workflow.
---

# 问题修复验证技能

> 🎯 **目标**: 确保修改的有效性与准确性，消除 AI 幻觉，尤其保证数据库字段的准确性。
>
> 📚 **关联技能**: logix-development（开发规范）、database-query（数据库）、excel-import-requirements（导入映射）

---

## 一、核心原则：先验证，后修改

```
❌ 禁止：根据记忆、推断或「通常如此」直接修改
✅ 必须：从权威源读取 → 核对 → 再修改
```

**幻觉防范三不**：
1. **不推断**：不确定的表名、字段名必须查 SQL/实体，不得猜测
2. **不假设**：不假设「应该叫 xxx」「一般用 xxx」
3. **不跳过**：涉及数据库/API/映射时，必须执行验证清单

---

## 二、权威源定义（唯一真相来源）

| 类型 | 权威源路径 | 用途 |
|------|------------|------|
| **数据库表/字段** | `backend/03_create_tables.sql` | 表名、字段名、类型、约束 |
| **实体定义** | `backend/src/entities/*.ts` | 实体属性 ↔ 数据库字段映射 |
| **Excel 映射** | `frontend/src/views/import/ExcelImport.vue` | table/field 与数据库对齐 |
| **API 路由** | `backend/src/routes/index.ts` | 路由前缀、路径 |
| **项目速查** | `.cursor/rules/logix-project-map.mdc` | 表/实体/API 速查 |

**规则**：凡涉及表名、字段名、API 路径的修改，必须从上述权威源读取并核对。

---

## 三、修复前验证流程（必须执行）

### 3.1 通用流程

```
步骤 1：定位问题
  - 明确错误类型（DB/API/映射/业务逻辑）
  - 记录错误信息中的具体符号（表名、字段名、路径）

步骤 2：读取权威源
  - 用 Read 或 Grep 读取 03_create_tables.sql / 实体文件
  - 确认目标表/字段在权威源中的确切写法

步骤 3：核对一致性
  - 修改处与权威源是否一致？
  - 是否存在 snake_case / camelCase 混用？

步骤 4：执行修改
  - 仅使用从权威源确认的准确值

步骤 5：验证
  - ReadLints、npm run type-check、npm run lint
```

### 3.2 数据库相关修复（强制清单）

涉及表名、字段名、SQL、实体、Excel 映射时：

- [ ] **已读取** `backend/03_create_tables.sql` 中相关表定义
- [ ] **已读取** 对应实体文件（如 `Container.ts` → `biz_containers`）
- [ ] **已确认** 字段名在 SQL 中为 snake_case（如 `container_number`）
- [ ] **已确认** 实体中 `@Column({ name: 'snake_case' })` 与 SQL 一致
- [ ] **若涉及导入**：已核对 `ExcelImport.vue` 的 table/field 与 SQL 一致

### 3.3 导入/导出修复

- [ ] **已读取** `ExcelImport.vue` 的 `FIELD_MAPPINGS` 或对应字典配置
- [ ] **已确认** `table` 与 `03_create_tables.sql` 表名完全一致
- [ ] **已确认** `field` 与 SQL 字段名完全一致（snake_case）
- [ ] **已检查** `transform` 与字段类型匹配（boolean/date/decimal）

### 3.4 API/路由修复

- [ ] **已读取** `backend/src/routes/index.ts` 或对应路由文件
- [ ] **已确认** 路由前缀（`/api/v1`）与前端 `VITE_API_BASE_URL` 一致
- [ ] **已确认** 路径与 Controller 中定义一致

---

## 四、常见幻觉与纠正

| 幻觉类型 | 错误示例 | 正确做法 |
|----------|----------|----------|
| **表名推断** | 写 `containers` 而非 `biz_containers` | 查 03_create_tables.sql 确认表名 |
| **字段名推断** | 写 `containerNumber` 在 SQL/映射中 | 数据库层必须用 `container_number` |
| **实体属性混淆** | 用 `@Column('containerNumber')` | 必须 `@Column({ name: 'container_number' })` |
| **导出名不存在** | 假设 `database/index` 导出 `dataSource` | 用 Grep 查 `export` 确认实际导出名 |
| **模块路径推断** | 假设 `./searchCodebase` 存在 | 用 Glob/Grep 确认文件是否存在 |
| **API 路径推断** | 写 `/containers/stats` | 查 routes 确认实际路径如 `/statistics` |

---

## 五、验证命令速查

```bash
# 查表/字段定义
Grep "CREATE TABLE|container_number|biz_containers" backend/03_create_tables.sql

# 查实体导出/属性
Grep "export|@Column|@Entity" backend/src/entities/Container.ts

# 查模块导出
Grep "export" backend/src/database/index.ts

# 查 Excel 映射
Grep "table:|field:" frontend/src/views/import/ExcelImport.vue

# 查路由
Grep "router.use|router.get|router.post" backend/src/routes/index.ts
```

---

## 六、修改后自检

- [ ] 无新增 `console.log`（用 logger 替代）
- [ ] 无硬编码色值（用 SCSS 变量 / useColors）
- [ ] 无硬编码中文（用 $t()/t()，或标注 TODO）
- [ ] `npm run type-check` 通过
- [ ] `npm run lint` 通过（或仅剩既有问题）

---

## 七、参考

- [logix-project-map](../../rules/logix-project-map.mdc) - 表/实体/API 速查
- [logix-development-standards](../../rules/logix-development-standards.mdc) - 开发准则
- [database-query](../database-query/SKILL.md) - 数据库查询规范
- [excel-import-requirements](../excel-import-requirements/SKILL.md) - 导入映射规范

---

**最后更新**: 2026-03-17
