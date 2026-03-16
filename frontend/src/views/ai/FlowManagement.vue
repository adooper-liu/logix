<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox, ElTree } from 'element-plus'
import { 
  Plus, 
  Edit, 
  Delete, 
  VideoPlay, 
  Download, 
  Refresh, 
  ArrowRight,
  ArrowDown,
  CirclePlus,
  Check,
  Close
} from '@element-plus/icons-vue'
import { flowService, type FlowDefinition, type FlowNode, FlowNodeType } from '@/services/flow'

// 状态
const loading = ref(false)
const flows = ref<FlowDefinition[]>([])
const selectedFlow = ref<FlowDefinition | null>(null)
const showFlowEditor = ref(false)
const showFlowExecuter = ref(false)
const flowToExecute = ref<FlowDefinition | null>(null)
const executionVariablesObj = ref<Record<string, any>>({})
const executionResult = ref<any>(null)
const executionLoading = ref(false)

// 执行变量的 JSON 字符串表示
const executionVariables = computed({
  get: () => JSON.stringify(executionVariablesObj.value, null, 2),
  set: (value) => {
    try {
      executionVariablesObj.value = JSON.parse(value)
    } catch {
      executionVariablesObj.value = {}
    }
  }
})

// 编辑器状态
const editingFlow = ref<FlowDefinition>({
  id: '',
  name: '',
  description: '',
  version: '1.0.0',
  createdBy: 'admin',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  nodes: [],
  startNodeId: ''
})
const selectedNode = ref<FlowNode | null>(null)

// 节点类型选项
const nodeTypeOptions = [
  { label: '开始节点', value: FlowNodeType.START },
  { label: '结束节点', value: FlowNodeType.END },
  { label: 'AI任务节点', value: FlowNodeType.AI_TASK },
  { label: 'SQL查询节点', value: FlowNodeType.SQL_TASK },
  { label: 'HTTP请求节点', value: FlowNodeType.HTTP_TASK },
  { label: '决策节点', value: FlowNodeType.DECISION },
  { label: '并行节点', value: FlowNodeType.PARALLEL },
  { label: '循环节点', value: FlowNodeType.LOOP },
  { label: '知识库查询节点', value: FlowNodeType.KNOWLEDGE_QUERY },
  { label: '排产任务节点', value: FlowNodeType.SCHEDULING_TASK },
  { label: '货柜操作节点', value: FlowNodeType.CONTAINER_OPERATION }
]

// 加载流程列表
const loadFlows = async () => {
  loading.value = true
  try {
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

// 打开流程编辑器
const openFlowEditor = (flow?: FlowDefinition) => {
  if (flow) {
    editingFlow.value = { ...flow }
  } else {
    editingFlow.value = {
      id: '',
      name: '',
      description: '',
      version: '1.0.0',
      createdBy: 'admin',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      nodes: [],
      startNodeId: ''
    }
  }
  selectedNode.value = null
  showFlowEditor.value = true
}

// 保存流程
const saveFlow = async () => {
  if (!editingFlow.value.name) {
    ElMessage.warning('请输入流程名称')
    return
  }
  
  if (!editingFlow.value.startNodeId) {
    ElMessage.warning('请设置开始节点')
    return
  }

  loading.value = true
  try {
    let res
    if (editingFlow.value.id) {
      // 更新流程
      res = await flowService.updateFlow(editingFlow.value.id, editingFlow.value)
    } else {
      // 创建流程
      res = await flowService.createFlow(editingFlow.value)
    }
    
    if (res.success) {
      ElMessage.success('流程保存成功')
      showFlowEditor.value = false
      loadFlows()
    } else {
      ElMessage.error(res.error || '保存失败')
    }
  } catch (error) {
    ElMessage.error('保存失败')
  } finally {
    loading.value = false
  }
}

// 删除流程
const deleteFlow = (flow: FlowDefinition) => {
  ElMessageBox.confirm(
    `确定要删除流程「${flow.name}」吗？`,
    '确认删除',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(async () => {
    loading.value = true
    try {
      const res = await flowService.deleteFlow(flow.id)
      if (res.success) {
        ElMessage.success('删除成功')
        loadFlows()
      } else {
        ElMessage.error(res.error || '删除失败')
      }
    } catch (error) {
      ElMessage.error('删除失败')
    } finally {
      loading.value = false
    }
  }).catch(() => {})
}

// 执行流程
const executeFlow = (flow: FlowDefinition) => {
  flowToExecute.value = flow
  executionVariablesObj.value = {}
  executionResult.value = null
  showFlowExecuter.value = true
}

// 执行流程实例
const executeFlowInstance = async () => {
  if (!flowToExecute.value) return
  
  executionLoading.value = true
  try {
    const res = await flowService.executeFlow(flowToExecute.value.id, executionVariablesObj.value)
    if (res.success && res.data) {
      executionResult.value = res.data
      ElMessage.success('流程执行完成')
    } else {
      ElMessage.error(res.error || '执行失败')
    }
  } catch (error) {
    ElMessage.error('执行失败')
  } finally {
    executionLoading.value = false
  }
}

// 添加节点
const addNode = (type: FlowNodeType) => {
  const newNode: FlowNode = {
    id: `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    name: nodeTypeOptions.find(opt => opt.value === type)?.label || '新节点',
    description: '',
    next: '',
    properties: {}
  }
  
  // 根据节点类型设置默认属性
  switch (type) {
    case FlowNodeType.AI_TASK:
      newNode.properties = {
        prompt: '',
        model: 'deepseek-ai/DeepSeek-V2-Chat',
        temperature: 0.7,
        maxTokens: 1000
      }
      break
    case FlowNodeType.SQL_TASK:
      newNode.properties = {
        query: '',
        limit: 10
      }
      break
    case FlowNodeType.HTTP_TASK:
      newNode.properties = {
        url: '',
        method: 'GET',
        headers: {},
        body: {}
      }
      break
    case FlowNodeType.DECISION:
      newNode.properties = {
        condition: '',
        trueNext: '',
        falseNext: ''
      }
      break
    case FlowNodeType.PARALLEL:
      newNode.properties = {
        branches: []
      }
      break
    case FlowNodeType.LOOP:
      newNode.properties = {
        condition: '',
        body: ''
      }
      break
    case FlowNodeType.KNOWLEDGE_QUERY:
      newNode.properties = {
        query: ''
      }
      break
    case FlowNodeType.SCHEDULING_TASK:
      newNode.properties = {
        country: '',
        startDate: '',
        endDate: ''
      }
      break
    case FlowNodeType.CONTAINER_OPERATION:
      newNode.properties = {
        operation: '',
        containerNumber: ''
      }
      break
  }
  
  editingFlow.value.nodes.push(newNode)
  selectedNode.value = newNode
}

// 删除节点
const deleteNode = (node: FlowNode) => {
  const index = editingFlow.value.nodes.findIndex(n => n.id === node.id)
  if (index >= 0) {
    editingFlow.value.nodes.splice(index, 1)
    if (selectedNode.value?.id === node.id) {
      selectedNode.value = null
    }
    if (editingFlow.value.startNodeId === node.id) {
      editingFlow.value.startNodeId = ''
    }
  }
}

// 设置为开始节点
const setAsStartNode = (node: FlowNode) => {
  editingFlow.value.startNodeId = node.id
  ElMessage.success('已设置为开始节点')
}

// 初始化
onMounted(() => {
  loadFlows()
})
</script>

<template>
  <div class="flow-management-container">
    <!-- 头部 -->
    <div class="page-header">
      <div class="header-title">
        <el-icon class="title-icon"><VideoPlay /></el-icon>
        <span>流程管理</span>
      </div>
      <div class="header-actions">
        <el-button type="primary" :icon="Plus" @click="openFlowEditor">
          新建流程
        </el-button>
        <el-button :icon="Refresh" @click="loadFlows">
          刷新
        </el-button>
      </div>
    </div>

    <!-- 流程列表 -->
    <div class="flow-list" v-loading="loading">
      <el-empty v-if="flows.length === 0" description="暂无流程定义" />
      
      <div
        v-for="flow in flows"
        :key="flow.id"
        class="flow-card"
      >
        <div class="card-header">
          <div class="card-title-row">
            <span class="card-title">{{ flow.name }}</span>
            <el-tag size="small" type="info">{{ flow.version }}</el-tag>
          </div>
          <div class="card-actions">
            <el-button text size="small" :icon="Edit" @click="openFlowEditor(flow)">
              编辑
            </el-button>
            <el-button text size="small" :icon="VideoPlay" @click="executeFlow(flow)">
              执行
            </el-button>
            <el-button text size="small" type="danger" :icon="Delete" @click="deleteFlow(flow)">
              删除
            </el-button>
          </div>
        </div>
        
        <div class="card-content">
          <p class="flow-description">{{ flow.description || '无描述' }}</p>
          <div class="flow-meta">
            <span>创建于: {{ new Date(flow.createdAt).toLocaleString() }}</span>
            <span>节点数: {{ flow.nodes.length }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 流程编辑器弹窗 -->
    <el-dialog
      v-model="showFlowEditor"
      :title="editingFlow.id ? '编辑流程' : '新建流程'"
      width="90%"
      height="80vh"
      :close-on-click-modal="false"
    >
      <div class="flow-editor">
        <!-- 流程基本信息 -->
        <div class="editor-section">
          <h3>流程信息</h3>
          <el-form label-width="100px">
            <el-form-item label="流程名称" required>
              <el-input v-model="editingFlow.name" placeholder="请输入流程名称" />
            </el-form-item>
            <el-form-item label="流程描述">
              <el-input
                v-model="editingFlow.description"
                type="textarea"
                :rows="3"
                placeholder="请输入流程描述"
              />
            </el-form-item>
            <el-form-item label="版本号">
              <el-input v-model="editingFlow.version" placeholder="请输入版本号" />
            </el-form-item>
            <el-form-item label="创建者">
              <el-input v-model="editingFlow.createdBy" placeholder="请输入创建者" />
            </el-form-item>
          </el-form>
        </div>

        <!-- 节点管理 -->
        <div class="editor-section">
          <div class="section-header">
            <h3>节点管理</h3>
            <el-dropdown>
              <el-button type="primary" :icon="CirclePlus">
                添加节点
                <el-icon class="el-icon--right"><ArrowDown /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item
                    v-for="option in nodeTypeOptions"
                    :key="option.value"
                    @click="addNode(option.value)"
                  >
                    {{ option.label }}
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>

          <!-- 节点列表 -->
          <div class="nodes-list">
            <div
              v-for="node in editingFlow.nodes"
              :key="node.id"
              class="node-item"
              :class="{ 'node-selected': selectedNode?.id === node.id, 'node-start': editingFlow.startNodeId === node.id }"
              @click="selectedNode = node"
            >
              <div class="node-header">
                <div class="node-title">
                  <el-tag size="small" :type="editingFlow.startNodeId === node.id ? 'success' : 'info'">
                    {{ nodeTypeOptions.find(opt => opt.value === node.type)?.label }}
                  </el-tag>
                  <span>{{ node.name }}</span>
                  <el-tag v-if="editingFlow.startNodeId === node.id" size="small" type="success">
                    开始节点
                  </el-tag>
                </div>
                <div class="node-actions">
                  <el-button
                    v-if="editingFlow.startNodeId !== node.id"
                    text
                    size="small"
                    @click.stop="setAsStartNode(node)"
                  >
                    设置为开始
                  </el-button>
                  <el-button
                    text
                    size="small"
                    type="danger"
                    @click.stop="deleteNode(node)"
                  >
                    删除
                  </el-button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 节点属性编辑 -->
        <div class="editor-section" v-if="selectedNode">
          <h3>节点属性</h3>
          <el-form label-width="120px">
            <el-form-item label="节点名称">
              <el-input v-model="selectedNode.name" placeholder="请输入节点名称" />
            </el-form-item>
            <el-form-item label="节点描述">
              <el-input
                v-model="selectedNode.description"
                type="textarea"
                :rows="2"
                placeholder="请输入节点描述"
              />
            </el-form-item>
            <el-form-item label="下一个节点">
              <el-select v-model="selectedNode.next" placeholder="选择下一个节点">
                <el-option
                  v-for="node in editingFlow.nodes"
                  :key="node.id"
                  :label="node.name"
                  :value="node.id"
                  :disabled="node.id === selectedNode.id"
                />
              </el-select>
            </el-form-item>
            
            <!-- 节点特定属性 -->
            <div v-if="selectedNode.type === FlowNodeType.AI_TASK">
              <el-form-item label="提示词">
                <el-input
                  v-model="selectedNode.properties.prompt"
                  type="textarea"
                  :rows="4"
                  placeholder="请输入AI提示词"
                />
              </el-form-item>
              <el-form-item label="模型">
                <el-input v-model="selectedNode.properties.model" placeholder="请输入模型名称" />
              </el-form-item>
              <el-form-item label="温度">
                <el-input-number v-model="selectedNode.properties.temperature" :min="0" :max="1" :step="0.1" />
              </el-form-item>
              <el-form-item label="最大Tokens">
                <el-input-number v-model="selectedNode.properties.maxTokens" :min="1" :step="100" />
              </el-form-item>
            </div>
            
            <div v-if="selectedNode.type === FlowNodeType.SQL_TASK">
              <el-form-item label="SQL查询">
                <el-input
                  v-model="selectedNode.properties.query"
                  type="textarea"
                  :rows="4"
                  placeholder="请输入SQL查询语句"
                />
              </el-form-item>
              <el-form-item label="结果限制">
                <el-input-number v-model="selectedNode.properties.limit" :min="1" :step="1" />
              </el-form-item>
            </div>
            
            <div v-if="selectedNode.type === FlowNodeType.HTTP_TASK">
              <el-form-item label="URL">
                <el-input v-model="selectedNode.properties.url" placeholder="请输入请求URL" />
              </el-form-item>
              <el-form-item label="方法">
                <el-select v-model="selectedNode.properties.method">
                  <el-option label="GET" value="GET" />
                  <el-option label="POST" value="POST" />
                  <el-option label="PUT" value="PUT" />
                  <el-option label="DELETE" value="DELETE" />
                </el-select>
              </el-form-item>
              <el-form-item label="请求体">
                <el-input
                  v-model="selectedNode.properties.body"
                  type="textarea"
                  :rows="3"
                  placeholder="请输入请求体JSON"
                />
              </el-form-item>
            </div>
            
            <div v-if="selectedNode.type === FlowNodeType.DECISION">
              <el-form-item label="条件表达式">
                <el-input
                  v-model="selectedNode.properties.condition"
                  placeholder="请输入条件表达式，如：${count} > 10"
                />
              </el-form-item>
              <el-form-item label="条件为真">
                <el-select v-model="selectedNode.properties.trueNext" placeholder="选择条件为真时的节点">
                  <el-option
                    v-for="node in editingFlow.nodes"
                    :key="node.id"
                    :label="node.name"
                    :value="node.id"
                    :disabled="node.id === selectedNode.id"
                  />
                </el-select>
              </el-form-item>
              <el-form-item label="条件为假">
                <el-select v-model="selectedNode.properties.falseNext" placeholder="选择条件为假时的节点">
                  <el-option
                    v-for="node in editingFlow.nodes"
                    :key="node.id"
                    :label="node.name"
                    :value="node.id"
                    :disabled="node.id === selectedNode.id"
                  />
                </el-select>
              </el-form-item>
            </div>
            
            <div v-if="selectedNode.type === FlowNodeType.KNOWLEDGE_QUERY">
              <el-form-item label="查询关键词">
                <el-input v-model="selectedNode.properties.query" placeholder="请输入查询关键词" />
              </el-form-item>
            </div>
            
            <div v-if="selectedNode.type === FlowNodeType.SCHEDULING_TASK">
              <el-form-item label="国家">
                <el-input v-model="selectedNode.properties.country" placeholder="请输入国家代码" />
              </el-form-item>
              <el-form-item label="开始日期">
                <el-date-picker v-model="selectedNode.properties.startDate" type="date" placeholder="选择开始日期" />
              </el-form-item>
              <el-form-item label="结束日期">
                <el-date-picker v-model="selectedNode.properties.endDate" type="date" placeholder="选择结束日期" />
              </el-form-item>
            </div>
          </el-form>
        </div>
      </div>
      
      <template #footer>
        <el-button @click="showFlowEditor = false">取消</el-button>
        <el-button type="primary" :icon="Download" @click="saveFlow">
          保存
        </el-button>
      </template>
    </el-dialog>

    <!-- 流程执行弹窗 -->
    <el-dialog
      v-model="showFlowExecuter"
      :title="`执行流程：${flowToExecute?.name}`"
      width="80%"
      :close-on-click-modal="false"
    >
      <div class="flow-executer">
        <!-- 流程信息 -->
        <div v-if="flowToExecute" class="executer-section">
          <h3>流程信息</h3>
          <p>{{ flowToExecute.description || '无描述' }}</p>
          <div class="flow-meta">
            <span>版本: {{ flowToExecute.version }}</span>
            <span>节点数: {{ flowToExecute.nodes.length }}</span>
          </div>
        </div>

        <!-- 执行变量 -->
        <div class="executer-section">
          <h3>执行变量</h3>
          <el-input
            v-model="executionVariables"
            type="textarea"
            :rows="4"
            placeholder='请输入执行变量JSON，如：{"count": 10, "name": "test"}'
          />
        </div>

        <!-- 执行结果 -->
        <div v-if="executionResult" class="executer-section">
          <h3>执行结果</h3>
          <div class="execution-result">
            <div class="result-header">
              <el-tag :type="executionResult.success ? 'success' : 'danger'">
                {{ executionResult.success ? '执行成功' : '执行失败' }}
              </el-tag>
              <span v-if="executionResult.executionTime">
                执行时间: {{ executionResult.executionTime }}ms
              </span>
            </div>
            <div v-if="executionResult.error" class="result-error">
              <el-alert
                :title="executionResult.error"
                type="error"
                show-icon
              />
            </div>
            <div v-if="executionResult.data" class="result-data">
              <pre>{{ JSON.stringify(executionResult.data, null, 2) }}</pre>
            </div>
            <div v-if="executionResult.steps" class="result-steps">
              <h4>执行步骤</h4>
              <el-table :data="executionResult.steps" stripe size="small">
                <el-table-column prop="nodeId" label="节点ID" width="180" />
                <el-table-column prop="nodeType" label="节点类型" width="150" />
                <el-table-column prop="status" label="状态" width="100">
                  <template #default="{ row }">
                    <el-tag :type="row.status === 'success' ? 'success' : 'danger'">
                      {{ row.status }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="executedAt" label="执行时间" />
              </el-table>
            </div>
          </div>
        </div>
      </div>
      
      <template #footer>
        <el-button @click="showFlowExecuter = false">关闭</el-button>
        <el-button type="primary" :icon="VideoPlay" @click="executeFlowInstance" :loading="executionLoading">
          执行
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.flow-management-container {
  padding: 20px;
  min-height: calc(100vh - 120px);
  background: #f5f7fa;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 8px;
  margin-bottom: 20px;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 18px;
  font-weight: 600;
}

.title-icon {
  font-size: 24px;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.flow-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.flow-card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  transition: transform 0.3s, box-shadow 0.3s;
}

.flow-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 16px;
  border-bottom: 1px solid #ebeef5;
}

.card-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.card-actions {
  display: flex;
  gap: 8px;
}

.card-content {
  padding: 16px;
}

.flow-description {
  margin: 0 0 12px 0;
  color: #606266;
  line-height: 1.5;
}

.flow-meta {
  display: flex;
  gap: 20px;
  font-size: 12px;
  color: #909399;
}

/* 流程编辑器 */
.flow-editor {
  height: 60vh;
  overflow-y: auto;
  padding-right: 10px;
}

.editor-section {
  margin-bottom: 30px;
  padding: 20px;
  background: #f9f9f9;
  border-radius: 8px;
}

.editor-section h3 {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-header h3 {
  margin: 0;
}

.nodes-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.node-item {
  padding: 12px;
  background: white;
  border: 1px solid #ebeef5;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s;
}

.node-item:hover {
  border-color: #667eea;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.1);
}

.node-selected {
  border-color: #667eea;
  background: #f0f2ff;
}

.node-start {
  border-left: 4px solid #67c23a;
}

.node-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.node-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.node-actions {
  display: flex;
  gap: 8px;
}

/* 流程执行器 */
.flow-executer {
  max-height: 60vh;
  overflow-y: auto;
  padding-right: 10px;
}

.executer-section {
  margin-bottom: 20px;
  padding: 16px;
  background: #f9f9f9;
  border-radius: 8px;
}

.executer-section h3 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.execution-result {
  margin-top: 16px;
  padding: 16px;
  background: white;
  border-radius: 6px;
  border: 1px solid #ebeef5;
}

.result-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 12px;
}

.result-error {
  margin: 12px 0;
}

.result-data {
  margin: 12px 0;
  padding: 12px;
  background: #f5f7fa;
  border-radius: 4px;
  overflow-x: auto;
}

.result-data pre {
  margin: 0;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
  line-height: 1.5;
  color: #303133;
}

.result-steps {
  margin-top: 20px;
}

.result-steps h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .flow-list {
    grid-template-columns: 1fr;
  }
  
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .header-actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
