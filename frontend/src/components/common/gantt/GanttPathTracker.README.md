# GanttPathTracker 路径追踪组件

## 业务场景

在甘特图中可视化展示单个货柜在不同物流节点（清关、提柜、卸柜、还箱）之间的流转路径，帮助用户直观了解货柜的完整物流轨迹。

## 组件功能

- 自动检测货柜在各个节点的圆点位置
- 使用SVG绘制节点间的曲线路径（贝塞尔曲线）
- 支持虚线/实线样式配置
- 支持自定义颜色、透明度等视觉属性
- 自动响应滚动和窗口大小变化
- **连线绘制动画**：路径显示时带有绘制动画效果
- **节点脉冲动画**：节点标记点有呼吸脉冲效果
- **鼠标悬停交互**：悬停节点显示高亮圆环和节点信息
- **节点点击事件**：支持点击节点触发自定义操作

## 使用方法

### 基本用法

```vue
<template>
  <div class="gantt-container">
    <div ref="scrollContainer" class="gantt-scroll">
      <!-- 甘特图内容 -->
      
      <!-- 路径追踪组件 -->
      <GanttPathTracker
        :visible="showPathLines"
        :container="selectedContainer"
        container-selector=".container-dot"
        :scroll-container="scrollContainerRef"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { GanttPathTracker } from '@/components/common/gantt'
import type { Container } from '@/types/container'

const scrollContainer = ref<HTMLElement | null>(null)
const scrollContainerRef = computed(() => scrollContainer.value)
const showPathLines = ref(false)
const selectedContainer = ref<Container | null>(null)
</script>
```

### 高级配置

```vue
<GanttPathTracker
  :visible="showPathLines"
  :container="selectedContainer"
  container-selector=".container-dot"
  :scroll-container="scrollContainerRef"
  stroke-color="#409eff"
  :stroke-width="2"
  :is-dashed="true"
  dash-pattern="5,5"
  :opacity="0.6"
  :node-radius="4"
  node-color="#409eff"
  node-stroke-color="#ffffff"
  :node-stroke-width="2"
  :node-opacity="0.8"
  :z-index="5"
  @pathCalculated="handlePathCalculated"
/>
```

## Props 参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| visible | boolean | - | 是否显示路径追踪 |
| container | Container \| null | - | 要追踪的货柜对象 |
| containerSelector | string | - | CSS选择器，用于定位货柜圆点元素 |
| scrollContainer | HTMLElement \| null | null | 滚动容器元素引用 |
| strokeColor | string | '#409eff' | 连线颜色 |
| strokeWidth | number | 2 | 连线宽度（像素） |
| isDashed | boolean | true | 是否为虚线 |
| dashPattern | string | '5,5' | 虚线模式 |
| opacity | number | 0.6 | 连线透明度（0-1） |
| nodeRadius | number | 4 | 节点标记点半径 |
| nodeColor | string | '#409eff' | 节点标记点填充色 |
| nodeStrokeColor | string | '#ffffff' | 节点标记点边框色 |
| nodeStrokeWidth | number | 2 | 节点标记点边框宽度 |
| nodeOpacity | number | 0.8 | 节点标记点透明度 |
| zIndex | number | 5 | SVG层z-index |

## Events 事件

| 事件名 | 参数 | 说明 |
|--------|------|------|
| pathCalculated | (nodes: PathNode[]) => void | 路径计算完成时触发，返回节点坐标数组 |
| nodeHover | (node: PathNode \| null) => void | 鼠标悬停节点时触发，离开时传null |
| nodeClick | (node: PathNode) => void | 点击节点时触发 |

## 实现原理

### 1. DOM元素定位

组件通过CSS选择器查找货柜在各个节点的圆点元素：

```typescript
const selector = `${containerSelector}[data-container="${containerNumber}"][data-node="${nodeName}"]`
const elements = document.querySelectorAll(selector)
```

### 2. 坐标计算

获取每个圆点的中心坐标，并考虑滚动容器的偏移：

```typescript
const rect = element.getBoundingClientRect()
let x = rect.left + rect.width / 2
let y = rect.top + rect.height / 2

if (scrollContainer) {
  const containerRect = scrollContainer.getBoundingClientRect()
  x -= containerRect.left
  y -= containerRect.top
}
```

### 3. 路径排序

按节点日期对路径点进行时间排序，确保连线按正确顺序连接：

```typescript
nodes.sort((a, b) => {
  if (!a.nodeDate) return 1
  if (!b.nodeDate) return -1
  return a.nodeDate.getTime() - b.nodeDate.getTime()
})
```

### 4. SVG绘制

使用SVG的 `<line>` 元素绘制连线，`<circle>` 元素标记节点，`<marker>` 元素添加箭头：

```svg
<line x1="..." y1="..." x2="..." y2="..." 
      stroke="#409eff" 
      stroke-width="2" 
      stroke-dasharray="5,5" />
      
<circle cx="..." cy="..." r="4" fill="#409eff" />

<marker id="arrowhead" ...>
  <polygon points="0 0, 10 3.5, 0 7" />
</marker>
```

## 注意事项

### 1. 数据属性要求

为了让路径追踪组件能够正确定位圆点，需要在圆点元素上添加data属性：

```vue
<div
  class="container-dot"
  :data-container="container.containerNumber"
  data-node="清关"
  ...
></div>
```

支持的节点名称：
- 清关
- 提柜
- 卸柜
- 还箱

### 2. 性能优化

- 使用 `requestAnimationFrame` 延迟计算，确保DOM已渲染
- 滚动事件使用 `{ passive: true }` 选项提升性能
- `pointer-events: none` 确保SVG不干扰鼠标交互

### 3. 响应式更新

组件会自动监听以下变化并重新计算路径：
- visible 属性变化
- container 属性变化
- 滚动容器滚动事件
- 窗口大小变化事件

## 常见问题

### Q: 路径连线不显示？

A: 检查以下几点：
1. visible 属性是否为 true
2. container 是否有值
3. 圆点元素是否正确添加了 data-container 和 data-node 属性
4. containerSelector 是否正确匹配圆点元素

### Q: 连线位置不准确？

A: 确保：
1. scrollContainer 正确指向滚动容器
2. 在DOM更新后调用 updatePath（组件已自动处理）
3. 检查是否有CSS transform 影响坐标计算

### Q: 如何自定义连线样式？

A: 通过props配置：
- strokeColor: 连线颜色
- strokeWidth: 连线宽度
- isDashed: 是否虚线
- opacity: 透明度

## 扩展开发

### 添加曲线路径

当前实现使用直线连接，如需曲线可修改为使用 `<path>` 元素和贝塞尔曲线：

```typescript
// 计算控制点
const controlX = (start.x + end.x) / 2
const controlY = Math.min(start.y, end.y) - 50

// 生成二次贝塞尔曲线路径
const d = `M ${start.x} ${start.y} Q ${controlX} ${controlY} ${end.x} ${end.y}`
```

### 添加动画效果

可以使用CSS transition或SMIL动画让连线动态绘制：

```css
.line-animation {
  stroke-dasharray: 1000;
  stroke-dashoffset: 1000;
  animation: drawLine 1s ease-out forwards;
}

@keyframes drawLine {
  to {
    stroke-dashoffset: 0;
  }
}
```

## 版本历史

- v1.5 (2026-04-04): 增大曲线弯曲程度
  - curveOffset系数从0.3增加到0.5
  - 最大偏移从50px增加到80px
  - 避免连线直接穿过其他圆点，形成更明显的弧线
- v1.4 (2026-04-04): 优化曲线避开圆点
  - 连线起点和终点从圆点边缘开始，不穿过圆点中心
  - 计算方向向量，确保连线与圆点保持6px间距
  - 视觉效果更清晰，连线不会遮挡圆点
- v1.3 (2026-04-04): 移除箭头标记
  - 简化连线设计，去掉箭头标记
  - 保持优雅的曲线路径效果
  - 视觉更简洁清爽
- v1.2 (2026-04-04): 曲线路径和半圆形箭头
  - 连线改为二次贝塞尔曲线，形成优雅的弧线
  - 箭头标记改为半圆形设计，更柔和美观
  - 曲线弯曲程度根据节点间距自动调整
  - 优化动画时长为1秒，更流畅自然
- v1.1 (2026-04-04): 添加动画效果和交互增强
  - 连线绘制动画
  - 节点脉冲动画
  - 鼠标悬停高亮和节点信息显示
  - 节点点击事件支持
  - 优化样式参数（绿色主题、更大节点、更高透明度）
- v1.0 (2026-04-04): 初始版本，支持直线路径追踪

---

**作者**: 刘志高  
**创建时间**: 2026-04-04  
**状态**: 生产可用
