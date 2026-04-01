<template>
  <div class="gantt-header">
    <div class="header-left">
      <div class="filter-info">
        <span class="filter-label">维度：</span>
        <span class="filter-value">{{ filterLabel || '全部货柜' }}</span>
        <span class="container-count">（ {{ containerCount }} 个货柜）</span>
      </div>
      <slot></slot>
    </div>
    <div class="header-right">
      <el-button
        size="small"
        :loading="rebuildSnapshotLoading"
        :disabled="loading || rebuildSnapshotLoading"
        @click="$emit('rebuildGanttSnapshot')"
      >
        重算甘特快照
      </el-button>
      <el-button :icon="Download" @click="$emit('export')" size="small">导出</el-button>
      <el-button @click="$emit('back')" size="small">返回</el-button>
      <el-button @click="$emit('refresh')" type="primary" size="small" :loading="loading">
        刷新
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Download } from '@element-plus/icons-vue'

defineProps<{
  filterLabel?: string
  containerCount: number
  loading: boolean
  /** 全表重算 gantt_derived 进行中 */
  rebuildSnapshotLoading?: boolean
}>()

defineEmits<{
  export: []
  back: []
  refresh: []
  rebuildGanttSnapshot: []
}>()
</script>

<style scoped>
.gantt-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e4e7ed;
  flex-shrink: 0;
  flex-wrap: wrap;
  gap: 12px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.filter-info {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #606266;
  background: #f5f7fa;
  padding: 6px 12px;
  border-radius: 4px;
  border-left: 3px solid #409eff;
}

.filter-label {
  font-weight: 500;
  color: #303133;
}

.filter-value {
  color: #409eff;
  font-weight: 600;
}

.container-count {
  color: #909399;
}

.header-right {
  display: flex;
  gap: 8px;
}
</style>
