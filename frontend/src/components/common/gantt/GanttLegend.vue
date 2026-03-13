<template>
  <div class="gantt-legend">
    <div class="legend-title">图例：</div>
    <div class="legend-items">
      <div v-for="(color, status) in statusColors" :key="status" class="legend-item">
        <div class="legend-dot" :style="{ backgroundColor: color }"></div>
        <span>{{ getStatusLabel(status) }}</span>
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
  gap: 10px;
  padding: 10px;
  background: #f5f7fa;
  border-radius: 4px;
  flex-shrink: 0;
  margin-top: 20px;
}

.legend-title {
  font-size: 14px;
  color: #606266;
  font-weight: bold;
}

.legend-items {
  display: flex;
  gap: 15px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: #606266;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}
</style>
