/**
 * 飞驼API状态代码到核心字段的映射
 * FeiTuo API Status Code to Core Field Mapping
 *
 * 飞驼API同步数据时,根据状态代码更新对应的核心时间字段
 * 核心字段是状态机计算物流状态的基础
 */

/**
 * 飞驼状态代码到核心字段的映射表
 * FeiTuo Status Code to Core Field Mapping
 *
 * @example
 * 'ARRIVE' -> 'ata_dest_port'      // 到达目的港 -> 目的港实际到港日期
 * 'GATE_IN' -> 'gate_in_time'       // 进闸 -> 入闸时间
 * 'GATE_OUT' -> 'gate_out_time'     // 出闸 -> 出闸时间
 */
export const FEITUO_STATUS_TO_CORE_FIELD_MAP: Record<string, string> = {
  // ===== 目的港相关 =====
  'ARRIVE': 'ata_dest_port',           // 到达目的港 -> 目的港实际到港日期
  'ATA': 'ata_dest_port',              // 实际到港 -> 目的港实际到港日期
  'ETA': 'eta_dest_port',              // 预计到港 -> 目的港预计到港日期

  // ===== 闸口操作 =====
  'GATE_IN': 'gate_in_time',           // 进闸 -> 入闸时间
  'GATE_OUT': 'gate_out_time',         // 出闸 -> 出闸时间

  // ===== 码头操作 =====
  'DISCHARGED': 'dest_port_unload_date', // 卸货 -> 目的港卸船日期
  'AVAIL': 'available_time',           // 可提货 -> 可提货时间
  'DISCHARGED': 'discharged_time',     // 放电 -> 放电时间

  // ===== 中转港相关 =====
  'TRANSIT_ARRIVE': 'ata_dest_port',   // 到达中转港 -> 中转港实际到港日期
  'TRANSIT_DEPART': 'transit_departure_date', // 离开中转港 -> 中转港离港日期

  // ===== 起运港相关 =====
  'BO': 'shipment_date',               // 装船 -> 装船日期
  'DEPARTED': 'shipment_date',         // 出发 -> 装船日期
};

/**
 * 飞驼状态代码到港口类型的映射
 * FeiTuo Status Code to Port Type Mapping
 *
 * 用于判断飞驼事件属于哪个港口类型(origin/transit/destination)
 */
export const FEITUO_STATUS_TO_PORT_TYPE_MAP: Record<string, 'origin' | 'transit' | 'destination'> = {
  // 起运港
  'BO': 'origin',
  'DEPARTED': 'origin',

  // 中转港
  'TRANSIT_ARRIVE': 'transit',
  'TRANSIT_DEPART': 'transit',

  // 目的港
  'ARRIVE': 'destination',
  'ATA': 'destination',
  'ETA': 'destination',
  'GATE_IN': 'destination',
  'GATE_OUT': 'destination',
  'DISCHARGED': 'destination',
  'AVAIL': 'destination',
};

/**
 * 飞驼状态代码到状态类型的映射
 * FeiTuo Status Code to Status Type Mapping
 *
 * 用于飞驼数据的统计和筛选
 */
export const FEITUO_STATUS_TYPE_MAP: Record<string, 'ETA' | 'ATA' | 'GATE_IN' | 'GATE_OUT' | 'DISCHARGED' | 'AVAILABLE' | 'STATUS'> = {
  // 预计时间
  'ETA': 'ETA',

  // 实际时间
  'ARRIVE': 'ATA',
  'ATA': 'ATA',
  'GATE_IN': 'GATE_IN',
  'GATE_OUT': 'GATE_OUT',
  'DISCHARGED': 'DISCHARGED',
  'AVAIL': 'AVAILABLE',

  // 其他状态
  'BO': 'STATUS',
  'DEPARTED': 'STATUS',
  'TRANSIT_ARRIVE': 'ATA',
  'TRANSIT_DEPART': 'ATA',
};

/**
 * 判断飞驼状态代码是否应该更新核心字段
 * Check if FeiTuo status code should update core field
 *
 * @param statusCode 飞驼状态代码
 * @param hasOccurred 是否已发生
 * @returns 是否应该更新核心字段
 */
export const shouldUpdateCoreField = (statusCode: string, hasOccurred: boolean): boolean => {
  // 只有已发生的事件才更新核心字段
  if (!hasOccurred) {
    return false;
  }

  // 只有在映射表中的状态代码才更新核心字段
  return statusCode in FEITUO_STATUS_TO_CORE_FIELD_MAP;
};

/**
 * 获取飞驼状态代码对应的核心字段名
 * Get core field name for FeiTuo status code
 *
 * @param statusCode 飞驼状态代码
 * @returns 核心字段名,如果不存在则返回null
 */
export const getCoreFieldName = (statusCode: string): string | null => {
  return FEITUO_STATUS_TO_CORE_FIELD_MAP[statusCode] || null;
};

/**
 * 获取飞驼状态代码对应的港口类型
 * Get port type for FeiTuo status code
 *
 * @param statusCode 飞驼状态代码
 * @returns 港口类型,如果不存在则返回null
 */
export const getPortTypeForStatusCode = (statusCode: string): 'origin' | 'transit' | 'destination' | null => {
  return FEITUO_STATUS_TO_PORT_TYPE_MAP[statusCode] || null;
};

/**
 * 获取飞驼状态代码对应的状态类型
 * Get status type for FeiTuo status code
 *
 * @param statusCode 飞驼状态代码
 * @returns 状态类型,如果不存在则返回'STATUS'
 */
export const getStatusTypeForStatusCode = (statusCode: string): 'ETA' | 'ATA' | 'GATE_IN' | 'GATE_OUT' | 'DISCHARGED' | 'AVAILABLE' | 'STATUS' => {
  return FEITUO_STATUS_TYPE_MAP[statusCode] || 'STATUS';
};

/**
 * 判断飞驼状态代码是否为预计时间
 * Check if FeiTuo status code is estimated time
 *
 * @param statusCode 飞驼状态代码
 * @returns 是否为预计时间
 */
export const isEstimatedStatus = (statusCode: string): boolean => {
  return getStatusTypeForStatusCode(statusCode) === 'ETA';
};

/**
 * 判断飞驼状态代码是否为实际时间
 * Check if FeiTuo status code is actual time
 *
 * @param statusCode 飞驼状态代码
 * @returns 是否为实际时间
 */
export const isActualStatus = (statusCode: string): boolean => {
  const statusType = getStatusTypeForStatusCode(statusCode);
  return ['ATA', 'GATE_IN', 'GATE_OUT', 'DISCHARGED', 'AVAILABLE'].includes(statusType);
};

/**
 * 获取所有需要更新核心字段的飞驼状态代码
 * Get all FeiTuo status codes that should update core fields
 *
 * @returns 飞驼状态代码数组
 */
export const getAllStatusCodesWithCoreField = (): string[] => {
  return Object.keys(FEITUO_STATUS_TO_CORE_FIELD_MAP);
};

// ============================================================================
// 导出
// ============================================================================

export default {
  FEITUO_STATUS_TO_CORE_FIELD_MAP,
  FEITUO_STATUS_TO_PORT_TYPE_MAP,
  FEITUO_STATUS_TYPE_MAP,
  shouldUpdateCoreField,
  getCoreFieldName,
  getPortTypeForStatusCode,
  getStatusTypeForStatusCode,
  isEstimatedStatus,
  isActualStatus,
  getAllStatusCodesWithCoreField,
};
