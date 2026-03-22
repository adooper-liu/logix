/**
 * 滞港费标准导入字段映射配置（用于通用导入组件）
 */

import type { FieldMapping } from '@/components/common/UniversalImport'
import { parseDate, parseDecimal, parseInteger } from '@/components/common/UniversalImport'

export const DEMURRAGE_FIELD_MAPPINGS: FieldMapping[] = [
  { 
    excelField: '海外公司。编码', 
    table: 'dict_demurrage_standards', 
    field: 'foreign_company_code', 
    required: true,
    aliases: ['海外公司编码'] 
  },
  { 
    excelField: '海外公司。名称', 
    table: 'dict_demurrage_standards', 
    field: 'foreign_company_name', 
    required: false,
    aliases: ['海外公司名称'] 
  },
  { 
    excelField: '生效日期', 
    table: 'dict_demurrage_standards', 
    field: 'effective_date', 
    required: false, 
    transform: parseDate 
  },
  { 
    excelField: '结束日期', 
    table: 'dict_demurrage_standards', 
    field: 'expiry_date', 
    required: false, 
    transform: parseDate 
  },
  { 
    excelField: '目的港。编码', 
    table: 'dict_demurrage_standards', 
    field: 'destination_port_code', 
    required: true,
    aliases: ['目的港编码'] 
  },
  { 
    excelField: '目的港。名称', 
    table: 'dict_demurrage_standards', 
    field: 'destination_port_name', 
    required: false,
    aliases: ['目的港名称'] 
  },
  { 
    excelField: '船公司。编码', 
    table: 'dict_demurrage_standards', 
    field: 'shipping_company_code', 
    required: true,
    aliases: ['船公司编码'] 
  },
  { 
    excelField: '船公司。供应商全称（中）', 
    table: 'dict_demurrage_standards', 
    field: 'shipping_company_name', 
    required: false,
    aliases: ['船公司名称'] 
  },
  { 
    excelField: '码头', 
    table: 'dict_demurrage_standards', 
    field: 'terminal', 
    required: false 
  },
  { 
    excelField: '起运港货代公司。编码', 
    table: 'dict_demurrage_standards', 
    field: 'origin_forwarder_code', 
    required: true,
    aliases: ['起运港货代公司编码'] 
  },
  { 
    excelField: '起运港货代公司。供应商全称（中）', 
    table: 'dict_demurrage_standards', 
    field: 'origin_forwarder_name', 
    required: false,
    aliases: ['起运港货代公司名称'] 
  },
  { 
    excelField: '运输方式。运输方式编码', 
    table: 'dict_demurrage_standards', 
    field: 'transport_mode_code', 
    required: false,
    aliases: ['*运输方式。运输方式编码', '运输方式。运输方式编码', '运输方式编码'] 
  },
  { 
    excelField: '运输方式。运输方式名称', 
    table: 'dict_demurrage_standards', 
    field: 'transport_mode_name', 
    required: false,
    aliases: ['运输方式。运输方式名称', '运输方式名称'] 
  },
  { 
    excelField: '*免费天数基准', 
    table: 'dict_demurrage_standards', 
    field: 'free_days_basis', 
    required: true,
    aliases: ['免费天数基准'] 
  },
  { 
    excelField: '*计算方式', 
    table: 'dict_demurrage_standards', 
    field: 'calculation_basis', 
    required: true,
    aliases: ['计算方式'] 
  },
  { 
    excelField: '费用类型。费用小类编码', 
    table: 'dict_demurrage_standards', 
    field: 'charge_type_code', 
    required: false,
    aliases: ['*费用类型。费用小类编码', '费用类型。费用小类编码'] 
  },
  { 
    excelField: '费用类型。费用小类名称', 
    table: 'dict_demurrage_standards', 
    field: 'charge_name', 
    required: false,
    aliases: ['费用类型。费用小类名称', '费用类型费用小类名称'] 
  },
  { 
    excelField: '*标记', 
    table: 'dict_demurrage_standards', 
    field: 'is_chargeable', 
    required: false,
    aliases: ['标记'] 
  },
  { 
    excelField: '序列号', 
    table: 'dict_demurrage_standards', 
    field: 'sequence_number', 
    required: false, 
    transform: parseInteger 
  },
  { 
    excelField: '*目的港条件', 
    table: 'dict_demurrage_standards', 
    field: 'port_condition', 
    required: false,
    aliases: ['目的港条件'] 
  },
  // 「单据状态」= 已审核 等；勿与「处理状态」(是/否) 混用
  { 
    excelField: '单据状态', 
    table: 'dict_demurrage_standards', 
    field: 'process_status', 
    required: false
  },
  // 无此列时由 1～60、60+ 阶梯（0=免费档、>0=收费）自动推导 free_days
  { 
    excelField: '免费天数', 
    table: 'dict_demurrage_standards', 
    field: 'free_days', 
    required: false, 
    transform: parseDecimal 
  },
  { 
    excelField: '日费率', 
    table: 'dict_demurrage_standards', 
    field: 'rate_per_day', 
    required: false, 
    transform: parseDecimal 
  },
  { 
    excelField: '币种', 
    table: 'dict_demurrage_standards', 
    field: 'currency', 
    required: false 
  },
]

/**
 * 阶梯费率：Excel 表头「天」-> 可能的列名别名（与 useExcelParser 合并 tiers 一致）
 * 后端 demurrage.service normalizeTiers 支持对象形如 { "1": 50, "2-5": 60, "60+": 100 }
 */
function buildTierColumnAliases(maxDay = 60): Record<string, string[]> {
  const m: Record<string, string[]> = {}
  for (let d = 1; d <= maxDay; d++) {
    const k = String(d)
    m[k] = [k, `${d}.0`, `第${d}天`, `Day${d}`, `day${d}`]
  }
  m['60+'] = ['60+', '60+天', '61+', '60+ ']
  return m
}

/** 滞港费标准导入：从原始 Excel 行合并为 `tiers` 字段时使用 */
export const DEMURRAGE_TIER_COLUMN_ALIASES = buildTierColumnAliases(60)

/** @deprecated 使用 DEMURRAGE_TIER_COLUMN_ALIASES */
export const TIER_COLUMNS = DEMURRAGE_TIER_COLUMN_ALIASES
