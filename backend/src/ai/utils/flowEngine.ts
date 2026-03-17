/**
 * 流程执行引擎
 * Flow Execution Engine
 * 
 * 负责解析和执行流程定义
 */

import { logger } from '../../utils/logger';
import { siliconFlowAdapter } from '../adapters/SiliconFlowAdapter';
import { textToSqlService } from '../services/textToSql.service';
import { intelligentSchedulingService } from '../../services/intelligentScheduling.service';
import { searchKnowledge } from '../data/knowledgeBase';
import { AppDataSource } from '../../database';
import {
  FlowDefinition as FlowDefinitionType,
  FlowInstance as FlowInstanceType,
  FlowNode,
  FlowNodeType,
  FlowExecutionResult,
  FlowExecutionStep,
  StartNode,
  EndNode,
  AiTaskNode,
  SqlTaskNode,
  HttpTaskNode,
  DecisionNode,
  ParallelNode,
  LoopNode,
  KnowledgeQueryNode,
  SchedulingTaskNode,
  ContainerOperationNode
} from '../types/flow';
import { FlowDefinition } from '../../entities/FlowDefinition';
import { FlowInstance } from '../../entities/FlowInstance';

/**
 * 流程引擎类
 */
export class FlowEngine {
  private flowDefinitions: Map<string, FlowDefinitionType> = new Map();
  private flowInstances: Map<string, FlowInstanceType> = new Map();
  private flowDefinitionRepository = AppDataSource.getRepository(FlowDefinition);
  private flowInstanceRepository = AppDataSource.getRepository(FlowInstance);

  /**
   * 初始化：从数据库加载流程定义
   */
  async initialize(): Promise<void> {
    try {
      const flows = await this.flowDefinitionRepository.find();
      flows.forEach(flow => {
        this.flowDefinitions.set(flow.id, flow as unknown as FlowDefinitionType);
      });
      logger.info(`[FlowEngine] Loaded ${flows.length} flow definitions from database`);
    } catch (error) {
      logger.error(`[FlowEngine] Failed to load flow definitions: ${error}`);
    }
  }

  /**
   * 注册流程定义
   */
  async registerFlow(flow: FlowDefinitionType): Promise<void> {
    this.flowDefinitions.set(flow.id, flow);
    
    // 持久化到数据库
    try {
      const flowEntity = this.flowDefinitionRepository.create(flow);
      await this.flowDefinitionRepository.save(flowEntity);
      logger.info(`[FlowEngine] Flow registered and persisted: ${flow.name} (${flow.id})`);
    } catch (error) {
      logger.error(`[FlowEngine] Failed to persist flow definition: ${error}`);
    }
  }

  /**
   * 创建流程实例
   */
  async createFlowInstance(flowId: string, variables: Record<string, any> = {}): Promise<FlowInstanceType> {
    const flow = this.flowDefinitions.get(flowId);
    if (!flow) {
      throw new Error(`Flow definition not found: ${flowId}`);
    }

    // 初始化变量
    const initializedVariables: Record<string, any> = { ...variables };
    flow.variables?.forEach(variable => {
      if (initializedVariables[variable.name] === undefined && variable.defaultValue !== undefined) {
        initializedVariables[variable.name] = variable.defaultValue;
      }
    });

    const instance: FlowInstanceType = {
      id: `flow-instance-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      flowId,
      status: 'running',
      variables: initializedVariables,
      currentNodeId: flow.startNodeId,
      executionHistory: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.flowInstances.set(instance.id, instance);
    
    // 持久化到数据库
    try {
      const instanceEntity = this.flowInstanceRepository.create(instance);
      await this.flowInstanceRepository.save(instanceEntity);
      logger.info(`[FlowEngine] Flow instance created and persisted: ${instance.id} for flow ${flow.name}`);
    } catch (error) {
      logger.error(`[FlowEngine] Failed to persist flow instance: ${error}`);
    }

    return instance;
  }

  /**
   * 执行流程实例
   */
  async executeFlowInstance(instanceId: string): Promise<FlowExecutionResult> {
    const instance = this.flowInstances.get(instanceId);
    if (!instance) {
      throw new Error(`Flow instance not found: ${instanceId}`);
    }

    const flow = this.flowDefinitions.get(instance.flowId);
    if (!flow) {
      throw new Error(`Flow definition not found: ${instance.flowId}`);
    }

    const startTime = Date.now();
    const steps: FlowExecutionStep[] = [];

    try {
      let currentNodeId = instance.currentNodeId;

      while (currentNodeId) {
        const node = flow.nodes.find(n => n.id === currentNodeId);
        if (!node) {
          throw new Error(`Node not found: ${currentNodeId}`);
        }

        const step = await this.executeNode(node, instance);
        steps.push(step);
        
        // 记录执行历史
        instance.executionHistory.push(step);

        if (step.status === 'failed') {
          instance.status = 'failed';
          instance.updatedAt = new Date().toISOString();
          this.flowInstances.set(instanceId, instance);
          
          // 更新数据库
          await this.updateFlowInstanceInDatabase(instance);

          return {
            success: false,
            error: step.error || 'Node execution failed',
            executionTime: Date.now() - startTime,
            steps
          };
        }

        // 处理节点输出
        if (step.output) {
          this.updateVariables(instance, step.output);
        }

        // 获取下一个节点
        currentNodeId = this.getNextNodeId(node, instance);
        instance.currentNodeId = currentNodeId || '';
        instance.updatedAt = new Date().toISOString();
        this.flowInstances.set(instanceId, instance);
        
        // 更新数据库
        await this.updateFlowInstanceInDatabase(instance);

        // 如果是结束节点，退出循环
        if (node.type === FlowNodeType.END) {
          instance.status = 'completed';
          instance.completedAt = new Date().toISOString();
          this.flowInstances.set(instanceId, instance);
          
          // 更新数据库
          await this.updateFlowInstanceInDatabase(instance);
          break;
        }
      }

      return {
        success: true,
        data: instance.variables,
        executionTime: Date.now() - startTime,
        steps
      };
    } catch (error: any) {
      instance.status = 'failed';
      instance.updatedAt = new Date().toISOString();
      this.flowInstances.set(instanceId, instance);
      
      // 更新数据库
      await this.updateFlowInstanceInDatabase(instance);

      return {
        success: false,
        error: error.message,
        executionTime: Date.now() - startTime,
        steps
      };
    }
  }

  /**
   * 更新数据库中的流程实例
   */
  private async updateFlowInstanceInDatabase(instance: FlowInstanceType): Promise<void> {
    try {
      await this.flowInstanceRepository.save(instance);
    } catch (error) {
      logger.error(`[FlowEngine] Failed to update flow instance in database: ${error}`);
    }
  }

  /**
   * 执行单个节点
   */
  private async executeNode(node: FlowNode, instance: FlowInstance): Promise<FlowExecutionStep> {
    const step: FlowExecutionStep = {
      id: `step-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      nodeId: node.id,
      nodeType: node.type,
      status: 'success',
      executedAt: new Date().toISOString()
    };

    try {
      switch (node.type) {
        case FlowNodeType.START:
          step.output = this.executeStartNode(node as StartNode, instance);
          break;

        case FlowNodeType.END:
          step.output = this.executeEndNode(node as EndNode, instance);
          break;

        case FlowNodeType.AI_TASK:
          step.output = await this.executeAiTaskNode(node as AiTaskNode, instance);
          break;

        case FlowNodeType.SQL_TASK:
          step.output = await this.executeSqlTaskNode(node as SqlTaskNode, instance);
          break;

        case FlowNodeType.HTTP_TASK:
          step.output = await this.executeHttpTaskNode(node as HttpTaskNode, instance);
          break;

        case FlowNodeType.DECISION:
          step.output = this.executeDecisionNode(node as DecisionNode, instance);
          break;

        case FlowNodeType.PARALLEL:
          step.output = await this.executeParallelNode(node as ParallelNode, instance);
          break;

        case FlowNodeType.LOOP:
          step.output = await this.executeLoopNode(node as LoopNode, instance);
          break;

        case FlowNodeType.KNOWLEDGE_QUERY:
          step.output = await this.executeKnowledgeQueryNode(node as KnowledgeQueryNode, instance);
          break;

        case FlowNodeType.SCHEDULING_TASK:
          step.output = await this.executeSchedulingTaskNode(node as SchedulingTaskNode, instance);
          break;

        case FlowNodeType.CONTAINER_OPERATION:
          step.output = await this.executeContainerOperationNode(node as ContainerOperationNode, instance);
          break;

        default:
          throw new Error(`Unsupported node type: ${node.type}`);
      }

      return step;
    } catch (error: any) {
      step.status = 'failed';
      step.error = error.message;
      return step;
    }
  }

  /**
   * 执行开始节点
   */
  private executeStartNode(node: StartNode, instance: FlowInstance): any {
    logger.info(`[FlowEngine] Executing start node: ${node.name}`);
    return { message: 'Flow started' };
  }

  /**
   * 执行结束节点
   */
  private executeEndNode(node: EndNode, instance: FlowInstance): any {
    logger.info(`[FlowEngine] Executing end node: ${node.name}`);
    return node.result || { message: 'Flow completed' };
  }

  /**
   * 执行AI任务节点
   */
  private async executeAiTaskNode(node: AiTaskNode, instance: FlowInstance): Promise<any> {
    logger.info(`[FlowEngine] Executing AI task node: ${node.name}`);

    const prompt = this.replaceVariables(node.properties.prompt, instance.variables);
    const model = node.properties.model || process.env.SILICON_FLOW_MODEL || 'deepseek-ai/DeepSeek-V2-Chat';
    const temperature = node.properties.temperature || 0.7;
    const maxTokens = node.properties.maxTokens || 1000;

    const response = await siliconFlowAdapter.chat([
      { role: 'system', content: 'You are a helpful assistant' },
      { role: 'user', content: prompt }
    ], {
      model,
      temperature,
      max_tokens: maxTokens
    });

    return { aiResponse: response };
  }

  /**
   * 执行SQL任务节点
   */
  private async executeSqlTaskNode(node: SqlTaskNode, instance: FlowInstance): Promise<any> {
    logger.info(`[FlowEngine] Executing SQL task node: ${node.name}`);

    const query = this.replaceVariables(node.properties.query, instance.variables);
    const limit = node.properties.limit || 10;

    const result = await textToSqlService.executeSql(query, limit);
    if (!result.success) {
      throw new Error(result.error || 'SQL execution failed');
    }

    return { sqlResult: result };
  }

  /**
   * 执行HTTP请求任务节点
   */
  private async executeHttpTaskNode(node: HttpTaskNode, instance: FlowInstance): Promise<any> {
    logger.info(`[FlowEngine] Executing HTTP task node: ${node.name}`);

    const url = this.replaceVariables(node.properties.url, instance.variables);
    const method = node.properties.method;
    const headers = this.replaceVariablesInObject(node.properties.headers || {}, instance.variables);
    const body = this.replaceVariablesInObject(node.properties.body || {}, instance.variables);

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`HTTP request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return { httpResult: data };
  }

  /**
   * 执行决策节点
   */
  private executeDecisionNode(node: DecisionNode, instance: FlowInstanceType): any {
    logger.info(`[FlowEngine] Executing decision node: ${node.name}`);

    const condition = this.replaceVariables(node.properties.condition, instance.variables);
    
    // 简单的条件表达式求值
    try {
      // 使用安全的方式评估条件
      const result = this.evaluateCondition(condition, instance.variables);
      return { decision: result, nextNode: result ? node.properties.trueNext : node.properties.falseNext };
    } catch (error) {
      throw new Error(`Condition evaluation failed: ${(error as Error).message}`);
    }
  }

  /**
   * 执行并行节点
   */
  private async executeParallelNode(node: ParallelNode, instance: FlowInstanceType): Promise<any> {
    logger.info(`[FlowEngine] Executing parallel node: ${node.name}`);

    const flow = this.flowDefinitions.get(instance.flowId);
    if (!flow) {
      throw new Error(`Flow definition not found: ${instance.flowId}`);
    }

    const branchResults = [];

    for (const branchNodeId of node.properties.branches) {
      const branchNode = flow.nodes.find(n => n.id === branchNodeId);
      if (branchNode) {
        const branchStep = await this.executeNode(branchNode, instance);
        // 记录执行历史
        instance.executionHistory.push(branchStep);
        branchResults.push({ nodeId: branchNodeId, result: branchStep.output });
      }
    }

    return { parallelResults: branchResults };
  }

  /**
   * 执行循环节点
   */
  private async executeLoopNode(node: LoopNode, instance: FlowInstanceType): Promise<any> {
    logger.info(`[FlowEngine] Executing loop node: ${node.name}`);

    const flow = this.flowDefinitions.get(instance.flowId);
    if (!flow) {
      throw new Error(`Flow definition not found: ${instance.flowId}`);
    }

    const loopBodyNode = flow.nodes.find(n => n.id === node.properties.body);
    if (!loopBodyNode) {
      throw new Error(`Loop body node not found: ${node.properties.body}`);
    }

    const loopResults = [];

    while (true) {
      const condition = this.replaceVariables(node.properties.condition, instance.variables);
      const shouldContinue = this.evaluateCondition(condition, instance.variables);

      if (!shouldContinue) {
        break;
      }

      const step = await this.executeNode(loopBodyNode, instance);
      if (step.status === 'failed') {
        throw new Error(`Loop body execution failed: ${step.error}`);
      }

      // 记录执行历史
      instance.executionHistory.push(step);
      loopResults.push(step.output);
    }

    return { loopResults };
  }

  /**
   * 执行知识库查询节点
   */
  private async executeKnowledgeQueryNode(node: KnowledgeQueryNode, instance: FlowInstanceType): Promise<any> {
    logger.info(`[FlowEngine] Executing knowledge query node: ${node.name}`);

    const query = this.replaceVariables(node.properties.query, instance.variables);
    const knowledgeResults = searchKnowledge(query);

    return { knowledgeResults };
  }

  /**
   * 执行排产任务节点
   */
  private async executeSchedulingTaskNode(node: SchedulingTaskNode, instance: FlowInstanceType): Promise<any> {
    logger.info(`[FlowEngine] Executing scheduling task node: ${node.name}`);

    const country = this.replaceVariables(node.properties.country || '', instance.variables) || undefined;
    const startDate = this.replaceVariables(node.properties.startDate || '', instance.variables) || undefined;
    const endDate = this.replaceVariables(node.properties.endDate || '', instance.variables) || undefined;

    const scheduleResponse = await intelligentSchedulingService.batchSchedule({
      country,
      startDate,
      endDate,
      forceSchedule: false
    });

    return { schedulingResult: scheduleResponse };
  }

  /**
   * 执行货柜操作节点
   */
  private async executeContainerOperationNode(node: ContainerOperationNode, instance: FlowInstanceType): Promise<any> {
    logger.info(`[FlowEngine] Executing container operation node: ${node.name}`);

    const operation = this.replaceVariables(node.properties.operation, instance.variables);
    const containerNumber = this.replaceVariables(node.properties.containerNumber || '', instance.variables) || undefined;

    // 这里可以根据操作类型执行不同的货柜操作
    // 例如：更新状态、记录操作日志等
    
    return { containerOperation: { operation, containerNumber, success: true } };
  }

  /**
   * 获取下一个节点ID
   */
  private getNextNodeId(node: FlowNode, instance: FlowInstanceType): string | null {
    // 对于决策节点，下一个节点由决策结果决定
    if (node.type === FlowNodeType.DECISION) {
      const decisionNode = node as DecisionNode;
      const condition = this.replaceVariables(decisionNode.properties.condition, instance.variables);
      const result = this.evaluateCondition(condition, instance.variables);
      return result ? decisionNode.properties.trueNext : decisionNode.properties.falseNext;
    }

    // 对于结束节点，没有下一个节点
    if (node.type === FlowNodeType.END) {
      return null;
    }

    // 对于其他节点，使用node.next
    return node.next || null;
  }

  /**
   * 更新实例变量
   */
  private updateVariables(instance: FlowInstanceType, output: any): void {
    if (output) {
      // 只更新非系统保留变量
      const safeOutput = { ...output };
      // 移除可能的系统保留变量
      delete safeOutput.__proto__;
      delete safeOutput.constructor;
      delete safeOutput.prototype;
      
      Object.assign(instance.variables, safeOutput);
    }
  }

  /**
   * 替换字符串中的变量
   */
  private replaceVariables(text: string, variables: Record<string, any>): string {
    return text.replace(/\$\{([^}]+)\}/g, (match, variableName) => {
      return variables[variableName] !== undefined ? String(variables[variableName]) : match;
    });
  }

  /**
   * 替换对象中的变量
   */
  private replaceVariablesInObject(obj: any, variables: Record<string, any>): any {
    if (typeof obj === 'string') {
      return this.replaceVariables(obj, variables);
    } else if (Array.isArray(obj)) {
      return obj.map(item => this.replaceVariablesInObject(item, variables));
    } else if (typeof obj === 'object' && obj !== null) {
      const result: any = {};
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          result[key] = this.replaceVariablesInObject(obj[key], variables);
        }
      }
      return result;
    }
    return obj;
  }

  /**
   * 评估条件表达式
   */
  private evaluateCondition(condition: string, variables: Record<string, any>): boolean {
    // 简单的条件表达式评估
    // 注意：这是一个简化实现，实际应用中可能需要更复杂的表达式解析
    try {
      // 替换变量
      const evaluatedCondition = this.replaceVariables(condition, variables);
      
      // 使用更安全的方式评估表达式
      // 只允许基本的比较操作和逻辑操作
      const safeCondition = evaluatedCondition
        .replace(/[^a-zA-Z0-9\s\+\-\*\/\%\=\!\<\>\&\|\(\)]/g, '')
        .replace(/eval|Function|Object|Array|String|Number|Boolean|Date|Math|RegExp/g, '');
      
      // 使用Function构造函数安全地评估表达式
      const evalFn = new Function('return ' + safeCondition);
      return Boolean(evalFn());
    } catch (error) {
      throw new Error(`Invalid condition: ${condition}`);
    }
  }

  /**
   * 获取流程实例
   */
  getFlowInstance(instanceId: string): FlowInstance | undefined {
    return this.flowInstances.get(instanceId);
  }

  /**
   * 获取所有流程定义
   */
  getFlowDefinitions(): FlowDefinitionType[] {
    return Array.from(this.flowDefinitions.values());
  }

  /**
   * 删除流程定义
   */
  async deleteFlowDefinition(flowId: string): Promise<boolean> {
    const flow = this.flowDefinitions.get(flowId);
    if (flow) {
      this.flowDefinitions.delete(flowId);
      
      // 从数据库中删除
      try {
        await this.flowDefinitionRepository.delete(flowId);
        logger.info(`[FlowEngine] Flow definition deleted: ${flow.name} (${flow.id})`);
        return true;
      } catch (error) {
        logger.error(`[FlowEngine] Failed to delete flow definition from database: ${error}`);
        return false;
      }
    }
    return false;
  }

  /**
   * 暂停流程实例
   */
  async pauseFlowInstance(instanceId: string): Promise<boolean> {
    const instance = this.flowInstances.get(instanceId);
    if (instance && instance.status === 'running') {
      instance.status = 'paused';
      instance.updatedAt = new Date().toISOString();
      this.flowInstances.set(instanceId, instance);
      
      // 更新数据库
      await this.updateFlowInstanceInDatabase(instance);
      logger.info(`[FlowEngine] Flow instance paused: ${instanceId}`);
      return true;
    }
    return false;
  }

  /**
   * 恢复流程实例
   */
  async resumeFlowInstance(instanceId: string): Promise<boolean> {
    const instance = this.flowInstances.get(instanceId);
    if (instance && instance.status === 'paused') {
      instance.status = 'running';
      instance.updatedAt = new Date().toISOString();
      this.flowInstances.set(instanceId, instance);
      
      // 更新数据库
      await this.updateFlowInstanceInDatabase(instance);
      logger.info(`[FlowEngine] Flow instance resumed: ${instanceId}`);
      return true;
    }
    return false;
  }
}

/**
 * 默认流程引擎实例
 */
export const flowEngine = new FlowEngine();
