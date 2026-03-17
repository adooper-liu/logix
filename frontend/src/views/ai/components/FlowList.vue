<template>
  <div class="flow-list">
    <!-- 空状态 -->
    <div v-if="flows.length === 0" class="empty-state">
      <el-empty description="暂无流程">
        <el-button type="primary" :icon="Plus" @click="$emit('create')">
          新建流程
        </el-button>
      </el-empty>
    </div>

    <!-- 流程列表 -->
    <div v-else class="flow-grid">
      <div
        v-for="flow in flows"
        :key="flow.id"
        class="flow-card"
        :class="{ 'flow-card-selected': selected?.id === flow.id }"
        @click="$emit('select', flow)"
      >
        <div class="card-header">
          <div class="card-title">
            <el-tag size="small" type="info">
              {{ flow.version || '1.0.0' }}
            </el-tag>
            <span class="flow-name">{{ flow.name }}</span>
          </div>
          <div class="card-actions">
            <el-button text size="small" :icon="Edit" @click.stop="$emit('edit', flow)">
              编辑
            </el-button>
            <el-button text size="small" :icon="VideoPlay" @click.stop="$emit('execute', flow)">
              执行
            </el-button>
            <el-button text size="small" type="danger" :icon="Delete" @click.stop="$emit('delete', flow)">
              删除
            </el-button>
          </div>
        </div>
        
        <div class="card-content">
          <p class="flow-description">{{ flow.description || '无描述' }}</p>
          <div class="flow-meta">
            <span>创建于: {{ new Date(flow.createdAt).toLocaleString() }}</span>
            <span>节点数: {{ flow.nodes?.length || 0 }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Plus, Edit, Delete, VideoPlay } from '@element-plus/icons-vue'
import type { FlowDefinition } from '@/services/flow'

defineProps<{
  flows: FlowDefinition[]
  selected?: FlowDefinition | null
  loading?: boolean
}>()

defineEmits<{
  create: []
  edit: [flow: FlowDefinition]
  execute: [flow: FlowDefinition]
  delete: [flow: FlowDefinition]
  select: [flow: FlowDefinition]
}>()
</script>

<style scoped>
.flow-list {
  width: 100%;
}

.empty-state {
  padding: 60px 0;
}

.flow-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 16px;
}

.flow-card {
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 16px;
  background: #fff;
  cursor: pointer;
  transition: all 0.3s;
}

.flow-card:hover {
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.flow-card-selected {
  border-color: #409eff;
  background: #f0f7ff;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.card-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.flow-name {
  font-size: 16px;
  font-weight: 500;
  color: #303133;
}

.card-actions {
  display: flex;
  gap: 4px;
}

.card-content {
  margin-top: 12px;
}

.flow-description {
  font-size: 14px;
  color: #606266;
  margin-bottom: 8px;
  line-height: 1.5;
}

.flow-meta {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #909399;
}
</style>
