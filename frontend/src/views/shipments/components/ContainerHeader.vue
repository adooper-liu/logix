<script setup lang="ts">
import { useRouter } from 'vue-router'
import { ArrowLeft, Refresh } from '@element-plus/icons-vue'

defineProps<{
  containerNumber: string
  loading: boolean
}>()

const emit = defineEmits<{
  refresh: []
}>()

const router = useRouter()

const goBack = () => {
  router.push('/shipments')
}

const handleRefresh = () => {
  emit('refresh')
}
</script>

<template>
  <header class="page-header">
    <div class="header-left">
      <el-button
        :icon="ArrowLeft"
        @click="goBack"
        circle
        size="large"
        class="back-btn"
      />
      <div class="header-info">
        <nav class="breadcrumb">
          <span class="breadcrumb-item" @click="goBack">货柜列表</span>
          <span class="breadcrumb-sep">/</span>
          <span class="breadcrumb-current">货柜详情</span>
        </nav>
        <h1 class="page-title">货柜详情</h1>
        <p class="container-number">
          <span class="label">集装箱号</span>
          <span class="value">{{ containerNumber }}</span>
        </p>
      </div>
    </div>
    <div class="header-right">
      <el-button :icon="Refresh" @click="handleRefresh" type="primary" plain>
        刷新
      </el-button>
    </div>
  </header>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: $spacing-lg;
  padding: $spacing-md 0;
  position: relative;
  z-index: 100;
  flex-wrap: wrap;
  gap: $spacing-md;
}

.header-left {
  display: flex;
  align-items: center;
  gap: $spacing-md;
}

.back-btn {
  flex-shrink: 0;
}

.header-info {
  min-width: 0;
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: $spacing-xs;
  font-size: $font-size-xs;
  color: $text-secondary;
  margin-bottom: $spacing-xs;

  .breadcrumb-item {
    cursor: pointer;
    color: $primary-color;
    transition: $transition-base;

    &:hover {
      color: $primary-dark;
      text-decoration: underline;
    }
  }

  .breadcrumb-sep {
    color: $border-base;
  }

  .breadcrumb-current {
    color: $text-secondary;
  }
}

.page-title {
  font-size: $font-size-xxl;
  font-weight: 600;
  color: $text-primary;
  margin: 0 0 $spacing-xs 0;
  letter-spacing: -0.02em;
  line-height: 1.3;
}

.container-number {
  margin: 0;
  font-size: $font-size-sm;
  display: flex;
  align-items: baseline;
  gap: $spacing-sm;

  .label {
    color: $text-secondary;
  }

  .value {
    font-weight: 600;
    color: $text-primary;
    font-family: ui-monospace, monospace;
    letter-spacing: 0.05em;
  }
}
</style>
