# 关键日期「历时/倒计时/超期」主后端统一：最小落地清单

> **目标**：把 `KeyDatesTimeline` + `DurationDisplay` 中的「后续节点 / 历时 / 倒计时 / 超期」判断迁到**主后端**，与 `calculateLogisticsStatus`、滞港费 `calculationDates` **同源**；**物流路径微服务 `validatePath` 保持可选**，不参与关键日期首屏渲染。

## 落地状态（Phase 0–1）

| 项 | 状态 |
|----|------|
| 后端 DTO | `backend/src/services/keyTimeline.ts`：`KeyTimelineNodeDto`、`KeyTimelineMetaDto`、`KeyTimelineResult`、`KeyTimelineBuildInput`、`buildKeyTimeline`（占位：`nodes: []`，`meta` 已填） |
| 滞港费响应 | `DemurrageCalculationResult.keyTimeline`；成功计算时随 `GET /demurrage/calculate/:containerNumber` 返回 |
| API 日期 | `calculationDates` 增加 `plannedReturnDate`（与库字段一致） |
| 类型再导出 | `demurrage.service.ts` 末尾 `export type { ... } from './keyTimeline.js'` |
| 前端类型 | `frontend/src/services/demurrage.ts`：`KeyTimeline*` 与 `data.keyTimeline` |
| **nodes 实现** | `buildKeyTimeline` 已按 KeyDatesTimeline / DurationDisplay 填充 `nodes`（`卸船` 为 `displayMode: none`）；`getContainerMatchParams.calculationDates.shipmentDate` 已接入 |

**下一步（Phase 3）**：`KeyDatesTimeline` 优先消费 `keyTimeline`，与本地计算双轨一段时间后删除前端重复逻辑。

---

## 一、现状与衔接点

| 能力 | 现有位置 | 衔接方式 |
|------|----------|----------|
| 日期与快照 | `DemurrageService.getContainerMatchParams`、`calculateForContainer` 已返回 `calculationDates`、`logisticsStatusSnapshot` | **复用同一套参数**，避免两套口径 |
| 状态机 | `utils/logisticsStatusMachine.calculateLogisticsStatus` | 时间线指标里继续用 `arrivedAtDestinationPort` 等，与滞港费一致 |
| 货柜详情 | `useContainerDetail` 调 `GET /demurrage/calculate/:containerNumber` | **优先**在同响应中增加字段，减少请求 |
| 路径验证 | `POST /logistics-path/validate/:pathId` | **不**作为关键日期数据源；仅路径 Tab 使用 |

---

## 二、DTO 设计（最小字段集）

在 **`DemurrageCalculationResult`**（或并列扩展 `timelineKeyDates`）中增加：

```typescript
/** 与「关键日期」时间线一一对应（含业务排序，不含 UI「当前」占位则后端可不返回） */
interface KeyTimelineNodeDto {
  /** 稳定键，与前端展示标签映射：shipment | eta | revised_eta | ata | discharge | last_pickup | pickup_actual | last_return | return_actual */
  milestoneKey: string;
  /** 该节点日期（YYYY-MM-DD），无则不出现在数组或 date 为 null */
  date: string | null;
  /** 是否存在「有效」下一业务环节（与现 getEffectiveHasNextNode 语义一致，后端单点实现） */
  hasNextEffective: boolean;
  /** 下一业务里程碑的日期（用于历时 = 下一节点 − 当前）；无则 null */
  nextMilestoneDate: string | null;
  /** 上一业务里程碑日期（历时兜底：当前 − 上一节点） */
  prevMilestoneDate: string | null;
  /** 展示模式：与 DurationDisplay auto 对齐 */
  displayMode: 'elapsed' | 'countdown' | 'overdue' | 'none';
  /** 是否关键节点（最晚提柜 / 最晚还箱），用于超期是否按标准天数标红 */
  isKeyNode: boolean;
  /** 与关键节点配套的标准小时数（可来自常量或后续字典，与前端 STANDARD_DURATIONS 对齐） */
  standardHours: number;
  /** 可选：结构化天数，便于联调；或只给文案由后端统一生成 */
  displayDays?: number;
  /** 可选：后端生成的展示短文案（前端可逐步改为纯展示） */
  displayText?: string;
}

interface KeyTimelineMetaDto {
  /** 与滞港费一致的 actual / forecast */
  calculationMode: 'actual' | 'forecast';
  /** 与 result.logisticsStatusSnapshot 一致时可省略，建议冗余一份便于前端单字段订阅 */
  arrivedAtDestinationPort: boolean;
  /** 日期顺序类提示，可与现有 dateOrderWarnings 合并或复用 */
  warnings?: string[];
}
```

**响应挂载方式（二选一，推荐 A）**

- **A（推荐，最小改动）**：`GET /api/v1/demurrage/calculate/:containerNumber` 的 `data` 增加  
  `keyTimeline?: { nodes: KeyTimelineNodeDto[]; meta: KeyTimelineMetaDto }`  
  计算失败或无数据时 `keyTimeline` 可省略，前端回退现有前端逻辑。

- **B**：新增 `GET /api/v1/containers/by-number/:containerNumber/key-timeline`  
  仅当希望**不拉滞港费也算时间线**时使用（多一次请求，二期可做）。

---

## 三、后端实现任务拆解

### Phase 0：契约

- [x] 在 `keyTimeline.ts` 中定义 DTO 与 `KeyTimelineMilestoneKey`（与 `KeyDatesTimeline` 节点顺序文档对齐）。
- [ ] 将「有效下一节点」规则写成**单一函数**（从现 `getEffectiveHasNextNode` 逻辑翻译为 TS，以 `calculationDates` + `Date` 比较为准）。

### Phase 1：计算管线

- [x] 在 `calculateForContainer` **成功路径**调用 `buildKeyTimeline(...)`。
- [x] `buildKeyTimeline` 输出：`KeyTimelineNodeDto[]`（`hasNextEffective`、`next/prev`、`displayMode`、`displayText` 与前端对齐）。
- [x] **不**调用物流路径微服务；**不**依赖 GraphQL。

### Phase 2：API 与类型

- [x] `DemurrageCalculationResult` 增加 `keyTimeline`。
- [x] `demurrage.controller` 随现有 JSON 响应输出（无需改控制器）。
- [x] 前端 `frontend/src/services/demurrage.ts` 增加对应 TypeScript 类型。

### Phase 3：前端消费

- [ ] `useContainerDetail`：从 `calculateForContainer` 读取 `keyTimeline`。
- [ ] `KeyDatesTimeline`：若 `keyTimeline?.nodes?.length`，则 **仅用后端字段** 渲染历时条（`displayText` 或 `displayMode` + 本地只负责样式）；否则 **fallback** 现有 `getEffectiveHasNextNode` + `DurationDisplay`。
- [ ] 联调清单：未到港 / 已到港、有/无实际提柜还箱、最晚提柜/还箱关键节点颜色。

### Phase 4：减负（可选）

- [ ] 前端删除与后端重复的 `getEffectiveHasNextNode` / `getNextBusinessNodeDate`（在确认 fallback 不再需要或仅测试环境保留）。
- [ ] 为 `buildKeyTimeline` 增加 **单元测试**（固定 `calculationDates` 输入 → 期望 `displayMode` / `hasNextEffective`）。

---

## 四、与 container 详情接口的关系

| 诉求 | 建议 |
|------|------|
| 详情页少一次请求 | **采用方案 A**，时间线随滞港费计算一并返回。 |
| 不展示滞港费也要时间线 | 二期：`getContainerById` 可选 `include_key_timeline=true` 内部调 `buildKeyTimeline`（共享 `getContainerMatchParams`）。 |
| 写回 / 统计 | **不变**；`saveCalculationToRecords` 仍只依赖现有 `DemurrageCalculationResult` 费用项。 |

---

## 五、物流路径微服务（可选）

- 路径 Tab 继续 `validatePath`；若需「路径与时间线是否一致」，可**仅**在路径 Tab 对比 `dateOrderWarnings` 与路径节点时间，**不**阻塞主流程。
- 配置 `logisticsPath` 不可用时：关键日期**不受影响**。

---

## 六、验收标准（最小）

1. 同一柜号：滞港费 `calculationMode` / `logisticsStatusSnapshot` 与 `keyTimeline.meta` 一致。  
2. 关键节点超期标色与现网 `DurationDisplay` + `STANDARD_DURATIONS` 行为一致（或文档说明 intentional 变更）。  
3. 关闭微服务或滞港费失败时：详情页关键日期仍可显示（fallback 或部分空状态提示）。

---

## 七、文档与索引

- 本文档：`14-TIMELINE_METRICS_MINIMAL_PLAN.md`  
- 关联：`08-DEMURRAGE_CALCULATION_MODES.md`、`01-DEMURRAGE_LOGIC_FROM_CONTAINER_SYSTEM.md`、`utils/logisticsStatusMachine`
