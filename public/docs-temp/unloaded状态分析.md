# unloaded状态分析

## 📊 数据分析结果

### 1. 当前状态分布
| 状态 | 数量 |
|------|------|
| at_port | 92 |
| in_transit | 85 |
| picked_up | 54 |
| returned_empty | 119 |
| **unloaded** | **0** ❌ |

### 2. 仓库操作表数据分析

| 字段 | 记录数 | 说明 |
|------|--------|------|
| `unload_date` | 0 | ❌ 完全没有卸柜记录 |
| `warehouse_arrival_date` | 131 | ✅ 有仓库到达记录 |
| `wms_confirm_date` | 132 | ✅ 有WMS确认记录 |

### 3. 问题分析

**为什么没有unloaded状态？**

根据数据：
1. ✅ 有131条货柜已经到达仓库（`warehouse_arrival_date`有值）
2. ✅ 有132条货柜已经WMS确认（`wms_confirm_date`有值）
3. ❌ 但没有任何货柜有卸柜记录（`unload_date`为空）

**结论**：
- 业务流程中**记录了仓库到达和WMS确认**
- 但**没有记录卸柜操作**（`unload_date`）
- 因此状态没有从`picked_up`更新为`unloaded`
- 直接从`picked_up`跳到了`returned_empty`

## 🔍 卸柜记录的判断依据

根据业务需求，"已卸柜"的判断应该是：

### 选项1：基于unload_date（推荐）
```sql
-- 最准确：有实际的卸柜时间记录
WHERE wo.unload_date IS NOT NULL
```

### 选项2：基于warehouse_arrival_date
```sql
-- 替代方案：货柜已到达仓库
WHERE wo.warehouse_arrival_date IS NOT NULL
```

### 选项3：基于wms_confirm_date
```sql
-- 替代方案：WMS已确认
WHERE wo.wms_confirm_date IS NOT NULL
```

## 🎯 状态判断逻辑（修正版）

```typescript
function determineStatus(containerNumber: string): string {
  // 1. 已还箱
  if (hasReturnTime(containerNumber)) return 'returned_empty';

  // 2. 已卸柜（使用unload_date）
  if (hasUnloadDate(containerNumber)) return 'unloaded';

  // 3. 已提柜
  if (hasPickupDate(containerNumber)) return 'picked_up';

  // 4. 已到港（包括中转港和目的港）
  if (hasArrivedAtTransit(containerNumber) || hasArrivedAtDestination(containerNumber)) {
    return 'at_port';
  }

  // 5. 在途
  if (hasShipmentDate(containerNumber)) return 'in_transit';

  // 6. 未出运
  return 'not_shipped';
}

function hasUnloadDate(containerNumber: string): boolean {
  return await this.warehouseOperationRepository.exists({
    where: {
      containerNumber,
      unloadDate: Not(IsNull())
    }
  });
}
```

## 📝 建议

### 短期方案（推荐）

**使用`unload_date`判断unloaded状态**：
- 严格遵循业务定义
- 当前数据中没有unload_date记录，所以没有unloaded状态是正常的
- 未来如果有卸柜记录，状态会自动更新

### 长期方案

**完善卸柜记录流程**：
1. 在仓库操作中记录实际的卸柜时间（`unload_date`）
2. 创建卸柜记录时自动更新状态为`unloaded`
3. 这样可以更准确地跟踪货柜流转

## ❓ 需要确认的问题

1. **卸柜记录的创建时机**：
   - 是在货柜到达仓库时自动创建？
   - 还是需要人工手动记录？
   - 还是集成WMS系统自动同步？

2. **如果没有卸柜记录**：
   - 业务上是否允许从`picked_up`直接跳到`returned_empty`？
   - 还是应该补充卸柜记录后再更新状态？

3. **"按最晚还箱日"是否包含unloaded状态**：
   - 如果包含，目标集应该是`picked_up OR unloaded`
   - 如果不包含，只统计`picked_up`状态

## 🔧 需要修改的内容

### 1. ContainerStatusService
```typescript
function determineStatus(containerNumber: string): string {
  if (hasReturnTime(containerNumber)) return 'returned_empty';
  if (hasUnloadDate(containerNumber)) return 'unloaded'; // 添加这个判断
  if (hasPickupDate(containerNumber)) return 'picked_up';
  if (hasArrivedAtTransit(containerNumber) || hasArrivedAtDestination(containerNumber)) {
    return 'at_port';
  }
  if (hasShipmentDate(containerNumber)) return 'in_transit';
  return 'not_shipped';
}
```

### 2. WarehouseOperationService
```typescript
async createWarehouseOperation(data: CreateWarehouseOperationDto): Promise<WarehouseOperation> {
  const operation = await this.warehouseOperationRepository.save(data);

  // 自动更新货柜状态
  if (data.unloadDate) {
    await this.containerStatusService.updateStatus(data.containerNumber);
  }

  return operation;
}
```

### 3. LastReturnStatistics.service.ts（"按最晚还箱日"）
```typescript
private filterTargetSet(query: SelectQueryBuilder<Container>): SelectQueryBuilder<Container> {
  // 统计picked_up和unloaded状态
  return query.where(
    'container.logisticsStatus IN (:...statuses)',
    { statuses: ['picked_up', 'unloaded'] }
  );
}
```

**现在可以确认"按最晚还箱日"的目标集是`picked_up OR unloaded`吗？**
