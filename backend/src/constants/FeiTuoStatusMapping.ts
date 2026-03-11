/**
 * 飞驼API状态代码到核心字段的映射
 * FeiTuo API Status Code to Core Field Mapping
 *
 * 飞驼API同步数据时,根据状态代码更新对应的核心时间字段
 * 核心字段是状态机计算物流状态的基础
 *
 * 参考: https://doc.freightower.com/7113318m0 节点状态码
 */

/**
 * 飞驼状态代码到核心字段的映射表
 * FeiTuo Status Code to Core Field Mapping
 *
 * 含 Freightower 文档中的 transportEvents / equipmentEvents 码
 */
export const FEITUO_STATUS_TO_CORE_FIELD_MAP: Record<string, string> = {
  // ===== 目的港相关 =====
  'ARRIVE': 'ata_dest_port',
  'ATA': 'ata_dest_port',
  'ARRI': 'ata_dest_port',
  'BDAR': 'ata_dest_port',             // 抵港 Vessel Arrived
  'POCA': 'ata_dest_port',             // 靠泊 Vessel Berthed
  'ETA': 'eta_dest_port',

  // ===== 闸口操作 =====
  'GATE_IN': 'gate_in_time',
  'GATE_OUT': 'gate_out_time',
  'GITM': 'gate_in_time',              // 进场 Received
  'GTIN': 'gate_in_time',
  'GTOT': 'gate_out_time',
  'STCS': 'gate_out_time',             // 提柜 Gate Out for Delivery

  // ===== 码头操作 =====
  'DISCHARGED': 'dest_port_unload_date',
  'DISC': 'dest_port_unload_date',
  'DSCH': 'dest_port_unload_date',     // 卸船 Vessel Discharged
  'AVAIL': 'available_time',
  'PCAB': 'available_time',            // 可提货 Available

  // ===== 中转港相关 =====
  'TRANSIT_ARRIVE': 'transit_arrival_date',
  'TSBA': 'transit_arrival_date',      // 中转抵港 T/S Vessel Arrived
  'TRANSIT_DEPART': 'atd_transit',
  'TSDP': 'atd_transit',               // 中转离港 T/S Vessel Departed
  'DEPA': 'atd_transit',

  // ===== 起运港相关 =====
  'BO': 'shipment_date',
  'DEPARTED': 'shipment_date',
  'LOAD': 'shipment_date',
  'LOBD': 'shipment_date',             // 装船 Loaded
  'DLPT': 'shipment_date',             // 离港 Vessel Departed

  // ===== 还箱 =====
  'RCVE': 'return_time',               // 还空箱 Empty Returned
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
  'LOAD': 'origin',
  'LOBD': 'origin',
  'DLPT': 'origin',
  'GITM': 'origin',

  // 中转港
  'TRANSIT_ARRIVE': 'transit',
  'TRANSIT_DEPART': 'transit',
  'TSBA': 'transit',
  'TSDP': 'transit',
  'DEPA': 'transit',

  // 目的港
  'ARRIVE': 'destination',
  'ATA': 'destination',
  'ARRI': 'destination',
  'BDAR': 'destination',
  'POCA': 'destination',
  'ETA': 'destination',
  'GATE_IN': 'destination',
  'GATE_OUT': 'destination',
  'GTIN': 'destination',
  'GTOT': 'destination',
  'STCS': 'destination',
  'DISCHARGED': 'destination',
  'DISC': 'destination',
  'DSCH': 'destination',
  'AVAIL': 'destination',
  'PCAB': 'destination',

  // 还箱
  'RCVE': 'destination',
};

/**
 * 飞驼状态代码到状态类型的映射
 * FeiTuo Status Code to Status Type Mapping
 *
 * 用于飞驼数据的统计和筛选
 */
export const FEITUO_STATUS_TYPE_MAP: Record<string, 'ETA' | 'ATA' | 'GATE_IN' | 'GATE_OUT' | 'DISCHARGED' | 'AVAILABLE' | 'STATUS'> = {
  'ETA': 'ETA',
  'ARRIVE': 'ATA',
  'ATA': 'ATA',
  'ARRI': 'ATA',
  'BDAR': 'ATA',
  'POCA': 'ATA',
  'GATE_IN': 'GATE_IN',
  'GATE_OUT': 'GATE_OUT',
  'GTIN': 'GATE_IN',
  'GTOT': 'GATE_OUT',
  'GITM': 'GATE_IN',
  'STCS': 'GATE_OUT',
  'DISCHARGED': 'DISCHARGED',
  'DISC': 'DISCHARGED',
  'DSCH': 'DISCHARGED',
  'AVAIL': 'AVAILABLE',
  'PCAB': 'AVAILABLE',
  'BO': 'STATUS',
  'DEPARTED': 'STATUS',
  'LOAD': 'STATUS',
  'LOBD': 'STATUS',
  'DLPT': 'STATUS',
  'DEPA': 'ATA',
  'TRANSIT_ARRIVE': 'ATA',
  'TRANSIT_DEPART': 'ATA',
  'TSBA': 'ATA',
  'TSDP': 'ATA',
  'RCVE': 'STATUS',
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
