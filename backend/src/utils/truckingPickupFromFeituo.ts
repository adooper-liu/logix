/**
 * 目的港 GATE_OUT / GTOT / STCS 等出闸事件 → process_trucking_transport.pickup_date（飞驼）
 */
import { TruckingTransport } from '../entities/TruckingTransport';
import { getPortTypeForStatusCode } from '../constants/FeiTuoStatusMapping';
import { PICKUP_DATE_SOURCE, canFeituoOverwritePickupDate } from '../constants/pickupDateSource';

/** 与港口 gate_out_time 映射一致，排除提空箱 STSP（起运港/非重箱提货语义） */
const GATE_OUT_CODES_FOR_TRUCKING_PICKUP = new Set(['GATE_OUT', 'GTOT', 'STCS']);

export function isFeituoGateOutForTruckingPickup(statusCode: string | undefined | null): boolean {
  if (!statusCode) return false;
  return GATE_OUT_CODES_FOR_TRUCKING_PICKUP.has(String(statusCode).trim().toUpperCase());
}

export function tryApplyFeituoPickupFromGateOutEvent(options: {
  trucking: TruckingTransport | null;
  containerNumber: string;
  eventTime: Date;
  statusCode: string | undefined;
  createTrucking: () => TruckingTransport;
}): { trucking: TruckingTransport | null; updated: boolean } {
  const sc = String(options.statusCode ?? '')
    .trim()
    .toUpperCase();
  if (!sc) {
    return { trucking: options.trucking, updated: false };
  }
  if (getPortTypeForStatusCode(sc) !== 'destination') {
    return { trucking: options.trucking, updated: false };
  }
  if (!isFeituoGateOutForTruckingPickup(sc)) {
    return { trucking: options.trucking, updated: false };
  }

  let tt = options.trucking;
  if (!canFeituoOverwritePickupDate(tt?.pickupDateSource)) {
    return { trucking: tt, updated: false };
  }

  if (!tt) {
    tt = options.createTrucking();
  }

  const cur = tt.pickupDate;
  if (cur && options.eventTime.getTime() <= new Date(cur).getTime()) {
    return { trucking: tt, updated: false };
  }

  tt.pickupDate = options.eventTime;
  tt.pickupDateSource = PICKUP_DATE_SOURCE.FEITUO;
  return { trucking: tt, updated: true };
}
