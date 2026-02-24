/**
 * 物流状态类型定义
 * Logistics Status Types
 */

// 标准化状态枚举
export enum StandardStatus {
  // 初始/计划状态
  NOT_SHIPPED = 'NOT_SHIPPED',
  PLANNED = 'PLANNED',

  // 起运地操作
  EMPTY_PICKED_UP = 'EMPTY_PICKED_UP',
  CONTAINER_STUFFED = 'CONTAINER_STUFFED',
  GATE_IN = 'GATE_IN',

  // 铁路运输
  RAIL_LOADED = 'RAIL_LOADED',
  RAIL_DEPARTED = 'RAIL_DEPARTED',
  RAIL_ARRIVED = 'RAIL_ARRIVED',
  RAIL_DISCHARGED = 'RAIL_DISCHARGED',

  // 驳船运输
  FEEDER_LOADED = 'FEEDER_LOADED',
  FEEDER_DEPARTED = 'FEEDER_DEPARTED',
  FEEDER_ARRIVED = 'FEEDER_ARRIVED',
  FEEDER_DISCHARGED = 'FEEDER_DISCHARGED',

  // 海运
  LOADED = 'LOADED',
  DEPARTED = 'DEPARTED',
  SAILING = 'SAILING',

  // 中转
  TRANSIT_ARRIVED = 'TRANSIT_ARRIVED',
  TRANSIT_BERTHED = 'TRANSIT_BERTHED',
  TRANSIT_DISCHARGED = 'TRANSIT_DISCHARGED',
  TRANSIT_LOADED = 'TRANSIT_LOADED',
  TRANSIT_DEPARTED = 'TRANSIT_DEPARTED',

  // 到港
  ARRIVED = 'ARRIVED',
  BERTHED = 'BERTHED',
  DISCHARGED = 'DISCHARGED',
  AVAILABLE = 'AVAILABLE',

  // 提柜/陆运
  IN_TRANSIT_TO_DEST = 'IN_TRANSIT_TO_DEST',
  GATE_OUT = 'GATE_OUT',
  DELIVERY_ARRIVED = 'DELIVERY_ARRIVED',
  STRIPPED = 'STRIPPED',

  // 还空箱
  RETURNED_EMPTY = 'RETURNED_EMPTY',

  // 完成状态
  COMPLETED = 'COMPLETED',

  // 扣留/滞留状态
  CUSTOMS_HOLD = 'CUSTOMS_HOLD',
  CARRIER_HOLD = 'CARRIER_HOLD',
  TERMINAL_HOLD = 'TERMINAL_HOLD',
  CHARGES_HOLD = 'CHARGES_HOLD',
  HOLD = 'HOLD',

  // 异常状态
  DUMPED = 'DUMPED',

  // 预警状态
  DELAYED = 'DELAYED',
  DETENTION = 'DETENTION',
  OVERDUE = 'OVERDUE',
  CONGESTION = 'CONGESTION',

  // 未知状态
  UNKNOWN = 'UNKNOWN'
}

// 节点状态枚举
export enum NodeStatus {
  COMPLETED = 'COMPLETED',      // 已完成
  IN_PROGRESS = 'IN_PROGRESS',  // 进行中
  PENDING = 'PENDING'           // 未开始
}

// 路径状态枚举
export enum PathStatus {
  ON_TIME = 'ON_TIME',    // 准点
  DELAYED = 'DELAYED',    // 延误
  HOLD = 'HOLD',          // 扣留
  COMPLETED = 'COMPLETED' // 已完成
}

// 地理位置信息
export interface Location {
  id: string;
  name: string;
  code: string;
  type: 'PORT' | 'TERMINAL' | 'WAREHOUSE' | 'CUSTOMS' | 'RAIL' | 'FEEDER'; //
  country?: string;
  latitude?: number;
  longitude?: number;
}

// 状态节点
export interface StatusNode {
  id: string;
  status: StandardStatus;
  description: string;
  timestamp: Date;
  location: Location | null;
  nodeStatus: NodeStatus;
  isAlert: boolean;
  rawData: Record<string, any>;
}

// 物流状态路径
export interface StatusPath {
  nodes: StatusNode[];
  overallStatus: PathStatus;
  eta: Date | null;
  startedAt: Date | null;
  completedAt: Date | null;
}
