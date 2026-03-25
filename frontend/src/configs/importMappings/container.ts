/**
 * 货柜导入字段映射配置（用于通用导入组件）
 *
 * 使用方式：
 * import { UniversalImport } from '@/components/common/UniversalImport'
 * import { CONTAINER_FIELD_MAPPINGS } from '@/configs/importMappings/container'
 *
 * <UniversalImport
 *   title="货柜数据导入"
 *   :field-mappings="CONTAINER_FIELD_MAPPINGS"
 *   api-endpoint="/api/import/container"
 * />
 */

import type { FieldMapping } from '@/components/common/UniversalImport'
import { parseBoolean, parseDate, parseDecimal } from '@/components/common/UniversalImport'

// ==================== 转换函数 ====================

function transformOrderStatus(value: unknown): string | null {
  if (!value) return null
  const statusMap: Record<string, string> = {
    待审核: 'PENDING',
    已审核: 'APPROVED',
    已取消: 'CANCELLED',
    已完成: 'COMPLETED',
  }
  const str = String(value).trim()
  return statusMap[str] || str
}

function transformLogisticsStatus(value: unknown): string | null {
  if (!value) return null
  const statusMap: Record<string, string> = {
    已装柜: 'LOADED',
    运输中: 'IN_TRANSIT',
    已到港: 'ARRIVED',
    已清关: 'CUSTOMS_CLEARED',
    已送达: 'DELIVERED',
  }
  const str = String(value).trim()
  return statusMap[str] || str
}

// ==================== 字段映射配置 ====================

export const CONTAINER_FIELD_MAPPINGS: FieldMapping[] = [
  // ===== 备货单表 (biz_replenishment_orders) =====
  {
    excelField: '备货单号',
    table: 'biz_replenishment_orders',
    field: 'order_number',
    required: true,
  },
  {
    excelField: '主备货单号',
    table: 'biz_replenishment_orders',
    field: 'main_order_number',
    required: false,
  },
  {
    excelField: '销往国家',
    table: 'biz_replenishment_orders',
    field: 'sell_to_country',
    required: false,
    aliases: ['进口国'],
    transform: (value: any, row?: Record<string, any>) => {
      // 如果 Excel 中有值，直接使用
      if (value) return value

      // 如果 Excel 中无值，尝试从客户名称自动填充
      if (row?.customer_name) {
        const customerName = String(row.customer_name)
        const countryKeywords: Record<string, string> = {
          美国: '美国',
          US: '美国',
          USA: '美国',
          英国: '英国',
          UK: '英国',
          德国: '德国',
          DE: '德国',
          法国: '法国',
          FR: '法国',
          日本: '日本',
          JP: '日本',
          澳大利亚: '澳大利亚',
          AU: '澳大利亚',
          加拿大: '加拿大',
          CA: '加拿大',
        }
        for (const [keyword, country] of Object.entries(countryKeywords)) {
          if (customerName.includes(keyword)) {
            console.log(`[ContainerImport] 根据客户名称自动填充国家：${customerName} -> ${country}`)
            return country
          }
        }
      }

      return null
    },
  },
  {
    excelField: '客户名称',
    table: 'biz_replenishment_orders',
    field: 'customer_name',
    required: false,
  },
  {
    excelField: '备货单状态',
    table: 'biz_replenishment_orders',
    field: 'order_status',
    required: false,
    transform: transformOrderStatus,
  },
  {
    excelField: '是否查验',
    table: 'biz_replenishment_orders',
    field: 'inspection_required',
    required: false,
    transform: parseBoolean,
  },
  {
    excelField: '是否装配件',
    table: 'biz_replenishment_orders',
    field: 'is_assembly',
    required: false,
    transform: parseBoolean,
  },
  {
    excelField: '箱数合计',
    table: 'biz_replenishment_orders',
    field: 'total_boxes',
    required: false,
    transform: parseDecimal,
  },
  {
    excelField: '体积合计 (m3)',
    table: 'biz_replenishment_orders',
    field: 'total_cbm',
    required: false,
    aliases: ['体积合计(m3)', '体积合计（m3）', '体积合计'],
    transform: parseDecimal,
  },
  {
    excelField: '毛重合计 (KG)',
    table: 'biz_replenishment_orders',
    field: 'total_gross_weight',
    required: false,
    aliases: ['毛重合计(KG)', '毛重合计（KG）', '毛重合计'],
    transform: parseDecimal,
  },

  // ===== 货柜表 (biz_containers) =====
  {
    excelField: '集装箱号',
    table: 'biz_containers',
    field: 'container_number',
    required: true,
    aliases: [
      '箱号(集装箱号)', // 半角括号无空格 - Excel实际列名
      '箱号 (集装箱号)', // 半角括号有空格
      '箱号（集装箱号）', // 全角括号
      '箱号', // 简化版本
    ],
  },
  {
    excelField: '柜型',
    table: 'biz_containers',
    field: 'container_type_code',
    required: false,
  },
  {
    excelField: '货物描述',
    table: 'biz_containers',
    field: 'cargo_description',
    required: false,
    aliases: ['货品描述', '产品描述', '货物名称', '品名'],
  },
  {
    excelField: '封条号',
    table: 'biz_containers',
    field: 'seal_number',
    required: false,
    aliases: ['铅封号', 'seal_number', '封条编号'],
  },
  {
    excelField: '是否查验',
    table: 'biz_containers',
    field: 'inspection_required',
    required: false,
    transform: parseBoolean,
  },
  {
    excelField: '物流状态',
    table: 'biz_containers',
    field: 'logistics_status',
    required: false,
    transform: transformLogisticsStatus,
    aliases: ['运输状态', '货物状态', '配送状态'],
  },
  {
    excelField: '毛重',
    table: 'biz_containers',
    field: 'gross_weight',
    required: false,
    transform: parseDecimal,
    aliases: ['毛重(KG)', '毛重（KG）', '货物毛重', '总重量'],
  },
  {
    excelField: '净重',
    table: 'biz_containers',
    field: 'net_weight',
    required: false,
    transform: parseDecimal,
    aliases: ['净重(KG)', '净重（KG）', '货物净重', '纯重'],
  },
  {
    excelField: '体积 (m3)',
    table: 'biz_containers',
    field: 'cbm',
    required: false,
    transform: parseDecimal,
    aliases: ['体积(m3)', '体积（m3）', '体积'],
  },

  // ===== 海运表 (process_sea_freight) =====
  {
    excelField: '提单号',
    table: 'process_sea_freight',
    field: 'bill_of_lading_number',
    required: false,
  },
  {
    excelField: '航次',
    table: 'process_sea_freight',
    field: 'voyage_number',
    required: false,
  },
  {
    excelField: '船名',
    table: 'process_sea_freight',
    field: 'vessel_name',
    required: false,
  },
  {
    excelField: '起运港',
    table: 'process_sea_freight',
    field: 'port_of_loading',
    required: false,
  },
  {
    excelField: '目的港',
    table: 'process_sea_freight',
    field: 'port_of_discharge',
    required: false,
    aliases: ['目的港名称', '目的港。名称'],
  },
  {
    excelField: '船公司',
    table: 'process_sea_freight',
    field: 'shipping_company_id',
    required: false,
    aliases: ['船公司名称', '船公司代码', '船公司。编码', '船公司。名称'],
  },
  {
    excelField: '起运港货代公司',
    table: 'process_sea_freight',
    field: 'freight_forwarder_id',
    required: false,
    aliases: ['起运港货代公司名称', '起运港货代公司编码', '货代', '货代公司', '货代公司名称'],
  },
  {
    excelField: '出运日期',
    table: 'biz_replenishment_orders',
    field: 'expected_ship_date',
    required: false,
    transform: parseDate,
  },
  {
    excelField: '出运日期',
    table: 'process_sea_freight',
    field: 'shipment_date',
    required: false,
    transform: parseDate,
    aliases: ['装船日期', '实际装船时间'],
  },
  {
    excelField: '实际装船时间',
    table: 'process_sea_freight',
    field: 'actual_loading_date',
    required: false,
    transform: parseDate,
    aliases: ['装船日期', '出运日期'],
  },
  {
    excelField: '预计到港日期',
    table: 'process_sea_freight',
    field: 'eta',
    required: false,
    transform: parseDate,
    aliases: ['预计到港日期(ETA)', '预计到港日期 (ETA)', 'ETA'],
  },
  {
    excelField: '实际到港日期',
    table: 'process_sea_freight',
    field: 'ata',
    required: false,
    transform: parseDate,
    aliases: ['实际到港日期(ATA)', '实际到港日期 (ATA)', 'ATA', '到港日期'],
  },
  {
    excelField: 'MBL Number',
    table: 'process_sea_freight',
    field: 'mbl_number',
    required: false,
    aliases: ['MBL NO.', 'MBL NO', 'MBL', '主提单号'],
  },
  {
    excelField: 'HBL Number',
    table: 'process_sea_freight',
    field: 'hbl_number',
    required: false,
    aliases: ['HBL NO.', 'HBL NO', 'HBL', '分提单号'],
  },

  // ===== 港口操作表 (process_port_operations) =====
  {
    excelField: '集装箱号', // 外键关联
    table: 'process_port_operations',
    field: 'container_number',
    required: false,
    aliases: [
      '箱号 (集装箱号)', // 半角括号无空格 - Excel 实际格式
      '箱号 (集装箱号)', // 半角括号有空格
      '箱号（集装箱号）', // 全角括号
      '箱号', // 简化版本
    ],
  },
  {
    excelField: '港口类型',
    table: 'process_port_operations',
    field: 'port_type',
    required: false,
    aliases: [
      '港口类型(起运港/中转港/目的港)',
      '港口类型(起运港/中转港/目的港)',
      '港口类型(起运港/中转/目的)',
      'port_type',
    ],
    transform: (value: any, row: any) => {
      // 如果Excel明确填写了港口类型，使用填写的值
      if (value) {
        const v = String(value).toLowerCase().trim()
        if (v.includes('起运') || v.includes('origin') || v === 'o') return 'origin'
        if (v.includes('中转') || v.includes('transit') || v === 't') return 'transit'
        if (v.includes('目的') || v.includes('destination') || v === 'd') return 'destination'
      }

      // 智能推断：根据Excel中其他字段判断
      // 有"目的港"字段值 → destination
      // 有"起运港"字段值 → origin
      // 有"途径港"字段值 → transit
      const destPort = row?.['目的港'] || row?.['目的港名称']
      const originPort = row?.['起运港']
      const transitPort = row?.['途径港'] || row?.['中转港']

      if (destPort) return 'destination'
      if (originPort) return 'origin'
      if (transitPort) return 'transit'

      return 'destination' // 默认目的港
    },
  },
  {
    excelField: '目的港',
    table: 'process_port_operations',
    field: 'port_code',
    required: false,
    transform: (value: any, row: any) => {
      // 如果有"目的港"字段，直接使用其值作为 port_code
      // 后端会将其转换为标准港口代码
      return value || row?.['目的港']
    },
  },
  {
    excelField: '目的港',
    table: 'process_port_operations',
    field: 'port_name',
    required: false,
  },
  {
    excelField: '港口顺序',
    table: 'process_port_operations',
    field: 'port_sequence',
    required: false,
    transform: (value: any) => {
      if (!value) return 1
      const num = parseInt(value, 10)
      return isNaN(num) ? 1 : num
    },
    aliases: ['港口序号', '港口次序'],
  },
  {
    excelField: '预计到港日期 (目的港)',
    table: 'process_port_operations',
    field: 'eta',
    required: false,
    transform: parseDate,
    aliases: [
      '预计到港日期(ETA)',
      '预计到港日期 (ETA)',
      '预计到港日期（ETA）',
      '预计到港日期（目的港）',
    ],
  },
  {
    excelField: '实际到港日期 (目的港)',
    table: 'process_port_operations',
    field: 'ata',
    required: false,
    transform: parseDate,
    aliases: [
      '实际到港日期(目的港)',
      '实际到港日期（目的港）',
      'ATA(目的港)',
      '目的港实际到港日期',
    ],
  },
  {
    excelField: '免堆期 (天)',
    table: 'process_port_operations',
    field: 'free_storage_days',
    required: false,
    transform: parseDecimal,
    aliases: ['免堆期(天)', '免堆期（天）', '免堆期'],
  },
  {
    excelField: '场内免箱期 (天)',
    table: 'process_port_operations',
    field: 'free_detention_days',
    required: false,
    transform: parseDecimal,
    aliases: ['场内免箱期(天)', '场内免箱期（天）', '场内免箱期'],
  },
  {
    excelField: '可提货日期',
    table: 'process_port_operations',
    field: 'available_time',
    required: false,
    transform: parseDate,
    aliases: ['可提货日', '提货日期', '可以提货日期'],
  },
  {
    excelField: '最后免费日期',
    table: 'process_port_operations',
    field: 'last_free_date',
    required: false,
    transform: parseDate,
    aliases: ['最后免费日', '免费截止日期', '免堆截止日期'],
  },

  // ===== 拖卡运输表 (process_trucking_transport) =====
  {
    excelField: '集装箱号', // 外键关联
    table: 'process_trucking_transport',
    field: 'container_number',
    required: false,
    aliases: [
      '箱号 (集装箱号)', // 半角括号无空格 - Excel 实际格式
      '箱号 (集装箱号)', // 半角括号有空格
      '箱号（集装箱号）', // 全角括号
      '箱号', // 简化版本
    ],
  },
  {
    excelField: '最晚提柜日期',
    table: 'process_trucking_transport',
    field: 'last_pickup_date',
    required: false,
    transform: parseDate,
    aliases: ['最晚提柜日', '计划提柜日', '提柜截止日期'],
  },
  {
    excelField: '提柜日期',
    table: 'process_trucking_transport',
    field: 'pickup_date',
    required: false,
    transform: parseDate,
    aliases: ['提柜日', '实际提柜日期'],
  },
  {
    excelField: '最晚送仓日期',
    table: 'process_trucking_transport',
    field: 'last_delivery_date',
    required: false,
    transform: parseDate,
    aliases: ['最晚送仓日', '计划送仓日', '送仓截止日期'],
  },
  {
    excelField: '送仓日期',
    table: 'process_trucking_transport',
    field: 'delivery_date',
    required: false,
    transform: parseDate,
    aliases: ['送仓日', '实际送仓日期'],
  },

  // ===== 仓库操作表 (process_warehouse_operations) =====
  {
    excelField: '集装箱号', // 外键关联
    table: 'process_warehouse_operations',
    field: 'container_number',
    required: false,
    aliases: [
      '箱号 (集装箱号)', // 半角括号无空格 - Excel 实际格式
      '箱号 (集装箱号)', // 半角括号有空格
      '箱号（集装箱号）', // 全角括号
      '箱号', // 简化版本
    ],
  },
  {
    excelField: '入库仓库组',
    table: 'process_warehouse_operations',
    field: 'warehouse_group',
    required: false,
  },
  {
    excelField: '仓库 (计划)',
    table: 'process_warehouse_operations',
    field: 'planned_warehouse',
    required: false,
    aliases: ['仓库(计划)', '仓库（计划）', '计划仓库', '目标仓库'],
  },
  {
    excelField: '卸空日期',
    table: 'process_warehouse_operations',
    field: 'unload_date',
    required: false,
    transform: parseDate,
    aliases: ['卸空日', '卸柜日期', '拆箱日期'],
  },
  {
    excelField: '入库日期',
    table: 'process_warehouse_operations',
    field: 'warehouse_arrival_date',
    required: false,
    transform: parseDate,
    aliases: ['入库日', '进仓日期', '到仓日期'],
  },

  // ===== 还空箱表 (process_empty_return) =====
  {
    excelField: '集装箱号', // 外键关联
    table: 'process_empty_return',
    field: 'container_number',
    required: false,
    aliases: [
      '箱号 (集装箱号)', // 半角括号无空格 - Excel 实际格式
      '箱号 (集装箱号)', // 半角括号有空格
      '箱号（集装箱号）', // 全角括号
      '箱号', // 简化版本
    ],
  },
  {
    excelField: '最晚还箱日期',
    table: 'process_empty_return',
    field: 'last_return_date',
    required: false,
    transform: parseDate,
    aliases: ['最晚还箱日', '计划还箱日', '还箱截止日期'],
  },
  {
    excelField: '还箱日期',
    table: 'process_empty_return',
    field: 'return_time',
    required: false,
    transform: parseDate,
    aliases: ['还箱日', '实际还箱日期', '还空箱日期'],
  },
  {
    excelField: '还箱地点',
    table: 'process_empty_return',
    field: 'return_terminal_name',
    required: false,
    aliases: ['还箱位置', '还箱码头', '还箱地点名称'],
  },
]
