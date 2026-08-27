/**
 * process_trucking_transport.pickup_date 来源
 * - feituo：飞驼 API / 飞驼 Excel / 飞驼轨迹事件（GATE_OUT 等）写入，可被后续飞驼同步覆盖
 * - business：业务 Excel/通用导入等业务录入，飞驼不得自动覆盖
 * - manual：界面/API 手工修改，飞驼不得自动覆盖
 */
export const PICKUP_DATE_SOURCE = {
  FEITUO: 'feituo',
  BUSINESS: 'business',
  MANUAL: 'manual'
} as const;

export type PickupDateSourceValue = (typeof PICKUP_DATE_SOURCE)[keyof typeof PICKUP_DATE_SOURCE];

export type PickupDateMutable = {
  pickupDate?: Date | null;
  pickupDateSource?: string | null;
};

/** 飞驼自动写入 pickup_date 仅当来源为空或为 feituo（历史空视为可被飞驼维护） */
export function canFeituoOverwritePickupDate(source: string | null | undefined): boolean {
  if (source == null || String(source).trim() === '') return true;
  return String(source).trim().toLowerCase() === PICKUP_DATE_SOURCE.FEITUO;
}

/**
 * 飞驼 Excel/API 同源写入 pickup_date。
 * 必须标成 feituo：若标成 business，同一次导入或后续 GATE_OUT 都无法纠正。
 */
export function applyFeituoSourcedPickupDate<T extends PickupDateMutable>(
  tt: T,
  pickupDate: Date
): boolean {
  if (!canFeituoOverwritePickupDate(tt.pickupDateSource)) {
    return false;
  }
  tt.pickupDate = pickupDate;
  tt.pickupDateSource = PICKUP_DATE_SOURCE.FEITUO;
  return true;
}
