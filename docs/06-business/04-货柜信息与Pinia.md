# 货柜信息与 Pinia

LogiX 货柜数据管理与 Pinia 状态管理设计。

## 一、货柜核心概念

### 1.1 数据结构

货柜（Container）是物流核心实体，主键为 `container_number`（集装箱号）：

```sql
-- 核心表
biz_containers (货柜表)
process_sea_freight (海运表)
process_port_operations (港口操作表)
process_trucking_transport (拖卡运输表)
process_warehouse_operations (仓库操作表)
process_empty_returns (还空箱表)
```

### 1.2 核心字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `container_number` | varchar(100) | 集装箱号（主键） |
| `order_number` | varchar(100) | 备货单号（外键） |
| `container_type_code` | varchar(50) | 柜型编码 |
| `logistics_status` | varchar(20) | 物流状态 |
| `gantt_derived` | jsonb | 甘特派生快照 |
| `schedule_status` | varchar(20) | 排产状态 |
| `inspection_required` | boolean | 是否查验 |
| `is_unboxing` | boolean | 是否开箱 |

### 1.3 关联数据

```typescript
interface Container {
  order?: ReplenishmentOrder;
  seaFreight?: SeaFreight;
  portOperations?: PortOperation[];
  truckingTransports?: TruckingTransport[];
  warehouseOperations?: WarehouseOperation[];
  emptyReturns?: EmptyReturn[];
  demurrageSummary?: { /* 滞港费汇总 */ };
}
```

## 二、Pinia Store 设计

### 2.1 应用全局状态（app Store）

**文件**：`store/app.ts`

```typescript
export const useAppStore = defineStore('app', () => {
  const scopedCountryCode = ref<string | null>(null)
  
  function setScopedCountryCode(code: string | null) {
    scopedCountryCode.value = normalizeCountryCode(code)
    // 持久化到 localStorage
  }
  
  return { scopedCountryCode, setScopedCountryCode }
})
```

**用途**：全局国家筛选，货柜数据按国家过滤。

**持久化**：`logix_scoped_country_code` → localStorage

### 2.2 甘特筛选状态（ganttFilters Store）

**文件**：`store/ganttFilters.ts`

```typescript
export interface GanttFilterState {
  startDate: string
  endDate: string
  filterCondition: string
  filterLabel: string
  selectedContainers: string[]
  timeDimension: 'arrival' | 'pickup' | 'lastPickup' | 'return'
}

export const useGanttFilterStore = defineStore('ganttFilters', () => {
  const startDate = ref('')
  const endDate = ref('')
  const filterCondition = ref('')
  const filterLabel = ref('')
  const selectedContainers = ref<string[]>([])
  const timeDimension = ref<'arrival' | 'pickup' | 'lastPickup' | 'return'>('arrival')
  
  function setFilters(filters: Partial<GanttFilterState>) { /* ... */ }
  function clearFilters() { /* ... */ }
  function initFromQuery(query: Record<string, any>) { /* ... */ }
  function inferTimeDimension() { /* ... */ }
  
  return {
    startDate, endDate, filterCondition, filterLabel,
    selectedContainers, timeDimension,
    setFilters, clearFilters, initFromQuery, inferTimeDimension
  }
})
```

**用途**：甘特图筛选条件管理，支持 URL 参数初始化和 localStorage 持久化。

**持久化**：`logix_gantt_filters` → localStorage

## 三、货柜服务（Container Service）

### 3.1 API 方法

**文件**：`services/container.ts`

| 方法 | 说明 |
|------|------|
| `getContainers(filters)` | 获取货柜列表（分页） |
| `getContainerById(id)` | 获取单个货柜详情 |
| `createContainer(data)` | 创建货柜 |
| `updateContainer(id, data)` | 更新货柜 |
| `deleteContainer(id)` | 删除货柜 |
| `getStatistics()` | 获取货柜统计 |
| `getStatisticsDetailed(params)` | 获取详细统计 |
| `getContainersByFilterCondition(condition)` | 按筛选条件获取货柜 |
| `writeBackDemurrageDatesForContainer(id)` | 写回滞港费日期 |
| `batchWriteBackDemurrageDates(params)` | 批量写回滞港费日期 |

### 3.2 请求拦截器

```typescript
this.api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  // 全局国家筛选
  const appStore = useAppStore()
  if (appStore.scopedCountryCode) {
    config.headers['X-Country-Code'] = appStore.scopedCountryCode
  }
  // 避免浏览器缓存
  config.headers['Cache-Control'] = 'no-cache'
  return config
})
```

## 四、Composables

### 4.1 useContainerDetail

**文件**：`composables/useContainerDetail.ts`

```typescript
export function useContainerDetail() {
  const route = useRoute()
  const router = useRouter()
  
  const containerNumber = computed(() => {
    const p = route.params.containerNumber as string
    return p ? decodeURIComponent(p) : ''
  })
  
  const containerData = ref<Container | null>(null)
  const loading = ref(false)
  
  const containerList = ref<ContainerListItem[]>([])
  const loadContainerList = async (retries = 2) => { /* ... */ }
  
  const demurrageCalculation = ref<any>(null)
  const loadDemurrageCalculation = async () => { /* ... */ }
  
  return {
    containerNumber, containerData, loading,
    containerList, loadContainerList,
    demurrageCalculation, loadDemurrageCalculation
  }
}
```

### 4.2 useContainerCountdown

**文件**：`composables/useContainerCountdown.ts`

```typescript
export function useContainerCountdown(statisticsData: Ref<{...}>) {
  const getCountdownInfo = (container: Container) => {
    // 计算倒计时信息
    // 返回：状态、剩余天数、超期天数等
  }
  
  return { getCountdownInfo }
}
```

## 五、甘特派生快照

### 5.1 数据结构

```typescript
export interface GanttDerivedNode {
  key: 'customs' | 'pickup' | 'unload' | 'return'
  taskRole: 'main' | 'dashed' | 'none'
  completed: boolean
  plannedDate?: string | null  // 计划日
  actualDate?: string | null   // 实际日
}

export interface GanttDerived {
  phase: 1 | 2 | 3 | 4 | 5
  phaseLabel: string
  primaryNode: GanttNodeKey | null
  nodes: GanttDerivedNode[]
  ruleVersion: string
  derivedAt: string
}
```

### 5.2 五阶段

| 阶段 | 标签 | 主节点 |
|------|------|--------|
| 1 | 清关 | customs |
| 2 | 提柜 | pickup |
| 3 | 卸柜 | unload |
| 4 | 还箱 | return |
| 5 | 完成 | - |

## 六、实施坑点

### 6.1 常见问题

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| 货柜列表为空 | 全局国家筛选导致 | 检查 scopedCountryCode |
| 数据不更新 | 浏览器缓存 | 拦截器添加 no-cache |
| 路由参数乱码 | URL 编码问题 | 使用 decodeURIComponent |
| 甘特图数据陈旧 | 快照未刷新 | 调用 rebuildGanttDerivedSnapshot |

### 6.2 排查步骤

1. 检查 localStorage 中的 `logix_scoped_country_code`
2. 检查请求头 `X-Country-Code`
3. 确认 containerService 拦截器配置
4. 检查 ganttFilters store 状态

## 七、复用组件

### 7.1 前端 Store

| 组件 | 文件 | 说明 |
|------|------|------|
| **useAppStore** | `store/app.ts` | 全局国家筛选 |
| **useGanttFilterStore** | `store/ganttFilters.ts` | 甘特筛选状态 |
| **useUserStore** | `store/user.ts` | 用户信息 |

### 7.2 服务层

| 组件 | 文件 | 说明 |
|------|------|------|
| **containerService** | `services/container.ts` | 货柜 API 服务 |
| **cacheManager** | `utils/cacheManager.ts` | 缓存管理 |

### 7.3 Composables

| 组件 | 文件 | 说明 |
|------|------|------|
| **useContainerDetail** | `composables/useContainerDetail.ts` | 货柜详情逻辑 |
| **useContainerCountdown** | `composables/useContainerCountdown.ts` | 货柜倒计时 |
| **useShipmentsSchedule** | `composables/useShipmentsSchedule.ts` | 排产逻辑 |

### 7.4 类型定义

| 类型 | 文件 | 说明 |
|------|------|------|
| **Container** | `types/container.ts` | 货柜完整类型 |
| **ContainerFilters** | `types/container.ts` | 筛选条件类型 |
| **ContainerResponse** | `types/container.ts` | API 响应类型 |
| **GanttDerived** | `types/container.ts` | 甘特派生类型 |

### 7.5 后端实体

| 实体 | 文件 | 说明 |
|------|------|------|
| **Container** | `entities/Container.ts` | 货柜实体 |
| **SeaFreight** | `entities/SeaFreight.ts` | 海运实体 |
| **PortOperation** | `entities/PortOperation.ts` | 港口操作实体 |
| **TruckingTransport** | `entities/TruckingTransport.ts` | 拖卡运输实体 |

## 八、数据流

```
用户操作 → Pinia Store → containerService → 后端 API
                ↓
         localStorage（持久化）
                ↓
         请求拦截器（添加 token + X-Country-Code）
```

**关键路径**：

1. **列表加载**：`getContainers()` → 分页筛选 → 响应
2. **详情加载**：`getContainerById()` → 关联数据展开
3. **筛选切换**：更新 ganttFilters store → 触发 watch → 重新请求
4. **国家切换**：更新 app store → 请求拦截器生效 → 数据过滤
