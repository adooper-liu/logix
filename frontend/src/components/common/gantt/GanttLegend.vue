<template>
  <div class="gantt-legend">
    <div class="legend-items">
      <!-- 物流状态颜色 -->
      <div v-for="(color, status) in statusColors" :key="status" class="legend-item">
        <div class="legend-dot" :style="{ backgroundColor: color }"></div>
        <span>{{ getStatusLabel(status) }}</span>
      </div>
      
      <!-- 分隔线 -->
      <div class="legend-separator"></div>
      
      <!-- 节点类型说明 -->
      <div class="legend-item">
        <div class="legend-dot legend-dot-solid"></div>
        <span>活跃节点</span>
      </div>
      <div class="legend-item">
        <div class="legend-dot legend-dot-dashed"></div>
        <span>待激活</span>
      </div>
      
      <!-- 分隔线 -->
      <div class="legend-separator"></div>
      
      <!-- 预警边框颜色 -->
      <div class="legend-item">
        <div class="legend-dot legend-border-danger"></div>
        <span>已逾期</span>
      </div>
      <div class="legend-item">
        <div class="legend-dot legend-border-warning"></div>
        <span>3天内到期</span>
      </div>
      <div class="legend-item">
        <div class="legend-dot legend-border-normal"></div>
        <span>正常</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  statusColors: Record<string, string>
}>()

const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    not_shipped: '未出运',
    shipped: '已出运',
    in_transit: '在途',
    at_port: '已到港',
    picked_up: '已提柜',
    unloaded: '已卸柜',
    returned_empty: '已还箱',
  }
  return labels[status] || status
}
</script>

<style scoped>
.gantt-legend {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.legend-items {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #606266;
}

.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

/* 实心圆点 - 活跃节点 */
.legend-dot-solid {
  background-color: #ffffff;
  border: 2px solid #67c23a;
}

/* 虚线圆点 - 待激活节点 */
.legend-dot-dashed {
  background: transparent;
  border: 2px dashed #67c23a;
}

/* 预警边框颜色 - 已逾期（红色） */
.legend-border-danger {
  background-color: #ffffff;
  border: 2px solid #f56c6c;
}

/* 预警边框颜色 - 3天内到期（橙色） */
.legend-border-warning {
  background-color: #ffffff;
  border: 2px solid #e6a23c;
}

/* 预警边框颜色 - 正常（绿色） */
.legend-border-normal {
  background-color: #ffffff;
  border: 2px solid #67c23a;
}

/* 分隔线 */
.legend-separator {
  width: 1px;
  height: 16px;
  background-color: #dcdfe6;
  margin: 0 4px;
}
</style>
