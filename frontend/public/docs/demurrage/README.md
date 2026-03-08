# 滞港费相关文档

本目录按阅读与落地顺序编号，集中存放滞港费/滞箱费/调度与费用优化相关文档。

| 编号 | 文档 | 说明 |
|------|------|------|
| 01 | [01-DEMURRAGE_LOGIC_FROM_CONTAINER_SYSTEM.md](./01-DEMURRAGE_LOGIC_FROM_CONTAINER_SYSTEM.md) | 滞港费计算逻辑与定义（来源 container-system）：术语、免费期类型、阶梯费率、标准匹配 |
| 02 | [02-CONTAINER_SCHEDULING_AND_COST_OPTIMIZATION_PLAN.md](./02-CONTAINER_SCHEDULING_AND_COST_OPTIMIZATION_PLAN.md) | 货柜提柜/送仓/卸柜/还箱调度与费用优化方案：目标、费用口径、last_free_date、排期与优化 |
| 03 | [03-DEMURRAGE_DATABASE_STATUS.md](./03-DEMURRAGE_DATABASE_STATUS.md) | 数据库滞港费标准设计检查与迁移：主表结构、实体、单独迁移脚本、SQL 校验 |

**关联**：01 为概念与计算口径基础；02 为方案与配置设计（已按 01 对齐）；03 为表结构与迁移落地。
