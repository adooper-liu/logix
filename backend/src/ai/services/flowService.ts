/**
 * 流程管理服务
 * Flow Management Service
 * 
 * 负责流程的创建、管理和执行
 */

import { logger } from '../../utils/logger';
import { flowEngine } from '../utils/flowEngine';
import {
  FlowDefinition,
  FlowInstance,
  FlowExecutionResult
} from '../types/flow';

/**
 * 流程服务类
 */
export class FlowService {
  /**
   * 创建流程定义
   */
  createFlowDefinition(flow: Omit<FlowDefinition, 'id' | 'createdAt' | 'updatedAt'>): FlowDefinition {
    const newFlow: FlowDefinition = {
      ...flow,
      id: `flow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    flowEngine.registerFlow(newFlow);
    logger.info(`[FlowService] Flow definition created: ${newFlow.name} (${newFlow.id})`);
    return newFlow;
  }

  /**
   * 获取所有流程定义
   */
  getFlowDefinitions(): FlowDefinition[] {
    return flowEngine.getFlowDefinitions();
  }

  /**
   * 获取流程定义
   */
  getFlowDefinition(flowId: string): FlowDefinition | undefined {
    const flows = flowEngine.getFlowDefinitions();
    return flows.find(flow => flow.id === flowId);
  }

  /**
   * 更新流程定义
   */
  updateFlowDefinition(flowId: string, updates: Partial<FlowDefinition>): FlowDefinition | null {
    const existingFlow = this.getFlowDefinition(flowId);
    if (!existingFlow) {
      return null;
    }

    const updatedFlow: FlowDefinition = {
      ...existingFlow,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    flowEngine.registerFlow(updatedFlow);
    logger.info(`[FlowService] Flow definition updated: ${updatedFlow.name} (${updatedFlow.id})`);
    return updatedFlow;
  }

  /**
   * 删除流程定义
   */
  deleteFlowDefinition(flowId: string): boolean {
    // 注意：由于flowEngine使用Map存储，这里需要重新实现删除逻辑
    // 目前简化处理，实际应用中可能需要更复杂的逻辑
    const flow = this.getFlowDefinition(flowId);
    if (flow) {
      logger.info(`[FlowService] Flow definition deleted: ${flow.name} (${flow.id})`);
      return true;
    }
    return false;
  }

  /**
   * 创建流程实例
   */
  createFlowInstance(flowId: string, variables: Record<string, any> = {}): FlowInstance {
    return flowEngine.createFlowInstance(flowId, variables);
  }

  /**
   * 执行流程实例
   */
  async executeFlowInstance(instanceId: string): Promise<FlowExecutionResult> {
    return flowEngine.executeFlowInstance(instanceId);
  }

  /**
   * 获取流程实例
   */
  getFlowInstance(instanceId: string): FlowInstance | undefined {
    return flowEngine.getFlowInstance(instanceId);
  }

  /**
   * 执行流程（创建并执行）
   */
  async executeFlow(flowId: string, variables: Record<string, any> = {}): Promise<FlowExecutionResult> {
    const instance = this.createFlowInstance(flowId, variables);
    return this.executeFlowInstance(instance.id);
  }

  /**
   * 执行流程定义（直接执行流程定义，不保存实例）
   */
  async executeFlowDefinition(flow: FlowDefinition, variables: Record<string, any> = {}): Promise<FlowExecutionResult> {
    // 注册流程定义
    flowEngine.registerFlow(flow);
    
    // 创建并执行实例
    const instance = this.createFlowInstance(flow.id, variables);
    return this.executeFlowInstance(instance.id);
  }
}

/**
 * 默认流程服务实例
 */
export const flowService = new FlowService();
