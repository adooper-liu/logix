<template>
  <div class="gantt-statistics-panel">
    <div class="stats-container">
      <div class="stat-item">
        <el-icon :size="18" color="#909399"><DataLine /></el-icon>
        <span class="stat-value">{{ totalContainers }}</span>
        <span class="stat-label">总货柜</span>
      </div>
      <div class="stat-item">
        <el-icon :size="18" color="#e6a23c"><Position /></el-icon>
        <span class="stat-value warning-text">{{ atPortCount }}</span>
        <span class="stat-label">已到港</span>
      </div>
      <div class="stat-item">
        <el-icon :size="18" color="#f56c6c"><Warning /></el-icon>
        <span class="stat-value danger-text">{{ criticalCount }}</span>
        <span class="stat-label">即将超期</span>
      </div>
      <div class="stat-item">
        <el-icon :size="18" color="#ff0000"><CircleClose /></el-icon>
        <span class="stat-value danger-high-text">{{ overdueCount }}</span>
        <span class="stat-label">逾期未提</span>
      </div>
      <div class="stat-item">
        <el-icon :size="18" color="#67c23a"><CircleCheck /></el-icon>
        <span class="stat-value success-text">{{ returnedCount }}</span>
        <span class="stat-label">已还箱</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Container } from '@/types/container'
import { CircleCheck, CircleClose, DataLine, Position, Warning } from '@element-plus/icons-vue'
import dayjs from 'dayjs'
import { computed } from 'vue'

const props = defineProps<{
  containers: Container[]
}>()

// ========== 调试代码 ==========
import { watch } from 'vue'
watch(
  () => props.containers,
  newVal => {
    console.log('[StatisticsPanel] 收到 containers:', newVal.length)
    if (newVal.length > 0) {
      console.log('[StatisticsPanel] 第一个货柜:', newVal[0])
      console.log('[StatisticsPanel] 第一个货柜的 portOperations:', newVal[0].portOperations)

      // 检查有多少货柜有 lastFreeDate
      const withLastFreeDate = newVal.filter(c =>
        c.portOperations?.some(op => op.lastFreeDate)
      ).length
      console.log('[StatisticsPanel] 有 lastFreeDate 的货柜数量:', withLastFreeDate)
    }
  },
  { immediate: true, deep: true }
)
// ============================

// 计算总数
const totalContainers = computed(() => props.containers.length)

// 计算已到港数量
const atPortCount = computed(() => {
  return props.containers.filter(c => c.logisticsStatus === 'at_port').length
})

// 计算即将超期数量（3 天内）- 使用 portOperations 中的 lastFreeDate
const criticalCount = computed(() => {
  return props.containers.filter(c => {
    // 从 portOperations 中查找 lastFreeDate
    const lastFreeDate = c.portOperations?.find(op => op.lastFreeDate)?.lastFreeDate
    if (!lastFreeDate) return false
    const daysUntilDeadline = dayjs(lastFreeDate).diff(dayjs(), 'day')
    return daysUntilDeadline >= 0 && daysUntilDeadline <= 3
  }).length
})

// 计算逾期未提数量
const overdueCount = computed(() => {
  return props.containers.filter(c => {
    const lastFreeDate = c.portOperations?.find(op => op.lastFreeDate)?.lastFreeDate
    if (!lastFreeDate) return false

    const status = c.logisticsStatus?.toLowerCase()
    const isPickedUp =
      status === 'picked_up' || status === 'unloaded' || status === 'returned_empty'

    return dayjs().isAfter(dayjs(lastFreeDate)) && !isPickedUp
  }).length
})

// 计算已还箱数量
const returnedCount = computed(() => {
  return props.containers.filter(c => c.logisticsStatus === 'returned_empty').length
})
</script>

<style scoped>
.gantt-statistics-panel {
  padding: 8px 16px;
  background: linear-gradient(135deg, #f8f9fa 0%, #f1f3f5 100%);
  border-radius: 8px;
  margin-bottom: 12px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.stats-container {
  display: flex;
  gap: 24px;
  align-items: center;
  justify-content: space-around;
  flex-wrap: nowrap;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: white;
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  transition: all 0.2s ease;
  min-width: fit-content;
}

.stat-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
}

.stat-value {
  font-size: 18px;
  font-weight: bold;
  color: #303133;
  min-width: 32px;
  text-align: center;
}

.warning-text {
  color: #e6a23c;
}

.danger-text {
  color: #f56c6c;
}

.danger-high-text {
  color: #ff0000;
  font-weight: 900;
}

.success-text {
  color: #67c23a;
}

.stat-label {
  font-size: 13px;
  color: #909399;
  white-space: nowrap;
}
</style>
