/**
 * 共享类型定义
 * Shared Type Definitions
 */

// 标准化状态枚举
export enum StandardStatus {
  NOT_SHIPPED = 'NOT_SHIPPED',
  EMPTY_PICKED_UP = 'EMPTY_PICKED_UP',
  GATE_IN = 'GATE_IN',
  LOADED = 'LOADED',
  DEPARTED = 'DEPARTED',
  SAILING = 'SAILING',
  TRANSIT_ARRIVED = 'TRANSIT_ARRIVED',
  TRANSIT_BERTHED = 'TRANSIT_BERTHED',
  TRANSIT_DISCHARGED = 'TRANSIT_DISCHARGED',
  TRANSIT_LOADED = 'TRANSIT_LOADED',
  TRANSIT_DEPARTED = 'TRANSIT_DEPARTED',
  RAIL_LOADED = 'RAIL_LOADED',
  RAIL_DEPARTED = 'RAIL_DEPARTED',
  RAIL_ARRIVED = 'RAIL_ARRIVED',
  RAIL_DISCHARGED = 'RAIL_DISCHARGED',
  FEEDER_LOADED = 'FEEDER_LOADED',
  FEEDER_DEPARTED = 'FEEDER_DEPARTED',
  FEEDER_ARRIVED = 'FEEDER_ARRIVED',
  FEEDER_DISCHARGED = 'FEEDER_DISCHARGED',
  BERTHED = 'BERTHED',
  ARRIVED = 'ARRIVED',
  DISCHARGED = 'DISCHARGED',
  AVAILABLE = 'AVAILABLE',
  IN_TRANSIT_TO_DEST = 'IN_TRANSIT_TO_DEST',
  CONTAINER_STUFFED = 'CONTAINER_STUFFED',
  GATE_OUT = 'GATE_OUT',
  DELIVERY_ARRIVED = 'DELIVERY_ARRIVED',
  STRIPPED = 'STRIPPED',
  RETURNED_EMPTY = 'RETURNED_EMPTY',
  COMPLETED = 'COMPLETED',
  CUSTOMS_HOLD = 'CUSTOMS_HOLD',
  CARRIER_HOLD = 'CARRIER_HOLD',
  TERMINAL_HOLD = 'TERMINAL_HOLD',
  CHARGES_HOLD = 'CHARGES_HOLD',
  DUMPED = 'DUMPED',
  DELAYED = 'DELAYED',
  DETENTION = 'DETENTION',
  OVERDUE = 'OVERDUE',
  CONGESTION = 'CONGESTION',
  HOLD = 'HOLD',
  UNKNOWN = 'UNKNOWN'
}

// 节点状态枚举
export enum NodeStatus {
  COMPLETED = 'COMPLETED',
  IN_PROGRESS = 'IN_PROGRESS',
  PENDING = 'PENDING'
}

// 路径状态枚举
export enum PathStatus {
  ON_TIME = 'ON_TIME',
  DELAYED = 'DELAYED',
  HOLD = 'HOLD',
  COMPLETED = 'COMPLETED'
}

// 地理位置类型
export enum LocationType {
  PORT = 'PORT',
  TERMINAL = 'TERMINAL',
  WAREHOUSE = 'WAREHOUSE',
  CUSTOMS = 'CUSTOMS'
}

// 地理位置接口
export interface Location {
  id: string;
  name: string;
  code: string;
  type: LocationType;
  country?: string;
  latitude?: number;
  longitude?: number;
}

// 状态节点接口
export interface StatusNode {
  id: string;
  status: StandardStatus;
  description: string;
  timestamp: Date;
  location?: Location;
  nodeStatus: NodeStatus;
  isAlert: boolean;
  rawData?: any;
}

// 物流状态路径接口
export interface StatusPath {
  id: string;
  containerNumber: string;
  nodes: StatusNode[];
  overallStatus: PathStatus;
  eta?: Date;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  lastFreeDate?: Date;
  isOverdue?: boolean;
  isMock?: boolean;
}

// 状态事件接口
export interface StatusEvent {
  id: string;
  containerNumber: string;
  eventCode: string;
  eventName: string;
  eventTime: Date;
  location?: Location;
  vessel?: {
    name: string;
    voyageNumber: string;
  };
  remarks?: string;
  rawData?: any;
  createdAt: Date;
}

// 验证结果接口
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// 同步结果接口
export interface SyncResult {
  containerNumber: string;
  success: boolean;
  message?: string;
  pathId?: string;
}

// 批量同步结果接口
export interface BatchSyncResult {
  successCount: number;
  failureCount: number;
  results: SyncResult[];
}
