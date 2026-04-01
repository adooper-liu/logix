# Pinia 状态管理完整指南

**版本**: v1.0  
**创建时间**: 2026-03-31  
**最后更新**: 2026-03-31  
**作者**: 刘志高

---

## 📋 概述

LogiX 使用 Pinia 作为 Vue 3 的状态管理库，主要管理两类状态：

1. **全局应用状态** (app Store): 国家筛选、用户信息
2. **功能特定状态** (ganttFilters Store): 甘特图筛选条件

### 核心价值

1. **响应式**: 基于 Vue 3 Composition API，自动追踪依赖
2. **持久化**: 关键状态保存到 localStorage，刷新不丢失
3. **类型安全**: 完整的 TypeScript 类型定义
4. **模块化**: 每个 Store 职责单一，易于维护

---

## 一、app Store（全局应用状态）

### 1.1 设计目标

**用途**: 管理全局国家筛选（按国家过滤货柜数据）

**业务场景**:

- 用户在 Shipments 页面选择"美国"
- 所有货柜列表、统计图表只显示美国相关数据
- 切换国家后，数据自动刷新

---

### 1.2 完整实现

```typescript
// frontend/src/store/app.ts

import { defineStore } from 'pinia'
import { ref } from 'vue'

const STORAGE_KEY = 'logix_scoped_country_code'

/**
 * 标准化国家代码
 * - 去除首尾空格
 * - 转大写
 * - 空字符串转为 null
 */
const normalizeCountryCode = (code: string | null): string | null => {
  if (typeof code !== 'string') return null
  const normalized = code.trim().toUpperCase()
  return normalized ? normalized : null
}

export const useAppStore = defineStore('app', () => {
  // ========== State ==========

  /**
   * 全局筛选国家代码
   * - null 表示不过滤（显示所有国家）
   * - 'US' 表示只看美国
   * - 'CA' 表示只看加拿大
   */
  const scopedCountryCode = ref<string | null>(
    (() => {
      // 从 localStorage 初始化
      try {
        const saved = localStorage.getItem(STORAGE_KEY)
        return normalizeCountryCode(saved)
      } catch {
        return null
      }
    })()
  )

  // ========== Actions ==========

  /**
   * 设置全局筛选国家代码
   * @param code - 国家代码（如 'US', 'CA'）或 null
   */
  function setScopedCountryCode(code: string | null) {
    const normalized = normalizeCountryCode(code)
    scopedCountryCode.value = normalized

    // 持久化到 localStorage
    try {
      if (normalized) {
        localStorage.setItem(STORAGE_KEY, normalized)
      } else {
        localStorage.removeItem(STORAGE_KEY)
      }
    } catch {
      // 忽略存储错误（隐私模式可能抛出）
    }
  }

  /**
   * 清除国家筛选（显示所有国家）
   */
  function clearScopedCountryCode() {
    scopedCountryCode.value = null
    localStorage.removeItem(STORAGE_KEY)
  }

  // ========== Return ==========

  return {
    // State
    scopedCountryCode,

    // Actions
    setScopedCountryCode,
    clearScopedCountryCode,
  }
})
```

---

### 1.3 使用示例

#### 在组件中使用

```vue
<!-- frontend/src/views/shipments/ShipmentsList.vue -->

<script setup lang="ts">
import { useAppStore } from '@/store/app'
import { computed } from 'vue'

const appStore = useAppStore()

// 读取当前筛选国家
const currentCountry = computed(() => appStore.scopedCountryCode)

// 切换国家
function switchToUSA() {
  appStore.setScopedCountryCode('US')
}

// 清除筛选
function clearFilter() {
  appStore.clearScopedCountryCode()
}
</script>

<template>
  <div>
    <p>当前筛选：{{ currentCountry || '全部国家' }}</p>
    <button @click="switchToUSA">只看美国</button>
    <button @click="clearFilter">清除筛选</button>
  </div>
</template>
```

---

#### 在 Service 中使用（请求拦截器）

```typescript
// frontend/src/services/container.ts

import { useAppStore } from '@/store/app'

class ContainerService {
  private api: AxiosInstance

  constructor() {
    this.api = axios.create({
      baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api/v1',
      timeout: 120000,
    })

    // 请求拦截器
    this.api.interceptors.request.use(config => {
      // 1. Token 认证
      const token = localStorage.getItem('token')
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }

      // 2. ⭐ 全局国家筛选 ⭐
      const appStore = useAppStore()
      if (appStore.scopedCountryCode) {
        config.headers['X-Country-Code'] = appStore.scopedCountryCode
      }

      // 3. 避免浏览器缓存
      if (config.method?.toLowerCase() === 'get') {
        config.headers['Cache-Control'] = 'no-cache'
        config.headers['Pragma'] = 'no-cache'
      }

      return config
    })
  }
}
```

---

### 1.4 后端对接

#### 中间件读取国家代码

```typescript
// backend/src/middleware/scopedCountry.middleware.ts

import { Request, Response, NextFunction } from 'express'

export function scopedCountryMiddleware(req: Request, res: Response, next: NextFunction) {
  // 从请求头读取国家代码
  const countryCode = req.headers['x-country-code'] as string | undefined

  if (countryCode) {
    // 写入请求上下文
    ;(req as any).scopedCountryCode = countryCode.toUpperCase()

    console.log(`[ScopedCountry] 启用国家筛选：${countryCode.toUpperCase()}`)
  }

  next()
}
```

---

#### 在查询中使用

```typescript
// backend/src/services/container.service.ts

async getContainers(filters: ContainerFilters): Promise<ContainerListResult> {
  const qb = this.containerRepository
    .createQueryBuilder('c')
    .leftJoinAndSelect('c.seaFreight', 'sf')
    .leftJoinAndSelect('c.portOperations', 'po')

  // ⭐ 添加国家过滤 ⭐
  const countryCode = (this as any).scopedCountryCode
  if (countryCode) {
    qb.andWhere('c.country = :countryCode', { countryCode })
  }

  // 其他筛选条件...
  if (filters.startDate && filters.endDate) {
    qb.andWhere('c.actual_ship_date BETWEEN :startDate AND :endDate', {
      startDate: filters.startDate,
      endDate: filters.endDate
    })
  }

  const [items, total] = await qb.getManyAndCount()

  return { items, total }
}
```

---

## 二、ganttFilters Store（甘特图筛选）

### 2.1 设计目标

**用途**: 管理甘特图的筛选条件和时间维度

**业务场景**:

- 用户在甘特图页面选择"最近 7 天"
- 切换到"已到货柜"筛选条件
- 刷新页面后，筛选条件保持不变

---

### 2.2 完整实现

```typescript
// frontend/src/store/ganttFilters.ts

import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export interface GanttFilterState {
  startDate: string // 开始日期（ISO 字符串）
  endDate: string // 结束日期（ISO 字符串）
  filterCondition: string // 筛选条件代码
  filterLabel: string // 筛选条件标签
  selectedContainers: string[] // 选中的货柜号数组
  timeDimension: TimeDimension // 时间维度
}

export type TimeDimension = 'arrival' | 'pickup' | 'lastPickup' | 'return'

const STORAGE_KEY = 'logix_gantt_filters'

/**
 * 获取默认状态
 */
const getDefaultState = (): GanttFilterState => ({
  startDate: '',
  endDate: '',
  filterCondition: '',
  filterLabel: '',
  selectedContainers: [],
  timeDimension: 'arrival', // 默认为"到货"维度
})

export const useGanttFilterStore = defineStore('ganttFilters', () => {
  // ========== State ==========

  /**
   * 从 localStorage 初始化状态
   */
  const getInitialState = (): GanttFilterState => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        return { ...getDefaultState(), ...parsed }
      }
    } catch (e) {
      console.warn('[GanttFilterStore] Failed to parse saved state:', e)
    }
    return getDefaultState()
  }

  const initialState = getInitialState()

  // 创建响应式状态
  const startDate = ref(initialState.startDate)
  const endDate = ref(initialState.endDate)
  const filterCondition = ref(initialState.filterCondition)
  const filterLabel = ref(initialState.filterLabel)
  const selectedContainers = ref<string[]>([...initialState.selectedContainers])
  const timeDimension = ref<TimeDimension>(initialState.timeDimension)

  // ========== Private Actions ==========

  /**
   * 持久化到 localStorage
   */
  function persist() {
    try {
      const currentState: GanttFilterState = {
        startDate: startDate.value,
        endDate: endDate.value,
        filterCondition: filterCondition.value,
        filterLabel: filterLabel.value,
        selectedContainers: [...selectedContainers.value],
        timeDimension: timeDimension.value,
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(currentState))
    } catch (e) {
      console.warn('[GanttFilterStore] Failed to persist state:', e)
    }
  }

  // ⭐ 监听所有状态变化，自动持久化 ⭐
  watch(
    [startDate, endDate, filterCondition, filterLabel, selectedContainers, timeDimension],
    () => {
      persist()
    },
    { deep: true }
  )

  // ========== Public Actions ==========

  /**
   * 设置筛选条件
   * @param filters - 部分或完整的筛选条件对象
   */
  function setFilters(filters: Partial<GanttFilterState>) {
    if (filters.startDate !== undefined) startDate.value = filters.startDate
    if (filters.endDate !== undefined) endDate.value = filters.endDate
    if (filters.filterCondition !== undefined) filterCondition.value = filters.filterCondition
    if (filters.filterLabel !== undefined) filterLabel.value = filters.filterLabel
    if (filters.selectedContainers !== undefined) {
      selectedContainers.value = [...filters.selectedContainers]
    }
    if (filters.timeDimension !== undefined) timeDimension.value = filters.timeDimension
  }

  /**
   * 清除所有筛选条件（恢复默认）
   */
  function clearFilters() {
    const defaultState = getDefaultState()
    startDate.value = defaultState.startDate
    endDate.value = defaultState.endDate
    filterCondition.value = defaultState.filterCondition
    filterLabel.value = defaultState.filterLabel
    selectedContainers.value = [...defaultState.selectedContainers]
    timeDimension.value = defaultState.timeDimension
  }

  /**
   * 从 URL query 参数初始化
   * @param query - Vue Router 的 query 对象
   */
  function initFromQuery(query: Record<string, any>) {
    if (query.startDate) {
      startDate.value = String(query.startDate)
    }
    if (query.endDate) {
      endDate.value = String(query.endDate)
    }
    if (query.filterCondition) {
      filterCondition.value = String(query.filterCondition)
    }
    if (query.filterLabel) {
      filterLabel.value = String(query.filterLabel)
    }
    if (query.containers) {
      selectedContainers.value = String(query.containers).split(',').filter(Boolean)
    }
  }

  /**
   * 根据 filterCondition 推断 timeDimension
   *
   * 推断规则:
   * - 包含 "arrival" → arrival
   * - 包含 "pickup" 且不包含 "last" → pickup
   * - 包含 "last_pickup" 或 "lastpickup" → lastPickup
   * - 包含 "return" → return
   * - 默认 → arrival
   */
  function inferTimeDimension(): TimeDimension {
    const condition = filterCondition.value.toLowerCase()

    if (!condition) return 'arrival'
    if (condition.includes('arrival')) return 'arrival'
    if (condition.includes('pickup') && !condition.includes('last')) return 'pickup'
    if (condition.includes('last_pickup') || condition.includes('lastpickup')) return 'lastPickup'
    if (condition.includes('return')) return 'return'

    return 'arrival'
  }

  // ========== Return ==========

  return {
    // State
    startDate,
    endDate,
    filterCondition,
    filterLabel,
    selectedContainers,
    timeDimension,

    // Actions
    setFilters,
    clearFilters,
    initFromQuery,
    inferTimeDimension,
  }
})
```

---

### 2.3 使用示例

#### 在甘特图组件中使用

```vue
<!-- frontend/src/components/common/SimpleGanttChart.vue -->

<script setup lang="ts">
import { useGanttFilterStore } from '@/store/ganttFilters'
import { watch } from 'vue'

const ganttFilterStore = useGanttFilterStore()
const route = useRoute()

// ⭐ 从 URL 参数初始化筛选条件 ⭐
watch(
  () => route.query,
  newQuery => {
    ganttFilterStore.initFromQuery(newQuery as Record<string, any>)

    // 推断时间维度
    const dimension = ganttFilterStore.inferTimeDimension()
    ganttFilterStore.timeDimension = dimension
  },
  { immediate: true }
)

// ⭐ 监听筛选条件变化，重新加载数据 ⭐
watch(
  [
    () => ganttFilterStore.startDate,
    () => ganttFilterStore.endDate,
    () => ganttFilterStore.filterCondition,
  ],
  async () => {
    await loadGanttData()
  }
)

// 切换筛选条件
function changeFilter(condition: string, label: string) {
  ganttFilterStore.setFilters({
    filterCondition: condition,
    filterLabel: label,
  })
}

// 设置日期范围
function setDateRange(start: string, end: string) {
  ganttFilterStore.setFilters({
    startDate: start,
    endDate: end,
  })
}
</script>
```

---

#### 在路由中传递筛选条件

```typescript
// frontend/src/router/index.ts

{
  path: '/gantt',
  name: 'GanttChart',
  component: SimpleGanttChart,
  props: route => ({
    // 从 URL query 传递筛选条件
    filterCondition: route.query.filterCondition,
    startDate: route.query.startDate,
    endDate: route.query.endDate
  })
}

// 导航时携带筛选条件
router.push({
  path: '/gantt',
  query: {
    filterCondition: 'arrived_last_7_days',
    filterLabel: '最近 7 天到货',
    startDate: '2026-03-24',
    endDate: '2026-03-31'
  }
})
```

---

## 三、持久化机制

### 3.1 localStorage Key 规范

| Store            | Storage Key                 | 存储内容                |
| ---------------- | --------------------------- | ----------------------- |
| **app**          | `logix_scoped_country_code` | 国家代码（如 'US'）     |
| **ganttFilters** | `logix_gantt_filters`       | 完整的 GanttFilterState |

---

### 3.2 持久化策略

#### app Store: 手动持久化

```typescript
function setScopedCountryCode(code: string | null) {
  scopedCountryCode.value = normalized

  // ✅ 在 Action 中手动调用持久化
  try {
    if (normalized) {
      localStorage.setItem(STORAGE_KEY, normalized)
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  } catch {
    /* ignore */
  }
}
```

**优点**: 精确控制何时持久化

---

#### ganttFilters Store: 自动持久化

```typescript
// ⭐ 使用 watch 监听所有状态变化 ⭐
watch(
  [startDate, endDate, filterCondition, filterLabel, selectedContainers, timeDimension],
  () => {
    persist() // 自动保存
  },
  { deep: true }
)
```

**优点**:

- 无需手动调用 save
- 状态变化即保存
- 不会遗漏

---

### 3.3 清理机制

#### 清除 app Store

```typescript
function clearScopedCountryCode() {
  scopedCountryCode.value = null
  localStorage.removeItem(STORAGE_KEY) // ✅ 同时清除存储
}
```

---

#### 清除 ganttFilters Store

```typescript
function clearFilters() {
  const defaultState = getDefaultState()

  // 重置为默认值
  startDate.value = defaultState.startDate
  endDate.value = defaultState.endDate
  // ...

  // ❌ 不需要手动清除 localStorage
  // ✅ watch 会自动持久化默认状态
}
```

---

## 四、常见问题排查

### 4.1 问题 1: 国家筛选失效

**现象**: 切换国家后，数据没有变化

**排查步骤**:

```javascript
// Step 1: 检查 app Store 状态
// 浏览器控制台
const appStore = useAppStore()
console.log('scopedCountryCode:', appStore.scopedCountryCode)

// Step 2: 检查 localStorage
console.log('localStorage:', localStorage.getItem('logix_scoped_country_code'))

// Step 3: 检查请求头
// Network 面板查看 X-Country-Code 是否发送
```

**常见原因**:

- ❌ app Store 未正确初始化
- ❌ 请求拦截器未读取 appStore
- ❌ 后端未配置 middleware

**解决方案**:

- ✅ 重启页面重新初始化
- ✅ 检查 container.ts 拦截器代码
- ✅ 验证后端 middleware 配置

---

### 4.2 问题 2: 甘特图筛选条件丢失

**现象**: 刷新页面后，筛选条件恢复默认

**排查步骤**:

```javascript
// Step 1: 检查 ganttFilters Store
const ganttStore = useGanttFilterStore()
console.log('filterCondition:', ganttStore.filterCondition)

// Step 2: 检查 localStorage
console.log('gantt filters:', localStorage.getItem('logix_gantt_filters'))

// Step 3: 检查 watch 是否正常触发
// 在 persist() 函数中添加 console.log
```

**常见原因**:

- ❌ localStorage 被清除
- ❌ watch 监听器未正确设置
- ❌ initFromQuery 覆盖了本地状态

**解决方案**:

- ✅ 不要手动清除 localStorage
- ✅ 确保 watch 在 Store 创建时注册
- ✅ 调整 initFromQuery 的调用时机

---

### 4.3 问题 3: 多 Tab 状态不同步

**现象**: 打开多个 Tab，切换国家后只有一个 Tab 生效

**解决方案**:

```typescript
// 监听 storage 事件（跨 Tab 同步）
if (typeof window !== 'undefined') {
  window.addEventListener('storage', event => {
    if (event.key === STORAGE_KEY) {
      // 读取新值并更新
      const newCode = event.newValue
      scopedCountryCode.value = normalizeCountryCode(newCode)
    }
  })
}
```

---

## 📚 相关文档

- **01-货柜数据结构完整指南** - 数据库表结构与类型定义
- **03-货柜服务 API 实战指南** - containerService 使用方法
- **05-货柜数据流与状态同步** - 后端状态同步机制

---

**版本**: v1.0  
**创建时间**: 2026-03-31  
**最后更新**: 2026-03-31  
**作者**: 刘志高
