/**
 * 状态映射常量（后端本地副本，与 shared/constants/statusMappings 保持一致）
 */

import { StandardStatus } from '../types/index.js';

export const FEITUO_STATUS_MAP: Record<string, StandardStatus> = {
  'STSP': StandardStatus.EMPTY_PICKED_UP,
  'STUF': StandardStatus.CONTAINER_STUFFED,
  'GITM': StandardStatus.CONTAINER_STUFFED,
  'PRLD': StandardStatus.CONTAINER_STUFFED,
  'GTIN': StandardStatus.GATE_IN,
  'IRLB': StandardStatus.RAIL_LOADED,
  'IRDP': StandardStatus.RAIL_DEPARTED,
  'IRAR': StandardStatus.RAIL_ARRIVED,
  'IRDS': StandardStatus.RAIL_DISCHARGED,
  'FDLB': StandardStatus.FEEDER_LOADED,
  'FDDP': StandardStatus.FEEDER_DEPARTED,
  'FDBA': StandardStatus.FEEDER_ARRIVED,
  'FDDC': StandardStatus.FEEDER_DISCHARGED,
  'LOBD': StandardStatus.LOADED,
  'DLPT': StandardStatus.DEPARTED,
  'SAIL': StandardStatus.SAILING,
  'TSBA': StandardStatus.TRANSIT_ARRIVED,
  'TSCA': StandardStatus.TRANSIT_BERTHED,
  'TSDC': StandardStatus.TRANSIT_DISCHARGED,
  'TSLB': StandardStatus.TRANSIT_LOADED,
  'TSDP': StandardStatus.TRANSIT_DEPARTED,
  'BDAR': StandardStatus.ARRIVED,
  'POCA': StandardStatus.AVAILABLE,
  'DSCH': StandardStatus.DISCHARGED,
  'PCAB': StandardStatus.AVAILABLE,
  'STCS': StandardStatus.IN_TRANSIT_TO_DEST,
  'GTOT': StandardStatus.GATE_OUT,
  'STRP': StandardStatus.STRIPPED,
  'FETA': StandardStatus.DELIVERY_ARRIVED,
  'RCVE': StandardStatus.RETURNED_EMPTY,  // 还空箱 Empty Returned（飞驼标准码）
  'RTNE': StandardStatus.RETURNED_EMPTY,
  'CUIP': StandardStatus.CUSTOMS_HOLD,
  'PASS': StandardStatus.AVAILABLE,
  'SRHD': StandardStatus.CARRIER_HOLD,
  'SRRS': StandardStatus.AVAILABLE,
  'TMHD': StandardStatus.TERMINAL_HOLD,
  'TMPS': StandardStatus.AVAILABLE,
  'SRSD': StandardStatus.CHARGES_HOLD,
  'SRSE': StandardStatus.AVAILABLE,
  'DUMP': StandardStatus.DUMPED,
  'STLH': StandardStatus.HOLD
};

export const FEITUO_WARNING_MAP: Record<string, StandardStatus> = {
  'WGITM': StandardStatus.DELAYED,
  'WDLPT': StandardStatus.DELAYED,
  'WDUMP': StandardStatus.DUMPED,
  'WTSBA': StandardStatus.DELAYED,
  'WPCGI': StandardStatus.DETENTION,
  'WBDAR': StandardStatus.DELAYED,
  'WGTOT': StandardStatus.DETENTION,
  'WETA': StandardStatus.DELAYED,
  'WSTCS': StandardStatus.OVERDUE,
  'WRCVE': StandardStatus.OVERDUE
};
