# 甘特 gantt_derived 后端单一真相（落库）

## 数据库

- 表 `biz_containers` 列：`gantt_derived JSONB NULL`
- 已有库执行：`backend/scripts/add-gantt-derived-to-containers.sql`
- 新库：`backend/03_create_tables.sql` 已含该列

## JSON 结构（gantt-v2）

- 顶层：`phase`、`phaseLabel`、`primaryNode`、`ruleVersion`（当前 **`gantt-v2`**）、`derivedAt`
- `nodes[]` 每项：`key`（customs/pickup/unload/return）、`taskRole`、`completed`、**`plannedDate` / `actualDate`**（`YYYY-MM-DD`，与流程表同一套优先级，由后端统一计算，供甘特画点）

## 后端

- 构建：`backend/src/utils/ganttDerivedBuilder.ts`（`ruleVersion: gantt-v2`）
- 实体：`Container.ganttDerived`（`jsonb`）
- 写入时机（与 `logistics_status` 同步或单独因甘特语义变化）：
  - `ContainerStatusService.updateStatus` / `batchUpdateStatuses`
  - `ExternalDataService.recalculateLogisticsStatus`
  - `feituoImport.service` `recalculateStatus`
- 读取：`enrichContainersList`、`getContainerById` 在列为空时用同一构建器 **即时补全**（兼容迁移前数据）

## 前端

- 类型：`frontend/src/types/container.ts` → `GanttDerived`
- **方案 A 对齐**：接口返回 **`ganttDerived`**（与库表 `gantt_derived` 一致）时，甘特 **主任务 / 虚线 / 销毁（完成）** 对 **清关·提柜·卸柜·还箱** **只信 `ganttDerived.nodes[]`**（`taskRole` + `completed`）；**计划/实际日期**仍用 **`calculateNodeStatus`** 的节点快照以便画在日历格上。**查验** 不在后端 gantt-v1 四节点内，仍用 **`calculateNodeStatus`**。无 `ganttDerived` 时整段回退为原 **纯本地** `calculateNodeStatus` 逻辑。
- 三级分组：**`useGanttLogic.getNodeAndSupplier`**（目的港 → 中文五节点 → 供应商）不变。

## 历史数据回填

对仍为 `NULL` 或旧版 `gantt-v1` 的行，任选其一：

1. **甘特图页**：顶部 **「重算甘特快照」** 按钮 → 调 `POST /api/v1/containers/rebuild-gantt-derived`（默认**全表**逐柜 `updateStatus`，与飞驼/导入写入规则一致；耗时可较长）。  
2. **接口**：`POST /api/v1/containers/update-statuses/batch`，body 空对象则默认最多处理 1000 条（与全表不同），或传 `limit` / `containerNumbers`。  
3. 定时任务 `batchUpdateStatuses`、导入、飞驼同步会逐步写满。

## 规则变更

修改 `ganttDerivedBuilder` 时：**bump `GANTT_RULE_VERSION`**，并补充单测与对照说明。从 v1 升级到 v2 后需重新触发写库（同步/import/updateStatus）以写入各节点日期字段。
