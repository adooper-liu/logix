/**
 * 物流路径验证工具
 * Logistics Path Validation Utilities
 */

import { StatusPath, StatusNode, StandardStatus, NodeStatus, PathStatus } from '../types/Logistics';
import {
  isValidTransition,
  getStatusPriority,
  isAlertStatus
} from '../types/StateMachine';

/**
 * 计算节点状态（已完成/进行中/未开始）
 */
export const calculateNodeStatus = (
  node: StatusNode,
  index: number,
  nodes: StatusNode[]
): NodeStatus => {
  const now = new Date();
  const nodeTime = new Date(node.timestamp);

  // 如果有后续节点且后续节点已完成，则当前节点已完成
  if (index < nodes.length - 1) {
    const nextNode = nodes[index + 1];
    if (nextNode.nodeStatus === NodeStatus.COMPLETED) {
      return NodeStatus.COMPLETED;
    }
  }

  // 如果当前节点是最后一个，检查其状态
  if (index === nodes.length - 1) {
    if (nodeTime <= now) {
      return NodeStatus.COMPLETED;
    }
    if (nodeTime <= new Date(now.getTime() + 24 * 60 * 60 * 1000)) {
      return NodeStatus.IN_PROGRESS;
    }
    return NodeStatus.PENDING;
  }

  // 如果当前节点时间已过，则已完成
  if (nodeTime <= now) {
    return NodeStatus.COMPLETED;
  }

  // 如果当前节点时间在未来24小时内，则进行中
  if (nodeTime <= new Date(now.getTime() + 24 * 60 * 60 * 1000)) {
    return NodeStatus.IN_PROGRESS;
  }

  // 否则未开始
  return NodeStatus.PENDING;
};

/**
 * 验证状态流转合法性
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export const validateStatusPath = (path: StatusPath): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const nodes = path.nodes;

  // 检查节点数量
  if (nodes.length === 0) {
    errors.push('路径中没有任何状态节点');
    return { isValid: false, errors, warnings };
  }

  // 检查节点时间是否按顺序
  for (let i = 1; i < nodes.length; i++) {
    const prevTime = new Date(nodes[i - 1].timestamp);
    const currTime = new Date(nodes[i].timestamp);

    if (currTime < prevTime) {
      warnings.push(`节点时间顺序异常：${nodes[i].description} 时间早于 ${nodes[i - 1].description}`);
    }
  }

  // 检查状态流转合法性
  for (let i = 1; i < nodes.length; i++) {
    const prevStatus = nodes[i - 1].status;
    const currStatus = nodes[i].status;

    if (!isValidTransition(prevStatus, currStatus)) {
      errors.push(
        `非法状态流转：${nodes[i - 1].description} (${prevStatus}) -> ${nodes[i].description} (${currStatus})`
      );
    }
  }

  // 检查是否有重复的相同状态
  const statusSequence = nodes.map(n => n.status);
  const statusSet = new Set(statusSequence);
  if (statusSet.size < statusSequence.length) {
    warnings.push('路径中存在重复的状态');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * 计算路径整体状态
 */
export const calculatePathStatus = (path: StatusPath): PathStatus => {
  const nodes = path.nodes;

  // 如果最后一个节点是完成状态
  const lastNode = nodes[nodes.length - 1];
  if (lastNode.status === StandardStatus.COMPLETED) {
    return PathStatus.COMPLETED;
  }

  // 如果有异常状态（扣留类）
  const hasHoldStatus = nodes.some(n =>
    [
      StandardStatus.CUSTOMS_HOLD,
      StandardStatus.CARRIER_HOLD,
      StandardStatus.TERMINAL_HOLD,
      StandardStatus.CHARGES_HOLD,
      StandardStatus.DUMPED
    ].includes(n.status)
  );
  if (hasHoldStatus) {
    return PathStatus.HOLD;
  }

  // 如果有延误状态
  const hasDelayedStatus = nodes.some(n =>
    [
      StandardStatus.DELAYED,
      StandardStatus.DETENTION,
      StandardStatus.OVERDUE,
      StandardStatus.CONGESTION
    ].includes(n.status)
  );
  if (hasDelayedStatus) {
    return PathStatus.DELAYED;
  }

  // 默认准点
  return PathStatus.ON_TIME;
};

/**
 * 计算节点是否异常
 */
export const calculateIsAlert = (node: StatusNode): boolean => {
  return isAlertStatus(node.status);
};

/**
 * 完整的路径数据处理
 */
export const processStatusPath = (rawPath: Partial<StatusPath>): StatusPath => {
  const nodes = rawPath.nodes || [];

  // 计算每个节点的状态和是否异常
  const processedNodes: StatusNode[] = nodes.map((node, index) => ({
    ...node,
    nodeStatus: calculateNodeStatus(node, index, nodes),
    isAlert: calculateIsAlert(node)
  }));

  // 按时间排序
  processedNodes.sort((a, b) =>
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // 计算整体路径状态
  const overallStatus = calculatePathStatus({
    ...rawPath,
    nodes: processedNodes
  });

  // 计算开始和完成时间
  const startedAt = processedNodes.length > 0 ? new Date(processedNodes[0].timestamp) : null;
  const completedAt =
    processedNodes.length > 0 && processedNodes[processedNodes.length - 1].status === StandardStatus.COMPLETED
      ? new Date(processedNodes[processedNodes.length - 1].timestamp)
      : null;

  return {
    nodes: processedNodes,
    overallStatus,
    eta: rawPath.eta || null,
    startedAt,
    completedAt
  };
};

/**
 * 计算节点间延误天数
 */
export const calculateDelayDays = (prevNode: StatusNode, currNode: StatusNode): number => {
  const prevTime = new Date(prevNode.timestamp);
  const currTime = new Date(currNode.timestamp);
  const diffHours = (currTime.getTime() - prevTime.getTime()) / (1000 * 60 * 60);

  // 默认超过24小时算延误（可根据业务规则调整）
  const THRESHOLD_HOURS = 24;

  return diffHours > THRESHOLD_HOURS ? Math.ceil((diffHours - THRESHOLD_HOURS) / 24) : 0;
};

/**
 * 获取路径进度百分比
 */
export const getPathProgress = (path: StatusPath): number => {
  if (path.nodes.length === 0) return 0;

  const completedNodes = path.nodes.filter(n => n.nodeStatus === NodeStatus.COMPLETED);
  const inProgressNode = path.nodes.find(n => n.nodeStatus === NodeStatus.IN_PROGRESS);

  let progress = (completedNodes.length / path.nodes.length) * 100;

  // 如果有进行中的节点，增加5%
  if (inProgressNode) {
    progress += 5;
  }

  return Math.min(progress, 100);
};
