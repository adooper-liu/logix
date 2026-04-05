<template>
  <div class="container-dot-breather">
    <!-- 呼吸动画层 -->
    <div
      v-for="(dot, index) in activeDots"
      :key="`${dot.containerNumber}-${index}`"
      class="breathing-dot"
      :style="{
        position: 'absolute',
        left: `${dot.x}px`,
        top: `${dot.y}px`,
        transform: 'translate(-50%, -50%)',
      }"
    >
      <!-- 外圈脉冲 -->
      <div
        class="pulse-ring"
        :style="{
          width: `${dot.size * 2.5}px`,
          height: `${dot.size * 2.5}px`,
          borderColor: dot.color,
        }"
      />
      
      <!-- 内圈高亮 -->
      <div
        class="highlight-ring"
        :style="{
          width: `${dot.size * 1.8}px`,
          height: `${dot.size * 1.8}px`,
          backgroundColor: dot.color,
        }"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import type { Container } from '@/types/container'

interface BreathingDot {
  containerNumber: string
  x: number
  y: number
  size: number
  color: string
}

interface Props {
  /** 是否启用呼吸动画 */
  enabled: boolean
  /** 当前悬停的货柜 */
  hoveredContainer: Container | null
  /** 货柜圆点选择器 */
  dotSelector: string
  /** 滚动容器 */
  scrollContainer?: HTMLElement | null
  /** 触发延迟（毫秒） */
  triggerDelay?: number
  /** 呼吸动画颜色 */
  breathColor?: string
  /** z-index层级 */
  zIndex?: number
}

const props = withDefaults(defineProps<Props>(), {
  enabled: true,
  triggerDelay: 5000, // 5秒
  breathColor: '#67c23a', // 绿色，与路径追踪一致
  zIndex: 100,
  scrollContainer: null,
})

const emit = defineEmits<{
  (e: 'breathStart', container: Container): void
  (e: 'breathEnd', container: Container): void
  (e: 'closeTooltip'): void // 通知关闭Tooltip
}>()

const activeDots = ref<BreathingDot[]>([])
let hoverTimer: ReturnType<typeof setTimeout> | null = null
let animationFrameId: number | null = null

/**
 * 查找所有泳道中同一货柜的圆点位置
 */
const findContainerDots = (containerNumber: string): BreathingDot[] => {
  if (!props.dotSelector) return []

  const dots: BreathingDot[] = []
  const allDots = document.querySelectorAll(props.dotSelector)

  allDots.forEach((dot) => {
    const dataContainer = dot.getAttribute('data-container')
    
    if (dataContainer === containerNumber) {
      const rect = dot.getBoundingClientRect()
      const scrollContainer = props.scrollContainer

      let x = rect.left + rect.width / 2
      let y = rect.top + rect.height / 2

      // 如果有滚动容器，需要减去滚动容器的偏移
      if (scrollContainer) {
        const containerRect = scrollContainer.getBoundingClientRect()
        x -= containerRect.left
        y -= containerRect.top
      }

      // 获取圆点大小和颜色
      const computedStyle = window.getComputedStyle(dot as Element)
      const size = parseFloat(computedStyle.width) || 12
      const backgroundColor = computedStyle.backgroundColor

      dots.push({
        containerNumber,
        x,
        y,
        size,
        color: props.breathColor,
      })
    }
  })

  return dots
}

/**
 * 启动呼吸动画
 */
const startBreathing = (container: Container) => {
  const dots = findContainerDots(container.containerNumber)
  
  if (dots.length > 0) {
    activeDots.value = dots
    emit('breathStart', container)
    emit('closeTooltip') // 通知父组件关闭Tooltip
    console.log(`[呼吸动画] 货柜 ${container.containerNumber} 开始呼吸，共 ${dots.length} 个节点`)
  }
}

/**
 * 停止呼吸动画
 */
const stopBreathing = (container: Container) => {
  activeDots.value = []
  emit('breathEnd', container)
  console.log(`[呼吸动画] 货柜 ${container.containerNumber} 停止呼吸`)
}

/**
 * 处理鼠标悬停
 */
const handleHoverStart = () => {
  if (!props.enabled || !props.hoveredContainer) return

  // 清除之前的定时器
  if (hoverTimer) {
    clearTimeout(hoverTimer)
  }

  // 设置新的定时器，5秒后触发动画
  hoverTimer = setTimeout(() => {
    startBreathing(props.hoveredContainer!)
  }, props.triggerDelay)
}

/**
 * 处理鼠标离开
 */
const handleHoverEnd = () => {
  // 清除定时器
  if (hoverTimer) {
    clearTimeout(hoverTimer)
    hoverTimer = null
  }

  // 立即停止动画
  if (activeDots.value.length > 0 && props.hoveredContainer) {
    stopBreathing(props.hoveredContainer)
  }
}

/**
 * 更新圆点位置（响应滚动和窗口变化）
 */
const updateDotPositions = () => {
  if (activeDots.value.length > 0 && props.hoveredContainer) {
    const containerNumber = props.hoveredContainer.containerNumber
    const updatedDots = findContainerDots(containerNumber)
    
    if (updatedDots.length > 0) {
      activeDots.value = updatedDots
    }
  }
}

/**
 * 滚动事件处理
 */
const handleScroll = () => {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
  }
  
  animationFrameId = requestAnimationFrame(() => {
    updateDotPositions()
  })
}

/**
 * 窗口大小变化处理
 */
const handleResize = () => {
  updateDotPositions()
}

// 监听悬停货柜变化
watch(
  () => props.hoveredContainer,
  (newContainer, oldContainer) => {
    // 如果切换到新货柜，重置定时器
    if (newContainer && newContainer.containerNumber !== oldContainer?.containerNumber) {
      handleHoverEnd()
      handleHoverStart()
    } else if (!newContainer) {
      // 如果没有悬停货柜，停止动画
      handleHoverEnd()
    }
  }
)

// 监听启用状态
watch(
  () => props.enabled,
  (enabled) => {
    if (!enabled) {
      handleHoverEnd()
    }
  }
)

onMounted(() => {
  // 添加滚动监听
  if (props.scrollContainer) {
    props.scrollContainer.addEventListener('scroll', handleScroll, { passive: true })
  }
  
  // 添加窗口大小变化监听
  window.addEventListener('resize', handleResize)
  
  // 初始化
  if (props.hoveredContainer) {
    handleHoverStart()
  }
})

onUnmounted(() => {
  // 清理定时器
  if (hoverTimer) {
    clearTimeout(hoverTimer)
  }
  
  // 清理动画帧
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
  }
  
  // 移除事件监听
  if (props.scrollContainer) {
    props.scrollContainer.removeEventListener('scroll', handleScroll)
  }
  window.removeEventListener('resize', handleResize)
})

// 暴露方法供父组件调用
defineExpose({
  startBreathing,
  stopBreathing,
  updateDotPositions,
})
</script>

<style scoped>
.container-dot-breather {
  pointer-events: none;
  overflow: visible;
}

.breathing-dot {
  position: absolute;
  pointer-events: none;
}

/* 外圈脉冲动画 */
.pulse-ring {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  border: 2px solid;
  border-radius: 50%;
  opacity: 0;
  animation: pulseRing 2s ease-out infinite;
}

@keyframes pulseRing {
  0% {
    transform: translate(-50%, -50%) scale(0.8);
    opacity: 0.8;
  }
  100% {
    transform: translate(-50%, -50%) scale(1.5);
    opacity: 0;
  }
}

/* 内圈高亮动画 */
.highlight-ring {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  opacity: 0;
  animation: highlightPulse 2s ease-in-out infinite;
}

@keyframes highlightPulse {
  0%, 100% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 0.3;
  }
  50% {
    transform: translate(-50%, -50%) scale(1.2);
    opacity: 0.6;
  }
}
</style>
