/**
 * 物流状态机工具模块（前端版本）
 * Logistics Status Machine Utilities (Frontend Version)
 *
 * 与后端保持完全一致的状态映射逻辑
 * Consistent state mapping logic with backend
 */

// ============================================================================
// 1. 简化状态枚举（7层流转）
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
 * 简化状态类型映射（用于Element Plus Tag组件）
 * Simplified Status Type Mapping (for Element Plus Tag component)
 */
export const SimplifiedStatusType: Record<SimplifiedStatus, 'success' | 'warning' | 'info' | 'danger'> = {
  [SimplifiedStatus.NOT_SHIPPED]: 'info',
  [SimplifiedStatus.SHIPPED]: 'primary',
  [SimplifiedStatus.IN_TRANSIT]: 'success',
  [SimplifiedStatus.AT_PORT]: 'warning',
  [SimplifiedStatus.PICKED_UP]: 'warning',
  [SimplifiedStatus.UNLOADED]: 'warning',
  [SimplifiedStatus.RETURNED_EMPTY]: 'success'
};

/**
 * 简化状态样式类映射
 * Simplified Status Class Mapping (for custom styling)
 */
export const SimplifiedStatusClass: Record<SimplifiedStatus, string> = {
  [SimplifiedStatus.NOT_SHIPPED]: 'status-not-shipped',
  [SimplifiedStatus.SHIPPED]: 'status-shipped',
  [SimplifiedStatus.IN_TRANSIT]: 'status-in-transit',
  [SimplifiedStatus.AT_PORT]: 'status-at-port',
  [SimplifiedStatus.PICKED_UP]: 'status-picked-up',
  [SimplifiedStatus.UNLOADED]: 'status-unloaded',
  [SimplifiedStatus.RETURNED_EMPTY]: 'status-returned-empty'
};

// ============================================================================
// 2. 港口类型枚举
// ============================================================================

/**
 * 港口类型枚举
 * Port Type Enum
 */
export enum PortType {
  ORIGIN = 'origin',
  TRANSIT = 'transit',
  DESTINATION = 'destination'
}

/**
 * 港口类型中文映射
 * Port Type Chinese Mapping
 */
export const PortTypeText: Record<PortType, string> = {
  [PortType.ORIGIN]: '起运港',
  [PortType.TRANSIT]: '中转港',
  [PortType.DESTINATION]: '目的港'
};

// ============================================================================
// 3. 动态物流状态显示
// ============================================================================

/**
 * 根据港口类型动态获取物流状态文本
 * Get logistics status text dynamically based on port type
 *
 * @param status 简化状态
 * @param portType 港口类型（当 status 为 at_port 时使用）
 * @returns 显示的中文文本
 *
 * @example
 * getLogisticsStatusText('at_port', 'transit') // '到达中转港'
 * getLogisticsStatusText('at_port', 'destination') // '到达目的港'
 * getLogisticsStatusText('shipped', null) // '已出运'
 */
export const getLogisticsStatusText = (
  status: SimplifiedStatus | string,
  portType?: PortType | string | null
): string => {
  // 如果不是 at_port 状态，直接返回状态文本
  if (status !== SimplifiedStatus.AT_PORT || !portType) {
    return SimplifiedStatusText[status as SimplifiedStatus] || status;
  }

  // at_port 状态根据港口类型动态显示
  if (portType === PortType.TRANSIT) {
    return '到达中转港';
  } else if (portType === PortType.DESTINATION) {
    return '到达目的港';
  } else {
    return '已到港';
  }
};

/**
 * 获取物流状态类型标识（用于Element Plus Tag）
 * Get logistics status type identifier (for Element Plus Tag)
 *
 * @param status 简化状态
 * @returns Element Plus Tag type
 */
export const getLogisticsStatusType = (
  status: SimplifiedStatus | string
): 'success' | 'warning' | 'info' | 'danger' => {
  return SimplifiedStatusType[status as SimplifiedStatus] || 'info';
};

/**
 * 获取物流状态样式类
 * Get logistics status CSS class
 *
 * @param status 简化状态
 * @returns CSS class name
 */
export const getLogisticsStatusClass = (
  status: SimplifiedStatus | string
): string => {
  return SimplifiedStatusClass[status as SimplifiedStatus] || 'status-unknown';
};

/**
 * 获取当前位置文本
 * Get current location text
 *
 * @param status 简化状态
 * @param portName 港口名称
 * @param portType 港口类型
 * @returns 位置文本
 */
export const getCurrentLocationText = (
  status: SimplifiedStatus | string,
  portName?: string,
  portType?: PortType | string | null
): string => {
  if (status === SimplifiedStatus.AT_PORT && portName) {
    if (portType === PortType.TRANSIT) {
      return `${portName} (中转)`;
    } else if (portType === PortType.DESTINATION) {
      return `${portName} (目的)`;
    }
    return portName;
  }

  const locationMap: Record<SimplifiedStatus, string> = {
    [SimplifiedStatus.NOT_SHIPPED]: '仓库',
    [SimplifiedStatus.SHIPPED]: '在途',
    [SimplifiedStatus.IN_TRANSIT]: '在途',
    [SimplifiedStatus.AT_PORT]: '港口',
    [SimplifiedStatus.PICKED_UP]: '提柜中',
    [SimplifiedStatus.UNLOADED]: '仓库',
    [SimplifiedStatus.RETURNED_EMPTY]: '已还箱'
  };

  return locationMap[status as SimplifiedStatus] || '-';
};

// ============================================================================
// 4. Excel 状态转换
// ============================================================================

/**
 * Excel 中文状态转换为简化状态
 * Transform Excel Chinese status to simplified status
 *
 * @param value Excel 中的中文状态
 * @returns 简化状态
 */
export const transformLogisticsStatus = (value: string): string => {
  const map: Record<string, SimplifiedStatus> = {
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
    '已取消': SimplifiedStatus.NOT_SHIPPED
  };
  return map[value] || value;
};

// ============================================================================
// 5. 状态流转验证
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
    SimplifiedStatus.PICKED_UP
  ],
  [SimplifiedStatus.IN_TRANSIT]: [
    SimplifiedStatus.AT_PORT,
    SimplifiedStatus.PICKED_UP
  ],
  [SimplifiedStatus.AT_PORT]: [
    SimplifiedStatus.PICKED_UP,
    SimplifiedStatus.UNLOADED
  ],
  [SimplifiedStatus.PICKED_UP]: [
    SimplifiedStatus.UNLOADED,
    SimplifiedStatus.RETURNED_EMPTY
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
// 6. 工具函数
// ============================================================================

/**
 * 获取所有有效的简化状态
 * Get all valid simplified statuses
 */
export const getAllSimplifiedStatuses = (): SimplifiedStatus[] => {
  return Object.values(SimplifiedStatus);
};

/**
 * 获取所有有效的港口类型
 * Get all valid port types
 */
export const getAllPortTypes = (): PortType[] => {
  return Object.values(PortType);
};

/**
 * 判断状态是否为完成状态
 * Check if status is a completed status
 */
export const isCompletedStatus = (status: SimplifiedStatus): boolean => {
  return status === SimplifiedStatus.RETURNED_EMPTY;
};

/**
 * 判断状态是否为进行中状态
 * Check if status is an in-progress status
 */
export const isInProgressStatus = (status: SimplifiedStatus): boolean => {
  return [
    SimplifiedStatus.SHIPPED,
    SimplifiedStatus.IN_TRANSIT,
    SimplifiedStatus.AT_PORT,
    SimplifiedStatus.PICKED_UP,
    SimplifiedStatus.UNLOADED
  ].includes(status);
};

/**
 * 判断状态是否为初始状态
 * Check if status is an initial status
 */
export const isInitialStatus = (status: SimplifiedStatus): boolean => {
  return status === SimplifiedStatus.NOT_SHIPPED;
};

// ============================================================================
// 7. 导出
// ============================================================================

export default {
  // 枚举
  SimplifiedStatus,
  PortType,

  // 映射表
  SimplifiedStatusText,
  SimplifiedStatusType,
  SimplifiedStatusClass,
  PortTypeText,

  // 动态显示函数
  getLogisticsStatusText,
  getLogisticsStatusType,
  getLogisticsStatusClass,
  getCurrentLocationText,

  // 状态转换
  transformLogisticsStatus,
  isValidSimplifiedTransition,

  // 工具函数
  getAllSimplifiedStatuses,
  getAllPortTypes,
  isCompletedStatus,
  isInProgressStatus,
  isInitialStatus
};
