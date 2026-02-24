/**
 * 路径验证工具（后端版本）
 * Path Validation Utilities (Backend Version)
 */

import {
  StatusPath,
  StatusNode,
  StandardStatus,
  NodeStatus,
  PathStatus,
  ValidationResult
} from '../types';

// 状态流转规则（与前端保持一致）
const STATUS_TRANSITIONS: Record<StandardStatus, StandardStatus[]> = {
  [StandardStatus.NOT_SHIPPED]: [
    StandardStatus.EMPTY_PICKED_UP,
    StandardStatus.GATE_IN
  ],
  [StandardStatus.EMPTY_PICKED_UP]: [
    StandardStatus.GATE_IN,
    StandardStatus.HOLD
  ],
  [StandardStatus.GATE_IN]: [
    StandardStatus.LOADED,
    StandardStatus.HOLD
  ],
  [StandardStatus.LOADED]: [
    StandardStatus.DEPARTED,
    StandardStatus.HOLD
  ],
  [StandardStatus.DEPARTED]: [
    StandardStatus.SAILING,
    StandardStatus.TRANSIT_ARRIVED,
    StandardStatus.ARRIVED,
    StandardStatus.DELAYED,
    StandardStatus.HOLD
  ],
  [StandardStatus.SAILING]: [
    StandardStatus.TRANSIT_ARRIVED,
    StandardStatus.ARRIVED,
    StandardStatus.DELAYED,
    StandardStatus.CONGESTION,
    StandardStatus.HOLD
  ],
  [StandardStatus.TRANSIT_ARRIVED]: [
    StandardStatus.TRANSIT_DEPARTED,
    StandardStatus.ARRIVED,
    StandardStatus.DELAYED,
    StandardStatus.HOLD
  ],
  [StandardStatus.TRANSIT_DEPARTED]: [
    StandardStatus.ARRIVED,
    StandardStatus.DELAYED,
    StandardStatus.HOLD
  ],
  [StandardStatus.ARRIVED]: [
    StandardStatus.DISCHARGED,
    StandardStatus.AVAILABLE,
    StandardStatus.DELAYED,
    StandardStatus.HOLD
  ],
  [StandardStatus.DISCHARGED]: [
    StandardStatus.AVAILABLE,
    StandardStatus.GATE_OUT,
    StandardStatus.CUSTOMS_HOLD,
    StandardStatus.CARRIER_HOLD,
    StandardStatus.TERMINAL_HOLD,
    StandardStatus.HOLD
  ],
  [StandardStatus.AVAILABLE]: [
    StandardStatus.GATE_OUT,
    StandardStatus.CUSTOMS_HOLD,
    StandardStatus.CARRIER_HOLD,
    StandardStatus.TERMINAL_HOLD,
    StandardStatus.CHARGES_HOLD,
    StandardStatus.DETENTION,
    StandardStatus.HOLD
  ],
  [StandardStatus.GATE_OUT]: [
    StandardStatus.DELIVERY_ARRIVED,
    StandardStatus.STRIPPED,
    StandardStatus.RETURNED_EMPTY,
    StandardStatus.DELAYED,
    StandardStatus.HOLD
  ],
  [StandardStatus.DELIVERY_ARRIVED]: [
    StandardStatus.STRIPPED,
    StandardStatus.RETURNED_EMPTY,
    StandardStatus.HOLD
  ],
  [StandardStatus.STRIPPED]: [
    StandardStatus.RETURNED_EMPTY,
    StandardStatus.COMPLETED
  ],
  [StandardStatus.RETURNED_EMPTY]: [
    StandardStatus.COMPLETED
  ],
  [StandardStatus.COMPLETED]: [],
  [StandardStatus.CUSTOMS_HOLD]: [
    StandardStatus.AVAILABLE,
    StandardStatus.GATE_OUT,
    StandardStatus.DUMPED
  ],
  [StandardStatus.CARRIER_HOLD]: [
    StandardStatus.AVAILABLE,
    StandardStatus.GATE_OUT,
    StandardStatus.DUMPED
  ],
  [StandardStatus.TERMINAL_HOLD]: [
    StandardStatus.AVAILABLE,
    StandardStatus.GATE_OUT,
    StandardStatus.DUMPED
  ],
  [StandardStatus.CHARGES_HOLD]: [
    StandardStatus.AVAILABLE,
    StandardStatus.GATE_OUT,
    StandardStatus.DUMPED
  ],
  [StandardStatus.DUMPED]: [
    StandardStatus.RETURNED_EMPTY,
    StandardStatus.COMPLETED
  ],
  [StandardStatus.DELAYED]: [
    StandardStatus.ARRIVED,
    StandardStatus.DISCHARGED,
    StandardStatus.AVAILABLE,
    StandardStatus.GATE_OUT
  ],
  [StandardStatus.DETENTION]: [
    StandardStatus.GATE_OUT,
    StandardStatus.RETURNED_EMPTY
  ],
  [StandardStatus.OVERDUE]: [
    StandardStatus.RETURNED_EMPTY,
    StandardStatus.COMPLETED
  ],
  [StandardStatus.CONGESTION]: [
    StandardStatus.ARRIVED,
    StandardStatus.DELAYED
  ],
  [StandardStatus.HOLD]: [
    StandardStatus.LOADED,
    StandardStatus.DEPARTED,
    StandardStatus.ARRIVED,
    StandardStatus.AVAILABLE,
    StandardStatus.GATE_OUT,
    StandardStatus.DUMPED
  ],
  [StandardStatus.UNKNOWN]: [
    StandardStatus.NOT_SHIPPED,
    StandardStatus.EMPTY_PICKED_UP,
    StandardStatus.GATE_IN,
    StandardStatus.LOADED,
    StandardStatus.DEPARTED
  ]
};

/**
 * 验证状态转换是否合法
 */
export const isValidTransition = (
  fromStatus: StandardStatus,
  toStatus: StandardStatus
): boolean => {
  const validTargets = STATUS_TRANSITIONS[fromStatus] || [];
  return validTargets.includes(toStatus);
};

/**
 * 计算节点状态
 */
export const calculateNodeStatus = (
  node: StatusNode,
  index: number,
  nodes: StatusNode[]
): NodeStatus => {
  const now = new Date();
  const nodeTime = new Date(node.timestamp);

  if (index < nodes.length - 1) {
    const nextNode = nodes[index + 1];
    if (nextNode.nodeStatus === NodeStatus.COMPLETED) {
      return NodeStatus.COMPLETED;
    }
  }

  if (index === nodes.length - 1) {
    if (nodeTime <= now) {
      return NodeStatus.COMPLETED;
    }
    if (nodeTime <= new Date(now.getTime() + 24 * 60 * 60 * 1000)) {
      return NodeStatus.IN_PROGRESS;
    }
    return NodeStatus.PENDING;
  }

  if (nodeTime <= now) {
    return NodeStatus.COMPLETED;
  }

  if (nodeTime <= new Date(now.getTime() + 24 * 60 * 60 * 1000)) {
    return NodeStatus.IN_PROGRESS;
  }

  return NodeStatus.PENDING;
};

/**
 * 计算节点是否异常
 */
const ALERT_STATUSES = [
  StandardStatus.CUSTOMS_HOLD,
  StandardStatus.CARRIER_HOLD,
  StandardStatus.TERMINAL_HOLD,
  StandardStatus.CHARGES_HOLD,
  StandardStatus.DUMPED,
  StandardStatus.DELAYED,
  StandardStatus.DETENTION,
  StandardStatus.OVERDUE,
  StandardStatus.CONGESTION
];

export const calculateIsAlert = (status: StandardStatus): boolean => {
  return ALERT_STATUSES.includes(status);
};

/**
 * 计算路径整体状态
 */
export const calculatePathStatus = (path: StatusPath): PathStatus => {
  const nodes = path.nodes;

  if (nodes.length === 0) {
    return PathStatus.ON_TIME;
  }

  const lastNode = nodes[nodes.length - 1];
  if (lastNode.status === StandardStatus.COMPLETED) {
    return PathStatus.COMPLETED;
  }

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

  return PathStatus.ON_TIME;
};

/**
 * 验证物流路径
 */
export const validateStatusPath = (path: StatusPath): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const nodes = path.nodes;

  if (nodes.length === 0) {
    errors.push('路径中没有任何状态节点');
    return { isValid: false, errors, warnings };
  }

  // 检查节点时间顺序
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

  // 检查重复状态
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
 * 完整处理物流路径
 */
export const processStatusPath = (rawPath: Partial<StatusPath>): StatusPath => {
  const nodes = rawPath.nodes || [];

  const processedNodes: StatusNode[] = nodes.map((node, index) => ({
    ...node,
    nodeStatus: calculateNodeStatus(node, index, nodes),
    isAlert: calculateIsAlert(node.status)
  }));

  processedNodes.sort((a, b) =>
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const overallStatus = calculatePathStatus({
    ...rawPath,
    nodes: processedNodes
  });

  const startedAt = processedNodes.length > 0 ? new Date(processedNodes[0].timestamp) : null;
  const completedAt =
    processedNodes.length > 0 &&
    processedNodes[processedNodes.length - 1].status === StandardStatus.COMPLETED
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

  if (inProgressNode) {
    progress += 5;
  }

  return Math.min(progress, 100);
};
