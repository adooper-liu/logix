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
  // PCAB: 飞驼官方标准可提货状态码（主要映射）
  // AVLE/AVAIL: 兼容非标准码（文档中未定义，可能来自其他数据源）
  'PCAB': 'available_time',            // 可提货 Available (官方标准)
  'AVLE': 'available_time',            // 可提货 Available (兼容码)
  'AVAIL': 'available_time',           // 可提货 Available (兼容码)

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
  
  // ===== 驳船相关（新增）=====
  'FDDP': 'shipment_date',             // 驳船离港 Feeder Departed
  'FDLB': 'shipment_date',             // 驳船装船 Feeder Loaded
  'FDBA': 'transit_arrival_date',      // 驳船抵达 Feeder Arrived
  'STSP': 'gate_out_time',             // 提空箱 Pick-up Empty

  // ===== 还箱 =====
  'RCVE': 'return_time',               // 还空箱 Empty Returned

  // ===== P0 - 核心业务节点（新增）=====
  // 【装箱/拆箱】
  'STUF': 'stuffing_date',            // 装箱 Container Stuffing
  'STRP': 'stripping_date',           // 拆箱 Container Stripping

  // 【中转港扩展】
  'TSCA': 'transit_arrival_date',     // 中转停泊 T/S Vessel Berthed
  'TSDC': 'transit_arrival_date',     // 中转卸船 T/S Vessel Discharged
  'TSLB': 'atd_transit',              // 中转装船 T/S Vessel Loaded

  // 【滞留/放行 - 影响物流状态】
  'DUMP': 'dumped_date',              // 甩柜 Dumped to be loaded
  'PASS': 'customs_release_date',     // 海关放行 Customs Released
  'CUIP': 'customs_hold_date',        // 海关滞留 Customs on hold
  'SRHD': 'carrier_hold_date',        // 船公司滞留 B/L on hold
  'TMHD': 'terminal_hold_date',       // 码头滞留 Terminal on hold
  'TMPS': 'terminal_release_date',    // 码头放行 Terminal Released

  // ===== P1 - 海关状态码（新增）=====
  // 【出口预配舱单】
  'BLA': 'customs_status',            // 预配舱单接受申报 Booking Manifest Received
  'BLR': 'customs_status',            // 预配舱单放行 Booking Manifest Released
  // 【出口运抵报告】
  'ASA': 'customs_status',            // 已运抵 Arrival Report Submitted
  // 【出口报关】
  'EDC': 'customs_status',            // 出口报关入库 Export Declaration Created
  'CDC': 'customs_status',            // 出口报关审结 Export Declaration Checked
  'CPI': 'customs_status',            // 出口报关查验 Export Customs Inspection
  'PAS': 'customs_status',            // 出口报关放行 Export Customs Released
  'CLR': 'customs_status',            // 出口报关结关 Export Customs Cleared
  // 【进口原始舱单】
  'MFA': 'customs_status',            // 原始舱单接受申报 Manifest Filed
  'MFR': 'manifest_release_date',     // 原始舱单放行 Manifest Released
  // 【进口清关】
  'EDC_I': 'customs_status',          // 进口报关入库 Import Declaration Created
  'CDC_I': 'customs_status',          // 进口报关审结 Import Declaration Checked
  'CPI_I': 'customs_status',          // 进口报关查验 Import Customs Inspection
  'PAS_I': 'customs_status',          // 进口报关放行 Import Customs Released
  'CLR_I': 'customs_status',           // 进口报关结关 Import Customs Cleared

  // ===== P1 - 多式联运/铁路（新增）=====
  'IRLB': 'stuffing_date',            // 铁运装箱 Rail Loaded
  'IRDP': 'shipment_date',            // 铁运离站 Rail Departed
  'IRAR': 'transit_arrival_date',     // 铁运到站 Rail Arrived
  'IRDS': 'transit_arrival_date',     // 铁运卸箱 Rail Discharged
  'FDDC': 'transit_arrival_date',     // 驳船卸船 Feeder Discharged

  // ===== P2 - 中国港区事件（新增）=====
  'CYOP': 'port_open_date',           // 出口进箱开始时间 CY Open (China Port)
  'CYCL': 'port_close_date',          // 出口进箱截止时间 CY Close (China Port)
  'SICT': 'document_cutoff_date',     // 截单时间 SI Cut-off
  'CUCT': 'customs_cutoff_date',      // 截关时间 Customs Cut-off
  'RELS': 'customs_release_date',     // 放行 Released (海关/码头/海事)

  // ===== P2 - 预警监控（新增）=====
  // 预警状态码主要用于监控和告警，记录到remarks字段
  // 【延误预警】
  'WGITM': 'remarks',                 // 起运港进港延误 Warning Gate In
  'WDLPT': 'remarks',                // 起运港离港延误 Warning Departed
  'WBDAR': 'remarks',                // 目的港抵达延误 Warning Arrived
  'WETA': 'remarks',                 // 交货地抵达延误 Warning ETA
  // 【滞留预警】
  'WTSBA': 'remarks',                // 中转滞留 Warning T/S Berthed
  'WGTOT': 'remarks',                // 目的港滞留 Warning Gate Out
  // 【超期预警】
  'WSTCS': 'remarks',                // 滞港超期 Warning Pick-up Overdue
  'WRCVE': 'remarks',                // 用箱超期 Warning Return Overdue
  // 【甩柜预警】
  'WDUMP': 'remarks',                // 甩柜预警 Warning Dumped
  // 【码头拥堵预警】
  'WPCGI': 'remarks',                // 目的港码头拥堵 Warning Pier Congestion
  // 【变更预警】
  'WCYOP': 'remarks',                // 开港变更 Warning CY Open Changed
  'WCYCL': 'remarks',                // 截港变更 Warning CY Close Changed
  'WETB': 'remarks',                // 靠泊变更 Warning ETA Berthed Changed
  'WETD': 'remarks',                // 离泊变更 Warning ETD Changed
  'WPORT': 'remarks',                // 港口变更 Warning Port Changed
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
  
  // 驳船相关（新增）
  'FDDP': 'origin',        // 驳船离港 - 起始地操作
  'FDLB': 'origin',        // 驳船装船 - 起始地操作
  'STSP': 'origin',        // 提空箱 - 起始地操作

  // ===== P0 - 装箱/拆箱 =====
  'STUF': 'origin',        // 装箱 - 起运港操作
  'STRP': 'destination',   // 拆箱 - 目的港操作

  // 中转港
  'TRANSIT_ARRIVE': 'transit',
  'TRANSIT_DEPART': 'transit',
  'TSBA': 'transit',
  'TSCA': 'transit',        // P0: 中转停泊 T/S Vessel Berthed
  'TSDC': 'transit',        // P0: 中转卸船 T/S Vessel Discharged
  'TSLB': 'transit',        // P0: 中转装船 T/S Vessel Loaded
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
  // PCAB: 飞驼官方标准可提货状态码（主要映射）
  // AVLE/AVAIL: 兼容非标准码（文档中未定义）
  'PCAB': 'destination',               // 可提货 Available (官方标准)
  'AVLE': 'destination',               // 可提货 Available (兼容码)
  'AVAIL': 'destination',              // 可提货 Available (兼容码)

  // ===== P0 - 滞留/放行（关键风控点）=====
  'DUMP': 'origin',                   // 甩柜 - 起运港操作
  'PASS': 'destination',              // 海关放行 - 目的港
  'CUIP': 'destination',              // 海关滞留 - 目的港
  'SRHD': 'origin',                   // 船公司滞留 - 起运港
  'TMHD': 'destination',              // 码头滞留 - 目的港
  'TMPS': 'destination',              // 码头放行 - 目的港

  // ===== P1 - 海关状态码 =====
  // 出口预配舱单/运抵报告 - 起运港
  'BLA': 'origin',                    // 预配舱单接受申报
  'BLR': 'origin',                    // 预配舱单放行
  'ASA': 'origin',                    // 已运抵
  // 出口报关 - 起运港
  'EDC': 'origin',                    // 出口报关入库
  'CDC': 'origin',                    // 出口报关审结
  'CPI': 'origin',                    // 出口报关查验
  'PAS': 'origin',                    // 出口报关放行
  'CLR': 'origin',                    // 出口报关结关
  // 进口原始舱单/清关 - 目的港
  'MFA': 'destination',               // 原始舱单接受申报
  'MFR': 'destination',               // 原始舱单放行
  'EDC_I': 'destination',             // 进口报关入库
  'CDC_I': 'destination',              // 进口报关审结
  'CPI_I': 'destination',             // 进口报关查验
  'PAS_I': 'destination',             // 进口报关放行
  'CLR_I': 'destination',             // 进口报关结关

  // ===== P1 - 多式联运/铁路 =====
  'IRLB': 'origin',                    // 铁运装箱 - 起运地
  'IRDP': 'origin',                   // 铁运离站 - 起运地
  'IRAR': 'transit',                  // 铁运到站 - 中转地
  'IRDS': 'transit',                  // 铁运卸箱 - 中转地/目的港
  'FDDC': 'transit',                  // 驳船卸船 - 中转地

  // ===== P2 - 中国港区事件 =====
  'CYOP': 'origin',                    // 出口进箱开始 - 起运港(中国)
  'CYCL': 'origin',                    // 出口进箱截止 - 起运港(中国)
  'SICT': 'origin',                    // 截单时间 - 起运港(中国)
  'CUCT': 'origin',                    // 截关时间 - 起运港(中国)
  'RELS': 'destination',               // 放行 - 目的港

  // ===== P2 - 预警监控 =====
  // 预警状态码根据事件类型决定端口类型
  'WGITM': 'origin',                   // 起运港进港延误
  'WDLPT': 'origin',                   // 起运港离港延误
  'WDUMP': 'origin',                   // 甩柜预警
  'WTSBA': 'transit',                  // 中转滞留
  'WPCGI': 'destination',              // 目的港码头拥堵
  'WBDAR': 'destination',              // 目的港抵达延误
  'WGTOT': 'destination',              // 目的港滞留
  'WETA': 'destination',               // 交货地抵达延误
  'WSTCS': 'destination',              // 滞港超期
  'WRCVE': 'destination',              // 用箱超期
  'WCYOP': 'origin',                   // 开港变更
  'WCYCL': 'origin',                   // 截港变更
  'WETB': 'destination',              // 靠泊变更
  'WETD': 'origin',                   // 离泊变更
  'WPORT': 'transit',                  // 港口变更

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
  // PCAB: 飞驼官方标准可提货状态码（主要映射）
  // AVLE/AVAIL: 兼容非标准码（文档中未定义）
  'PCAB': 'AVAILABLE',                 // 可提货 Available (官方标准)
  'AVLE': 'AVAILABLE',                 // 可提货 Available (兼容码)
  'AVAIL': 'AVAILABLE',                // 可提货 Available (兼容码)
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
  
  // 驳船相关（新增）
  'FDDP': 'STATUS',        // 驳船离港
  'FDLB': 'STATUS',        // 驳船装船
  'FDBA': 'ATA',           // 驳船抵达
  'STSP': 'GATE_OUT',      // 提空箱

  // ===== P0 - 装箱/拆箱 =====
  'STUF': 'STATUS',        // 装箱完成
  'STRP': 'STATUS',        // 拆箱完成

  // ===== P0 - 中转港扩展 =====
  'TSCA': 'ATA',          // 中转停泊
  'TSDC': 'DISCHARGED',   // 中转卸船
  'TSLB': 'STATUS',       // 中转装船

  // ===== P0 - 滞留/放行（关键风控点）=====
  'DUMP': 'STATUS',       // 甩柜
  'PASS': 'STATUS',       // 海关放行
  'CUIP': 'STATUS',       // 海关滞留
  'SRHD': 'STATUS',       // 船公司滞留
  'TMHD': 'STATUS',       // 码头滞留
  'TMPS': 'STATUS',      // 码头放行

  // ===== P1 - 海关状态码 =====
  // 出口预配舱单/运抵报告
  'BLA': 'STATUS',        // 预配舱单接受申报
  'BLR': 'STATUS',        // 预配舱单放行
  'ASA': 'STATUS',        // 已运抵
  // 出口报关
  'EDC': 'STATUS',        // 出口报关入库
  'CDC': 'STATUS',        // 出口报关审结
  'CPI': 'STATUS',        // 出口报关查验
  'PAS': 'STATUS',        // 出口报关放行
  'CLR': 'STATUS',        // 出口报关结关
  // 进口原始舱单/清关
  'MFA': 'STATUS',         // 原始舱单接受申报
  'MFR': 'STATUS',        // 原始舱单放行
  'EDC_I': 'STATUS',     // 进口报关入库
  'CDC_I': 'STATUS',     // 进口报关审结
  'CPI_I': 'STATUS',     // 进口报关查验
  'PAS_I': 'STATUS',     // 进口报关放行
  'CLR_I': 'STATUS',     // 进口报关结关

  // ===== P1 - 多式联运/铁路 =====
  'IRLB': 'STATUS',       // 铁运装箱
  'IRDP': 'STATUS',       // 铁运离站
  'IRAR': 'ATA',          // 铁运到站
  'IRDS': 'DISCHARGED',  // 铁运卸箱
  'FDDC': 'DISCHARGED',  // 驳船卸船

  // ===== P2 - 中国港区事件 =====
  'CYOP': 'STATUS',       // 出口进箱开始
  'CYCL': 'STATUS',       // 出口进箱截止
  'SICT': 'STATUS',       // 截单时间
  'CUCT': 'STATUS',       // 截关时间
  'RELS': 'STATUS',       // 放行

  // ===== P2 - 预警监控 =====
  // 预警状态码标记为特殊类型，用于区分普通状态
  'WGITM': 'STATUS',     // 起运港进港延误
  'WDLPT': 'STATUS',     // 起运港离港延误
  'WDUMP': 'STATUS',     // 甩柜预警
  'WTSBA': 'STATUS',     // 中转滞留
  'WPCGI': 'STATUS',     // 目的港码头拥堵
  'WBDAR': 'STATUS',     // 目的港抵达延误
  'WGTOT': 'STATUS',     // 目的港滞留
  'WETA': 'STATUS',      // 交货地抵达延误
  'WSTCS': 'STATUS',     // 滞港超期
  'WRCVE': 'STATUS',     // 用箱超期
  'WCYOP': 'STATUS',     // 开港变更
  'WCYCL': 'STATUS',     // 截港变更
  'WETB': 'STATUS',      // 靠泊变更
  'WETD': 'STATUS',      // 离泊变更
  'WPORT': 'STATUS',     // 港口变更

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
