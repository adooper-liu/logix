<template>
  <el-card class="five-node-card" shadow="hover">
    <template #header>
      <div class="card-header">
        <span class="card-icon">📋</span>
        <span class="card-title">五节点时间线</span>
      </div>
    </template>
    
    <div class="timeline-container">
      <div
        v-for="node in nodes"
        :key="node.key"
        class="node-item"
        :class="{ 'has-warning': hasNodeWarning(node.key) }"
      >
        <div class="node-header">
          <div class="node-icon" :class="`${node.key}-icon`">
            <el-icon>
              <component :is="node.icon" />
            </el-icon>
          </div>
          <div class="node-title">{{ node.title }}</div>
        </div>
        
        <div class="node-dates">
          <div class="date-item planned">
            <span class="date-value">{{ formatDate(getNodePlannedDate(node.key)) }}</span>
            <span class="date-label">计划</span>
          </div>
          <div class="date-item actual">
            <span class="date-value">{{ formatDate(getNodeActualDate(node.key)) }}</span>
            <span class="date-label">实际</span>
          </div>
        </div>
        
        <div class="node-status" :class="getNodeStatusClass(node.key)">
          {{ getNodeStatusText(node.key) }}
        </div>
        
        <div v-if="hasNodeWarning(node.key)" class="node-warning">
          <el-icon class="warning-icon"><warning /></el-icon>
          <span class="warning-text">{{ getNodeWarningText(node.key) }}</span>
        </div>
      </div>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import dayjs from 'dayjs'
import { Document, Van, Box, Refresh, Search, Warning } from '@element-plus/icons-vue'

const props = defineProps({
  containerData: {
    type: Object,
    required: true
  }
})

const nodes = computed(() => [
  { key: 'customs', title: '清关', icon: Document },
  { key: 'trucking', title: '拖卡', icon: Van },
  { key: 'unloading', title: '卸柜', icon: Box },
  { key: 'return', title: '还箱', icon: Refresh },
  { key: 'inspection', title: '查验', icon: Search }
])

const getNodePlannedDate = (node: string): string | Date | undefined => {
  const container = props.containerData
  switch (node) {
    case 'customs':
      return container?.customsPlannedDate
    case 'trucking':
      return container?.truckingTransports?.[0]?.plannedPickupDate
    case 'unloading':
      return container?.unloadingPlannedDate
    case 'return':
      return container?.returnPlannedDate
    case 'inspection':
      return container?.inspectionPlannedDate
    default:
      return undefined
  }
}

const getNodeActualDate = (node: string): string | Date | undefined => {
  const container = props.containerData
  switch (node) {
    case 'customs':
      return container?.customsActualDate
    case 'trucking':
      return container?.truckingTransports?.[0]?.actualPickupDate
    case 'unloading':
      return container?.unloadingActualDate
    case 'return':
      return container?.returnActualDate
    case 'inspection':
      return container?.inspectionActualDate
    default:
      return undefined
  }
}

const formatDate = (date?: string | Date): string => {
  if (!date) return '-'
  return dayjs(date).format('YYYY-MM-DD')
}

const getNodeStatusClass = (node: string): string => {
  const status = getNodeStatus(node)
  switch (status) {
    case 'completed':
      return 'status-completed'
    case 'in-progress':
      return 'status-in-progress'
    case 'pending':
      return 'status-pending'
    case 'warning':
      return 'status-warning'
    default:
      return 'status-pending'
  }
}

const getNodeStatusText = (node: string): string => {
  const status = getNodeStatus(node)
  switch (status) {
    case 'completed':
      return '已完成'
    case 'in-progress':
      return '进行中'
    case 'pending':
      return '待处理'
    case 'warning':
      return '预警'
    default:
      return '待处理'
  }
}

const getNodeStatus = (node: string): string => {
  const container = props.containerData
  switch (node) {
    case 'customs':
      if (container?.customsActualDate) return 'completed'
      if (container?.customsPlannedDate && dayjs(container.customsPlannedDate).isBefore(dayjs())) return 'warning'
      return 'pending'
    case 'trucking':
      if (container?.truckingTransports?.[0]?.actualPickupDate) return 'completed'
      if (container?.truckingTransports?.[0]?.plannedPickupDate && dayjs(container.truckingTransports[0].plannedPickupDate).isBefore(dayjs())) return 'warning'
      return 'pending'
    case 'unloading':
      if (container?.unloadingActualDate) return 'completed'
      if (container?.unloadingPlannedDate && dayjs(container.unloadingPlannedDate).isBefore(dayjs())) return 'warning'
      return 'pending'
    case 'return':
      if (container?.returnActualDate) return 'completed'
      if (container?.returnPlannedDate && dayjs(container.returnPlannedDate).isBefore(dayjs())) return 'warning'
      return 'pending'
    case 'inspection':
      if (container?.inspectionActualDate) return 'completed'
      if (container?.inspectionPlannedDate && dayjs(container.inspectionPlannedDate).isBefore(dayjs())) return 'warning'
      return 'pending'
    default:
      return 'pending'
  }
}

const hasNodeWarning = (node: string): boolean => {
  return getNodeStatus(node) === 'warning'
}

const getNodeWarningText = (node: string): string => {
  const container = props.containerData
  switch (node) {
    case 'customs':
      return '清关计划日期已过，尚未完成'
    case 'trucking':
      return '拖卡计划日期已过，尚未完成'
    case 'unloading':
      return '卸柜计划日期已过，尚未完成'
    case 'return':
      return '还箱计划日期已过，尚未完成'
    case 'inspection':
      return '查验计划日期已过，尚未完成'
    default:
      return '计划日期已过，尚未完成'
  }
}
</script>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.five-node-card {
  border-radius: $radius-large;
  border: 1px solid $border-lighter;
  box-shadow: $shadow-light;
  margin-bottom: 0;

  :deep(.el-card__header) {
    padding: $spacing-sm $spacing-md;
    border-bottom: 1px solid $border-lighter;
    background: $bg-page;
  }

  :deep(.el-card__body) {
    padding: $spacing-md;
  }

  .card-header {
    display: flex;
    align-items: center;
    gap: $spacing-xs;

    .card-icon {
      font-size: $font-size-base;
      line-height: 1;
    }

    .card-title {
      font-size: $font-size-sm;
      font-weight: 600;
      color: $text-primary;
    }
  }

  .timeline-container {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: $spacing-sm;
    width: 100%;
  }

  .node-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: $spacing-sm;
    background: #fff;
    border: 1px solid $border-lighter;
    border-radius: $radius-base;
    box-shadow: $shadow-light;
    transition: $transition-base;
    position: relative;
    min-height: 140px;
    
    &:hover {
      box-shadow: $shadow-base;
      transform: translateY(-1px);
    }
    
    &.has-warning {
      border-color: $warning-color;
    }
  }

  .node-header {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    margin-bottom: 8px;
    width: 100%;
  }

  .node-icon {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    color: #fff;
    flex-shrink: 0;
    margin-bottom: 4px;
    
    &.customs-icon {
      background-color: #409eff;
    }
    
    &.trucking-icon {
      background-color: #e6a23c;
    }
    
    &.unloading-icon {
      background-color: #67c23a;
    }
    
    &.return-icon {
      background-color: #909399;
    }
    
    &.inspection-icon {
      background-color: #f56c6c;
    }
  }

  .node-title {
    font-size: 11px;
    font-weight: 600;
    color: $text-primary;
    text-align: center;
    letter-spacing: 0.02em;
  }

  .node-dates {
    display: flex;
    flex-direction: row;
    justify-content: space-around;
    gap: $spacing-xs;
    width: 100%;
    margin-bottom: 8px;
  }

  .date-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    font-size: 10px;
    flex: 1;
    
    &.planned {
      color: $text-secondary;
    }
    
    &.actual {
      color: $text-primary;
    }
  }

  .date-label {
    font-size: 9px;
    color: $text-secondary;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .date-value {
    font-size: 11px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }

  .node-status {
    padding: 3px 8px;
    border-radius: 999px;
    font-size: 10px;
    font-weight: 500;
    margin-bottom: 4px;
    
    &.status-completed {
      background-color: rgba($success-color, 0.1);
      color: $success-color;
    }
    
    &.status-in-progress {
      background-color: rgba($warning-color, 0.1);
      color: $warning-color;
    }
    
    &.status-pending {
      background-color: rgba($info-color, 0.1);
      color: $info-color;
    }
    
    &.status-warning {
      background-color: rgba($warning-color, 0.1);
      color: $warning-color;
    }
  }

  .node-warning {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 3px 6px;
    background-color: rgba($warning-color, 0.1);
    border-radius: $radius-small;
    font-size: 9px;
    color: $warning-color;
    margin-top: 4px;
    width: 100%;
    text-align: center;
    justify-content: center;
  }

  .warning-icon {
    font-size: 10px;
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .five-node-card {
    .timeline-container {
      grid-template-columns: 1fr;
      gap: 8px;
    }
    
    .node-item {
      min-height: 120px;
      padding: $spacing-sm;
    }
    
    .node-icon {
      width: 24px;
      height: 24px;
      font-size: 12px;
    }
    
    .node-title {
      font-size: $font-size-xs;
    }
    
    .date-value {
      font-size: $font-size-xs;
    }
  }
}
</style>