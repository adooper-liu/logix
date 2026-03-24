<template>
  <el-card class="log-card">
    <template #header>
      <div class="log-header">
        <span>执行日志</span>
        <el-button type="primary" link @click="clearLogs">清空</el-button>
      </div>
    </template>
    <div class="log-container" ref="logContainerRef">
      <div
        v-for="(log, index) in logs"
        :key="index"
        class="log-item"
        :class="log.type"
      >
        <span class="log-time">{{ log.time }}</span>
        <span class="log-message">{{ log.message }}</span>
      </div>
      <div v-if="logs.length === 0" class="log-empty">
        暂无日志
      </div>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'

interface LogItem {
  time: string
  message: string
  type: string
}

// Props
const props = defineProps<{
  logs?: LogItem[]
}>()

// Refs
const logContainerRef = ref<HTMLElement>()

// 自动滚动到底部
watch(() => props.logs?.length, async () => {
  await nextTick()
  if (logContainerRef.value) {
    logContainerRef.value.scrollTop = logContainerRef.value.scrollHeight
  }
})

// 清空日志
const clearLogs = () => {
  // 由父组件处理
}
</script>

<style scoped>
.log-card {
  margin-bottom: 12px;
}

.log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.log-container {
  max-height: 200px;
  overflow-y: auto;
  background: #1e1e1e;
  border-radius: 4px;
  padding: 8px;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 12px;
}

.log-item {
  display: flex;
  gap: 8px;
  padding: 2px 0;
  color: #d4d4d4;
}

.log-item.success {
  color: #4ec9b0;
}

.log-item.error {
  color: #f14c4c;
}

.log-item.warning {
  color: #cca700;
}

.log-item.info {
  color: #3794ff;
}

.log-time {
  color: #858585;
  flex-shrink: 0;
}

.log-message {
  word-break: break-all;
}

.log-empty {
  color: #858585;
  text-align: center;
  padding: 20px;
}
</style>
