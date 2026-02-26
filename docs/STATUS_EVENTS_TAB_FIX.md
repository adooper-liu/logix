# 状态事件页签为空问题修复

## 问题描述
货柜详情页面的"状态事件"页签显示为空，没有显示任何状态事件记录。

## 根本原因

### 1. 数据表结构分析
- `container_status_events` 表存在但为空（0条记录）
- 实际的状态事件数据存储在 `process_port_operations` 表中的多个时间节点字段：
  - `eta_dest_port` - 预计到港日期
  - `ata_dest_port` - 实际到港日期
  - `dest_port_unload_date` - 目的港卸船日期
  - `gate_in_time` - 入闸时间
  - `gate_out_time` - 出闸时间
  - `discharged_time` - 放电时间
  - `available_time` - 可提货时间
  - `status_code` + `status_occurred_at` - 状态代码和发生时间

### 2. 代码问题分析
后端 `container.controller.ts` 的 `getContainerById` 方法中：
- 查询 `container_status_events` 表获取状态事件（第192-197行）
- 由于该表为空，返回的 `statusEvents` 数组为空
- 前端收到空数据后显示"暂无状态事件记录"

## 解决方案

### 修改文件
`backend/src/controllers/container.controller.ts`

### 修改内容
将状态事件数据的获取方式从查询空表改为从各个业务表中提取时间节点数据：

1. **港口操作状态事件** - 从 `port_operations` 表提取：
   - 预计到港时间 (ETA)
   - 实际到港时间 (ATA)
   - 目的港卸船日期
   - 入闸时间
   - 出闸时间
   - 放电时间
   - 可提货时间
   - 港口状态节点 (statusCode + statusOccurredAt)

2. **拖卡运输状态事件** - 从 `trucking_transports` 表提取：
   - 提柜时间
   - 送达时间

3. **仓库操作状态事件** - 从 `warehouse_operations` 表提取：
   - 卸柜时间
   - 仓库入库时间
   - 开箱时间

4. **还空箱状态事件** - 从 `empty_returns` 表提取：
   - 还箱时间

### 数据结构映射
每个状态事件包含以下字段：
```typescript
{
  id: string;                    // 事件唯一标识
  statusCode: string;            // 状态代码
  occurredAt: Date;              // 发生时间
  locationNameCn: string;        // 地点名称（中文）
  locationNameEn: string;        // 地点名称（英文）
  locationCode: string;          // 地点代码
  description: string;           // 事件描述
  statusType: string;            // 状态类型
  isEstimated: boolean;          // 是否为预计时间
  dataSource: string;            // 数据来源
}
```

### 状态代码映射
| 状态代码 | 状态名称 | 来源表 |
|---------|---------|--------|
| ETA | 预计到港 | port_operations.etaDestPort |
| ATA | 实际到港 | port_operations.ataDestPort |
| UNLOADED | 卸船/卸柜 | port_operations.destPortUnloadDate / warehouse_operations.unloadDate |
| GATE_IN | 入闸 | port_operations.gateInTime |
| GATE_OUT | 出闸 | port_operations.gateOutTime |
| DISCHARGED | 放电 | port_operations.dischargedTime |
| AVAILABLE | 可提货 | port_operations.availableTime |
| PICKED_UP | 提柜 | trucking_transports.pickupDate |
| DELIVERED | 送达 | trucking_transports.deliveryDate |
| WAREHOUSE_ARRIVAL | 仓库入库 | warehouse_operations.warehouseArrivalDate |
| UNBOXED | 开箱 | warehouse_operations.unboxingTime |
| RETURNED_EMPTY | 还空箱 | empty_returns.returnTime |

## 测试验证
- 访问货柜详情页
- 点击"状态事件"页签
- 验证显示的时间线事件是否正确
- 检查事件是否按时间倒序排列

## 相关表结构

### container_status_events (当前为空，不再使用)
- id
- containerNumber
- statusCode
- occurredAt
- locationNameCn
- locationNameEn
- locationCode
- description
- isEstimated
- dataSource
...

### process_port_operations (实际数据来源)
- containerNumber
- portType
- portCode
- portName
- etaDestPort
- ataDestPort
- destPortUnloadDate
- gateInTime
- gateOutTime
- dischargedTime
- availableTime
- statusCode
- statusOccurredAt
- locationNameCn
- locationNameEn
- dataSource
...

## 注意事项
1. `container_status_events` 表目前为空，但保留表结构以备将来使用
2. 状态事件数据是动态计算的，不是静态存储
3. 同一个货柜可能有多个港口操作记录，每个记录会生成多个状态事件
4. 所有状态事件按时间倒序排序（最新的在前）
