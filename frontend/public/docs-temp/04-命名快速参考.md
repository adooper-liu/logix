# LogiX 命名规范快速参考

## 📊 数据库表命名对照表

| 业务领域 | 表名 (snake_case) | 实体类名 (PascalCase) | 说明 |
|---------|-------------------|---------------------|------|
| **核心业务** | `biz_containers` | `Container` | 货柜表 |
| | `biz_replenishment_orders` | `ReplenishmentOrder` | 备货单表 |
| | `biz_customers` | `Customer` | 客户表 |
| **港口操作** | `port_operations` | `PortOperation` | 港口操作表 |
| **海运** | `sea_freights` | `SeaFreight` | 海运表 |
| **拖卡运输** | `process_trucking_transport` | `TruckingTransport` | 拖卡运输表 |
| **仓库操作** | `process_warehouse_operations` | `WarehouseOperation` | 仓库操作表 |
| **还空箱** | `empty_returns` | `EmptyReturn` | 还空箱表 |
| **费用** | `container_charges` | `ContainerCharge` | 滞港费记录 |
| | `container_hold_records` | `ContainerHoldRecord` | 柜态记录 |
| **字典表** | `dict_ports` | `DictPort` | 港口字典 |
| | `dict_shipping_companies` | `DictShippingCompany` | 船公司字典 |
| | `dict_container_types` | `DictContainerType` | 柜型字典 |
| | `dict_freight_forwarders` | `DictFreightForwarder` | 货代字典 |
| | `dict_customs_brokers` | `DictCustomsBroker` | 清关公司字典 |
| | `dict_trucking_companies` | `DictTruckingCompany` | 拖车公司字典 |
| | `dict_warehouses` | `DictWarehouse` | 仓库字典 |
| | `dict_customer_types` | `DictCustomerType` | 客户类型字典 |
| | `dict_overseas_companies` | `DictOverseasCompany` | 海外公司字典 |
| | `dict_countries` | `DictCountry` | 国家字典 |

## 🔤 字段命名转换示例

| 数据库字段 | 实体属性 | TypeScript 接口 | 前端变量 | CSS 类 |
|-----------|---------|----------------|---------|--------|
| `container_number` | `containerNumber` | `containerNumber` | `containerNumber` | `container-number` |
| `eta_dest_port` | `etaDestPort` | `etaDestPort` | `etaDestPort` | `eta-dest-port` |
| `ata_dest_port` | `ataDestPort` | `ataDestPort` | `ataDestPort` | `ata-dest-port` |
| `is_inspection_required` | `isInspectionRequired` | `isInspectionRequired` | `isInspectionRequired` | `is-inspection-required` |
| `port_sequence` | `portSequence` | `portSequence` | `portSequence` | `port-sequence` |
| `customs_status` | `customsStatus` | `customsStatus` | `customsStatus` | `customs-status` |
| `last_free_date` | `lastFreeDate` | `lastFreeDate` | `lastFreeDate` | `last-free-date` |

## 🎯 接口命名示例

```typescript
// 实体接口
export interface IContainer {
  containerNumber: string;
  orderNumber: string;
  containerTypeCode: string;
  logisticsStatus: LogisticsStatusEnum;
}

export interface IPortOperation {
  id: number;
  containerNumber: string;
  portType: PortTypeEnum;
  portSequence: number;
}

// DTO 接口
export interface ICreateContainerDto {
  containerNumber: string;
  orderNumber: string;
  containerTypeCode: string;
}

export interface IUpdateContainerDto {
  logisticsStatus?: LogisticsStatusEnum;
  isInspectionRequired?: boolean;
}

// 响应接口
export interface IApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface IPaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
```

## 📋 枚举命名示例

```typescript
// 物流状态（桑基图流转）
export enum LogisticsStatusEnum {
  NOT_SHIPPED = 'not_shipped',        // 未出运
  IN_TRANSIT = 'in_transit',           // 在途
  AT_PORT = 'at_port',                // 已到港
  PICKED_UP = 'picked_up',            // 已提柜
  UNLOADED = 'unloaded',              // 已卸柜
  RETURNED_EMPTY = 'returned_empty'   // 已还箱
}

// 港口类型
export enum PortTypeEnum {
  ORIGIN = 'origin',       // 起运港
  TRANSIT = 'transit',     // 中转港
  DESTINATION = 'destination' // 目的港
}

// 清关状态
export enum CustomsStatusEnum {
  PENDING = 'pending',           // 待清关
  CLEARED = 'cleared',           // 已清关
  HOLD = 'hold',                // 查验
  RELEASED = 'released'          // 放行
}
```

## 🎨 前端组件命名示例

```
src/views/
├── ContainerList.vue              # 货柜列表
├── ContainerDetail.vue            # 货柜详情
├── PortOperationsTab.vue          # 港口操作标签页
├── SankeyDiagram.vue              # 桑基图
├── LogisticsPath.vue              # 物流路径
└── HelpDocumentation.vue          # 帮助文档

src/components/
├── common/
│   ├── ContainerCard.vue          # 货柜卡片
│   ├── PortOperationTable.vue    # 港口操作表格
│   ├── CountdownCard.vue          # 倒计时卡片
│   └── StatusBadge.vue            # 状态徽章

composables/
├── useContainerData.ts            # 使用货柜数据
├── usePortOperations.ts          # 使用港口操作
├── useLogisticsPath.ts            # 使用物流路径
└── useCountdown.ts                # 使用倒计时
```

## 🔌 API 函数命名示例

```typescript
// src/api/containers.ts
export async function fetchContainerList(params: {
  page?: number;
  pageSize?: number;
  logisticsStatus?: LogisticsStatusEnum;
}): Promise<IPaginatedResponse<IContainer>> {
  // ...
}

export async function fetchContainerByNumber(
  containerNumber: string
): Promise<IContainer> {
  // ...
}

export async function createContainer(
  data: ICreateContainerDto
): Promise<IContainer> {
  // ...
}

export async function updateContainer(
  containerNumber: string,
  data: IUpdateContainerDto
): Promise<IContainer> {
  // ...
}

export async function deleteContainer(
  containerNumber: string
): Promise<void> {
  // ...
}

// src/api/portOperations.ts
export async function fetchPortOperations(
  containerNumber: string
): Promise<IPortOperation[]> {
  // ...
}

export async function updatePortOperation(
  id: number,
  data: Partial<IPortOperation>
): Promise<IPortOperation> {
  // ...
}
```

## 🎯 CSS 类命名示例

```vue
<template>
  <div class="container-card">
    <div class="container-header">
      <span class="container-number">{{ containerNumber }}</span>
      <span class="container-status">{{ logisticsStatus }}</span>
    </div>

    <div class="port-operation-section">
      <h3 class="section-title">港口操作</h3>
      <table class="port-operation-table">
        <!-- ... -->
      </table>
    </div>

    <div class="countdown-card">
      <div class="countdown-title">预计到港倒计时</div>
      <div class="countdown-value">{{ days }} 天</div>
    </div>
  </div>
</template>

<style scoped>
.container-card {
  padding: 16px;
  border-radius: 8px;
  background: white;
}

.container-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.container-number {
  font-weight: bold;
  font-size: 18px;
}

.port-operation-table {
  width: 100%;
  border-collapse: collapse;
}

.countdown-card {
  margin-top: 16px;
  padding: 12px;
  border-radius: 4px;
}
</style>
```

## ✅ 快速检查清单

### 提交代码前检查：

#### Backend
- [ ] 实体类名是 `PascalCase`（如 `Container`, `PortOperation`）
- [ ] 字典实体以 `Dict` 开头（如 `DictPort`, `DictShippingCompany`）
- [ ] 实体属性使用 `camelCase`（如 `containerNumber`, `etaDestPort`）
- [ ] 接口以 `I` 开头 + `PascalCase`（如 `IContainer`, `IPortOperation`）
- [ ] 类型以 `T` 开头 + `PascalCase`（如 `TLogisticsStatus`）
- [ ] 枚举以 `Enum` 结尾 + `PascalCase`（如 `LogisticsStatusEnum`）
- [ ] 常量使用 `UPPER_SNAKE_CASE`（如 `MAX_FREE_DAYS`）
- [ ] 函数使用 `camelCase`（如 `fetchContainerList`, `updatePortOperation`）

#### Frontend
- [ ] 组件文件名是 `PascalCase`（如 `ContainerList.vue`）
- [ ] 组合式函数使用 `use` + `PascalCase`（如 `useContainerData`）
- [ ] CSS 类名使用 `kebab-case`（如 `.container-card`, `.port-operation-table`）
- [ ] API 函数使用 `fetch/create/update/delete` + `PascalCase`
- [ ] Props 接口以 `Props` 结尾（如 `ContainerCardProps`）
- [ ] Emits 接口以 `Emits` 结尾（如 `ContainerCardEmits`）

## 🛠️ 运行 Lint 检查

```bash
# 检查所有命名规范
npm run lint:naming

# 只检查 Backend
npm run lint:naming:backend

# 只检查 Frontend
npm run lint:naming:frontend

# 自动修复（可修复部分问题）
npm run lint:fix
```

## 📚 详细文档

- 完整命名规范: `NAMING_CONVENTIONS.md`
- 代码规范: `CODE_STANDARDS.md`
- Lint 配置: `backend/.eslintrc.naming.js`, `frontend/.eslintrc.naming.js`
