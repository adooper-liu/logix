<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch, nextTick, h, defineComponent } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  Plus, 
  ArrowLeft,
  Check,
  Close,
  CirclePlus,
  Delete,
  SetUp
} from '@element-plus/icons-vue'
import { flowService, type FlowDefinition, type FlowNode, FlowNodeType } from '@/services/flow'
import { VueFlow, useVueFlow } from '@vue-flow/core'
import { Position, isNode, isEdge } from '@vue-flow/core'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import { Controls, Background } from '@vue-flow/additional-components'

// 路由参数
const route = useRoute()
const router = useRouter()

// 流程ID（URL参数）- 过滤无效值
const flowId = computed(() => {
  const id = route.query.id as string
  // 排除 undefined、null、空字符串
  return id && id !== 'undefined' && id !== 'null' ? id : ''
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
const loading = ref(false)

// Vue Flow 相关状态（使用 id 参数，options 对象已废弃）
const { nodes, edges, addNodes, updateNode, removeNodes, addEdges, setEdges, onConnect } = useVueFlow('flow-editor')

// 编辑器布局状态
const editorLayout = ref<'table' | 'visual'>('visual')
const flowContainerRef = ref<HTMLElement | null>(null)
const flowContainerSize = ref({ width: 1200, height: 600 })

// 节点类型选项（与 FlowNodeType 枚举一致）
const nodeTypeOptions = [
  { value: FlowNodeType.START, label: '开始', color: '#67c23a' },
  { value: FlowNodeType.END, label: '结束', color: '#e6a23c' },
  { value: FlowNodeType.AI_TASK, label: 'AI任务', color: '#9b59b6' },
  { value: FlowNodeType.SQL_TASK, label: 'SQL查询', color: '#e74c3c' },
  { value: FlowNodeType.HTTP_TASK, label: 'HTTP请求', color: '#3498db' },
  { value: FlowNodeType.DECISION, label: '条件', color: '#909399' },
  { value: FlowNodeType.PARALLEL, label: '并行', color: '#409eff' },
  { value: FlowNodeType.LOOP, label: '循环', color: '#1abc9c' },
  { value: FlowNodeType.KNOWLEDGE_QUERY, label: '知识库查询', color: '#f39c12' },
  { value: FlowNodeType.SCHEDULING_TASK, label: '排产任务', color: '#e67e22' },
  { value: FlowNodeType.CONTAINER_OPERATION, label: '货柜操作', color: '#34495e' },
]

// 调整容器尺寸
const resizeFlowContainer = () => {
  if (flowContainerRef.value) {
    const rect = flowContainerRef.value.getBoundingClientRect()
    flowContainerSize.value = {
      width: rect.width,
      height: rect.height || 600
    }
    
    // 确保Vue Flow组件有足够的高度
    if (flowContainerSize.value.height < 400) {
      flowContainerSize.value.height = 400
    }
  }
}

// 从 FlowDefinition 同步到 Vue Flow
const syncToVueFlow = () => {
  if (!editingFlow.value?.nodes) {
    editingFlow.value.nodes = []
  }
  
  // 确保容器已经渲染完成
  if (editorLayout.value !== 'visual') {
    return
  }
  
  // 构建节点（必须包含 dimensions、handleBounds、computedPosition，否则 Vue Flow 拖拽/Handle 会报错）
  const DEFAULT_NODE_WIDTH = 180
  const DEFAULT_NODE_HEIGHT = 40
  const flowNodes = editingFlow.value?.nodes?.map((node, index) => {
    const pos = { x: 250, y: index * 120 }
    return {
      id: node.id,
      type: 'default',
      position: pos,
      data: { label: node.name, node },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      dimensions: { width: DEFAULT_NODE_WIDTH, height: DEFAULT_NODE_HEIGHT },
      handleBounds: { source: [], target: [] },
      computedPosition: pos, // 拖拽时 getDragItems 需要，否则报 undefined.x
    }
  }) || []
  
  // 构建边
  const flowEdges: any[] = []
  editingFlow.value?.nodes?.forEach(node => {
    if (node.next) {
      flowEdges.push({
        id: `e-${node.id}-${node.next}`,
        source: node.id,
        target: node.next,
        type: 'smoothstep',
        animated: true,
        label: '下一步'
      })
    }
  })
  
  // 只在节点或边发生变化时才更新，避免递归更新
  const nodesChanged = JSON.stringify(nodes.value) !== JSON.stringify(flowNodes)
  const edgesChanged = JSON.stringify(edges.value) !== JSON.stringify(flowEdges)
  
  if (nodesChanged) {
    nodes.value = flowNodes
  }
  
  if (edgesChanged) {
    edges.value = flowEdges
  }
}

// 从 Vue Flow 同步到 FlowDefinition
const syncFromVueFlow = () => {
  const newNodes = nodes.value?.map(n => n.data?.node) || []
  // 只在节点发生变化时才更新，避免递归更新
  if (JSON.stringify(editingFlow.value?.nodes) !== JSON.stringify(newNodes)) {
    editingFlow.value.nodes = newNodes
  }
}

// 连接事件处理
const handleConnect = (params: any) => {
  // 检查是否已存在相同的边
  const edgeExists = edges.value.some(edge => 
    edge.source === params.source && edge.target === params.target
  )
  
  if (!edgeExists) {
    // 只在边不存在时才添加，避免重复添加导致的更新
    edges.value = [...edges.value, params]
    
    // 延迟同步，避免在事件处理中立即修改状态
    nextTick(() => {
      syncFromVueFlow()
    })
  }
}

const handleNodesChange = (changes: any) => {
  // 节点位置变化时记录，但不立即同步
  // 避免与 Vue Flow 内部更新形成循环
  // 只处理位置变化，不处理其他变化
  changes.forEach((change: any) => {
    if (change.type === 'position') {
      // 可以在这里记录节点位置，但不更新状态
    }
  })
}

const handleEdgesChange = (changes: any) => {
  // 边变化时记录，但不立即同步
  // 避免与 Vue Flow 内部更新形成循环
  // 只处理连接变化，不处理其他变化
  changes.forEach((change: any) => {
    if (change.type === 'add') {
      // 可以在这里记录新边，但不更新状态
    }
  })
}

// 监听节点属性变化，同步到Vue Flow
watch(selectedNode, (newNode, oldNode) => {
  if (newNode && oldNode) {
    // 延迟同步，避免在属性编辑时立即触发更新
    nextTick(() => {
      // 只同步节点名称和描述，避免递归更新
      const nodeIndex = editingFlow.value?.nodes?.findIndex(n => n.id === newNode.id)
      if (nodeIndex !== -1 && editingFlow.value?.nodes) {
        editingFlow.value.nodes[nodeIndex] = { ...newNode }
        // 只有在可视化视图时才同步到Vue Flow
        if (editorLayout.value === 'visual') {
          syncToVueFlow()
        }
      }
    })
  }
}, { deep: true })

// 调整窗口大小
onMounted(async () => {
  window.addEventListener('resize', resizeFlowContainer)
  
  // 如果有ID，加载流程
  if (flowId.value) {
    loading.value = true
    try {
      const res = await flowService.getFlow(flowId.value)
      if (res.success && res.data) {
        editingFlow.value = res.data
        await nextTick()
        // 只有在可视化视图时才同步到Vue Flow
        if (editorLayout.value === 'visual') {
          syncToVueFlow()
        }
      }
    } catch (error) {
      ElMessage.error('加载流程失败')
    } finally {
      loading.value = false
    }
  }
  
  nextTick(() => {
    if (editorLayout.value === 'visual') {
      resizeFlowContainer()
    }
  })
})

onUnmounted(() => {
  window.removeEventListener('resize', resizeFlowContainer)
})

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
  
  // 先添加到本地状态
  if (editingFlow.value?.nodes) {
    editingFlow.value.nodes.push(newNode)
  }
  
  // 如果是第一个节点，自动设为开始节点
  if (!editingFlow.value?.startNodeId) {
    editingFlow.value.startNodeId = newNode.id
  }
  
  // 然后同步到 Vue Flow（只有在可视化视图时）
  if (editorLayout.value === 'visual') {
    syncToVueFlow()
  }
  
  selectedNode.value = newNode
}

// 删除节点
const deleteNode = (node: FlowNode) => {
  // 先从本地状态删除
  if (editingFlow.value?.nodes) {
    editingFlow.value.nodes = editingFlow.value.nodes.filter(n => n.id !== node.id)
    if (editingFlow.value.startNodeId === node.id) {
      editingFlow.value.startNodeId = editingFlow.value.nodes[0]?.id || ''
    }
  }
  
  // 然后同步到 Vue Flow（只有在可视化视图时）
  if (editorLayout.value === 'visual') {
    syncToVueFlow()
  }
  
  // 如果删除的是当前选中的节点，清空选择
  if (selectedNode.value?.id === node.id) {
    selectedNode.value = null
  }
}

// 设置为开始节点
const setAsStartNode = (node: FlowNode) => {
  editingFlow.value.startNodeId = node.id
}

// 保存流程
const saveFlow = async () => {
  // 同步Vue Flow状态到本地
  syncFromVueFlow()
  
  if (!editingFlow.value?.name) {
    ElMessage.warning('请输入流程名称')
    return
  }
  
  if (!editingFlow.value?.startNodeId) {
    ElMessage.warning('请设置开始节点')
    return
  }
  
  loading.value = true
  try {
    let res
    if (editingFlow.value?.id) {
      res = await flowService.updateFlow(editingFlow.value.id, editingFlow.value)
    } else {
      res = await flowService.createFlow(editingFlow.value)
    }
    
    if (res.success) {
      ElMessage.success('流程保存成功')
      // 通知父窗口并关闭
      window.opener?.postMessage({ type: 'flow-saved' }, '*')
      setTimeout(() => window.close(), 500)
    } else {
      ElMessage.error(res.error || '保存失败')
    }
  } catch (error) {
    ElMessage.error('保存失败')
  } finally {
    loading.value = false
  }
}

// 取消并关闭
const cancel = () => {
  ElMessageBox.confirm('确定要关闭编辑器吗？未保存的更改将丢失。', '确认关闭', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    window.close()
  }).catch(() => {})
}
</script>

<template>
  <div class="flow-editor-page">
    <!-- 头部工具栏 -->
    <div class="editor-header">
      <div class="header-left">
        <el-button :icon="ArrowLeft" text @click="cancel">
          返回列表
        </el-button>
        <el-divider direction="vertical" />
        <span class="page-title">
          {{ flowId ? '编辑流程' : '新建流程' }}
        </span>
      </div>
      <div class="header-right">
        <el-button @click="cancel">取消</el-button>
        <el-button type="primary" :loading="loading" @click="saveFlow">
          保存
        </el-button>
      </div>
    </div>

    <!-- 主内容区 -->
    <div class="editor-content">
      <!-- 左侧：节点面板 -->
      <div class="node-panel">
        <div class="panel-header">
          <el-icon><SetUp /></el-icon>
          <span>节点面板</span>
        </div>
        <div class="node-list">
          <div
            v-for="option in nodeTypeOptions"
            :key="option.value"
            class="node-item"
            :style="{ borderLeftColor: option.color }"
            @click="addNode(option.value)"
          >
            <span class="node-name">{{ option.label }}</span>
            <el-icon class="add-icon"><Plus /></el-icon>
          </div>
        </div>
      </div>

      <!-- 中间：画布 -->
      <div class="canvas-panel">
        <div class="canvas-toolbar">
          <el-button-group>
            <el-button 
              :type="editorLayout === 'table' ? 'primary' : 'default'"
              @click="editorLayout = 'table'"
            >
              表格视图
            </el-button>
            <el-button 
              :type="editorLayout === 'visual' ? 'primary' : 'default'"
              @click="() => {
                editorLayout = 'visual'
                nextTick(() => {
                  resizeFlowContainer()
                })
              }"
            >
              可视化视图
            </el-button>
          </el-button-group>
        </div>

        <!-- 表格视图 -->
        <div v-show="editorLayout === 'table'" class="table-view">
          <el-table :data="editingFlow?.nodes || []" border>
            <el-table-column prop="name" label="节点名称" />
            <el-table-column prop="type" label="类型">
              <template #default="{ row }">
                <el-tag :color="nodeTypeOptions.find(o => o.value === row.type)?.color" effect="dark">
                  {{ nodeTypeOptions.find(o => o.value === row.type)?.label }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="description" label="描述" />
            <el-table-column label="操作" width="180">
              <template #default="{ row }">
                <el-button 
                  v-if="editingFlow?.startNodeId !== row.id"
                  size="small" 
                  text 
                  @click="setAsStartNode(row)"
                >
                  设为开始
                </el-button>
                <el-button size="small" text type="danger" @click="deleteNode(row)">
                  删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <!-- 可视化视图 -->
        <div v-show="editorLayout === 'visual'" class="visual-view" ref="flowContainerRef">
          <VueFlow id="flow-editor"
            :nodes="nodes"
            :edges="edges"
            :min-zoom="0.3"
            :max-zoom="2"
            :default-zoom="1"
            @connect="handleConnect"
            @nodes-change="handleNodesChange"
            @edges-change="handleEdgesChange"
            @node-click="(event) => {
              const flowNode = editingFlow.value?.nodes?.find(n => n.id === event.node?.id)
              if (flowNode) {
                selectedNode.value = flowNode
              }
            }"
          >
            <Controls position="top-right" />
            <Background color="#f8f9fa" gap="20" />
          </VueFlow>
        </div>
      </div>

      <!-- 右侧：属性面板 -->
      <div class="property-panel">
        <div class="panel-header">
          <el-icon><SetUp /></el-icon>
          <span>属性编辑</span>
        </div>
        
        <!-- 流程基本信息 -->
        <div class="property-section">
          <div class="section-title">流程信息</div>
          <el-form label-width="80px" size="small">
            <el-form-item label="名称">
              <el-input v-model="editingFlow.name" placeholder="流程名称" />
            </el-form-item>
            <el-form-item label="描述">
              <el-input v-model="editingFlow.description" type="textarea" :rows="2" />
            </el-form-item>
            <el-form-item label="版本">
              <el-input v-model="editingFlow.version" />
            </el-form-item>
          </el-form>
        </div>

        <!-- 节点属性 -->
        <div v-if="selectedNode" class="property-section">
          <div class="section-title">节点属性</div>
          <el-form label-width="80px" size="small">
            <el-form-item label="节点名称">
              <el-input v-model="selectedNode.name" />
            </el-form-item>
            <el-form-item label="描述">
              <el-input v-model="selectedNode.description" type="textarea" :rows="2" />
            </el-form-item>
            <el-form-item label="下一步">
              <el-select v-model="selectedNode.next" placeholder="选择下一步节点" clearable>
                <el-option
                  v-for="node in editingFlow?.nodes?.filter(n => n.id !== selectedNode?.id) || []"
                  :key="node.id"
                  :label="node.name"
                  :value="node.id"
                />
              </el-select>
            </el-form-item>
          </el-form>
        </div>

        <div v-else class="empty-tip">
          请选择一个节点进行编辑
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.flow-editor-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f7fa;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background: white;
  border-bottom: 1px solid #e4e7ed;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.header-right {
  display: flex;
  gap: 10px;
}

.editor-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.node-panel {
  width: 200px;
  background: white;
  border-right: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;
}

.panel-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  font-weight: 600;
  color: #303133;
  border-bottom: 1px solid #e4e7ed;
}

.node-list {
  flex: 1;
  padding: 12px;
  overflow-y: auto;
}

.node-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  margin-bottom: 8px;
  background: #f5f7fa;
  border-radius: 6px;
  border-left: 3px solid #409eff;
  cursor: pointer;
  transition: all 0.2s;
}

.node-item:hover {
  background: #ecf5ff;
  transform: translateX(4px);
}

.node-name {
  font-size: 13px;
  color: #606266;
}

.add-icon {
  color: #909399;
}

.canvas-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.canvas-toolbar {
  padding: 12px 16px;
  background: white;
  border-bottom: 1px solid #e4e7ed;
}

.table-view {
  flex: 1;
  padding: 16px;
  overflow: auto;
}

.visual-view {
  flex: 1;
  background: white;
}

.visual-view {
  flex: 1;
  background: white;
  min-height: 400px;
  position: relative;
}

.visual-view :deep(.vue-flow) {
  width: 100% !important;
  height: 100% !important;
  min-height: 400px;
}

.property-panel {
  width: 280px;
  background: white;
  border-left: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.property-section {
  padding: 16px;
  border-bottom: 1px solid #e4e7ed;
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 12px;
}

.empty-tip {
  padding: 40px 20px;
  text-align: center;
  color: #909399;
  font-size: 13px;
}
</style>
