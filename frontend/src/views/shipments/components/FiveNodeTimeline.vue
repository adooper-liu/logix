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
  // 支持两种数据格式：
  // 1. containerData: 来自货柜详情 API 的数据
  // 2. fiveNodeData: 来自五节点 API 的数据
  containerData: {
    type: Object,
    default: null
  },
  fiveNodeData: {
    type: Object,
    default: null
  }
})

// 合并数据源，优先使用 fiveNodeData
const mergedData = computed(() => {
  if (props.fiveNodeData) {
    return {
      ...props.fiveNodeData,
      // 保留原始字段以便向后兼容
      truckingTransports: props.fiveNodeData.fiveNodes?.trucking ? [{
        plannedPickupDate: props.fiveNodeData.fiveNodes.trucking.plannedDate,
        actualPickupDate: props.fiveNodeData.fiveNodes.trucking.actualDate,
        pickupTime: props.fiveNodeData.fiveNodes.trucking.pickupTime,
        deliveryTime: props.fiveNodeData.fiveNodes.trucking.deliveryTime,
      }] : undefined,
      warehouseOperations: props.fiveNodeData.fiveNodes?.unloading ? [{
        unloadingTime: props.fiveNodeData.fiveNodes.unloading.actualDate,
      }] : undefined,
      emptyReturns: props.fiveNodeData.fiveNodes?.emptyReturn ? [{
        returnTime: props.fiveNodeData.fiveNodes.emptyReturn.returnTime,
      }] : undefined,
      inspectionRecord: props.fiveNodeData.fiveNodes?.inspection ? {
        inspectionPlannedDate: props.fiveNodeData.fiveNodes.inspection.plannedDate,
        inspectionDate: props.fiveNodeData.fiveNodes.inspection.actualDate,
        latestStatus: props.fiveNodeData.fiveNodes.inspection.latestStatus,
        customsClearanceStatus: props.fiveNodeData.fiveNodes.inspection.customsClearanceStatus,
      } : undefined,
    }
  }
  return props.containerData || {}
})

const nodes = computed(() => [
  { key: 'customs', title: '清关', icon: Document },
  { key: 'trucking', title: '拖卡', icon: Van },
  { key: 'unloading', title: '卸柜', icon: Box },
  { key: 'return', title: '还箱', icon: Refresh },
  { key: 'inspection', title: '查验', icon: Search }
])

const getNodePlannedDate = (node: string): string | Date | undefined => {
  const data = mergedData.value
  switch (node) {
    case 'customs':
      return data?.fiveNodes?.customs?.plannedDate || data?.customsPlannedDate
    case 'trucking':
      return data?.fiveNodes?.trucking?.plannedDate || data?.truckingTransports?.[0]?.plannedPickupDate
    case 'unloading':
      return data?.fiveNodes?.unloading?.plannedDate || data?.unloadingPlannedDate
    case 'return':
      return data?.fiveNodes?.emptyReturn?.plannedDate || data?.returnPlannedDate
    case 'inspection':
      return data?.fiveNodes?.inspection?.plannedDate || data?.inspectionPlannedDate
    default:
      return undefined
  }
}

const getNodeActualDate = (node: string): string | Date | undefined => {
  const data = mergedData.value
  switch (node) {
    case 'customs':
      return data?.fiveNodes?.customs?.actualDate || data?.customsActualDate
    case 'trucking':
      return data?.fiveNodes?.trucking?.actualDate || data?.truckingTransports?.[0]?.actualPickupDate
    case 'unloading':
      return data?.fiveNodes?.unloading?.actualDate || data?.unloadingActualDate
    case 'return':
      return data?.fiveNodes?.emptyReturn?.actualDate || data?.returnActualDate
    case 'inspection':
      return data?.fiveNodes?.inspection?.actualDate || data?.inspectionActualDate
    default:
      return undefined
  }
}

const formatDate = (date?: string | Date): string => {
  if (!date) return '-'
  return dayjs(date).format('YYYY-MM-DD')
}

const getNodeStatus = (node: string): string => {
  const data = mergedData.value
  
  // 优先使用 fiveNodes 数据
  if (data?.fiveNodes) {
    const nodeData = data.fiveNodes[node as keyof typeof data.fiveNodes]
    if (nodeData) {
      const status = nodeData.status as string
      const actualDate = nodeData.actualDate
      const plannedDate = nodeData.plannedDate
      
      if (actualDate) return 'completed'
      if (status && ['cleared', 'pickedUp', 'unloaded', 'returned', 'inspected'].includes(status)) return 'completed'
      if (plannedDate && dayjs(plannedDate).isBefore(dayjs())) return 'warning'
      if (status && ['pending', 'notPickedUp', 'notUnloaded', 'notReturned', 'notInspected'].includes(status)) return 'pending'
    }
  }
  
  // 回退到原有逻辑
  switch (node) {
    case 'customs':
      if (data?.customsActualDate) return 'completed'
      if (data?.customsPlannedDate && dayjs(data.customsPlannedDate).isBefore(dayjs())) return 'warning'
      return 'pending'
    case 'trucking':
      if (data?.truckingTransports?.[0]?.actualPickupDate) return 'completed'
      if (data?.truckingTransports?.[0]?.plannedPickupDate && dayjs(data.truckingTransports[0].plannedPickupDate).isBefore(dayjs())) return 'warning'
      return 'pending'
    case 'unloading':
      if (data?.unloadingActualDate) return 'completed'
      if (data?.unloadingPlannedDate && dayjs(data.unloadingPlannedDate).isBefore(dayjs())) return 'warning'
      return 'pending'
    case 'return':
      if (data?.returnActualDate) return 'completed'
      if (data?.returnPlannedDate && dayjs(data.returnPlannedDate).isBefore(dayjs())) return 'warning'
      return 'pending'
    case 'inspection':
      if (data?.inspectionActualDate) return 'completed'
      if (data?.inspectionPlannedDate && dayjs(data.inspectionPlannedDate).isBefore(dayjs())) return 'warning'
      return 'pending'
    default:
      return 'pending'
  }
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

const hasNodeWarning = (node: string): boolean => {
  return getNodeStatus(node) === 'warning'
}

const getNodeWarningText = (node: string): string => {
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
