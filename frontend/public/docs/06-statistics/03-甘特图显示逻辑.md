# 甘特图显示逻辑梳理

本文档梳理货柜时间分布甘特图（`/shipments/gantt-chart`）的**显示逻辑**：数据从何而来、时间轴与泳道如何生成、每个格子里的「点」如何决定是否显示。

---

## 一、整体结构

```
GanttChart.vue（页面）
  ├── 加载货柜列表、计算/设置 displayRange
  └── ContainerGanttChart.vue（图表组件）
        props: containers, startDate, endDate
        ├── 泳道选择（按到港 / 按提柜计划 / 按最晚提柜 / 按最晚还箱）
        ├── 时间分组（timeGroups）= 当前泳道下的多行
        ├── 日期轴（dateArray）= 从 startDate 到 endDate 的逐日
        └── 每个格子 (group, date)：显示「属于该 group 且关键日期 = date」的货柜圆点
```

- **行**：当前泳道下的**时间分组**（如「今日到港」「已逾期到港」「3日内预计到港」…），一组一行，左侧有分组标签和数量。
- **列**：**日期**，由 `startDate`～`endDate` 逐日生成，与顶部日期头一一对应。
- **格子**：某行某列交点的单元格内，展示在该分组且**关键日期落在该日**的货柜，每个货柜一个圆点，悬停显示柜号与关键日期。

---

## 二、数据流

### 2.1 页面层（GanttChart.vue）

| 步骤 | 说明 |
|------|------|
| **初始日期** | `loadDataDateRange`：优先从 `route.query.startDate/endDate` 解析，否则默认「过去 90 天～今天」（与 Shipments 出运日期一致）。 |
| **请求数据** | 若有 `route.query.filterCondition` 则 `getContainersByFilterCondition`，否则 `getContainers`（同一出运日期范围）；若有 `route.query.containers` 则在前端按柜号再过滤。 |
| **显示范围** | `displayRange`：首次加载后由 `calculateDisplayRange(containers, 'arrival')` 算出（取当前货柜在「按到港」维度下的最早/最晚关键日期）；用户切换泳道时改为 `calculateDisplayRange(containers, dimension)` 更新。 |
| **传给图表** | `containers`、`displayRange[0]`（startDate）、`displayRange[1]`（endDate）传给 `ContainerGanttChart`。用户可通过顶部日期选择器修改 `displayRange`。 |

即：**数据** = 同一套后端接口（与 Shipments 共用）；**显示区间** = 由数据与当前泳道算出的默认范围，用户可改。

### 2.2 图表层（ContainerGanttChart.vue）

| 输入 | 说明 |
|------|------|
| **containers** | 当前页已加载的货柜列表（enrich 后，含 portOperations、truckingTransports、emptyReturns 等）。 |
| **startDate / endDate** | 时间轴左右边界（= 页面的 displayRange）。 |

内部不再请求接口，只在这批 `containers` 上做分组与按日展示。

---

## 三、泳道与时间分组

### 3.1 泳道（Lane）

- **定义**：`config/containerDimensions.ts` 中的 `LANE_CONFIGS`（按到港、按提柜计划、按最晚提柜、按最晚还箱）。
- **当前选中**：`selectedLaneName`，存于 localStorage（`ganttSelectedLaneName`），刷新后保持。
- **作用**：决定下面「时间分组」的行标签与每行包含哪些货柜；同时通过 `laneChange` 通知页面重算 `displayRange`（按该维度的关键日期范围）。

### 3.2 时间分组（TimeGroup = 行）

- **来源**：`useGanttData.ts` 的 `useTimeGroups(containers, startDate, endDate, selectedLane)`。
- **逻辑**：按当前泳道从 `containerDimensions` 取该泳道的维度数组（如 `ARRIVAL_DIMENSIONS`），为每个维度生成一个 **TimeGroup**：
  - `label`：展示名（如「今日到港」「已逾期到港」）；
  - `startDate / endDate`：该组在时间轴上的理论区间（用于分组区间展示，与「是否落入该组」的判定在过滤层做）；
  - `count`：`getGroupContainersSubset(containers, laneName, group.label).length`，即属于该组的货柜数；
  - `color`：该行圆点颜色。
- **行顺序**：与维度数组顺序一致（如按到港：已逾期未到港 → 今日到港 → … → 其他记录）。

---

## 四、日期轴（列）

- **计算**：`useDateRange(startDate, endDate)` 得到 `{ start, end, days }`，`useDateArray(dateRange)` 得到长度为 `days` 的日期数组，逐日为列。
- **表头**：与 `dateArray` 一一对应，每格显示 `formatDateLabel(date)`（MM-DD），周末可加样式（如 `weekend` class）。
- **横向滚动**：日期头与各泳道行联动滚动（`headerTimelineRef` 与 `laneTimelines` 同步 scrollLeft）。

---

## 五、格子内「谁显示」：从货柜到圆点

每个格子对应一个 **(时间分组, 日期)**，即 (group, date)。显示逻辑两步：

### 5.1 第一步：该分组下有哪些货柜（带关键日期）

- **方法**：`getGroupContainersSubset(containers, selectedLane.name, group.label)`（实现在 `useGanttFilters.ts`）。
- **含义**：按当前泳道 + 该行标签，用与 Shipments 统计卡片一致的规则筛出属于该组的货柜；同时为每个货柜算出一个 **extractedDate**（该泳道下的「关键日期」）：
  - **按到港**：有 ATA 用 ATA，否则用 ETA（与 getArrivalSubset 内逻辑一致）；「其他记录」无 ETA/ATA 则 extractedDate 为 null。
  - **按提柜计划**：firstTrucking.plannedPickupDate；待安排等无计划日的为 null。
  - **按最晚提柜**：目的港 lastFreeDate；最晚提柜日为空为 null。
  - **按最晚还箱**：emptyReturn.lastReturnDate；最后还箱日为空为 null。

### 5.2 第二步：关键日期是否等于当前列日期

- **方法**：`getGroupContainers(subset, date)`（`useGanttFilters.ts`）。
- **含义**：在第一步得到的 subset 中，筛出 `dayjs(item.extractedDate).isSame(targetDate, 'day')` 的货柜。
- **渲染**：每个筛出的货柜在该格子内画一个圆点（`container-dot`），颜色为当前分组的 `group.color`；tooltip 显示柜号 + `extractDateFromContainer(container, selectedLane.dateField)` 格式化后的关键日期。

因此：**同一货柜只会在「其所属分组」的那一行、且「关键日期等于该日」的那一列出现一个点**；若 extractedDate 为 null（如「其他记录」「待安排」「最晚提柜日为空」），则不会出现在任何日期列，但仍计入该行 count。

---

## 六、关键文件与职责

| 文件 | 职责 |
|------|------|
| **views/gantt/GanttChart.vue** | 路由/query 解析、请求货柜、计算/更新 displayRange、将 containers + startDate/endDate 传给子组件；切换泳道时按维度重算 displayRange。 |
| **components/common/ContainerGanttChart.vue** | 接收 containers + 起止日期；泳道选择、日期轴与时间分组生成；表格行/列与格子内圆点渲染；滚动联动。 |
| **config/containerDimensions.ts** | 四泳道配置（名称、副标题、dateField、颜色）、各泳道维度列表（label/key/color），与 Shipments 卡片口径一致。 |
| **composables/useGanttData.ts** | 根据 start/end 与 selectedLane 生成 dateRange、dateArray、timeGroups（含每行 count）。 |
| **composables/useGanttFilters.ts** | 按 (laneName, groupLabel) 筛出该组货柜并打上 extractedDate（与后端统计口径一致）；getGroupContainers(subset, date) 按日过滤。 |
| **composables/useGanttHelpers.ts** | getRemainingTime、formatDateLabel、formatFullDate、extractDateFromContainer（从 container/portOperations/trucking/emptyReturn 取日期）。 |
| **types/ganttChart.ts** | LaneConfig、ContainerItem、TimeGroup、RemainingTime 等类型。 |

---

## 七、显示逻辑小结（一问一答）

| 问题 | 答案 |
|------|------|
| 数据从哪来？ | 与 Shipments 共用接口（getContainers / getContainersByFilterCondition），按出运日期或 filterCondition 拉列表；可选按 route.query.containers 再过滤。 |
| 横轴日期从哪来？ | 由页面的 displayRange（startDate～endDate）逐日生成；displayRange 默认由当前货柜在当前泳道下的关键日期范围算出，用户可改。 |
| 纵轴行从哪来？ | 当前选中的泳道对应的「时间分组」列表（如按到港 8 行、按提柜计划 5 行），来自 containerDimensions，每行带 label、color、count。 |
| 某格子为什么有/没有点？ | 先按 (泳道, 行标签) 筛出属于该行的货柜并赋予 extractedDate；再在该子集中筛 extractedDate 等于该列日期的货柜；一个货柜一个点。 |
| 行上的数量 (n) 是什么？ | 该分组下货柜总数（getGroupContainersSubset(..., group.label).length），包含无日期的（如「其他记录」），无日期的不会出现在任何列格子里。 |
| 切换泳道为什么时间轴会变？ | 页面监听 laneChange，用新维度重算 displayRange（calculateDisplayRange(containers, dimension)），再传给图表，所以 startDate/endDate 变化，列范围随之变化。 |

---

*与《甘特图四泳道与 Shipments 统计卡片子集逻辑对比》配合使用：分组子集逻辑见对比文档，本页侧重「如何画出来」的显示流程。*
