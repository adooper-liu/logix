# 货柜列表重构最终方案与实现细节

> 基于实际代码库，无虚构 API 或方法。

---

## 一、方案目标

将 `getContainers` 中分散的查询构建逻辑抽取到 `ContainerQueryBuilder.createListQuery` 和 `ContainerDataService.getContainersForList`，减少重复代码，保持 API 行为不变。

---

## 二、涉及文件与当前状态

| 文件 | 状态 | 说明 |
|------|------|------|
| `backend/src/services/statistics/common/ContainerQueryBuilder.ts` | ✅ 已实现 | 已新增 `createListQuery` |
| `backend/src/services/ContainerDataService.ts` | ✅ 已实现 | 已存在，含 `getContainersForList` |
| `backend/src/controllers/container.controller.ts` | ⚠️ 部分完成 | 已注入 `containerDataService`，但 `getContainers` 仍使用旧实现 |

---

## 三、实现细节（与现有代码一致）

### 3.1 ContainerQueryBuilder.createListQuery

**位置**：`backend/src/services/statistics/common/ContainerQueryBuilder.ts` 第 33-66 行

**要点**：
- 不使用 `DateFilterBuilder.createBaseQuery`（因其对 seaFreight 使用 `leftJoin`，enrich 需要加载 seaFreight）
- 显式构建查询，对 seaFreight 使用 `leftJoinAndSelect`
- 调用 `DateFilterBuilder.addCountryFilters(qb)` 应用国家过滤
- 使用实体属性名：`container.containerNumber`、`order.orderNumber`、`order.actualShipDate`、`sf.shipmentDate`、`container.updatedAt`

**逻辑与当前 getContainers 完全一致**：
- 搜索：`containerNumber` 或 `orderNumber` 模糊匹配
- 日期：`startDate`、`endDate` 分别应用，支持仅传其一
- `endDate` 设为当天 23:59:59.999

### 3.2 ContainerDataService.getContainersForList

**位置**：`backend/src/services/ContainerDataService.ts` 第 35-45 行

**入参**：`ListParams { page, pageSize, search?, startDate?, endDate? }`

**流程**：
1. `ContainerQueryBuilder.createListQuery(repository, params)`
2. `qb.skip/take.getManyAndCount()`
3. `containerService.enrichContainersList(containers)`
4. 返回 `{ items, total }`

### 3.3 getContainers 改造（待完成）

**位置**：`backend/src/controllers/container.controller.ts` 第 166-267 行

**改造方式**：用 `containerDataService.getContainersForList` 替代当前内联实现。

**fallback 逻辑**：当 `startDate && endDate && result.total === 0` 时，再调一次 `getContainersForList`，不传 `startDate`、`endDate`，用返回结果覆盖 `result.items` 和 `result.total`。

---

## 四、getContainers 替换后的完整实现

```typescript
getContainers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = 1, pageSize = 10, search = '', startDate, endDate } = req.query;

    logger.info('[getContainers] Query params:', { page, pageSize, search, startDate, endDate });

    const result = await this.containerDataService.getContainersForList({
      page: Number(page),
      pageSize: Number(pageSize),
      search: String(search),
      startDate: startDate as string,
      endDate: endDate as string
    });

    let dateFilterFallback = false;

    if (startDate && endDate && result.total === 0) {
      dateFilterFallback = true;
      const fallbackResult = await this.containerDataService.getContainersForList({
        page: Number(page),
        pageSize: Number(pageSize),
        search: String(search)
      });
      result.items = fallbackResult.items;
      result.total = fallbackResult.total;
      logger.info(`[getContainers] Date range had no matches, fallback to all: ${result.total} containers`);
    }

    logger.info(`[getContainers] Found ${result.items.length} containers, total: ${result.total}`);

    res.json({
      success: true,
      dateFilterFallback: dateFilterFallback || undefined,
      items: result.items,
      pagination: {
        page: Number(page),
        pageSize: Number(pageSize),
        total: result.total,
        totalPages: Math.ceil(result.total / Number(pageSize))
      }
    });

    logger.info(`Retrieved ${result.items.length} containers`);
  } catch (error) {
    logger.error('Failed to get containers', error);
    res.status(500).json({
      success: false,
      message: '获取货柜列表失败'
    });
  }
};
```

---

## 五、不修改的部分

| 接口/逻辑 | 说明 |
|-----------|------|
| `getContainersByFilterCondition` | 使用 `statisticsService.getContainersByCondition`，逻辑不同，保持现状 |
| `getContainerById` | 详情接口，不在此次重构范围 |
| `getContainerListRow` | 使用 `containerService.getListRowByContainerNumber`，不修改 |
| `enrichContainersList` | 现有方法，不修改 |

---

## 六、可选方法（当前无调用方）

`ContainerDataService` 中的 `getContainersForStats`、`getContainerDetail` 已实现，但 Controller 中暂无调用。可保留供后续统计/详情接口使用。

---

## 七、验证清单

实施后需验证：

- [ ] 列表分页、搜索、日期筛选结果与改造前一致
- [ ] 国家过滤（依赖请求上下文）正常
- [ ] `dateFilterFallback` 在日期无匹配时正确触发
- [ ] enrich 结果正确（destinationPort、billOfLadingNumber、supplierNames 等）
- [ ] API 响应结构不变：`{ success, items, pagination, dateFilterFallback? }`

---

## 八、剩余工作

仅需在 `container.controller.ts` 中将 `getContainers` 方法体（第 167-266 行）替换为第四节中的实现。
