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
    StandardStatus.CONTAINER_STUFFED,
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
    StandardStatus.TRANSIT_BERTHED,
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
    StandardStatus.DELIVERY_ARRIVED,
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
  [StandardStatus.IN_TRANSIT_TO_DEST]: [
    StandardStatus.GATE_OUT,
    StandardStatus.DELIVERY_ARRIVED,
    StandardStatus.STRIPPED,
    StandardStatus.RETURNED_EMPTY,
    StandardStatus.HOLD
  ],
  [StandardStatus.CONTAINER_STUFFED]: [
    StandardStatus.GATE_IN,
    StandardStatus.LOADED,
    StandardStatus.HOLD
  ],
  [StandardStatus.TRANSIT_BERTHED]: [
    StandardStatus.TRANSIT_DISCHARGED,
    StandardStatus.TRANSIT_DEPARTED,
    StandardStatus.ARRIVED,
    StandardStatus.HOLD
  ],
  [StandardStatus.TRANSIT_DISCHARGED]: [
    StandardStatus.TRANSIT_LOADED,
    StandardStatus.TRANSIT_DEPARTED,
    StandardStatus.ARRIVED,
    StandardStatus.HOLD
  ],
  [StandardStatus.TRANSIT_LOADED]: [
    StandardStatus.TRANSIT_DEPARTED,
    StandardStatus.ARRIVED,
    StandardStatus.HOLD
  ],
  [StandardStatus.RAIL_LOADED]: [StandardStatus.RAIL_DEPARTED, StandardStatus.HOLD],
  [StandardStatus.RAIL_DEPARTED]: [StandardStatus.RAIL_ARRIVED, StandardStatus.HOLD],
  [StandardStatus.RAIL_ARRIVED]: [StandardStatus.RAIL_DISCHARGED, StandardStatus.HOLD],
  [StandardStatus.RAIL_DISCHARGED]: [StandardStatus.GATE_OUT, StandardStatus.HOLD],
  [StandardStatus.FEEDER_LOADED]: [StandardStatus.FEEDER_DEPARTED, StandardStatus.HOLD],
  [StandardStatus.FEEDER_DEPARTED]: [StandardStatus.FEEDER_ARRIVED, StandardStatus.HOLD],
  [StandardStatus.FEEDER_ARRIVED]: [StandardStatus.FEEDER_DISCHARGED, StandardStatus.HOLD],
  [StandardStatus.FEEDER_DISCHARGED]: [StandardStatus.GATE_OUT, StandardStatus.HOLD],
  [StandardStatus.BERTHED]: [
    StandardStatus.DISCHARGED,
    StandardStatus.AVAILABLE,
    StandardStatus.HOLD
  ],
  [StandardStatus.UNKNOWN]: [
    StandardStatus.NOT_SHIPPED,
    StandardStatus.EMPTY_PICKED_UP,
    StandardStatus.GATE_IN,
    StandardStatus.LOADED,
    StandardStatus.DEPARTED
  ]
};

/** 状态到阶段顺序的映射（与 statusPathFromDb FULL_PATH_TEMPLATE 一致，用于排序时保持逻辑顺序） */
const STATUS_TO_STAGE_ORDER: Record<string, number> = {
  [StandardStatus.NOT_SHIPPED]: 1,
  [StandardStatus.EMPTY_PICKED_UP]: 2,
  [StandardStatus.GATE_IN]: 3,
  [StandardStatus.CONTAINER_STUFFED]: 3,
  [StandardStatus.LOADED]: 4,
  [StandardStatus.RAIL_LOADED]: 4,
  [StandardStatus.FEEDER_LOADED]: 4,
  [StandardStatus.DEPARTED]: 5,
  [StandardStatus.RAIL_DEPARTED]: 5,
  [StandardStatus.FEEDER_DEPARTED]: 5,
  [StandardStatus.SAILING]: 6,
  [StandardStatus.TRANSIT_ARRIVED]: 6,
  [StandardStatus.TRANSIT_BERTHED]: 6,
  [StandardStatus.TRANSIT_DISCHARGED]: 6,
  [StandardStatus.TRANSIT_LOADED]: 6,
  [StandardStatus.TRANSIT_DEPARTED]: 6,
  [StandardStatus.FEEDER_ARRIVED]: 6,
  [StandardStatus.FEEDER_DISCHARGED]: 6,
  [StandardStatus.RAIL_ARRIVED]: 6,
  [StandardStatus.RAIL_DISCHARGED]: 6,
  [StandardStatus.ARRIVED]: 7,
  [StandardStatus.BERTHED]: 7,
  [StandardStatus.DISCHARGED]: 8,
  [StandardStatus.AVAILABLE]: 9,
  [StandardStatus.GATE_OUT]: 10,
  [StandardStatus.IN_TRANSIT_TO_DEST]: 10,
  [StandardStatus.DELIVERY_ARRIVED]: 10,
  [StandardStatus.STRIPPED]: 10,
  [StandardStatus.RETURNED_EMPTY]: 11,
  [StandardStatus.COMPLETED]: 11
};

function getNodeStageOrder(node: StatusNode): number {
  const fromRaw = (node.rawData as { stageOrder?: number })?.stageOrder;
  if (typeof fromRaw === 'number') return fromRaw;
  return STATUS_TO_STAGE_ORDER[node.status] ?? 99;
}

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
 * 统一标准：节点状态（扣留/超期等）或 节点间时间延误 任一存在即标记为延误
 */
export const calculatePathStatus = (path: { nodes: StatusNode[] }): PathStatus => {
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

  // 统一标准：节点间时间延误（超过 24h 即算延误）也计入整体状态
  for (let i = 1; i < nodes.length; i++) {
    const delayDays = calculateDelayDays(nodes[i - 1], nodes[i]);
    if (delayDays > 0) {
      return PathStatus.DELAYED;
    }
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

  const processedNodes: StatusNode[] = nodes.map((node, index) => {
    const noData = (node.rawData as { noData?: boolean })?.noData;
    return {
      ...node,
      nodeStatus: noData ? NodeStatus.PENDING : calculateNodeStatus(node, index, nodes),
      isAlert: noData ? false : calculateIsAlert(node.status)
    };
  });

  // 按阶段顺序优先、时间戳次之排序，避免「已提柜」排在「未出运 缺数据」前面（缺数据占位节点时间戳为 now）
  processedNodes.sort((a, b) => {
    const orderA = getNodeStageOrder(a);
    const orderB = getNodeStageOrder(b);
    if (orderA !== orderB) return orderA - orderB;
    return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
  });

  const overallStatus = calculatePathStatus({
    ...rawPath,
    nodes: processedNodes
  });

  const startedAt = processedNodes.length > 0 ? new Date(processedNodes[0].timestamp) : undefined;
  const completedAt =
    processedNodes.length > 0 &&
    processedNodes[processedNodes.length - 1].status === StandardStatus.COMPLETED
      ? new Date(processedNodes[processedNodes.length - 1].timestamp)
      : undefined;

  return {
    nodes: processedNodes,
    overallStatus,
    eta: rawPath.eta ?? undefined,
    startedAt,
    completedAt
  } as StatusPath;
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
