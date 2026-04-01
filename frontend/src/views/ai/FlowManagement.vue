<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, Refresh } from '@element-plus/icons-vue'
import { flowService, type FlowDefinition } from '@/services/flow'
import FlowList from './components/FlowList.vue'
import FlowExecuter from './components/FlowExecuter.vue'

// 状态
const loading = ref(false)
const flows = ref<FlowDefinition[]>([])
const selectedFlow = ref<FlowDefinition | null>(null)
const showExecuter = ref(false)
const flowToExecute = ref<FlowDefinition | null>(null)

// 生命周期
onMounted(() => {
  loadFlows()
})

// 加载流程列表
const loadFlows = async () => {
  try {
    loading.value = true
    const res = await flowService.getFlows()
    if (res.success && res.data) {
      flows.value = res.data
    }
  } catch (error) {
    ElMessage.error('加载流程列表失败')
  } finally {
    loading.value = false
  }
}

// 打开流程编辑器（新页签）
const openFlowEditor = (flow?: FlowDefinition) => {
  const url = flow?.id ? `/#/ai/flow-editor?id=${flow.id}` : '/#/ai/flow-editor'
  window.open(url, '_blank')
}

// 删除流程
const deleteFlow = async (flow: FlowDefinition) => {
  try {
    loading.value = true
    const res = await flowService.deleteFlow(flow.id)
    if (res.success) {
      ElMessage.success('删除成功')
      loadFlows()
      selectedFlow.value = null
    } else {
      ElMessage.error(res.error || '删除失败')
    }
  } catch (error) {
    ElMessage.error('删除失败')
  } finally {
    loading.value = false
  }
}

// 执行流程
const executeFlow = (flow: FlowDefinition) => {
  flowToExecute.value = flow
  showExecuter.value = true
}

// 选择流程
const selectFlow = (flow: FlowDefinition) => {
  selectedFlow.value = flow
}
</script>

<template>
  <div class="flow-management">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1>流程管理</h1>
      <div class="header-actions">
        <el-button :icon="Refresh" @click="loadFlows" :loading="loading"> 刷新 </el-button>
        <el-button type="primary" :icon="Plus" @click="openFlowEditor()"> 新建流程 </el-button>
      </div>
    </div>

    <!-- 流程列表 -->
    <FlowList
      :flows="flows"
      :selected="selectedFlow"
      :loading="loading"
      @create="openFlowEditor()"
      @edit="openFlowEditor"
      @execute="executeFlow"
      @delete="deleteFlow"
      @select="selectFlow"
    />

    <!-- 流程执行弹窗 -->
    <FlowExecuter v-model="showExecuter" :flow="flowToExecute" />
  </div>
</template>

<style scoped>
.flow-management {
  padding: 20px;
  height: 100%;
  overflow-y: auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-header h1 {
  margin: 0;
  font-size: 24px;
  color: #303133;
}

.header-actions {
  display: flex;
  gap: 12px;
}
</style>
