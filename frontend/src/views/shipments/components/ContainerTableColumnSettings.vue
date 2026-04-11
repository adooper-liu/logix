<template>
  <el-drawer
    :model-value="visible"
    title="列设置"
    size="400px"
    @update:model-value="$emit('update:visible', $event)"
    @close="$emit('close')"
  >
    <div class="column-setting">
      <div class="setting-header">
        <el-button size="small" @click="$emit('reset')">重置默认</el-button>
      </div>
      <div class="column-list">
        <div
          v-for="key in allColumnKeys"
          :key="key"
          class="column-item"
          :draggable="true"
          @dragstart="$emit('dragStart', $event, key)"
          @dragover="$emit('dragOver', $event)"
          @drop="$emit('drop', $event, key)"
          @dragend="$emit('dragEnd', $event)"
        >
          <el-checkbox
            :model-value="columnVisible[key]"
            @update:model-value="$emit('toggleColumn', key)"
          >
            {{ columnLabels[key] || key }}
          </el-checkbox>
          <el-icon class="drag-handle"><Rank /></el-icon>
        </div>
      </div>
    </div>
    <template #footer>
      <div class="drawer-footer">
        <el-button @click="$emit('close')">取消</el-button>
        <el-button type="primary" @click="$emit('save')">保存</el-button>
      </div>
    </template>
  </el-drawer>
</template>

<script setup lang="ts">
import { Rank } from '@element-plus/icons-vue'
import type { ColumnKey, ColumnVisibleConfig } from './types'

defineProps<{
  visible: boolean
  columnVisible: ColumnVisibleConfig
  columnLabels: Record<string, string>
  allColumnKeys: ColumnKey[]
}>()

defineEmits<{
  'update:visible': [value: boolean]
  close: []
  reset: []
  toggleColumn: [key: ColumnKey]
  dragStart: [event: DragEvent, key: ColumnKey]
  dragOver: [event: DragEvent]
  drop: [event: DragEvent, key: ColumnKey]
  dragEnd: [event: DragEvent]
  save: []
}>()
</script>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.column-setting {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.setting-header {
  margin-bottom: $spacing-md;
  padding-bottom: $spacing-sm;
  border-bottom: 1px solid var(--el-border-color-light);
}

.column-list {
  flex: 1;
  overflow-y: auto;
}

.column-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $spacing-sm;
  margin-bottom: $spacing-xs;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 4px;
  cursor: move;
  transition: all 0.2s;

  &:hover {
    background-color: var(--el-fill-color-light);
    border-color: var(--el-color-primary-light-7);
  }

  &:active {
    opacity: 0.6;
  }
}

.drag-handle {
  color: var(--el-text-color-secondary);
  cursor: grab;

  &:active {
    cursor: grabbing;
  }
}

.drawer-footer {
  display: flex;
  justify-content: flex-end;
  gap: $spacing-sm;
}
</style>
