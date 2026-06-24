# LogiX 状态机定义

## 7层简化状态（优先级从高到低）

```typescript
// backend/src/utils/logisticsStatusMachine.ts
export function calculateLogisticsStatus(container: Container): string {
  // 1. 还空箱（最高优先级）
  if (container.emptyReturn?.returnTime) {
    return 'returned_empty';
  }
  
  // 2. WMS卸柜确认
  if (container.wmsConfirmDate) {
    return 'unloaded';
  }
  
  // 3. 提柜完成
  if (container.truckingTransport?.pickupDate) {
    return 'picked_up';
  }
  
  // 4. 目的港实际到港(ATA)
  if (container.portOperations?.ataDestPort) {
    return 'at_port';
  }
  
  // 5. 中转港到港或进闸
  if (container.transitPortAta || container.gateInTime) {
    return 'in_transit';
  }
  
  // 6. 海运出运
  if (container.seaFreight?.shipmentDate) {
    return 'shipped';
  }
  
  // 7. 未出运（默认状态）
  return 'not_shipped';
}
```

---

## 状态流转图

```
not_shipped (未出运)
    ↓ shipment_date 设置
shipped (海运中)
    ↓ ata_dest_port 设置
at_port (已到港)
    ↓ pickup_date 设置
picked_up (已提柜)
    ↓ wms_confirm_date 设置
unloaded (已卸柜)
    ↓ return_time 设置
returned_empty (已还空) [终态]
```

**注意**：
- `in_transit`是中间状态，可能被跳过
- 状态判断基于**数据存在性**，不依赖时间顺序
- 高优先级状态会覆盖低优先级状态

---

## 状态与费用计算的关联

### returned_empty → 触发滞港费计算
```typescript
// 还空箱时自动计算滞港费
if (status === 'returned_empty') {
  const demurrage = await DemurrageService.calculate(containerNumber);
  await updateDemurrageAmount(demurrage);
}
```

### at_port → 启动滞港费预警
```typescript
// 到港后开始监控last_free_date
if (status === 'at_port' && lastFreeDate) {
  const daysRemaining = calculateDaysUntil(lastFreeDate);
  if (daysRemaining <= 3) {
    triggerAlert('URGENT_DEMURRAGE');
  }
}
```

### picked_up → 停止滞港费计时
```typescript
// 提柜后不再产生滞港费
if (status === 'picked_up') {
  stopDemurrageTimer(containerNumber);
}
```

---

## ext_container_alerts 预警规则

### 预警类型
| 预警类型 | 触发条件 | 优先级 |
|---------|---------|--------|
| DEMURRAGE_EXPIRED | 已过最晚免费日期 | Critical |
| DEMURRAGE_URGENT | 距最晚免费日期≤3天 | High |
| DEMURRAGE_WARNING | 距最晚免费日期≤7天 | Medium |
| NO_LAST_FREE_DATE | 缺少last_free_date | Low |

### 预警生成逻辑
```typescript
async function generateAlerts(container: Container): Promise<Alert[]> {
  const alerts: Alert[] = [];
  
  if (!container.lastFreeDate) {
    alerts.push({ type: 'NO_LAST_FREE_DATE', severity: 'low' });
    return alerts;
  }
  
  const now = new Date();
  const lfd = new Date(container.lastFreeDate);
  const daysDiff = Math.ceil((lfd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysDiff < 0) {
    alerts.push({ type: 'DEMURRAGE_EXPIRED', severity: 'critical' });
  } else if (daysDiff <= 3) {
    alerts.push({ type: 'DEMURRAGE_URGENT', severity: 'high' });
  } else if (daysDiff <= 7) {
    alerts.push({ type: 'DEMURRAGE_WARNING', severity: 'medium' });
  }
  
  return alerts;
}
```

---

## 状态更新时机

### 自动更新（飞驼API触发）
```typescript
// FeiTuoAdapter同步后自动重算状态
async function syncFeiTuoData(containerNumber: string) {
  const events = await fetchFeiTuoEvents(containerNumber);
  await saveToExtContainerStatusEvents(events);
  
  // 更新process_port_operations
  await updatePortOperations(events);
  
  // 触发状态重算
  await ContainerStatusService.updateSingleContainer(containerNumber);
}
```

### 手动更新（用户操作触发）
```typescript
// 用户确认WMS卸柜
async function confirmWmsUnload(containerNumber: string, confirmDate: Date) {
  await updateWarehouseOperation(containerNumber, {
    wmsConfirmDate: confirmDate
  });
  
  // 触发状态重算
  await ContainerStatusService.updateSingleContainer(containerNumber);
}
```

### 批量更新（定时任务）
```typescript
// 每小时批量更新所有货柜状态
@Cron('0 * * * *')
async function batchUpdateStatus() {
  const containers = await getAllContainers();
  
  for (const container of containers) {
    const newStatus = calculateLogisticsStatus(container);
    if (newStatus !== container.logisticsStatus) {
      await updateContainerStatus(container.containerNumber, newStatus);
    }
  }
}
```

---

## 常见问题

### Q1: 为什么状态判断不依赖时间顺序？
**A**: 因为数据可能乱序到达（如飞驼API延迟），基于数据存在性更可靠。

### Q2: 如何调试状态异常？
**A**: 
1. 检查`calculateLogisticsStatus`返回的状态
2. 核对数据库中各流程表的字段值
3. 确认是否有高优先级状态覆盖了预期状态

### Q3: 状态更新失败怎么办？
**A**: 
1. 检查`ContainerStatusService.updateSingleContainer`日志
2. 验证数据库事务是否提交
3. 确认biz_containers.logistics_status字段可写

---

## 参考实现

- 状态机核心：`backend/src/utils/logisticsStatusMachine.ts`
- 状态服务：`backend/src/services/container-status.service.ts`
- 预警生成：`backend/src/services/container-alerts.service.ts`

---

**维护者**: LogiX Team  
**最后更新**: 2026-06-23
