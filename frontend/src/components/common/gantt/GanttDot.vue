<template>
  <div
    class="container-dot"
    :data-container="container.containerNumber"
    :data-node="nodeName"
    :class="{
      clickable: true,
      'is-dragging': isDragging,
      'has-warning': hasWarning,
      'main-task': displayType === 'main',
      'dashed-task': displayType === 'dashed',
      'completed-task': isCompleted,
    }"
    :style="{
      backgroundColor: statusColor,
      borderColor: borderColor,
    }"
    draggable="true"
    @mouseenter="$emit('mouseenter', container, $event)"
    @mouseleave="$emit('mouseleave')"
    @click="$emit('click', container)"
    @contextmenu.prevent="$emit('contextmenu', container, $event)"
    @dragstart="$emit('dragstart', container, $event, nodeName)"
    @dragend="$emit('dragend')"
  ></div>
</template>

<script setup lang="ts">
/**
 * 甘特图圆点组件
 * Gantt Dot Component
 * 
 * 职责：渲染单个货柜在特定节点的圆点，处理交互事件
 * 
 * 注意：
 * - 本组件不定义任何样式，完全依赖父组件 SimpleGanttChartRefactored.vue 的样式
 * - 避免 scoped CSS 导致的样式冲突问题
 * - 所有圆点样式（container-dot, main-task, dashed-task 等）均在父组件中定义
 */

interface Props {
  /** 货柜数据 */
  container: any
  /** 节点名称（清关/提柜/卸柜/还箱） */
  nodeName: string
  /** 显示类型（main/dashed/null） */
  displayType: 'main' | 'dashed' | null
  /** 是否正在拖拽 */
  isDragging: boolean
  /** 是否有预警 */
  hasWarning: boolean
  /** 是否已完成 */
  isCompleted: boolean
  /** 状态颜色 */
  statusColor: string
  /** 边框颜色 */
  borderColor: string
}

defineProps<Props>()

defineEmits<{
  mouseenter: [container: any, event: MouseEvent]
  mouseleave: []
  click: [container: any]
  contextmenu: [container: any, event: MouseEvent]
  dragstart: [container: any, event: DragEvent, nodeName: string]
  dragend: []
}>()
</script>
