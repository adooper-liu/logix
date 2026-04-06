<template>
  <div
    class="container-dot"
    :data-container="container.containerNumber"
    :data-node="nodeName"
    :data-testid="`${getNodeTestid(nodeName)}-node`"
    :data-date="getPlannedDate()"
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

const props = defineProps<Props>()

/**
 * 根据节点名称生成 testid
 * @param nodeName 节点名称（清关/提柜/卸柜/还箱）
 * @returns testid 字符串（customs/pickup/unload/return）
 */
const getNodeTestid = (nodeName: string): string => {
  const mapping: Record<string, string> = {
    清关: 'customs',
    提柜: 'pickup',
    卸柜: 'unload',
    还箱: 'return',
  }
  return mapping[nodeName] || nodeName.toLowerCase()
}

/**
 * 获取计划日期（YYYY-MM-DD 格式）
 * @returns 计划日期字符串
 */
const getPlannedDate = (): string => {
  const nodeMapping: Record<string, string> = {
    清关: 'customsClearanceDate',
    提柜: 'plannedPickupDate',
    卸柜: 'plannedUnloadDate',
    还箱: 'plannedReturnDate',
  }

  const dateField = nodeMapping[props.nodeName]
  if (!dateField) return ''

  // 从不同的数据源获取日期
  let dateValue: any = null

  switch (props.nodeName) {
    case '清关':
      dateValue = props.container.customsClearance?.customsClearanceDate
      break
    case '提柜':
      dateValue = props.container.truckingTransports?.[0]?.plannedPickupDate
      break
    case '卸柜':
      dateValue = props.container.warehouseOperations?.[0]?.plannedUnloadDate
      break
    case '还箱':
      dateValue = props.container.emptyReturns?.[0]?.plannedReturnDate
      break
  }

  if (!dateValue) return ''

  // 转换为 YYYY-MM-DD 格式
  const date = new Date(dateValue)
  if (isNaN(date.getTime())) return ''

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

defineEmits<{
  mouseenter: [container: any, event: MouseEvent]
  mouseleave: []
  click: [container: any]
  contextmenu: [container: any, event: MouseEvent]
  dragstart: [container: any, event: DragEvent, nodeName: string]
  dragend: []
}>()
</script>
