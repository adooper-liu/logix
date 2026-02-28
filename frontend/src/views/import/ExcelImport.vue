<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Upload, Document, Download, Loading } from '@element-plus/icons-vue'
import * as XLSX from 'xlsx'
import axios from 'axios'
import { getPortCodeCached, preloadPortMappings } from '../../services/dictMapping'

// ==================== 类型定义 ====================

interface FieldMapping {
  excelField: string
  table: string
  field: string
  required: boolean
  transform?: (value: any) => any
}

// ==================== 响应式数据 ====================

const loading = ref(false)
const uploading = ref(false)
const uploadProgress = ref(0)
const selectedFile = ref<File | null>(null)

// 预览数据
const previewData = ref<any[]>([])
const previewColumns = ref<string[]>([])

// 导入结果
const importResult = reactive({
  total: 0,
  success: 0,
  failed: 0,
  errors: [] as string[]
})

// ==================== 字段映射配置 ====================

/**
 * Excel字段到数据库字段的完整映射
 * 基于 database/03_create_tables.sql 数据库表结构
 * 最后更新: 2026-02-26
 */
const FIELD_MAPPINGS: FieldMapping[] = [
  // ===== 备货单表 (biz_replenishment_orders) =====
  { excelField: '备货单号', table: 'biz_replenishment_orders', field: 'order_number', required: true },
  { excelField: '主备货单号', table: 'biz_replenishment_orders', field: 'main_order_number', required: false },
  { excelField: '销往国家', table: 'biz_replenishment_orders', field: 'sell_to_country', required: false },
  { excelField: '客户名称', table: 'biz_replenishment_orders', field: 'customer_name', required: false },
  { excelField: '备货单状态', table: 'biz_replenishment_orders', field: 'order_status', required: false, transform: transformOrderStatus },
  { excelField: '是否查验', table: 'biz_replenishment_orders', field: 'inspection_required', required: false, transform: transformBoolean },
  { excelField: '是否装配件', table: 'biz_replenishment_orders', field: 'is_assembly', required: false, transform: transformBoolean },
  { excelField: '采购贸易模式', table: 'biz_replenishment_orders', field: 'procurement_trade_mode', required: false },
  { excelField: '价格条款', table: 'biz_replenishment_orders', field: 'price_terms', required: false },
  { excelField: '特殊货物体积', table: 'biz_replenishment_orders', field: 'special_cargo_volume', required: false, transform: parseDecimal },
  { excelField: 'Wayfair SPO', table: 'biz_replenishment_orders', field: 'wayfair_spo', required: false },
  { excelField: '含要求打托产品', table: 'biz_replenishment_orders', field: 'pallet_required', required: false, transform: transformBoolean },
  { excelField: '箱数合计', table: 'biz_replenishment_orders', field: 'total_boxes', required: false, transform: parseDecimal },
  { excelField: '体积合计(m3)', table: 'biz_replenishment_orders', field: 'total_cbm', required: false, transform: parseDecimal },
  { excelField: '毛重合计(KG)', table: 'biz_replenishment_orders', field: 'total_gross_weight', required: false, transform: parseDecimal },
  { excelField: '出运总价', table: 'biz_replenishment_orders', field: 'shipment_total_value', required: false, transform: parseDecimal },
  { excelField: '议付金额FOB', table: 'biz_replenishment_orders', field: 'fob_amount', required: false, transform: parseDecimal },
  { excelField: '议付金额CIF', table: 'biz_replenishment_orders', field: 'cif_amount', required: false, transform: parseDecimal },
  { excelField: '议付金额', table: 'biz_replenishment_orders', field: 'negotiation_amount', required: false, transform: parseDecimal },

  // ===== 货柜表 (biz_containers) =====
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

  // ===== 海运表 (process_sea_freight) =====
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
  { excelField: 'MBL SCAC', table: 'process_sea_freight', field: 'mbl_scac', required: false },
  { excelField: 'HBL SCAC', table: 'process_sea_freight', field: 'hbl_scac', required: false },
  { excelField: '进火车堆场日期', table: 'process_sea_freight', field: 'rail_yard_entry_date', required: false, transform: parseDate },
  { excelField: '进卡车堆场日期', table: 'process_sea_freight', field: 'truck_yard_entry_date', required: false, transform: parseDate },

  // ===== 港口操作表 (process_port_operations) =====
  { excelField: 'ETA修正', table: 'process_port_operations', field: 'eta_correction', required: false, transform: parseDate },
  { excelField: '预计到港日期(目的港)', table: 'process_port_operations', field: 'eta_dest_port', required: false, transform: parseDate },
  { excelField: '实际到港日期(目的港)', table: 'process_port_operations', field: 'ata_dest_port', required: false, transform: parseDate },
  { excelField: '目的港卸船/火车日期', table: 'process_port_operations', field: 'dest_port_unload_date', required: false, transform: parseDate },
  { excelField: '计划清关日期', table: 'process_port_operations', field: 'planned_customs_date', required: false, transform: parseDate },
  { excelField: '实际清关日期', table: 'process_port_operations', field: 'actual_customs_date', required: false, transform: parseDate },
  { excelField: '目的港清关公司', table: 'process_port_operations', field: 'customs_broker_code', required: false },
  { excelField: '清关单据状态', table: 'process_port_operations', field: 'document_status', required: false },
  { excelField: '全部生成日期', table: 'process_port_operations', field: 'all_generated_date', required: false, transform: parseDate },
  { excelField: '异常原因(清关信息表）', table: 'process_port_operations', field: 'customs_remarks', required: false },
  { excelField: 'ISF申报状态', table: 'process_port_operations', field: 'isf_status', required: false },
  { excelField: 'ISF申报日期', table: 'process_port_operations', field: 'isf_declaration_date', required: false, transform: parseDate },
  { excelField: '传递日期', table: 'process_port_operations', field: 'document_transfer_date', required: false, transform: parseDate },
  { excelField: '免堆期(天)', table: 'process_port_operations', field: 'free_storage_days', required: false, transform: parseDecimal },
  { excelField: '场内免箱期(天)', table: 'process_port_operations', field: 'free_detention_days', required: false, transform: parseDecimal },
  { excelField: '场外免箱期(天)', table: 'process_port_operations', field: 'free_off_terminal_days', required: false, transform: parseDecimal },
  { excelField: '目的港码头', table: 'process_port_operations', field: 'gate_in_terminal', required: false },
  { excelField: '备注(物流信息表）', table: 'process_port_operations', field: 'remarks', required: false },

  // ===== 拖卡运输表 (process_trucking_transport) =====
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

  // ===== 仓库操作表 (process_warehouse_operations) =====
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

  // ===== 还空箱表 (process_empty_return) =====
  { excelField: '通知取空日期', table: 'process_empty_return', field: 'notification_return_date', required: false, transform: parseDate },
  { excelField: '取空时间', table: 'process_empty_return', field: 'notification_return_time', required: false, transform: parseDate },
  { excelField: '最晚还箱日期', table: 'process_empty_return', field: 'last_return_date', required: false, transform: parseDate },
  { excelField: '计划还箱日期', table: 'process_empty_return', field: 'planned_return_date', required: false, transform: parseDate },
  { excelField: '还箱日期', table: 'process_empty_return', field: 'return_time', required: false, transform: parseDate },
  { excelField: '还箱地点', table: 'process_empty_return', field: 'return_terminal_name', required: false },
  { excelField: '箱况', table: 'process_empty_return', field: 'container_condition', required: false },
]

// ==================== 字典映射 ====================

/**
 * 物流状态映射
 */
function transformLogisticsStatus(value: string): string {
  const map: Record<string, string> = {
    '未出运': 'not_shipped',
    '已装船': 'shipped',
    '在途': 'in_transit',
    '已到港': 'at_port',
    '已到中转港': 'at_port',          // 新增：已到中转港映射到已到港
    '已提柜': 'picked_up',
    '已卸柜': 'unloaded',
    '已还箱': 'returned_empty',
    '已取消': 'cancelled',
    // 其他可能的状态变体
    '待出运': 'not_shipped',
    '已发货': 'shipped',
    '运输途中': 'in_transit',
    '到达中转港': 'at_port',
    '到达目的港': 'at_port',
    '已提货': 'picked_up',
    '已卸货': 'unloaded',
    '已还空箱': 'returned_empty',
    '已完结': 'returned_empty'
  }
  return map[value] || value
}

/**
 * 订单状态映射
 */
function transformOrderStatus(value: string): string {
  const map: Record<string, string> = {
    '草稿': 'DRAFT',
    '已确认': 'CONFIRMED',
    '已出运': 'SHIPPED',
    '运输中': 'IN_TRANSIT',
    '已交付': 'DELIVERED',
    '已取消': 'CANCELLED',
    // 英文状态直接返回
    'DRAFT': 'DRAFT',
    'CONFIRMED': 'CONFIRMED',
    'SHIPPED': 'SHIPPED',
    'IN_TRANSIT': 'IN_TRANSIT',
    'DELIVERED': 'DELIVERED',
    'CANCELLED': 'CANCELLED'
  }
  return map[value] || value
}

/**
 * 布尔值转换
 */
function transformBoolean(value: any): boolean {
  if (value === null || value === undefined || value === '') return false
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value === 1
  if (typeof value === 'string') {
    return ['是', 'yes', 'true', '1', 'y'].includes(value.toLowerCase().trim())
  }
  return false
}

/**
 * 清关状态映射
 */
function transformCustomsStatus(value: string): string {
  const map: Record<string, string> = {
    '未开始': 'NOT_STARTED',
    '进行中': 'IN_PROGRESS',
    '已完成': 'COMPLETED',
    '失败': 'FAILED',
  }
  return map[value] || value
}

/**
 * ISF申报状态映射
 */
function transformISFStatus(value: string): string {
  const map: Record<string, string> = {
    '未申报': 'NOT_STARTED',
    '已提交': 'SUBMITTED',
    '已批准': 'APPROVED',
    '已拒绝': 'REJECTED',
  }
  return map[value] || value
}

// ==================== 工具函数 ====================

/**
 * 解析日期字符串 - 支持多种格式，避免时区转换问题
 */
function parseDate(value: any): string | null {
  if (!value) return null

  // Excel日期数字
  if (typeof value === 'number') {
    const date = new Date((value - 25569) * 86400 * 1000)
    return isNaN(date.getTime()) ? null : formatDateToLocal(date)
  }

  // 字符串日期
  const dateStr = String(value).trim()
  const dashDate = dateStr.replace(/\//g, '-')

  let date: Date | null = null

  // YYYY-MM-DD HH:mm:ss
  if (/^\d{4}-\d{1,2}-\d{1,2}\s+\d{1,2}:\d{1,2}:\d{1,2}$/.test(dashDate)) {
    date = parseLocalDate(dashDate)
  }
  // YYYY-MM-DD HH:mm
  else if (/^\d{4}-\d{1,2}-\d{1,2}\s+\d{1,2}:\d{1,2}$/.test(dashDate)) {
    date = parseLocalDate(dashDate + ':00')
  }
  // YYYY-MM-DD
  else if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(dashDate)) {
    date = parseLocalDate(dashDate)
  }
  // YYYY/MM/DD HH:mm:ss
  else if (/^\d{4}\/\d{1,2}\/\d{1,2}\s+\d{1,2}:\d{1,2}:\d{1,2}$/.test(dateStr)) {
    date = parseLocalDate(dateStr.replace(/\//g, '-'))
  }
  // YYYY/MM/DD
  else if (/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(dateStr)) {
    date = parseLocalDate(dateStr.replace(/\//g, '-'))
  }
  // YYYYMMDD
  else if (/^\d{8}$/.test(dateStr)) {
    const year = dateStr.substring(0, 4)
    const month = dateStr.substring(4, 6)
    const day = dateStr.substring(6, 8)
    date = parseLocalDate(`${year}-${month}-${day}`)
  }
  // DD-MM-YYYY 或 DD/MM/YYYY
  else if (/^\d{1,2}[-\/]\d{1,2}[-\/]\d{4}$/.test(dateStr)) {
    const parts = dateStr.split(/[-\/]/)
    if (parts.length === 3) {
      date = parseLocalDate(`${parts[2]}-${parts[1]}-${parts[0]}`)
    }
  }

  if (!date || isNaN(date.getTime())) {
    console.warn(`无法解析日期: ${value} (类型: ${typeof value})`)
    return null
  }

  return formatDateToLocal(date)
}

/**
 * 解析本地日期字符串，避免时区转换
 */
function parseLocalDate(dateStr: string): Date {
  const parts = dateStr.split(/[\s-:T]/)
  const year = parseInt(parts[0], 10)
  const month = parseInt(parts[1], 10) - 1
  const day = parseInt(parts[2], 10)
  const hour = parts[3] ? parseInt(parts[3], 10) : 0
  const minute = parts[4] ? parseInt(parts[4], 10) : 0
  const second = parts[5] ? parseInt(parts[5], 10) : 0

  return new Date(year, month, day, hour, minute, second)
}

/**
 * 格式化日期为本地时间字符串，避免时区偏移
 */
function formatDateToLocal(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  const second = String(date.getSeconds()).padStart(2, '0')

  return `${year}-${month}-${day} ${hour}:${minute}:${second}`
}

/**
 * 解析数字/小数
 */
function parseDecimal(value: any): number | null {
  if (value === null || value === undefined || value === '') return null
  const strValue = String(value).replace(/,/g, '').replace(/[¥$€£]/g, '')
  const num = parseFloat(strValue)
  return isNaN(num) ? null : num
}

// ==================== 文件处理 ====================

/**
 * 处理文件选择
 */
const handleFileChange = (uploadFile: any) => {
  selectedFile.value = uploadFile.raw
  previewData.value = []
  importResult.total = 0
  importResult.success = 0
  importResult.failed = 0
  importResult.errors = []
}

/**
 * 解析Excel文件
 */
const parseExcel = async () => {
  if (!selectedFile.value) {
    ElMessage.error('请先选择文件')
    return
  }

  loading.value = true

  try {
    const data = await selectedFile.value.arrayBuffer()
    const workbook = XLSX.read(data, { type: 'array' })

    // 获取第一个工作表
    const firstSheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[firstSheetName]

    // 转换为JSON
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]

    // 第一行是表头
    const headers = jsonData[0] as string[]
    previewColumns.value = headers

    // 数据行
    const dataRows = jsonData.slice(1)

    // 转换为对象数组
    previewData.value = dataRows.map(row => {
      const obj: Record<string, any> = {}
      headers.forEach((header, index) => {
        obj[header] = row[index]
      })
      return obj
    })

    ElMessage.success(`成功解析 ${previewData.value.length} 条数据`)

  } catch (error: any) {
    console.error('解析Excel失败:', error)
    ElMessage.error(`解析Excel失败: ${error.message}`)
  } finally {
    loading.value = false
  }
}

/**
 * 将中文港口名称转换为标准 port_code
 */
const convertPortNameToCode = async (portName: string): Promise<string> => {
  if (!portName) return portName

  // 如果已经是标准代码格式(如 CNSHG、USLAX),直接返回
  if (/^[A-Z]{2}[A-Z]{3}$/.test(portName)) {
    return portName
  }

  // 否则尝试从缓存或API获取标准代码
  const portCode = await getPortCodeCached(portName)
  return portCode || portName // 如果找不到映射,返回原名称
}

/**
 * 将Excel行数据拆分到各数据库表
 * 支持多港经停场景，生成多条港口操作记录
 */
const splitRowToTables = async (row: any): Promise<Record<string, any>> => {
  const tables: Record<string, any> = {
    biz_replenishment_orders: {},
    biz_containers: {},
    process_sea_freight: {},
    process_port_operations: [], // 改为数组，支持多条港口记录
    process_trucking_transport: {},
    process_warehouse_operations: {},
    process_empty_return: {},
  }

  const containerNumber = row['集装箱号'] || ''
  const orderNumber = row['备货单号'] || ''

  // ===== 先处理所有字段映射（包括还空箱） =====
  FIELD_MAPPINGS.forEach(mapping => {
    const excelValue = row[mapping.excelField]

    // 跳过空值
    if (excelValue === null || excelValue === undefined || excelValue === '') {
      return
    }

    // 跳过港口操作字段（后面单独处理）
    if (mapping.table === 'process_port_operations') {
      return
    }

    // 应用转换函数
    const value = mapping.transform ? mapping.transform(excelValue) : excelValue

    // 添加到对应表
    if (tables[mapping.table]) {
      tables[mapping.table][mapping.field] = value
      console.log(`[splitRowToTables] 映射字段: ${mapping.excelField} -> ${mapping.table}.${mapping.field}`, value)
    }
  })

  // ===== 生成多港口操作记录 =====
  const portOperations: any[] = []
  let portSequence = 1

  // 转换港口名称为标准代码
  const originPortCode = await convertPortNameToCode(row['起运港'])
  const transitPortCode = await convertPortNameToCode(row['途经港'])
  const destPortCode = await convertPortNameToCode(row['目的港'])

  // 1. 起运港 (origin)
  const originPort = row['起运港']
  if (originPort) {
    portOperations.push({
      container_number: containerNumber,
      port_type: 'origin',
      port_code: originPortCode,
      port_name: originPort,
      port_sequence: portSequence++
    })
    console.log('[splitRowToTables] 添加起运港:', originPort, '代码:', originPortCode)
  }

  // 2. 途经港 (transit)
  const transitPort = row['途经港']
  if (transitPort) {
    portOperations.push({
      container_number: containerNumber,
      port_type: 'transit',
      port_code: transitPortCode,
      port_name: transitPort,
      port_sequence: portSequence++,
      transit_arrival_date: parseDate(row['途经港到达日期'])
    })
    console.log('[splitRowToTables] 添加途经港:', transitPort, '代码:', transitPortCode, '到达日期:', row['途经港到达日期'])
  }

  // 3. 目的港 (destination)
  const destPort = row['目的港']
  if (destPort) {
    const destPortOp: any = {
      container_number: containerNumber,
      port_type: 'destination',
      port_code: destPortCode,
      port_name: destPort,
      port_sequence: portSequence++
    }

    // 目的港相关日期字段
    if (row['预计到港日期']) destPortOp.eta_dest_port = parseDate(row['预计到港日期'])
    if (row['目的港到达日期']) destPortOp.ata_dest_port = parseDate(row['目的港到达日期'])
    if (row['目的港卸船/火车日期']) destPortOp.dest_port_unload_date = parseDate(row['目的港卸船/火车日期'])
    if (row['最后免费日期']) destPortOp.last_free_date = parseDate(row['最后免费日期'])

    // 清关相关字段
    if (row['清关状态']) destPortOp.customs_status = row['清关状态']
    if (row['计划清关日期']) destPortOp.planned_customs_date = parseDate(row['计划清关日期'])
    if (row['实际清关日期']) destPortOp.actual_customs_date = parseDate(row['实际清关日期'])
    if (row['目的港清关公司']) destPortOp.customs_broker_code = row['目的港清关公司']
    if (row['ISF申报状态']) destPortOp.isf_status = row['ISF申报状态']
    if (row['ISF申报日期']) destPortOp.isf_declaration_date = parseDate(row['ISF申报日期'])
    if (row['目的港码头']) destPortOp.gate_in_terminal = row['目的港码头']
    if (row['异常原因(清关信息表）']) destPortOp.customs_remarks = row['异常原因(清关信息表）']

    portOperations.push(destPortOp)
    console.log('[splitRowToTables] 添加目的港:', destPort, '代码:', destPortCode)
  }

  tables.process_port_operations = portOperations

  // ===== 更新海运表的港口字段为标准代码 =====
  if (tables.process_sea_freight) {
    if (originPortCode) {
      tables.process_sea_freight.port_of_loading = originPortCode
    }
    if (destPortCode) {
      tables.process_sea_freight.port_of_discharge = destPortCode
    }
    if (transitPortCode) {
      tables.process_sea_freight.transit_port_code = transitPortCode
    }
  }

  // ===== 添加关联关系 =====
  if (orderNumber) {
    tables.biz_containers.order_number = orderNumber
  }

  if (containerNumber) {
    tables.process_sea_freight.container_number = containerNumber
    tables.process_trucking_transport.container_number = containerNumber
    tables.process_warehouse_operations.container_number = containerNumber
    tables.process_empty_return.container_number = containerNumber
  }

  // ===== 调试日志：输出各表字段 =====
  console.log('[splitRowToTables] 备货单字段:', Object.keys(tables.biz_replenishment_orders))
  console.log('[splitRowToTables] 货柜字段:', Object.keys(tables.biz_containers))
  console.log('[splitRowToTables] 海运字段:', Object.keys(tables.process_sea_freight))
  console.log('[splitRowToTables] 港口操作数量:', tables.process_port_operations.length)
  console.log('[splitRowToTables] 拖卡字段:', Object.keys(tables.process_trucking_transport))
  console.log('[splitRowToTables] 仓库字段:', Object.keys(tables.process_warehouse_operations))
  console.log('[splitRowToTables] 还空箱字段:', Object.keys(tables.process_empty_return))
  console.log('[splitRowToTables] 还空箱数据:', tables.process_empty_return)

  return tables
}

/**
 * 上传并导入数据
 */
const uploadAndImport = async () => {
  if (previewData.value.length === 0) {
    ElMessage.warning('请先解析Excel文件')
    return
  }

  await ElMessageBox.confirm(
    `确定要导入 ${previewData.value.length} 条数据到数据库吗？`,
    '确认导入',
    {
      confirmButtonText: '确定导入',
      cancelButtonText: '取消',
      type: 'warning',
    }
  )

  uploading.value = true
  importResult.total = previewData.value.length
  importResult.success = 0
  importResult.failed = 0
  importResult.errors = []

  const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api/v1',
    timeout: 120000
  })

  try {
    // 批量处理数据，每次批量导入50条
    const batchSize = 50
    for (let i = 0; i < previewData.value.length; i += batchSize) {
      const batch = previewData.value.slice(i, i + batchSize)

      // 将批次数据转换为批量导入格式(异步,因为splitRowToTables现在是async)
      const batchData = await Promise.all(
        batch.map(async row => {
          const tables = await splitRowToTables(row)
          return { tables }
        })
      )

      console.log(`[ExcelImport] 准备导入批次 ${i}-${i + batch.length}，共 ${batchData.length} 条数据`)
      console.log(`[ExcelImport] 第一条数据示例:`, JSON.stringify(batchData[0], null, 2))
      console.log(`[ExcelImport] 第一条数据港口操作:`, JSON.stringify(batchData[0].tables.port_operations, null, 2))
      console.log(`[ExcelImport] 第一条数据还空箱:`, JSON.stringify(batchData[0].tables.empty_returns, null, 2))

      try {
        // 调用后端批量导入API
        const response = await api.post('/import/excel/batch', {
          batch: batchData,
          useSnakeCase: true // 告诉后端使用 snake_case 字段名
        })

        if (response.data.success) {
          const result = response.data.data
          importResult.success += result.success || 0
          importResult.failed += result.failed || 0

          // 收集错误信息
          if (result.errors && result.errors.length > 0) {
            result.errors.forEach((error: any) => {
              const rowNumber = i + error.rowIndex
              importResult.errors.push(`第 ${rowNumber} 行: ${error.error || '导入失败'}`)
            })
          }
        }
      } catch (error: any) {
        // 批次导入失败，记录所有行失败
        const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message || '未知错误'
        for (let j = 0; j < batch.length; j++) {
          importResult.failed++
          importResult.errors.push(`第 ${i + j + 1} 行: ${errorMsg}`)
        }
      }

      // 更新进度
      uploadProgress.value = Math.min(100, Math.round(((i + batch.length) / previewData.value.length) * 100))
    }

    if (importResult.success > 0) {
      ElMessage.success(`导入完成！成功 ${importResult.success} 条，失败 ${importResult.failed} 条`)
    } else {
      ElMessage.error('导入失败，请查看错误详情')
    }

  } catch (error: any) {
    console.error('导入失败:', error)
    ElMessage.error(`导入失败: ${error.message}`)
  } finally {
    uploading.value = false
    uploadProgress.value = 0
  }
}

/**
 * 下载导入模板
 */
const downloadTemplate = () => {
  const templateData: Record<string, any>[] = [{
    '备货单号': 'ORD202600001',
    '主备货单号': '',
    '销往国家': '美国',
    '客户名称': '示例客户',
    '备货单状态': 'DRAFT',
    '采购贸易模式': '常规',
    '价格条款': 'FOB',
    '箱数合计': 100,
    '体积合计(m3)': 25.5,
    '毛重合计(KG)': 1500,
    '出运总价': 50000,
    '议付金额FOB': 45000,
    '议付金额': '',
    '集装箱号': 'CONT202600001',
    '柜型': '40HQ',
    '货物描述': '示例货物',
    '封条号': 'SEAL001',
    '是否查验': '否',
    '是否开箱': '否',
    '物流状态': '未出运',
    '毛重': 1500,
    '净重': 1400,
    '体积(m3)': 25.5,
    '箱数': 100,
    '提单号': 'BL202600001',
    '航次号': 'V001',
    '船名': '示例船',
    '船公司': '马士基',
    '起运港': '上海港',
    '目的港': '洛杉矶港',
    '中转港': '',
    '起运港货代公司': '',
    '运输方式': '海运',
    '装船日期': '2026-02-20',
    '预计到港日期': '2026-03-15',
    '实际到港日期': '',
    '目的港码头': '',
    '预计到港日期(港口)': '2026-03-15',
    '目的港卸船日期': '',
    '最后免费日期': '2026-03-20',
    '清关状态': '进行中',
    '计划清关日期': '2026-03-16',
    '实际清关日期': '',
    'ISF申报状态': '已提交',
    'ISF申报日期': '2026-02-15',
    '是否预提': '否',
    '目的港卡车': '',
    '提柜通知': '',
    '货柜承运商': '',
    '司机姓名': '',
    '司机电话': '',
    '车牌号': '',
    '计划提柜日期': '',
    '提柜日期': '',
    '计划送仓日期': '',
    '送仓日期': '',
    '提柜地点': '',
    '送达地点': '',
    '仓库(计划)': '',
    '仓库(实际)': '',
    '计划卸柜日期': '',
    '卸空日期': '',
    '入库日期': '',
    '卸柜方式（实际）': '',
    'WMS入库状态': '',
    'EBS入库状态': '',
    '计划还箱日期': '',
    '还箱日期': '',
    '还箱地点': '',
  }]

  const worksheet = XLSX.utils.json_to_sheet(templateData)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, '导入模板')
  XLSX.writeFile(workbook, '物流数据导入模板.xlsx')
  ElMessage.success('模板下载成功')
}

// 组件挂载时预加载端口映射
onMounted(async () => {
  await preloadPortMappings()
})
</script>

<template>
  <div class="excel-import-container">
    <el-card class="upload-card">
      <template #header>
        <div class="card-header">
          <span class="title">
            <el-icon><Document /></el-icon>
            Excel数据导入
          </span>
          <el-button type="primary" :icon="Download" @click="downloadTemplate">
            下载模板
          </el-button>
        </div>
      </template>

      <!-- 文件上传区域 -->
      <div class="upload-section">
        <el-upload
          class="upload-dragger"
          drag
          :auto-upload="false"
          :on-change="handleFileChange"
          :show-file-list="true"
          accept=".xlsx,.xls"
          :limit="1"
        >
          <el-icon class="el-icon--upload"><Upload /></el-icon>
          <div class="el-upload__text">
            将文件拖到此处，或<em>点击上传</em>
          </div>
          <template #tip>
            <div class="el-upload__tip">
              支持 .xlsx 和 .xls 格式，单次最多导入 1000 条数据
            </div>
          </template>
        </el-upload>

        <div class="action-buttons">
          <el-button
            type="primary"
            :loading="loading"
            :disabled="!selectedFile"
            @click="parseExcel"
          >
            <el-icon v-if="loading"><Loading /></el-icon>
            {{ loading ? '解析中...' : '解析Excel' }}
          </el-button>

          <el-button
            type="success"
            :loading="uploading"
            :disabled="previewData.length === 0"
            @click="uploadAndImport"
          >
            <el-icon v-if="uploading"><Loading /></el-icon>
            {{ uploading ? '导入中...' : '导入数据库' }}
          </el-button>
        </div>
      </div>

      <!-- 导入进度 -->
      <div v-if="uploading" class="progress-section">
        <el-progress
          :percentage="uploadProgress"
          :status="importResult.failed > 0 ? 'exception' : 'success'"
        />
        <div class="progress-info">
          已处理 {{ importResult.success + importResult.failed }} / {{ importResult.total }} 条
          <span class="success-count">成功: {{ importResult.success }}</span>
          <span class="failed-count">失败: {{ importResult.failed }}</span>
        </div>
      </div>
    </el-card>

    <!-- 数据预览表格 -->
    <el-card v-if="previewData.length > 0" class="preview-card">
      <template #header>
        <div class="card-header">
          <span class="title">数据预览 ({{ previewData.length }} 条)</span>
        </div>
      </template>

      <el-table
        :data="previewData.slice(0, 10)"
        border
        stripe
        max-height="500"
        style="width: 100%"
      >
        <el-table-column
          v-for="column in previewColumns"
          :key="column"
          :prop="column"
          :label="column"
          min-width="120"
          show-overflow-tooltip
        />
      </el-table>

      <div v-if="previewData.length > 10" class="more-data-tip">
        仅显示前 10 条数据，实际将导入全部 {{ previewData.length }} 条
      </div>
    </el-card>

    <!-- 导入结果 -->
    <el-card v-if="importResult.total > 0" class="result-card">
      <template #header>
        <div class="card-header">
          <span class="title">导入结果</span>
        </div>
      </template>

      <el-alert
        :title="`导入完成！成功 ${importResult.success} 条，失败 ${importResult.failed} 条`"
        :type="importResult.failed > 0 ? 'warning' : 'success'"
        :closable="false"
        show-icon
      />

      <div v-if="importResult.errors.length > 0" class="error-list">
        <el-collapse>
          <el-collapse-item title="错误详情" name="errors">
            <el-scrollbar max-height="300">
              <ul>
                <li v-for="(error, index) in importResult.errors" :key="index" class="error-item">
                  {{ error }}
                </li>
              </ul>
            </el-scrollbar>
          </el-collapse-item>
        </el-collapse>
      </div>
    </el-card>
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.excel-import-container {
  padding: 20px;
  background: #f5f7fa;
  min-height: calc(100vh - 100px);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;

  .title {
    font-size: 18px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 8px;
  }
}

.upload-card,
.preview-card,
.result-card {
  margin-bottom: 20px;
}

.upload-section {
  padding: 20px;
}

.upload-dragger {
  margin-bottom: 20px;
}

.action-buttons {
  display: flex;
  gap: 12px;
  justify-content: center;
  padding-top: 20px;
  border-top: 1px solid #ebeef5;
}

.progress-section {
  margin-top: 20px;
  padding: 20px;
  background: #f9fafc;
  border-radius: 8px;
}

.progress-info {
  margin-top: 12px;
  display: flex;
  gap: 16px;
  font-size: 14px;
  color: $text-regular;
}

.success-count {
  color: $success-color;
  font-weight: 600;
}

.failed-count {
  color: $danger-color;
  font-weight: 600;
}

.more-data-tip {
  text-align: center;
  padding: 12px;
  color: $text-secondary;
  font-size: 14px;
}

.error-list {
  margin-top: 20px;
}

.error-item {
  padding: 8px 12px;
  background: #fef0f0;
  color: $danger-color;
  border-radius: 4px;
  margin-bottom: 8px;
}

:deep(.el-upload-dragger) {
  padding: 40px;
}
</style>
