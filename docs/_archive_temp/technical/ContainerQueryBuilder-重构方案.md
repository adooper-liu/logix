# ContainerQueryBuilder 重构方案

## 一、背景与目标

### 1.1 当前实现问题

1. **代码重复**：`getContainers` 方法在 `container.controller.ts` 中内联实现，与 `ContainerDataService.getContainersForList()` 逻辑重复

2. **维护困难**：查询逻辑分散在多个文件中

### 1.2 重构目标

1. **统一查询逻辑**：列表使用 `ContainerDataService.getContainersForList()`
2. **消除重复代码**：将 `getContainers` 改造为调用 `ContainerDataService`
3. **保持功能一致**：保留日期筛选回退逻辑

---

## 二、现有代码验证

### 2.1 已存在的正确实现

#### ContainerQueryBuilder.createListQuery()

```typescript
// 位置: backend/src/services/statistics/common/ContainerQueryBuilder.ts (第32-66行)

static createListQuery(
  containerRepository: any,
  params: { search?: string; startDate?: string; endDate?: string }
): SelectQueryBuilder<any> {
  const qb = containerRepository
    .createQueryBuilder('container')
    .leftJoin('container.replenishmentOrders', 'order')
    .leftJoinAndSelect('container.seaFreight', 'sf');

  DateFilterBuilder.addCountryFilters(qb);

  if (params.search) {
    qb.andWhere(
      'container.containerNumber ILIKE :search OR order.orderNumber ILIKE :search',
      { search: `%${params.search}%` }
    );
  }

  if (params.startDate) {
    qb.andWhere(
      '(order.actualShipDate >= :startDate OR (order.actualShipDate IS NULL AND sf.shipmentDate >= :startDate))',
      { startDate: new Date(params.startDate) }
    );
  }
  if (params.endDate) {
    const end = new Date(params.endDate);
    end.setHours(23, 59, 59, 999);
    qb.andWhere(
      '(order.actualShipDate <= :endDate OR (order.actualShipDate IS NULL AND sf.shipmentDate <= :endDate))',
      { endDate: end }
    );
  }

  return qb.orderBy('container.updatedAt', 'DESC');
}
```

#### ContainerDataService

```typescript
// 位置: backend/src/services/ContainerDataService.ts

export class ContainerDataService {
  constructor(
    private containerRepository: Repository<Container>,
    private containerService: ContainerService
  ) {}

  async getContainersForList(params: ListParams) {
    const qb = ContainerQueryBuilder.createListQuery(this.containerRepository, params);
    
    const [containers, total] = await qb
      .skip((params.page - 1) * params.pageSize)
      .take(params.pageSize)
      .getManyAndCount();
    
    const enriched = await this.containerService.enrichContainersList(containers);
    return { items: enriched, total };
  }

  async getContainersForStats(params: StatsParams) {
    const qb = ContainerQueryBuilder.createListQuery(this.containerRepository, params);
    const containers = await qb.getMany();
    const enriched = await this.containerService.enrichContainersList(containers);
    return enriched;
  }

  async getContainerDetail(containerNumber: string) {
    const container = await this.containerRepository.findOne({
      where: { containerNumber },
      relations: ['seaFreight', 'replenishmentOrders']
    });
    
    if (!container) return null;
    const [enriched] = await this.containerService.enrichContainersList([container]);
    return enriched;
  }
}
```

### 2.2 待改造代码

#### getContainers 方法（container.controller.ts 第172-246行）

```typescript
// 当前实现：内联查询逻辑，未使用 ContainerDataService
getContainers = async (req: Request, res: Response): Promise<void> => {
  const { page = 1, pageSize = 10, search = '', startDate, endDate } = req.query;

  // 内联实现，与 ContainerQueryBuilder.createListQuery 重复
  const queryBuilder = this.containerRepository
    .createQueryBuilder('container')
    .leftJoin('container.replenishmentOrders', 'order')
    .leftJoinAndSelect('container.seaFreight', 'sf');

  // ... 日期筛选逻辑（与 createListQuery 一致）

  // 日期回退逻辑
  if (startDate && endDate && total === 0) {
    // 重新查询全部
  }

  // enrich
  const enriched = await this.containerService.enrichContainersList(items);
  // 返回
};
```

---

## 三、重构方案

### 3.1 改造目标

将 `container.controller.ts` 中的 `getContainers` 方法改造为使用 `ContainerDataService.getContainersForList()`。

### 3.2 改造步骤

#### 步骤1：在 ContainerDataService 中添加日期回退支持

```typescript
// backend/src/services/ContainerDataService.ts

interface ListParams {
  page: number;
  pageSize: number;
  search?: string;
  startDate?: string;
  endDate?: string;
}

export class ContainerDataService {
  // ... 现有代码

  /**
   * 获取货柜列表（用于列表页面）
   * @param enableFallback 当日期筛选结果为0时，是否回退为全部货柜
   */
  async getContainersForList(params: ListParams, enableFallback: boolean = false) {
    const qb = ContainerQueryBuilder.createListQuery(this.containerRepository, params);
    
    const [containers, total] = await qb
      .skip((params.page - 1) * params.pageSize)
      .take(params.pageSize)
      .getManyAndCount();

    // 日期回退逻辑：当传了日期且结果为0时，回退为全部货柜
    if (enableFallback && params.startDate && params.endDate && total === 0) {
      const fallbackParams = { ...params, startDate: undefined, endDate: undefined };
      const fallbackQb = ContainerQueryBuilder.createListQuery(this.containerRepository, fallbackParams);
      
      const [fallbackContainers, fallbackTotal] = await fallbackQb
        .skip((params.page - 1) * params.pageSize)
        .take(params.pageSize)
        .getManyAndCount();
      
      const enriched = await this.containerService.enrichContainersList(fallbackContainers);
      return { items: enriched, total: fallbackTotal, fallback: true };
    }

    const enriched = await this.containerService.enrichContainersList(containers);
    return { items: enriched, total, fallback: false };
  }
}
```

#### 步骤2：改造 getContainers 调用

```typescript
// backend/src/controllers/container.controller.ts

// 注入 ContainerDataService（在构造函数中）
constructor(
  // ... 其他依赖
  private containerDataService: ContainerDataService
) {}

// 改造 getContainers 方法
getContainers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = 1, pageSize = 10, search = '', startDate, endDate } = req.query;

    logger.info('[getContainers] Query params:', { page, pageSize, search, startDate, endDate });

    // 使用 ContainerDataService
    const result = await this.containerDataService.getContainersForList(
      {
        page: Number(page),
        pageSize: Number(pageSize),
        search: search as string,
        startDate: startDate as string,
        endDate: endDate as string
      },
      true // 启用日期回退
    );

    logger.info(`[getContainers] Found ${result.items.length} containers, total: ${result.total}, fallback: ${result.fallback}`);

    res.json({
      items: result.items,
      total: result.total,
      page: Number(page),
      pageSize: Number(pageSize)
    });
  } catch (error) {
    logger.error('[getContainers] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
```

---

## 四、实施检查清单

- [ ] 修改 `ContainerDataService.getContainersForList()` 支持日期回退参数
- [ ] 在 `ContainerController` 构造函数中注入 `ContainerDataService`
- [ ] 改造 `getContainers` 方法调用 `containerDataService.getContainersForList()`
- [ ] 验证改造前后数据一致性
- [ ] 验证日期回退逻辑正常工作

---

## 五、字段验证

| 字段 | TypeORM | 数据库 | 验证 |
|------|---------|--------|------|
| containerNumber | containerNumber | container_number | ✅ |
| order.actualShipDate | actualShipDate | actual_ship_date | ✅ |
| sf.shipmentDate | shipmentDate | shipment_date | ✅ |
| seaFreight | seaFreight | process_sea_freight | ✅ |
| updatedAt | updatedAt | updated_at | ✅ |

---

## 六、结论

**现状：**
- `ContainerQueryBuilder.createListQuery()` ✅ 已实现
- `ContainerDataService.getContainersForList()` ✅ 已实现
- `getContainers` ❌ 仍使用内联实现

**改造：**
仅需将 `getContainers` 改造为调用 `ContainerDataService.getContainersForList()`，保留日期回退逻辑。
