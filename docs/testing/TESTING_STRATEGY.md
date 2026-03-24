# LogiX 测试与回归策略

> 与 `.cursor/skills/logix-quality-gates/SKILL.md`、根目录 `package.json` 脚本一致；变更时请同步更新 `docs/quality/DEVELOPMENT_DEBT.md` 的更新日志。

## 分层

| 层级 | 工具 | 范围 | 何时跑 |
|------|------|------|--------|
| 静态 | ESLint / TypeScript | 全仓库 | 每次提交、PR、CI |
| 单元 | Jest（backend）、Vitest（frontend） | 纯函数、服务（可 mock）、工具 | `npm run test` |
| 接口对账 | `backend/scripts/verify-statistics-by-filter-consistency.ts` | `statistics-detailed` vs `by-filter` | 改统计/筛选/状态分布相关代码必跑 |
| 集成 / E2E | 待定 | 需稳定测试库与种子数据 | 见还债文档 P2 |

## 命令（仓库根目录）

```bash
npm run validate          # type-check + lint + lint:naming
npm run test              # backend Jest + frontend Vitest
npm run quality           # validate + test（推荐合并前执行）
npm run verify:stats-filter   # 需本机/测试环境 API 已启动，见脚本内环境变量说明
```

## 统计 / 筛选相关改动（强制）

凡修改以下之一，**必须**在可访问后端的前提下执行 `npm run verify:stats-filter`（可设 `START_DATE` / `END_DATE` 与页面一致）：

- `backend/src/services/containerStatistics.service.ts`
- `backend/src/services/statistics/**`
- `backend/src/constants/FilterConditions.ts`
- Shipments 等与 `filterCondition` / 卡片统计强相关的前端逻辑

## 目录约定

- 后端测试：`backend/src/**/*.test.ts`（与源文件同目录或 `__tests__`）
- 前端测试：`frontend/src/**/*.test.ts` 或 `**/__tests__/**`

## 参考

- 质量与还债总览：`docs/quality/DEVELOPMENT_DEBT.md`
