# 飞驼API与状态机集成方案

## 问题描述

当前状态机使用Excel导入的数据计算物流状态,后期飞驼API插入数据时需要确保状态机能够正确工作。

### 当前状态机逻辑

状态机`calculateLogisticsStatus`基于以下优先级计算物流状态:

1. **优先级1**: `emptyReturn.returnTime` → `returned_empty`
2. **优先级2**: `warehouseOperation.wmsStatus/ebsStatus/wmsConfirmDate` → `unloaded`
3. **优先级3**: `truckingTransport.pickupDate` → `picked_up`
4. **优先级4**: `destPorts.ataDestPort` → `at_port`
5. **优先级5**: `transitPorts.ataDestPort或gateInTime` → `at_port`
6. **优先级6**: `seaFreight.shipmentDate` → `in_transit`
7. **优先级7**: 默认 → `not_shipped`

### 飞驼API字段

飞驼API提供以下字段,存放在`PortOperation`表中:

**飞驼专用字段**:
- `statusCode`: 状态代码
- `statusOccurredAt`: 状态发生时间
- `hasOccurred`: 是否已发生
- `locationNameEn`: 地点英文名
- `locationNameCn`: 地点中文名
- `locationType`: 地点类型
- `latitude`: 纬度
- `longitude`: 经度
- `timezone`: 时区
- `data_source`: 数据源
- `cargoLocation`: 货物位置

**Excel导入与飞驼共用的核心时间字段**:
- `ata_dest_port`: 目的港实际到港日期 (Excel导入 + 飞驼API)
- `gate_in_time`: 入闸时间 (Excel导入 + 飞驼API)
- `gate_out_time`: 出闸时间 (Excel导入 + 飞驼API)
- `dest_port_unload_date`: 目的港卸船日期 (飞驼API)
- `available_time`: 可提货时间 (飞驼API)
- `discharged_time`: 放电时间 (飞驼API)

## 核心问题

飞驼API同步数据时,如果只写入飞驼专用字段,不会触发状态机更新,因为状态机依赖的是核心时间字段。

**关键矛盾**:
- Excel导入写入: `ata_dest_port`, `gate_in_time`等核心时间字段
- 飞驼API写入: `statusCode`, `statusOccurredAt`等飞驼专用字段
- 状态机计算: 依赖`ata_dest_port`, `gate_in_time`等核心时间字段

## 解决方案

### 方案1: 飞驼API同步时同时更新核心字段 (推荐)

飞驼API在同步数据时,根据`statusCode`和`statusOccurredAt`自动更新对应的核心时间字段。

#### 实现逻辑

1. **飞驼状态代码到核心字段的映射**:

```typescript
const FEITUO_STATUS_TO_CORE_FIELD_MAP: Record<string, {
  field: string;
  portType?: 'origin' | 'transit' | 'destination';
}> = {
  // 到达目的港
  'ARRIVE': { field: 'ata_dest_port', portType: 'destination' },
  'ATA': { field: 'ata_dest_port', portType: 'destination' },

  // 进闸
  'GATE_IN': { field: 'gate_in_time', portType: 'destination' },

  // 出闸
  'GATE_OUT': { field: 'gate_out_time', portType: 'destination' },

  // 卸货
  'DISCHARGED': { field: 'dest_port_unload_date', portType: 'destination' },

  // 可提货
  'AVAIL': { field: 'available_time', portType: 'destination' },

  // 放电
  'DISCHARGED': { field: 'discharged_time', portType: 'destination' },
};
```

2. **飞驼数据同步时的字段更新逻辑**:

```typescript
async syncFeituoData(containerNumber: string, feituoEvents: FeituoEvent[]) {
  for (const event of feituoEvents) {
    // 1. 查找对应的港口操作记录
    const portOperation = await findPortOperationByContainerAndPort(
      containerNumber,
      event.location.code
    );

    if (!portOperation) continue;

    // 2. 更新飞驼专用字段
    portOperation.statusCode = event.statusCode;
    portOperation.statusOccurredAt = event.statusOccurredAt;
    portOperation.hasOccurred = event.hasOccurred;
    portOperation.locationNameEn = event.locationNameEn;
    portOperation.locationNameCn = event.locationNameCn;
    portOperation.locationType = event.locationType;
    portOperation.latitude = event.latitude;
    portOperation.longitude = event.longitude;
    portOperation.timezone = event.timezone;
    portOperation.data_source = event.dataSource;
    portOperation.cargoLocation = event.cargoLocation;

    // 3. 根据状态代码更新核心时间字段 (关键步骤!)
    const mapping = FEITUO_STATUS_TO_CORE_FIELD_MAP[event.statusCode];
    if (mapping && event.hasOccurred) {
      // 只有已发生的事件才更新核心字段
      portOperation[mapping.field] = event.statusOccurredAt;
    }

    // 4. 保存记录
    await savePortOperation(portOperation);
  }

  // 5. 重新计算并更新货柜的物流状态
  await recalculateLogisticsStatus(containerNumber);
}
```

3. **状态机重新计算**:

```typescript
async recalculateLogisticsStatus(containerNumber: string) {
  // 获取货柜的所有相关数据
  const container = await getContainer(containerNumber);
  const portOperations = await getPortOperations(containerNumber);
  const seaFreight = await getSeaFreight(containerNumber);
  const truckingTransport = await getTruckingTransport(containerNumber);
  const warehouseOperation = await getWarehouseOperation(containerNumber);
  const emptyReturn = await getEmptyReturn(containerNumber);

  // 计算新的物流状态
  const result = calculateLogisticsStatus(
    container,
    portOperations,
    seaFreight,
    truckingTransport,
    warehouseOperation,
    emptyReturn
  );

  // 更新货柜的物流状态
  if (result.status !== container.logisticsStatus) {
    container.logisticsStatus = result.status;
    await saveContainer(container);

    logger.info(`货柜 ${containerNumber} 物流状态更新: ${result.status}`);
  }
}
```

### 方案2: 增强状态机逻辑,支持飞驼状态代码

在状态机中增加对飞驼状态代码的支持,使其能够直接根据飞驼字段计算状态。

#### 优点
- 飞驼字段独立,不依赖核心时间字段
- 状态计算逻辑更加灵活

#### 缺点
- 需要修改状态机核心逻辑
- 增加代码复杂度
- 需要维护飞驼状态代码映射

### 方案3: 飞驼API + Excel导入混合模式 (不推荐)

允许飞驼API和Excel导入都写入核心时间字段,以最新更新为准。

#### 缺点
- 数据冲突风险高
- 难以追踪数据来源
- 不符合数据完整性原则

## 推荐实施方案: 方案1

### 实施步骤

1. **创建飞驼状态代码到核心字段的映射常量**
   - 文件位置: `backend/src/constants/FeiTuoStatusMapping.ts`

2. **修改飞驼数据同步逻辑**
   - 文件位置: `backend/src/services/externalDataService.ts`
   - 在`syncFeituoData`方法中增加核心字段更新逻辑

3. **增加状态机重新计算触发**
   - 文件位置: `backend/src/controllers/externalData.controller.ts`
   - 在`syncContainer`方法中调用`recalculateLogisticsStatus`

4. **测试验证**
   - 测试飞驼API同步后状态机是否正确计算
   - 测试Excel导入后状态机是否正常工作
   - 测试两者混合场景下的数据一致性

### 字段更新优先级规则

当一个字段可能被多个数据源更新时,遵循以下优先级:

1. **飞驼API**: 优先级最高 (实时数据)
2. **Excel导入**: 优先级次之 (人工维护)
3. **系统计算**: 优先级最低 (默认值)

**实现方式**:
```typescript
// 飞驼API同步时,只更新飞驼有数据的字段
if (event.hasOccurred && !portOperation[mapping.field]) {
  portOperation[mapping.field] = event.statusOccurredAt;
}

// 或者: 飞驼API强制覆盖 (根据业务需求选择)
if (event.hasOccurred) {
  portOperation[mapping.field] = event.statusOccurredAt;
}
```

## 数据一致性保障

### 1. 数据源标记

所有飞驼API更新的字段需要标记数据源:

```typescript
@Column({ type: 'varchar', length: 20, nullable: true })
dataSource?: string; // 'Feituo', 'Excel', 'System'
```

### 2. 更新时间戳

每次字段更新都记录更新时间:

```typescript
@Column({ type: 'timestamp', nullable: true })
feituoUpdatedAt?: Date; // 飞驼API最后更新时间

@Column({ type: 'timestamp', nullable: true })
excelUpdatedAt?: Date; // Excel导入最后更新时间
```

### 3. 字段级审计日志

记录字段的变更历史:

```typescript
@Column({ type: 'jsonb', nullable: true })
fieldAuditLog?: Array<{
  field: string;
  oldValue: any;
  newValue: any;
  dataSource: string;
  updatedAt: Date;
}>;
```

## Excel导入的影响

Excel导入不受飞驼API影响,因为:

1. Excel导入只写入核心业务字段
2. 不写入飞驼专用字段 (`statusCode`, `statusOccurredAt`等)
3. 状态机计算逻辑不变,仍然依赖核心时间字段
4. 飞驼API和Excel导入操作的字段不冲突

## 总结

### 核心原则

1. **飞驼API字段独立**: 飞驼专用字段由API写入,Excel导入不处理
2. **核心字段同步**: 飞驼API同步时,根据状态代码更新对应的核心时间字段
3. **状态机统一计算**: 状态机只依赖核心时间字段,逻辑保持不变
4. **数据源标记**: 所有字段更新都记录数据源,支持审计追踪

### 实施检查清单

- [ ] 创建飞驼状态代码到核心字段的映射常量
- [ ] 修改飞驼数据同步逻辑,增加核心字段更新
- [ ] 增加状态机重新计算触发机制
- [ ] 添加数据源标记和审计日志
- [ ] 编写单元测试验证飞驼API同步逻辑
- [ ] 编写集成测试验证状态机计算逻辑
- [ ] 测试Excel导入与飞驼API混合场景
- [ ] 编写操作文档和开发规范

### 相关文档

- 数据库表结构: `backend/03_create_tables.sql`
- 状态机逻辑: `backend/src/utils/logisticsStatusMachine.ts`
- 飞驼适配器: `backend/src/adapters/FeiTuoAdapter.ts`
- 外部数据服务: `backend/src/services/externalDataService.ts`
