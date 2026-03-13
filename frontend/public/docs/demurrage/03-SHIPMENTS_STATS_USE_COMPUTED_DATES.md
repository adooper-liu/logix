# Shipments 统计卡片使用自动计算的最晚提柜日/最晚还箱日

## 一、现状

| 数据来源 | 最晚提柜日 | 最晚还箱日 |
|----------|------------|------------|
| **统计卡片**（按最晚提柜/按最晚还箱） | `process_port_operations.last_free_date` | `process_empty_return.last_return_date` |
| **列表行**（lastFreeDate / lastReturnDate） | `latestPortOperation.lastFreeDate` | `emptyReturn.lastReturnDate` |
| **滞港费详情** | 自动计算：起算日 + 免费天数（按标准） | 自动计算：用箱起算日 + 免费用箱天数 |

当 DB 无 `last_free_date` / `last_return_date` 时，统计卡片会归入「最晚提柜日为空」「最晚还箱日为空」，而滞港费详情可基于标准自动计算并展示。

---

## 一·二、写回终止条件（方案 B 补充）

**当有了实际提柜日、实际还箱日，就不再计算与回写。**

| 条件 | 不再写回 |
|------|----------|
| `process_trucking_transport.pickup_date` 有值 | 不再计算/写回最晚提柜日 |
| `process_empty_return.return_time` 有值 | 不再计算/写回最晚还箱日 |

理由：已提柜/已还箱后，最晚提柜日/最晚还箱日对业务无意义，且统计目标集已排除这些货柜。

## 二、实现方案对比

### 方案 A：每次统计时逐柜调用 demurrage 计算 ❌ 不推荐

- **做法**：LastPickupStatisticsService 对目标集中 `last_free_date` 为空的货柜，逐个调用 `demurrageService.calculateForContainer()` 取计算值，再按日期分类统计。
- **性能**：目标集可能有几十～几百个货柜，每个货柜需：匹配标准、多表查询、计算。统计接口会从几百 ms 变为数秒甚至更久。
- **结论**：会明显拖慢 Shipments 页加载，不推荐。

### 方案 B：写回库（推荐） ✅

- **做法**：在滞港费计算或同步时，若计算出 `lastPickupDateComputed` 且 DB 的 `last_free_date` 为空，则**写回** `process_port_operations.last_free_date`；最晚还箱日同理写回 `process_empty_return.last_return_date`。
- **触发时机**：
  1. 用户打开滞港费详情时（`calculateForContainer` 返回后，异步写回）
  2. 定时任务：对「last_free_date 为空且已到目的港」的货柜批量计算并写回
- **优点**：统计、列表、甘特图均沿用现有 SQL/逻辑，无需改动；性能无影响。
- **缺点**：需明确写回策略（仅系统计算、不覆盖人工维护等）。

### 方案 C：批量预计算 + 统计时合并

- **做法**：新增 `DemurrageService.batchComputeLastFreeDates(containerNumbers: string[])`，对一批货柜批量匹配标准并计算；LastPickupStatisticsService 在统计时，对 `last_free_date` 为空的子集调用该批量接口，在内存中合并后再分类统计。
- **优点**：可批量查标准、减少重复查询，比逐柜计算快。
- **缺点**：每次统计仍会触发批量计算，目标集大时仍有明显延迟；需在统计服务中引入 demurrage 依赖。

### 方案 D：SQL 层内联计算

- **做法**：在 LastPickupSubqueryTemplates 中，用 `COALESCE(po.last_free_date, 计算表达式)`，计算表达式需 JOIN `ext_demurrage_standards` 并按目的港、船公司、货代等匹配。
- **缺点**：标准匹配、免费天数基准（Natural/Working）在 SQL 中难以完整表达；一对多匹配、Working Days 公式复杂，维护成本高。

---

## 三、推荐实现：方案 B（写回库）

### 3.1 写回逻辑

1. **最晚提柜日**  
   - 条件：`process_port_operations.last_free_date IS NULL` 且 demurrage 计算出 `lastPickupDateComputed`  
   - 写回：更新对应目的港 `process_port_operations.last_free_date`  
   - 注意：取目的港最新一条港口操作（port_sequence 最大）

2. **最晚还箱日**  
   - 条件：`process_empty_return.last_return_date IS NULL` 且 demurrage 计算出 `lastReturnDateComputed`  
   - 写回：插入或更新 `process_empty_return` 的 `last_return_date`  
   - 注意：部分货柜可能尚无 `process_empty_return` 记录，需按业务决定是否新建

### 3.2 触发点

| 触发点 | 说明 |
|--------|------|
| 滞港费计算接口 | `calculateForContainer` 返回后，若计算值存在且 DB 为空，异步写回（不阻塞响应） |
| 定时任务（可选） | 每日对「last_free_date 为空且已到目的港」的货柜批量计算并写回 |

### 3.3 写回策略建议

- **不覆盖人工维护**：仅当 DB 值为空时写回；若 DB 已有值，以 DB 为准。
- **幂等**：同一货柜多次计算，结果一致时可重复写回。
- **可配置**：通过配置开关控制是否启用自动写回，便于灰度与回滚。

### 3.4 对统计卡片的影响

- 写回后，`LastPickupStatisticsService`、`LastReturnStatisticsService` 的 SQL 无需修改。
- 统计卡片、列表、甘特图会自然使用写回后的 `last_free_date` / `last_return_date`。
- 无写回时，行为与当前一致（归入「为空」分组）。

---

## 四、列表行 lastFreeDate / lastReturnDate

列表的 `lastFreeDate`、`lastReturnDate` 来自 `ContainerService.enrichContainersList`，直接读 `latestPortOperation.lastFreeDate`、`emptyReturn.lastReturnDate`。

- **若采用方案 B**：写回后，列表会自动展示计算值，无需改 enrich 逻辑。
- **若需「实时计算、不写回」**：在 enrich 时对空值调用 demurrage 计算并填充，会显著增加列表接口延迟，不推荐。

---

## 五、滞港费计算页面逻辑：是否需要改？会否值不一致？

### 5.1 当前数据来源差异

| 场景 | 最晚提柜日来源 | 最晚还箱日来源 |
|------|----------------|----------------|
| **统计/列表** | `process_port_operations.last_free_date` | `process_empty_return.last_return_date` |
| **滞港费计算**（getContainerMatchParams） | `process_trucking_transport.last_pickup_date` | 无（仅计算 lastReturnDateComputed） |

滞港费计算**不读** `process_port_operations.last_free_date`，只读 `process_trucking_transport.last_pickup_date`。若写回只写 `process_port_operations`，则统计/列表与滞港费详情可能**来源不同、值不一致**。

### 5.2 建议：滞港费计算也纳入 port_ops，统一口径

**修改 `getContainerMatchParams`**，使 `calculationDates.lastPickupDate` 的取值优先级为：

```
process_port_operations.last_free_date（destPort.lastFreeDate）
  ?? process_trucking_transport.last_pickup_date
  ?? computedLastFreeDate
```

这样：

1. **写回后**：统计、列表、滞港费详情都优先用 `process_port_operations.last_free_date`，三处一致。
2. **未写回时**：滞港费仍用 trucking 或计算值，行为与现有一致。
3. **滞港费页面逻辑**：`lastPickupDate` 的展示与计算继续用 `calculationDates.lastPickupDate`，无需改前端，只需后端统一取值来源。

### 5.3 最晚还箱日

- 统计/列表：`process_empty_return.last_return_date`
- 滞港费：目前只计算 `lastReturnDateComputed`，不读 DB
- 写回后：`process_empty_return.last_return_date` 有值，滞港费计算若需「DB 优先」可增加：`emptyReturn.lastReturnDate ?? computedLastReturnDate`，与写回值对齐。

### 5.4 小结

| 问题 | 建议 |
|------|------|
| 滞港费计算页面要不要改？ | **要改**：`getContainerMatchParams` 中 `lastPickupDate` 优先读 `process_port_operations.last_free_date` |
| 不改会不会值不一致？ | **会**：统计/列表用 port_ops，滞港费用 trucking，两套来源可能不同 |
| 改后是否一致？ | **是**：统一为 port_ops ?? trucking ?? 计算值，写回后三处一致 |

---

## 六、小结

| 问题 | 建议 |
|------|------|
| 统计卡片使用自动计算值 | 采用**写回库**：滞港费计算或定时任务写回 `last_free_date` / `last_return_date` |
| 写回终止条件 | 有实际提柜日、实际还箱日时，不再计算与回写 |
| 滞港费计算逻辑 | **需改**：`lastPickupDate` 优先读 `process_port_operations.last_free_date`，避免与统计/列表不一致 |
| 每次统计都计算是否影响性能 | **会**；不推荐在统计时实时计算，应通过写回库避免 |
| 列表行展示 | 写回后沿用现有逻辑即可，无需在 enrich 中实时计算 |

**实现状态（已完成）**：
- ① `getContainerMatchParams`：`lastPickupDate` 优先读 `process_port_operations.last_free_date`，`lastReturnDate` 优先读 `process_empty_return.last_return_date`
- ② `calculateForContainer`：计算完成后异步调用 `writeBackComputedDatesIfNeeded`，当无实际提柜/还箱且 DB 为空时写回
- ③ **定时任务**：`DemurrageWriteBackScheduler` 每 6 小时执行 `batchWriteBackComputedDates`，对「last_free_date 为空且已到目的港」「已提柜但 last_return_date 为空」的货柜批量计算并写回。可通过 `DEMURRAGE_WRITEBACK_SCHEDULER_INTERVAL` 环境变量配置间隔（分钟）。手动触发：`POST /api/v1/demurrage/batch-write-back`
