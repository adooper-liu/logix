<template>
  <div class="gantt-legend">
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
</style>
