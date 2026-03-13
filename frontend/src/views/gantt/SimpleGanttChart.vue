<template>
  <div class="gantt-chart-page">
    <SimpleGanttChart />
  </div>
</template>

<script setup lang="ts">
import SimpleGanttChart from '@/components/common/SimpleGanttChart.vue'
</script>

<style scoped>
.gantt-chart-page {
  padding: 0;
  background: #f5f7fa;
  min-height: calc(100vh - 60px);
}
</style>
