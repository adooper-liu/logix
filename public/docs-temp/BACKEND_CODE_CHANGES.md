# 后端代码修改总结

## 已完成的修改

### 1. frontend/src/components/common/composables/useGanttFilters.ts
- ✅ 将"今日之前到港"细分为两个子维度
- ✅ 将"已逾期提柜"改为"逾期未提柜"
- ✅ 删除"今日实际提柜"子维度

### 2. frontend/src/views/shipments/Shipments.vue
- ✅ 更新按到港过滤逻辑，支持"今日之前到港未提柜"和"今日之前到港已提柜"
- ✅ 更新标签映射（getFilterLabel函数）

### 3. backend/src/services/containerStatistics.service.ts
- ✅ 更新getArrivalDistribution方法，使用两个新方法替换getArrivedBeforeToday
- ✅ 更新getPickupDistribution方法，删除todayActual相关代码
- ⚠️ 需要添加两个新方法：getArrivedBeforeTodayNotPickedUp 和 getArrivedBeforeTodayPickedUp

## 待完成的修改

### 需要添加的新方法（在getArrivedToday之后）

```typescript
/**
 * 2. 今日之前到港未提柜：目的港ATA < today，状态在目标集内，且未提柜/未卸柜/未还箱
 * 注意：如果一个货柜有多条目的港记录，只统计最近一次到港的
 */
private async getArrivedBeforeTodayNotPickedUp(today: Date, targetStatuses: string[], startDate?: string, endDate?: string): Promise<number> {
  const query = this.containerRepository
    .createQueryBuilder('container')
    .leftJoin('container.order', 'order')
    .leftJoin('container.seaFreight', 'sf')
    .select('COUNT(DISTINCT container.containerNumber)', 'count')
    .innerJoin(
      `(
        SELECT po1.container_number, MAX(po1.ata_dest_port) as latest_ata
        FROM process_port_operations po1
        WHERE po1.port_type = 'destination'
        AND po1.ata_dest_port IS NOT NULL
        GROUP BY po1.container_number
      )`,
      'latest_po',
      'latest_po.container_number = container.containerNumber'
    )
    .where('container.logisticsStatus IN (:...targetStatuses)', { targetStatuses })
    .andWhere('DATE(latest_po.latest_ata) < :today', { today })
    .andWhere('container.logisticsStatus NOT IN (:...excludedStatuses)', { excludedStatuses: ['picked_up', 'unloaded', 'returned_empty'] });

  if (startDate) {
    query.andWhere('(order.actualShipDate >= :startDate OR (order.actualShipDate IS NULL AND sf.shipmentDate >= :startDate))', { startDate: new Date(startDate) })
  }
  if (endDate) {
    const endDateObj = new Date(endDate)
    endDateObj.setHours(23, 59, 59, 999)
    query.andWhere('(order.actualShipDate <= :endDate OR (order.actualShipDate IS NULL AND sf.shipmentDate <= :endDate))', { endDate: endDateObj })
  }

  const result = await query.getRawOne();

  return parseInt(result.count);
}

/**
 * 2.1 今日之前到港已提柜：目的港ATA < today，状态在目标集内，且已提柜/已卸柜/已还箱
 * 注意：如果一个货柜有多条目的港记录，只统计最近一次到港的
 */
private async getArrivedBeforeTodayPickedUp(today: Date, targetStatuses: string[], startDate?: string, endDate?: string): Promise<number> {
  const query = this.containerRepository
    .createQueryBuilder('container')
    .leftJoin('container.order', 'order')
    .leftJoin('container.seaFreight', 'sf')
    .select('COUNT(DISTINCT container.containerNumber)', 'count')
    .innerJoin(
      `(
        SELECT po1.container_number, MAX(po1.ata_dest_port) as latest_ata
        FROM process_port_operations po1
        WHERE po1.port_type = 'destination'
        AND po1.ata_dest_port IS NOT NULL
        GROUP BY po1.container_number
      )`,
      'latest_po',
      'latest_po.container_number = container.containerNumber'
    )
    .where('container.logisticsStatus IN (:...targetStatuses)', { targetStatuses })
    .andWhere('DATE(latest_po.latest_ata) < :today', { today })
    .andWhere('container.logisticsStatus IN (:...includedStatuses)', { includedStatuses: ['picked_up', 'unloaded', 'returned_empty'] });

  if (startDate) {
    query.andWhere('(order.actualShipDate >= :startDate OR (order.actualShipDate IS NULL AND sf.shipmentDate >= :startDate))', { startDate: new Date(startDate) })
  }
  if (endDate) {
    const endDateObj = new Date(endDate)
    endDateObj.setHours(23, 59, 59, 999)
    query.andWhere('(order.actualShipDate <= :endDate OR (order.actualShipDate IS NULL AND sf.shipmentDate <= :endDate))', { endDate: endDateObj })
  }

  const result = await query.getRawOne();

  return parseInt(result.count);
}
```

### 需要删除的旧方法
删除 `getArrivedBeforeToday` 方法（第344-376行）

### 需要删除的旧方法
删除 `getTodayActual` 方法（第611-621行）

## 前端界面修改

前端界面需要根据新的子维度名称进行展示。需要检查并更新：
1. CountdownCard组件的显示逻辑
2. 倒计时卡片点击时的过滤条件名称
