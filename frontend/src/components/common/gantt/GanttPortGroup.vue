<template>
  <div class="port-group">
    <div class="port-name" @click="$emit('toggleCollapse', portKey)" style="cursor: pointer">
      <el-icon class="collapse-icon" :class="{ collapsed: isCollapsed }">
        <arrow-right />
      </el-icon>
      {{ getPortDisplayName(containers) }}
      <span class="group-count">({{ containers.length }})</span>
    </div>
    <div v-if="!isCollapsed" class="port-group-cells">
      <div
        v-for="date in dates"
        :key="date.getTime()"
        class="date-cell"
        :class="{
          'is-weekend': isWeekend(date),
          'is-today': isToday(date),
          'is-drop-zone': isDropZone && dayjs(dragOverDate).isSame(date, 'day'),
        }"
        @dragover="$emit('dragover', $event, date)"
        @drop="$emit('drop', date)"
      >
        <div class="dots-container">
          <div
            v-for="container in getContainersByDate(date)"
            :key="container.containerNumber"
            class="container-dot"
            :class="{
              clickable: true,
              'is-dragging': isDragging(container),
              'has-warning': hasWarning(container),
            }"
            :style="{
              backgroundColor: getStatusColor(container.logisticsStatus),
              border: getContainerBorder(container),
            }"
            @mouseenter="$emit('showTooltip', container, $event)"
            @mouseleave="$emit('hideTooltip')"
            @click="$emit('clickDot', container)"
            @contextmenu.prevent="$emit('openContextMenu', container, $event)"
            draggable="true"
            @dragstart="$emit('dragStart', container, $event)"
            @dragend="$emit('dragEnd')"
          ></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Container } from '@/types/container'
import { ArrowRight } from '@element-plus/icons-vue'
import dayjs from 'dayjs'

const props = defineProps<{
  portKey: string
  containers: Container[]
  dates: Date[]
  isCollapsed: boolean
  dragOverDate?: Date | null
  isDropZone: boolean
  draggingContainer?: Container | null
  statusColors: Record<string, string>
  // 预警系统
  getContainerAlerts?: (container: Container) => any[]
  hasAlert?: (container: Container) => boolean
  getContainerBorderStyle?: (container: Container) => string
}>()

const emit = defineEmits<{
  toggleCollapse: [portKey: string]
  showTooltip: [container: Container, event: MouseEvent]
  hideTooltip: []
  clickDot: [container: Container]
  openContextMenu: [container: Container, event: MouseEvent]
  dragStart: [container: Container, event: DragEvent]
  dragEnd: []
  dragover: [event: DragEvent, date: Date]
  drop: [date: Date]
}>()

const getPortDisplayName = (containers: Container[]): string => {
  if (containers.length === 0) return '未指定'
  const firstContainer = containers[0]
  const portName = firstContainer.latestPortOperation?.portName
  const portCode = firstContainer.destinationPort
  return portName || portCode || '未指定'
}

const getContainersByDate = (date: Date): Container[] => {
  const dateStr = dayjs(date).format('YYYY-MM-DD')
  return props.containers.filter(container => {
    const containerDate = getContainerDate(container)
    if (!containerDate) return false
    const containerDateStr = dayjs(containerDate).format('YYYY-MM-DD')
    return containerDateStr === dateStr
  })
}

const getContainerDate = (container: Container): Date | null => {
  if (container.ataDestPort) return new Date(container.ataDestPort)
  if (container.etaCorrection) return new Date(container.etaCorrection)
  if (container.etaDestPort) return new Date(container.etaDestPort)

  if (container.portOperations && container.portOperations.length > 0) {
    const destPortOp = container.portOperations.find((op: any) => op.portType === 'destination')
    if (destPortOp?.ataDestPort) return new Date(destPortOp.ataDestPort)
    if (destPortOp?.etaCorrection) return new Date(destPortOp.etaCorrection)
    if (destPortOp?.etaDestPort) return new Date(destPortOp.etaDestPort)
  }

  if (container.seaFreight?.eta) return new Date(container.seaFreight.eta)
  return null
}

const getStatusColor = (status?: string): string => {
  return props.statusColors[status?.toLowerCase() || 'not_shipped'] || '#909399'
}

const isDragging = (container: Container): boolean => {
  return props.draggingContainer?.containerNumber === container.containerNumber
}

const hasWarning = (container: Container): boolean => {
  if (!props.hasAlert) return false
  return props.hasAlert(container)
}

const getContainerBorder = (container: Container): string => {
  if (!props.getContainerBorderStyle) return 'none'
  return props.getContainerBorderStyle(container)
}

const isWeekend = (date: Date): boolean => {
  const day = date.getDay()
  return day === 0 || day === 6
}

const isToday = (date: Date): boolean => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const compareDate = new Date(date)
  compareDate.setHours(0, 0, 0, 0)
  return today.getTime() === compareDate.getTime()
}
</script>

<style scoped>
.port-group {
  display: flex;
  min-width: 100%;
  border-bottom: 2px solid #e4e7ed;
}

.port-group-cells {
  display: flex;
  flex: 1;
  min-width: 0;
}

.port-name {
  flex: 0 0 120px;
  min-height: 150px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  font-weight: bold;
  color: #303133;
  border-right: 1px solid #e4e7ed;
  background: #fafafa;
  padding: 10px;
  font-size: 13px;
  text-align: left;
  word-break: break-word;
  gap: 8px;
}

.collapse-icon {
  transition: transform 0.3s ease;
  flex-shrink: 0;
}

.collapse-icon.collapsed {
  transform: rotate(90deg);
}

.group-count {
  font-size: 12px;
  color: #909399;
  margin-left: auto;
  flex-shrink: 0;
}

.date-cell {
  flex: 0 0 150px;
  border-right: 1px solid #e4e7ed;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  position: relative;
  min-width: 150px;
  min-height: 150px;
}

.date-cell.is-weekend {
  background-color: #fef0f0;
}

.date-cell.is-today {
  background-color: #ecf5ff;
}

.date-cell.is-drop-zone {
  background-color: #e1f3d8;
  border: 2px dashed #67c23a;
}

.dots-container {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-content: flex-start;
  padding-top: 5px;
  gap: 8px;
}

.container-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  cursor: pointer;
  transition: transform 0.2s;
}

.container-dot:hover {
  transform: scale(1.8);
  box-shadow: 0 0 6px rgba(0, 0, 0, 0.4);
}

.container-dot.clickable {
  cursor: pointer;
  transition: transform 0.2s;
}

.container-dot.clickable:hover {
  transform: scale(1.3);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.container-dot.is-dragging {
  opacity: 0.5;
  transform: scale(1.2);
}

/* 预警标识 */
.container-dot.has-warning {
  box-shadow: 0 0 8px rgba(245, 108, 108, 0.6);
  animation: pulse-warning 2s ease-in-out infinite;
}

@keyframes pulse-warning {
  0%,
  100% {
    box-shadow: 0 0 8px rgba(245, 108, 108, 0.6);
  }
  50% {
    box-shadow: 0 0 16px rgba(245, 108, 108, 0.9);
  }
}
</style>
