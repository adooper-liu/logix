# 内存泄漏检测与优化指南

## 📋 概述

本文档说明如何检测和修复 LogiX 系统中的内存泄漏问题，以及如何进行内存管理和优化。

## 🔍 内存泄漏检测

### 前端内存泄漏

#### 常见原因

1. **未清理的事件监听器**
   ```javascript
   // ❌ 错误示例
   window.addEventListener('resize', () => { ... })

   // ✅ 正确示例
   const resizeHandler = () => { ... }
   window.addEventListener('resize', resizeHandler)
   onUnmounted(() => {
     window.removeEventListener('resize', resizeHandler)
   })
   ```

2. **未清理的定时器**
   ```javascript
   // ❌ 错误示例
   setTimeout(() => { ... }, 1000)

   // ✅ 正确示例
   const timer = setTimeout(() => { ... }, 1000)
   onUnmounted(() => {
     clearTimeout(timer)
   })
   ```

3. **未销毁的图表实例**
   ```javascript
   // ❌ 错误示例
   const chart = echarts.init(dom)

   // ✅ 正确示例
   let chart: echarts.ECharts | null = null
   onMounted(() => {
     chart = echarts.init(dom)
   })
   onUnmounted(() => {
     if (chart && !chart.isDisposed()) {
       chart.dispose()
       chart = null
     }
   })
   ```

4. **未清理的订阅**
   ```javascript
   // ❌ 错误示例
   const subscription = observable.subscribe()

   // ✅ 正确示例
   onUnmounted(() => {
     subscription.unsubscribe()
   })
   ```

#### 监控页面修复内容

修复了以下内存泄漏问题：

1. ✅ **事件监听器清理**
   - 保存 resize 事件处理器的引用
   - 组件卸载时正确移除监听器

2. ✅ **定时器清理**
   - 保存 setTimeout 的引用
   - 组件卸载时清除定时器

3. ✅ **图表实例管理**
   - 检查图表是否已销毁后再操作
   - 组件卸载时正确销毁所有图表实例

4. ✅ **避免重复请求**
   - 移除 onBeforeMount 中的数据加载
   - 只在 onMounted 中加载数据一次

### 后端内存泄漏

#### 常见原因

1. **未关闭的数据库连接**
   ```typescript
   // ❌ 错误示例
   const connection = await createConnection()
   // 忘记关闭连接

   // ✅ 正确示例
   try {
     const connection = await createConnection()
     // 使用连接
   } finally {
     await connection.close()
   }
   ```

2. **不断增长的数据结构**
   ```typescript
   // ❌ 错误示例
   const history: any[] = []
   app.get('/api/data', (req, res) => {
     history.push(data) // 永远增长
   })

   // ✅ 正确示例
   const MAX_HISTORY = 100
   const history: any[] = []
   app.get('/api/data', (req, res) => {
     history.push(data)
     if (history.length > MAX_HISTORY) {
       history.shift()
     }
   })
   ```

3. **循环引用**
   ```typescript
   // ❌ 错误示例
   const objA: any = { name: 'A' }
   const objB: any = { name: 'B' }
   objA.ref = objB
   objB.ref = objA // 循环引用

   // ✅ 解决方案：使用 WeakMap
   const weakMap = new WeakMap()
   weakMap.set(objA, objB)
   ```

#### 监控控制器修复内容

1. ✅ **内存历史记录限制**
   - 只保留最近 24 个数据点
   - 自动清理旧数据

2. ✅ **内存泄漏检测**
   - 基于历史趋势分析
   - 自动生成告警

3. ✅ **详细的内存信息**
   - 提供 heapUsed, heapTotal, rss 等指标
   - 用于内存泄漏诊断

## 🛠️ 内存优化策略

### 前端优化

#### 1. 组件优化

```typescript
// 使用 onUnmounted 清理所有资源
onUnmounted(() => {
  // 清理事件监听器
  if (eventHandler) {
    window.removeEventListener('event', eventHandler)
  }

  // 清理定时器
  if (timer) {
    clearTimeout(timer)
  }

  // 清理订阅
  if (subscription) {
    subscription.unsubscribe()
  }

  // 清理图表实例
  if (chart && !chart.isDisposed()) {
    chart.dispose()
  }
})
```

#### 2. 使用 KeepAlive 缓存

```vue
<template>
  <router-view v-slot="{ Component }">
    <keep-alive :include="['Monitoring']">
      <component :is="Component" />
    </keep-alive>
  </router-view>
</template>
```

#### 3. 虚拟滚动

对于大量数据的列表，使用虚拟滚动减少 DOM 节点。

### 后端优化

#### 1. 连接池配置

```typescript
// TypeORM 连接池配置
const AppDataSource = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  poolMin: 2,      // 最小连接数
  poolMax: 10,     // 最大连接数
  // ...
})
```

#### 2. 查询优化

```typescript
// ❌ 错误示例：一次性加载所有数据
const allData = await repository.find()

// ✅ 正确示例：分页查询
const data = await repository.find({
  take: 100,
  skip: 0
})
```

#### 3. 手动垃圾回收

如果需要启用手动垃圾回收，使用以下方式启动 Node.js：

```bash
node --expose-gc dist/index.js
```

然后可以通过 API 触发垃圾回收：

```bash
POST /api/monitoring/gc
```

## 📊 内存监控 API

### 1. 获取性能指标

```bash
GET /api/monitoring/performance
```

响应：
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "cpuUsage": 35,
    "memoryUsage": 65,
    "responseTime": 120,
    "throughput": 1200,
    "memoryDetails": {
      "heapUsed": 128,
      "heapTotal": 256,
      "external": 8,
      "rss": 180
    },
    "memoryLeakDetected": false
  }
}
```

### 2. 获取详细内存分析

```bash
GET /api/monitoring/memory-analysis
```

响应：
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "current": {
      "heapUsed": 128,
      "heapTotal": 256,
      "external": 8,
      "rss": 180,
      "usagePercentage": 50
    },
    "history": {
      "samples": 24,
      "trend": {
        "growth": 5,
        "avgUsage": 48
      },
      "leakDetected": false
    },
    "database": {
      "connected": true,
      "repoInfo": {
        "containers": 100,
        "orders": 50
      }
    },
    "gcAvailable": true
  }
}
```

### 3. 手动触发垃圾回收

```bash
POST /api/monitoring/gc
```

响应：
```json
{
  "code": 200,
  "message": "垃圾回收执行成功",
  "data": {
    "beforeMemory": {
      "heapUsed": 256,
      "heapTotal": 512,
      "rss": 320
    },
    "afterMemory": {
      "heapUsed": 180,
      "heapTotal": 512,
      "rss": 260
    },
    "savedMemory": {
      "heapUsed": 76,
      "heapTotal": 0,
      "rss": 60
    }
  }
}
```

## 🔧 故障排除

### 问题：内存使用率持续增长

**排查步骤：**

1. 查看内存分析 API
   ```bash
   GET /api/monitoring/memory-analysis
   ```

2. 检查是否检测到内存泄漏
   - 如果 `leakDetected: true`，说明存在内存泄漏

3. 查看内存趋势
   - 如果 `trend.growth` 为正数且较大，说明内存持续增长

4. 检查代码
   - 前端：检查是否有未清理的事件监听器、定时器、图表实例
   - 后端：检查是否有不断增长的数据结构、未关闭的连接

5. 重启服务
   ```bash
   # 停止服务
   npm run stop

   # 重新启动
   npm run dev
   ```

6. 如果问题持续，考虑：
   - 增加内存限制
   - 优化代码逻辑
   - 使用专业的内存分析工具（如 Chrome DevTools、heapdump）

### 问题：前端页面切换后内存不释放

**解决方案：**

1. 确保所有资源在 `onUnmounted` 中清理
2. 使用 `v-if` 而不是 `v-show` 来销毁不需要的组件
3. 检查是否有全局变量或闭包引用

### 问题：后端内存占用过高

**解决方案：**

1. 手动触发垃圾回收
   ```bash
   POST /api/monitoring/gc
   ```

2. 检查数据库连接池配置
3. 优化查询，避免一次性加载大量数据
4. 使用流式处理处理大量数据

## 📈 最佳实践

### 前端

1. ✅ 所有在 `onMounted` 中创建的资源，都在 `onUnmounted` 中清理
2. ✅ 使用 `ref` 和 `shallowRef` 减少响应式开销
3. ✅ 使用 `computed` 缓存计算结果
4. ✅ 对于大型列表，使用虚拟滚动
5. ✅ 避免在组件外部使用全局变量

### 后端

1. ✅ 限制数据结构的最大长度
2. ✅ 使用连接池管理数据库连接
3. ✅ 分页查询，避免一次性加载大量数据
4. ✅ 及时释放不再需要的资源
5. ✅ 定期监控内存使用情况

## 🚨 紧急处理

### 内存泄漏紧急处理步骤

1. **立即重启服务**
   ```bash
   # 停止服务
   npm run stop

   # 重新启动
   npm run dev
   ```

2. **启用垃圾回收（如需要）**
   ```bash
   node --expose-gc dist/index.js
   ```

3. **手动触发垃圾回收**
   ```bash
   curl -X POST http://localhost:3001/api/monitoring/gc
   ```

4. **查找并修复内存泄漏**
   - 使用浏览器 DevTools 分析堆快照
   - 使用 Node.js 的 `heapdump` 模块
   - 代码审查，查找未清理的资源

5. **考虑扩容**
   - 如果内存确实不够，考虑增加服务器内存
   - 或者使用负载均衡分散压力

## 📚 参考资源

- [Vue 3 生命周期](https://vuejs.org/api/composition-api-lifecycle.html)
- [ECharts 最佳实践](https://echarts.apache.org/handbook/zh/concepts/best-practices/)
- [Node.js 内存管理](https://nodejs.org/en/docs/guides/simple-profiling/)
- [TypeORM 性能优化](https://typeorm.io/#/performance-optimization)

## 📝 变更日志

- 2026-02-28: 添加内存泄漏检测和优化指南
- 2026-02-28: 修复前端监控页面内存泄漏问题
- 2026-02-28: 添加后端内存分析和垃圾回收 API
