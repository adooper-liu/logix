# Phase 3 组件使用指南

**创建时间**: 2026-04-01  
**作者**: 刘志高  
**版本**: v1.0

---

## 📚 目录

1. [DragDropScheduler - 拖拽调度器](#dragdropscheduler)
2. [OptimizationSuggestions - 优化建议卡片](#optimizationsuggestions)
3. [CostTrendChart - 成本趋势图表](#costtrendchart)
4. [GanttChart - 甘特图视图](#ganttchart)
5. [后端 API 集成](#后端-api)

---

## DragDropScheduler {#dragdropscheduler}

### 功能说明

提供可视化的拖拽界面，允许用户通过拖拽调整集装箱的排产日期（提柜、送仓、卸柜、还箱）。

### 文件位置

```
frontend/src/views/scheduling/components/DragDropScheduler.vue
```

### Props

```typescript
interface Props {
  schedulingId: string           // 排产计划 ID
  initialContainers?: Container[] // 初始集装箱数据
}

interface Container {
  containerNumber: string        // 集装箱号
  destination: string            // 目的地
  nodes: ScheduleNode[]          // 节点列表
}

interface ScheduleNode {
  type: 'pickup' | 'delivery' | 'unload' | 'return'
  date: string                   // 计划日期 (YYYY-MM-DD)
  originalDate?: string          // 原始日期（用于追踪变更）
}
```

### Events

```typescript
interface Events {
  (e: 'change', containers: Container[]): void      // 日期变更后触发
  (e: 'save', containers: Container[]): void        // 保存后触发
}
```

### 使用示例

```vue
<template>
  <DragDropScheduler
    :scheduling-id="schedulingId"
    :initial-containers="containers"
    @change="handleContainerChange"
    @save="handleSave"
  />
</template>

<script setup lang="ts">
import DragDropScheduler from './components/DragDropScheduler.vue'

const schedulingId = ref('SCH-20260401-001')
const containers = ref([
  {
    containerNumber: 'HMMU6232153',
    destination: 'LAX',
    nodes: [
      { type: 'pickup', date: '2026-04-05' },
      { type: 'delivery', date: '2026-04-06' },
      { type: 'unload', date: '2026-04-07' },
      { type: 'return', date: '2026-04-11' }
    ]
  }
])

const handleContainerChange = (updatedContainers: Container[]) => {
  console.log('容器数据已变更', updatedContainers)
  // 可在此触发其他逻辑，如启用保存按钮
}

const handleSave = (savedContainers: Container[]) => {
  console.log('已保存', savedContainers)
  // 可在此显示成功提示或刷新列表
}
</script>
```

### 核心特性

#### 1. 时间轴视图
- **按日视图**: 显示每天的时间格子（60px/天）
- **按周视图**: 显示每周聚合视图
- **周末高亮**: 淡红色背景标识周末
- **节假日高亮**: 淡橙色背景标识节假日

#### 2. 拖拽操作
```typescript
// 拖拽开始
onNodeDragStart(event, container, node) {
  draggingNode.value = node
  event.dataTransfer?.setData('text/plain', JSON.stringify({ container, node }))
  event.dataTransfer!.effectAllowed = 'move'
}

// 放置处理
onDrop(event, container) {
  const data = event.dataTransfer?.getData('text/plain')
  // 更新日期并重新计算成本
  containers.value[containerIndex].nodes[nodeIndex].date = dragTarget.value
  recalculateCost()
}
```

#### 3. 实时成本计算
- 自动调用后端 `POST /scheduling/cost/recalculate`
- 显示当前总成本 vs 原始成本
- 计算节省金额和优化比例
- 提供优化建议提示

### 样式定制

```scss
// 自定义时间轴宽度
.date-cell {
  width: 60px; // 可调整为 40px-80px
}

// 自定义任务条颜色
.schedule-node {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
```

---

## OptimizationSuggestions {#optimizationsuggestions}

### 功能说明

智能分析当前排产方案，提供成本优化建议。

### 文件位置

```
frontend/src/views/scheduling/components/OptimizationSuggestions.vue
```

### Props

```typescript
interface Props {
  suggestions?: OptimizationSuggestion[]
}

interface OptimizationSuggestion {
  containerNumber: string       // 集装箱号
  title: string                 // 建议标题
  description: string           // 详细描述
  priority: 'high' | 'medium' | 'low'
  adjustmentType: string        // 调整类型
  impactScope: string           // 影响范围
  originalCost: number          // 原始成本
  optimizedCost: number         // 优化后成本
  savings: number               // 节省金额
  // ... 日期详情
}
```

### Events

```typescript
interface Events {
  (e: 'apply', suggestion: OptimizationSuggestion): void
  (e: 'applyAll', suggestions: OptimizationSuggestion[]): void
  (e: 'dismiss', index: number): void
  (e: 'dismissAll'): void
}
```

### 使用示例

```vue
<template>
  <OptimizationSuggestions
    :suggestions="suggestions"
    @apply="handleApplySuggestion"
    @apply-all="handleApplyAll"
    @dismiss="handleDismiss"
  />
</template>

<script setup lang="ts">
import OptimizationSuggestions from './components/OptimizationSuggestions.vue'

const suggestions = ref([
  {
    containerNumber: 'HMMU6232153',
    title: '调整提柜日期至非高峰时段',
    description: '当前提柜日期为周末，建议调整至工作日可减少等待时间',
    priority: 'high',
    adjustmentType: '日期调整',
    impactScope: '提柜日 + 送仓日',
    originalCost: 1500,
    optimizedCost: 1350,
    savings: 150
  }
])

const handleApplySuggestion = (suggestion) => {
  console.log('应用单个建议', suggestion)
  // 调用后端 API 应用建议
}

const handleApplyAll = (suggestions) => {
  console.log('应用所有建议', suggestions)
  // 批量应用所有优化建议
}
</script>
```

### 视觉设计

#### 优先级标识
- **高优先级**: 红色左边框 (4px) + 淡红背景
- **中优先级**: 橙色左边框 (4px) + 淡橙背景
- **低优先级**: 灰色左边框 (4px) + 淡灰背景

#### 成本对比展示
```vue
<div class="suggestion-metrics">
  <div class="metric-item">
    <span class="metric-label">原成本:</span>
    <span class="metric-value original">${{ suggestion.originalCost }}</span>
  </div>
  <div class="metric-item">
    <span class="metric-label">优化后:</span>
    <span class="metric-value optimized">${{ suggestion.optimizedCost }}</span>
  </div>
  <div class="metric-item">
    <span class="metric-label">节省:</span>
    <span class="metric-value saving">-${{ suggestion.savings }}</span>
  </div>
</div>
```

---

## CostTrendChart {#costtrendchart}

### 功能说明

使用 ECharts 可视化展示成本随时间的变化趋势。

### 文件位置

```
frontend/src/views/scheduling/components/CostTrendChart.vue
```

### Props

```typescript
interface Props {
  containerNumbers?: string[]  // 集装箱号列表
  schedulingId?: string        // 排产计划 ID
}
```

### 使用示例

```vue
<template>
  <CostTrendChart
    :container-numbers="['HMMU6232153', 'HMMU6232154']"
    :scheduling-id="schedulingId"
  />
</template>

<script setup lang="ts">
import CostTrendChart from './components/CostTrendChart.vue'

const schedulingId = ref('SCH-20260401-001')
</script>
```

### 图表配置

#### 支持的数据维度
- 总成本
- 滞港费
- 滞箱费
- 运输费
- 港口存储费
- 操作费

#### 图表类型切换
- **折线图**: 适合观察趋势变化
- **柱状图**: 适合比较数值大小

### 数据摘要

自动计算并显示：
- 平均成本
- 最高成本
- 最低成本
- 总节省金额

---

## GanttChart {#ganttchart}

### 功能说明

以甘特图形式展示多个资源的排产进度。

### 文件位置

```
frontend/src/views/scheduling/components/GanttChart.vue
```

### Props

```typescript
interface Props {
  tasks?: Task[]
  resources?: Resource[]
}

interface Task {
  id: string
  type: 'pickup' | 'delivery' | 'unload' | 'return'
  containerNumber: string
  date: string
  resourceName: string
  status: 'pending' | 'completed' | 'delayed'
  label: string
}

interface Resource {
  id: string
  name: string
  type: 'warehouse' | 'trucking'
  icon: string
}
```

### 使用示例

```vue
<template>
  <GanttChart
    :tasks="tasks"
    :resources="resources"
  />
</template>

<script setup lang="ts">
import GanttChart from './components/GanttChart.vue'

const tasks = ref([
  {
    id: '1',
    type: 'pickup',
    containerNumber: 'HMMU6232153',
    date: '2026-04-05',
    resourceName: 'WH-US-LAX',
    status: 'completed',
    label: '提柜'
  }
])

const resources = ref([
  {
    id: 'WH-US-LAX',
    name: '洛杉矶仓库',
    type: 'warehouse',
    icon: '🏭'
  }
])
</script>
```

### 视觉效果

#### 任务条颜色
- **提柜**: 紫色渐变 (#667eea → #764ba2)
- **送仓**: 粉色渐变 (#f093fb → #f5576c)
- **卸柜**: 蓝色渐变 (#4facfe → #00f2fe)
- **还箱**: 绿色渐变 (#43e97b → #38f9d7)

#### 缩放控制
- **默认**: 60px/天
- **放大**: 最大 120px/天
- **缩小**: 最小 30px/天

---

## 后端 API {#后端-api}

### POST /api/v1/scheduling/cost/recalculate

**用途**: 重新计算成本（拖拽调整后调用）

**请求**:
```json
{
  "containers": [
    {
      "containerNumber": "HMMU6232153",
      "nodes": [
        { "type": "pickup", "date": "2026-04-05" },
        { "type": "delivery", "date": "2026-04-06" }
      ]
    }
  ]
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "totalCost": 1500,
    "breakdown": {
      "demurrage": 200,
      "detention": 150,
      "transportation": 300
    },
    "optimization": {
      "suggestion": "发现 1 个货柜可通过调整日期降低成本",
      "potentialSavings": 75,
      "details": [...]
    },
    "containerResults": [...]
  }
}
```

---

### POST /api/v1/scheduling/save

**用途**: 保存修改后的排产计划

**请求**:
```json
{
  "schedulingId": "SCH-20260401-001",
  "containers": [...]
}
```

**响应**:
```json
{
  "success": true,
  "message": "保存成功",
  "data": {
    "savedCount": 10
  }
}
```

---

### GET /api/v1/scheduling/optimizations

**用途**: 获取优化建议列表

**参数**:
- `containerNumbers`: 集装箱号列表（可选）
- `startDate`: 开始日期（可选）
- `endDate`: 结束日期（可选）

**响应**:
```json
{
  "success": true,
  "data": {
    "suggestions": [
      {
        "containerNumber": "HMMU6232153",
        "title": "调整提柜日期至非高峰时段",
        "priority": "high",
        "savings": 150
      }
    ],
    "totalPotentialSavings": 150
  }
}
```

---

### POST /api/v1/scheduling/optimization/apply

**用途**: 应用优化建议

**请求**:
```json
{
  "containerNumber": "HMMU6232153",
  "suggestion": {...}
}
```

**响应**:
```json
{
  "success": true,
  "message": "优化建议已应用",
  "data": {
    "containerNumber": "HMMU6232153",
    "appliedAt": "2026-04-01T10:30:00Z"
  }
}
```

---

## 🔧 常见问题

### Q1: 拖拽不流畅怎么办？

**A**: 检查以下几点：
1. 确保浏览器支持 HTML5 Drag & Drop
2. 减少同时显示的集装箱数量（可使用分页）
3. 优化 DOM 结构，避免过深的嵌套

---

### Q2: 成本计算不准确？

**A**: 可能原因：
1. 排产历史数据不完整
2. 滞港费计算规则未正确配置
3. 日期格式不正确（应为 YYYY-MM-DD）

**解决方案**:
- 检查数据库中的 `scheduling_history` 表
- 验证 `dict_demurrage_standards` 配置
- 使用 `dayjs(date).format('YYYY-MM-DD')` 格式化日期

---

### Q3: 优化建议不显示？

**A**: 可能原因：
1. 后端返回的数据为空
2. 前端未正确传递 `containerNumbers` 参数
3. 优化算法尚未实现真实逻辑

**解决方案**:
- 检查 Network 面板的 API 响应
- 确认 Props 传递正确
- 查看后端日志确认优化算法执行

---

### Q4: 甘特图任务条重叠？

**A**: 可能原因：
1. 多个任务在同一日期
2. 任务条宽度设置过大

**解决方案**:
- 调整 `zoomLevel` 值（增加每天像素宽度）
- 实现任务条垂直偏移逻辑
- 使用工具提示显示详细信息

---

## 📖 最佳实践

### 1. 性能优化
```typescript
// ✅ 推荐：使用防抖避免频繁调用
const debouncedRecalculate = debounce(() => {
  recalculateCost()
}, 500)

// ❌ 避免：每次拖拽都立即调用
onDrop() {
  recalculateCost() // 可能导致性能问题
}
```

### 2. 错误处理
```typescript
// ✅ 推荐：完整的错误处理
try {
  await api.post('/scheduling/cost/recalculate', data)
} catch (error) {
  ElMessage.error('成本计算失败：' + error.message)
  // 降级处理：使用缓存数据或提示用户重试
}
```

### 3. 用户体验
```typescript
// ✅ 推荐：提供清晰的反馈
const saveChanges = async () => {
  const loading = ElLoading.service({ text: '保存中...' })
  try {
    await api.post('/scheduling/save', data)
    ElMessage.success('保存成功')
  } catch (error) {
    ElMessage.error('保存失败')
  } finally {
    loading.close()
  }
}
```

---

## 📄 更新日志

### v1.0 (2026-04-01)
- ✅ 初始版本发布
- ✅ DragDropScheduler 组件
- ✅ OptimizationSuggestions 组件
- ✅ CostTrendChart 组件
- ✅ GanttChart 组件
- ✅ 后端 API 集成

---

**文档维护**: 刘志高  
**最后更新**: 2026-04-01  
**反馈联系**: dev@logix.com
