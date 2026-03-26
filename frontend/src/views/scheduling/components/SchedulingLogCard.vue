<template>
  <el-card class="log-card" v-if="logs.length > 0">
    <template #header>
      <div class="card-header">
        <span
          ><el-icon><Document /></el-icon> 执行日志</span
        >
        <div class="header-actions">
          <el-tag size="small" :type="logs.length > 0 ? 'success' : 'info'">
            {{ logs.length }} 条记录
          </el-tag>
          <el-button text size="small" @click="$emit('clear')">
            <el-icon><Delete /></el-icon> 清空
          </el-button>
        </div>
      </div>
    </template>

    <div class="log-container">
      <div v-for="(log, index) in logs" :key="index" class="log-item" :class="log.type">
        <el-icon v-if="log.type === 'success'">
          <CircleCheck />
        </el-icon>
        <el-icon v-else-if="log.type === 'error'">
          <CircleClose />
        </el-icon>
        <el-icon v-else-if="log.type === 'info'">
          <InfoFilled />
        </el-icon>
        <span class="log-time">{{ log.time }}</span>
        <span class="log-message">{{ log.message }}</span>
      </div>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { CircleCheck, CircleClose, Delete, Document, InfoFilled } from '@element-plus/icons-vue'

interface Log {
  time: string
  message: string
  type: string
}

defineProps<{
  logs: Log[]
}>()

defineEmits<{
  clear: []
}>()
</script>

<style lang="scss" scoped>
.log-card {
  margin-top: 16px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.log-container {
  max-height: 300px;
  overflow-y: auto;
}

.log-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border-radius: 4px;
  margin-bottom: 4px;
  font-size: 13px;

  &:nth-child(odd) {
    background: #f5f7fa;
  }

  &.success {
    color: #67c23a;
  }

  &.error {
    color: #f56c6c;
  }

  &.info {
    color: #909399;
  }
}

.log-time {
  color: #909399;
  font-size: 12px;
  min-width: 80px;
}

.log-message {
  flex: 1;
}
</style>
