# 货柜列表页面性能优化分析与实施方案

## 📊 当前性能问题分析

### 1. 严重性能问题

#### 1.1 重复加载全部数据（最严重）
**位置**: `Shipments.vue:78-96`
```typescript
// 加载所有货柜数据（用于统计，不带分页）
if (allContainers.value.length === 0) {
  const allParams: any = {
    page: 1,
    pageSize: 999999,  // ❌ 每次都加载所有数据
    search: ''
  }
  const allResponse = await containerService.getContainers(allParams)
  allContainers.value = allResponse.items
}
```

**问题**:
- 首次加载时，一次性获取所有货柜数据（可能数千条）
- 后端需要查询并处理所有数据，包括关联的港口操作、拖卡运输、仓库操作等
- 网络传输大量数据，浪费带宽
- 前端内存占用高

**影响**:
- 页面首次加载慢（可能 3-10 秒）
- 服务器压力大
- 内存占用高（每个货柜包含大量关联数据）

#### 1.2 高频计算开销
**位置**: `useContainerCountdown.ts`
```typescript
// 每秒触发 5 个 computed 计算倒计时
const startTimer = () => {
  timer = window.setInterval(() => {
    currentTime.value = new Date()  // 每秒更新，触发所有 computed 重新计算
  }, 1000)
}
```

**问题**:
- 5 个 `computed` 属性（`countdownByArrival`, `countdownByPickup`, `countdownByLastPickup`, `countdownByReturn`, `countdownByStatus`）
- 每个 computed 遍历所有货柜数据（可能有数千条）
- 每秒都执行 5 次完整遍历
- 复杂的日期计算和条件判断

**计算复杂度**: O(n) × 5 × 60 = O(300n) 每分钟
- 假设 1000 个货柜：每分钟执行 150 万次计算
- 假设 5000 个货柜：每分钟执行 750 万次计算

#### 1.3 前端过滤分页
**位置**: `Shipments.vue:106-136`
```typescript
const loadContainersByFilter = async () => {
  const params: any = {
    page: 1,
    pageSize: 999999,  // ❌ 加载所有数据
    search: searchKeyword.value
  }
  const response = await containerService.getContainers(params)
  // 在前端进行过滤和分页
  containers.value = filterContainersByCondition(response.items, ...)
}
```

**问题**:
- 点击倒计时卡片筛选时，加载所有数据
- 前端执行复杂的过滤逻辑（`filterContainersByCondition` 函数 189 行）
- 分页在前端进行，浪费已加载但未显示的数据

### 2. 次要性能问题

#### 2.1 重复计算
**位置**: `Shipments.vue`
- `getRemainingTime` 函数在多个地方重复定义
- 状态判断函数重复定义

#### 2.2 无优化的事件监听
- 搜索框没有使用防抖
- 分页改变立即触发请求

#### 2.3 模板中的重复计算
```vue
<template>
  {{ formatDate(row.etaDestPort) }}
  {{ formatDate(row.ataDestPort) }}
  {{ formatDate(row.lastUpdated) }}
  <!-- 多次调用 formatDate -->
</template>
```

## 🎯 优化方案

### 方案一：后端统计 API（推荐，彻底解决）

#### 1.1 创建后端统计 API

**新建文件**: `backend/src/controllers/containerStatistics.controller.ts`
```typescript
import { Request, Response } from 'express';
import { AppDataSource } from '../database';
import { Container } from '../entities/Container';
import { PortOperation } from '../entities/PortOperation';
import { TruckingTransport } from '../entities/TruckingTransport';
import { EmptyReturn } from '../entities/EmptyReturn';

/**
 * 获取货柜统计数据
 * 只返回统计结果，不返回所有货柜数据
 */
export const getContainerStatistics = async (req: Request, res: Response) => {
  try {
    const containerRepo = AppDataSource.getRepository(Container);
    const portOpRepo = AppDataSource.getRepository(PortOperation);
    const truckingRepo = AppDataSource.getRepository(TruckingTransport);
    const emptyReturnRepo = AppDataSource.getRepository(EmptyReturn);

    // 获取所有货柜的基础数据（不包含关联数据）
    const containers = await containerRepo
      .createQueryBuilder('c')
      .select(['c.containerNumber', 'c.logisticsStatus', 'c.currentPortType'])
      .getMany();

    // 在数据库层面执行统计查询
    const statistics = {
      // 按状态统计
      byStatus: await containerRepo
        .createQueryBuilder('c')
        .select('c.logisticsStatus', 'status')
        .addSelect('COUNT(*)', 'count')
        .groupBy('c.logisticsStatus')
        .getRawMany(),

      // 按到港统计
      byArrival: await getArrivalStatistics(),

      // 按提柜统计
      byPickup: await getPickupStatistics(),

      // 按最晚提柜统计
      byLastPickup: await getLastPickupStatistics(),

      // 按最晚还箱统计
      byReturn: await getReturnStatistics()
    };

    res.json({
      code: 200,
      message: 'success',
      data: statistics
    });
  } catch (error) {
    console.error('Failed to get container statistics:', error);
    res.status(500).json({
      code: 500,
      message: '获取统计数据失败',
      data: null
    });
  }
};
```

#### 1.2 优化倒计时计算

**修改**: `frontend/src/composables/useContainerCountdown.ts`
```typescript
// 使用 API 返回的统计数据，不再前端计算
export function useContainerCountdown() {
  const statistics = ref<StatisticsData | null>(null)
  const loading = ref(false)

  const loadStatistics = async () => {
    loading.value = true
    try {
      const response = await containerStatisticsService.getStatistics()
      statistics.value = response.data
    } catch (error) {
      console.error('Failed to load statistics:', error)
    } finally {
      loading.value = false
    }
  }

  // 移除定时器，不再每秒计算
  // 使用 computed 属性展示统计数据即可

  return {
    countdownByArrival: computed(() => statistics.value?.byArrival || defaultData),
    countdownByPickup: computed(() => statistics.value?.byPickup || defaultData),
    countdownByLastPickup: computed(() => statistics.value?.byLastPickup || defaultData),
    countdownByReturn: computed(() => statistics.value?.byReturn || defaultData),
    countdownByStatus: computed(() => statistics.value?.byStatus || defaultData),
    loadStatistics,
    startTimer: () => loadStatistics(),
    stopTimer: () => {}
  }
}
```

#### 1.3 优化前端数据加载

**修改**: `frontend/src/views/shipments/Shipments.vue`
```typescript
// 只加载当前页数据，不加载全部数据用于统计
const loadContainers = async () => {
  loading.value = true
  try {
    const params: any = {
      page: pagination.value.page,
      pageSize: pagination.value.pageSize,
      search: searchKeyword.value
    }

    const response = await containerService.getContainers(params)
    containers.value = response.items
    pagination.value.total = response.pagination.total || 0

    // ✅ 移除加载所有数据的代码
    // 统计数据通过专门的 API 获取
  } catch (error) {
    console.error('Failed to load containers:', error)
    ElMessage.error('获取集装箱列表失败')
  } finally {
    loading.value = false
  }
}
```

### 方案二：前端缓存优化（轻量级）

如果无法修改后端，可以采用以下前端优化：

#### 2.1 使用虚拟滚动

**安装**:
```bash
npm install vue-virtual-scroller
```

**使用**:
```vue
<template>
  <RecycleScroller
    class="scroller"
    :items="filteredContainers"
    :item-size="60"
    key-field="containerNumber"
    v-slot="{ item }"
  >
    <!-- 表格行模板 -->
  </RecycleScroller>
</template>
```

#### 2.2 使用防抖和节流

**修改**: `frontend/src/views/shipments/Shipments.vue`
```typescript
import { useDebounceFn, useThrottleFn } from '@vueuse/core'

// 搜索防抖（500ms）
const debouncedSearch = useDebounceFn(handleSearch, 500)

// 分页节流（300ms）
const throttledPageChange = useThrottleFn(handlePageChange, 300)
```

#### 2.3 使用 shallowRef 减少响应式开销

**修改**: `frontend/src/views/shipments/Shipments.vue`
```typescript
// 将 containers 改为 shallowRef，减少深度响应式开销
import { shallowRef } from 'vue'

const containers = shallowRef<any[]>([])
const allContainers = shallowRef<any[]>([])
```

#### 2.4 使用 computed 缓存计算结果

```typescript
// 缓存格式化日期
const formattedDateMap = computed(() => {
  const map = new Map<string, string>()
  containers.value.forEach(c => {
    if (c.etaDestPort) {
      map.set(`${c.containerNumber}-eta`, formatDate(c.etaDestPort))
    }
    if (c.ataDestPort) {
      map.set(`${c.containerNumber}-ata`, formatDate(c.ataDestPort))
    }
  })
  return map
})
```

### 方案三：混合优化（推荐作为过渡）

结合前端和后端优化：

1. **短期（立即可实施）**:
   - 前端使用防抖和节流
   - 使用 shallowRef 减少响应式开销
   - 移除不必要的计算
   - 优化倒计时计算频率（改为 10 秒或 30 秒）

2. **中期（1-2 周）**:
   - 创建后端统计 API
   - 优化后端查询（使用索引、优化 JOIN）
   - 实现前端虚拟滚动

3. **长期（1 个月+）**:
   - 使用 WebSocket 实现实时统计
   - 使用 Redis 缓存统计数据
   - 实现增量更新

## 📈 性能对比预估

### 当前性能
- **首次加载**: 3-10 秒（取决于数据量）
- **内存占用**: 50-200 MB（取决于数据量）
- **CPU 占用**: 持续占用（每秒计算）
- **网络流量**: 首次 500KB-5MB

### 方案一优化后（后端统计）
- **首次加载**: 0.5-1 秒
- **内存占用**: 10-30 MB
- **CPU 占用**: 几乎为 0
- **网络流量**: 首次 50-200KB

### 方案二优化后（前端优化）
- **首次加载**: 2-5 秒
- **内存占用**: 30-100 MB
- **CPU 占用**: 降低 50-70%
- **网络流量**: 首次 500KB-5MB（不变）

### 方案三优化后（混合）
- **首次加载**: 1-3 秒
- **内存占用**: 20-60 MB
- **CPU 占用**: 降低 70-80%
- **网络流量**: 首次 200KB-2MB

## 🛠️ 实施步骤

### 第一步：立即优化（方案二，前端优化）

#### 1. 安装依赖
```bash
npm install @vueuse/core
```

#### 2. 修改 `Shipments.vue`
- 使用 `shallowRef` 替代 `ref`
- 添加防抖和节流
- 优化倒计时计算频率

#### 3. 修改 `useContainerCountdown.ts`
- 将定时器从 1 秒改为 10 秒或 30 秒
- 使用 `shallowRef` 存储数据
- 优化计算逻辑

#### 4. 测试
- 测试页面加载速度
- 测试内存占用
- 测试 CPU 占用

### 第二步：中期优化（方案一，后端统计）

#### 1. 创建后端统计控制器
- 创建 `backend/src/controllers/containerStatistics.controller.ts`
- 创建 `backend/src/routes/containerStatistics.routes.ts`

#### 2. 实现统计 API
- 实现按状态统计
- 实现按到港统计
- 实现按提柜统计
- 实现按最晚提柜统计
- 实现按最晚还箱统计

#### 3. 修改前端
- 创建 `frontend/src/api/containerStatistics.ts`
- 修改 `useContainerCountdown.ts` 使用 API 数据
- 修改 `Shipments.vue` 移除全量数据加载

#### 4. 测试
- 测试 API 响应时间
- 测试统计准确性
- 测试页面性能

### 第三步：长期优化

#### 1. 实现虚拟滚动
- 安装 `vue-virtual-scroller`
- 实现表格虚拟滚动

#### 2. 实现缓存
- 使用 Redis 缓存统计数据
- 设置合理的过期时间（如 5 分钟）

#### 3. 实现 WebSocket
- 使用 WebSocket 推送实时更新
- 减少轮询请求

## 📝 注意事项

### 1. 数据一致性
- 确保统计数据与实际数据一致
- 实现数据刷新机制

### 2. 用户体验
- 优化期间确保功能正常
- 添加加载状态提示

### 3. 兼容性
- 确保优化后的代码向后兼容
- 提供降级方案

### 4. 监控
- 实施后监控性能指标
- 持续优化

## 🎯 优先级建议

### 高优先级（立即实施）
1. ✅ 使用 shallowRef 减少响应式开销
2. ✅ 添加防抖和节流
3. ✅ 优化倒计时计算频率（改为 10 秒）
4. ✅ 移除重复计算的函数

### 中优先级（1 周内）
1. ✅ 创建后端统计 API
2. ✅ 修改前端使用统计 API
3. ✅ 移除全量数据加载

### 低优先级（1 个月内）
1. ⚠️ 实现虚拟滚动
2. ⚠️ 实现 Redis 缓存
3. ⚠️ 实现 WebSocket

## 📚 参考资源

- [Vue 性能优化官方文档](https://vuejs.org/guide/best-practices/performance.html)
- [VueUse - 防抖节流](https://vueuse.org/core/useDebounceFn/)
- [虚拟滚动最佳实践](https://github.com/Akryum/vue-virtual-scroller)
- [后端性能优化指南](https://nodejs.org/en/docs/guides/simple-profiling/)

## 变更日志

- 2026-02-28: 创建性能优化分析文档
- 2026-02-28: 提供三种优化方案
- 2026-02-28: 制定实施步骤和优先级
