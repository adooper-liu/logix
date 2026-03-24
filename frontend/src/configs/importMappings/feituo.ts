/**
 * 飞驼数据导入字段映射配置（用于通用导入组件）
 * 
 * 注意：飞驼导入包含多个分组（10-发生地、11-集装箱物流、12-状态事件、13-船舶信息）
 * 需要后端特殊处理，这里仅提供基础配置框架
 */

import type { FieldMapping } from '@/components/common/UniversalImport'
import { parseDate, parseBoolean } from '@/components/common/UniversalImport'

export const FEITUO_FIELD_MAPPINGS: FieldMapping[] = [
  // ===== 提单基本信息 =====
  { 
    excelField: '基本信息_MBL Number', 
    table: 'process_sea_freight', 
    field: 'bill_of_lading_number', 
    required: true,
    aliases: ['提单号', 'MBL NO.', 'MBL NO', 'MBL', '主提单号', '基本信息_MBL NO.', '基本信息_MBL NO', '基本信息_MBL'] 
  },
  { 
    excelField: '基本信息_MBL Number', 
    table: 'process_sea_freight', 
    field: 'mbl_number', 
    required: false,
    aliases: ['MBL Number', 'MBL NO.', 'MBL NO', 'MBL', '主提单号'] 
  },
  
  // ===== 集装箱信息 =====
  { 
    excelField: '当前状态信息_集装箱号', 
    table: 'biz_containers', 
    field: 'container_number', 
    required: true,
    aliases: ['集装箱号', '箱号', '箱号 (集装箱号)', '集装箱物流信息_集装箱号'] 
  },
  { 
    excelField: '集装箱物流信息_铅封号', 
    table: 'biz_containers', 
    field: 'seal_number', 
    required: false,
    aliases: ['封条号', '铅封号'] 
  },
  
  // ===== 发生地信息（分组 10） =====
  { 
    excelField: '发生地信息_地点CODE', 
    table: 'ext_feituo_places', 
    field: 'port_code', 
    required: false,
    aliases: ['发生地信息_地点 CODE', '发生地信息_地点 code'] 
  },
  { 
    excelField: '发生地信息_地点名称中文（标准）', 
    table: 'ext_feituo_places', 
    field: 'port_name_cn', 
    required: false 
  },
  { 
    excelField: '发生地信息_地点名称英文（标准）', 
    table: 'ext_feituo_places', 
    field: 'port_name_en', 
    required: false 
  },
  { 
    excelField: '发生地信息_地点类型', 
    table: 'ext_feituo_places', 
    field: 'place_type', 
    required: false
    // 不转换，保持文本如 "ETD/ATD(起始地预计/实际离开时间)"
  },
  { 
    excelField: '发生地信息_时区', 
    table: 'ext_feituo_places', 
    field: 'port_timezone', 
    required: false 
  },
  { 
    excelField: '发生地信息_预计离开时间', 
    table: 'ext_feituo_places', 
    field: 'etd', 
    required: false, 
    transform: parseDate 
  },
  { 
    excelField: '发生地信息_预计到达时间', 
    table: 'ext_feituo_places', 
    field: 'eta', 
    required: false, 
    transform: parseDate 
  },
  { 
    excelField: '发生地信息_实际到达时间', 
    table: 'ext_feituo_places', 
    field: 'ata', 
    required: false, 
    transform: parseDate 
  },
  { 
    excelField: '发生地信息_实际离开时间', 
    table: 'ext_feituo_places', 
    field: 'atd', 
    required: false, 
    transform: parseDate 
  },
  { 
    excelField: '发生地信息_AIS实际到港时间', 
    table: 'ext_feituo_places', 
    field: 'ata_ais', 
    required: false, 
    transform: parseDate,
    aliases: ['发生地信息_AIS 实际到港时间'] 
  },
  { 
    excelField: '发生地信息_AIS实际靠泊时间', 
    table: 'ext_feituo_places', 
    field: 'atb_ais', 
    required: false, 
    transform: parseDate,
    aliases: ['发生地信息_AIS 实际靠泊时间'] 
  },
  { 
    excelField: '发生地信息_AIS实际离港时间', 
    table: 'ext_feituo_places', 
    field: 'atd_ais', 
    required: false, 
    transform: parseDate,
    aliases: ['发生地信息_AIS 实际离港时间'] 
  },
  { 
    excelField: '发生地信息_船名', 
    table: 'ext_feituo_places', 
    field: 'vessel_name', 
    required: false 
  },
  { 
    excelField: '发生地信息_航次', 
    table: 'ext_feituo_places', 
    field: 'voyage_number', 
    required: false 
  },
  
  // ===== 状态事件信息（分组 12） =====
  { 
    excelField: '集装箱物流信息-状态_状态代码', 
    table: 'ext_feituo_status_events', 
    field: 'event_code', 
    required: false,
    aliases: ['状态代码', '集装箱物流信息_当前状态代码'] 
  },
  { 
    excelField: '集装箱物流信息-状态_状态描述中文（标准）', 
    table: 'ext_feituo_status_events', 
    field: 'description_cn', 
    required: false,
    aliases: ['状态描述中文（标准）', '当前状态信息_状态描述中文（标准）'] 
  },
  { 
    excelField: '集装箱物流信息-状态_状态描述英文（标准）', 
    table: 'ext_feituo_status_events', 
    field: 'description_en', 
    required: false,
    aliases: ['状态描述英文（标准）', '当前状态信息_状态描述英文（标准）'] 
  },
  { 
    excelField: '集装箱物流信息-状态_发生时间', 
    table: 'ext_feituo_status_events', 
    field: 'event_time', 
    required: false, 
    transform: parseDate,
    aliases: ['发生时间', '当前状态信息_状态发生时间'] 
  },
  { 
    excelField: '集装箱物流信息-状态_是否预计', 
    table: 'ext_feituo_status_events', 
    field: 'is_estimated', 
    required: false, 
    transform: parseBoolean,
    aliases: ['是否预计', '当前状态信息_是否已发生'] 
  },
  { 
    excelField: '集装箱物流信息-状态_发生地', 
    table: 'ext_feituo_status_events', 
    field: 'event_place', 
    required: false,
    aliases: ['发生地', '当前状态信息_发生地'] 
  },
  { 
    excelField: '集装箱物流信息-状态_地点CODE', 
    table: 'ext_feituo_status_events', 
    field: 'port_code', 
    required: false,
    aliases: ['地点 CODE', '当前状态信息_地点CODE'] 
  },
  { 
    excelField: '集装箱物流信息-状态_码头名称', 
    table: 'ext_feituo_status_events', 
    field: 'terminal_name', 
    required: false,
    aliases: ['码头名称', '当前状态信息_码头名称'] 
  },
  { 
    excelField: '集装箱物流信息-状态_运输方式', 
    table: 'ext_feituo_status_events', 
    field: 'transport_mode', 
    required: false,
    aliases: ['运输方式', '集装箱物流信息-状态_运输方式'] 
  },
  { 
    excelField: '集装箱物流信息-状态_船名/车牌号', 
    table: 'ext_feituo_status_events', 
    field: 'vessel_name', 
    required: false,
    aliases: ['船名/车牌号', '当前状态信息_船名'] 
  },
  { 
    excelField: '集装箱物流信息-状态_航次', 
    table: 'ext_feituo_status_events', 
    field: 'voyage_number', 
    required: false,
    aliases: ['航次', '当前状态信息_航次'] 
  },
  
  // ===== 船舶信息（分组 13） =====
  { 
    excelField: '船泊信息_船名', 
    table: 'ext_feituo_vessels', 
    field: 'vessel_name', 
    required: false,
    aliases: ['船名', '头程船信息_船名'] 
  },
  { 
    excelField: '船泊信息_imo', 
    table: 'ext_feituo_vessels', 
    field: 'imo_number', 
    required: false,
    aliases: ['IMO', 'IMO编号'] 
  },
  { 
    excelField: '船泊信息_mmsi', 
    table: 'ext_feituo_vessels', 
    field: 'mmsi_number', 
    required: false,
    aliases: ['MMSI'] 
  },
  { 
    excelField: '船泊信息_船舶建造日', 
    table: 'ext_feituo_vessels', 
    field: 'build_date', 
    required: false, 
    transform: parseDate,
    aliases: ['船舶建造日'] 
  },
  { 
    excelField: '船泊信息_船籍', 
    table: 'ext_feituo_vessels', 
    field: 'flag', 
    required: false,
    aliases: ['船籍'] 
  },
  { 
    excelField: '船泊信息_箱尺寸', 
    table: 'ext_feituo_vessels', 
    field: 'container_size', 
    required: false,
    aliases: ['箱尺寸', '集装箱物流信息_箱尺寸'] 
  },
  { 
    excelField: '船泊信息_运营方', 
    table: 'ext_feituo_vessels', 
    field: 'operator', 
    required: false,
    aliases: ['运营方'] 
  },
]
