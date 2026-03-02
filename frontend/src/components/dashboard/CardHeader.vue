<script setup lang="ts">
import { TrendCharts } from '@element-plus/icons-vue'

interface CardHeaderProps {
  title: string
  icon?: any
}

const props = defineProps<CardHeaderProps>()
</script>

<template>
  <div class="card-header">
    <span>{{ title }}</span>
    <el-icon v-if="icon"><component :is="icon" /></el-icon>
  </div>
</template>

<style scoped lang="scss">
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: bold;
}
</style>
