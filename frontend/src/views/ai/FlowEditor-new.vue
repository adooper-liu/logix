<!-- @ts-nocheck -->
<template>
  <div class="flow-editor-page">
    <!-- 头部工具栏 -->
    <div class="editor-header">
      <div class="header-left">
        <el-button :icon="ArrowLeft" text @click="cancel"> 返回列表 </el-button>
        <el-divider direction="vertical" />
        <span class="page-title">
          {{ flowId ? '编辑流程' : '新建流程' }}
        </span>
      </div>
      <div class="header-right">
        <el-button @click="cancel">取消</el-button>
        <el-button type="primary" :loading="loading" @click="saveFlow"> 保存 </el-button>
      </div>
    </div>

    <!-- 主内容区 -->
    <div class="editor-content">
      <!-- 左侧：节点面板 -->
      <div class="node-panel">
        <div class="panel-header">
          <el-icon><Operation /></el-icon>
          <span>节点类型</span>
        </div>
        <div class="node-types">
          <div
            v-for="nodeType in nodeTypeOptions"
            :key="nodeType.value"
            class="node-type-item"
            :style="{ borderLeftColor: nodeType.color }"
            draggable="true"
            @dragstart="onNodeTypeDragStart($event, nodeType.value)"
          >
            <el-icon :style="{ color: nodeType.color }"><component :is="nodeType.icon" /></el-icon>
            <span>{{ nodeType.label }}</span>
          </div>
        </div>
      </div>

      <!-- 中间：画布 -->
      <div class="canvas-area">
        <!-- 工具栏 -->
        <div class="toolbar">
          <el-button-group>
            <el-button :icon="CirclePlus" @click="addNodeAtCenter">添加节点</el-button>
            <el-button :icon="Delete" @click="deleteSelected">删除选中</el-button>
            <el-button :icon="RefreshLeft" @click="undo">撤销</el-button>
            <el-button :icon="RefreshRight" @click="redo">重做</el-button>
          </el-button-group>
          <el-divider direction="vertical" />
          <el-button-group>
            <el-button :icon="Grid" @click="toggleGrid">网格对齐</el-button>
            <el-button :icon="View" @click="fitView">适应画布</el-button>
          </el-button-group>
        </div>

        <!-- 画布容器 -->
        <div ref="lfContainerRef" class="logicflow-container" />
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
              <el-input
                v-model="editingFlow.description"
                type="textarea"
                :rows="2"
                placeholder="流程描述"
              />
            </el-form-item>
            <el-form-item label="版本">
              <el-input v-model="editingFlow.version" placeholder="1.0.0" />
            </el-form-item>
            <el-form-item label="创建者">
              <el-input v-model="editingFlow.createdBy" placeholder="admin" />
            </el-form-item>
          </el-form>
        </div>

        <!-- 节点属性 -->
        <div v-if="selectedNode" class="property-section">
          <div class="section-title">节点属性</div>
          <el-form label-width="80px" size="small">
            <el-form-item label="节点ID">
              <el-input v-model="selectedNode.id" disabled />
            </el-form-item>
            <el-form-item label="名称">
              <el-input v-model="selectedNode.name" placeholder="节点名称" />
            </el-form-item>
            <el-form-item label="描述">
              <el-input
                v-model="selectedNode.description"
                type="textarea"
                :rows="2"
                placeholder="节点描述"
              />
            </el-form-item>

            <!-- 节点特定属性 -->
            <template v-if="selectedNode.type === FlowNodeType.AI_TASK && selectedNode.properties">
              <el-form-item label="提示词">
                <el-input
                  v-model="selectedNode.properties.prompt"
                  type="textarea"
                  :rows="4"
                  placeholder="AI提示词"
                />
              </el-form-item>
              <el-form-item label="模型">
                <el-select v-model="selectedNode.properties.model" style="width: 100%">
                  <el-option label="gpt-4" value="gpt-4" />
                  <el-option label="gpt-3.5-turbo" value="gpt-3.5-turbo" />
                </el-select>
              </el-form-item>
            </template>

            <template v-if="selectedNode.type === FlowNodeType.SQL_TASK && selectedNode.properties">
              <el-form-item label="SQL语句">
                <el-input
                  v-model="selectedNode.properties.sql"
                  type="textarea"
                  :rows="4"
                  placeholder="SQL查询语句"
                />
              </el-form-item>
            </template>

            <template
              v-if="selectedNode.type === FlowNodeType.HTTP_TASK && selectedNode.properties"
            >
              <el-form-item label="URL">
                <el-input v-model="selectedNode.properties.url" placeholder="请求URL" />
              </el-form-item>
              <el-form-item label="方法">
                <el-select v-model="selectedNode.properties.method" style="width: 100%">
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
                  placeholder="JSON格式"
                />
              </el-form-item>
            </template>

            <template v-if="selectedNode.type === FlowNodeType.DECISION && selectedNode.properties">
              <el-form-item label="条件表达式">
                <el-input
                  v-model="selectedNode.properties.condition"
                  placeholder="如: ${count} > 10"
                />
              </el-form-item>
            </template>
          </el-form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, nextTick, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  ArrowLeft,
  SetUp,
  Operation,
  CirclePlus,
  Delete,
  RefreshLeft,
  RefreshRight,
  Grid,
  View,
} from '@element-plus/icons-vue'
import { flowService, type FlowDefinition, type FlowNode, FlowNodeType } from '@/services/flow'
import LogicFlow from '@logicflow/core'
import type { NodeConfig, EdgeConfig, GraphData } from '@logicflow/core'
import { Menu, MiniMap, Snapshot, DndPanel } from '@logicflow/extension'
import '@logicflow/core/dist/style/index.css'
import '@logicflow/extension/lib/style/index.css'

// 路由参数
const route = useRoute()

// 流程ID（URL参数）- 过滤无效值
const flowId = computed(() => {
  const id = route.query.id as string
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
  startNodeId: '',
  variables: [],
})
const selectedNode = ref<FlowNode | null>(null)
const loading = ref(false)

// LogicFlow 实例
const lfContainerRef = ref<HTMLElement>()
const lf = ref<LogicFlow>()

// 节点类型选项
const nodeTypeOptions = [
  { value: FlowNodeType.START, label: '开始', color: '#67c23a', icon: 'VideoPlay' },
  { value: FlowNodeType.END, label: '结束', color: '#e6a23c', icon: 'CircleClose' },
  { value: FlowNodeType.AI_TASK, label: 'AI任务', color: '#9b59b6', icon: 'Cpu' },
  { value: FlowNodeType.SQL_TASK, label: 'SQL查询', color: '#e74c3c', icon: 'DataLine' },
  { value: FlowNodeType.HTTP_TASK, label: 'HTTP请求', color: '#3498db', icon: 'Connection' },
  { value: FlowNodeType.DECISION, label: '条件', color: '#909399', icon: 'Guide' },
  { value: FlowNodeType.PARALLEL, label: '并行', color: '#409eff', icon: 'Operation' },
  { value: FlowNodeType.LOOP, label: '循环', color: '#1abc9c', icon: 'Refresh' },
  { value: FlowNodeType.KNOWLEDGE_QUERY, label: '知识库查询', color: '#f39c12', icon: 'Search' },
  { value: FlowNodeType.SCHEDULING_TASK, label: '排产任务', color: '#e67e22', icon: 'Calendar' },
  { value: FlowNodeType.CONTAINER_OPERATION, label: '货柜操作', color: '#34495e', icon: 'Box' },
]

// 初始化 LogicFlow
const initLogicFlow = () => {
  if (!lfContainerRef.value) return

  // 配置
  const config = {
    container: lfContainerRef.value,
    grid: {
      size: 20,
      visible: true,
      type: 'dot', // 'dot' | 'mesh'
    },
    background: {
      color: '#f8f9fa',
    },
    keyboard: {
      enabled: true,
    },
    history: {
      enabled: true, // 启用撤销/重做
    },
    snapline: true, // 对齐线
    // 节点默认配置
    nodeText: {
      overflowMode: 'autoWrap',
    },
    edgeText: {
      overflowMode: 'autoWrap',
    },
  }

  // 创建实例
  lf.value = new LogicFlow(config)

  // 注册插件
  lf.value.use(Menu)
  lf.value.use(MiniMap, { container: document.createElement('div') })
  lf.value.use(Snapshot)
  lf.value.use(DndPanel)

  // 设置主题
  lf.value.setTheme({
    node: {
      strokeWidth: 2,
      stroke: '#666',
    },
    edge: {
      strokeWidth: 2,
      stroke: '#999',
      hoverStroke: '#333',
      selectedStroke: '#409eff',
    },
  })

  // 事件监听
  lf.value.on('node:click', ({ data }) => {
    const flowNode = editingFlow.value.nodes.find(n => n.id === data.id)
    if (flowNode) {
      selectedNode.value = flowNode
    }
  })

  lf.value.on('blank:click', () => {
    selectedNode.value = null
  })

  lf.value.on('node:delete', ({ data }) => {
    editingFlow.value.nodes = editingFlow.value.nodes.filter(n => n.id !== data.id)
    if (editingFlow.value.startNodeId === data.id) {
      editingFlow.value.startNodeId = ''
    }
  })

  lf.value.on('node:add', ({ data }) => {
    // 将 LogicFlow 节点转换为 FlowNode
    const nodeType = data.properties?.type || FlowNodeType.AI_TASK
    const newNode: FlowNode = {
      id: data.id,
      type: nodeType,
      name: data.text || '新节点',
      description: '',
      next: '',
      properties: data.properties || {},
    }
    editingFlow.value.nodes.push(newNode)

    // 如果是第一个节点，自动设为开始节点
    if (!editingFlow.value.startNodeId) {
      editingFlow.value.startNodeId = newNode.id
    }

    selectedNode.value = newNode
  })

  lf.value.on('edge:add', ({ data }) => {
    // 更新 source 节点的 next
    const sourceNode = editingFlow.value.nodes.find(n => n.id === data.sourceNodeId)
    if (sourceNode) {
      sourceNode.next = data.targetNodeId
    }
  })

  lf.value.on('edge:delete', ({ data }) => {
    // 清除 source 节点的 next
    const sourceNode = editingFlow.value.nodes.find(n => n.id === data.sourceNodeId)
    if (sourceNode) {
      sourceNode.next = ''
    }
  })

  // 渲染
  lf.value.render()
}

// 节点类型拖拽
const onNodeTypeDragStart = (event: DragEvent, type: FlowNodeType) => {
  if (!event.dataTransfer) return
  event.dataTransfer.setData('nodeType', type)
}

// 在画布中心添加节点
const addNodeAtCenter = () => {
  if (!lf.value) return

  const type = FlowNodeType.AI_TASK
  const option = nodeTypeOptions.find(o => o.value === type)!

  const nodeConfig: NodeConfig = {
    id: `node-${Date.now()}`,
    type: 'rect',
    x: 300,
    y: 200,
    text: option.label,
    properties: {
      type: type,
      name: option.label,
      description: '',
      ...getDefaultProperties(type),
    },
  }

  lf.value.addNode(nodeConfig)
}

// 获取节点默认属性
const getDefaultProperties = (type: FlowNodeType): Record<string, any> => {
  switch (type) {
    case FlowNodeType.AI_TASK:
      return { prompt: '', model: 'gpt-4', temperature: 0.7, maxTokens: 1000 }
    case FlowNodeType.SQL_TASK:
      return { sql: '', limit: 100 }
    case FlowNodeType.HTTP_TASK:
      return { url: '', method: 'GET', headers: '{}', body: '' }
    case FlowNodeType.DECISION:
      return { condition: '', trueNext: '', falseNext: '' }
    default:
      return {}
  }
}

// 删除选中节点
const deleteSelected = () => {
  if (!lf.value) return
  const selectedElements = lf.value.getSelectElements()
  const selectedNodes = selectedElements.nodes || []

  selectedNodes.forEach(node => {
    lf.value?.deleteNode(node.id)
  })
}

// 撤销/重做
const undo = () => {
  lf.value?.undo()
}

const redo = () => {
  lf.value?.redo()
}

// 网格对齐
const gridEnabled = ref(true)
const toggleGrid = () => {
  gridEnabled.value = !gridEnabled.value
  lf.value?.updateEditConfig({ grid: gridEnabled.value })
}

// 适应画布
const fitView = () => {
  lf.value?.fitView()
}

// 同步数据到 LogicFlow
const syncToLogicFlow = () => {
  if (!lf.value) return

  const graphData: GraphData = { nodes: [], edges: [] }

  // 转换节点
  editingFlow.value.nodes.forEach((node, index) => {
    const option = nodeTypeOptions.find(o => o.value === node.type)
    const nodeConfig: NodeConfig = {
      id: node.id,
      type: 'rect',
      x: 250 + (index % 5) * 150,
      y: 100 + Math.floor(index / 5) * 120,
      text: node.name,
      properties: {
        type: node.type,
        name: node.name,
        description: node.description,
        ...node.properties,
      },
    }

    // 设置颜色
    if (option) {
      nodeConfig.style = {
        fill: option.color + '20',
        stroke: option.color,
        strokeWidth: 2,
      }
    }

    // 标记开始节点
    if (editingFlow.value.startNodeId === node.id) {
      nodeConfig.style = {
        ...nodeConfig.style,
        fill: '#67c23a20',
        stroke: '#67c23a',
      }
    }

    graphData.nodes!.push(nodeConfig)

    // 转换边
    if (node.next) {
      const edge: EdgeConfig = {
        id: `edge-${node.id}-${node.next}`,
        type: 'polyline',
        sourceNodeId: node.id,
        targetNodeId: node.next,
        text: '下一步',
      }
      graphData.edges!.push(edge)
    }
  })

  lf.value.render(graphData)
}

// 从 LogicFlow 同步数据
const syncFromLogicFlow = () => {
  if (!lf.value) return

  const graphData = lf.value.getGraphData()

  // 清空现有节点
  editingFlow.value.nodes = []

  // 同步节点
  graphData.nodes?.forEach(node => {
    const flowNode: FlowNode = {
      id: node.id,
      type: node.properties?.type || FlowNodeType.AI_TASK,
      name: node.text || node.properties?.name || '节点',
      description: node.properties?.description || '',
      next: '',
      properties: node.properties || {},
    }
    editingFlow.value.nodes.push(flowNode)
  })

  // 同步边
  graphData.edges?.forEach(edge => {
    const sourceNode = editingFlow.value.nodes.find(n => n.id === edge.sourceNodeId)
    if (sourceNode) {
      sourceNode.next = edge.targetNodeId
    }
  })
}

// 保存流程
const saveFlow = async () => {
  syncFromLogicFlow()

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
    if (editingFlow.value.id) {
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

// 取消
const cancel = () => {
  window.close()
}

// 生命周期
onMounted(async () => {
  initLogicFlow()

  // 如果有ID，加载流程
  if (flowId.value) {
    loading.value = true
    try {
      const res = await flowService.getFlow(flowId.value)
      if (res.success && res.data) {
        editingFlow.value = res.data
        await nextTick()
        syncToLogicFlow()
      }
    } catch (error) {
      ElMessage.error('加载流程失败')
    } finally {
      loading.value = false
    }
  }
})

onUnmounted(() => {
  lf.value?.destroy()
})

// 监听 selectedNode 变化（与 editingFlow.nodes 同引用）
watch(
  () => selectedNode.value,
  newNode => {
    if (!newNode?.id || !lf.value) return

    // 更新节点文本
    const lfNode = lf.value.getNodeModelById(newNode.id)
    if (lfNode && lfNode.text !== newNode.name) {
      lfNode.setText(newNode.name)
    }
  },
  { deep: true }
)
</script>

<style scoped>
.flow-editor-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #fff;
}

.editor-header {
  height: 60px;
  padding: 0 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #ebeef5;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-title {
  font-size: 18px;
  font-weight: 500;
  color: #303133;
}

.editor-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.node-panel {
  width: 240px;
  border-right: 1px solid #ebeef5;
  background: #fafafa;
  display: flex;
  flex-direction: column;
}

.panel-header {
  height: 48px;
  padding: 0 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  border-bottom: 1px solid #ebeef5;
  background: #fff;
}

.panel-header span {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.node-types {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
}

.node-type-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  margin-bottom: 8px;
  background: #fff;
  border: 1px solid #ebeef5;
  border-left-width: 4px;
  border-radius: 4px;
  cursor: grab;
  transition: all 0.3s;
}

.node-type-item:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.node-type-item:active {
  cursor: grabbing;
}

.node-type-item span {
  font-size: 13px;
  color: #606266;
}

.canvas-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.toolbar {
  height: 48px;
  padding: 0 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid #ebeef5;
  background: #fff;
}

.logicflow-container {
  flex: 1;
  overflow: hidden;
}

.property-panel {
  width: 320px;
  border-left: 1px solid #ebeef5;
  background: #fafafa;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.property-section {
  padding: 16px;
  border-bottom: 1px solid #ebeef5;
}

.section-title {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
  margin-bottom: 12px;
}

:deep(.lf-canvas-overlay) {
  background: #f8f9fa !important;
}

:deep(.lf-node) {
  cursor: pointer;
}

:deep(.lf-node:hover) {
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
}
</style>
