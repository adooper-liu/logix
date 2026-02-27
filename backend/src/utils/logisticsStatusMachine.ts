/**
 * 物流状态机工具模块
 * Logistics Status Machine Utilities
 *
 * 统一前后端状态映射，支持外部API详细状态映射到简化状态
 * Unified state mapping for frontend and backend, mapping detailed API statuses to simplified statuses
 */

import { Container } from '../entities/Container';
import { PortOperation } from '../entities/PortOperation';
import { SeaFreight } from '../entities/SeaFreight';
import { TruckingTransport } from '../entities/TruckingTransport';
import { WarehouseOperation } from '../entities/WarehouseOperation';
import { EmptyReturn } from '../entities/EmptyReturn';

// ============================================================================
// 1. 简化状态枚举（7层流转 - 用于桑基图和前端展示）
// ============================================================================

/**
 * 简化物流状态枚举
 * Simplified Logistics Status Enum (7-layer flow)
 */
export enum SimplifiedStatus {
  NOT_SHIPPED = 'not_shipped',      // 未出运
  SHIPPED = 'shipped',              // 已出运/已装船
  IN_TRANSIT = 'in_transit',        // 在途
  AT_PORT = 'at_port',              // 已到港（中转港或目的港）
  PICKED_UP = 'picked_up',          // 已提柜
  UNLOADED = 'unloaded',            // 已卸柜
  RETURNED_EMPTY = 'returned_empty'  // 已还箱
}

/**
 * 简化状态中文映射
 * Simplified Status Chinese Mapping
 */
export const SimplifiedStatusText: Record<SimplifiedStatus, string> = {
  [SimplifiedStatus.NOT_SHIPPED]: '未出运',
  [SimplifiedStatus.SHIPPED]: '已出运',
  [SimplifiedStatus.IN_TRANSIT]: '在途',
  [SimplifiedStatus.AT_PORT]: '已到港',
  [SimplifiedStatus.PICKED_UP]: '已提柜',
  [SimplifiedStatus.UNLOADED]: '已卸柜',
  [SimplifiedStatus.RETURNED_EMPTY]: '已还箱'
};

/**
 * 简化状态类型映射（用于前端样式）
 * Simplified Status Type Mapping (for frontend styling)
 */
export const SimplifiedStatusType: Record<SimplifiedStatus, string> = {
  [SimplifiedStatus.NOT_SHIPPED]: 'info',
  [SimplifiedStatus.SHIPPED]: 'primary',
  [SimplifiedStatus.IN_TRANSIT]: 'success',
  [SimplifiedStatus.AT_PORT]: 'warning',
  [SimplifiedStatus.PICKED_UP]: 'warning',
  [SimplifiedStatus.UNLOADED]: 'warning',
  [SimplifiedStatus.RETURNED_EMPTY]: 'success'
};

// ============================================================================
// 2. 详细状态枚举（33种状态 - 用于外部API集成）
// ============================================================================

/**
 * 详细物流状态枚举（来自 logistics-path-system 微服务）
 * Detailed Logistics Status Enum (from logistics-path-system microservice)
 */
export enum DetailedStatus {
  // 基础流转状态
  NOT_SHIPPED = 'NOT_SHIPPED',
  EMPTY_PICKED_UP = 'EMPTY_PICKED_UP',
  GATE_IN = 'GATE_IN',
  LOADED = 'LOADED',
  DEPARTED = 'DEPARTED',
  SAILING = 'SAILING',
  TRANSIT_ARRIVED = 'TRANSIT_ARRIVED',
  TRANSIT_DEPARTED = 'TRANSIT_DEPARTED',
  ARRIVED = 'ARRIVED',
  DISCHARGED = 'DISCHARGED',
  AVAILABLE = 'AVAILABLE',
  GATE_OUT = 'GATE_OUT',
  DELIVERY_ARRIVED = 'DELIVERY_ARRIVED',
  STRIPPED = 'STRIPPED',
  RETURNED_EMPTY = 'RETURNED_EMPTY',
  COMPLETED = 'COMPLETED',

  // 异常状态
  CUSTOMS_HOLD = 'CUSTOMS_HOLD',
  CARRIER_HOLD = 'CARRIER_HOLD',
  TERMINAL_HOLD = 'TERMINAL_HOLD',
  CHARGES_HOLD = 'CHARGES_HOLD',
  DUMPED = 'DUMPED',
  DELAYED = 'DELAYED',
  DETENTION = 'DETENTION',
  OVERDUE = 'OVERDUE',
  CONGESTION = 'CONGESTION',

  // 通用状态
  HOLD = 'HOLD',
  UNKNOWN = 'UNKNOWN'
}

// ============================================================================
// 3. 详细状态到简化状态的映射
// ============================================================================

/**
 * 详细状态映射到简化状态
 * Map detailed statuses to simplified statuses
 */
export const DetailedToSimplifiedMap: Record<DetailedStatus, SimplifiedStatus> = {
  // 未出运
  [DetailedStatus.NOT_SHIPPED]: SimplifiedStatus.NOT_SHIPPED,
  [DetailedStatus.UNKNOWN]: SimplifiedStatus.NOT_SHIPPED,

  // 已出运/已装船
  [DetailedStatus.EMPTY_PICKED_UP]: SimplifiedStatus.SHIPPED,
  [DetailedStatus.GATE_IN]: SimplifiedStatus.SHIPPED,
  [DetailedStatus.LOADED]: SimplifiedStatus.SHIPPED,
  [DetailedStatus.DEPARTED]: SimplifiedStatus.SHIPPED,

  // 在途
  [DetailedStatus.SAILING]: SimplifiedStatus.IN_TRANSIT,
  [DetailedStatus.TRANSIT_DEPARTED]: SimplifiedStatus.IN_TRANSIT,
  [DetailedStatus.CONGESTION]: SimplifiedStatus.IN_TRANSIT, // 拥堵仍视为在途

  // 已到港
  [DetailedStatus.TRANSIT_ARRIVED]: SimplifiedStatus.AT_PORT,
  [DetailedStatus.ARRIVED]: SimplifiedStatus.AT_PORT,
  [DetailedStatus.DISCHARGED]: SimplifiedStatus.AT_PORT,
  [DetailedStatus.AVAILABLE]: SimplifiedStatus.AT_PORT,

  // 已提柜
  [DetailedStatus.GATE_OUT]: SimplifiedStatus.PICKED_UP,
  [DetailedStatus.DELIVERY_ARRIVED]: SimplifiedStatus.PICKED_UP,

  // 已卸柜
  [DetailedStatus.STRIPPED]: SimplifiedStatus.UNLOADED,

  // 已还箱
  [DetailedStatus.RETURNED_EMPTY]: SimplifiedStatus.RETURNED_EMPTY,
  [DetailedStatus.COMPLETED]: SimplifiedStatus.RETURNED_EMPTY,

  // 异常状态映射
  [DetailedStatus.CUSTOMS_HOLD]: SimplifiedStatus.AT_PORT,       // 清关扣货视为在港
  [DetailedStatus.CARRIER_HOLD]: SimplifiedStatus.AT_PORT,       // 承运人扣货视为在港
  [DetailedStatus.TERMINAL_HOLD]: SimplifiedStatus.AT_PORT,     // 码头扣货视为在港
  [DetailedStatus.CHARGES_HOLD]: SimplifiedStatus.AT_PORT,       // 费用扣货视为在港
  [DetailedStatus.DUMPED]: SimplifiedStatus.AT_PORT,             // 倒箱视为在港
  [DetailedStatus.DELAYED]: SimplifiedStatus.AT_PORT,           // 延误可能在港或途中，优先在港
  [DetailedStatus.DETENTION]: SimplifiedStatus.AT_PORT,         // 滞港费视为在港
  [DetailedStatus.OVERDUE]: SimplifiedStatus.RETURNED_EMPTY,    // 逾期可能已还箱
  [DetailedStatus.HOLD]: SimplifiedStatus.AT_PORT               // 通用扣货视为在港
};

// ============================================================================
// 4. Excel 中文状态到简化状态的映射
// ============================================================================

/**
 * Excel 中文状态映射到简化状态
 * Map Excel Chinese statuses to simplified statuses
 */
export const ExcelStatusToSimplifiedMap: Record<string, SimplifiedStatus> = {
  '未出运': SimplifiedStatus.NOT_SHIPPED,
  '已出运': SimplifiedStatus.SHIPPED,
  '已装船': SimplifiedStatus.SHIPPED,
  '在途': SimplifiedStatus.IN_TRANSIT,
  '已到港': SimplifiedStatus.AT_PORT,
  '已到中转港': SimplifiedStatus.AT_PORT,
  '到达目的港': SimplifiedStatus.AT_PORT,
  '已提柜': SimplifiedStatus.PICKED_UP,
  '已卸柜': SimplifiedStatus.UNLOADED,
  '已还箱': SimplifiedStatus.RETURNED_EMPTY,
  '已取消': SimplifiedStatus.NOT_SHIPPED // 取消视为未出运
};

// ============================================================================
// 5. 外部API状态代码映射（飞驼等）
// ============================================================================

/**
 * 外部API状态代码到详细状态的映射（示例）
 * Map external API status codes to detailed statuses (example for FeiTuo)
 */
export const ExternalApiToDetailedMap: Record<string, DetailedStatus> = {
  // 飞驼API状态代码映射
  'BO': DetailedStatus.LOADED,           // 装船
  'DLPT': DetailedStatus.SAILING,        // 航行
  'ARRIVE': DetailedStatus.ARRIVED,       // 到达
  'ATA': DetailedStatus.ARRIVED,          // 实际到港
  'ETA': DetailedStatus.IN_TRANSIT,       // 预计到港
  'GATE_IN': DetailedStatus.GATE_IN,      // 进闸
  'GATE_OUT': DetailedStatus.GATE_OUT,    // 出闸
  'DISCHARGED': DetailedStatus.DISCHARGED,// 卸货
  'AVAIL': DetailedStatus.AVAILABLE,     // 可提货
  'EMPTY_RETURN': DetailedStatus.RETURNED_EMPTY, // 还空箱
  'HOLD': DetailedStatus.HOLD,           // 扣货
  'CUSTOMS_HOLD': DetailedStatus.CUSTOMS_HOLD,  // 清关扣货
  'CARRIER_HOLD': DetailedStatus.CARRIER_HOLD,  // 承运人扣货
  'TERMINAL_HOLD': DetailedStatus.TERMINAL_HOLD // 码头扣货
};

// ============================================================================
// 6. 状态流转规则（简化版）
// ============================================================================

/**
 * 简化状态的合法流转规则
 * Valid transition rules for simplified statuses
 */
export const SimplifiedStatusTransitions: Record<SimplifiedStatus, SimplifiedStatus[]> = {
  [SimplifiedStatus.NOT_SHIPPED]: [
    SimplifiedStatus.SHIPPED
  ],
  [SimplifiedStatus.SHIPPED]: [
    SimplifiedStatus.IN_TRANSIT,
    SimplifiedStatus.AT_PORT,
    SimplifiedStatus.PICKED_UP // 支持跳转：直接提柜
  ],
  [SimplifiedStatus.IN_TRANSIT]: [
    SimplifiedStatus.AT_PORT,
    SimplifiedStatus.PICKED_UP // 支持跳转
  ],
  [SimplifiedStatus.AT_PORT]: [
    SimplifiedStatus.PICKED_UP,
    SimplifiedStatus.UNLOADED // 支持跳转：直接卸柜
  ],
  [SimplifiedStatus.PICKED_UP]: [
    SimplifiedStatus.UNLOADED,
    SimplifiedStatus.RETURNED_EMPTY // 支持跳转：直接还箱
  ],
  [SimplifiedStatus.UNLOADED]: [
    SimplifiedStatus.RETURNED_EMPTY
  ],
  [SimplifiedStatus.RETURNED_EMPTY]: []
};

/**
 * 验证状态流转是否合法
 * Validate if a status transition is valid
 */
export const isValidSimplifiedTransition = (
  fromStatus: SimplifiedStatus,
  toStatus: SimplifiedStatus
): boolean => {
  const validTargets = SimplifiedStatusTransitions[fromStatus] || [];
  return validTargets.includes(toStatus);
};

// ============================================================================
// 7. 基于数据的自动状态计算（核心逻辑）
// ============================================================================

/**
 * 基于货柜相关数据自动计算物流状态
 * Calculate logistics status automatically based on container data
 *
 * 优先级顺序（从高到低）:
 * 1. 还空箱日期 → returned_empty
 * 2. 仓库卸柜日期 → unloaded
 * 3. 拖车提柜日期 → picked_up
 * 4. 目的港实际到港 → at_port
 * 5. 中转港到达日期 → at_port
 * 6. 有目的港记录（无到达时间）→ in_transit
 * 7. 有中转港记录（无到达时间）→ shipped
 * 8. 有出运日期 → shipped
 * 9. 默认 → not_shipped
 */
export const calculateLogisticsStatus = (
  container: Container,
  portOperations: PortOperation[],
  seaFreight?: SeaFreight,
  truckingTransport?: TruckingTransport,
  warehouseOperation?: WarehouseOperation,
  emptyReturn?: EmptyReturn
): {
  status: SimplifiedStatus;
  currentPortType: 'origin' | 'transit' | 'destination' | null;
  latestPortOperation: PortOperation | null;
} => {
  // 分类港口操作记录
  const transitPorts = portOperations.filter(po => po.portType === 'transit');
  const destPorts = portOperations.filter(po => po.portType === 'destination');

  let status = SimplifiedStatus.NOT_SHIPPED;
  let currentPortType: 'origin' | 'transit' | 'destination' | null = null;
  let latestPortOperation: PortOperation | null = null;

  // 优先级1: 还空箱日期（最高优先级）
  if (emptyReturn?.returnTime) {
    status = SimplifiedStatus.RETURNED_EMPTY;
    return { status, currentPortType, latestPortOperation };
  }

  // 优先级2: 仓库卸柜日期
  if (warehouseOperation?.unloadDate) {
    status = SimplifiedStatus.UNLOADED;
    return { status, currentPortType, latestPortOperation };
  }

  // 优先级3: 拖车提柜日期
  if (truckingTransport?.pickupDate) {
    status = SimplifiedStatus.PICKED_UP;
    return { status, currentPortType, latestPortOperation };
  }

  // 优先级4: 目的港有实际到港时间
  const destWithArrival = destPorts.find(po => po.ataDestPort);
  if (destWithArrival) {
    status = SimplifiedStatus.AT_PORT;
    currentPortType = 'destination';
    latestPortOperation = destWithArrival;
    return { status, currentPortType, latestPortOperation };
  }

  // 优先级5: 中转港有到达时间
  const transitWithArrival = transitPorts.find(po => po.transitArrivalDate);
  if (transitWithArrival) {
    status = SimplifiedStatus.AT_PORT;
    currentPortType = 'transit';
    latestPortOperation = transitWithArrival;
    return { status, currentPortType, latestPortOperation };
  }

  // 优先级6: 有目的港记录（无到达时间）→ 在途
  if (destPorts.length > 0) {
    status = SimplifiedStatus.IN_TRANSIT;
    currentPortType = 'destination';
    latestPortOperation = destPorts[0];
    return { status, currentPortType, latestPortOperation };
  }

  // 优先级7: 有中转港记录（无到达时间）→ 已出运
  if (transitPorts.length > 0) {
    status = SimplifiedStatus.SHIPPED;
    currentPortType = 'transit';
    latestPortOperation = transitPorts[0];
    return { status, currentPortType, latestPortOperation };
  }

  // 优先级8: 有出运日期
  if (seaFreight?.shipmentDate || container.order?.actualShipDate) {
    status = SimplifiedStatus.SHIPPED;
    return { status, currentPortType, latestPortOperation };
  }

  // 优先级9: 默认状态
  status = SimplifiedStatus.NOT_SHIPPED;
  return { status, currentPortType, latestPortOperation };
};

// ============================================================================
// 8. 外部API状态到简化状态的转换
// ============================================================================

/**
 * 将外部API状态代码转换为简化状态
 * Convert external API status code to simplified status
 *
 * @param externalStatusCode 外部API状态代码（如飞驼的 'DLPT'）
 * @param fallbackStatus 回退状态（当无法映射时使用）
 * @returns 简化状态
 */
export const mapExternalStatusToSimplified = (
  externalStatusCode: string,
  fallbackStatus: SimplifiedStatus = SimplifiedStatus.NOT_SHIPPED
): SimplifiedStatus => {
  // 1. 映射到详细状态
  const detailedStatus = ExternalApiToDetailedMap[externalStatusCode];
  if (!detailedStatus) {
    return fallbackStatus;
  }

  // 2. 映射到简化状态
  return DetailedToSimplifiedMap[detailedStatus] || fallbackStatus;
};

/**
 * 批量映射外部API状态代码
 * Batch map external API status codes
 */
export const batchMapExternalStatuses = (
  externalStatuses: { statusCode: string; containerNumber: string }[]
): { containerNumber: string; simplifiedStatus: SimplifiedStatus }[] => {
  return externalStatuses.map(({ statusCode, containerNumber }) => ({
    containerNumber,
    simplifiedStatus: mapExternalStatusToSimplified(statusCode)
  }));
};

// ============================================================================
// 9. 工具函数
// ============================================================================

/**
 * 获取简化状态的中文显示文本
 * Get Chinese display text for simplified status
 */
export const getSimplifiedStatusText = (status: SimplifiedStatus | string): string => {
  return SimplifiedStatusText[status as SimplifiedStatus] || status;
};

/**
 * 获取简化状态的类型标识
 * Get type identifier for simplified status (for styling)
 */
export const getSimplifiedStatusType = (status: SimplifiedStatus | string): string => {
  return SimplifiedStatusType[status as SimplifiedStatus] || 'info';
};

/**
 * 判断状态是否为异常状态
 * Check if status is an alert status
 */
export const isAlertStatus = (detailedStatus: DetailedStatus): boolean => {
  const alertStatuses = [
    DetailedStatus.CUSTOMS_HOLD,
    DetailedStatus.CARRIER_HOLD,
    DetailedStatus.TERMINAL_HOLD,
    DetailedStatus.CHARGES_HOLD,
    DetailedStatus.DUMPED,
    DetailedStatus.DELAYED,
    DetailedStatus.DETENTION,
    DetailedStatus.OVERDUE,
    DetailedStatus.CONGESTION,
    DetailedStatus.HOLD
  ];
  return alertStatuses.includes(detailedStatus);
};

/**
 * 获取所有有效的简化状态
 * Get all valid simplified statuses
 */
export const getAllSimplifiedStatuses = (): SimplifiedStatus[] => {
  return Object.values(SimplifiedStatus);
};

/**
 * 获取所有有效的详细状态
 * Get all valid detailed statuses
 */
export const getAllDetailedStatuses = (): DetailedStatus[] => {
  return Object.values(DetailedStatus);
};

// ============================================================================
// 10. 导出
// ============================================================================

export default {
  SimplifiedStatus,
  DetailedStatus,
  SimplifiedStatusText,
  SimplifiedStatusType,
  DetailedToSimplifiedMap,
  ExcelStatusToSimplifiedMap,
  ExternalApiToDetailedMap,
  SimplifiedStatusTransitions,
  isValidSimplifiedTransition,
  calculateLogisticsStatus,
  mapExternalStatusToSimplified,
  batchMapExternalStatuses,
  getSimplifiedStatusText,
  getSimplifiedStatusType,
  isAlertStatus,
  getAllSimplifiedStatuses,
  getAllDetailedStatuses
};
