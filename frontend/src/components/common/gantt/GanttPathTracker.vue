<template>
  <svg
    v-if="visible && container"
    class="gantt-path-tracker"
    :style="{
      position: 'absolute',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      zIndex: zIndex,
    }"
  >
    <!-- 路径连线（曲线） -->
    <path
      v-for="(segment, index) in pathSegments"
      :key="`segment-${index}`"
      class="path-line-animated"
      :d="generateCurvePath(segment)"
      :stroke="strokeColor"
      :stroke-width="strokeWidth"
      :stroke-dasharray="isDashed ? dashPattern : undefined"
      :opacity="opacity"
      fill="none"
    />

    <!-- 节点标记点 -->
    <g v-for="(node, index) in pathNodes" :key="`node-group-${index}`">
      <!-- 悬停时的高亮圆环 -->
      <circle
        v-if="hoveredNodeIndex === index"
        :cx="node.x"
        :cy="node.y"
        :r="nodeRadius + 4"
        fill="none"
        :stroke="nodeColor"
        :stroke-width="2"
        opacity="0.5"
      />

      <!-- 节点标记点 -->
      <circle
        class="node-pulse"
        :cx="node.x"
        :cy="node.y"
        :r="nodeRadius"
        :fill="nodeColor"
        :stroke="nodeStrokeColor"
        :stroke-width="nodeStrokeWidth"
        :opacity="hoveredNodeIndex === index ? 1 : nodeOpacity"
        style="cursor: pointer"
        @mouseenter="handleNodeHover(index, true)"
        @mouseleave="handleNodeHover(index, false)"
        @click="handleNodeClick(index)"
      />

      <!-- 节点标签 -->
      <text
        v-if="hoveredNodeIndex === index"
        :x="node.x + 10"
        :y="node.y - 10"
        font-size="12"
        fill="#303133"
        font-weight="bold"
      >
        {{ node.nodeName }}
        <tspan v-if="node.nodeDate" :x="node.x + 10" dy="16">
          {{ formatDate(node.nodeDate) }}
        </tspan>
      </text>
    </g>
  </svg>
</template>

<script setup lang="ts">
import type { Container } from '@/types/container'
import { onMounted, onUnmounted, ref, watch } from 'vue'

interface PathNode {
  x: number
  y: number
  nodeName: string
  nodeDate?: Date
}

interface PathSegment {
  x1: number
  y1: number
  x2: number
  y2: number
}

interface Props {
  visible: boolean
  container: Container | null
  containerSelector: string // CSS选择器，用于定位货柜圆点元素
  scrollContainer?: HTMLElement | null // 滚动容器，用于计算偏移
  strokeColor?: string
  strokeWidth?: number
  isDashed?: boolean
  dashPattern?: string
  opacity?: number
  nodeRadius?: number
  nodeColor?: string
  nodeStrokeColor?: string
  nodeStrokeWidth?: number
  nodeOpacity?: number
  zIndex?: number
}

const props = withDefaults(defineProps<Props>(), {
  strokeColor: '#67c23a', // 绿色，与预警正常状态一致
  strokeWidth: 2.5, // 稍微加粗，更清晰
  isDashed: true,
  dashPattern: '6,4', // 调整虚线间隔，更美观
  opacity: 0.7, // 提高透明度，更醒目
  nodeRadius: 5, // 增大节点标记
  nodeColor: '#67c23a', // 绿色节点
  nodeStrokeColor: '#ffffff',
  nodeStrokeWidth: 2.5,
  nodeOpacity: 0.9, // 节点更不透明，更突出
  zIndex: 10, // 提高z-index，确保在其他元素之上
  scrollContainer: null,
})

const emit = defineEmits<{
  (e: 'pathCalculated', nodes: PathNode[]): void
  (e: 'nodeClick', node: PathNode): void
  (e: 'nodeHover', node: PathNode | null): void
}>()

const pathNodes = ref<PathNode[]>([])
const pathSegments = ref<PathSegment[]>([])
const hoveredNodeIndex = ref<number | null>(null)

// 获取货柜在各个节点的圆点元素位置
const calculatePathPositions = (): PathNode[] => {
  if (!props.container) return []

  const nodes: PathNode[] = []
  const containerNumber = props.container.containerNumber

  // 甘特图中的五个节点顺序
  const nodeOrder = ['清关', '提柜', '卸柜', '还箱']

  nodeOrder.forEach(nodeName => {
    // 使用data属性查找对应节点的圆点
    let elements: Element[] = []

    if (props.containerSelector) {
      // 查找所有匹配的圆点
      const allDots = document.querySelectorAll(props.containerSelector)

      allDots.forEach(dot => {
        const dataContainer = dot.getAttribute('data-container')
        const dataNode = dot.getAttribute('data-node')

        // 检查是否匹配当前货柜和节点
        if (dataContainer === containerNumber && dataNode === nodeName) {
          elements.push(dot)
        }
      })
    }

    elements.forEach(element => {
      const rect = element.getBoundingClientRect()
      const scrollContainer = props.scrollContainer

      let x = rect.left + rect.width / 2
      let y = rect.top + rect.height / 2

      // 如果有滚动容器，需要减去滚动容器的偏移
      if (scrollContainer) {
        const containerRect = scrollContainer.getBoundingClientRect()
        x -= containerRect.left
        y -= containerRect.top
      }

      // 获取节点日期（从货柜数据中）
      let nodeDate: Date | undefined
      switch (nodeName) {
        case '清关':
          nodeDate = (props.container as any).customsClearanceDate || undefined
          break
        case '提柜':
          nodeDate = (props.container as any).pickupDate || undefined
          break
        case '卸柜':
          nodeDate = (props.container as any).unloadingDate || undefined
          break
        case '还箱':
          nodeDate = (props.container as any).returnDate || undefined
          break
      }

      nodes.push({
        x,
        y,
        nodeName,
        nodeDate,
      })
    })
  })

  // 按日期排序
  nodes.sort((a, b) => {
    if (!a.nodeDate) return 1
    if (!b.nodeDate) return -1
    return a.nodeDate.getTime() - b.nodeDate.getTime()
  })

  return nodes
}

// 计算路径线段
const calculatePathSegments = (nodes: PathNode[]): PathSegment[] => {
  const segments: PathSegment[] = []

  for (let i = 0; i < nodes.length - 1; i++) {
    const start = nodes[i]
    const end = nodes[i + 1]

    segments.push({
      x1: start.x,
      y1: start.y,
      x2: end.x,
      y2: end.y,
    })
  }

  return segments
}

// 生成曲线路径（二次贝塞尔曲线，避开圆点）
const generateCurvePath = (segment: PathSegment): string => {
  const { x1, y1, x2, y2 } = segment

  // 圆点半径 + 额外间距，确保连线不接触圆点
  const dotRadius = 6 // 圆点半径5px + 1px间距

  // 计算起点和终点的方向向量
  const dx = x2 - x1
  const dy = y2 - y1
  const distance = Math.sqrt(dx * dx + dy * dy)

  if (distance === 0) return ''

  // 归一化方向向量
  const unitX = dx / distance
  const unitY = dy / distance

  // 调整起点和终点，从圆点边缘开始/结束
  const startX = x1 + unitX * dotRadius
  const startY = y1 + unitY * dotRadius
  const endX = x2 - unitX * dotRadius
  const endY = y2 - unitY * dotRadius

  // 计算控制点：在起点和终点的中点上方偏移
  const midX = (startX + endX) / 2
  const midY = (startY + endY) / 2

  // 根据水平距离调整曲线弯曲程度
  const horizontalDistance = Math.abs(endX - startX)
  const curveOffset = Math.min(horizontalDistance * 0.5, 80) // 增大系数和最大值，形成更明显的弧线

  // 控制点在中间偏上位置，形成向上弯曲的弧线
  const controlX = midX
  const controlY = midY - curveOffset

  // 生成二次贝塞尔曲线路径：M 起点 Q 控制点 终点
  return `M ${startX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}`
}

// 更新路径
const updatePath = () => {
  const nodes = calculatePathPositions()
  pathNodes.value = nodes
  pathSegments.value = calculatePathSegments(nodes)

  emit('pathCalculated', nodes)
}

// 节点鼠标悬停
const handleNodeHover = (index: number, isEnter: boolean) => {
  hoveredNodeIndex.value = isEnter ? index : null
  if (isEnter && pathNodes.value[index]) {
    emit('nodeHover', pathNodes.value[index])
  } else {
    emit('nodeHover', null)
  }
}

// 节点点击
const handleNodeClick = (index: number) => {
  if (pathNodes.value[index]) {
    emit('nodeClick', pathNodes.value[index])
  }
}

// 格式化日期
const formatDate = (date: Date): string => {
  return date.toLocaleDateString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
  })
}

// 监听可见性和容器变化
watch(
  () => [props.visible, props.container],
  () => {
    if (props.visible && props.container) {
      // 使用 requestAnimationFrame 确保DOM已渲染
      requestAnimationFrame(() => {
        updatePath()
      })
    } else {
      pathNodes.value = []
      pathSegments.value = []
    }
  },
  { immediate: true }
)

// 监听滚动事件
const handleScroll = () => {
  if (props.visible && props.container) {
    requestAnimationFrame(() => {
      updatePath()
    })
  }
}

onMounted(() => {
  if (props.scrollContainer) {
    props.scrollContainer.addEventListener('scroll', handleScroll, { passive: true })
  }
  window.addEventListener('resize', handleScroll)
})

onUnmounted(() => {
  if (props.scrollContainer) {
    props.scrollContainer.removeEventListener('scroll', handleScroll)
  }
  window.removeEventListener('resize', handleScroll)
})
</script>

<style scoped>
.gantt-path-tracker {
  overflow: visible;
}

/* 连线绘制动画（适配曲线） */
.path-line-animated {
  stroke-dasharray: 1000;
  stroke-dashoffset: 1000;
  animation: drawCurve 1s ease-out forwards;
}

@keyframes drawCurve {
  to {
    stroke-dashoffset: 0;
  }
}

/* 节点脉冲动画 */
.node-pulse {
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 0.9;
    r: 5;
  }
  50% {
    opacity: 0.6;
    r: 7;
  }
}
</style>
