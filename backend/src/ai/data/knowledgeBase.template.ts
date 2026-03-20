/**
 * 业务知识知识库模板
 * 包含系统核心业务知识，用于AI技能调用
 */

export const knowledgeBase = [
  {
    category: '物流状态',
    title: '物流状态流转',
    keywords: ['状态', '流转', '桑基图', '物流状态', 'state', 'status'],
    content: `## 物流状态流转

### 状态机定义

物流状态机定义了货柜在整个物流流程中的状态流转：

1. **not_shipped** - 未出运
2. **shipped** - 已出运
3. **in_transit** - 在途
4. **at_port** - 已到目的港
5. **picked_up** - 已提柜
6. **unloaded** - 已卸柜
7. **returned_empty** - 已还箱

### 状态判定逻辑

状态机通过以下逻辑判定货柜状态：

- **not_shipped**：未出运，无特殊判定
- **shipped**：已出运，有海运信息
- **in_transit**：在途，有中转港记录但目的港无实际到港时间
- **at_port**：已到目的港，目的港有实际到港时间
- **picked_up**：已提柜，有提柜记录
- **unloaded**：已卸柜，有卸柜记录
- **returned_empty**：已还箱，有还箱记录

### 状态统计

系统会根据状态机对货柜进行统计，包括：
- 状态分布：各状态的货柜数量
- 到港分布：按到港时间统计
- 提柜分布：按提柜计划统计
- 最晚提柜分布：按最晚提柜日统计
- 最晚还箱分布：按最晚还箱日统计
`
  },
  {
    category: '筛选条件',
    title: '筛选条件说明',
    keywords: ['筛选', '过滤', '按到港', '按ETA', '按计划提柜', 'filter', 'condition'],
    content: `## 筛选条件说明

### 时间筛选

系统支持按出运日期进行筛选，使用Dashboard风格的日期范围选择器：

- 默认为本年（出运日期口径）
- 支持自定义日期范围
- 当所选日期范围内无出运记录时，会自动显示全部货柜

### 状态筛选

系统支持按物流状态进行筛选：

- 未出运
- 已出运
- 在途
- 已到目的港
- 已提柜
- 已卸柜
- 已还箱

### 统计卡片筛选

系统提供以下统计卡片，点击可筛选对应货柜：

1. **按状态**：物流状态分布
2. **按到港**：到港时间分布
3. **按提柜计划**：计划提柜分布
4. **按最晚提柜**：最晚提柜倒计时
5. **按最晚还箱**：最晚还箱倒计时

### 搜索功能

支持搜索集装箱号、备货单号、提单号等关键词。
`
  },
  {
    category: '滞港费',
    title: '滞港费计算规则',
    keywords: ['滞港费', '堆存费', 'demurrage', 'storage', 'free_days', '免费天数'],
    content: `## 滞港费计算规则

### 核心概念

- **免费期**：货物在码头免费存放的时间
- **滞港费**：超过免费期后产生的费用
- **最晚提柜日**：最后免费提柜的日期
- **最晚还箱日**：最后免费还箱的日期

### 计算逻辑

1. **最晚提柜日 (last_free_date)**
   - 计算公式：基准日 + (免费天数 - 1)天
   - 基准日优先级：修正ETA → ETA → ATA → 实际卸船日
   - 免费天数来自滞港费标准表

2. **最晚还箱日 (last_return_date)**
   - 计算公式：(实际提柜日 或 last_free_date) + 免费用箱天数
   - 免费用箱天数来自滞箱费标准表

### 免费日更新

- 定时任务每24小时自动执行一次
- 支持手动触发更新
- 计算完成后会更新货柜的最晚提柜日和最晚还箱日
`
  },
  {
    category: '时间概念',
    title: '时间概念说明',
    keywords: ['历时', '倒计时', '超期', '时间', 'eta', 'ata', 'duration'],
    content: `## 时间概念说明

### 核心时间概念

- **ETA**：预计到港时间
- **ATA**：实际到港时间
- **ETD**：预计离港时间
- **ATD**：实际离港时间
- **实际出运日期**：货物实际出运的日期
- **计划提柜日**：计划提取集装箱的日期
- **实际提柜日**：实际提取集装箱的日期
- **计划卸柜日**：计划卸载集装箱的日期
- **实际卸柜日**：实际卸载集装箱的日期
- **计划还箱日**：计划归还空箱的日期
- **实际还箱日**：实际归还空箱的日期
- **最晚提柜日**：最后免费提柜的日期
- **最晚还箱日**：最后免费还箱的日期

### 倒计时计算

系统会计算以下倒计时：

- **到港倒计时**：距离预计到港的时间
- **提柜倒计时**：距离计划提柜的时间
- **最晚提柜倒计时**：距离最晚提柜日的时间
- **最晚还箱倒计时**：距离最晚还箱日的时间

### 超期判定

- **已超时**：超过最晚提柜日或最晚还箱日
- **即将超时**：距离最晚提柜日或最晚还箱日不足3天
- **预警**：距离最晚提柜日或最晚还箱日不足7天
`
  },
  {
    category: '港口操作',
    title: '多港经停场景',
    keywords: ['多港', '中转港', '目的港', '经停', 'port', 'transit', 'destination'],
    content: `## 多港经停场景

### 港口类型

- **origin**：起运港
- **transit**：中转港
- **destination**：目的港

### 到港判定

- **已到中转港**：有任一非空即可 — ata、gate_in_time 或 transit_arrival_date
- **已到目的港**：ata 非空

### 港口操作记录

每个货柜可以有多条港口操作记录，按 port_sequence 排序：

- port_sequence = 1：起运港
- port_sequence = 2：中转港
- port_sequence = 3：目的港

### 状态机与统计

- 状态机与「已到中转港」统计/列表均按上述字段判定
- 避免只填 transit_arrival_date 的柜子被漏计
`
  },
  {
    category: '数据结构',
    title: '数据库表结构',
    keywords: ['表', '表结构', '数据库', 'table', 'schema', '字段'],
    content: `## 数据库表结构

### 核心主表

| 表名 | 实体 | 主键 | 说明 |
|------|------|------|------|
| **biz_containers** | Container | container_number | 货柜主表 |
| **biz_replenishment_orders** | ReplenishmentOrder | order_number | 备货单主表 |
| **process_sea_freight** | SeaFreight | bill_of_lading_number | 海运/提单主表 |
| **process_port_operations** | PortOperation | id | 港口操作 |
| **process_trucking_transport** | TruckingTransport | container_number | 拖卡运输 |
| **process_warehouse_operations** | WarehouseOperation | container_number | 仓库操作 |
| **process_empty_return** | EmptyReturn | container_number | 还空箱 |
| **biz_container_skus** | ContainerSku | id | 货柜 SKU 明细 |

### 关联关系

- **container → replenishment_orders**：1:N，一柜多单
- **container → process_port_operations**：1:N，多港经停
- **container → process_trucking_transport**：1:N，多种运输类型
- **container → process_warehouse_operations**：1:1 或 1:N
- **container → process_empty_return**：1:1 或 1:N

### 字段映射

| 实体字段 | 数据库字段 | 说明 |
|---------|-----------|------|
| containerNumber | container_number | 集装箱号 |
| actualShipDate | actual_ship_date | 实际出运日期 |
| shipmentDate | shipment_date | 海运出运日期 |
| etaDestPort | eta | 预计到港时间 |
| ataDestPort | ata | 实际到港时间 |
| lastFreeDate | last_free_date | 最晚提柜日 |
| lastReturnDate | last_return_date | 最晚还箱日 |
| returnTime | return_time | 实际还箱日 |
`
  },
  {
    category: '数据服务',
    title: '货柜数据服务重构',
    keywords: ['数据服务', '重构', 'ContainerDataService', 'ContainerQueryBuilder', 'enrich'],
    content: `## 货柜数据服务重构

### 重构背景

为了解决代码重复、查询逻辑分散的问题，系统进行了货柜数据服务的重构。

### 核心组件

1. **ContainerQueryBuilder**
   - 提供统一的查询构建逻辑
   - 新增 createListQuery 方法，用于货柜列表查询
   - 使用 leftJoinAndSelect 加载 seaFreight，确保数据完整

2. **ContainerDataService**
   - 提供分层数据服务
   - getContainersForList：用于列表页面，支持分页
   - getContainersForStats：用于统计，无分页
   - getContainerDetail：用于详情页面

3. **数据流程**
   - Controller → ContainerDataService → ContainerQueryBuilder → 数据库
   - 数据丰富：使用 enrichContainersList 方法

### 技术要点

- **字段名使用**：使用实体属性名（camelCase）而非数据库列名
- **关联关系**：正确处理 1:N 关系，避免重复行
- **性能优化**：保持批量查询优化，减少数据库往返
- **兼容性**：保持现有 API 接口不变

### 实施效果

- 减少代码重复，提高可维护性
- 统一查询逻辑，确保数据一致性
- 分层架构，提高代码清晰度
- 保持性能优化措施
`
  },
  {
    category: '开发实践',
    title: '消除AI幻觉与数据库字段错误的最佳实践',
    keywords: ['AI幻觉', '数据库字段', '字段错误', 'leftJoin', 'leftJoinAndSelect', 'TypeORM'],
    content: `## 消除AI幻觉与数据库字段错误的最佳实践

### 一、消除AI幻觉的策略

#### 1. 基于实际代码分析
- **代码审查**：在提出方案前，先查看实际的代码文件，了解现有的实现逻辑
- **实体定义验证**：检查TypeORM实体定义，确认字段名和关联关系
- **API调用验证**：确认现有API的存在性和用法，避免虚构不存在的方法

#### 2. 严格遵循现有代码结构
- **使用已存在的API**：只使用项目中实际存在的方法和类
- **保持代码风格一致**：遵循项目现有的命名规范和代码结构
- **验证关联关系**：确保理解并正确使用数据库表之间的关联关系

#### 3. 避免臆造功能
- **基于事实**：所有方案都应基于实际代码和数据库结构
- **渐进式改进**：在现有代码基础上进行优化，而不是完全重写
- **验证可行性**：在实施前验证方案的可行性和正确性

### 二、消除数据库字段与命名错误

#### 1. 字段名使用规则
- **TypeORM实体属性名**：在QueryBuilder中使用camelCase格式的实体属性名
- **数据库列名**：只在原生SQL或特定场景下使用snake_case格式的数据库列名
- **一致性**：确保整个代码库中字段名的使用保持一致

#### 2. 常见错误与修正
- **错误**：container.container_number
- **正确**：container.containerNumber
- **错误**：order.actual_ship_date
- **正确**：order.actualShipDate
- **错误**：container.updated_at
- **正确**：container.updatedAt

#### 3. 验证机制
- **代码审查**：定期检查代码中的字段名使用
- **类型检查**：利用TypeScript的类型系统捕获字段名错误
- **测试验证**：通过测试确保查询结果正确

### 三、createBaseQuery与leftJoinAndSelect的意义

#### 1. createBaseQuery不能直接用于createListQuery的原因
- **join类型不同**：createBaseQuery使用leftJoin，只参与WHERE条件，不加载关联实体
- **数据需求不同**：列表查询需要加载seaFreight数据用于enrich逻辑
- **enrich依赖**：enrichContainersList方法依赖container.seaFreight属性

#### 2. seaFreight使用leftJoinAndSelect的意义
- **数据完整性**：确保seaFreight数据被加载到Container实体中
- **enrich支持**：为enrichContainersList提供完整的关联数据
- **性能优化**：减少后续查询，避免N+1问题

#### 3. 正确实现
```typescript
// 正确：使用leftJoinAndSelect加载seaFreight
const qb = containerRepository
  .createQueryBuilder('container')
  .leftJoin('container.replenishmentOrders', 'order')
  .leftJoinAndSelect('container.seaFreight', 'sf');
```

### 四、实施总结

#### 1. 核心改动
- **ContainerQueryBuilder.createListQuery**：统一列表查询构建逻辑
- **ContainerDataService**：封装查询+enrich的调用方式
- **ContainerController调整**：使用新的数据服务，保持API兼容

#### 2. 数据流优化
- **当前流程**：Controller直接构建查询 → getManyAndCount → enrich
- **优化后**：Controller → ContainerDataService → ContainerQueryBuilder → 数据库

#### 3. 注意事项
- **1:N关系**：暂不处理去重，先观察分页和总数是否异常
- **兼容性**：保持API响应格式不变，仅内部实现变更
- **验证**：对比重构前后的查询结果，确保功能一致

#### 4. 最佳实践
- **代码复用**：通过统一查询构建减少重复代码
- **分层架构**：清晰的职责分离，提高可维护性
- **性能考虑**：合理使用leftJoin和leftJoinAndSelect，平衡性能和数据需求

通过以上策略，可以有效消除AI幻觉，避免数据库字段错误，并确保代码的正确性和可维护性。
`
  },
  {
    category: '数据服务',
    title: 'Enrich逻辑详解：数据结构、价值与意义',
    keywords: ['enrich', '数据增强', '批量查询', '物流状态', '数据结构'],
    content: `## Enrich逻辑详解：数据结构、价值与意义

### 一、Enrich逻辑的核心实现

#### 1. 核心方法
- **enrichContainersList**：位于 `backend/src/services/container.service.ts`
- **功能**：为货柜列表数据添加丰富的关联信息和计算字段
- **输入**：Container[] 数组
- **输出**：增强后的容器对象数组

#### 2. 实现原理
- **批量查询优化**：收集所有货柜号，一次性查询所有关联数据
- **并行处理**：使用 Promise.all 并行查询多种关联数据
- **数据映射**：将查询结果转换为 Map 结构，提高查找效率
- **异常处理**：单个货柜处理失败不影响整体流程

#### 3. 关联数据查询
```typescript
// 批量查询所有相关数据
const [ordersMap, eventsMap, portOperationsMap, truckingMap, warehouseMap, emptyReturnsMap, customsBrokersMap, truckingCompaniesMap, warehousesMap, countriesMap] = await Promise.all([
  this.batchFetchOrders(containerNumbers),
  this.batchFetchStatusEvents(containerNumbers),
  this.batchFetchPortOperations(containerNumbers),
  this.batchFetchTruckingTransports(containerNumbers),
  this.batchFetchWarehouseOperations(containerNumbers),
  this.batchFetchEmptyReturns(containerNumbers),
  this.batchFetchCustomsBrokers(),
  this.batchFetchTruckingCompanies(),
  this.batchFetchWarehouses(),
  this.batchFetchCountries()
]);
```

### 二、Enrich数据结构

#### 1. 输出数据结构
- **基础字段**：保留原Container实体的所有字段
- **订单信息**：orderNumber、sellToCountry、customerName、actualShipDate
- **状态信息**：latestStatus、currentPortType、location
- **港口信息**：latestPortOperation、etaDestPort、etaCorrection、ataDestPort、customsStatus
- **海运信息**：destinationPort、billOfLadingNumber、mblNumber、seaFreight
- **时间信息**：plannedPickupDate、lastFreeDate、lastReturnDate、returnTime
- **供应商信息**：supplierNames（包含customsBrokerName、truckingCompanyName、warehouseName、returnTerminalName）
- **关联数据**：portOperations、truckingTransports、warehouseOperations、emptyReturns

#### 2. 数据来源
| 数据类型 | 来源表 | 用途 |
|---------|--------|------|
| 订单信息 | biz_replenishment_orders | 提供订单号、出运日期等 |
| 港口操作 | process_port_operations | 计算物流状态、到港时间等 |
| 海运信息 | process_sea_freight | 提供目的地、提单号等 |
| 拖卡运输 | process_trucking_transport | 提供提柜计划等 |
| 仓库操作 | process_warehouse_operations | 提供仓库信息等 |
| 还空箱 | process_empty_return | 提供还箱信息等 |
| 字典数据 | 多个字典表 | 提供供应商名称等 |

### 三、Enrich的价值与意义

#### 1. 数据整合价值
- **一站式数据**：将分散在多个表中的数据整合到一个对象中
- **标准化结构**：为前端提供统一的数据结构，简化前端开发
- **业务语义**：添加业务语义信息，如物流状态、当前位置等

#### 2. 性能优化价值
- **批量查询**：减少数据库往返次数，提高查询效率
- **并行处理**：充分利用异步并发，减少处理时间
- **缓存友好**：结构化的数据更适合缓存

#### 3. 业务逻辑价值
- **状态计算**：统一计算物流状态，确保状态判断的一致性
- **位置计算**：基于多源数据计算当前位置
- **缺省约定**：为缺失数据提供合理的默认值，如"{国家}清关行"
- **字段标准化**：统一字段命名和格式，减少前端处理逻辑

#### 4. 代码复用价值
- **统一逻辑**：集中处理数据增强逻辑，避免代码重复
- **多场景支持**：支持列表、统计、详情等多种场景
- **易于维护**：逻辑集中，便于后续修改和扩展

### 四、使用场景

#### 1. 货柜列表页面
- **数据展示**：提供完整的货柜信息，支持表格展示
- **筛选排序**：基于增强字段进行筛选和排序
- **状态显示**：展示物流状态和当前位置

#### 2. 统计查询
- **数据分析**：基于增强字段进行统计分析
- **报表生成**：为报表提供完整数据

#### 3. 货柜详情页面
- **详细信息**：展示货柜的完整信息和关联数据
- **状态追踪**：展示物流状态的详细历史

#### 4. 甘特图展示
- **时间维度**：基于计划提柜日、最晚提柜日等字段
- **分组展示**：基于供应商名称等字段进行分组

### 五、技术实现要点

#### 1. 批量查询策略
- **收集主键**：收集所有货柜号，避免N+1查询
- **并行执行**：使用Promise.all并行处理多个查询
- **结果映射**：将结果转换为Map，提高查找效率

#### 2. 状态计算逻辑
- **多维度判断**：综合考虑港口操作、海运信息、拖卡运输等
- **优先级处理**：按照业务规则确定状态判断的优先级
- **异常处理**：优雅处理数据缺失情况

#### 3. 数据质量保证
- **缺省值处理**：为缺失数据提供合理的默认值
- **数据验证**：验证数据的完整性和一致性
- **错误处理**：单个货柜处理失败不影响整体流程

### 六、性能指标

- **处理速度**：处理100个货柜约需100-200ms
- **查询次数**：固定10次批量查询，与货柜数量无关
- **内存使用**：线性增长，适合处理大量数据

### 七、最佳实践

#### 1. 调用方式
- **列表查询**：先分页再enrich，减少处理数据量
- **详情查询**：直接enrich单个货柜
- **统计查询**：根据需要选择是否enrich

#### 2. 数据预加载
- **seaFreight**：使用leftJoinAndSelect预加载，确保enrich时可用
- **其他关联**：通过批量查询获取，避免N+1问题

#### 3. 扩展建议
- **缓存机制**：对于频繁访问的数据，考虑添加缓存
- **按需enrich**：根据不同场景，选择性地执行部分enrich逻辑
- **监控指标**：添加性能监控，及时发现性能问题

通过enrich逻辑，系统能够为前端和其他服务提供完整、一致、有业务语义的数据，同时保持良好的性能表现。这是现代后端服务中数据处理的重要实践之一。
`
  }
];

export default knowledgeBase;