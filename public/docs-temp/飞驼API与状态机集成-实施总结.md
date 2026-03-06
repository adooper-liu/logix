# 飞驼API与状态机集成 - 实施总结

## 实施日期
2026-03-06

## 实施方案
**方案1: 飞驼API同步时同时更新核心字段**

## 实施内容

### 1. 创建飞驼状态代码映射常量
**文件**: `backend/src/constants/FeiTuoStatusMapping.ts`

**功能**:
- `FEITUO_STATUS_TO_CORE_FIELD_MAP`: 飞驼状态代码到核心字段的映射
- `FEITUO_STATUS_TO_PORT_TYPE_MAP`: 飞驼状态代码到港口类型的映射
- `FEITUO_STATUS_TYPE_MAP`: 飞驼状态代码到状态类型的映射
- 辅助函数: `shouldUpdateCoreField`, `getCoreFieldName`, `getPortTypeForStatusCode`, `getStatusTypeForStatusCode`, `isEstimatedStatus`, `isActualStatus`, `getAllStatusCodesWithCoreField`

**核心映射**:
```typescript
{
  'ARRIVE': 'ata_dest_port',           // 到达目的港 -> 目的港实际到港日期
  'ATA': 'ata_dest_port',              // 实际到港 -> 目的港实际到港日期
  'GATE_IN': 'gate_in_time',           // 进闸 -> 入闸时间
  'GATE_OUT': 'gate_out_time',         // 出闸 -> 出闸时间
  'DISCHARGED': 'dest_port_unload_date', // 卸货 -> 目的港卸船日期
  'AVAIL': 'available_time',           // 可提货 -> 可提货时间
  // ...
}
```

### 2. 修改飞驼数据同步逻辑
**文件**: `backend/src/services/externalDataService.ts`

**新增方法**:
- `updatePortOperationCoreFields()`: 更新PortOperation表的核心时间字段
- `recalculateLogisticsStatus()`: 重新计算货柜的物流状态

**核心逻辑**:
```typescript
// 1. 飞驼API同步时,根据statusCode更新对应核心字段
if (shouldUpdateCoreField(event.statusCode, event.hasOccurred)) {
  const coreFieldName = getCoreFieldName(event.statusCode);
  if (coreFieldName) {
    (targetPortOperation as any)[coreFieldName] = eventTime;
    targetPortOperation.dataSource = 'Feituo';
  }
}

// 2. 重新计算物流状态
const result = calculateLogisticsStatus(
  container,
  portOperations,
  seaFreight,
  truckingTransport,
  warehouseOperation,
  emptyReturn
);
container.logisticsStatus = result.status;
```

### 3. 更新飞驼数据控制器
**文件**: `backend/src/controllers/externalData.controller.ts`

**修改内容**:
- 导入状态机相关实体
- 新增Repository: `containerRepository`, `portOperationRepository`, `seaFreightRepository`, `truckingTransportRepository`, `warehouseOperationRepository`, `emptyReturnRepository`
- 新增方法: `recalculateLogisticsStatus()`
- 在`syncContainer`方法中调用`recalculateLogisticsStatus()`

## 工作流程

### 飞驼API同步流程
```
1. 调用POST /api/external/sync/:containerNumber
   ↓
2. feituoAdapter.getContainerStatusEvents() - 从飞驼API获取状态事件
   ↓
3. convertToStatusEvents() - 转换为系统标准格式
   ↓
4. saveStatusEvents() - 保存到ContainerStatusEvent表
   ↓
5. updatePortOperationCoreFields() - 更新PortOperation表的核心时间字段
   - 根据statusCode查找对应的核心字段
   - 更新ata_dest_port, gate_in_time等字段
   - 标记dataSource = 'Feituo'
   ↓
6. recalculateLogisticsStatus() - 重新计算物流状态
   - 获取货柜的所有相关数据
   - 调用calculateLogisticsStatus()计算新状态
   - 更新Container表的logisticsStatus字段
   ↓
7. 返回同步结果
```

## 数据一致性保障

### 字段更新优先级
- **飞驼API**: 优先级最高 (实时权威数据)
- **Excel导入**: 优先级次之 (人工维护)
- **系统计算**: 优先级最低 (默认值)

### 更新规则
```typescript
// 飞驼API更新规则
if (!currentValue || eventTime > currentValue) {
  (targetPortOperation as any)[coreFieldName] = eventTime;
  targetPortOperation.dataSource = 'Feituo';
}
```

### 数据源标记
- `PortOperation.dataSource`: 标记核心字段的数据源
- 飞驼API同步时设置`dataSource = 'Feituo'`
- Excel导入时设置`dataSource = 'Excel'`

## 状态机逻辑

### 状态机计算优先级(不变)
1. `emptyReturn.returnTime` → `returned_empty`
2. `warehouseOperation.wmsStatus/ebsStatus/wmsConfirmDate` → `unloaded`
3. `truckingTransport.pickupDate` → `picked_up`
4. `destPorts.ataDestPort` → `at_port`
5. `transitPorts.ataDestPort/gateInTime` → `at_port`
6. `seaFreight.shipmentDate` → `in_transit`
7. 默认 → `not_shipped`

### 关键改进
- 飞驼API同步后,自动更新核心时间字段
- 核心时间字段更新后,自动触发状态机重新计算
- 状态机计算逻辑不变,保持稳定性

## Excel导入影响

### 不受影响的方面
- Excel导入只写入核心业务字段
- 不写入飞驼专用字段 (`statusCode`, `statusOccurredAt`等)
- 状态机计算逻辑不变
- 字段映射规则不变

### 数据交互
- Excel导入的核心时间字段可能被飞驼API覆盖(根据业务需求)
- 可以通过`dataSource`字段追踪字段变更历史

## 测试建议

### 单元测试
- [ ] 测试飞驼状态代码映射准确性
- [ ] 测试核心字段更新逻辑
- [ ] 测试状态机重新计算逻辑

### 集成测试
- [ ] 测试飞驼API同步完整流程
- [ ] 测试状态机计算结果正确性
- [ ] 测试Excel导入与飞驼API混合场景

### 数据验证
- [ ] 对比飞驼API数据和Excel导入数据的一致性
- [ ] 统计状态机计算结果的差异
- [ ] 验证数据源标记准确性

## 后续优化建议

### 1. 增加审计日志
记录字段变更历史:
```typescript
{
  field: 'ata_dest_port',
  oldValue: '2026-01-01',
  newValue: '2026-01-02',
  dataSource: 'Feituo',
  updatedAt: '2026-03-06T10:00:00Z'
}
```

### 2. 增加字段更新优先级配置
支持配置化的字段更新优先级规则,便于灵活调整

### 3. 增加飞驼API同步监控
- 监控飞驼API同步成功率
- 监控状态机计算准确性
- 监控字段更新频率

### 4. 增加批量同步优化
支持批量同步多个货柜,提高同步效率

## 相关文档

- 详细方案: `public/docs-temp/飞驼API与状态机集成方案.md`
- 飞驼状态映射: `backend/src/constants/FeiTuoStatusMapping.ts`
- 状态机逻辑: `backend/src/utils/logisticsStatusMachine.ts`
- 飞驼适配器: `backend/src/adapters/FeiTuoAdapter.ts`
- 外部数据服务: `backend/src/services/externalDataService.ts`

## 总结

✅ **实施完成**
- 创建了飞驼状态代码映射常量
- 修改了飞驼数据同步逻辑,增加核心字段更新
- 更新了飞驼数据控制器,增加状态机重新计算
- 保持了状态机逻辑不变,确保稳定性
- 支持数据源标记,便于审计追踪

✅ **符合开发规则**
- 数据库表结构是唯一不变基准
- 数据完整性原则:飞驼API字段与Excel导入字段不冲突
- 状态机依赖核心时间字段,逻辑保持一致
- 飞驼API作为实时数据源,优先级最高

✅ **风险最低**
- 不修改状态机核心逻辑
- 不修改统计查询逻辑
- 不修改Excel导入逻辑
- 测试范围最小

✅ **可扩展性强**
- 易于支持其他外部API
- 易于调整字段更新优先级
- 易于增加审计追踪功能
