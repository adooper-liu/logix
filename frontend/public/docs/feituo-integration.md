# LogiX 飞驼API集成

## 概述

飞驼（Freightower）提供集装箱物流事件追踪API，LogiX通过FeiTuoAdapter同步数据到本地数据库。

**API文档**: https://doc.freightower.com/

---

## 数据流

```
飞驼API
   ↓ (FeiTuoAdapter.fetchEvents)
ext_container_status_events (原始事件)
   ↓ (FeiTuoStatusMapping.mapStatusCode)
process_port_operations (港口操作)
   ↓ (ContainerStatusService.updateSingleContainer)
biz_containers.logistics_status (7层状态)
   ↓ (DemurrageService.calculate)
demurrage_amount (滞港费)
```

---

## FeiTuoAdapter 核心方法

### fetchEvents - 拉取事件
```typescript
async function fetchEvents(containerNumber: string): Promise<FeiTuoEvent[]> {
  const response = await axios.get(`${FEITUO_API_BASE}/events`, {
    params: {
      container_number: containerNumber,
      api_key: FEITUO_API_KEY
    }
  });
  
  return response.data.events.map(event => ({
    statusCode: event.status_code,
    eventTime: event.event_time,
    location: event.location,
    isEstimated: event.is_estimated
  }));
}
```

### syncContainerData - 同步单个货柜
```typescript
async function syncContainerData(containerNumber: string) {
  // 1. 拉取事件
  const events = await fetchEvents(containerNumber);
  
  // 2. 保存到扩展表
  await saveToExtContainerStatusEvents(events);
  
  // 3. 映射到流程表
  await mapEventsToPortOperations(events);
  
  // 4. 触发状态重算
  await ContainerStatusService.updateSingleContainer(containerNumber);
}
```

---

## 状态码映射

### FeiTuoStatusMapping
```typescript
const STATUS_CODE_MAPPING = {
  // 到港相关
  'PCAB': { field: 'ata_dest_port', description: '目的港实际到港' },
  'AVLE': { field: 'available_time', description: '可提货时间' },
  
  // 提柜相关
  'GATE_IN': { field: 'gate_in_time', description: '进闸时间' },
  'PICKUP': { field: 'pickup_date', description: '提柜时间' },
  
  // 还箱相关
  'RETURN_EMPTY': { field: 'return_time', description: '还空箱时间' },
  
  // 中转港
  'TRANSIT_ATA': { field: 'transit_port_ata', description: '中转港到港' }
};
```

### 映射逻辑
```typescript
function mapStatusCode(statusCode: string): StatusMapping | null {
  return STATUS_CODE_MAPPING[statusCode] || null;
}

async function applyMapping(event: FeiTuoEvent, mapping: StatusMapping) {
  const portOp = await getOrCreatePortOperation(event.containerNumber);
  
  // 更新对应字段
  portOp[mapping.field] = event.eventTime;
  
  await savePortOperation(portOp);
}
```

---

## 关键状态码解读

### PCAB - Purpose Cargo Arrived at Berth
**含义**: 货物已到港靠泊  
**映射字段**: `process_port_operations.ata_dest_port`  
**触发状态**: `logistics_status = 'at_port'`  
**业务影响**: 
- 启动滞港费计时
- 计算last_free_date = ata + free_days

### AVLE - Available for Pickup
**含义**: 货柜可提货  
**映射字段**: `process_port_operations.available_time`  
**触发条件**: 清关完成、费用结清  
**业务影响**: 
- 允许安排拖卡提柜
- 更新预警状态

### GATE_IN - Gate In
**含义**: 货柜进入码头闸口  
**映射字段**: `process_port_operations.gate_in_time`  
**触发状态**: `logistics_status = 'in_transit'`（如果无ATA）  

### PICKUP - Picked Up
**含义**: 货柜已被提离港口  
**映射字段**: `process_trucking_transport.pickup_date`  
**触发状态**: `logistics_status = 'picked_up'`  
**业务影响**: 
- 停止滞港费计时
- 开始监控卸柜进度

### RETURN_EMPTY - Empty Return
**含义**: 空箱已归还  
**映射字段**: `process_empty_return.return_time`  
**触发状态**: `logistics_status = 'returned_empty'`（终态）  
**业务影响**: 
- 触发最终滞港费计算
- 关闭货柜跟踪

---

## 数据验证

### ETA/ATA验证规则
```typescript
function validateEtaAta(eta: Date, ata: Date): ValidationResult {
  const issues: string[] = [];
  
  // ATA不应早于ETA超过30天
  if (differenceInDays(eta, ata) > 30) {
    issues.push('ATA比ETA早超过30天，可能数据异常');
  }
  
  // ATA不应晚于ETA超过60天
  if (differenceInDays(ata, eta) > 60) {
    issues.push('ATA比ETA晚超过60天，可能延误严重');
  }
  
  return {
    isValid: issues.length === 0,
    issues
  };
}
```

### 常见数据异常
| 异常类型 | 表现 | 原因 | 处理 |
|---------|------|------|------|
| ATA缺失 | ata_dest_port为NULL | 飞驼未推送PCAB事件 | 手动补录或等待 |
| ATA异常早 | ATA < ETA - 30天 | 时区错误或数据错误 | 联系飞驼核实 |
| 重复事件 | 同一statusCode多次 | API重试机制 | 去重处理 |
| 状态回退 | 高优先级状态消失 | 数据删除或覆盖 | 检查事务日志 |

---

## 定时同步任务

### 每小时增量同步
```typescript
@Cron('0 * * * *')
async function hourlySync() {
  // 只同步最近24小时有更新的货柜
  const activeContainers = await getActiveContainers(24);
  
  for (const container of activeContainers) {
    try {
      await FeiTuoAdapter.syncContainerData(container.containerNumber);
    } catch (error) {
      logger.error(`Failed to sync ${container.containerNumber}: ${error.message}`);
    }
  }
}
```

### 每日全量校验
```typescript
@Cron('0 3 * * *')
async function dailyValidation() {
  const allContainers = await getAllShippedContainers();
  
  for (const container of allContainers) {
    const validationResult = await validateContainerData(container);
    
    if (!validationResult.isValid) {
      logger.warn(`Data issues for ${container.containerNumber}:`, validationResult.issues);
      // 触发告警或自动修复
    }
  }
}
```

---

## 错误处理

### API调用失败
```typescript
async function fetchWithRetry(containerNumber: string, retries = 3): Promise<FeiTuoEvent[]> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fetchEvents(containerNumber);
    } catch (error) {
      if (i === retries - 1) throw error;
      
      const delay = Math.pow(2, i) * 1000;  // 指数退避
      logger.warn(`Retry ${i + 1}/${retries} after ${delay}ms`);
      await sleep(delay);
    }
  }
}
```

### 数据映射失败
```typescript
function safeMapStatusCode(statusCode: string): StatusMapping | null {
  const mapping = mapStatusCode(statusCode);
  
  if (!mapping) {
    logger.warn(`Unknown status code: ${statusCode}, skipping mapping`);
    return null;
  }
  
  return mapping;
}
```

---

## 常见问题

### Q1: 为什么ATA和飞驼显示不一致？
**A**: 
1. 检查时区转换（飞驼用UTC，本地用Asia/Shanghai）
2. 确认是否是estimated值（is_estimated=true）
3. 查看ext_container_status_events的原始event_time

### Q2: 如何调试状态码映射？
**A**: 
1. 查询`ext_container_status_events`表获取原始事件
2. 检查`FeiTuoStatusMapping.STATUS_CODE_MAPPING`是否包含该statusCode
3. 验证映射后的字段是否正确写入`process_port_operations`

### Q3: 同步失败怎么办？
**A**: 
1. 检查飞驼API密钥是否有效
2. 查看backend/logs/error.log中的详细错误
3. 确认网络连接正常（防火墙/代理）
4. 尝试手动调用`syncContainerData`测试

---

## 参考实现

- Adapter: `backend/src/adapters/feituo.adapter.ts`
- 状态映射: `backend/src/mappings/feituo-status-mapping.ts`
- 同步服务: `backend/src/services/feituo-sync.service.ts`
- 实体定义: `backend/src/entities/ext-container-status-event.entity.ts`

---

**维护者**: LogiX Team  
**最后更新**: 2026-06-23
