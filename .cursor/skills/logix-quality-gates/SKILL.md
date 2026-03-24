---
name: logix-quality-gates
description: LogiX 质量门禁、测试命令与技术债治理。在合并前检查、补充测试、改统计/筛选、建立 CI、更新还债文档时使用。
---

# LogiX 质量门禁与技术债（首要遵循）

> **优先级**：本技能与 `logix-development` 同时适用时，**不降低质量门禁**；功能实现须仍满足 `logix-development` 中的数据库、日期、命名与 i18n 等准则。

## 必须掌握的命令（仓库根目录）

```bash
npm run validate          # type-check + lint + lint:naming
npm run test              # backend Jest + frontend Vitest（当前仓库可全绿）
npm run quality           # validate + test — 本地合并前目标；validate 受 TD-006 影响
npm run quality:ci        # test + type-check:backend + lint:backend — **与 GitHub Actions 一致**
npm run type-check:frontend:ci   # vue-tsc -p frontend/tsconfig.ci.json（收窄 exclude，TD-006）
npm run verify:stats-filter   # 需后端已启动；统计 vs by-filter 对账
```

**当前状态（与 `docs/quality/DEVELOPMENT_DEBT.md` 同步）**：

- **`npm run test`**：应全绿；改统计/筛选/状态机相关逻辑后必跑。
- **`npm run type-check:backend`**：应绿；飞驼等 4 文件含 `// @ts-nocheck`（**TD-008**），移除需实体/飞驼字段对齐。
- **`npm run lint:backend`**：0 error（可有 max-len/no-console 等 warning，**TD-007** 已收 error）。
- **`npm run validate` / `npm run quality`**：含前端 `vue-tsc`，**TD-006** 未收口前未必绿。
- **`npm run quality:ci`**：CI 默认门禁（不含前端 `vue-tsc`、不含 markdownlint）。

## 何时必须跑 `verify:stats-filter`

修改任一路径或等效逻辑时，在**可访问 API** 的环境执行对账（可设置 `API_BASE_URL`、`START_DATE`、`END_DATE`）：

- `backend/src/services/containerStatistics.service.ts`
- `backend/src/services/statistics/**`
- `backend/src/constants/FilterConditions.ts`
- 与 Shipments 卡片、`filterCondition` 强相关的前后端代码

脚本说明：`backend/scripts/verify-statistics-by-filter-consistency.ts`。

## 技术债与文档（须同步更新）

- **活文档**：`docs/quality/DEVELOPMENT_DEBT.md` — 完成一项还债或调整门禁后，在顶部「更新日志」追加一行，并更新技术债表（含 TD-004 全量类型检查）。
- **测试策略**：`docs/testing/TESTING_STRATEGY.md` — 分层与目录约定变更时同步修改。

## 禁止项（与 logix-development 一致）

- 用临时 SQL **修补**导入/业务错误数据（应删错数据、修映射、重导）。
- 统计与列表**日期口径不一致**（须与 `DateFilterBuilder` / 顶部日期范围一致）。
- 为通过检查而**跳过**对账或关闭测试（除非 Issue 中登记原因与后续计划）。

## PR 与 CI

- PR 使用 `.github/pull_request_template.md` 检查清单。
- CI：`.github/workflows/ci.yml`（`npm run quality:ci`）。全仓 `quality`/`validate` 待 **TD-006**、**TD-008**；对账 job 需测试环境。

## 参考

- `logix-development`：功能开发与代码规范主技能
- `fix-verification`：涉及表名/字段/API 时的修复验证流程
- `code-review`：审查清单
