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
  async createFlowDefinition(flow: Omit<FlowDefinition, 'id' | 'createdAt' | 'updatedAt'>): Promise<FlowDefinition> {
    const newFlow: FlowDefinition = {
      ...flow,
      id: `flow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await flowEngine.registerFlow(newFlow);
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
  async deleteFlowDefinition(flowId: string): Promise<boolean> {
    const flow = this.getFlowDefinition(flowId);
    if (flow) {
      const result = await flowEngine.deleteFlowDefinition(flowId);
      if (result) {
        logger.info(`[FlowService] Flow definition deleted: ${flow.name} (${flow.id})`);
        return true;
      }
    }
    return false;
  }

  /**
   * 创建流程实例
   */
  async createFlowInstance(flowId: string, variables: Record<string, any> = {}): Promise<FlowInstance> {
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
    const instance = await this.createFlowInstance(flowId, variables);
    return this.executeFlowInstance(instance.id);
  }

  /**
   * 执行流程定义（直接执行流程定义，不保存实例）
   */
  async executeFlowDefinition(flow: FlowDefinition, variables: Record<string, any> = {}): Promise<FlowExecutionResult> {
    // 检查流程定义是否已经存在
    const existingFlow = this.getFlowDefinition(flow.id);
    if (!existingFlow) {
      // 只有当流程定义不存在时才注册
      await flowEngine.registerFlow(flow);
    }

    // 创建并执行实例
    const instance = await this.createFlowInstance(flow.id, variables);
    return this.executeFlowInstance(instance.id);
  }

  /**
   * 暂停流程实例
   */
  async pauseFlowInstance(instanceId: string): Promise<boolean> {
    return flowEngine.pauseFlowInstance(instanceId);
  }

  /**
   * 恢复流程实例
   */
  async resumeFlowInstance(instanceId: string): Promise<boolean> {
    return flowEngine.resumeFlowInstance(instanceId);
  }
}

/**
 * 默认流程服务实例
 */
export const flowService = new FlowService();
