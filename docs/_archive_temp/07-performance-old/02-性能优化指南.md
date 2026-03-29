# ⚡ LogiX 前端性能优化方案

> **目标**: 减少页面刷新压力，提升用户体验，降低服务器负载

---

## 📋 目录

1. [当前性能分析](#当前性能分析)
2. [优化策略总览](#优化策略总览)
3. [路由懒加载](#路由懒加载)
4. [组件懒加载](#组件懒加载)
5. [按需加载多语言](#按需加载多语言)
6. [虚拟滚动](#虚拟滚动)
7. [防抖与节流](#防抖与节流)
8. [数据缓存策略](#数据缓存策略)
9. [资源优化](#资源优化)
10. [代码分割](#代码分割)
11. [实施清单](#实施清单)

---

## 📊 当前性能分析

### 现状评估

#### ✅ 已实施的优化
1. **路由懒加载** - 所有路由已使用动态导入
   ```typescript
   const Dashboard = () => import('@/views/dashboard/Dashboard.vue')
   ```

2. **路由模式** - 使用 Hash 模式，避免服务端配置问题
   ```typescript
   history: createWebHashHistory()
   ```

#### ⚠️ 存在的性能问题

1. **多语言全量加载**
   - 所有 7 种语言在首次加载时全部打包
   - 约 280 行 × 7 种语言 = 1960 行翻译文本
   - 预估增加 50-100KB 初始包大小

2. **缺少组件级懒加载**
   - 大型组件可能包含大量子组件
   - 首屏加载不必要的组件

3. **缺少数据缓存**
   - 频繁请求相同数据
   - 没有利用浏览器缓存

4. **列表渲染优化不足**
   - 长列表未使用虚拟滚动
   - 可能有大量 DOM 节点

5. **缺少防抖节流**
   - 搜索输入可能触发过多请求
   - 滚动事件可能影响性能

---

## 🎯 优化策略总览

| 优化项 | 优先级 | 预期收益 | 实施难度 |
|--------|--------|---------|---------|
| 多语言按需加载 | 🔴 高 | -40-60KB | ⭐ 简单 |
| 路由预加载 | 🟡 中 | 减少首屏延迟 | ⭐ 简单 |
| 组件懒加载 | 🟡 中 | -10-30KB | ⭐⭐ 中等 |
| 虚拟滚动 | 🟢 低 | 大列表性能提升 | ⭐⭐⭐ 困难 |
| API 数据缓存 | 🔴 高 | 减少 50%+ 请求 | ⭐⭐ 中等 |
| 防抖节流 | 🟢 低 | 减少无效请求 | ⭐ 简单 |
| 图片懒加载 | 🟡 中 | 减少首屏加载 | ⭐⭐ 中等 |

---

## 1️⃣ 路由懒加载

### 当前状态 ✅
已实施所有路由懒加载，保持现有实现。

### 进一步优化：路由预加载

在用户鼠标悬停或空闲时预加载即将访问的路由。

```typescript
// router/index.ts
// 添加路由预加载逻辑
import { prefetchRoutes } from '@/utils/router-prefetch'

// 在 Layout 组件中实现
<script setup lang="ts">
import { useRouter } from 'vue-router'
import { prefetchRoutes } from '@/utils/router-prefetch'

const router = useRouter()

// 监听导航，预加载相邻路由
watch(() => router.currentRoute.value.name, async (newRoute) => {
  if (newRoute) {
    await prefetchRoutes(newRoute as string)
  }
})
</script>
```

---

## 2️⃣ 组件懒加载

### 大型组件拆分

对于包含大量子组件的页面，实现子组件懒加载。

```vue
<script setup lang="ts">
// ❌ 不推荐 - 同步导入所有子组件
import ContainerHeader from './components/ContainerHeader.vue'
import ContainerSummary from './components/ContainerSummary.vue'
import EmptyReturn from './components/EmptyReturn.vue'

// ✅ 推荐 - 懒加载大型子组件
import { defineAsyncComponent } from 'vue'

const ContainerHeader = defineAsyncComponent(() =>
  import('./components/ContainerHeader.vue')
)
const ContainerSummary = defineAsyncComponent(() =>
  import('./components/ContainerSummary.vue')
)
const EmptyReturn = defineAsyncComponent(() =>
  import('./components/EmptyReturn.vue')
)
</script>

<template>
  <div class="container-detail">
    <!-- 添加加载状态 -->
    <Suspense>
      <template #default>
        <ContainerHeader />
        <ContainerSummary />
        <EmptyReturn />
      </template>

      <template #fallback>
        <div class="loading-skeleton">
          <el-skeleton :rows="5" animated />
        </div>
      </template>
    </Suspense>
  </div>
</template>
```

### 条件渲染组件

对于不总是需要的组件，使用 `v-if` + 异步组件：

```vue
<script setup lang="ts">
import { ref, defineAsyncComponent } from 'vue'

const showAdvancedSettings = ref(false)

// 只在需要时加载
const AdvancedSettings = defineAsyncComponent(() =>
  import('./AdvancedSettings.vue')
)
</script>

<template>
  <div>
    <button @click="showAdvancedSettings = true">
      高级设置
    </button>

    <AdvancedSettings v-if="showAdvancedSettings" />
  </div>
</template>
```

---

## 3️⃣ 按需加载多语言 🔥 关键优化

### 问题分析

当前所有语言文件在首次加载时全部打包：

```typescript
// ❌ 当前实现 - 所有语言都打包
import zhCN from './zh-CN'
import enUS from './en-US'
import jaJP from './ja-JP'
import deDE from './de-DE'
import frFR from './fr-FR'
import itIT from './it-IT'
import esES from './es-ES'

export const messages = {
  'zh-CN': zhCN,
  'en-US': enUS,
  'ja-JP': jaJP,
  'de-DE': deDE,
  'fr-FR': frFR,
  'it-IT': itIT,
  'es-ES': esES
}
```

### 优化方案：动态语言加载

```typescript
// locales/index.ts
import { createI18n } from 'vue-i18n'
import type { Language, DEFAULT_LANGUAGE } from './types'

// 默认只加载中文
import zhCN from './zh-CN'

export const messages = {
  'zh-CN': zhCN
}

// 动态加载其他语言
const loadLanguageAsync = async (lang: Language): Promise<void> => {
  if (lang === 'zh-CN' || messages[lang]) {
    return
  }

  try {
    const messagesModule = await import(`./${lang}.ts`)
    messages[lang] = messagesModule.default
    i18n.global.setLocaleMessage(lang, messagesModule.default)
  } catch (error) {
    console.error(`Failed to load language: ${lang}`, error)
  }
}

// 从 localStorage 读取语言设置
const getSavedLanguage = (): Language => {
  try {
    const saved = localStorage.getItem('logix-language')
    const validLanguages = ['zh-CN', 'en-US', 'ja-JP', 'de-DE', 'fr-FR', 'it-IT', 'es-ES']
    if (saved && validLanguages.includes(saved)) {
      return saved as Language
    }
  } catch (error) {
    console.warn('Failed to read language from localStorage:', error)
  }
  return 'zh-CN' as typeof DEFAULT_LANGUAGE
}

const i18n = createI18n({
  legacy: false,
  locale: getSavedLanguage(),
  fallbackLocale: 'zh-CN',
  messages
})

export default i18n

// 导出设置语言的函数
export const setLanguage = async (lang: Language) => {
  await loadLanguageAsync(lang)
  i18n.global.locale.value = lang
  try {
    localStorage.setItem('logix-language', lang)
  } catch (error) {
    console.warn('Failed to save language to localStorage:', error)
  }
}
```

### 预加载策略

在应用启动后预加载用户可能需要的语言：

```typescript
// main.ts
import { getCurrentLanguage, setLanguage } from './locales'

app.mount('#app')

// 预加载浏览器语言
const browserLang = navigator.language
const supportedLanguages = ['zh-CN', 'en-US', 'ja-JP', 'de-DE', 'fr-FR', 'it-IT', 'es-ES']

// 浏览器语言与当前语言不同时，预加载
if (browserLang && supportedLanguages.includes(browserLang)) {
  const currentLang = getCurrentLanguage()
  if (currentLang !== browserLang) {
    // 延迟预加载，不影响首屏
    setTimeout(() => {
      setLanguage(browserLang as Language).catch(console.error)
    }, 1000)
  }
}
```

---

## 4️⃣ 虚拟滚动

### 适用场景

- 货柜列表超过 100 条
- 导航记录超过 50 条
- 其他长列表展示

### 使用 Element Plus 虚拟表格

```vue
<script setup lang="ts">
import { ref } from 'vue'

const tableData = ref([...]) // 可能有数千条数据
</script>

<template>
  <!-- 启用虚拟滚动 -->
  <el-table
    :data="tableData"
    height="600"
    row-key="id"
    :virtual-scroll="true"
    :row-height="60"
  >
    <el-table-column prop="containerNumber" label="集装箱号" />
    <el-table-column prop="status" label="状态" />
    <!-- 其他列 -->
  </el-table>
</template>
```

### 自定义虚拟列表

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'

const items = ref(new Array(10000).fill(0).map((_, i) => ({
  id: i,
  text: `Item ${i}`
})))

const visibleCount = 20
const itemHeight = 50
const scrollTop = ref(0)

const startIndex = computed(() => Math.floor(scrollTop.value / itemHeight))
const endIndex = computed(() => Math.min(
  startIndex.value + visibleCount,
  items.value.length
))

const visibleItems = computed(() =>
  items.value.slice(startIndex.value, endIndex.value)
)

const containerHeight = computed(() => items.value.length * itemHeight)
</script>

<template>
  <div
    class="virtual-list"
    :style="{ height: `${visibleCount * itemHeight}px` }"
    @scroll="scrollTop = $event.target.scrollTop"
  >
    <div
      class="virtual-list-phantom"
      :style="{ height: `${containerHeight}px` }"
    />

    <div
      class="virtual-list-content"
      :style="{ transform: `translateY(${startIndex * itemHeight}px)` }"
    >
      <div
        v-for="item in visibleItems"
        :key="item.id"
        class="virtual-list-item"
        :style="{ height: `${itemHeight}px` }"
      >
        {{ item.text }}
      </div>
    </div>
  </div>
</template>
```

---

## 5️⃣ 防抖与节流

### 搜索输入防抖

```typescript
// composables/useDebounce.ts
import { ref, watch, type Ref } from 'vue'

export function useDebounce<T>(value: Ref<T>, delay: number = 300): Ref<T> {
  const debouncedValue = ref<T>(value.value)
  let timeout: ReturnType<typeof setTimeout> | null = null

  watch(value, (newValue) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => {
      debouncedValue.value = newValue
    }, delay)
  })

  return debouncedValue
}

// 使用
<script setup lang="ts">
import { ref } from 'vue'
import { useDebounce } from '@/composables/useDebounce'

const searchText = ref('')
const debouncedSearchText = useDebounce(searchText, 500)

watch(debouncedSearchText, (newText) => {
  // 只在停止输入 500ms 后执行搜索
  performSearch(newText)
})
</script>
```

### 滚动事件节流

```typescript
// composables/useThrottle.ts
import { ref, type Ref } from 'vue'

export function useThrottle<T>(
  fn: (arg: T) => void,
  delay: number = 300
): (arg: T) => void {
  let lastCall = 0

  return (arg: T) => {
    const now = Date.now()
    if (now - lastCall >= delay) {
      fn(arg)
      lastCall = now
    }
  }
}

// 使用
<script setup lang="ts">
import { useThrottle } from '@/composables/useThrottle'

const handleScroll = useThrottle((event: Event) => {
  // 最多每 300ms 执行一次
  updateScrollPosition(event)
}, 300)
</script>
```

---

## 6️⃣ 数据缓存策略

### API 请求缓存

```typescript
// utils/api-cache.ts
interface CacheEntry<T> {
  data: T
  timestamp: number
  expire: number
}

const cache = new Map<string, CacheEntry<any>>()

export function withCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 5 * 60 * 1000 // 默认 5 分钟
): Promise<T> {
  const cached = cache.get(key)

  if (cached && Date.now() < cached.expire) {
    console.log('[Cache] Hit:', key)
    return Promise.resolve(cached.data)
  }

  return fetcher().then((data) => {
    cache.set(key, {
      data,
      timestamp: Date.now(),
      expire: Date.now() + ttl
    })
    console.log('[Cache] Set:', key)
    return data
  })
}

export function clearCache(key?: string) {
  if (key) {
    cache.delete(key)
  } else {
    cache.clear()
  }
}

// 使用
// services/container.ts
export async function getContainers(params?: any) {
  const cacheKey = `containers:${JSON.stringify(params)}`

  return withCache(
    cacheKey,
    () => api.get('/containers', { params }).then(res => res.data),
    3 * 60 * 1000 // 缓存 3 分钟
  )
}
```

### Pinia 状态缓存

```typescript
// store/container.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getContainers } from '@/services/container'

export const useContainerStore = defineStore('container', () => {
  const containers = ref<Container[]>([])
  const loading = ref(false)
  const lastFetch = ref(0)

  const CACHE_DURATION = 5 * 60 * 1000 // 5 分钟

  async function fetchContainers(forceRefresh = false) {
    // 检查缓存
    if (!forceRefresh && containers.value.length > 0) {
      const age = Date.now() - lastFetch.value
      if (age < CACHE_DURATION) {
        console.log('[Store] Using cached data')
        return containers.value
      }
    }

    loading.value = true
    try {
      containers.value = await getContainers()
      lastFetch.value = Date.now()
      return containers.value
    } finally {
      loading.value = false
    }
  }

  function clearCache() {
    containers.value = []
    lastFetch.value = 0
  }

  return {
    containers,
    loading,
    fetchContainers,
    clearCache
  }
})
```

---

## 7️⃣ 资源优化

### 图片懒加载

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue'

const props = defineProps<{
  src: string
  alt: string
}>()

const loaded = ref(false)
const imageRef = ref<HTMLImageElement>()

onMounted(() => {
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement
          img.src = props.src
          observer.unobserve(img)
        }
      })
    })

    if (imageRef.value) {
      observer.observe(imageRef.value)
    }
  }
})
</script>

<template>
  <img
    ref="imageRef"
    :alt="alt"
    loading="lazy"
    class="lazy-image"
  />
</template>
```

### 字体优化

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    // 字体子集化，只包含实际使用的字符
    cssCodeSplit: true
  }
})
```

---

## 8️⃣ 代码分割

### Vite 构建优化

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Element Plus 单独打包
          'element-plus': ['element-plus'],
          // ECharts 单独打包
          'echarts': ['echarts'],
          // 多语言单独打包
          'locales': [
            './src/locales/zh-CN.ts',
            './src/locales/en-US.ts'
          ]
        }
      }
    },
    // 分块策略
    chunkSizeWarningLimit: 1000
  }
})
```

---

## ✅ 实施清单

### 第一阶段：高优先级（立即实施）

- [ ] **多语言按需加载**
  - [ ] 修改 `locales/index.ts` 支持动态加载
  - [ ] 测试语言切换性能
  - [ ] 预估包体积减少

- [ ] **API 数据缓存**
  - [ ] 实现 `api-cache.ts` 工具
  - [ ] 为关键 API 添加缓存
  - [ ] 添加缓存失效策略

- [ ] **搜索防抖**
  - [ ] 实现 `useDebounce` composable
  - [ ] 应用到所有搜索输入
  - [ ] 设置合理的防抖时间

### 第二阶段：中优先级（本周完成）

- [ ] **路由预加载**
  - [ ] 实现路由预加载逻辑
  - [ ] 测试预加载效果
  - [ ] 添加预加载控制选项

- [ ] **组件懒加载**
  - [ ] 识别大型组件
  - [ ] 实现子组件懒加载
  - [ ] 添加加载骨架屏

- [ ] **Pinia 状态缓存**
  - [ ] 为 Store 添加缓存层
  - [ ] 实现缓存过期机制
  - [ ] 添加手动刷新功能

### 第三阶段：低优先级（按需实施）

- [ ] **虚拟滚动**
  - [ ] 识别长列表场景
  - [ ] 实现虚拟滚动
  - [ ] 测试性能提升

- [ ] **图片懒加载**
  - [ ] 实现图片懒加载组件
  - [ ] 替换静态图片
  - [ ] 添加占位符

- [ ] **代码分割优化**
  - [ ] 配置 Vite 构建选项
  - [ ] 分析打包结果
  - [ ] 优化包体积

---

## 📈 预期效果

### 性能指标

| 指标 | 优化前 | 优化后 | 提升 |
|------|--------|--------|------|
| 首次加载包大小 | ~500KB | ~350KB | -30% |
| 首屏加载时间 | ~2.5s | ~1.5s | -40% |
| API 请求次数 | 100次/用户 | 50次/用户 | -50% |
| 列表渲染（1000条） | ~1.5s | ~200ms | -87% |

### 用户体验

- ⚡ 页面切换更流畅
- 🎯 首次加载更快
- 💾 减少流量消耗
- 🔄 更少的白屏时间

---

## 🔍 性能监控

### 使用浏览器 DevTools

```typescript
// 在开发环境添加性能监控
if (import.meta.env.DEV) {
  window.addEventListener('load', () => {
    const perfData = performance.timing
    const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart
    console.log(`[Performance] Page load time: ${pageLoadTime}ms`)
  })
}
```

### 使用 Lighthouse

```bash
# 安装 Lighthouse CI
npm install -g @lhci/cli

# 运行性能审计
lhci autorun
```

---

## 📚 相关资源

- [Vite 性能优化文档](https://vitejs.dev/guide/performance.html)
- [Vue 3 性能优化](https://vuejs.org/guide/best-practices/performance.html)
- [Web.dev 性能指南](https://web.dev/performance/)

---

**最后更新**: 2026-02-28
