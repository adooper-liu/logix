# 全球快递费决策可视化 - 实施进度（与代码同步）

**最后对齐日期**: 2026-04-23  
**状态**: Phase 1 后端能力已落库（7/7），与 [EXPRESS_COST_PHASE1_COMPLETION.md](./EXPRESS_COST_PHASE1_COMPLETION.md) 一致

---

## 已完成清单

| 序号 | 项                                           | 说明                                                                                                                              |
| ---- | -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| 1    | `04_express_cost_tables.sql`                 | 4 张 `dict_express_*` + `ext_sku_logistics_attributes`                                                                            |
| 2    | TypeORM 实体 5 个 + `database/index` 注册    | 见 `backend/src/entities/Express*.ts`, `SkuLogisticsAttributes.ts`                                                                |
| 3    | `costEngine.service.ts`                      | 体积重/规则匹配/互斥/拒收；策略 JSON 键 `if_triggered` / `max_group` / `disable`                                                  |
| 4    | `expressRuleImport.service.ts`               | **单事务**导入：任一行（规则或 stack_policies）失败则**全量回滚**；`versionId` 不残留                                             |
| 5    | `express-cost.routes.ts` + `routes/index.ts` | `GET/POST` 及 `/express-cost` 挂载（路径无前缀重复；服务实际挂在与现有路由相同聚合器下，见下）                                    |
| 6    | 单元测试                                     | `backend/tests/costEngine.test.ts`（用动态 `carrierServiceId`）；`expressRuleImport.test.ts`（内存最小 xlsx，无大 fixtures 依赖） |
| 7    | 依赖                                         | `xlsx` / `multer` 及 @types 已在 `backend/package.json`                                                                           |
| 8    | Phase A+骨架（进行中）                       | 新增 `05_pricing_phasea_plus.sql`、4个定价实体、`pricingImportService`、`baseFreightEngineService`、`costEngine` 基础价聚合     |
| 9    | Phase A+ 集成测试                            | `tests/integration/pricing/*.integration.test.ts`；命令见 [EXPRESS_COST_QUICK_START.md](./EXPRESS_COST_QUICK_START.md)         |

---

## 与「计划」的口径对齐

- **事务**：与文档「全量回滚」一致；若需「部分成功」模式需另开 `allowPartial` 与 savepoint 设计，当前**未**实现。
- **复合索引**：规则表**无** `country_code` 列；国别经 `dict_express_carrier_service.country_code` 关联。SQL 文件内已加注释说明。
- **API HTTP 行为**：`POST /import-excel` 在**行级全回滚**时返回 **HTTP 422**，`success: false` 与 `data.errors`；缺少 Sheet/元数据不合法时返回 **400**；非预期异常 **500**。

---

## 相关文件

- SQL: [backend/sql/schema/04_express_cost_tables.sql](../backend/sql/schema/04_express_cost_tables.sql)
- 完成报告: [EXPRESS_COST_PHASE1_COMPLETION.md](./EXPRESS_COST_PHASE1_COMPLETION.md)
- 快速开始: [EXPRESS_COST_QUICK_START.md](./EXPRESS_COST_QUICK_START.md)
- Phase A+任务包: [EXPRESS_COST_PHASEA_PLUS_TASK_PACKAGE.md](./EXPRESS_COST_PHASEA_PLUS_TASK_PACKAGE.md)

**历史说明**: 本文件旧版中「4/7、待办 Excel/API/测试」的段落已**作废**，以本版为准；保留文件名便于从旧链跳转。
