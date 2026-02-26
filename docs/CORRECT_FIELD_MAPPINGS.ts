/**
 * Excel字段到数据库字段的完整映射（基于数据库表结构）
 * Excel to Database Field Mappings - Based on Database Schema
 *
 * 创建原则:
 * 1. 以数据库表结构(03_create_tables.sql)为唯一基准
 * 2. 表名使用完整的实际表名（带 process_ 前缀）
 * 3. 字段名与SQL表字段名完全一致
 * 4. 修正所有字段错位和重复问题
 * 5. 补充所有缺失的字段映射
 *
 * 最后更新: 2026-02-26
 */

interface FieldMapping {
  excelField: string
  table: string
  field: string
  required?: boolean
  transform?: (v: any) => any
}

// ==================== 工具函数 ====================

function parseDate(value: any): Date | null {
  if (!value) return null

  // Excel日期数字（Excel日期从1900年1月1日开始，25569是1970年1月1日的序列号）
  if (typeof value === 'number') {
    const date = new Date((value - 25569) * 86400 * 1000)
    return isNaN(date.getTime()) ? null : date
  }

  // 字符串日期
  const dateStr = String(value).trim()
  const dashDate = dateStr.replace(/\//g, '-')

  // YYYY-MM-DD HH:mm:ss 格式
  if (/^\d{4}-\d{1,2}-\d{1,2}\s+\d{1,2}:\d{1,2}:\d{1,2}$/.test(dashDate)) {
    const date = new Date(dashDate)
    return isNaN(date.getTime()) ? null : date
  }

  // YYYY-MM-DD 格式
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(dashDate)) {
    const date = new Date(dashDate)
    return isNaN(date.getTime()) ? null : date
  }

  return null
}

function parseDecimal(value: any): number | null {
  if (value === null || value === undefined || value === '') return null
  const strValue = String(value).replace(/,/g, '').replace(/[¥$€£]/g, '')
  const num = parseFloat(strValue)
  return isNaN(num) ? null : num
}

function transformLogisticsStatus(value: string): string {
  const map: Record<string, string> = {
    '未出运': 'not_shipped',
    '在途': 'in_transit',
    '已到港': 'at_port',
    '已提柜': 'picked_up',
    '已卸柜': 'unloaded',
    '已还箱': 'returned_empty',
    '已取消': 'cancelled',
  }
  return map[value] || value
}

function transformBoolean(value: any): boolean {
  if (value === null || value === undefined || value === '') return false
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value === 1
  if (typeof value === 'string') {
    return ['是', 'yes', 'true', '1', 'y'].includes(value.toLowerCase().trim())
  }
  return false
}

// ==================== 完整字段映射配置 ====================

/**
 * 完整的字段映射配置
 * 每个映射包含:
 * - excelField: Excel中的列名（中文）
 * - table: 数据库实际表名（完整表名）
 * - field: 数据库实际字段名（snake_case）
 * - required: 是否必填
 * - transform: 数据转换函数
 */
export const CORRECT_FIELD_MAPPINGS: FieldMapping[] = [
  // ========================================
  // 备货单表 (biz_replenishment_orders)
  // ========================================
  { excelField: '备货单号', table: 'biz_replenishment_orders', field: 'order_number', required: true },
  { excelField: '主备货单号', table: 'biz_replenishment_orders', field: 'main_order_number', required: false },
  { excelField: '销往国家', table: 'biz_replenishment_orders', field: 'sell_to_country', required: false },
  { excelField: '客户名称', table: 'biz_replenishment_orders', field: 'customer_name', required: false },
  { excelField: '备货单状态', table: 'biz_replenishment_orders', field: 'order_status', required: false },
  { excelField: '采购贸易模式', table: 'biz_replenishment_orders', field: 'procurement_trade_mode', required: false },
  { excelField: '价格条款', table: 'biz_replenishment_orders', field: 'price_terms', required: false },
  { excelField: '箱数合计', table: 'biz_replenishment_orders', field: 'total_boxes', required: false, transform: parseDecimal },
  { excelField: '体积合计(m3)', table: 'biz_replenishment_orders', field: 'total_cbm', required: false, transform: parseDecimal },
  { excelField: '毛重合计(KG)', table: 'biz_replenishment_orders', field: 'total_gross_weight', required: false, transform: parseDecimal },
  { excelField: '出运总价', table: 'biz_replenishment_orders', field: 'shipment_total_value', required: false, transform: parseDecimal },
  { excelField: '议付金额FOB', table: 'biz_replenishment_orders', field: 'fob_amount', required: false, transform: parseDecimal },
  { excelField: '议付金额CIF', table: 'biz_replenishment_orders', field: 'cif_amount', required: false, transform: parseDecimal },
  { excelField: '议付金额', table: 'biz_replenishment_orders', field: 'negotiation_amount', required: false, transform: parseDecimal },
  { excelField: 'Wayfair SPO', table: 'biz_replenishment_orders', field: 'wayfair_spo', required: false },
  { excelField: '特殊货物体积', table: 'biz_replenishment_orders', field: 'special_cargo_volume', required: false, transform: parseDecimal },
  { excelField: '是否查验', table: 'biz_replenishment_orders', field: 'inspection_required', required: false, transform: transformBoolean },
  { excelField: '是否装配件', table: 'biz_replenishment_orders', field: 'is_assembly', required: false, transform: transformBoolean },
  { excelField: '含要求打托产品', table: 'biz_replenishment_orders', field: 'pallet_required', required: false, transform: transformBoolean },

  // ========================================
  // 货柜表 (biz_containers)
  // ========================================
  { excelField: '集装箱号', table: 'biz_containers', field: 'container_number', required: true },
  { excelField: '柜型', table: 'biz_containers', field: 'container_type_code', required: false },
  { excelField: '货物描述', table: 'biz_containers', field: 'cargo_description', required: false },
  { excelField: '封条号', table: 'biz_containers', field: 'seal_number', required: false },
  { excelField: '是否查验', table: 'biz_containers', field: 'inspection_required', required: false, transform: transformBoolean },
  { excelField: '是否开箱', table: 'biz_containers', field: 'is_unboxing', required: false, transform: transformBoolean },
  { excelField: '物流状态', table: 'biz_containers', field: 'logistics_status', required: false, transform: transformLogisticsStatus },
  { excelField: '毛重', table: 'biz_containers', field: 'gross_weight', required: false, transform: parseDecimal },
  { excelField: '净重', table: 'biz_containers', field: 'net_weight', required: false, transform: parseDecimal },
  { excelField: '体积(m3)', table: 'biz_containers', field: 'cbm', required: false, transform: parseDecimal },
  { excelField: '箱数', table: 'biz_containers', field: 'packages', required: false, transform: parseDecimal },
  { excelField: '是否含打托产品', table: 'biz_containers', field: 'requires_pallet', required: false, transform: transformBoolean },
  { excelField: '是否装配件', table: 'biz_containers', field: 'requires_assembly', required: false, transform: transformBoolean },

  // ========================================
  // 海运信息表 (process_sea_freight)
  // ========================================
  { excelField: '提单号', table: 'process_sea_freight', field: 'bill_of_lading_number', required: false },
  { excelField: '航次', table: 'process_sea_freight', field: 'voyage_number', required: false },
  { excelField: '船名', table: 'process_sea_freight', field: 'vessel_name', required: false },
  { excelField: '船公司', table: 'process_sea_freight', field: 'shipping_company_id', required: false },
  { excelField: '起运港', table: 'process_sea_freight', field: 'port_of_loading', required: false },
  { excelField: '目的港', table: 'process_sea_freight', field: 'port_of_discharge', required: false },
  { excelField: '途经港', table: 'process_sea_freight', field: 'transit_port_code', required: false },
  { excelField: '起运港货代公司', table: 'process_sea_freight', field: 'freight_forwarder_id', required: false },
  { excelField: '运输方式', table: 'process_sea_freight', field: 'transport_mode', required: false },
  { excelField: '出运日期', table: 'process_sea_freight', field: 'shipment_date', required: false, transform: parseDate },
  { excelField: '装船日期', table: 'process_sea_freight', field: 'shipment_date', required: false, transform: parseDate },
  { excelField: '预计到港日期', table: 'process_sea_freight', field: 'eta', required: false, transform: parseDate },
  { excelField: '实际到港日期', table: 'process_sea_freight', field: 'ata', required: false, transform: parseDate },
  { excelField: '海运费币种', table: 'process_sea_freight', field: 'freight_currency', required: false },
  { excelField: '标准海运费金额', table: 'process_sea_freight', field: 'standard_freight_amount', required: false, transform: parseDecimal },
  { excelField: '母船船名', table: 'process_sea_freight', field: 'mother_vessel_name', required: false },
  { excelField: '母船船次', table: 'process_sea_freight', field: 'mother_voyage_number', required: false },
  { excelField: '母船出运日期', table: 'process_sea_freight', field: 'mother_shipment_date', required: false, transform: parseDate },
  { excelField: 'MBL Number', table: 'process_sea_freight', field: 'mbl_number', required: false },
  { excelField: 'HBL Number', table: 'process_sea_freight', field: 'hbl_number', required: false },
  { excelField: 'AMS Number', table: 'process_sea_freight', field: 'ams_number', required: false },
  { excelField: '放单日期', table: 'process_sea_freight', field: 'document_release_date', required: false, transform: parseDate },
  { excelField: '进港日期', table: 'process_sea_freight', field: 'port_entry_date', required: false, transform: parseDate },
  { excelField: 'MBL SCAC', table: 'process_sea_freight', field: 'mbl_scac', required: false },
  { excelField: 'HBL SCAC', table: 'process_sea_freight', field: 'hbl_scac', required: false },
  { excelField: '进火车堆场日期', table: 'process_sea_freight', field: 'rail_yard_entry_date', required: false, transform: parseDate },
  { excelField: '进卡车堆场日期', table: 'process_sea_freight', field: 'truck_yard_entry_date', required: false, transform: parseDate },
  { excelField: '目的地', table: 'process_sea_freight', field: 'port_of_discharge', required: false },

  // ========================================
  // 港口操作表 (process_port_operations)
  // ========================================
  { excelField: 'ETA修正', table: 'process_port_operations', field: 'eta_correction', required: false, transform: parseDate },
  { excelField: '预计到港日期', table: 'process_port_operations', field: 'eta_dest_port', required: false, transform: parseDate },
  { excelField: '目的港到达日期', table: 'process_port_operations', field: 'ata_dest_port', required: false, transform: parseDate },
  { excelField: '目的港卸船/火车日期', table: 'process_port_operations', field: 'dest_port_unload_date', required: false, transform: parseDate },
  { excelField: '途经港到达日期', table: 'process_port_operations', field: 'transit_arrival_date', required: false, transform: parseDate },
  { excelField: '最后免费日期', table: 'process_port_operations', field: 'last_free_date', required: false, transform: parseDate },
  { excelField: '清关状态', table: 'process_port_operations', field: 'customs_status', required: false },
  { excelField: '计划清关日期', table: 'process_port_operations', field: 'planned_customs_date', required: false, transform: parseDate },
  { excelField: '实际清关日期', table: 'process_port_operations', field: 'actual_customs_date', required: false, transform: parseDate },
  { excelField: '目的港清关公司', table: 'process_port_operations', field: 'customs_broker_code', required: false },
  { excelField: 'ISF申报状态', table: 'process_port_operations', field: 'isf_status', required: false },
  { excelField: 'ISF申报日期', table: 'process_port_operations', field: 'isf_declaration_date', required: false, transform: parseDate },
  { excelField: '目的港码头', table: 'process_port_operations', field: 'gate_in_terminal', required: false },
  { excelField: '异常原因(清关信息表）', table: 'process_port_operations', field: 'customs_remarks', required: false },
  { excelField: '清关单据状态', table: 'process_port_operations', field: 'document_status', required: false },
  { excelField: '全部生成日期', table: 'process_port_operations', field: 'all_generated_date', required: false, transform: parseDate },
  { excelField: '免堆期(天)', table: 'process_port_operations', field: 'free_storage_days', required: false, transform: parseDecimal },
  { excelField: '场内免箱期(天)', table: 'process_port_operations', field: 'free_detention_days', required: false, transform: parseDecimal },
  { excelField: '场外免箱期(天)', table: 'process_port_operations', field: 'free_off_terminal_days', required: false, transform: parseDecimal },
  { excelField: '传递日期', table: 'process_port_operations', field: 'document_transfer_date', required: false, transform: parseDate },
  { excelField: '备注(物流信息表）', table: 'process_port_operations', field: 'remarks', required: false },

  // ========================================
  // 拖卡运输表 (process_trucking_transport)
  // ========================================
  { excelField: '是否预提', table: 'process_trucking_transport', field: 'is_pre_pickup', required: false, transform: transformBoolean },
  { excelField: '目的港卡车', table: 'process_trucking_transport', field: 'carrier_company', required: false },
  { excelField: '提柜通知', table: 'process_trucking_transport', field: 'pickup_notification', required: false },
  { excelField: '货柜承运商', table: 'process_trucking_transport', field: 'carrier_company', required: false },
  { excelField: '司机姓名', table: 'process_trucking_transport', field: 'driver_name', required: false },
  { excelField: '司机电话', table: 'process_trucking_transport', field: 'driver_phone', required: false },
  { excelField: '车牌号', table: 'process_trucking_transport', field: 'truck_plate', required: false },
  { excelField: '最晚提柜日期', table: 'process_trucking_transport', field: 'last_pickup_date', required: false, transform: parseDate },
  { excelField: '计划提柜日期', table: 'process_trucking_transport', field: 'planned_pickup_date', required: false, transform: parseDate },
  { excelField: '提柜日期', table: 'process_trucking_transport', field: 'pickup_date', required: false, transform: parseDate },
  { excelField: '最晚送仓日期', table: 'process_trucking_transport', field: 'last_delivery_date', required: false, transform: parseDate },
  { excelField: '计划送仓日期', table: 'process_trucking_transport', field: 'planned_delivery_date', required: false, transform: parseDate },
  { excelField: '送仓日期', table: 'process_trucking_transport', field: 'delivery_date', required: false, transform: parseDate },
  { excelField: '提柜地点', table: 'process_trucking_transport', field: 'pickup_location', required: false },
  { excelField: '卸柜方式(计划)', table: 'process_trucking_transport', field: 'unload_mode_plan', required: false },

  // ========================================
  // 仓库操作表 (process_warehouse_operations)
  // ========================================
  { excelField: '入库仓库组', table: 'process_warehouse_operations', field: 'warehouse_group', required: false },
  { excelField: '仓库(计划)', table: 'process_warehouse_operations', field: 'planned_warehouse', required: false },
  { excelField: '仓库(实际)', table: 'process_warehouse_operations', field: 'actual_warehouse', required: false },
  { excelField: '计划卸柜日期', table: 'process_warehouse_operations', field: 'planned_unload_date', required: false, transform: parseDate },
  { excelField: '最晚卸柜日期', table: 'process_warehouse_operations', field: 'last_unload_date', required: false, transform: parseDate },
  { excelField: '卸空日期', table: 'process_warehouse_operations', field: 'unload_date', required: false, transform: parseDate },
  { excelField: '入库日期', table: 'process_warehouse_operations', field: 'warehouse_arrival_date', required: false, transform: parseDate },
  { excelField: '卸柜方式(实际)', table: 'process_warehouse_operations', field: 'unload_mode_actual', required: false },
  { excelField: '卸柜方式（实际）', table: 'process_warehouse_operations', field: 'unload_mode_actual', required: false },
  { excelField: 'WMS入库状态', table: 'process_warehouse_operations', field: 'wms_status', required: false },
  { excelField: 'EBS入库状态', table: 'process_warehouse_operations', field: 'ebs_status', required: false },
  { excelField: 'WMS Confirm Date', table: 'process_warehouse_operations', field: 'wms_confirm_date', required: false, transform: parseDate },
  { excelField: '卸柜门', table: 'process_warehouse_operations', field: 'unload_gate', required: false },
  { excelField: '卸柜公司', table: 'process_warehouse_operations', field: 'unload_company', required: false },
  { excelField: '备注(仓库信息表)', table: 'process_warehouse_operations', field: 'warehouse_remarks', required: false },

  // ========================================
  // 还空箱表 (process_empty_return)
  // ========================================
  { excelField: '最晚还箱日期', table: 'process_empty_return', field: 'last_return_date', required: false, transform: parseDate },
  { excelField: '计划还箱日期', table: 'process_empty_return', field: 'planned_return_date', required: false, transform: parseDate },
  { excelField: '还箱日期', table: 'process_empty_return', field: 'return_time', required: false, transform: parseDate },
  { excelField: '还箱地点', table: 'process_empty_return', field: 'return_terminal_name', required: false },
  { excelField: '通知取空日期', table: 'process_empty_return', field: 'notification_return_date', required: false, transform: parseDate },
  { excelField: '取空时间', table: 'process_empty_return', field: 'notification_return_time', required: false, transform: parseDate },
]
