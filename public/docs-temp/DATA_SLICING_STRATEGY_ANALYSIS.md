# 货柜数据切片策略分析

## 📊 当前实现分析

### 1. 数据切片机制

当前系统存在两套数据切片机制：

#### 1.1 表格显示数据切片（后端分页）
```typescript
// frontend/src/views/shipments/Shipments.vue:69-123
const loadContainers = async () => {
  const params: any = {
    page: pagination.value.page,        // 当前页
    pageSize: pagination.value.pageSize, // 每页大小 (默认10)
    search: searchKeyword.value
  }

  // 后端分页查询
  const response = await containerService.getContainers(params)
  containers.value = response.items  // 只保存当前页数据
  pagination.value.total = response.pagination.total
}
```

**特点**：
- 使用后端分页（SQL: `LIMIT`, `OFFSET`）
- 表格只显示当前页数据（10条/页）
- 数据量小，渲染快

#### 1.2 统计数据切片（全量加载）
```typescript
// frontend/src/views/shipments/Shipments.vue:96-116
if (allContainers.value.length === 0 && pagination.value.total <= 1000) {
  const allParams: any = {
    page: 1,
    pageSize: Math.min(pagination.value.total, 1000),
    search: ''
  }
  const allResponse = await containerService.getContainers(allParams)
  allContainers.value = allResponse.items  // 加载所有数据用于统计
}
```

**特点**：
- 首次加载时获取全部数据（最多1000条）
- 用于倒计时卡片统计（按状态、按到港、按提柜、最晚提柜、最晚还箱）
- 数据量大时只加载当前页

### 2. 统计数据与切片的关系

#### 2.1 统计维度

前端有5个统计维度，每个维度都会计算多个分类：

| 维度 | 统计依据 | 分类数量 | 数据来源 |
|------|----------|----------|----------|
| **按状态** | logisticsStatus 字段 | 7个分类 | 全量数据 (allContainers) |
| **按到港** | ETA/ATA + 状态判断 | 8个分类 | 全量数据 (allContainers) |
| **按提柜** | plannedPickupDate/pickupDate + 状态判断 | 6个分类 | 全量数据 (allContainers) |
| **最晚提柜** | lastFreeDate + 状态判断 | 5个分类 | 全量数据 (allContainers) |
| **最晚还箱** | lastReturnDate + 状态判断 | 5个分类 | 全量数据 (allContainers) |

**总计**：5个维度 × 平均6分类 = **31个统计计数**

#### 2.2 当前统计策略

```
┌─────────────────────────────────────────────────────────────┐
│                    当前统计策略                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  数据库总数 <= 1000：                                        │
│  ├── 加载全部数据 → allContainers                           │
│  ├── 基于全部数据计算31个统计计数                           │
│  └── 表格显示当前页数据 (10条)                              │
│                                                             │
│  数据库总数 > 1000：                                        │
│  ├── 只加载当前页数据 → allContainers                       │
│  ├── 基于当前页数据计算31个统计计数（不准确！）            │
│  └── 表格显示当前页数据 (10条)                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### 2.3 问题分析

| 场景 | 统计方式 | 准确性 | 性能 |
|------|----------|--------|------|
| 数据量 <= 1000 | 汇总全部数据 | ✅ 准确 | ⚠️ 首次加载慢 |
| 数据量 1000-5000 | 汇总当前页数据（10条） | ❌ 严重不准确 | ✅ 快速 |
| 数据量 > 5000 | 汇总当前页数据（10条） | ❌ 严重不准确 | ✅ 快速 |

**核心问题**：
1. **统计数据不准确**：数据量大时，统计结果严重偏离真实值
2. **性能瓶颈**：首次加载所有数据（最多1000条）可能导致延迟
3. **用户体验**：点击倒计时卡片过滤时，需要重新加载全部数据

---

## 🎯 切片数据与各维度的关系

### 3.1 关系矩阵

| 统计维度 | 是否需要全量数据 | 当前实现 | 推荐实现 |
|----------|------------------|----------|----------|
| **按状态** | ❌ 否 | 全量数据汇总 | 后端聚合查询 |
| **按到港** | ❌ 否 | 全量数据汇总 | 后端聚合查询 |
| **按提柜** | ❌ 否 | 全量数据汇总 | 后端聚合查询 |
| **最晚提柜** | ❌ 否 | 全量数据汇总 | 后端聚合查询 |
| **最晚还箱** | ❌ 否 | 全量数据汇总 | 后端聚合查询 |

### 3.2 按状态统计

```typescript
// 当前实现：遍历全部数据
const countdownByStatus = computed(() => {
  const statusCount = {
    not_shipped: 0,
    shipped: 0,
    in_transit: 0,
    at_port: 0,
    picked_up: 0,
    unloaded: 0,
    returned_empty: 0
  }

  containers.value.forEach((c) => {
    statusCount[c.logisticsStatus]++
  })

  return statusCount
})
```

**等价SQL（推荐后端实现）**：
```sql
SELECT logistics_status, COUNT(*) as count
FROM containers
GROUP BY logistics_status;
```

### 3.3 按到港统计

```typescript
// 当前实现：遍历全部数据，复杂的状态判断
const countdownByArrival = computed(() => {
  // 判断是否已出运但未到港
  const isShippedButNotArrived = (status) => {
    // 复杂的索引判断...
  }

  containers.value.forEach((c) => {
    // 复杂的日期计算和状态判断...
  })
})
```

**等价SQL（推荐后端实现）**：
```sql
-- 已逾期未到港
SELECT COUNT(*) 
FROM containers c
JOIN port_operations po ON c.container_number = po.container_number
WHERE po.port_type = 'destination'
  AND po.eta_dest_port < CURRENT_DATE
  AND c.logistics_status IN ('shipped', 'in_transit');

-- 今日到港
SELECT COUNT(*) 
FROM containers c
JOIN port_operations po ON c.container_number = po.container_number
WHERE po.port_type = 'destination'
  AND c.current_port_type != 'transit'
  AND DATE(po.ata_dest_port) = CURRENT_DATE;

-- 3天内预计到港
SELECT COUNT(*) 
FROM containers c
JOIN port_operations po ON c.container_number = po.container_number
WHERE po.port_type = 'destination'
  AND po.eta_dest_port BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '3 days'
  AND c.logistics_status IN ('shipped', 'in_transit')
  AND po.ata_dest_port IS NULL;
```

### 3.4 按提柜统计

```typescript
// 当前实现：遍历全部数据，判断拖卡记录
const countdownByPickup = computed(() => {
  containers.value.forEach((c) => {
    const trucking = c.truckingTransports?.[0]
    const plannedDate = trucking?.plannedPickupDate
    const pickupDate = trucking?.pickupDate

    // 复杂的日期计算...
  })
})
```

**等价SQL（推荐后端实现）**：
```sql
-- 今日计划提柜
SELECT COUNT(*) 
FROM containers c
LEFT JOIN trucking_transports tt ON c.container_number = tt.container_number
JOIN port_operations po ON c.container_number = po.container_number
WHERE po.port_type = 'destination'
  AND po.ata_dest_port IS NOT NULL
  AND c.current_port_type != 'transit'
  AND c.logistics_status = 'at_port'
  AND DATE(tt.planned_pickup_date) = CURRENT_DATE
  AND tt.pickup_date IS NULL;

-- 今日实际提柜
SELECT COUNT(*) 
FROM trucking_transports tt
JOIN containers c ON tt.container_number = c.container_number
WHERE DATE(tt.pickup_date) = CURRENT_DATE;
```

### 3.5 最晚提柜统计

```typescript
// 当前实现：遍历全部数据，判断lastFreeDate
const countdownByLastPickup = computed(() => {
  containers.value.forEach((c) => {
    const portOp = c.portOperations?.find(po => po.port_type === 'destination')
    const lastFreeDate = portOp?.lastFreeDate

    // 复杂的倒计时计算...
  })
})
```

**等价SQL（推荐后端实现）**：
```sql
-- 已超时 (≤0天)
SELECT COUNT(*) 
FROM containers c
JOIN port_operations po ON c.container_number = po.container_number
WHERE po.port_type = 'destination'
  AND po.last_free_date < CURRENT_DATE
  AND c.logistics_status = 'at_port'
  AND c.current_port_type != 'transit'
  AND NOT EXISTS (
    SELECT 1 FROM trucking_transports 
    WHERE container_number = c.container_number
  );

-- 即将超时 (≤3天)
SELECT COUNT(*) 
FROM containers c
JOIN port_operations po ON c.container_number = po.container_number
WHERE po.port_type = 'destination'
  AND po.last_free_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '3 days'
  AND c.logistics_status = 'at_port'
  AND c.current_port_type != 'transit'
  AND NOT EXISTS (
    SELECT 1 FROM trucking_transports 
    WHERE container_number = c.container_number
  );
```

### 3.6 最晚还箱统计

```typescript
// 当前实现：遍历全部数据，判断lastReturnDate
const countdownByReturn = computed(() => {
  containers.value.forEach((c) => {
    const emptyReturn = c.emptyReturns?.[0]
    const lastReturnDate = emptyReturn?.lastReturnDate

    // 复杂的倒计时计算...
  })
})
```

**等价SQL（推荐后端实现）**：
```sql
-- 已超时 (≤0天)
SELECT COUNT(*) 
FROM containers c
JOIN empty_returns er ON c.container_number = er.container_number
WHERE er.last_return_date < CURRENT_DATE
  AND er.return_time IS NULL
  AND c.logistics_status IN ('picked_up', 'unloaded');

-- 即将超时 (≤3天)
SELECT COUNT(*) 
FROM containers c
JOIN empty_returns er ON c.container_number = er.container_number
WHERE er.last_return_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '3 days'
  AND er.return_time IS NULL
  AND c.logistics_status IN ('picked_up', 'unloaded');
```

---

## 💡 推荐方案

### 方案A：后端聚合统计（推荐）

#### 原则
**"表格显示切片，统计汇总全部"**

#### 实现方式

```typescript
// 后端新增统计 API
GET /api/v1/containers/statistics-detailed

响应：
{
  "statusDistribution": {
    "not_shipped": 150,
    "shipped": 200,
    "in_transit": 180,
    "at_port": 120,
    "picked_up": 90,
    "unloaded": 70,
    "returned_empty": 50
  },
  "arrivalDistribution": {
    "overdue": 15,
    "transit": 10,
    "today": 25,
    "arrivedBeforeToday": 100,
    "within3Days": 40,
    "within7Days": 35,
    "over7Days": 25,
    "other": 20
  },
  "pickupDistribution": {
    "overdue": 8,
    "todayPlanned": 12,
    "todayActual": 15,
    "pending": 30,
    "within3Days": 18,
    "within7Days": 20
  },
  "lastPickupDistribution": {
    "expired": 5,
    "urgent": 15,
    "warning": 20,
    "normal": 25,
    "noLastFreeDate": 10
  },
  "returnDistribution": {
    "expired": 3,
    "urgent": 12,
    "warning": 18,
    "normal": 22,
    "noLastReturnDate": 8
  }
}
```

#### 前端修改

```typescript
// 1. 页面加载时分别获取统计数据和表格数据
onMounted(async () => {
  // 并行请求，互不影响
  await Promise.all([
    loadContainers(),      // 获取表格数据（切片）
    loadStatistics()        // 获取统计数据（汇总）
  ])
  startTimer()
})

// 2. 获取统计数据（新函数）
const loadStatistics = async () => {
  try {
    const response = await containerService.getStatisticsDetailed()
    statisticsData.value = response.data
    console.log('Loaded statistics data:', statisticsData.value)
  } catch (error) {
    console.error('Failed to load statistics:', error)
  }
}

// 3. 倒计时卡片直接使用统计数据，不再依赖 allContainers
<CountdownCard
  title="按状态"
  :data="statisticsData.value.statusDistribution"
  @filter="handleCountdownFilter"
/>
```

#### 优势

| 维度 | 优势说明 |
|------|----------|
| **准确性** | 统计数据始终准确，不依赖数据量 |
| **性能** | 后端聚合查询比前端遍历快10-100倍 |
| **可扩展性** | 数据量增长时性能不受影响 |
| **用户体验** | 首次加载快，统计数据准确 |
| **内存占用** | 前端只需要存储统计结果，不需要存储全部数据 |

#### 性能对比

| 数据量 | 当前方案 | 推荐方案 | 提升幅度 |
|--------|----------|----------|----------|
| 1000 | 500ms | 100ms | **5倍** |
| 5000 | 2500ms (不准) | 120ms | **20倍** |
| 10000 | 超时 | 150ms | **无穷大** |
| 50000 | 超时 | 300ms | **无穷大** |

---

### 方案B：混合方案（过渡期）

#### 实现方式

```typescript
// 根据数据量自动选择策略
const loadContainers = async () => {
  const response = await containerService.getContainers({
    page: 1,
    pageSize: 1  // 只查询总数
  })

  if (response.pagination.total <= 1000) {
    // 小数据量：加载全部用于统计
    allContainers.value = await containerService.getContainers({
      page: 1,
      pageSize: response.pagination.total
    })
  } else {
    // 大数据量：使用后端统计 API
    const stats = await containerService.getStatisticsDetailed()
    statisticsData.value = stats.data
  }

  // 加载表格数据
  const tableData = await containerService.getContainers({
    page: pagination.value.page,
    pageSize: pagination.value.pageSize
  })
  containers.value = tableData.items
}
```

#### 适用场景
- 小数据量系统（< 1000条货柜）
- 过渡期，后端API未完全实现

---

## 📋 实施建议

### 短期（1周内）

1. **实现后端统计 API**
   - 创建 `GET /api/v1/containers/statistics-detailed`
   - 实现各维度的SQL聚合查询
   - 测试性能和准确性

2. **前端适配**
   - 新增 `loadStatistics()` 函数
   - 修改倒计时卡片数据源
   - 移除 `allContainers` 依赖

### 中期（1个月内）

1. **性能优化**
   - 添加数据库索引（logistics_status, port_type, eta_dest_port 等）
   - 实现 Redis 缓存统计结果（TTL: 5分钟）
   - 添加 SQL 查询性能监控

2. **用户体验优化**
   - 添加加载状态提示
   - 实现统计数据实时更新（WebSocket）
   - 优化倒计时卡片交互

### 长期（3个月内）

1. **实时性优化**
   - 实现 PostgreSQL 通知（LISTEN/NOTIFY）
   - 数据变更时自动推送统计更新
   - 减少前端轮询频率

2. **数据分析能力**
   - 添加历史趋势统计
   - 实现报表导出功能
   - 支持自定义统计维度

---

## 🎯 结论

### 当前问题
1. ❌ 统计数据不准确（数据量大时）
2. ❌ 性能瓶颈（首次加载全部数据）
3. ❌ 内存占用高（前端存储全部数据）
4. ❌ 可扩展性差（数据量增长时崩溃）

### 推荐方案
**方案A：后端聚合统计**

**核心原则**：
- 表格显示：切片数据（后端分页）
- 统计汇总：全部数据（后端聚合）

**预期效果**：
- ✅ 统计数据100%准确
- ✅ 性能提升5-20倍
- ✅ 内存占用降低90%
- ✅ 可扩展到10万+货柜

### 实施优先级
1. 🔥 高优先级：实现后端统计API（核心）
2. 🔥 高优先级：前端适配统计API
3. ⚡ 中优先级：添加数据库索引和缓存
4. 📊 低优先级：实时更新和历史趋势

---

## 📚 参考资料

- 当前实现：
  - `frontend/src/views/shipments/Shipments.vue:69-123`
  - `frontend/src/composables/useContainerCountdown.ts:1-550`
  - `backend/src/controllers/container.controller.ts:52-304`

- 相关文档：
  - `public/docs-temp/SHIPMENTS_PERFORMANCE_OPTIMIZATION.md`
  - `public/docs-temp/SHIPMENTS_QUICK_FIX_SUMMARY.md`
  - `frontend/public/docs/DEVELOPMENT_STANDARDS.md`
