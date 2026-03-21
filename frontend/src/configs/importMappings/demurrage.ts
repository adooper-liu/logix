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
  { 
    excelField: '单据状态', 
    table: 'dict_demurrage_standards', 
    field: 'process_status', 
    required: false,
    aliases: ['处理状态'] 
  },
  { 
    excelField: '免费天数', 
    table: 'dict_demurrage_standards', 
    field: 'free_days', 
    required: true, 
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
 * 阶梯费率列别名（特殊处理）
 */
export const TIER_COLUMNS: Record<string, string[]> = {
  '1': ['1', '1.0'],
  '2': ['2', '2.0'],
  '3': ['3', '3.0'],
  // ... 可扩展到 60
  '60+': ['60+', '60+']
}
