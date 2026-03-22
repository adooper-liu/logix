/**
 * process_trucking_transport.pickup_date 来源
 * - feituo：飞驼 API / 飞驼轨迹事件（GATE_OUT 等）写入，可被后续飞驼同步覆盖
 * - business：业务 Excel/通用导入等业务录入，飞驼不得自动覆盖
 * - manual：界面/API 手工修改，飞驼不得自动覆盖
 */
export const PICKUP_DATE_SOURCE = {
  FEITUO: 'feituo',
  BUSINESS: 'business',
  MANUAL: 'manual'
} as const;

export type PickupDateSourceValue = (typeof PICKUP_DATE_SOURCE)[keyof typeof PICKUP_DATE_SOURCE];

/** 飞驼自动写入 pickup_date 仅当来源为空或为 feituo（历史空视为可被飞驼维护） */
export function canFeituoOverwritePickupDate(source: string | null | undefined): boolean {
  if (source == null || String(source).trim() === '') return true;
  return String(source).trim().toLowerCase() === PICKUP_DATE_SOURCE.FEITUO;
}
