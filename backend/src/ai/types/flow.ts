/**
 * 流程定义类型
 * Flow Definition Types
 */

// 流程变量类型
export enum FlowVariableType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  OBJECT = 'object',
  ARRAY = 'array'
}

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
  id: string;           // 节点ID
  type: FlowNodeType;   // 节点类型
  name: string;         // 节点名称
  description?: string; // 节点描述
  next?: string;        // 下一个节点ID
  properties?: Record<string, any>; // 节点属性
}

// 开始节点
export interface StartNode extends FlowNode {
  type: FlowNodeType.START;
}

// 结束节点
export interface EndNode extends FlowNode {
  type: FlowNodeType.END;
  result?: any; // 流程结果
}

// AI任务节点
export interface AiTaskNode extends FlowNode {
  type: FlowNodeType.AI_TASK;
  properties: {
    prompt: string;         // AI提示词
    model?: string;         // 模型名称
    temperature?: number;   // 温度参数
    maxTokens?: number;     // 最大 tokens
    variables?: string[];   // 变量列表
  };
}

// SQL查询任务节点
export interface SqlTaskNode extends FlowNode {
  type: FlowNodeType.SQL_TASK;
  properties: {
    query: string;          // SQL查询语句
    variables?: string[];   // 变量列表
    limit?: number;         // 结果限制
  };
}

// HTTP请求任务节点
export interface HttpTaskNode extends FlowNode {
  type: FlowNodeType.HTTP_TASK;
  properties: {
    url: string;            // 请求URL
    method: 'GET' | 'POST' | 'PUT' | 'DELETE'; // 请求方法
    headers?: Record<string, string>; // 请求头
    body?: any;             // 请求体
    variables?: string[];   // 变量列表
  };
}

// 决策节点
export interface DecisionNode extends FlowNode {
  type: FlowNodeType.DECISION;
  properties: {
    condition: string;      // 条件表达式
    trueNext: string;       // 条件为真时的下一个节点
    falseNext: string;      // 条件为假时的下一个节点
  };
}

// 并行节点
export interface ParallelNode extends FlowNode {
  type: FlowNodeType.PARALLEL;
  properties: {
    branches: string[];     // 并行分支节点ID列表
  };
}

// 循环节点
export interface LoopNode extends FlowNode {
  type: FlowNodeType.LOOP;
  properties: {
    condition: string;      // 循环条件
    body: string;           // 循环体节点ID
  };
}

// 知识库查询节点
export interface KnowledgeQueryNode extends FlowNode {
  type: FlowNodeType.KNOWLEDGE_QUERY;
  properties: {
    query: string;          // 查询关键词
    variables?: string[];   // 变量列表
  };
}

// 排产任务节点
export interface SchedulingTaskNode extends FlowNode {
  type: FlowNodeType.SCHEDULING_TASK;
  properties: {
    country?: string;       // 国家
    startDate?: string;     // 开始日期
    endDate?: string;       // 结束日期
    variables?: string[];   // 变量列表
  };
}

// 货柜操作节点
export interface ContainerOperationNode extends FlowNode {
  type: FlowNodeType.CONTAINER_OPERATION;
  properties: {
    operation: string;      // 操作类型
    containerNumber?: string; // 货柜号
    variables?: string[];   // 变量列表
  };
}

// 流程定义
export interface FlowDefinition {
  id: string;             // 流程ID
  name: string;           // 流程名称
  description?: string;    // 流程描述
  version: string;         // 流程版本
  createdBy: string;       // 创建者
  createdAt: string;       // 创建时间
  updatedAt: string;       // 更新时间
  nodes: FlowNode[];       // 流程节点
  startNodeId: string;     // 开始节点ID
  variables?: {
    name: string;
    type: FlowVariableType;
    defaultValue?: any;
  }[];                     // 流程变量
}

// 流程实例（与 entities/FlowInstance 同一类，供服务与 TypeORM 共用）
export { FlowInstance } from '../../entities/FlowInstance';

// 流程执行步骤
export interface FlowExecutionStep {
  id: string;             // 步骤ID
  nodeId: string;         // 节点ID
  nodeType: FlowNodeType;  // 节点类型
  status: 'success' | 'failed'; // 执行状态
  input?: any;            // 输入数据
  output?: any;           // 输出数据
  error?: string;         // 错误信息
  executedAt: string;      // 执行时间
}

// 流程执行结果
export interface FlowExecutionResult {
  success: boolean;        // 是否成功
  data?: any;              // 执行结果数据
  error?: string;          // 错误信息
  executionTime?: number;  // 执行时间（毫秒）
  steps?: FlowExecutionStep[]; // 执行步骤
}
