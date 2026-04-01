<template>
  <el-dialog
    v-model="visible"
    :title="`执行流程：${flow?.name}`"
    width="80%"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <div class="flow-executer">
      <!-- 流程信息 -->
      <div v-if="flow" class="executer-section">
        <h3>流程信息</h3>
        <p>{{ flow.description || '无描述' }}</p>
        <div class="flow-meta">
          <span>版本: {{ flow.version }}</span>
          <span>节点数: {{ flow.nodes?.length || 0 }}</span>
        </div>
      </div>

      <!-- 执行变量 -->
      <div class="executer-section">
        <h3>执行变量</h3>
        <el-input
          v-model="variablesText"
          type="textarea"
          :rows="4"
          placeholder='请输入执行变量JSON，如：{"count": 10, "name": "test"}'
        />
      </div>

      <!-- 执行结果 -->
      <div v-if="result" class="executer-section">
        <h3>执行结果</h3>
        <div class="result-content">
          <el-alert
            :title="`执行${result.success ? '成功' : '失败'}`"
            :type="result.success ? 'success' : 'error'"
            :closable="false"
            show-icon
          />
          <pre v-if="result.data" class="result-json">{{
            JSON.stringify(result.data, null, 2)
          }}</pre>
          <p v-if="result.error" class="error-message">{{ result.error }}</p>
        </div>
      </div>
    </div>

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" :icon="VideoPlay" :loading="executing" @click="executeFlow">
        执行
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { VideoPlay } from '@element-plus/icons-vue'
import { flowService } from '@/services/flow'
import type { FlowDefinition, FlowExecutionResult } from '@/services/flow'

const props = defineProps<{
  modelValue: boolean
  flow: FlowDefinition | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const visible = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value),
})

const variablesObj = ref<Record<string, any>>({})
const variablesText = computed({
  get: () => JSON.stringify(variablesObj.value, null, 2),
  set: value => {
    try {
      variablesObj.value = JSON.parse(value)
    } catch {
      variablesObj.value = {}
    }
  },
})

const result = ref<FlowExecutionResult | null>(null)
const executing = ref(false)

watch(
  () => props.modelValue,
  val => {
    if (val) {
      // 打开时重置结果
      result.value = null
      variablesObj.value = {}
    }
  }
)

const executeFlow = async () => {
  if (!props.flow) return

  try {
    executing.value = true
    const res = await flowService.executeFlow(props.flow.id, variablesObj.value)
    if (res.success && res.data) {
      result.value = res.data
      if (res.data.success) {
        ElMessage.success('流程执行成功')
      } else {
        ElMessage.error(res.data.error || '执行失败')
      }
    } else {
      ElMessage.error(res.error || '执行失败')
    }
  } catch (error) {
    ElMessage.error('执行失败')
  } finally {
    executing.value = false
  }
}

const handleClose = () => {
  visible.value = false
  result.value = null
  variablesObj.value = {}
}
</script>

<style scoped>
.flow-executer {
  max-height: 70vh;
  overflow-y: auto;
}

.executer-section {
  margin-bottom: 20px;
}

.executer-section h3 {
  font-size: 16px;
  margin-bottom: 12px;
  color: #303133;
}

.flow-meta {
  display: flex;
  gap: 20px;
  font-size: 14px;
  color: #909399;
  margin-top: 8px;
}

.result-content {
  margin-top: 12px;
}

.result-json {
  background: #f5f7fa;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  padding: 12px;
  font-family: 'Courier New', monospace;
  font-size: 13px;
  color: #303133;
  white-space: pre-wrap;
  word-wrap: break-word;
  max-height: 300px;
  overflow-y: auto;
}

.error-message {
  color: #f56c6c;
  font-size: 14px;
  margin-top: 8px;
}
</style>
