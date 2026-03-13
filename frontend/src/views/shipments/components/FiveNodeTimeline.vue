<template>
  <div class="five-node-timeline">
    <h3 class="timeline-title">五节点时间线</h3>
    
    <div class="timeline-container">
      <!-- 清关节点 -->
      <div class="node-item" :class="{ 'has-warning': hasNodeWarning('customs') }">
        <div class="node-header">
          <div class="node-icon customs-icon">
            <el-icon><document /></el-icon>
          </div>
          <div class="node-title">清关</div>
          <div class="node-status" :class="getNodeStatusClass('customs')">
            {{ getNodeStatusText('customs') }}
          </div>
        </div>
        
        <div class="node-dates">
          <div class="date-item planned">
            <span class="date-label">计划日期：</span>
            <span class="date-value">{{ formatDate(containerData?.customsPlannedDate) }}</span>
          </div>
          <div class="date-item actual">
            <span class="date-label">实际日期：</span>
            <span class="date-value">{{ formatDate(containerData?.customsActualDate) }}</span>
          </div>
        </div>
        
        <div v-if="hasNodeWarning('customs')" class="node-warning">
          <el-icon class="warning-icon"><warning /></el-icon>
          <span class="warning-text">{{ getNodeWarningText('customs') }}</span>
        </div>
      </div>

      <!-- 拖卡节点 -->
      <div class="node-item" :class="{ 'has-warning': hasNodeWarning('trucking') }">
        <div class="node-header">
          <div class="node-icon trucking-icon">
            <el-icon><truck /></el-icon>
          </div>
          <div class="node-title">拖卡</div>
          <div class="node-status" :class="getNodeStatusClass('trucking')">
            {{ getNodeStatusText('trucking') }}
          </div>
        </div>
        
        <div class="node-dates">
          <div class="date-item planned">
            <span class="date-label">计划日期：</span>
            <span class="date-value">{{ formatDate(containerData?.truckingTransports?.[0]?.plannedPickupDate) }}</span>
          </div>
          <div class="date-item actual">
            <span class="date-label">实际日期：</span>
            <span class="date-value">{{ formatDate(containerData?.truckingTransports?.[0]?.actualPickupDate) }}</span>
          </div>
        </div>
        
        <div v-if="hasNodeWarning('trucking')" class="node-warning">
          <el-icon class="warning-icon"><warning /></el-icon>
          <span class="warning-text">{{ getNodeWarningText('trucking') }}</span>
        </div>
      </div>

      <!-- 卸柜节点 -->
      <div class="node-item" :class="{ 'has-warning': hasNodeWarning('unloading') }">
        <div class="node-header">
          <div class="node-icon unloading-icon">
            <el-icon><box /></el-icon>
          </div>
          <div class="node-title">卸柜</div>
          <div class="node-status" :class="getNodeStatusClass('unloading')">
            {{ getNodeStatusText('unloading') }}
          </div>
        </div>
        
        <div class="node-dates">
          <div class="date-item planned">
            <span class="date-label">计划日期：</span>
            <span class="date-value">{{ formatDate(containerData?.unloadingPlannedDate) }}</span>
          </div>
          <div class="date-item actual">
            <span class="date-label">实际日期：</span>
            <span class="date-value">{{ formatDate(containerData?.unloadingActualDate) }}</span>
          </div>
        </div>
        
        <div v-if="hasNodeWarning('unloading')" class="node-warning">
          <el-icon class="warning-icon"><warning /></el-icon>
          <span class="warning-text">{{ getNodeWarningText('unloading') }}</span>
        </div>
      </div>

      <!-- 还箱节点 -->
      <div class="node-item" :class="{ 'has-warning': hasNodeWarning('return') }">
        <div class="node-header">
          <div class="node-icon return-icon">
            <el-icon><refresh /></el-icon>
          </div>
          <div class="node-title">还箱</div>
          <div class="node-status" :class="getNodeStatusClass('return')">
            {{ getNodeStatusText('return') }}
          </div>
        </div>
        
        <div class="node-dates">
          <div class="date-item planned">
            <span class="date-label">计划日期：</span>
            <span class="date-value">{{ formatDate(containerData?.returnPlannedDate) }}</span>
          </div>
          <div class="date-item actual">
            <span class="date-label">实际日期：</span>
            <span class="date-value">{{ formatDate(containerData?.returnActualDate) }}</span>
          </div>
        </div>
        
        <div v-if="hasNodeWarning('return')" class="node-warning">
          <el-icon class="warning-icon"><warning /></el-icon>
          <span class="warning-text">{{ getNodeWarningText('return') }}</span>
        </div>
      </div>

      <!-- 查验节点 -->
      <div class="node-item" :class="{ 'has-warning': hasNodeWarning('inspection') }">
        <div class="node-header">
          <div class="node-icon inspection-icon">
            <el-icon><search /></el-icon>
          </div>
          <div class="node-title">查验</div>
          <div class="node-status" :class="getNodeStatusClass('inspection')">
            {{ getNodeStatusText('inspection') }}
          </div>
        </div>
        
        <div class="node-dates">
          <div class="date-item planned">
            <span class="date-label">计划日期：</span>
            <span class="date-value">{{ formatDate(containerData?.inspectionPlannedDate) }}</span>
          </div>
          <div class="date-item actual">
            <span class="date-label">实际日期：</span>
            <span class="date-value">{{ formatDate(containerData?.inspectionActualDate) }}</span>
          </div>
        </div>
        
        <div v-if="hasNodeWarning('inspection')" class="node-warning">
          <el-icon class="warning-icon"><warning /></el-icon>
          <span class="warning-text">{{ getNodeWarningText('inspection') }}</span>
        </div>
      </div>
    </div>

    <!-- 费用汇总 -->
    <div class="cost-summary" v-if="demurrageCalculation">
      <h4 class="summary-title">费用汇总</h4>
      <div class="cost-items">
        <div class="cost-item">
          <span class="cost-label">滞港费：</span>
          <span class="cost-value">{{ demurrageCalculation?.totalAmount || 0 }} {{ demurrageCalculation?.currency || 'USD' }}</span>
        </div>
        <div class="cost-item">
          <span class="cost-label">其他费用：</span>
          <span class="cost-value">{{ containerData?.otherCosts || 0 }} {{ demurrageCalculation?.currency || 'USD' }}</span>
        </div>
        <div class="cost-item total">
          <span class="cost-label">总费用：</span>
          <span class="cost-value">{{ (parseFloat(demurrageCalculation?.totalAmount || '0') + parseFloat(containerData?.otherCosts || '0')).toFixed(2) }} {{ demurrageCalculation?.currency || 'USD' }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import dayjs from 'dayjs'
import { Document, Truck, Box, Refresh, Search, Warning } from '@element-plus/icons-vue'

const props = defineProps({
  containerData: {
    type: Object,
    required: true
  },
  demurrageCalculation: {
    type: Object,
    default: null
  }
})

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

.five-node-timeline {
  margin-bottom: $spacing-lg;
}

.timeline-title {
  font-size: $font-size-lg;
  font-weight: 600;
  color: $text-primary;
  margin-bottom: $spacing-md;
  padding-bottom: $spacing-sm;
  border-bottom: 1px solid $border-lighter;
}

.timeline-container {
  display: flex;
  flex-direction: column;
  gap: $spacing-md;
  position: relative;
  
  /* 连接线 */
  &::before {
    content: '';
    position: absolute;
    left: 20px;
    top: 0;
    bottom: 0;
    width: 2px;
    background-color: $border-lighter;
  }
}

.node-item {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
  padding: $spacing-md;
  background: #fff;
  border: 1px solid $border-lighter;
  border-radius: $radius-base;
  box-shadow: $shadow-light;
  position: relative;
  transition: $transition-base;
  margin-left: 50px;
  
  &::before {
    content: '';
    position: absolute;
    left: -40px;
    top: 20px;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background-color: #fff;
    border: 2px solid $primary-color;
    z-index: 1;
  }
  
  &:hover {
    box-shadow: $shadow-base;
  }
  
  &.has-warning {
    border-color: $warning-color;
    
    &::before {
      border-color: $warning-color;
      background-color: $warning-color;
    }
  }
}

.node-header {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  margin-bottom: $spacing-sm;
}

.node-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  color: #fff;
  flex-shrink: 0;
  
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
  font-size: $font-size-base;
  font-weight: 600;
  color: $text-primary;
  flex: 1;
}

.node-status {
  padding: 4px 12px;
  border-radius: 999px;
  font-size: $font-size-xs;
  font-weight: 500;
  
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

.node-dates {
  display: flex;
  flex-direction: column;
  gap: $spacing-xs;
  padding-left: 44px;
}

.date-item {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  font-size: $font-size-sm;
  
  &.planned {
    color: $text-secondary;
  }
  
  &.actual {
    color: $text-primary;
  }
}

.date-label {
  min-width: 80px;
  color: $text-tertiary;
}

.date-value {
  font-weight: 500;
}

.node-warning {
  display: flex;
  align-items: center;
  gap: $spacing-xs;
  padding: $spacing-xs $spacing-sm;
  background-color: rgba($warning-color, 0.1);
  border-radius: $radius-small;
  font-size: $font-size-xs;
  color: $warning-color;
  margin-top: $spacing-xs;
  padding-left: 44px;
}

.warning-icon {
  font-size: 14px;
}

/* 费用汇总 */
.cost-summary {
  margin-top: $spacing-lg;
  padding: $spacing-md;
  background: #f5f7fa;
  border-radius: $radius-base;
  border: 1px solid $border-lighter;
}

.summary-title {
  font-size: $font-size-base;
  font-weight: 600;
  color: $text-primary;
  margin-bottom: $spacing-sm;
}

.cost-items {
  display: flex;
  flex-direction: column;
  gap: $spacing-xs;
}

.cost-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: $font-size-sm;
  
  &.total {
    font-weight: 600;
    margin-top: $spacing-xs;
    padding-top: $spacing-xs;
    border-top: 1px solid $border-lighter;
  }
}

.cost-label {
  color: $text-secondary;
}

.cost-value {
  color: $text-primary;
  font-weight: 500;
}
</style>