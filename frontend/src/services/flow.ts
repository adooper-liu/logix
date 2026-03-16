import { api } from './api'

// 流程节点类型
export enum FlowNodeType {
  // 基础节点
  START = 'start',
  END = 'end',
  
  // 任务节点
  AI_TASK = 'ai_task',       // AI任务
  SQL_TASK = 'sql_task',       // SQL查询任务
  HTTP_TASK = 'http_task',     // HTTP请求任务
  
  // 控制节点
  DECISION = 'decision',       // 决策节点
  PARALLEL = 'parallel',       // 并行节点
  LOOP = 'loop',               // 循环节点
  
  // 特殊节点
  KNOWLEDGE_QUERY = 'knowledge_query',  // 知识库查询
  SCHEDULING_TASK = 'scheduling_task',  // 排产任务
  CONTAINER_OPERATION = 'container_operation'  // 货柜操作
}

// 流程节点基类
export interface FlowNode {
  id: string           // 节点ID
  type: FlowNodeType   // 节点类型
  name: string         // 节点名称
  description?: string // 节点描述
  next?: string        // 下一个节点ID
  properties?: Record<string, any> // 节点属性
}

// 流程定义
export interface FlowDefinition {
  id: string             // 流程ID
  name: string           // 流程名称
  description?: string    // 流程描述
  version: string         // 流程版本
  createdBy: string       // 创建者
  createdAt: string       // 创建时间
  updatedAt: string       // 更新时间
  nodes: FlowNode[]       // 流程节点
  startNodeId: string     // 开始节点ID
  variables?: {
    name: string
    type: string
    defaultValue?: any
  }[]                     // 流程变量
}

// 流程执行结果
export interface FlowExecutionResult {
  success: boolean        // 是否成功
  data?: any              // 执行结果数据
  error?: string          // 错误信息
  executionTime?: number  // 执行时间（毫秒）
  steps?: Array<{
    id: string
    nodeId: string
    nodeType: FlowNodeType
    status: 'success' | 'failed'
    input?: any
    output?: any
    error?: string
    executedAt: string
  }> // 执行步骤
}

// 流程服务
export const flowService = {
  // 创建流程定义
  async createFlow(flow: Omit<FlowDefinition, 'id' | 'createdAt' | 'updatedAt'>) {
    return api.post<{
      success: boolean
      data?: FlowDefinition
      error?: string
    }>('/v1/ai/flow', flow)
  },

  // 获取所有流程定义
  async getFlows() {
    return api.get<{
      success: boolean
      data?: FlowDefinition[]
      error?: string
    }>('/v1/ai/flow')
  },

  // 获取流程定义详情
  async getFlow(id: string) {
    return api.get<{
      success: boolean
      data?: FlowDefinition
      error?: string
    }>(`/v1/ai/flow/${id}`)
  },

  // 更新流程定义
  async updateFlow(id: string, updates: Partial<FlowDefinition>) {
    return api.put<{
      success: boolean
      data?: FlowDefinition
      error?: string
    }>(`/v1/ai/flow/${id}`, updates)
  },

  // 删除流程定义
  async deleteFlow(id: string) {
    return api.delete<{
      success: boolean
      message?: string
      error?: string
    }>(`/v1/ai/flow/${id}`)
  },

  // 执行流程
  async executeFlow(flowId: string, variables: Record<string, any> = {}) {
    return api.post<{
      success: boolean
      data?: FlowExecutionResult
      error?: string
    }>('/v1/ai/flow/execute', { flowId, variables })
  },

  // 执行流程定义（直接执行，不保存）
  async executeFlowDefinition(flow: FlowDefinition, variables: Record<string, any> = {}) {
    return api.post<{
      success: boolean
      data?: FlowExecutionResult
      error?: string
    }>('/v1/ai/flow/execute-definition', { flow, variables })
  }
}

export default flowService
