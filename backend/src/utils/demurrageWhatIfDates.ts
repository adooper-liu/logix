/**
 * Cost what-if / plannedDates 覆盖时的区间日期解析。
 *
 * 背景：柜已到港后 calculateForContainer 走 actual 模式；成本优化传入的
 * plannedPickup/Return 若只覆盖 planned* 字段，detention/storage/combined
 * 仍用实际提柜/还箱或「今天」，导致不同候选计划日费用无差异或漏计。
 */

export type DemurrageCalcMode = 'actual' | 'forecast';

export interface DetentionIntervalInput {
  calculationMode: DemurrageCalcMode;
  /** 成本优化 what-if：缺 actual 时用 planned */
  preferPlannedDates: boolean;
  today: Date;
  pickupDateActual: Date | null;
  returnTime: Date | null;
  plannedPickupDate: Date | null;
  plannedReturnDate: Date | null;
}

export interface DetentionIntervalResult {
  start: Date | null;
  end: Date;
  startSource: string | null;
  endSource: string;
  /** actual 且无提柜、又未启用 what-if planned 时，应跳过滞箱项 */
  skipMissingActualPickup: boolean;
  skipMissingPlannedPickup: boolean;
}

function maxDate(a: Date, b: Date): Date {
  return a.getTime() >= b.getTime() ? a : b;
}

/**
 * 解析滞箱（及 Combined 截止日所依赖的）起止日。
 */
export function resolveDetentionIntervalForCalculation(
  input: DetentionIntervalInput
): DetentionIntervalResult {
  const {
    calculationMode,
    preferPlannedDates,
    today,
    pickupDateActual,
    returnTime,
    plannedPickupDate,
    plannedReturnDate
  } = input;

  if (calculationMode === 'forecast') {
    return {
      start: plannedPickupDate,
      end: plannedReturnDate ? maxDate(today, plannedReturnDate) : today,
      startSource: plannedPickupDate
        ? 'process_trucking_transport.planned_pickup_date'
        : null,
      endSource: plannedReturnDate
        ? 'max(当前日期, process_empty_return.planned_return_date)'
        : '当前日期',
      skipMissingActualPickup: false,
      skipMissingPlannedPickup: !plannedPickupDate
    };
  }

  // actual
  const start =
    pickupDateActual ?? (preferPlannedDates ? plannedPickupDate : null);
  let end: Date;
  let endSource: string;
  if (returnTime) {
    end = returnTime;
    endSource = 'process_empty_return.return_time';
  } else if (preferPlannedDates && plannedReturnDate) {
    end = maxDate(today, plannedReturnDate);
    endSource = 'max(当前日期, process_empty_return.planned_return_date) [what-if]';
  } else {
    end = today;
    endSource = '当前日期';
  }

  return {
    start,
    end,
    startSource: pickupDateActual
      ? 'process_trucking_transport.pickup_date'
      : preferPlannedDates && plannedPickupDate
        ? 'process_trucking_transport.planned_pickup_date [what-if]'
        : null,
    endSource,
    skipMissingActualPickup: !pickupDateActual && !(preferPlannedDates && plannedPickupDate),
    skipMissingPlannedPickup: false
  };
}

/**
 * 堆存 actual 区间截止日：有实际提柜用实际；what-if 且无实际时用计划提柜（否则今天）。
 */
export function resolveStorageActualRangeEnd(input: {
  pickupDateActual: Date | null;
  plannedPickupDate: Date | null;
  today: Date;
  preferPlannedDates: boolean;
}): { end: Date; endSource: string } {
  const { pickupDateActual, plannedPickupDate, today, preferPlannedDates } = input;
  if (pickupDateActual) {
    return {
      end: pickupDateActual,
      endSource: 'process_trucking_transport.pickup_date'
    };
  }
  if (preferPlannedDates && plannedPickupDate) {
    return {
      end: maxDate(plannedPickupDate, today),
      endSource: 'max(计划提柜日，当前日期) [what-if]'
    };
  }
  return { end: today, endSource: '当前日期' };
}

/**
 * LRD / Detention 用箱起算：actual 缺实际提柜时，what-if 回退计划提柜。
 */
export function resolvePickupBasisForDetention(input: {
  calculationMode: DemurrageCalcMode;
  preferPlannedDates: boolean;
  pickupDateActual: Date | null;
  plannedPickupDate: Date | null;
  computedLastFreeDate: Date | null;
}): Date | null {
  const {
    calculationMode,
    preferPlannedDates,
    pickupDateActual,
    plannedPickupDate,
    computedLastFreeDate
  } = input;

  if (calculationMode === 'actual') {
    return pickupDateActual ?? (preferPlannedDates ? plannedPickupDate : null);
  }
  if (plannedPickupDate) return plannedPickupDate;
  if (computedLastFreeDate) return computedLastFreeDate;
  return null;
}
