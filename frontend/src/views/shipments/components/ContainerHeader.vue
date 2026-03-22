<script setup lang="ts">
import { useRouter } from 'vue-router'
import { ArrowLeft, DArrowLeft, DArrowRight, Refresh } from '@element-plus/icons-vue'

defineProps<{
  containerNumber: string
  loading: boolean
  currentContainerIndex?: number
  containerListLength?: number
  /** 与列表/详情物流状态一致，展示在标题旁 */
  statusBadge?: { text: string; type: 'success' | 'warning' | 'danger' | 'info' }
}>()

const emit = defineEmits<{
  refresh: []
  navigateToPrevious: []
  navigateToNext: []
  editSchedule: []
  exportDetail: []
}>()

const router = useRouter()

const goBack = () => {
  router.push('/shipments')
}

const handleRefresh = () => {
  emit('refresh')
}

const handleNavigateToPrevious = () => {
  emit('navigateToPrevious')
}

const handleNavigateToNext = () => {
  emit('navigateToNext')
}
</script>

<template>
  <header class="page-header">
    <div class="header-left">
      <el-button :icon="ArrowLeft" circle size="large" class="back-btn" @click="goBack" />
      <div class="header-info">
        <nav class="breadcrumb">
          <span class="breadcrumb-item" @click="goBack">货柜列表</span>
          <span class="breadcrumb-sep">/</span>
          <span class="breadcrumb-current">货柜详情</span>
        </nav>
        <div class="title-row">
          <h1 class="page-title">货柜详情</h1>
          <el-tag
            v-if="statusBadge"
            :type="statusBadge.type"
            effect="plain"
            size="large"
            class="status-tag"
          >
            {{ statusBadge.text }}
          </el-tag>
        </div>
        <p class="container-number">
          <span class="label">柜号</span>
          <span class="value">{{ containerNumber }}</span>
        </p>
      </div>
    </div>
    <div class="header-right">
      <el-button type="primary" @click="emit('editSchedule')">编辑计划</el-button>
      <el-button @click="emit('exportDetail')">导出详情</el-button>
      <el-tooltip content="上一个货柜" placement="bottom">
        <el-button
          :icon="DArrowLeft"
          :disabled="currentContainerIndex === 0"
          @click="handleNavigateToPrevious"
        />
      </el-tooltip>
      <el-tooltip content="下一个货柜" placement="bottom">
        <el-button
          :icon="DArrowRight"
          :disabled="currentContainerIndex === (containerListLength ?? 0) - 1"
          @click="handleNavigateToNext"
        />
      </el-tooltip>
      <el-button :icon="Refresh" @click="handleRefresh">刷新</el-button>
    </div>
  </header>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: $spacing-md;
  padding-bottom: 0;
  flex-wrap: wrap;
  gap: $spacing-md;
}

.header-left {
  display: flex;
  align-items: flex-start;
  gap: $spacing-md;
  min-width: 0;
}

.back-btn {
  flex-shrink: 0;
}

.header-info {
  min-width: 0;
}

.title-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: $spacing-sm;
  margin-bottom: $spacing-xs;
}

.status-tag {
  font-weight: 600;
}

.header-right {
  display: flex;
  align-items: center;
  gap: $spacing-xs;
  flex-wrap: wrap;
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
  font-size: $font-size-xl;
  font-weight: 600;
  color: $text-primary;
  margin: 0;
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
    letter-spacing: 0.04em;
  }
}
</style>
