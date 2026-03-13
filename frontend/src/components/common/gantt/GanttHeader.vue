<template>
  <div class="gantt-header">
    <div class="header-left">
      <h2>货柜时间分布甘特图</h2>
      <div class="filter-info-row">
        <div class="filter-info">
          <strong>当前维度：</strong>{{ filterLabel || '全部货柜' }}（
          <span class="container-count">{{ containerCount }}</span>
          个货柜）
        </div>
        <slot></slot>
      </div>
    </div>
    <div class="header-right">
      <el-button :icon="Download" @click="$emit('export')" size="small">导出数据</el-button>
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
}>()

defineEmits<{
  export: []
  back: []
  refresh: []
}>()
</script>

<style scoped>
.gantt-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid #e4e7ed;
  flex-shrink: 0;
  flex-wrap: wrap;
  gap: 16px;
}

.header-left h2 {
  margin: 0 0 10px 0;
  font-size: 20px;
  color: #303133;
}

.filter-info-row {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 8px;
  flex-wrap: wrap;
}

.filter-info {
  font-size: 14px;
  color: #606266;
  background: #f5f7fa;
  padding: 8px 12px;
  border-radius: 4px;
  border-left: 4px solid #409eff;
  display: inline-block;
  flex-shrink: 0;
}

.filter-info strong {
  color: #303133;
  font-weight: 600;
}

.filter-info .container-count {
  color: #409eff;
  font-weight: 600;
  margin-left: 4px;
}

.header-right {
  display: flex;
  gap: 8px;
}
</style>
