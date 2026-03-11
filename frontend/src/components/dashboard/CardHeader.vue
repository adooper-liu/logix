<script setup lang="ts">
interface CardHeaderProps {
  title: string
  icon?: any
}

defineProps<CardHeaderProps>()
</script>

<template>
  <div class="card-header">
    <span class="card-title">{{ title }}</span>
    <el-icon v-if="icon" class="card-icon"><component :is="icon" /></el-icon>
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $spacing-sm;

  .card-title {
    font-size: $font-size-base;
    font-weight: 600;
    color: $text-primary;
  }

  .card-icon {
    font-size: 18px;
    color: $text-secondary;
  }
}
</style>
