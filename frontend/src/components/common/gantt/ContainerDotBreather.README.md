# 货柜圆点呼吸动画组件

## 业务场景

当用户在甘特图中将鼠标悬停在某个货柜的圆点上超过5秒时，系统会自动高亮显示该货柜在所有泳道（清关、提柜、卸柜、还箱等节点）上的所有圆点，通过呼吸动画效果帮助用户快速识别和追踪同一货柜的完整流转路径。

## 组件功能

- **延迟触发**：鼠标悬停5秒后自动触发动画
- **全局高亮**：同时高亮所有泳道中的同一货柜圆点
- **呼吸动画**：双层脉冲效果（外圈扩散 + 内圈缩放）
- **自动更新**：响应滚动和窗口大小变化
- **即时响应**：鼠标离开立即停止动画
- **可配置**：支持自定义颜色、延迟时间等参数

## 使用方法

### 基本用法

```vue
<template>
  <div class="gantt-container">
    <!-- 甘特图内容 -->
    <SimpleGanttChartRefactored />
    
    <!-- 呼吸动画组件 -->
    <ContainerDotBreather
      :enabled="true"
      :hovered-container="hoveredContainer"
      dot-selector=".container-dot"
      :scroll-container="ganttScrollContainer"
      @breath-start="handleBreathStart"
      @breath-end="handleBreathEnd"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import ContainerDotBreather from '@/components/common/gantt/ContainerDotBreather.vue'
import type { Container } from '@/types/container'

const hoveredContainer = ref<Container | null>(null)
const ganttScrollContainer = ref<HTMLElement | null>(null)

const handleBreathStart = (container: Container) => {
  console.log(`货柜 ${container.containerNumber} 开始呼吸动画`)
}

const handleBreathEnd = (container: Container) => {
  console.log(`货柜 ${container.containerNumber} 停止呼吸动画`)
}
</script>
```

### 高级配置

```vue
<ContainerDotBreather
  :enabled="true"
  :hovered-container="hoveredContainer"
  dot-selector=".container-dot"
  :scroll-container="ganttScrollContainer"
  :trigger-delay="3000"        <!-- 3秒触发（默认5秒） -->
  breath-color="#409eff"       <!-- 蓝色呼吸效果 -->
  :z-index="200"               <!-- 更高层级 -->
  @breath-start="handleBreathStart"
  @breath-end="handleBreathEnd"
/>
```

### 手动控制

```vue
<script setup lang="ts">
import { ref } from 'vue'

const breatherRef = ref()

// 手动启动呼吸动画
const startBreath = (container: Container) => {
  breatherRef.value?.startBreathing(container)
}

// 手动停止呼吸动画
const stopBreath = (container: Container) => {
  breatherRef.value?.stopBreathing(container)
}

// 更新圆点位置
const updatePositions = () => {
  breatherRef.value?.updateDotPositions()
}
</script>

<template>
  <ContainerDotBreather
    ref="breatherRef"
    :enabled="false"  <!-- 禁用自动触发 -->
    :hovered-container="null"
    dot-selector=".container-dot"
  />
</template>
```

## Props

| 属性名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| enabled | boolean | true | 是否启用呼吸动画 |
| hoveredContainer | Container \| null | null | 当前悬停的货柜对象 |
| dotSelector | string | '.container-dot' | 货柜圆点的CSS选择器 |
| scrollContainer | HTMLElement \| null | null | 滚动容器元素引用 |
| triggerDelay | number | 5000 | 触发延迟时间（毫秒） |
| breathColor | string | '#67c23a' | 呼吸动画颜色（绿色） |
| zIndex | number | 100 | z-index层级 |

## Events

| 事件名 | 参数 | 说明 |
|--------|------|------|
| breathStart | (container: Container) => void | 呼吸动画开始时触发 |
| breathEnd | (container: Container) => void | 呼吸动画结束时触发 |
| closeTooltip | () => void | 通知父组件关闭Tooltip（5秒后自动触发） |

## Exposed Methods

| 方法名 | 参数 | 返回值 | 说明 |
|--------|------|--------|------|
| startBreathing | (container: Container) => void | void | 手动启动呼吸动画 |
| stopBreathing | (container: Container) => void | void | 手动停止呼吸动画 |
| updateDotPositions | () => void | void | 手动更新圆点位置 |

## 实现原理

### 1. 延迟触发机制

```typescript
// 鼠标悬停时设置定时器
hoverTimer = setTimeout(() => {
  startBreathing(props.hoveredContainer!)
}, props.triggerDelay) // 默认5000ms

// 鼠标离开时清除定时器
if (hoverTimer) {
  clearTimeout(hoverTimer)
}
```

### 2. 多节点查找

```typescript
// 遍历所有圆点，查找同一货柜的所有节点
const allDots = document.querySelectorAll(props.dotSelector)

allDots.forEach((dot) => {
  const dataContainer = dot.getAttribute('data-container')
  
  if (dataContainer === containerNumber) {
    // 计算位置并添加到列表
    dots.push({ x, y, size, color })
  }
})
```

### 3. 坐标计算

```typescript
// 获取圆点相对于滚动容器的坐标
const rect = dot.getBoundingClientRect()
let x = rect.left + rect.width / 2
let y = rect.top + rect.height / 2

if (scrollContainer) {
  const containerRect = scrollContainer.getBoundingClientRect()
  x -= containerRect.left
  y -= containerRect.top
}
```

### 4. 呼吸动画

**外圈脉冲**：
```css
@keyframes pulseRing {
  0% { transform: scale(0.8); opacity: 0.8; }
  100% { transform: scale(1.5); opacity: 0; }
}
```
- 从0.8倍放大到1.5倍
- 透明度从0.8降到0
- 形成向外扩散的效果

**内圈高亮**：
```css
@keyframes highlightPulse {
  0%, 100% { transform: scale(1); opacity: 0.3; }
  50% { transform: scale(1.2); opacity: 0.6; }
}
```
- 在1倍到1.2倍之间循环
- 透明度在0.3到0.6之间变化
- 形成呼吸节奏感

### 5. 响应式更新

```typescript
// 监听滚动事件（使用requestAnimationFrame优化）
const handleScroll = () => {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
  }
  
  animationFrameId = requestAnimationFrame(() => {
    updateDotPositions()
  })
}

// 监听窗口大小变化
window.addEventListener('resize', handleResize)
```

## 样式定制

### 调整动画速度

```css
/* 更快的动画 */
.pulse-ring {
  animation: pulseRing 1s ease-out infinite;
}

.highlight-ring {
  animation: highlightPulse 1s ease-in-out infinite;
}
```

### 调整动画幅度

```css
/* 更大的扩散范围 */
@keyframes pulseRing {
  0% { transform: translate(-50%, -50%) scale(0.6); }
  100% { transform: translate(-50%, -50%) scale(2.0); }
}

/* 更强的呼吸效果 */
@keyframes highlightPulse {
  0%, 100% { transform: translate(-50%, -50%) scale(0.9); opacity: 0.2; }
  50% { transform: translate(-50%, -50%) scale(1.4); opacity: 0.8; }
}
```

### 添加更多动画层

```vue
<!-- 三层脉冲效果 -->
<div class="pulse-ring-1" />
<div class="pulse-ring-2" />
<div class="pulse-ring-3" />
```

```css
.pulse-ring-1 { animation-delay: 0s; }
.pulse-ring-2 { animation-delay: 0.3s; }
.pulse-ring-3 { animation-delay: 0.6s; }
```

## 性能优化

### 1. 被动事件监听

```typescript
props.scrollContainer.addEventListener('scroll', handleScroll, { passive: true })
```

### 2. 动画帧优化

```typescript
animationFrameId = requestAnimationFrame(() => {
  updateDotPositions()
})
```

### 3. 条件渲染

```vue
<!-- 只在有活动圆点时渲染 -->
<div v-for="(dot, index) in activeDots" :key="...">
```

### 4. 及时清理

```typescript
onUnmounted(() => {
  if (hoverTimer) clearTimeout(hoverTimer)
  if (animationFrameId) cancelAnimationFrame(animationFrameId)
  // 移除事件监听
})
```

## 常见问题

### Q1: 动画不显示？

**可能原因**：
1. `enabled` 设置为 false
2. `hoveredContainer` 为 null
3. `dotSelector` 选择器不正确
4. 圆点没有 `data-container` 属性

**排查方法**：
```javascript
console.log('悬停货柜:', hoveredContainer.value)
console.log('圆点数量:', document.querySelectorAll('.container-dot').length)
console.log('活动圆点:', activeDots.value)
```

### Q2: 动画位置不准确？

**可能原因**：
1. `scrollContainer` 未正确设置
2. 页面布局发生变化

**解决方法**：
```typescript
// 手动更新位置
breatherRef.value?.updateDotPositions()
```

### Q3: 动画太频繁或不够频繁？

**调整触发延迟**：
```vue
<!-- 更快触发 -->
<trigger-delay="2000" />

<!-- 更慢触发 -->
<trigger-delay="8000" />
```

### Q4: 多个货柜同时悬停？

**当前设计**：只支持单个货柜的呼吸动画

**扩展方案**：
```typescript
interface Props {
  hoveredContainers: Container[] // 改为数组
}

// 同时显示多个货柜的呼吸动画
const activeDots = computed(() => {
  return props.hoveredContainers.flatMap(container => 
    findContainerDots(container.containerNumber)
  )
})
```

## 最佳实践

### 1. 与Tooltip配合

```vue
<template>
  <!-- Tooltip显示基本信息 -->
  <GanttTooltip :container="hoveredContainer" />
  
  <!-- 5秒后显示呼吸动画 -->
  <ContainerDotBreather
    :hovered-container="hoveredContainer"
    :trigger-delay="5000"
  />
</template>
```

### 2. 与路径追踪配合

```vue
<template>
  <!-- 路径连线 -->
  <GanttPathTracker
    :visible="showPathLines"
    :container="pathLineContainer"
  />
  
  <!-- 呼吸动画 -->
  <ContainerDotBreather
    :hovered-container="hoveredContainer"
    breath-color="#67c23a" <!-- 与路径颜色一致 -->
  />
</template>
```

### 3. 用户提示

```vue
<template>
  <!-- 显示提示信息 -->
  <div v-if="isBreathing" class="breath-hint">
    长按查看完整路径
  </div>
  
  <ContainerDotBreather
    @breath-start="isBreathing = true"
    @breath-end="isBreathing = false"
  />
</template>
```

## 扩展开发

### 添加点击交互

```typescript
const emit = defineEmits<{
  (e: 'dotClick', dot: BreathingDot): void
}>()

// 在模板中添加点击事件
<div
  class="breathing-dot"
  @click="emit('dotClick', dot)"
  style="cursor: pointer; pointer-events: auto"
>
```

### 添加声音反馈

```typescript
const playBreathSound = () => {
  const audio = new Audio('/sounds/breath.mp3')
  audio.volume = 0.3
  audio.play()
}

watch(activeDots, (newDots) => {
  if (newDots.length > 0) {
    playBreathSound()
  }
})
```

### 添加震动反馈（移动端）

```typescript
const triggerHapticFeedback = () => {
  if (navigator.vibrate) {
    navigator.vibrate([50, 100, 50])
  }
}

const startBreathing = (container: Container) => {
  triggerHapticFeedback()
  // ... 其他逻辑
}
```

## 版本历史

- v1.1 (2026-04-04): 添加Tooltip自动关闭功能
  - 呼吸动画启动时自动发出closeTooltip事件
  - 父组件监听事件后关闭Tooltip
  - 避免Tooltip和呼吸动画同时显示，视觉更清爽
- v1.0 (2026-04-04): 初始版本
  - 5秒延迟触发机制
  - 双层呼吸动画效果
  - 响应滚动和窗口变化
  - 完整的TypeScript类型支持

---

**创建日期**: 2026-04-04  
**创建人员**: 刘志高  
**遵循规范**: SKILL原则（简洁即美、真实第一、业务导向）
