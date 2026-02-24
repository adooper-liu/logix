/**
 * 状态映射常量
 * Status Mapping Constants
 */

import { StandardStatus } from '../types';

// 飞驼事件代码到标准状态的映射
export const FEITUO_STATUS_MAP: Record<string, StandardStatus> = {
  // 计划/起运地节点
  'STSP': StandardStatus.EMPTY_PICKED_UP,      // 空箱提取
  'STUF': StandardStatus.CONTAINER_STUFFED,    // 装箱
  'GITM': StandardStatus.CONTAINER_STUFFED,    // 装箱（通用）
  'PRLD': StandardStatus.CONTAINER_STUFFED,    // 预装箱
  'GTIN': StandardStatus.GATE_IN,              // 进港

  // 铁路运输节点
  'IRLB': StandardStatus.RAIL_LOADED,        // 铁路装箱
  'IRDP': StandardStatus.RAIL_DEPARTED,      // 铁路离站
  'IRAR': StandardStatus.RAIL_ARRIVED,       // 铁路到站
  'IRDS': StandardStatus.RAIL_DISCHARGED,     // 铁路卸箱

  // 驳船运输节点
  'FDLB': StandardStatus.FEEDER_LOADED,      // 驳船装船
  'FDDP': StandardStatus.FEEDER_DEPARTED,    // 驳船离港
  'FDBA': StandardStatus.FEEDER_ARRIVED,     // 驳船抵达
  'FDDC': StandardStatus.FEEDER_DISCHARGED,  // 驳船卸船

  // 海运节点
  'LOBD': StandardStatus.LOADED,              // 装船
  'DLPT': StandardStatus.DEPARTED,            // 离港
  'SAIL': StandardStatus.SAILING,              // 航行中

  // 中转节点
  'TSBA': StandardStatus.TRANSIT_ARRIVED,     // 中转抵港
  'TSCA': StandardStatus.TRANSIT_BERTHED,    // 中转停泊
  'TSDC': StandardStatus.TRANSIT_DISCHARGED,  // 中转卸船
  'TSLB': StandardStatus.TRANSIT_LOADED,      // 中转装船
  'TSDP': StandardStatus.TRANSIT_DEPARTED,    // 中转离港

  // 到港节点
  'BDAR': StandardStatus.ARRIVED,            // 抵港
  'POCA': StandardStatus.AVAILABLE,           // 可提货
  'DSCH': StandardStatus.DISCHARGED,          // 卸船
  'PCAB': StandardStatus.AVAILABLE,           // 可提货（港口）

  // 陆运节点
  'STCS': StandardStatus.IN_TRANSIT_TO_DEST,  // 起运卡车
  'GTOT': StandardStatus.GATE_OUT,            // 出港
  'STRP': StandardStatus.STRIPPED,            // 拆箱
  'FETA': StandardStatus.DELIVERY_ARRIVED,    // 货物送达
  'RCVE': StandardStatus.DELIVERY_ARRIVED,    // 接收货物
  'RTNE': StandardStatus.RETURNED_EMPTY,      // 还空箱

  // 扣留/放行
  'CUIP': StandardStatus.CUSTOMS_HOLD,       // 海关滞留
  'PASS': StandardStatus.AVAILABLE,           // 海关放行
  'SRHD': StandardStatus.CARRIER_HOLD,        // 船公司滞留
  'SRRS': StandardStatus.AVAILABLE,           // 船公司放行
  'TMHD': StandardStatus.TERMINAL_HOLD,       // 码头滞留
  'TMPS': StandardStatus.AVAILABLE,           // 码头放行
  'SRSD': StandardStatus.CHARGES_HOLD,        // 运费滞留
  'SRSE': StandardStatus.AVAILABLE,           // 运费放行

  // 异常
  'DUMP': StandardStatus.DUMPED,              // 甩柜
  'STLH': StandardStatus.HOLD                 // 通用扣留
};

// 飞驼预警事件代码到标准状态的映射
export const FEITUO_WARNING_MAP: Record<string, StandardStatus> = {
  'WGITM': StandardStatus.DELAYED,    // 装箱延误
  'WDLPT': StandardStatus.DELAYED,    // 离港延误
  'WDUMP': StandardStatus.DUMPED,      // 甩柜预警
  'WTSBA': StandardStatus.DELAYED,    // 中转延误
  'WPCGI': StandardStatus.DETENTION,  // 停留延误
  'WBDAR': StandardStatus.DELAYED,    // 抵港延误
  'WGTOT': StandardStatus.DETENTION,  // 出港延误
  'WETA': StandardStatus.DELAYED,     // ETA延误
  'WSTCS': StandardStatus.OVERDUE,    // 超期
  'WRCVE': StandardStatus.OVERDUE     // 逾期预警
};

// 马士基事件代码到标准状态的映射
export const MAERSK_STATUS_MAP: Record<string, StandardStatus> = {
  'STSP': StandardStatus.EMPTY_PICKED_UP,
  'STUF': StandardStatus.CONTAINER_STUFFED,
  'GTIN': StandardStatus.GATE_IN,
  'LOBD': StandardStatus.LOADED,
  'DLPT': StandardStatus.DEPARTED,
  'RDSI': StandardStatus.SAILING,
  'TSBA': StandardStatus.TRANSIT_ARRIVED,
  'TSCA': StandardStatus.TRANSIT_BERTHED,
  'TSAD': StandardStatus.TRANSIT_DEPARTED,
  'ARVD': StandardStatus.ARRIVED,
  'BDAR': StandardStatus.ARRIVED,
  'DSCH': StandardStatus.DISCHARGED,
  'AVLB': StandardStatus.AVAILABLE,
  'PCAB': StandardStatus.AVAILABLE,
  'GTOT': StandardStatus.GATE_OUT,
  'STCS': StandardStatus.IN_TRANSIT_TO_DEST,
  'DLVR': StandardStatus.DELIVERY_ARRIVED,
  'STRP': StandardStatus.STRIPPED,
  'FETA': StandardStatus.DELIVERY_ARRIVED,
  'RCVE': StandardStatus.DELIVERY_ARRIVED,
  'RTNE': StandardStatus.RETURNED_EMPTY,
  'CUIP': StandardStatus.CUSTOMS_HOLD,
  'PASS': StandardStatus.AVAILABLE
};

// 中远海运事件代码到标准状态的映射
export const COSCO_STATUS_MAP: Record<string, StandardStatus> = {
  'STSP': StandardStatus.EMPTY_PICKED_UP,
  'STUF': StandardStatus.CONTAINER_STUFFED,
  'GTIN': StandardStatus.GATE_IN,
  'LOBD': StandardStatus.LOADED,
  'DLPT': StandardStatus.DEPARTED,
  'SAIL': StandardStatus.SAILING,
  'TSBA': StandardStatus.TRANSIT_ARRIVED,
  'TSAD': StandardStatus.TRANSIT_DEPARTED,
  'ARVD': StandardStatus.ARRIVED,
  'DSCH': StandardStatus.DISCHARGED,
  'AVLB': StandardStatus.AVAILABLE,
  'GTOT': StandardStatus.GATE_OUT,
  'STRP': StandardStatus.STRIPPED,
  'RTNE': StandardStatus.RETURNED_EMPTY
};

// 港口代码映射（标准港名）
export const PORT_CODE_MAP: Record<string, { name: string; country: string }> = {
  // 中国港口
  'CNNSG': { name: '南京港', country: '中国' },
  'CNSHA': { name: '上海港', country: '中国' },
  'CNZSN': { name: '深圳港', country: '中国' },
  'CNNGB': { name: '宁波港', country: '中国' },
  'CNDLC': { name: '大连港', country: '中国' },
  'CNTAO': { name: '青岛港', country: '中国' },
  'CNXMN': { name: '厦门港', country: '中国' },
  'CNCAN': { name: '广州港', country: '中国' },

  // 美国港口
  'USLAX': { name: '洛杉矶港', country: '美国' },
  'USNYC': { name: '纽约港', country: '美国' },
  'USHOU': { name: '休斯顿港', country: '美国' },
  'USSAV': { name: '萨凡纳港', country: '美国' },
  'USSEA': { name: '西雅图港', country: '美国' },

  // 欧洲港口
  'NLRTM': { name: '鹿特丹港', country: '荷兰' },
  'DEHAM': { name: '汉堡港', country: '德国' },
  'GBFXT': { name: '费利克斯托港', country: '英国' },
  'FRLEH': { name: '勒阿弗尔港', country: '法国' },
  'ESBCN': { name: '巴塞罗那港', country: '西班牙' },
  'ITGOA': { name: '热那亚港', country: '意大利' },

  // 亚洲其他港口
  'JPTYO': { name: '东京港', country: '日本' },
  'JPYOK': { name: '横滨港', country: '日本' },
  'SGSIN': { name: '新加坡港', country: '新加坡' },
  'KRPUS': { name: '釜山港', country: '韩国' },
  'THBKK': { name: '曼谷港', country: '泰国' },
  'MYKUL': { name: '巴生港', country: '马来西亚' },

  // 中东港口
  'AEDXB': { name: '迪拜港', country: '阿联酋' },
  'SAJED': { name: '吉达港', country: '沙特' },

  // 澳大利亚港口
  'AUSYD': { name: '悉尼港', country: '澳大利亚' },
  'AUMEL': { name: '墨尔本港', country: '澳大利亚' },

  // 巴西港口
  'BRGRU': { name: '桑托斯港', country: '巴西' },

  // 智利港口
  'CLVAL': { name: '瓦尔帕莱索港', country: '智利' },

  // 秘鲁港口
  'PECAL': { name: '卡亚俄港', country: '秘鲁' },

  // 加拿大港口
  'CAVAN': { name: '温哥华港', country: '加拿大' },

  // 墨西哥港口
  'MXVER': { name: '韦拉克鲁斯港', country: '墨西哥' },

  // 印度港口
  'INNSA': { name: '那瓦希瓦港', country: '印度' },
  'INMUN': { name: '蒙德拉港', country: '印度' },

  // 南非港口
  'ZACPT': { name: '开普敦港', country: '南非' },
  'ZADUR': { name: '德班港', country: '南非' }
};

// 状态中文名称映射
export const STATUS_LABELS: Record<StandardStatus, string> = {
  // 初始/计划状态
  [StandardStatus.NOT_SHIPPED]: '未出运',
  [StandardStatus.PLANNED]: '已计划',

  // 起运地操作
  [StandardStatus.EMPTY_PICKED_UP]: '已提空箱',
  [StandardStatus.CONTAINER_STUFFED]: '已装箱',
  [StandardStatus.GATE_IN]: '已进港',

  // 铁路运输
  [StandardStatus.RAIL_LOADED]: '铁路装箱',
  [StandardStatus.RAIL_DEPARTED]: '铁路离站',
  [StandardStatus.RAIL_ARRIVED]: '铁路到站',
  [StandardStatus.RAIL_DISCHARGED]: '铁路卸箱',

  // 驳船运输
  [StandardStatus.FEEDER_LOADED]: '驳船装船',
  [StandardStatus.FEEDER_DEPARTED]: '驳船离港',
  [StandardStatus.FEEDER_ARRIVED]: '驳船抵达',
  [StandardStatus.FEEDER_DISCHARGED]: '驳船卸船',

  // 海运
  [StandardStatus.LOADED]: '已装船',
  [StandardStatus.DEPARTED]: '已离港',
  [StandardStatus.SAILING]: '航行中',

  // 中转
  [StandardStatus.TRANSIT_ARRIVED]: '中转抵港',
  [StandardStatus.TRANSIT_BERTHED]: '中转停泊',
  [StandardStatus.TRANSIT_DISCHARGED]: '中转卸船',
  [StandardStatus.TRANSIT_LOADED]: '中转装船',
  [StandardStatus.TRANSIT_DEPARTED]: '中转离港',

  // 到港
  [StandardStatus.ARRIVED]: '已抵港',
  [StandardStatus.BERTHED]: '已停泊',
  [StandardStatus.DISCHARGED]: '已卸船',
  [StandardStatus.AVAILABLE]: '可提货',

  // 提柜/陆运
  [StandardStatus.IN_TRANSIT_TO_DEST]: '运输至目的地',
  [StandardStatus.GATE_OUT]: '已出港',
  [StandardStatus.DELIVERY_ARRIVED]: '已送达',
  [StandardStatus.STRIPPED]: '已拆箱',

  // 还空箱
  [StandardStatus.RETURNED_EMPTY]: '已还空箱',

  // 完成状态
  [StandardStatus.COMPLETED]: '已完成',

  // 扣留/滞留状态
  [StandardStatus.CUSTOMS_HOLD]: '海关滞留',
  [StandardStatus.CARRIER_HOLD]: '船公司滞留',
  [StandardStatus.TERMINAL_HOLD]: '码头滞留',
  [StandardStatus.CHARGES_HOLD]: '运费滞留',
  [StandardStatus.HOLD]: '扣留',

  // 异常状态
  [StandardStatus.DUMPED]: '已甩柜',

  // 预警状态
  [StandardStatus.DELAYED]: '延误',
  [StandardStatus.DETENTION]: '滞期',
  [StandardStatus.OVERDUE]: '超期',
  [StandardStatus.CONGESTION]: '拥堵',

  // 未知状态
  [StandardStatus.UNKNOWN]: '未知状态'
};

// 状态图标映射
export const STATUS_ICONS: Record<StandardStatus, string> = {
  // 初始/计划状态
  [StandardStatus.NOT_SHIPPED]: '📦',
  [StandardStatus.PLANNED]: '📋',

  // 起运地操作
  [StandardStatus.EMPTY_PICKED_UP]: '🚚',
  [StandardStatus.CONTAINER_STUFFED]: '📦',
  [StandardStatus.GATE_IN]: '🚪',

  // 铁路运输
  [StandardStatus.RAIL_LOADED]: '🚂',
  [StandardStatus.RAIL_DEPARTED]: '🚂',
  [StandardStatus.RAIL_ARRIVED]: '🚂',
  [StandardStatus.RAIL_DISCHARGED]: '🚂',

  // 驳船运输
  [StandardStatus.FEEDER_LOADED]: '⛵',
  [StandardStatus.FEEDER_DEPARTED]: '⛵',
  [StandardStatus.FEEDER_ARRIVED]: '⛵',
  [StandardStatus.FEEDER_DISCHARGED]: '⛵',

  // 海运
  [StandardStatus.LOADED]: '⛴️',
  [StandardStatus.DEPARTED]: '🛳️',
  [StandardStatus.SAILING]: '🌊',

  // 中转
  [StandardStatus.TRANSIT_ARRIVED]: '📍',
  [StandardStatus.TRANSIT_BERTHED]: '⚓',
  [StandardStatus.TRANSIT_DISCHARGED]: '📤',
  [StandardStatus.TRANSIT_LOADED]: '📥',
  [StandardStatus.TRANSIT_DEPARTED]: '🚀',

  // 到港
  [StandardStatus.ARRIVED]: '🏁',
  [StandardStatus.BERTHED]: '⚓',
  [StandardStatus.DISCHARGED]: '📤',
  [StandardStatus.AVAILABLE]: '✅',

  // 提柜/陆运
  [StandardStatus.IN_TRANSIT_TO_DEST]: '🚚',
  [StandardStatus.GATE_OUT]: '🚛',
  [StandardStatus.DELIVERY_ARRIVED]: '🏠',
  [StandardStatus.STRIPPED]: '📋',

  // 还空箱
  [StandardStatus.RETURNED_EMPTY]: '↩️',

  // 完成状态
  [StandardStatus.COMPLETED]: '✨',

  // 扣留/滞留状态
  [StandardStatus.CUSTOMS_HOLD]: '⚠️',
  [StandardStatus.CARRIER_HOLD]: '🔒',
  [StandardStatus.TERMINAL_HOLD]: '🚧',
  [StandardStatus.CHARGES_HOLD]: '💰',
  [StandardStatus.HOLD]: '⛔',

  // 异常状态
  [StandardStatus.DUMPED]: '🗑️',

  // 预警状态
  [StandardStatus.DELAYED]: '⏰',
  [StandardStatus.DETENTION]: '📅',
  [StandardStatus.OVERDUE]: '🚨',
  [StandardStatus.CONGESTION]: '🚦',

  // 未知状态
  [StandardStatus.UNKNOWN]: '❓'
};
