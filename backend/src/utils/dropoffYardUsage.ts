/**
 * Drop off 堆场使用判定（提柜日 vs 送仓日）
 *
 * 规则：提柜日与送仓日不在同一天 → 使用了堆场 → 运费应乘 Drop off 倍数。
 * what-if（成本优化）必须优先用计划提柜/卸柜（Drop off 下送=卸），
 * 否则未提柜时读不到实际 pickupDate，会错误地按 1x 运费估价。
 */

function toDayString(date: Date | string): string {
  if (typeof date === 'string') {
    const trimmed = date.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
      return trimmed.slice(0, 10);
    }
    return new Date(trimmed).toISOString().split('T')[0];
  }
  return date.toISOString().split('T')[0];
}

/**
 * 根据一对提/送日期判断是否使用堆场。
 * @returns true/false；数据不足时返回 null（由调用方决定兜底）
 */
export function evaluateYardUsageFromDates(
  pickupDate?: Date | string | null,
  deliveryDate?: Date | string | null
): boolean | null {
  if (pickupDate == null || pickupDate === '') {
    return null;
  }
  if (deliveryDate == null || deliveryDate === '') {
    // 已提未送：保守估计会使用堆场
    return true;
  }
  return toDayString(pickupDate) !== toDayString(deliveryDate);
}

export interface ResolveDropoffYardUsageParams {
  /** what-if 路径：优先计划日期 */
  preferPlannedDates?: boolean;
  plannedPickupDate?: Date | string | null;
  /** Drop off 下送仓日 = 卸柜日 */
  plannedDeliveryDate?: Date | string | null;
  actualPickupDate?: Date | string | null;
  actualDeliveryDate?: Date | string | null;
}

/**
 * 解析 Drop off 是否实际/预计使用堆场。
 * - preferPlannedDates：先看计划日，不足再回退实际日
 * - 否则仅看实际日（与历史行为一致：无实际提柜 → false）
 */
export function resolveDropoffYardUsage(params: ResolveDropoffYardUsageParams): boolean {
  if (params.preferPlannedDates) {
    const fromPlanned = evaluateYardUsageFromDates(
      params.plannedPickupDate,
      params.plannedDeliveryDate
    );
    if (fromPlanned !== null) {
      return fromPlanned;
    }
  }

  const fromActual = evaluateYardUsageFromDates(params.actualPickupDate, params.actualDeliveryDate);
  if (fromActual !== null) {
    return fromActual;
  }

  return false;
}
